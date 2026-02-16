import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPinResetEmail(
  to: string,
  token: string,
  employeeName: string,
  publicFichajeToken?: string
) {
  const resetUrl = publicFichajeToken
    ? `${process.env.FRONTEND_URL}/cambiar-pin/${token}?publicToken=${publicFichajeToken}`
    : `${process.env.FRONTEND_URL}/cambiar-pin/${token}`;

  try {
    await resend.emails.send({
      from: 'Sale Con Fritas <onboarding@resend.dev>',
      to: [to],
      subject: 'Cambio de PIN - Sale Con Fritas',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1f2937;">Cambio de PIN - Sale Con Fritas</h2>
          <p>Hola <strong>${employeeName}</strong>,</p>
          <p>Para completar tu registro y cambiar tu PIN de fichaje, haz click en el siguiente botón:</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}" style="display: inline-block; padding: 14px 28px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
              Cambiar mi PIN
            </a>
          </div>
          <p>O copia este enlace en tu navegador:</p>
          <p style="background-color: #f3f4f6; padding: 12px; border-radius: 6px; word-break: break-all; color: #4b5563; font-size: 14px;">
            ${resetUrl}
          </p>
          <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
            ⏰ Este enlace expira en <strong>24 horas</strong>.
          </p>
          <p style="color: #6b7280; font-size: 14px;">
            Si no solicitaste este cambio, puedes ignorar este email.
          </p>
          <hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            Sale Con Fritas - Sistema de Control de Asistencia
          </p>
        </div>
      `,
    });

    console.log('✅ Email enviado a:', to);
  } catch (error) {
    console.error('❌ Error al enviar email:', error);
    throw new Error('No se pudo enviar el email');
  }
}
