import nodemailer from 'nodemailer';


const EMAIL_USER = (process.env.EMAIL_USER || 'mowequar@gmail.com').trim();
const EMAIL_PASS = (process.env.EMAIL_PASS || 'jsjbitfjaluedzqt').replace(/\s+/g, '');
const SMTP_HOST  = (process.env.SMTP_HOST || '').trim();
const SMTP_PORT  = Number(process.env.SMTP_PORT || 587);
const SMTP_USER  = (process.env.SMTP_USER || EMAIL_USER).trim();
const SMTP_PASS  = (process.env.SMTP_PASS || EMAIL_PASS).replace(/\s+/g, '');
const FROM_ADDR  = EMAIL_USER || SMTP_USER || 'mowequar@gmail.com';

const BREVO_API_KEY = (process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY || '').trim();
const RESEND_API_KEY = (process.env.RESEND_API_KEY || '').trim();
const GMAIL_RELAY_URL = (process.env.GMAIL_RELAY_URL || process.env.EMAIL_RELAY_URL || '').trim();

export interface SendEmailPayload {
  fromName?: string;
  fromEmail?: string;
  to: string | string[];
  bcc?: string[];
  subject: string;
  html: string;
}

async function sendViaBrevo(payload: SendEmailPayload, apiKey: string): Promise<boolean> {
  const senderEmail = (process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_USER || FROM_ADDR).trim();
  const toRecipients = Array.isArray(payload.to)
    ? payload.to.map((email) => ({ email }))
    : [{ email: payload.to }];

  const bccRecipients = payload.bcc?.map((email) => ({ email })) || [];

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      sender: {
        name: payload.fromName || 'Mind Maze Study Planner',
        email: senderEmail,
      },
      to: toRecipients,
      ...(bccRecipients.length > 0 ? { bcc: bccRecipients } : {}),
      subject: payload.subject,
      htmlContent: payload.html,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    let errorMsg = errorText;
    try {
      const parsed = JSON.parse(errorText);
      errorMsg = parsed.message || errorText;
    } catch {}
    console.error('[Email:Brevo] Error sending email:', res.status, errorMsg);
    throw new Error(`Brevo API Error (${res.status}): ${errorMsg}`);
  }

  console.log('[Email:Brevo] Successfully sent email via Brevo HTTPS API');
  return true;
}

async function sendViaGmailRelay(payload: SendEmailPayload, relayUrl: string): Promise<boolean> {
  const res = await fetch(relayUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: payload.to,
      bcc: payload.bcc,
      subject: payload.subject,
      html: payload.html,
      fromName: payload.fromName || 'Mind Maze Study Planner',
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error('[Email:GmailRelay] Error response:', res.status, errorText);
    throw new Error(`Gmail Relay Error (${res.status}): ${errorText}`);
  }
  console.log('[Email:GmailRelay] Successfully delivered email via Google Webhook Relay');
  return true;
}

