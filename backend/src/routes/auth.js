const express = require('express');
const bcrypt = require('bcryptjs');
const { dbGet, dbRun } = require('../database');
const { signToken, requireAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, nickname } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const exists = await dbGet('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (exists) return res.status(409).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 10);
    const user = await dbGet(
      'INSERT INTO users (email, password, nickname) VALUES ($1, $2, $3) RETURNING id, email, nickname',
      [email.toLowerCase(), hash, nickname || email.split('@')[0]]
    );

    const token = signToken({ id: user.id, email: user.email });
    res.status(201).json({ token, user: { id: user.id, email: user.email, nickname: user.nickname } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = await dbGet('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password' });

    const token = signToken({ id: user.id, email: user.email });
    res.json({ token, user: { id: user.id, email: user.email, nickname: user.nickname } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/auth/me — 验证当前 token
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await dbGet('SELECT id, email, nickname, created_at FROM users WHERE id = $1', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
