const jwt  = require('jsonwebtoken');
const pool = require('./db');

async function requireUser(req, res, next) {
  // Cookie (SSO) takes priority; fall back to Authorization header
  const token = req.cookies?.ksb_sso_token
    || (req.headers['authorization']?.startsWith('Bearer ')
        ? req.headers['authorization'].slice(7) : null);

  if (!token) return res.status(401).json({ error: 'Authentication required' });

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const email = payload.email;
  if (!email) return res.status(401).json({ error: 'Invalid token' });

  try {
    // Lazy-provision: upsert user by email on every authenticated request
    const { rows } = await pool.query(
      `INSERT INTO users (email, full_name, google_id, picture, last_login)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (email) DO UPDATE
         SET google_id   = COALESCE(EXCLUDED.google_id,  users.google_id),
             picture     = COALESCE(EXCLUDED.picture,     users.picture),
             last_login  = NOW()
       RETURNING id, email, full_name, picture`,
      [email, payload.name || payload.full_name || email,
       payload.sub || null, payload.picture || null]
    );
    req.user = {
      userId:    rows[0].id,
      email:     rows[0].email,
      full_name: rows[0].full_name,
      picture:   rows[0].picture,
    };
    next();
  } catch (err) {
    console.error('[requireUser] DB error:', err);
    return res.status(500).json({ error: 'Auth error' });
  }
}

module.exports = { requireUser };
