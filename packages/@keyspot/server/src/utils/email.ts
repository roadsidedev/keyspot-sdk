import nodemailer from 'nodemailer';
import { generateToken, hashToken } from './crypto.js';

const FROM = process.env.EMAIL_FROM || 'KeySpot <noreply@keyspot.dev>';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    return transporter;
  }

  if (process.env.RESEND_API_KEY) {
    transporter = nodemailer.createTransport({
      host: 'smtp.resend.com',
      port: 465,
      secure: true,
      auth: { user: 'resend', pass: process.env.RESEND_API_KEY },
    });
    return transporter;
  }

  return null;
}

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const t = getTransporter();
  if (!t) {
    console.warn('[Email] No SMTP configured — email not sent to', to);
    return;
  }
  try {
    await t.sendMail({ from: FROM, to, subject, html });
  } catch (err) {
    console.warn('[Email] Failed to send email:', err);
  }
}

export function generateVerificationToken(): { token: string; hash: string } {
  const token = generateToken();
  return { token, hash: hashToken(token) };
}

export function sendVerificationEmail(email: string, token: string): Promise<void> {
  const url = `${process.env.APP_URL || 'http://localhost:3000'}/verify-email?token=${token}`;
  return sendEmail(
    email,
    'Verify your email',
    `<p>Click <a href="${url}">here</a> to verify your email. This link expires in 24 hours.</p>`
  );
}

export function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const url = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
  return sendEmail(
    email,
    'Reset your password',
    `<p>Click <a href="${url}">here</a> to reset your password. This link expires in 1 hour.</p>`
  );
}
