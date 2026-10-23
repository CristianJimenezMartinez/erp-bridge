import { Request, Response } from 'express';
import dns from 'dns';
import net from 'net';
import https from 'https';
import http from 'http';
import tls from 'tls';
import { DatabaseService } from '@erp-bridge/core';
import { Logger } from '@erp-bridge/shared';

const logger = new Logger('DomainAuditHandler');

export interface AuditCheckItem {
  id: string;
  label: string;
  status: 'pass' | 'warn' | 'fail';
  value: string;
  recommendation: string;
}

export interface DomainAuditResult {
  domain: string;
  finalUrl: string;
  timestamp: string;
  score: number;
  riskLevel: 'BAJO' | 'MODERADO' | 'ALTO' | 'CRÍTICO';
  ttfbMs: number;
  statusCode: number;
  tlsProtocol: string | null;
  sslDaysRemaining: number | null;
  exposedServer: string | null;
  exposedPoweredBy: string | null;
  wafDetected: string | null;
  checks: AuditCheckItem[];
  recommendedPlan: 'plan-cloud-200' | 'plan-erp-350';
}

const AUDIT_CACHE = new Map<string, { expiresAt: number; data: DomainAuditResult }>();

export function isPrivateOrReservedIp(ip: string): boolean {
  const cleanIp = ip.replace(/^::ffff:/i, '');
  if (net.isIPv4(cleanIp)) {
    const [a = 0, b = 0, c = 0] = cleanIp.split('.').map(Number);
    if (a === 0 || a === 10 || a === 127 || a >= 224) return true;
    if ((a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254)) return true;
    if ((a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) return true;
    if ((a === 192 && b === 0 && (c === 0 || c === 2)) || (a === 198 && (b === 18 || b === 19))) return true;
    return false;
  }
  if (net.isIPv6(cleanIp)) {
    const l = cleanIp.toLowerCase();
    return l === '::1' || l === '::' || l.startsWith('fc') || l.startsWith('fd') || l.startsWith('fe80');
  }
  return true;
}

export function normalizePublicDomain(input: string): string | null {
  if (!input || typeof input !== 'string') return null;
  const hostPart = input.trim().toLowerCase().replace(/^https?:\/\//i, '').split(/[/?#]/)[0] || '';
  const cleaned = hostPart.replace(/:\d+$/, '');
  if (!cleaned || cleaned.length > 253 || net.isIP(cleaned) !== 0) return null;
  if (['.local', '.internal', '.lan', '.arpa', '.localhost', 'localhost'].some((s) => cleaned === s || cleaned.endsWith(s))) return null;
  return /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/i.test(cleaned) ? cleaned : null;
}

async function resolveSafePublicIp(hostname: string): Promise<{ address: string; family: number }> {
  const records = await dns.promises.lookup(hostname, { all: true });
  if (!records.length) throw new Error('No se pudo resolver el DNS del dominio indicado.');
  for (const rec of records) {
    if (isPrivateOrReservedIp(rec.address)) throw new Error('Direccionamiento privado o restringido no permitido.');
  }
  const preferred = records.find((r) => r.family === 4) ?? records[0];
  if (!preferred) throw new Error('No se encontró dirección IP válida.');
  return { address: preferred.address, family: preferred.family };
}

async function probeTarget(urlStr: string, redirectsLeft = 2): Promise<{
  finalUrl: string; statusCode: number; headers: http.IncomingHttpHeaders; ttfbMs: number; tlsProtocol: string | null; sslDaysRemaining: number | null;
}> {
  const parsed = new URL(urlStr);
  const domain = normalizePublicDomain(parsed.hostname);
  if (!domain) throw new Error('URL de redirección no válida.');
  const safeIp = await resolveSafePublicIp(domain);
  const isHttps = parsed.protocol === 'https:';
  const start = Date.now();

  return new Promise((resolve, reject) => {
    const client = isHttps ? https : http;
    const req = client.request({
      protocol: parsed.protocol, hostname: domain, port: isHttps ? 443 : 80, path: parsed.pathname + parsed.search, method: 'GET', timeout: 5500,
      headers: { 'User-Agent': 'CristianJM-B2B-SecurityAudit/1.0 (+https://cristianjm.com)', 'Accept': 'text/html,*/*;q=0.8' },
      lookup: (_h, opts: any, cb: any) =>
        opts?.all ? cb(null, [{ address: safeIp.address, family: safeIp.family }]) : cb(null, safeIp.address, safeIp.family),
    }, (res) => {
      const ttfbMs = Math.max(1, Date.now() - start);
      let tlsProtocol: string | null = null;
      let sslDaysRemaining: number | null = null;
      if (isHttps && res.socket instanceof tls.TLSSocket) {
        tlsProtocol = res.socket.getProtocol() || null;
        try {
          const cert = res.socket.getPeerCertificate();
          if (cert?.valid_to) sslDaysRemaining = Math.floor((new Date(cert.valid_to).getTime() - Date.now()) / 86400000);
        } catch {}
      }
      res.destroy();
      const status = res.statusCode || 0;
      if (status >= 300 && status < 400 && res.headers.location && redirectsLeft > 0) {
        try { probeTarget(new URL(res.headers.location, urlStr).toString(), redirectsLeft - 1).then(resolve).catch(reject); return; } catch {}
      }
      resolve({ finalUrl: urlStr, statusCode: status, headers: res.headers, ttfbMs, tlsProtocol, sslDaysRemaining });
    });
    req.on('timeout', () => req.destroy(new Error('Tiempo de espera agotado al conectar con el servidor (>5.5s).')));
    req.on('error', reject);
    req.end();
  });
}

export async function handleDomainAudit(req: Request, res: Response) {
  try {
    const domain = normalizePublicDomain(String(req.body?.domain || req.query?.domain || ''));
    if (!domain) return res.status(400).json({ error: { message: 'Introduce un dominio empresarial válido (ej: tuempresa.com).' } });

    const cached = AUDIT_CACHE.get(domain);
    if (cached && cached.expiresAt > Date.now()) return res.status(200).json({ success: true, data: cached.data, cached: true });

    const probe = await probeTarget(`https://${domain}/`).catch(() => probeTarget(`http://${domain}/`));
    const h = probe.headers;
    const hsts = String(h['strict-transport-security'] || '');
    const csp = String(h['content-security-policy'] || '');
    const xfo = String(h['x-frame-options'] || '');
    const xcto = String(h['x-content-type-options'] || '');
    const refPol = String(h['referrer-policy'] || '');
    const serverHeader = h['server'] ? String(h['server']) : null;
    const poweredBy = h['x-powered-by'] ? String(h['x-powered-by']) : null;
    const wafHeader = h['cf-ray'] ? 'Cloudflare WAF/CDN' : h['x-vercel-id'] ? 'Vercel Edge' : h['x-amz-cf-id'] ? 'AWS CloudFront' : null;

    let score = 100;
    const checks: AuditCheckItem[] = [];
    const isHttps = probe.finalUrl.startsWith('https://');

    if (!isHttps) {
      score -= 30;
      checks.push({ id: 'tls', label: 'Cifrado TLS / Certificado SSL', status: 'fail', value: 'Sin HTTPS activo', recommendation: 'Activar certificado TLS 1.3 y redirección 301.' });
    } else if (probe.tlsProtocol !== 'TLSv1.3') {
      score -= 8;
      checks.push({ id: 'tls', label: 'Cifrado TLS / Certificado SSL', status: 'warn', value: `${probe.tlsProtocol || 'TLS 1.2'} (${probe.sslDaysRemaining ?? '?'} días)`, recommendation: 'Actualizar negociación criptográfica a TLS 1.3 en servidor.' });
    } else {
      checks.push({ id: 'tls', label: 'Cifrado TLS / Certificado SSL', status: 'pass', value: `TLS 1.3 Activo (${probe.sslDaysRemaining ?? 'OK'} días restantes)`, recommendation: 'Cifrado de transporte óptimo.' });
    }

    if (!hsts) {
      score -= 18;
      checks.push({ id: 'hsts', label: 'Cabecera Strict-Transport-Security (HSTS)', status: 'fail', value: 'Ausente (Expuesto a SSL Stripping)', recommendation: 'Inyectar Strict-Transport-Security (max-age=31536000; includeSubDomains).' });
    } else {
      checks.push({ id: 'hsts', label: 'Cabecera Strict-Transport-Security (HSTS)', status: 'pass', value: 'Configurada correctamente', recommendation: 'Política HSTS activa.' });
    }

    if (!csp) {
      score -= 20;
      checks.push({ id: 'csp', label: 'Política Content-Security-Policy (Anti-XSS)', status: 'fail', value: 'No definida', recommendation: 'Definir Content-Security-Policy frente a inyección de scripts.' });
    } else {
      checks.push({ id: 'csp', label: 'Política Content-Security-Policy (Anti-XSS)', status: 'pass', value: 'Política CSP activa', recommendation: 'Protección XSS por cabecera activa.' });
    }

    const leaksVersion = (serverHeader && /\d/.test(serverHeader)) || Boolean(poweredBy);
    if (leaksVersion) {
      score -= 16;
      checks.push({ id: 'fingerprint', label: 'Ocultación de Huella de Servidor (Anti-CVE)', status: 'fail', value: `Expuesto: ${[serverHeader, poweredBy].filter(Boolean).join(' · ')}`, recommendation: 'Desactivar server_tokens y X-Powered-By frente a escáneres.' });
    } else if (serverHeader) {
      score -= 5;
      checks.push({ id: 'fingerprint', label: 'Ocultación de Huella de Servidor (Anti-CVE)', status: 'warn', value: `Visible: ${serverHeader}`, recommendation: 'Revisar exposición de cabeceras de servidor.' });
    } else {
      checks.push({ id: 'fingerprint', label: 'Ocultación de Huella de Servidor (Anti-CVE)', status: 'pass', value: 'Huella oculta', recommendation: 'El servidor no filtra versiones.' });
    }

    if (!xfo || !xcto) {
      score -= 14;
      checks.push({ id: 'hardening', label: 'Blindaje Anti-Clickjacking & MIME Sniffing', status: 'fail', value: `X-Frame: ${xfo || 'No'} · Nosniff: ${xcto || 'No'}`, recommendation: 'Añadir X-Frame-Options: SAMEORIGIN y X-Content-Type-Options: nosniff.' });
    } else {
      checks.push({ id: 'hardening', label: 'Blindaje Anti-Clickjacking & MIME Sniffing', status: 'pass', value: `${xfo} + nosniff`, recommendation: 'Cabeceras de aislamiento activas.' });
    }

    if (probe.ttfbMs > 850 || !refPol) {
      score -= 10;
      checks.push({ id: 'perf', label: 'Rendimiento de Servidor (TTFB) & WAF', status: 'warn', value: `TTFB: ${probe.ttfbMs} ms · ${wafHeader || 'Sin WAF detectado'}`, recommendation: 'Optimizar caché de servidor, activar WAF y Referrer-Policy.' });
    } else {
      checks.push({ id: 'perf', label: 'Rendimiento de Servidor (TTFB) & WAF', status: 'pass', value: `TTFB: ${probe.ttfbMs} ms · ${wafHeader || 'Directo'}`, recommendation: 'Tiempo de respuesta rápido.' });
    }

    score = Math.max(12, Math.min(100, score));
    const riskLevel = score < 45 ? 'CRÍTICO' : score < 70 ? 'ALTO' : score < 88 ? 'MODERADO' : 'BAJO';
    const result: DomainAuditResult = {
      domain, finalUrl: probe.finalUrl, timestamp: new Date().toISOString(), score, riskLevel, ttfbMs: probe.ttfbMs, statusCode: probe.statusCode,
      tlsProtocol: probe.tlsProtocol, sslDaysRemaining: probe.sslDaysRemaining, exposedServer: serverHeader, exposedPoweredBy: poweredBy,
      wafDetected: wafHeader, checks, recommendedPlan: 'plan-cloud-200',
    };

    AUDIT_CACHE.set(domain, { expiresAt: Date.now() + 600000, data: result });
    const db = DatabaseService.getInstance();
    if (db.isAvailable()) {
      db.query(`CREATE TABLE IF NOT EXISTS domain_audits (id SERIAL PRIMARY KEY, domain VARCHAR(255), score INT, risk VARCHAR(32), ttfb_ms INT, created_at TIMESTAMPTZ DEFAULT NOW())`)
        .then(() => db.query(`INSERT INTO domain_audits (domain, score, risk, ttfb_ms) VALUES ($1, $2, $3, $4)`, [domain, score, riskLevel, probe.ttfbMs])).catch(() => {});
    }
    return res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    logger.warn(`Diagnóstico fallido: ${err.message}`);
    return res.status(422).json({ error: { message: err.message || 'No se pudo conectar con el dominio indicado.' } });
  }
}
