import nodemailer from 'nodemailer';

/**
 * Returns a Nodemailer transporter configured from environment variables.
 *
 * Required env vars:
 *   EMAIL_HOST     SMTP host (e.g. smtp.gmail.com)
 *   EMAIL_PORT     SMTP port (e.g. 587)
 *   EMAIL_USER     SMTP username / email address
 *   EMAIL_PASS     SMTP password or App Password
 *   EMAIL_FROM     "From" display name + address (e.g. "Château Glow <noreply@browz.com>")
 */
export function createTransporter() {
  const host = process.env.EMAIL_HOST;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!host || !user || !pass) {
    throw new Error(
      'Email is not configured. Please set EMAIL_HOST, EMAIL_USER, and EMAIL_PASS in your .env file.'
    );
  }

  return nodemailer.createTransport({
    host,
    port: Number(process.env.EMAIL_PORT ?? 587),
    secure: Number(process.env.EMAIL_PORT ?? 587) === 465, // true only for port 465
    auth: { user, pass },
  });
}

export const FROM_ADDRESS =
  process.env.EMAIL_FROM ?? process.env.EMAIL_USER ?? 'Château Glow <noreply@browz.com>';
