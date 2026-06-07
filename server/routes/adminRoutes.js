const express = require('express');
const pool    = require('../db');
const { generateAndStoreReport } = require('../aiReport');

const router = express.Router();

function requireAdmin(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  if (!authHeader.startsWith('Basic ')) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }
  const decoded    = Buffer.from(authHeader.slice(6), 'base64').toString('utf8');
  const [user, pass] = decoded.split(':');
  if (user !== process.env.ADMIN_USERNAME || pass !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid admin credentials' });
  }
  next();
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

// GET /api/admin/stats
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const [users, completed, queued] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM users`),
      pool.query(`SELECT COUNT(*) FROM ai_reports WHERE status = 'completed'`),
      pool.query(`SELECT COUNT(*) FROM ai_reports WHERE status = 'queued'`),
    ]);
    res.json({
      total_users:       parseInt(users.rows[0].count, 10),
      completed_reports: parseInt(completed.rows[0].count, 10),
      queued_reports:    parseInt(queued.rows[0].count, 10),
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
