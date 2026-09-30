import { MailerService } from '../apps/api/src/services/mailer.service';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../apps/api/.env') });

async function runLiveResendTest() {
  console.log('🚀 Probando despacho de email real con Resend API...');
  console.log('  -> Remitente configurado:', process.env['MAIL_FROM']);
  console.log('  -> Destinatario:', 'cristianjimeneztrabajo@gmail.com');

  const result = await MailerService.sendEmail({
    to: 'cristianjimeneztrabajo@gmail.com',
    subject: '🧪 Prueba de entrega oficial: Bentian ERP Bridge & Resend',
    html: `
      <div style="font-family: sans-serif; background-color: #09090b; color: #f4f4f5; padding: 30px; border-radius: 12px;">
        <h1 style="color: #6366f1;">Bentian ERP Bridge — Conexión Resend Activa</h1>
        <p>¡Hola Cristian!</p>
        <p>Este correo confirma que la integración entre <strong>Cloudflare DNS</strong>, <strong>Resend</strong> y <strong>Bentian ERP Bridge</strong> está funcionando con total éxito.</p>
        <div style="background-color: #18181b; padding: 15px; border-radius: 8px; border: 1px solid #27272a; margin: 20px 0;">
          <p style="margin: 0; color: #10b981; font-weight: bold;">✓ Firma criptográfica DKIM: Válida</p>
          <p style="margin: 5px 0 0 0; color: #10b981; font-weight: bold;">✓ SPF & Return-Path: Alineado con cristianjm.com</p>
          <p style="margin: 5px 0 0 0; color: #10b981; font-weight: bold;">✓ Remitente oficial: soporte@cristianjm.com</p>
        </div>
        <p style="color: #a1a1aa; font-size: 13px;">Tanto las claves de licencia como las alertas de nuevos pedidos de Factusol llegarán ahora directas a la bandeja de entrada.</p>
      </div>
    `,
    text: 'Bentian ERP Bridge — Conexión Resend Activa. Prueba de correo exitosa.'
  });

  console.log('Resultado del envío:', result);
}

runLiveResendTest().catch(console.error);
