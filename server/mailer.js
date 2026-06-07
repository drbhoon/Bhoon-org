const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

async function sendReportReadyEmail(toEmail, toName, reportUrl) {
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: toEmail,
    subject: 'Your DISC Personality Profile is ready',
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1a2e4a; padding: 28px 32px; border-radius: 8px 8px 0 0;">
          <h1 style="color: #fff; margin: 0; font-size: 22px; font-weight: 900;">KSB Personality Analyser</h1>
          <p style="color: rgba(255,255,255,0.6); margin: 6px 0 0; font-size: 13px;">DISC Behavioural Assessment</p>
        </div>
        <div style="background: #f8fafd; padding: 32px; border-radius: 0 0 8px 8px; border: 1px solid #e0e8f0; border-top: none;">
          <p style="color: #222; font-size: 16px; margin: 0 0 16px;">Hi ${toName},</p>
          <p style="color: #444; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
            Your DISC Personality Profile has been generated and is ready to view. This report is a comprehensive analysis of your behavioural style to help you understand yourself better.
          </p>
          <a href="${reportUrl}" style="display: inline-block; background: #2563a8; color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 700; font-size: 15px;">
            View Your Report
          </a>
          <p style="color: #888; font-size: 13px; margin: 24px 0 0; line-height: 1.6;">
            You can also print your report as a PDF directly from your browser using the print button on the report page.
          </p>
          <hr style="border: none; border-top: 1px solid #e0e8f0; margin: 24px 0;" />
          <p style="color: #aaa; font-size: 12px; margin: 0;">— KSB Personality Analyser</p>
        </div>
      </div>
    `,
  });
}

module.exports = { sendReportReadyEmail };
