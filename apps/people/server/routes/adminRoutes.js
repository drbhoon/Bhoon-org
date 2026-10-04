const express = require('express');
const jwt     = require('jsonwebtoken');
const pool    = require('../db');
const { generateAndStoreReport } = require('../aiReport');

const router = express.Router();

function requireAdmin(req, res, next) {
  const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase();
  const authHeader = req.headers['authorization'] || '';

  // (1) Identity-based: the logged-in user whose email === ADMIN_EMAIL.
  //     Lets the dashboard "Admin" button open the panel with no extra password.
  const bearer   = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const ssoToken = req.cookies?.ksb_sso_token || bearer;
  if (ssoToken && adminEmail) {
    try {
      const payload = jwt.verify(ssoToken, process.env.JWT_SECRET);
      if ((payload.email || '').toLowerCase() === adminEmail) return next();
    } catch { /* fall through to Basic */ }
  }

  // (2) Basic auth: ADMIN_EMAIL (or legacy ADMIN_USERNAME) + ADMIN_PASSWORD.
  if (authHeader.startsWith('Basic ')) {
    const decoded = Buffer.from(authHeader.slice(6), 'base64').toString('utf8');
    const idx  = decoded.indexOf(':');
    const user = decoded.slice(0, idx);
    const pass = decoded.slice(idx + 1);
    const userOk = (!!process.env.ADMIN_USERNAME && user === process.env.ADMIN_USERNAME)
      || (!!adminEmail && user.toLowerCase() === adminEmail);
    if (userOk && process.env.ADMIN_PASSWORD && pass === process.env.ADMIN_PASSWORD) return next();
  }

  return res.status(401).json({ error: 'Admin authentication required' });
}

// GET /api/admin/queue — list all queued reports
router.get('/queue', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT ar.id AS report_id, ar.assessment_id, ar.queued_at,
              u.full_name, u.email,
              a.created_at AS assessment_date
       FROM ai_reports ar
       JOIN assessments a ON a.id = ar.assessment_id
       JOIN users u ON u.id = a.user_id
       WHERE ar.status = 'queued'
       ORDER BY ar.queued_at DESC`
    );
    res.json({ queue: rows });
  } catch (err) {
    console.error('Admin queue error:', err);
    res.status(500).json({ error: 'Failed to fetch queue' });
  }
});

// POST /api/admin/queue/:assessmentId/approve — trigger Claude generation
router.post('/queue/:assessmentId/approve', requireAdmin, async (req, res) => {
  const { assessmentId } = req.params;

  try {
    const { rows } = await pool.query(
      `SELECT ar.id, ar.status,
              r.g1_d, r.g1_i, r.g1_s, r.g1_c,
              r.g2_d, r.g2_i, r.g2_s, r.g2_c,
              r.g3_d, r.g3_i, r.g3_s, r.g3_c,
              r.primary_style, r.secondary_style,
              u.full_name, u.email
       FROM ai_reports ar
       JOIN assessments a ON a.id = ar.assessment_id
       JOIN results r ON r.assessment_id = ar.assessment_id
       JOIN users u ON u.id = a.user_id
       WHERE ar.assessment_id = $1 AND ar.status = 'queued'`,
      [assessmentId]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Queued report not found' });
    }

    const row = rows[0];
    await pool.query(
      `UPDATE ai_reports SET status = 'pending', approved_at = NOW() WHERE assessment_id = $1`,
      [assessmentId]
    );

    const scores = {
      g1: { D: row.g1_d, I: row.g1_i, S: row.g1_s, C: row.g1_c },
      g2: { D: row.g2_d, I: row.g2_i, S: row.g2_s, C: row.g2_c },
      g3: { D: row.g3_d, I: row.g3_i, S: row.g3_s, C: row.g3_c },
      primary_style:   row.primary_style,
      secondary_style: row.secondary_style,
    };

    // Fire-and-forget
    generateAndStoreReport(assessmentId, scores, {
      full_name: row.full_name,
      email:     row.email,
    });

    res.json({ message: 'Generation triggered. Email will be sent on completion.' });
  } catch (err) {
    console.error('Admin approve error:', err);
    res.status(500).json({ error: 'Failed to approve report' });
  }
});

// GET /api/admin/users — everyone who has signed in, with their activity
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.email, u.full_name, u.created_at, u.last_login,
              CASE WHEN u.google_id IS NOT NULL THEN 'google' ELSE 'password' END AS auth_method,
              COUNT(DISTINCT a.id) AS assessments,
              COUNT(DISTINCT CASE WHEN ar.status = 'completed' THEN ar.id END) AS completed_reports
       FROM users u
       LEFT JOIN assessments a ON a.user_id = u.id
       LEFT JOIN ai_reports ar ON ar.assessment_id = a.id
       GROUP BY u.id
       ORDER BY u.last_login DESC NULLS LAST, u.created_at DESC`
    );
    res.json({ users: rows });
  } catch (err) {
    console.error('Admin users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/admin/incomplete — assessments started but never submitted (no report row)
router.get('/incomplete', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT a.id, a.token, a.created_at, u.full_name, u.email
       FROM assessments a
       JOIN users u ON u.id = a.user_id
       LEFT JOIN ai_reports ar ON ar.assessment_id = a.id
       WHERE ar.id IS NULL
       ORDER BY a.created_at DESC`
    );
    res.json({ incomplete: rows });
  } catch (err) {
    console.error('Admin incomplete error:', err);
    res.status(500).json({ error: 'Failed to fetch in-progress assessments' });
  }
});

// DELETE /api/admin/assessment/:id — remove an assessment (cascades responses/results/report)
router.delete('/assessment/:id', requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query(`DELETE FROM assessments WHERE id = $1`, [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Assessment not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Admin delete assessment error:', err);
    res.status(500).json({ error: 'Failed to delete assessment' });
  }
});

// GET /api/admin/stats
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const [users, completed, queued] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM users`),
      pool.query(`SELECT COUNT(*) FROM ai_reports WHERE status = 'completed'`),
      pool.query(`SELECT COUNT(*) FROM ai_reports WHERE status = 'queued'`),
    ]);
    const completedCount = parseInt(completed.rows[0].count, 10);
    const limit = parseInt(process.env.AI_REPORT_LIMIT || '500', 10);
    res.json({
      total_users:       parseInt(users.rows[0].count, 10),
      completed_reports: completedCount,
      queued_reports:    parseInt(queued.rows[0].count, 10),
      limit,
      limit_reached:     completedCount >= limit,
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
