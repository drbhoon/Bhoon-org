const Anthropic = require('@anthropic-ai/sdk');
const pool      = require('./db');
const { sendReportReadyEmail } = require('./mailer');

const client = new Anthropic();

const SYSTEM_PROMPT = `You are a developmental psychologist and career counsellor specialising in helping engineering graduates in India understand their behavioural style and make better career decisions. You have been given a candidate's DISC profile from a forced-choice behavioural instrument with three graphs. Your job is to generate a comprehensive, honest, and personally useful report written directly to the individual ("You are...", "You tend to..."). This is not an HR selection tool — it is a self-discovery report. Be warm but honest. Name blind spots directly. Career guidance should be broad — covering any engineering, management, consulting, R&D, or entrepreneurial path — not limited to any single company or sector. Return ONLY valid JSON.`;

async function generateAndStoreReport(assessmentId, scoreData, userMeta) {
  const { g1, g2, g3, primary_style, secondary_style } = scoreData;
  const { full_name, email } = userMeta;

  const userPrompt = `Generate a DISC personality report for the following candidate. Return ONLY valid JSON matching the exact schema provided.

Candidate: ${full_name}
Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}

DISC Scores:
Graph I — Work Mask (how they behave at work):
  D: ${g1.D}, I: ${g1.I}, S: ${g1.S}, C: ${g1.C}

Graph II — Under Pressure (instinctive response under stress):
  D: ${g2.D}, I: ${g2.I}, S: ${g2.S}, C: ${g2.C}

Graph III — Self Image (how they see themselves):
  D: ${g3.D}, I: ${g3.I}, S: ${g3.S}, C: ${g3.C}

Primary Style: ${primary_style}
Secondary Style: ${secondary_style}

Return ONLY this JSON structure (no markdown, no explanation, just the JSON object):
{
  "profile_headline": "e.g. 'The Systematic Influencer'",
  "descriptive_words": ["word1", "word2", "...up to 12"],
  "self_image": "4-5 sentences written to the person. Who they naturally are. References DISC scores.",
  "work_style": "4-5 sentences. How Graph I differs from Graph III — what they adapt at work.",
  "under_pressure": "4-5 sentences. Graph II collapse pattern. Name the specific risk. Practical.",
  "job_emphasis": {
    "headline": "3-5 word ideal work type",
    "description": "3-4 sentences on best-fit work environment and task types."
  },
  "motivators": "3-4 sentences. What energises and drives this person.",
  "demotivators": "2-3 sentences. What suppresses or frustrates this profile.",
  "career_paths": [
    { "domain": "Domain name", "fit": "Strong | Good | Moderate", "rationale": "2 sentences." }
  ],
  "development_focus": [
    { "area": "Gap name", "suggestion": "Specific action", "timeline": "3 months | 6 months | 1 year" }
  ],
  "self_coaching_tip": "2-3 sentences. One key mindset shift or daily habit."
}`;

  try {
    const message = await client.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system:     SYSTEM_PROMPT,
      messages:   [{ role: 'user', content: userPrompt }],
    });

    const rawText = message.content[0].text.trim();
    const jsonStart = rawText.indexOf('{');
    const jsonEnd   = rawText.lastIndexOf('}');
    const jsonStr   = rawText.slice(jsonStart, jsonEnd + 1);
    const reportJson = JSON.parse(jsonStr);

    await pool.query(
      `UPDATE ai_reports
       SET report_json = $1, model_used = $2, status = 'completed', generated_at = NOW()
       WHERE assessment_id = $3`,
      [reportJson, message.model, assessmentId]
    );

    await pool.query(
      `UPDATE assessments SET status = 'completed', completed_at = NOW() WHERE id = $1`,
      [assessmentId]
    );

    // Send email if we have the user info
    if (email && full_name) {
      const appUrl    = process.env.APP_URL || 'http://localhost:3001';
      const reportUrl = `${appUrl}/report/${assessmentId}`;
      try {
        await sendReportReadyEmail(email, full_name, reportUrl);
        await pool.query(
          `UPDATE ai_reports SET email_sent = TRUE WHERE assessment_id = $1`,
          [assessmentId]
        );
      } catch (mailErr) {
        console.error('Email send failed:', mailErr.message);
      }
    }
  } catch (err) {
    console.error('AI report generation failed:', err.message);
    await pool.query(
      `UPDATE ai_reports SET status = 'failed' WHERE assessment_id = $1`,
      [assessmentId]
    );
  }
}

module.exports = { generateAndStoreReport };
