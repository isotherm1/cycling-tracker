const xml2js = require('xml2js');

/**
 * 解析 GPX 文件内容，返回结构化数据
 */
async function parseGPX(xmlContent) {
  const parser = new xml2js.Parser({ explicitArray: true });
  const result = await parser.parseStringPromise(xmlContent);

  const gpx = result.gpx;
  if (!gpx) throw new Error('无效的 GPX 文件');

  // 提取元数据
  const metaName = gpx.metadata?.[0]?.name?.[0] || '';
  const trkName = gpx.trk?.[0]?.name?.[0] || '';
  const name = metaName || trkName || '未命名骑行';

  // 提取运动类型
  const typeRaw = gpx.trk?.[0]?.type?.[0] || 'cycling';

  // 提取所有轨迹点
  const trackPoints = [];
  const trks = gpx.trk || [];

  for (const trk of trks) {
    const trksegs = trk.trkseg || [];
    for (const seg of trksegs) {
      const trkpts = seg.trkpt || [];
      for (let i = 0; i < trkpts.length; i++) {
        const pt = trkpts[i];
        const lat = parseFloat(pt.$.lat);
        const lon = parseFloat(pt.$.lon);
        const ele = pt.ele ? parseFloat(pt.ele[0]) : null;
        const time = pt.time ? pt.time[0] : null;

        // 扩展字段（心率、踏频）
        let heartRate = null;
        let cadence = null;
        const ext = pt.extensions?.[0];
        if (ext) {
          // Garmin 扩展
          const tpx = ext['gpxtpx:TrackPointExtension']?.[0] || ext['ns3:TrackPointExtension']?.[0];
          if (tpx) {
            heartRate = tpx['gpxtpx:hr']?.[0] ? parseInt(tpx['gpxtpx:hr'][0]) : null;
            cadence = tpx['gpxtpx:cad']?.[0] ? parseInt(tpx['gpxtpx:cad'][0]) : null;
            heartRate = heartRate || (tpx['ns3:hr']?.[0] ? parseInt(tpx['ns3:hr'][0]) : null);
            cadence = cadence || (tpx['ns3:cad']?.[0] ? parseInt(tpx['ns3:cad'][0]) : null);
          }
        }

        if (!isNaN(lat) && !isNaN(lon)) {
          trackPoints.push({ lat, lon, elevation: ele, time, heartRate, cadence, order: trackPoints.length });
        }
      }
    }
  }

  if (trackPoints.length === 0) throw new Error('GPX 文件中没有轨迹点');

  const stats = calculateStats(trackPoints);

  return {
    name,
    sportType: normalizeSportType(typeRaw),
    date: trackPoints[0].time ? trackPoints[0].time.substring(0, 10) : new Date().toISOString().substring(0, 10),
    ...stats,
    trackPoints,
  };
}

/**
 * 解析 TCX 文件内容
 */
async function parseTCX(xmlContent) {
  const parser = new xml2js.Parser({ explicitArray: true });
  const result = await parser.parseStringPromise(xmlContent);

  const tcd = result.TrainingCenterDatabase;
  if (!tcd) throw new Error('无效的 TCX 文件');

  const activity = tcd.Activities?.[0]?.Activity?.[0];
  if (!activity) throw new Error('TCX 文件中没有活动数据');

  const sport = activity.$.Sport || 'Biking';
  const id = activity.Id?.[0] || new Date().toISOString();

  const trackPoints = [];
  const laps = activity.Lap || [];

  for (const lap of laps) {
    const tracks = lap.Track || [];
    for (const track of tracks) {
      const tps = track.Trackpoint || [];
      for (const tp of tps) {
        const pos = tp.Position?.[0];
        if (!pos) continue;

        const lat = parseFloat(pos.LatitudeDegrees?.[0]);
        const lon = parseFloat(pos.LongitudeDegrees?.[0]);
        const ele = tp.AltitudeMeters ? parseFloat(tp.AltitudeMeters[0]) : null;
        const time = tp.Time?.[0] || null;
        const heartRate = tp.HeartRateBpm?.[0]?.Value?.[0] ? parseInt(tp.HeartRateBpm[0].Value[0]) : null;
        const cadence = tp.Cadence ? parseInt(tp.Cadence[0]) : null;
        const speed = tp.Extensions?.[0]?.['ns3:TPX']?.[0]?.['ns3:Speed']?.[0]
          ? parseFloat(tp.Extensions[0]['ns3:TPX'][0]['ns3:Speed'][0])
          : null;

        if (!isNaN(lat) && !isNaN(lon)) {
          trackPoints.push({ lat, lon, elevation: ele, time, heartRate, cadence, speed, order: trackPoints.length });
        }
      }
    }
  }

  if (trackPoints.length === 0) throw new Error('TCX 文件中没有轨迹点');

  const stats = calculateStats(trackPoints);

  return {
    name: `骑行 ${id.substring(0, 10)}`,
    sportType: normalizeSportType(sport),
    date: id.substring(0, 10),
    ...stats,
    trackPoints,
  };
}

