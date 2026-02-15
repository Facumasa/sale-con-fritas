import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendPinResetEmail(
  to: string,
  token: string,
  employeeName: string,
  publicFichajeToken?: string | null
): Promise<void> {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const resetUrl = publicFichajeToken
    ? `${frontendUrl}/cambiar-pin/${token}?publicToken=${publicFichajeToken}`
    : `${frontendUrl}/cambiar-pin/${token}`;

  const html = `
    <h2>Cambio de PIN - Sale Con Fritas</h2>
    <p>Hola ${employeeName},</p>
    <p>Para completar tu registro y cambiar tu PIN, haz clic en el siguiente enlace:</p>
    <p><a href="${resetUrl}">${resetUrl}</a></p>
    <p>Este enlace expira en 24 horas.</p>
    <p>Si no solicitaste este cambio, ignora este email.</p>
  `;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@salecofritas.com',
    to,
    subject: 'Cambio de PIN - Sale Con Fritas',
    html,
    text: `Hola ${employeeName}, para cambiar tu PIN visita: ${resetUrl}. Expira en 24 horas.`,
  });
}

export default { sendPinResetEmail };
