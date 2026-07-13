const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { pool, dbGet } = require('../database');
const { requireAuth } = require('../middleware/auth');
const { parseGPX, parseTCX, parseKML } = require('../parsers/gpxParser');

const router = express.Router();

// 所有上传接口都需要登录
router.use(requireAuth);

// 部署到 Railway 时用内存存储（不依赖本地文件系统）
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.gpx', '.tcx', '.kml'].includes(ext)) cb(null, true);
    else cb(new Error('Only GPX, TCX, KML supported'));
  },
});

async function saveRoute(parsed, ext, originalFilename, userId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 插入路线
    const routeRes = await client.query(
      `INSERT INTO routes (user_id, name, sport_type, date, distance, duration,
        elevation_gain, avg_speed, max_speed, avg_heart_rate, max_heart_rate,
        file_type, original_filename)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING id`,
      [
        userId, parsed.name, parsed.sportType, parsed.date,
        parsed.distance, parsed.duration, parsed.elevationGain,
        parsed.avgSpeed, parsed.maxSpeed,
        parsed.avgHeartRate ?? null, parsed.maxHeartRate ?? null,
        ext, originalFilename,
      ]
    );
    const routeId = routeRes.rows[0].id;

    // 批量插入轨迹点（用 unnest 一次性写入，速度快得多）
    const pts = parsed.trackPoints;
    if (pts.length > 0) {
      const lats       = pts.map(p => p.lat);
      const lons       = pts.map(p => p.lon);
      const elevations = pts.map(p => p.elevation ?? null);
      const times      = pts.map(p => p.time ?? null);
      const hrs        = pts.map(p => p.heartRate ?? null);
      const cads       = pts.map(p => p.cadence ?? null);
      const speeds     = pts.map(p => p.speed ?? null);
      const orders     = pts.map(p => p.order);
      const routeIds   = pts.map(() => routeId);

      await client.query(
        `INSERT INTO track_points
           (route_id, lat, lon, elevation, time, heart_rate, cadence, speed, point_order)
         SELECT * FROM unnest(
           $1::int[], $2::real[], $3::real[], $4::real[],
           $5::text[], $6::int[], $7::int[], $8::real[], $9::int[]
         )`,
        [routeIds, lats, lons, elevations, times, hrs, cads, speeds, orders]
      );
    }

    await client.query('COMMIT');
    return routeId;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// POST /api/upload — 单文件
router.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const ext = path.extname(req.file.originalname).toLowerCase().slice(1);
  try {
    const xmlContent = req.file.buffer.toString('utf-8');
    let parsed;
    if (ext === 'gpx')      parsed = await parseGPX(xmlContent);
    else if (ext === 'tcx') parsed = await parseTCX(xmlContent);
    else if (ext === 'kml') parsed = await parseKML(xmlContent);
    else throw new Error('Unsupported format');

    const routeId = await saveRoute(parsed, ext, req.file.originalname, req.user.id);

    res.json({
      success: true,
      routeId,
      message: `Imported ${parsed.trackPoints.length} track points`,
      summary: {
        name: parsed.name,
        date: parsed.date,
        distance: parsed.distance,
        duration: parsed.duration,
        elevationGain: parsed.elevationGain,
      },
    });
  } catch (err) {
    console.error('Parse error:', err);
    res.status(422).json({ error: err.message || 'Parse failed' });
  }
});

// POST /api/upload/batch — 批量
router.post('/batch', upload.array('files', 50), async (req, res) => {
  if (!req.files || req.files.length === 0)
    return res.status(400).json({ error: 'No files uploaded' });

  const results = [];
  for (const file of req.files) {
    const ext = path.extname(file.originalname).toLowerCase().slice(1);
    try {
      const xmlContent = file.buffer.toString('utf-8');
      let parsed;
      if (ext === 'gpx')      parsed = await parseGPX(xmlContent);
      else if (ext === 'tcx') parsed = await parseTCX(xmlContent);
      else if (ext === 'kml') parsed = await parseKML(xmlContent);
      else throw new Error('Unsupported format');

      const routeId = await saveRoute(parsed, ext, file.originalname, req.user.id);
      results.push({ file: file.originalname, success: true, routeId });
    } catch (err) {
      results.push({ file: file.originalname, success: false, error: err.message });
    }
  }

  res.json({
    results,
    total: req.files.length,
    succeeded: results.filter(r => r.success).length,
  });
});

module.exports = router;
