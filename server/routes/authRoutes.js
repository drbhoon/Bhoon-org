const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const pool    = require('../db');

const router = express.Router();

// ── Shared cookie helper ─────────────────────────────────────────────────────
function setSSOCookie(res, token) {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('ksb_sso_token', token, {
    domain:   isProd ? '.bhoon.org' : undefined,
    path:     '/',
    maxAge:   7 * 24 * 60 * 60 * 1000,  // 7 days
    httpOnly: true,
    secure:   isProd,
    sameSite: 'lax',
  });
}

// ── Standard SSO JWT payload ─────────────────────────────────────────────────
function signSSOToken(user) {
  return jwt.sign(
    {
      sub:       user.google_id || user.id,
      email:     user.email,
      name:      user.full_name,
      picture:   user.picture || null,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// ── POST /api/auth/register ──────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { email, password, full_name } = req.body;

  if (!email || !password || !full_name) {
    return res.status(400).json({ error: 'email, password and full_name are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, full_name)
       VALUES ($1, $2, $3)
       RETURNING id, email, full_name, google_id, picture`,
      [email.toLowerCase().trim(), hash, full_name.trim()]
    );
    const user  = rows[0];
    const token = signSSOToken(user);
    setSSOCookie(res, token);
    res.status(201).json({ token, user: { id: user.id, email: user.email, full_name: user.full_name } });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, email, full_name, password_hash, google_id, picture
       FROM users WHERE email = $1`,
      [email.toLowerCase().trim()]
    );
    if (!rows.length) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const user = rows[0];
    if (!user.password_hash) {
      return res.status(401).json({ error: 'This account uses Google sign-in. Please use "Continue with Google".' });
    }
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const token = signSSOToken(user);
    setSSOCookie(res, token);
    res.json({ token, user: { id: user.id, email: user.email, full_name: user.full_name } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ── POST /api/auth/logout ────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  const isProd = process.env.NODE_ENV === 'production';
  res.clearCookie('ksb_sso_token', {
    domain: isProd ? '.bhoon.org' : undefined,
    path:   '/',
  });
  res.json({ success: true });
});

// ── GET /api/auth/google ─────────────────────────────────────────────────────
router.get('/google', (req, res) => {
  const params = new URLSearchParams({
    client_id:     process.env.GOOGLE_CLIENT_ID,
    redirect_uri:  process.env.GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope:         'openid email profile',
    access_type:   'online',
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

// ── GET /api/auth/google/callback ────────────────────────────────────────────
router.get('/google/callback', async (req, res) => {
  const { code, error } = req.query;
  const appUrl = process.env.APP_URL || 'http://localhost:5173';

  if (error || !code) {
    return res.redirect(`${appUrl}/login?error=oauth_cancelled`);
  }

  try {
    // Exchange code for access token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id:     process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri:  process.env.GOOGLE_REDIRECT_URI,
        grant_type:    'authorization_code',
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      console.error('Google token exchange failed:', tokenData);
      return res.redirect(`${appUrl}/login?error=token_exchange_failed`);
    }

    // Fetch user profile
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json();
    if (!profileRes.ok || !profile.email) {
      return res.redirect(`${appUrl}/login?error=profile_fetch_failed`);
    }

    // Check optional email allowlist
    const allowed = process.env.ALLOWED_EMAILS;
    if (allowed) {
      const list = allowed.split(',').map((e) => e.trim().toLowerCase());
      if (!list.includes(profile.email.toLowerCase())) {
        return res.redirect(`${appUrl}/login?error=not_allowed`);
      }
    }

    // Upsert user in DB
    const { rows } = await pool.query(
      `INSERT INTO users (email, full_name, google_id, picture, last_login)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (email) DO UPDATE
         SET google_id  = EXCLUDED.google_id,
             picture    = EXCLUDED.picture,
             full_name  = COALESCE(users.full_name, EXCLUDED.full_name),
             last_login = NOW()
       RETURNING id, email, full_name, google_id, picture`,
      [profile.email, profile.name, profile.id, profile.picture]
    );
    const user = rows[0];

    // Sign SSO JWT and set .bhoon.org cookie
    const token = signSSOToken(user);
    setSSOCookie(res, token);

    // Redirect to app with token in URL (for localStorage fallback)
    res.redirect(`${appUrl}?token=${encodeURIComponent(token)}`);
  } catch (err) {
    console.error('[google/callback] error:', err);
    res.redirect(`${appUrl}/login?error=server_error`);
  }
});

// ── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', async (req, res) => {
  const token = req.cookies?.ksb_sso_token
    || (req.headers['authorization']?.startsWith('Bearer ')
        ? req.headers['authorization'].slice(7) : null);
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await pool.query(
      'SELECT id, email, full_name, picture FROM users WHERE email = $1',
      [payload.email]
    );
    if (!rows.length) return res.status(401).json({ error: 'User not found' });
    res.json({ user: rows[0] });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
