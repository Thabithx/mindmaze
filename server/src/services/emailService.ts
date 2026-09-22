import nodemailer from 'nodemailer';

// ─── Configuration ────────────────────────────────────────────────────────────
// Supports Gmail SMTP with App Password or custom SMTP relay (Brevo/SendGrid/etc.)
// ─────────────────────────────────────────────────────────────────────────────

const EMAIL_USER = (process.env.EMAIL_USER || 'mowequar@gmail.com').trim();
const EMAIL_PASS = (process.env.EMAIL_PASS || 'jsjbitfjaluedzqt').replace(/\s+/g, '');
const SMTP_HOST  = (process.env.SMTP_HOST || '').trim();
const SMTP_PORT  = Number(process.env.SMTP_PORT || 587);
const SMTP_USER  = (process.env.SMTP_USER || EMAIL_USER).trim();
const SMTP_PASS  = (process.env.SMTP_PASS || EMAIL_PASS).replace(/\s+/g, '');
const FROM_ADDR  = EMAIL_USER || SMTP_USER || 'mowequar@gmail.com';

function createPrimaryTransporter() {
  if (SMTP_HOST) {
    return nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 12000,
      greetingTimeout: 12000,
      socketTimeout: 15000,
    });
  }

  // Primary Gmail transport using standard service configuration
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
    connectionTimeout: 12000,
    greetingTimeout: 12000,
    socketTimeout: 15000,
  });
}

function createFallbackTransporter() {
  // Fallback direct SMTP on port 587 with STARTTLS
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
    connectionTimeout: 12000,
    greetingTimeout: 12000,
    socketTimeout: 15000,
  });
}

async function sendMailWithFallback(mailOptions: nodemailer.SendMailOptions) {
  const primary = createPrimaryTransporter();
  try {
    return await primary.sendMail(mailOptions);
  } catch (err: any) {
    console.warn('[Email] Primary transport attempt failed, trying fallback 587:', err?.message || err);
    const fallback = createFallbackTransporter();
    return await fallback.sendMail(mailOptions);
  }
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
  if (!toEmail) return;

  await sendMailWithFallback({
    from: `"Mind Maze Study Planner" <${FROM_ADDR}>`,
    to: toEmail,
    subject: `Study Reminder: ${subject} - ${topic}`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b; max-width: 560px;">
        <h2 style="color: #4f46e5; margin-bottom: 12px;">Hi ${userName}, it's time to study!</h2>
        <p style="font-size: 14px; line-height: 1.6;">Your scheduled study session for <strong>${subject}</strong> is starting at <strong>${startTime}</strong>.</p>
        <div style="background-color: #f8fafc; border-left: 4px solid #4f46e5; padding: 14px; margin: 16px 0; border-radius: 6px;">
          <p style="margin: 0; font-weight: bold; color: #0f172a; font-size: 14px;">Topic: ${topic}</p>
          ${notes ? `<p style="margin: 6px 0 0 0; color: #64748b; font-size: 13px;">Notes: ${notes}</p>` : ''}
        </div>
        <p style="font-size: 14px; color: #334155;">Stay focused, tick off subtopics, and build your daily streak!</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #94a3b8; margin: 0;">Mind Maze GCE A/L Study Assistant</p>
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
  const validRecipients = (recipients || []).filter(Boolean);
  if (validRecipients.length === 0) {
    validRecipients.push(FROM_ADDR);
  }

  // Send in BCC batches of 40 to stay well within SMTP boundaries
  const BATCH_SIZE = 40;
  const batches: string[][] = [];
  for (let i = 0; i < validRecipients.length; i += BATCH_SIZE) {
    batches.push(validRecipients.slice(i, i + BATCH_SIZE));
  }

  for (const batch of batches) {
    await sendMailWithFallback({
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

  console.log(`[Email] Broadcast sent to ${validRecipients.length} users in ${batches.length} batch(es).`);
};

// ─── Test Email ───────────────────────────────────────────────────────────────
export const sendTestEmail = async (toEmail: string) => {
  const target = toEmail || FROM_ADDR;
  await sendMailWithFallback({
    from: `"Mind Maze Test" <${FROM_ADDR}>`,
    to: target,
    subject: 'Mind Maze Email Service Test',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b; max-width: 500px;">
        <h2 style="color: #4f46e5;">Mind Maze Email Verification</h2>
        <p>Your Mind Maze email notification service is connected and functioning properly!</p>
        <div style="background-color: #f1f5f9; padding: 12px 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0; font-size: 13px; color: #334155;"><strong>Status:</strong> Connected & Verified</p>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;"><strong>Sender:</strong> ${FROM_ADDR}</p>
        </div>
        <p style="font-size: 12px; color: #94a3b8;">Sent by Mind Maze Platform</p>
      </div>
    `,
  });
  console.log(`[Email] Test email delivered to ${target}`);
};
