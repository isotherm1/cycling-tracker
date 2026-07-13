const express = require('express');
const { dbAll, dbGet, dbRun } = require('../database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// 所有路由都需要登录
router.use(requireAuth);

// GET /api/routes
router.get('/', async (req, res) => {
  try {
    const { sport, startDate, endDate, limit = 100, offset = 0 } = req.query;
    const uid = req.user.id;

    let sql = `SELECT * FROM routes WHERE user_id = $1`;
    const params = [uid];
    let idx = 2;

    if (sport)     { sql += ` AND sport_type = $${idx++}`; params.push(sport); }
    if (startDate) { sql += ` AND date >= $${idx++}`;      params.push(startDate); }
    if (endDate)   { sql += ` AND date <= $${idx++}`;      params.push(endDate); }

    sql += ` ORDER BY date DESC, id DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(parseInt(limit), parseInt(offset));

    const routes = await dbAll(sql, params);
    const formatted = routes.map(r => ({
      ...r,
      distanceKm: (r.distance / 1000).toFixed(2),
      durationFormatted: formatDuration(r.duration),
    }));

    res.json({ routes: formatted, total: formatted.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/routes/stats
router.get('/stats', async (req, res) => {
  try {
    const uid = req.user.id;

    const total = await dbGet(
      `SELECT COUNT(*) as count, SUM(distance) as totaldist,
       SUM(duration) as totaldur, SUM(elevation_gain) as totalele
       FROM routes WHERE user_id = $1`,
      [uid]
    );

    const monthly = await dbAll(
      `SELECT substring(date,1,7) as month, COUNT(*) as count,
              SUM(distance) as distance, SUM(duration) as duration
       FROM routes WHERE user_id = $1
       GROUP BY month ORDER BY month DESC LIMIT 12`,
      [uid]
    );

    const bySport = await dbAll(
      `SELECT sport_type, COUNT(*) as count, SUM(distance) as distance
       FROM routes WHERE user_id = $1 GROUP BY sport_type`,
      [uid]
    );

    res.json({
      total: {
        count: parseInt(total.count) || 0,
        distanceKm: ((total.totaldist || 0) / 1000).toFixed(1),
        durationHours: ((total.totaldur || 0) / 3600).toFixed(1),
        elevationGainM: Math.round(total.totalele || 0),
      },
      monthly: monthly.map(m => ({
        month: m.month,
        count: parseInt(m.count),
        distanceKm: (m.distance / 1000).toFixed(1),
        durationHours: (m.duration / 3600).toFixed(1),
      })),
      bySport,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/routes/:id
router.get('/:id', async (req, res) => {
  try {
    const route = await dbGet(
      `SELECT * FROM routes WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!route) return res.status(404).json({ error: 'Route not found' });

    const points = await dbAll(
      `SELECT lat, lon, elevation, time, heart_rate, cadence, speed, point_order
       FROM track_points WHERE route_id = $1 ORDER BY point_order ASC`,
      [req.params.id]
    );

    res.json({
      ...route,
      distanceKm: (route.distance / 1000).toFixed(2),
      durationFormatted: formatDuration(route.duration),
      trackPoints: points,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/routes/:id
router.delete('/:id', async (req, res) => {
  try {
    const route = await dbGet(
      `SELECT id FROM routes WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!route) return res.status(404).json({ error: 'Route not found' });

    await dbRun(`DELETE FROM routes WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/routes/:id
router.patch('/:id', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });

    const result = await dbRun(
      `UPDATE routes SET name = $1 WHERE id = $2 AND user_id = $3`,
      [name, req.params.id, req.user.id]
    );
    if (result.changes === 0) return res.status(404).json({ error: 'Route not found' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

function formatDuration(seconds) {
  if (!seconds) return '0min';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h${m}min`;
  if (m > 0) return `${m}min${s}s`;
  return `${s}s`;
}

module.exports = router;
