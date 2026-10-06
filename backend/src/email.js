import nodemailer from 'nodemailer';

let transporter = null;

/**
 * Escapes HTML characters in user-supplied strings to prevent HTML injection/stored XSS in email clients.
 */
export function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Creates and caches a Nodemailer transport instance.
 * Supports:
 * 1. Gmail OAuth2 (GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN)
 * 2. Standard SMTP / App Passwords (EMAIL_USER, EMAIL_PASS, EMAIL_HOST, EMAIL_PORT)
 * 3. Ethereal Email test account for development/testing
 */
export async function getTransporter() {
  if (transporter) return transporter;

  const gmailClientId = process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENt_ID || process.env.GMAIL_CLIENT_ID;
  const gmailClientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.GMAIL_CLIENT_SECRET;
  const gmailRefreshToken = process.env.GOOGLE_REFRESH_TOKEN || process.env.GMAIL_REFRESH_TOKEN;
  const gmailUser = process.env.GOOGLE_USER || process.env.GMAIL_USER || process.env.EMAIL_USER;

  // 1. Gmail OAuth2 Configuration
  if (gmailClientId && gmailClientSecret && gmailRefreshToken && gmailUser) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: gmailUser,
        clientId: gmailClientId,
        clientSecret: gmailClientSecret,
        refreshToken: gmailRefreshToken
      }
    });
    return transporter;
  }

  // 2. Standard SMTP Configuration (e.g. Gmail App Password, Mailgun, SendGrid)
  const host = process.env.EMAIL_HOST;
  const port = process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT, 10) : 587;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (user && pass) {
    transporter = nodemailer.createTransport({
      host: host || 'smtp.gmail.com',
      port: port || 587,
      secure: port === 465,
      auth: { user, pass }
    });
    return transporter;
  }

  // 3. Development Fallback using Ethereal Test Account
  try {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
    console.log('Using Ethereal test mail service for development:', testAccount.user);
  } catch (_err) {
    // Offline or restricted network fallback
    transporter = nodemailer.createTransport({ jsonTransport: true });
  }

  return transporter;
}

/**
 * Sends branded email verification with both OTP code and one-click activation link.
 * All dynamic parameters are strictly HTML-escaped.
 */
export async function sendVerificationEmail({ email, name, code, token }) {
  const mailClient = await getTransporter();
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const safeName = escapeHtml(name);
  const safeEmail = encodeURIComponent(email);
  const safeToken = encodeURIComponent(token);
  const verifyLink = `${clientUrl}/verify-email?token=${safeToken}&email=${safeEmail}`;

  const html = `
    <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #1f8a7a; margin: 0; font-size: 24px; font-weight: 700;">GroupSpend</h2>
        <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Shared Expense Management</p>
      </div>

      <p style="color: #0f172a; font-size: 16px;">Hi <strong>${safeName}</strong>,</p>
      <p style="color: #475569; font-size: 14px; line-height: 1.5;">
        Thank you for creating an account with GroupSpend. Please verify your email address to secure your account.
      </p>

      <div style="background-color: #e6f4f1; border-radius: 12px; padding: 18px; text-align: center; margin: 24px 0;">
        <span style="color: #176f62; font-size: 13px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em; display: block; margin-bottom: 6px;">Your 6-digit verification code</span>
        <span style="color: #1f8a7a; font-size: 32px; font-weight: 800; letter-spacing: 6px; font-family: monospace;">${escapeHtml(code)}</span>
      </div>

      <div style="text-align: center; margin: 24px 0;">
        <a href="${verifyLink}" style="display: inline-block; background-color: #1f8a7a; color: #ffffff; text-decoration: none; font-weight: 600; padding: 12px 28px; border-radius: 10px; font-size: 14px;">
          Verify email address
        </a>
      </div>

      <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
        If you did not create a GroupSpend account, you can safely ignore this email. This link and code expire in 24 hours.
      </p>
    </div>
  `;

  const fromAddress = process.env.EMAIL_FROM || process.env.GOOGLE_USER || process.env.GMAIL_USER || process.env.EMAIL_USER || 'no-reply@groupspend.com';

  const info = await mailClient.sendMail({
    from: `"GroupSpend" <${fromAddress}>`,
    to: email,
    subject: `Verify your email: ${code} is your GroupSpend code`,
    html,
    text: `Hi ${name},\n\nYour GroupSpend verification code is: ${code}\nOr verify via this link: ${verifyLink}\n\nThis expires in 24 hours.`
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log(`✉️ Verification email preview URL: ${previewUrl}`);
  }

  return { info, previewUrl, code, verifyLink };
}
