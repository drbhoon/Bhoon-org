const express = require('express');
const pool    = require('../db');
const { requireUser } = require('../auth');

const router = express.Router();

// GET /api/report/:assessmentId — full report
router.get('/:assessmentId', requireUser, async (req, res) => {
  const { userId }       = req.user;
  const { assessmentId } = req.params;

  try {
    const { rows } = await pool.query(
      `SELECT a.id, a.status, a.created_at, a.completed_at,
              u.full_name, u.email,
              r.g1_d, r.g1_i, r.g1_s, r.g1_c,
              r.g2_d, r.g2_i, r.g2_s, r.g2_c,
              r.g3_d, r.g3_i, r.g3_s, r.g3_c,
              r.primary_style, r.secondary_style,
              ar.report_json, ar.status AS report_status, ar.generated_at
       FROM assessments a
       JOIN users u ON u.id = a.user_id
       LEFT JOIN results r ON r.assessment_id = a.id
       LEFT JOIN ai_reports ar ON ar.assessment_id = a.id
       WHERE a.id = $1 AND a.user_id = $2`,
      [assessmentId, userId]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const row = rows[0];
    const scores = row.g1_d !== null ? {
      g1: { D: row.g1_d, I: row.g1_i, S: row.g1_s, C: row.g1_c },
      g2: { D: row.g2_d, I: row.g2_i, S: row.g2_s, C: row.g2_c },
      g3: { D: row.g3_d, I: row.g3_i, S: row.g3_s, C: row.g3_c },
      primary_style:   row.primary_style,
      secondary_style: row.secondary_style,
    } : null;

    res.json({
      assessmentId:    row.id,
      status:          row.report_status || 'pending',
      full_name:       row.full_name,
      email:           row.email,
      created_at:      row.created_at,
      completed_at:    row.completed_at,
      scores,
      report:          row.report_json || null,
      generated_at:    row.generated_at,
    });
  } catch (err) {
    console.error('Get report error:', err);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

// GET /api/report/:assessmentId/poll — lightweight status poll
router.get('/:assessmentId/poll', requireUser, async (req, res) => {
  const { userId }       = req.user;
  const { assessmentId } = req.params;

  try {
    const { rows } = await pool.query(
      `SELECT ar.status AS report_status
       FROM assessments a
       JOIN ai_reports ar ON ar.assessment_id = a.id
       WHERE a.id = $1 AND a.user_id = $2`,
      [assessmentId, userId]
    );

    if (!rows.length) {
      return res.json({ status: 'pending' });
    }
    res.json({ status: rows[0].report_status });
  } catch (err) {
    console.error('Poll report error:', err);
    res.status(500).json({ error: 'Failed to poll status' });
  }
});

module.exports = router;
