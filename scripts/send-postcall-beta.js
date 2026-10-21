#!/usr/bin/env node
/**
 * Script de envío post-llamada en 1 clic para Agencias / Partners (Texto Plano Puro + Clave Beta)
 *
 * Uso:
 *   node scripts/send-postcall-beta.js <email> "<nombre>" "<empresa>" [clave_opcional] [--dry-run]
 *
 * Ejemplo:
 *   node scripts/send-postcall-beta.js "info@nicripsia.com" "Raúl y equipo" "Soy.es"
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const positional = args.filter((a) => !a.startsWith('--'));

const [targetEmail, contactName = 'equipo', companyName = 'vuestra agencia', manualKey = ''] = positional;

if (!targetEmail) {
  console.error('Uso: node scripts/send-postcall-beta.js <email> "<nombre>" "<empresa>" [clave_opcional] [--dry-run]');
  process.exit(1);
}

function loadEnvKey(varName) {
  if (process.env[varName]) return process.env[varName];
  const candidates = [
    path.resolve(__dirname, '../apps/api/.env'),
    path.resolve(__dirname, '../.env'),
  ];
  for (const envPath of candidates) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(new RegExp(`^\\s*${varName}\\s*=\\s*["']?([^"'\\r\\n]+)["']?`, 'm'));
      if (match && match[1]) return match[1].trim();
    }
  }
  return '';
}

function claimBetaKey(email, company) {
  return new Promise((resolve, reject) => {
    const payload = Buffer.from(
      JSON.stringify({
        email: email.trim().toLowerCase(),
        companyName: company.trim(),
        consentTerms: true,
        consentMarketing: false,
        skipEmail: true, // Evita que el servidor dispare el correo HTML automático duplicado
      }),
      'utf8'
    );

    const req = https.request(
      'https://bridge.cristianjm.com/api/v1/licenses/beta/claim',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Length': payload.length,
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          try {
            const raw = Buffer.concat(chunks).toString('utf8');
            resolve(JSON.parse(raw));
          } catch (err) {
            reject(err);
          }
        });
      }
    );

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function buildPlainTextEmail({ name, company, licenseKey }) {
  return [
    `Hola ${name},`,
    ``,
    `Acabo de llamar a la oficina (soy Cristian, el desarrollador de Elche que os ha dejado el recado por teléfono con la compañera de recepción) para comentaros algo que os puede quitar bastantes dolores de cabeza con las tiendas online de vuestros clientes.`,
    ``,
    `He desarrollado Bentian ERP Bridge: un motor de sincronización Local-First para Windows que conecta ERPs de escritorio/locales con PrestaShop, WooCommerce y Shopify en tiempo real, sin abrir puertos en el router del cliente, sin FTP y con cola offline por si se cae internet.`,
    ``,
    `1) SI TENÉIS CLIENTES CON FACTUSOL O SIMPLYGEST:`,
    `Ya están listos para producción (evitando el bloqueo del archivo .ldb en Access y cuadrando IVA y Recargo de Equivalencia al céntimo). Os he generado una clave gratuita para ${company} por si queréis probarlo (tiene "Modo Evaluación" por si lo abrís en un PC sin el ERP instalado):`,
    ``,
    `  * Instalador Windows: https://bridge.cristianjm.com/releases/latest/Bentian-Setup.exe`,
    `  * Clave Beta para ${company}: ${licenseKey}`,
    `  * Documentación: https://bridge.cristianjm.com/docs/`,
    ``,
    `2) SI AHORA TRABAJÁIS CON OTROS ERPs (Sage 50, a3ERP, Ágora, ClassicGes, etc.):`,
    `Como el núcleo de Bentian utiliza un modelo canónico universal (para Access, SQL Server y MySQL local), estoy desplegando bajo demanda los adaptadores para el resto de ERPs españoles.`,
    ``,
    `Si tenéis ahora mismo algún proyecto de PrestaShop o WooCommerce atascado o dándoos guerra por culpa de la sincronización con el ERP o TPV local del cliente, decidme qué programa usa y os preparo el conector sin coste de desarrollo para que podáis sacarlo adelante.`,
    ``,
    `¿Qué ERP os están pidiendo conectar más últimamente vuestros clientes en ${company}?`,
    ``,
    `Un abrazo,`,
    `Cristian Jiménez`,
    `Tel / WhatsApp directo: 617 205 053`,
    `https://bridge.cristianjm.com`,
  ].join('\n');
}

function sendViaResend({ apiKey, from, to, replyTo, subject, text }) {
  return new Promise((resolve, reject) => {
    const escapedHtml = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/(https:\/\/[^\s]+)/g, '<a href="$1">$1</a>')
      .replace(/\n/g, '<br>\n');

    const payload = Buffer.from(
      JSON.stringify({
        from,
        to: [to],
        reply_to: replyTo,
        subject,
        text,
        html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.6; color: #111111;">${escapedHtml}</div>`,
      }),
      'utf8'
    );

    const req = https.request(
      'https://api.resend.com/emails',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Length': payload.length,
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          try {
            resolve({ statusCode: res.statusCode, body: JSON.parse(raw) });
          } catch (_e) {
            resolve({ statusCode: res.statusCode, body: raw });
          }
        });
      }
    );

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

(async () => {
  try {
    let licenseKey = manualKey.trim();

    if (!licenseKey) {
      console.log(`[1/2] Solicitando clave Beta en bridge.cristianjm.com para ${targetEmail} (skipEmail: true)...`);
      const claimRes = await claimBetaKey(targetEmail, companyName);
      if (claimRes && claimRes.data && claimRes.data.licenseKey) {
        licenseKey = claimRes.data.licenseKey;
      } else if (claimRes && claimRes.alreadyClaimed) {
        console.warn('Aviso: Este email ya tenía una licencia reclamada previamente. Pasa la clave como 4º argumento si deseas incluirla literalmente.');
        licenseKey = '(Clave ya emitida para este correo - solicítala en https://bridge.cristianjm.com/dashboard/)';
      } else {
        throw new Error(`Respuesta inesperada de /beta/claim: ${JSON.stringify(claimRes)}`);
      }
    }

    const subject = `Llamada de Cristian (Elche) - Conectores ERP locales para ${companyName}`;
    const textBody = buildPlainTextEmail({
      name: contactName,
      company: companyName,
      licenseKey,
    });

    console.log('\n================ VISTA PREVIA DEL CORREO ================\n');
    console.log(`Para:    ${targetEmail}`);
    console.log(`Asunto:  ${subject}\n`);
    console.log(textBody);
    console.log('\n=========================================================\n');

    if (isDryRun) {
      console.log('Modo --dry-run activo: no se ha enviado el correo por Resend.');
      return;
    }

    const resendKey = loadEnvKey('RESEND_API_KEY');
    const fromEmail = loadEnvKey('MAIL_FROM') || 'Cristian Jiménez <soporte@cristianjm.com>';
    const replyTo = 'cristianjimeneztrabajo@gmail.com';

    if (!resendKey) {
      console.warn('No se encontró RESEND_API_KEY en el entorno local. Puedes copiar el texto de arriba o definir RESEND_API_KEY.');
      return;
    }

    console.log(`[2/2] Enviando correo limpio por Resend a ${targetEmail}...`);
    const sendResult = await sendViaResend({
      apiKey: resendKey,
      from: fromEmail,
      to: targetEmail,
      replyTo,
      subject,
      text: textBody,
    });

    if (sendResult.statusCode && sendResult.statusCode >= 200 && sendResult.statusCode < 300) {
      console.log(`Envío completado con éxito. Resend ID: ${sendResult.body.id} | Clave generada: ${licenseKey}`);
    } else {
      console.error(`Error al enviar con Resend (HTTP ${sendResult.statusCode}):`, sendResult.body);
      process.exit(1);
    }
  } catch (err) {
    console.error('Error en send-postcall-beta:', err.message || err);
    process.exit(1);
  }
})();
