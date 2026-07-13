const express = require('express');
const cors = require('cors');
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
