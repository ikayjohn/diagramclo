import nodemailer from "nodemailer";
import { env } from "../config/env.js";

type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
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

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const renderEmailTemplate = ({
  title,
  intro,
  rows = [],
  footer = "Diagramclo",
}: {
  title: string;
  intro: string;
  rows?: Array<[string, string]>;
  footer?: string;
}) => `
  <!doctype html>
  <html>
    <body style="margin:0;background:#f5f5f5;color:#050505;font-family:Arial,sans-serif;">
      <div style="max-width:620px;margin:0 auto;background:#ffffff;padding:32px;">
        <h1 style="font-size:34px;line-height:0.95;margin:0 0 18px;text-transform:uppercase;letter-spacing:-1px;">${escapeHtml(title)}</h1>
        <p style="font-size:15px;line-height:1.5;margin:0 0 24px;">${escapeHtml(intro)}</p>
        ${
          rows.length
            ? `<table style="border-collapse:collapse;width:100%;margin-top:10px;">${rows
                .map(
                  ([label, value]) => `
                    <tr>
                      <td style="border-top:1px solid #050505;padding:12px 8px 12px 0;font-size:12px;font-weight:700;text-transform:uppercase;">${escapeHtml(label)}</td>
                      <td style="border-top:1px solid #050505;padding:12px 0;font-size:13px;text-align:right;">${escapeHtml(value)}</td>
                    </tr>
                  `,
                )
                .join("")}</table>`
            : ""
        }
        <p style="border-top:2px solid #050505;font-size:12px;line-height:1.5;margin:28px 0 0;padding-top:14px;">${escapeHtml(footer)}</p>
      </div>
    </body>
  </html>
`;

export const sendEmail = async ({ to, subject, text, html }: EmailMessage) => {
  if (!transporter || !env.EMAIL_FROM) {
    console.info(`[email skipped] ${subject} -> ${to}`);
    return;
  }

  await transporter.sendMail({
    from: env.EMAIL_FROM,
    to,
    subject,
    text,
    html,
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
