const { Pool } = require('pg');

// Railway 自动注入 DATABASE_URL，本地开发用各字段
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
    })
  : new Pool({
      host:     process.env.DB_HOST     || 'localhost',
      port:     parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME     || 'cycling_tracker',
      user:     process.env.DB_USER     || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      ssl: false,
      max: 10,
      idleTimeoutMillis: 30000,
    });

pool.on('error', (err) => {
  console.error('Unexpected DB pool error:', err.message);
});

async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id         SERIAL PRIMARY KEY,
        email      TEXT NOT NULL UNIQUE,
        password   TEXT NOT NULL,
        nickname   TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS routes (
        id                SERIAL PRIMARY KEY,
        user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name              TEXT NOT NULL,
        sport_type        TEXT DEFAULT 'cycling',
        date              TEXT NOT NULL,
        distance          REAL DEFAULT 0,
        duration          INTEGER DEFAULT 0,
        elevation_gain    REAL DEFAULT 0,
        avg_speed         REAL DEFAULT 0,
        max_speed         REAL DEFAULT 0,
        avg_heart_rate    INTEGER,
        max_heart_rate    INTEGER,
        calories          INTEGER,
        file_type         TEXT NOT NULL,
        original_filename TEXT,
        created_at        TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS track_points (
        id          SERIAL PRIMARY KEY,
        route_id    INTEGER NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
        lat         REAL NOT NULL,
        lon         REAL NOT NULL,
        elevation   REAL,
        time        TEXT,
        heart_rate  INTEGER,
        cadence     INTEGER,
        speed       REAL,
        point_order INTEGER NOT NULL
      )
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_tp_route    ON track_points(route_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_routes_uid  ON routes(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_routes_date ON routes(date)`);

    console.log('Database initialized');
  } finally {
    client.release();
  }
}

async function dbAll(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows;
}

async function dbGet(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows[0] || null;
}

async function dbRun(sql, params = []) {
  const result = await pool.query(sql, params);
  return {
    lastInsertId: result.rows[0]?.id || null,
    changes: result.rowCount,
  };
}

module.exports = { pool, initDb, dbAll, dbGet, dbRun };
