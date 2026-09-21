import nodemailer from 'nodemailer';

const userEmail = process.env.EMAIL_USER || 'mowequar@gmail.com';
const userPass = process.env.EMAIL_PASS || ''; // Optional app password or fallback transporter logging

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: userEmail,
    pass: userPass,
  },
});

export const sendStudyReminderEmail = async (
  toEmail: string,
  userName: string,
  subject: string,
  topic: string,
  startTime: string,
  notes?: string
) => {
  if (!userPass) {
    console.log(`[Email Service Simulation] Reminder to ${toEmail}: ${subject} - ${topic} at ${startTime}`);
    return;
  }
  try {
    await transporter.sendMail({
      from: `"Mind Maze Study Planner" <${userEmail}>`,
      to: toEmail,
      subject: `📚 Study Reminder: ${subject} - ${topic}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b;">
          <h2 style="color: #4f46e5;">Hi ${userName}, it's time to study! 🎯</h2>
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
    console.log(`[Email Service] Sent study reminder email to ${toEmail}`);
  } catch (error) {
    console.error(`[Email Service] Failed to send email to ${toEmail}:`, error);
  }
};

export const sendAdminBroadcastEmail = async (
  recipients: string[],
  subject: string,
  messageBody: string
) => {
  if (!userPass) {
    console.log(`[Email Service Simulation] Broadcast to ${recipients.length} users: ${subject}`);
    return;
  }
  try {
    await transporter.sendMail({
      from: `"Mind Maze Admin" <${userEmail}>`,
      bcc: recipients,
      subject: `📢 ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b;">
          <h2 style="color: #4f46e5;">Announcement from Mind Maze Admin</h2>
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 15px 0;">
            ${messageBody.replace(/\n/g, '<br/>')}
          </div>
          <p style="font-size: 12px; color: #94a3b8;">Sent via Mind Maze Administration Panel</p>
        </div>
      `,
    });
    console.log(`[Email Service] Sent broadcast email to ${recipients.length} users`);
  } catch (error) {
    console.error(`[Email Service] Failed to send broadcast email:`, error);
  }
};