/**
 * 解析 KML 文件内容
 */
async function parseKML(xmlContent) {
  const parser = new xml2js.Parser({ explicitArray: true });
  const result = await parser.parseStringPromise(xmlContent);

  const kml = result.kml;
  if (!kml) throw new Error('无效的 KML 文件');

  const doc = kml.Document?.[0] || kml;
  const name = doc.name?.[0] || '未命名路线';

  const trackPoints = [];

  // 查找 LineString 坐标
  const findCoordinates = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    if (obj.coordinates) {
      const coordStr = Array.isArray(obj.coordinates) ? obj.coordinates[0] : obj.coordinates;
      const coords = coordStr.trim().split(/\s+/);
      for (const coord of coords) {
        const parts = coord.split(',');
        if (parts.length >= 2) {
          const lon = parseFloat(parts[0]);
          const lat = parseFloat(parts[1]);
          const ele = parts[2] ? parseFloat(parts[2]) : null;
          if (!isNaN(lat) && !isNaN(lon)) {
            trackPoints.push({ lat, lon, elevation: ele, time: null, heartRate: null, cadence: null, order: trackPoints.length });
          }
        }
      }
    }
    for (const key of Object.keys(obj)) {
      if (Array.isArray(obj[key])) {
        for (const item of obj[key]) findCoordinates(item);
      }
    }
  };

  findCoordinates(doc);

  if (trackPoints.length === 0) throw new Error('KML 文件中没有坐标数据');

  const stats = calculateStats(trackPoints);

  return {
    name,
    sportType: 'cycling',
    date: new Date().toISOString().substring(0, 10),
    ...stats,
    trackPoints,
  };
}

/**
 * 根据轨迹点计算统计数据
 */
function calculateStats(points) {
  if (points.length < 2) return { distance: 0, duration: 0, elevationGain: 0, avgSpeed: 0, maxSpeed: 0, avgHeartRate: null, maxHeartRate: null };

  let totalDistance = 0;
  let elevationGain = 0;
  let maxSpeed = 0;
  const speeds = [];
  const heartRates = points.map(p => p.heartRate).filter(h => h != null);

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const dist = haversine(prev.lat, prev.lon, curr.lat, curr.lon);
    totalDistance += dist;

    // 海拔爬升
    if (curr.elevation != null && prev.elevation != null && curr.elevation > prev.elevation) {
      elevationGain += curr.elevation - prev.elevation;
    }

    // 配速
    if (prev.time && curr.time) {
      const timeDiff = (new Date(curr.time) - new Date(prev.time)) / 1000; // 秒
      if (timeDiff > 0 && dist > 0) {
        const speed = (dist / 1000) / (timeDiff / 3600); // km/h
        speeds.push(speed);
        if (speed > maxSpeed && speed < 120) maxSpeed = speed; // 过滤异常值
      }
    }
  }

  // 总时长（秒）
  let duration = 0;
  if (points[0].time && points[points.length - 1].time) {
    duration = Math.round((new Date(points[points.length - 1].time) - new Date(points[0].time)) / 1000);
  }

  const avgSpeed = duration > 0 ? (totalDistance / 1000) / (duration / 3600) : 0;
  const avgHeartRate = heartRates.length > 0 ? Math.round(heartRates.reduce((a, b) => a + b, 0) / heartRates.length) : null;
  const maxHeartRate = heartRates.length > 0 ? Math.max(...heartRates) : null;

  return {
    distance: Math.round(totalDistance),            // 米
    duration,                                        // 秒
    elevationGain: Math.round(elevationGain),        // 米
    avgSpeed: Math.round(avgSpeed * 10) / 10,        // km/h
    maxSpeed: Math.round(maxSpeed * 10) / 10,        // km/h
    avgHeartRate,
    maxHeartRate,
  };
}

/**
 * Haversine 公式计算两点距离（米）
 */
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function normalizeSportType(raw) {
  if (!raw) return 'cycling';
  const r = raw.toLowerCase();
  if (r.includes('bik') || r.includes('cycl') || r.includes('ride')) return 'cycling';
  if (r.includes('run')) return 'running';
  if (r.includes('walk') || r.includes('hik')) return 'hiking';
  if (r.includes('swim')) return 'swimming';
  return 'cycling';
}

module.exports = { parseGPX, parseTCX, parseKML, calculateStats };
