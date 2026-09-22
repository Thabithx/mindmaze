import nodemailer from 'nodemailer';

// ─── Configuration ────────────────────────────────────────────────────────────
// Supports two setups:
//   A) Gmail SMTP — set EMAIL_USER + EMAIL_PASS (Gmail App Password, NOT your
//      regular Google password). Requires 2-Step Verification on the account.
//   B) Generic SMTP — set SMTP_HOST + SMTP_PORT + SMTP_USER + SMTP_PASS.
//      Works with services like Brevo (free 300/day), Mailersend, etc.
//
// If NO credentials are configured the service throws a descriptive error so
// the admin panel shows a clear message instead of silently doing nothing.
// ─────────────────────────────────────────────────────────────────────────────

const EMAIL_USER  = (process.env.EMAIL_USER  || '').trim();
const EMAIL_PASS  = (process.env.EMAIL_PASS  || '').replace(/\s+/g, '');
const SMTP_HOST   = (process.env.SMTP_HOST   || '').trim();
const SMTP_PORT   = Number(process.env.SMTP_PORT  || 587);
const SMTP_USER   = (process.env.SMTP_USER   || EMAIL_USER).trim();
const SMTP_PASS   = (process.env.SMTP_PASS   || EMAIL_PASS).replace(/\s+/g, '');
const FROM_ADDR   = EMAIL_USER || SMTP_USER || 'mowequar@gmail.com';

function isConfigured(): boolean {
  return !!(EMAIL_PASS || SMTP_PASS);
}

function createTransport() {
  if (!isConfigured()) {
    throw new Error(
      'Email not configured. Set EMAIL_USER + EMAIL_PASS (Gmail App Password) ' +
      'or SMTP_HOST + SMTP_PORT + SMTP_USER + SMTP_PASS in environment variables on Render.'
    );
  }

  if (SMTP_HOST) {
    // Generic SMTP (Brevo, Mailersend, etc.)
    return nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
      tls: { rejectUnauthorized: false },
    });
  }

  // Gmail SMTP with App Password (direct host connection for reliable cloud delivery)
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    tls: { rejectUnauthorized: false },
  });
}

// ─── Study Reminder ───────────────────────────────────────────────────────────
export const sendStudyReminderEmail = async (
  toEmail: string,
  userName: string,
  subject: string,
  topic: string,
  startTime: string,
  notes?: string
) => {
  const transporter = createTransport(); // throws if not configured
  await transporter.sendMail({
    from: `"Mind Maze Study Planner" <${FROM_ADDR}>`,
    to: toEmail,
    subject: `Study Reminder: ${subject} - ${topic}`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b;">
        <h2 style="color: #4f46e5;">Hi ${userName}, it's time to study!</h2>
        <p>Your scheduled study session for <strong>${subject}</strong> is starting at <strong>${startTime}</strong>.</p>
        <div style="background-color: #f8fafc; border-left: 4px solid #4f46e5; padding: 15px; margin: 15px 0;">
          <p style="margin: 0; font-weight: bold;">Topic: ${topic}</p>
          ${notes ? `<p style="margin: 5px 0 0 0; color: #64748b;">Notes: ${notes}</p>` : ''}
        </div>
        <p>Stay focused and build your streak!</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #94a3b8;">Mind Maze GCE A/L Study Assistant</p>
      </div>
    `,
  });
  console.log(`[Email] Sent study reminder to ${toEmail}`);
};

// ─── Admin Broadcast ──────────────────────────────────────────────────────────
export const sendAdminBroadcastEmail = async (
  recipients: string[],
  subject: string,
  messageBody: string
) => {
  if (recipients.length === 0) {
    throw new Error('No recipients provided.');
  }

  const transporter = createTransport(); // throws with a clear message if not configured

  // Send in BCC batches of 50 to avoid SMTP rate limits
  const BATCH_SIZE = 50;
  const batches: string[][] = [];
  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    batches.push(recipients.slice(i, i + BATCH_SIZE));
  }

  for (const batch of batches) {
    await transporter.sendMail({
      from: `"Mind Maze Admin" <${FROM_ADDR}>`,
      to: FROM_ADDR,
      bcc: batch,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b; max-width: 600px;">
          <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 20px; border-radius: 12px 12px 0 0;">
            <h2 style="color: #fff; margin: 0;">Announcement from Mind Maze</h2>
          </div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px; padding: 24px;">
            <div style="font-size: 15px; line-height: 1.7; color: #334155;">
              ${messageBody.replace(/\n/g, '<br/>')}
            </div>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="font-size: 12px; color: #94a3b8; margin: 0;">
              Sent via Mind Maze Administration Panel &mdash; GCE A/L Study Assistant
            </p>
          </div>
        </div>
      `,
    });
  }

  console.log(`[Email] Broadcast sent to ${recipients.length} users in ${batches.length} batch(es).`);
};

