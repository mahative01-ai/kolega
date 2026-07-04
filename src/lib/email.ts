import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = Number(process.env.SMTP_PORT || "587");
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const SMTP_FROM = process.env.SMTP_FROM || "no-reply@mahateams.com";

let transporter: nodemailer.Transporter | null = null;

if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

type SendEmailParams = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export async function sendEmail({ to, subject, text, html }: SendEmailParams) {
  if (transporter) {
    try {
      await transporter.sendMail({
        from: SMTP_FROM,
        to,
        subject,
        text,
        html: html || text.replace(/\n/g, "<br>"),
      });
      console.log(`[Email Sent] To: ${to}, Subject: ${subject}`);
      return { success: true };
    } catch (error) {
      console.error("[Email Error] Failed to send email via SMTP:", error);
      // Fallback to console print if SMTP fails
    }
  }

  // Fallback / Development Mock Print
  console.log(`
=========================================
[MOCK EMAIL NOTIFICATION]
To: ${to}
From: ${SMTP_FROM}
Subject: ${subject}
-----------------------------------------
${text}
=========================================
  `);
  return { success: true, mock: true };
}
