import nodemailer from "nodemailer";
import { env } from "../config/env.js";

type EmailMessage = {
  to: string;
  subject: string;
  text: string;
};

const isEmailConfigured = Boolean(env.SMTP_HOST && env.EMAIL_FROM);

const transporter = isEmailConfigured
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    })
  : null;

export const sendEmail = async ({ to, subject, text }: EmailMessage) => {
  if (!transporter || !env.EMAIL_FROM) {
    console.info(`[email skipped] ${subject} -> ${to}`);
    return;
  }

  await transporter.sendMail({
    from: env.EMAIL_FROM,
    to,
    subject,
    text,
  });
};

export const notifyAdmin = async (subject: string, text: string) => {
  if (!env.ADMIN_EMAIL) return;
  await sendEmail({ to: env.ADMIN_EMAIL, subject, text });
};

export const sendEmailSafely = async (message: EmailMessage) => {
  try {
    await sendEmail(message);
  } catch (error) {
    console.error("Email delivery failed", error);
  }
};

export const notifyAdminSafely = async (subject: string, text: string) => {
  try {
    await notifyAdmin(subject, text);
  } catch (error) {
    console.error("Admin email delivery failed", error);
  }
};