async function sendViaResend(payload: SendEmailPayload, apiKey: string): Promise<boolean> {
  const toRecipients = Array.isArray(payload.to) ? payload.to : [payload.to];
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${payload.fromName || 'Mind Maze'} <${payload.fromEmail || 'onboarding@resend.dev'}>`,
      to: toRecipients,
      bcc: payload.bcc,
      subject: payload.subject,
      html: payload.html,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error('[Email:Resend] Error:', res.status, errorText);
    throw new Error(`Resend API Error (${res.status}): ${errorText}`);
  }
  console.log('[Email:Resend] Successfully sent email via Resend API');
  return true;
}

function createPrimaryTransporter() {
  if (SMTP_HOST) {
    return nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 8000,
    });
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    tls: { rejectUnauthorized: false },
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 8000,
  });
}

function createFallbackTransporter() {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    tls: { rejectUnauthorized: false },
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 8000,
  });
}

async function dispatchEmail(payload: SendEmailPayload): Promise<void> {
  const brevoKey = (process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY || BREVO_API_KEY || '').trim();
  const gmailRelay = (process.env.GMAIL_RELAY_URL || process.env.EMAIL_RELAY_URL || GMAIL_RELAY_URL || '').trim();
  const resendKey = (process.env.RESEND_API_KEY || RESEND_API_KEY || '').trim();

  if (brevoKey) {
    const success = await sendViaBrevo(payload, brevoKey);
    if (success) return;
  }

  if (gmailRelay) {
    const success = await sendViaGmailRelay(payload, gmailRelay);
    if (success) return;
  }

  if (resendKey) {
    const success = await sendViaResend(payload, resendKey);
    if (success) return;
  }

  const primary = createPrimaryTransporter();
  const mailOptions: nodemailer.SendMailOptions = {
    from: `"${payload.fromName || 'Mind Maze'}" <${payload.fromEmail || FROM_ADDR}>`,
    to: payload.to,
    bcc: payload.bcc,
    subject: payload.subject,
    html: payload.html,
  };

  try {
    await primary.sendMail(mailOptions);
    console.log('[Email:SMTP] Delivered via primary SMTP');
    return;
  } catch (err: any) {
    console.warn('[Email:SMTP] Primary SMTP failed (likely Render port 465 block):', err?.message || err);
    try {
      const fallback = createFallbackTransporter();
      await fallback.sendMail(mailOptions);
      console.log('[Email:SMTP] Delivered via fallback port 587 SMTP');
      return;
    } catch (fallbackErr: any) {
      const errMsg = fallbackErr?.message || String(fallbackErr);
      console.error('[Email:SMTP] Fallback port 587 also failed:', errMsg);

      if (errMsg.includes('timeout') || errMsg.includes('ETIMEDOUT') || errMsg.includes('ECONNREFUSED')) {
        throw new Error(
          'Render blocks outbound SMTP ports (465/587). To enable instant email delivery, add a free BREVO_API_KEY or GMAIL_RELAY_URL in your Render Environment Variables.'
        );
      }
      throw new Error(`Email delivery failed: ${errMsg}`);
    }
  }
}

export const sendStudyReminderEmail = async (
  toEmail: string,
  userName: string,
  subject: string,
  topic: string,
  startTime: string,
  notes?: string
) => {
  if (!toEmail) return;

  await dispatchEmail({
    fromName: 'Mind Maze Study Planner',
    fromEmail: FROM_ADDR,
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

export const sendAdminBroadcastEmail = async (
  recipients: string[],
  subject: string,
  messageBody: string
) => {
  const validRecipients = (recipients || []).filter(Boolean);
  if (validRecipients.length === 0) {
    validRecipients.push(FROM_ADDR);
  }

  const BATCH_SIZE = 40;
  const batches: string[][] = [];
  for (let i = 0; i < validRecipients.length; i += BATCH_SIZE) {
    batches.push(validRecipients.slice(i, i + BATCH_SIZE));
  }

  for (const batch of batches) {
    await dispatchEmail({
      fromName: 'Mind Maze Admin',
      fromEmail: FROM_ADDR,
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

  console.log(`[Email] Broadcast dispatched to ${validRecipients.length} user(s).`);
};

export const sendTestEmail = async (toEmail: string) => {
  const target = toEmail || FROM_ADDR;
  await dispatchEmail({
    fromName: 'Mind Maze Test',
    fromEmail: FROM_ADDR,
    to: target,
    subject: 'Mind Maze Email Service Verification',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b; max-width: 500px;">
        <h2 style="color: #4f46e5;">Mind Maze Email Verification</h2>
        <p>Your Mind Maze email notification service is active and working properly!</p>
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

export const sendPasswordResetEmail = async (
  toEmail: string,
  userName: string,
  resetUrl: string
) => {
  if (!toEmail) return;

  await dispatchEmail({
    fromName: 'Mind Maze Support',
    fromEmail: FROM_ADDR,
    to: toEmail,
    subject: 'Reset Your Mind Maze Password',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 24px; color: #1e293b; max-width: 560px; background-color: #0d0f1e; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #ffffff; font-size: 24px; margin: 0 0 8px 0;">Password Reset Request</h2>
          <p style="color: #94a3b8; font-size: 14px; margin: 0;">Mind Maze GCE A/L Study Assistant</p>
        </div>
        <div style="background-color: #161936; padding: 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); margin-bottom: 24px;">
          <p style="color: #e2e8f0; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
            Hi <strong>${userName || 'Student'}</strong>,
          </p>
          <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
            We received a request to reset the password for your Mind Maze account associated with <strong>${toEmail}</strong>. Click the button below to set a new password:
          </p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${resetUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #6b4eff, #8b5cf6); color: #ffffff; font-weight: bold; text-decoration: none; border-radius: 12px; font-size: 14px; box-shadow: 0 4px 15px rgba(107, 78, 255, 0.4);">
              Reset My Password
            </a>
          </div>
          <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin: 0;">
            If the button doesn't work, copy and paste this link into your browser:<br/>
            <a href="${resetUrl}" style="color: #38bdf8; word-break: break-all;">${resetUrl}</a>
          </p>
        </div>
        <p style="color: #64748b; font-size: 12px; text-align: center; margin: 0;">
          This link will expire in 1 hour. If you did not request a password reset, you can safely ignore this email.
        </p>
      </div>
    `,
  });

  console.log(`[Email] Password reset email sent to ${toEmail}`);
};


export async function sendVerificationEmail(to:string,code:string) {
 await dispatchEmail({fromName:'Mind Maze',fromEmail:FROM_ADDR,to,subject:'Verify your Mind Maze email',html:'<div style="font-family:Arial;padding:24px"><h2>Verify your email</h2><p>Your Mind Maze verification code is:</p><p style="font-size:32px;font-weight:bold;letter-spacing:6px">'+code+'</p><p>This code expires in 10 minutes. Do not share it. If you did not request it, ignore this email.</p></div>'});
}
