const nodemailer = require("nodemailer");

let transporter;

const getTransporter = () => {
  if (transporter) return transporter;

  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    SMTP_SECURE,
  } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: SMTP_SECURE === "true",
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  return transporter;
};

const sendNewJoinRequestEmail = async ({
  to,
  ownerName,
  requesterName,
  requesterEmail,
  projectTitle,
}) => {
  if (!to) {
    return { sent: false, reason: "missing_recipient" };
  }

  const tx = getTransporter();

  if (!tx) {
    console.warn("Email skipped: SMTP is not configured");
    return { sent: false, reason: "smtp_not_configured" };
  }

  const from = process.env.MAIL_FROM || process.env.SMTP_USER;

  await tx.sendMail({
    from,
    to,
    subject: `New join request for ${projectTitle}`,
    text: `Hi ${ownerName},\n\n${requesterName} (${requesterEmail}) requested to join "${projectTitle}".\n\nOpen DevLink to approve or reject this request.\n`,
    html: `
      <p>Hi ${ownerName},</p>
      <p><b>${requesterName}</b> (${requesterEmail}) requested to join <b>${projectTitle}</b>.</p>
      <p>Open DevLink to approve or reject this request.</p>
    `,
  });

  return { sent: true };
};

const sendOtpEmail = async ({ to, otp, ttlMinutes }) => {
  if (!to) {
    return { sent: false, reason: "missing_recipient" };
  }

  const tx = getTransporter();

  if (!tx) {
    console.warn("Email skipped: SMTP is not configured");
    return { sent: false, reason: "smtp_not_configured" };
  }

  const from = process.env.MAIL_FROM || process.env.SMTP_USER;
  const safeTtl = Number(ttlMinutes) || 10;

  await tx.sendMail({
    from,
    to,
    subject: "Your DevLink verification code",
    text: `Your DevLink verification code is ${otp}. It expires in ${safeTtl} minutes.`,
    html: `
      <p>Your DevLink verification code is <b>${otp}</b>.</p>
      <p>This code expires in ${safeTtl} minutes.</p>
    `,
  });

  return { sent: true };
};

module.exports = {
  sendNewJoinRequestEmail,
  sendOtpEmail,
};
