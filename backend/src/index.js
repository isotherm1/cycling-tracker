const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { initDb } = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS：允许本地开发和线上前端域名
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  // Vercel 部署后把你的域名加到这里，或直接用 * 通配
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // 允许无 origin（如 curl、移动端直接请求）或在白名单内
    if (!origin || ALLOWED_ORIGINS.includes(origin)) cb(null, true);
    else cb(new Error(`CORS: ${origin} not allowed`));
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth',   require('./routes/auth'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/routes', require('./routes/routes'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// ── 托管前端静态文件 ──────────────────────────────────────
// 生产环境前后端同源部署：一个域名即可，前端 API 走相对路径 /api，无需 CORS。
// 默认在 backend/src 上两级找 frontend/dist，可用 FRONTEND_DIST 环境变量覆盖。
const FRONTEND_DIST = process.env.FRONTEND_DIST
  ? path.resolve(process.env.FRONTEND_DIST)
  : path.join(__dirname, '../../frontend/dist');

if (fs.existsSync(path.join(FRONTEND_DIST, 'index.html'))) {
  app.use(express.static(FRONTEND_DIST));
  // SPA 回退：非 /api 的 GET 请求都交给前端 index.html 处理路由
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
  console.log(`Serving frontend from ${FRONTEND_DIST}`);
} else {
  console.log(`Frontend build not found at ${FRONTEND_DIST} — running in API-only mode`);
}

// 全局错误处理
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

initDb().then(() => {
  app.listen(PORT, () => console.log(`Backend running at http://localhost:${PORT}`));
}).catch(err => {
  console.error('DB init failed:', err);
  process.exit(1);
});
