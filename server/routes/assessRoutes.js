const express  = require('express');
const crypto   = require('crypto');
const pool     = require('../db');
const { requireUser } = require('../auth');
const { computeScores } = require('../scoring');
const { generateAndStoreReport } = require('../aiReport');

const router = express.Router();

// GET /api/assess/list — list all assessments for the logged-in user
router.get('/list', requireUser, async (req, res) => {
  const { userId } = req.user;
  try {
    const { rows } = await pool.query(
      `SELECT a.id, a.token, a.status, a.created_at, a.completed_at,
              ar.status AS report_status
       FROM assessments a
       LEFT JOIN ai_reports ar ON ar.assessment_id = a.id
       WHERE a.user_id = $1
       ORDER BY a.created_at DESC`,
      [userId]
    );
    res.json({ assessments: rows });
  } catch (err) {
    console.error('List assessments error:', err);
    res.status(500).json({ error: 'Failed to list assessments' });
  }
});

// POST /api/assess/create — create a new assessment for the logged-in user
router.post('/create', requireUser, async (req, res) => {
  const { userId } = req.user;
  const token = crypto.randomBytes(32).toString('hex');

  try {
    const { rows } = await pool.query(
      `INSERT INTO assessments (user_id, token, status)
       VALUES ($1, $2, 'pending')
       RETURNING id, token`,
      [userId, token]
    );
    res.status(201).json({ token: rows[0].token, assessmentId: rows[0].id });
  } catch (err) {
    console.error('Create assessment error:', err);
    res.status(500).json({ error: 'Failed to create assessment' });
  }
});

// GET /api/assess/:token — get assessment meta + status (validates ownership via JWT)
router.get('/:token', requireUser, async (req, res) => {
  const { userId } = req.user;
  const { token }  = req.params;

  try {
    const { rows } = await pool.query(
      `SELECT a.id, a.token, a.status, a.created_at,
              u.full_name, u.email
       FROM assessments a
       JOIN users u ON u.id = a.user_id
       WHERE a.token = $1 AND a.user_id = $2`,
      [token, userId]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Assessment not found' });
    }
    const a = rows[0];
    if (a.status === 'completed') {
      return res.status(410).json({ error: 'This assessment has already been submitted.' });
    }
    res.json({
      assessmentId:   a.id,
      token:          a.token,
      status:         a.status,
      candidate_name: a.full_name,
      email:          a.email,
      created_at:     a.created_at,
    });
  } catch (err) {
    console.error('Get assessment error:', err);
    res.status(500).json({ error: 'Failed to fetch assessment' });
  }
});

// POST /api/assess/:token/submit — submit 24 responses, compute scores, trigger AI
router.post('/:token/submit', requireUser, async (req, res) => {
  const { userId } = req.user;
  const { token }  = req.params;
  const { responses } = req.body;

  if (!Array.isArray(responses) || responses.length !== 24) {
    return res.status(400).json({ error: '24 responses are required' });
  }

  try {
    const { rows } = await pool.query(
      `SELECT a.id, a.status, u.full_name, u.email
       FROM assessments a
       JOIN users u ON u.id = a.user_id
       WHERE a.token = $1 AND a.user_id = $2`,
      [token, userId]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Assessment not found' });
    }
    const assessment = rows[0];
    if (assessment.status === 'completed') {
      return res.status(410).json({ error: 'Assessment already submitted' });
    }

    const assessmentId = assessment.id;

    // Insert all 24 responses
    for (const r of responses) {
      await pool.query(
        `INSERT INTO responses (assessment_id, question_index, most_dim, least_dim)
         VALUES ($1, $2, $3, $4)`,
        [assessmentId, r.question_index, r.most_dim, r.least_dim]
      );
    }

    // Compute scores
    const scores = computeScores(responses);

    // Store results
    await pool.query(
      `INSERT INTO results
         (assessment_id, g1_d, g1_i, g1_s, g1_c, g2_d, g2_i, g2_s, g2_c,
          g3_d, g3_i, g3_s, g3_c, primary_style, secondary_style)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [
        assessmentId,
        scores.g1.D, scores.g1.I, scores.g1.S, scores.g1.C,
        scores.g2.D, scores.g2.I, scores.g2.S, scores.g2.C,
        scores.g3.D, scores.g3.I, scores.g3.S, scores.g3.C,
        scores.primary_style, scores.secondary_style,
      ]
    );

    // Check AI_REPORT_LIMIT
    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*) FROM ai_reports WHERE status = 'completed'`
    );
    const completedCount = parseInt(countRows[0].count, 10);
    const limit = parseInt(process.env.AI_REPORT_LIMIT || '500', 10);

    if (completedCount < limit) {
      await pool.query(
        `INSERT INTO ai_reports (assessment_id, status) VALUES ($1, 'pending')`,
        [assessmentId]
      );
      // Fire-and-forget
      generateAndStoreReport(assessmentId, scores, {
        full_name: assessment.full_name,
        email:     assessment.email,
      });
    } else {
      await pool.query(
        `INSERT INTO ai_reports (assessment_id, status, queued_at) VALUES ($1, 'queued', NOW())`,
        [assessmentId]
      );
      await pool.query(
        `UPDATE assessments SET status = 'queued' WHERE id = $1`,
        [assessmentId]
      );
    }

    res.json({ assessmentId, status: completedCount < limit ? 'pending' : 'queued' });
  } catch (err) {
    console.error('Submit assessment error:', err);
    res.status(500).json({ error: 'Failed to submit assessment' });
  }
});

module.exports = router;
