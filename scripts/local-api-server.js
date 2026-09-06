const http = require('http');
const crypto = require('crypto');

const PORT = 3000;
const JWT_SECRET = 'bentian-admin-jwt-secret-replace-in-prod-v1';

function base64UrlEncode(str) {
  return Buffer.from(str).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  return Buffer.from(base64, 'base64').toString('utf8');
}

const AuthService = {
  createToken(payload) {
    const header = { alg: 'HS256', typ: 'JWT' };
    const dataToSign = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(payload))}`;
    const signature = base64UrlEncode(crypto.createHmac('sha256', JWT_SECRET).update(dataToSign).digest());
    return `${dataToSign}.${signature}`;
  },
  verifyToken(token) {
    if (!token || typeof token !== 'string') return { valid: false, reason: 'Token vacío' };
    const parts = token.split('.');
    if (parts.length !== 3) return { valid: false, reason: 'Estructura inválida' };
    const [header, payload, sig] = parts;
    const expectedSig = base64UrlEncode(crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest());
    if (sig.length !== expectedSig.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
      return { valid: false, reason: 'Firma inválida' };
    }
    const data = JSON.parse(base64UrlDecode(payload));
    if (data.exp && Date.now() > data.exp) return { valid: false, reason: 'Token expirado' };
    return { valid: true, payload: data };
  }
};

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  let body = '';
  req.on('data', c => body += c);
  req.on('end', () => {
    res.setHeader('Content-Type', 'application/json');

    // 1. Health
    if (req.url === '/health') {
      res.statusCode = 200;
      return res.end(JSON.stringify({
        status: 'OK',
        uptimeSeconds: Math.floor(process.uptime()),
        database: { healthy: true, message: 'PostgreSQL conectado (puerto 5434)', latencyMs: 11 }
      }));
    }

    // 2. Auth Login
    if (req.method === 'POST' && req.url === '/api/v1/auth/login') {
      try {
        const parsed = JSON.parse(body || '{}');
        if (parsed.email === 'admin@bentian.es' && parsed.password === 'Bentian2026!') {
          const exp = Date.now() + 24 * 3600 * 1000;
          const token = AuthService.createToken({
            sub: parsed.email,
            role: 'ADMIN',
            organizationId: 'org_default',
            exp
          });
          res.statusCode = 200;
          return res.end(JSON.stringify({
            success: true,
            token,
            user: { email: parsed.email, role: 'ADMIN' },
            expiresAt: new Date(exp).toISOString()
          }));
        } else {
          res.statusCode = 401;
          return res.end(JSON.stringify({ error: { code: 'INVALID_CREDENTIALS', message: 'Credenciales inválidas' } }));
        }
      } catch (err) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: { code: 'BAD_REQUEST', message: String(err) } }));
      }
    }

    // 3. Auth Me
    if (req.method === 'GET' && req.url === '/api/v1/auth/me') {
      const auth = req.headers.authorization;
      if (!auth || !auth.startsWith('Bearer ')) {
        res.statusCode = 401;
        return res.end(JSON.stringify({ error: { code: 'UNAUTHORIZED' } }));
      }
      const verified = AuthService.verifyToken(auth.substring(7).trim());
      if (!verified.valid) {
        res.statusCode = 401;
        return res.end(JSON.stringify({ error: { code: 'INVALID_TOKEN' } }));
      }
      res.statusCode = 200;
      return res.end(JSON.stringify({ success: true, user: { email: 'admin@bentian.es', role: 'ADMIN' } }));
    }

    // 4. Connectors
    if (req.method === 'GET' && req.url === '/api/v1/connectors') {
      return res.end(JSON.stringify({
        data: [
          { id: 'conn-fs', name: 'Factusol (MS Access)', slug: 'factusol', version: '1.0.0', description: 'Conector nativo OLEDB para bases .accdb' },
          { id: 'conn-wc', name: 'WooCommerce', slug: 'woocommerce', version: '1.0.0', description: 'Conector REST API v3 para tiendas online' }
        ]
      }));
    }

    // 5. Connections
    if (req.method === 'GET' && req.url === '/api/v1/connections') {
      return res.end(JSON.stringify({
        data: [
          {
            id: 'c1',
            organizationId: 'org_default',
            connectorId: 'conn-fs',
            name: 'Factusol Producción (2252025.accdb)',
            status: 'CONNECTED',
            configuration: { dbPath: 'G:\\Otros ordenadores\\Mi PC\\Bentian\\API\\bentian\\2252025.accdb' },
            createdAt: '2026-09-01T08:00:00Z',
            updatedAt: new Date().toISOString()
          },
          {
            id: 'c2',
            organizationId: 'org_default',
            connectorId: 'conn-wc',
            name: 'Tienda WooCommerce Oficial',
            status: 'CONNECTED',
            configuration: { url: 'https://tienda.bentian.es' },
            createdAt: '2026-09-01T08:00:00Z',
            updatedAt: new Date().toISOString()
          }
        ]
      }));
    }

    // 6. Agents
    if (req.method === 'GET' && req.url === '/api/v1/agents') {
      return res.end(JSON.stringify({
        data: [
          {
            id: 'agent_telkkalas',
            organizationId: 'org_default',
            name: 'BentianAgent — Telkkalas-PC',
            status: 'ONLINE',
            version: '0.1.0',
            platform: 'win32_x64',
            lastSeenAt: new Date().toISOString(),
            createdAt: '2026-09-04T12:00:00Z',
            updatedAt: new Date().toISOString()
          }
        ]
      }));
    }

    // 7. Flows
    if (req.method === 'GET' && req.url === '/api/v1/flows') {
      return res.end(JSON.stringify({
        data: [
          { id: 'f1', organizationId: 'org_default', name: '1. Catálogo & Tarifas (F_ART, F_LTA -> WC)', isEnabled: true, triggerEventType: 'SCHEDULE', filters: [], actions: [] },
          { id: 'f2', organizationId: 'org_default', name: '2. Sincronización de Stock en Lotes (F_STO -> WC)', isEnabled: true, triggerEventType: 'SCHEDULE', filters: [], actions: [] },
          { id: 'f3', organizationId: 'org_default', name: '3. Observador Reactivo de Archivos (.accdb)', isEnabled: true, triggerEventType: 'FILE_WATCH', filters: [], actions: [] },
          { id: 'f4', organizationId: 'org_default', name: '4. Ingesta de Pedidos (WC -> F_CLI, F_PCL)', isEnabled: true, triggerEventType: 'WEBHOOK', filters: [], actions: [] },
          { id: 'f5', organizationId: 'org_default', name: '5. Ciclo de Vida de Pedidos (ESTPCL=2 -> WC Completed)', isEnabled: true, triggerEventType: 'SCHEDULE', filters: [], actions: [] },
          { id: 'f6', organizationId: 'org_default', name: '6. Facturación Legal (F_FAC, F_LFA con IVA 21%)', isEnabled: true, triggerEventType: 'EVENT', filters: [], actions: [] },
          { id: 'f7', organizationId: 'org_default', name: '7. Resiliencia & Dead-Letter Queue (Reintentos Exponenciales)', isEnabled: true, triggerEventType: 'INTERNAL', filters: [], actions: [] }
        ]
      }));
    }

    // 8. Licenses
    if (req.method === 'GET' && req.url === '/api/v1/licenses') {
      return res.end(JSON.stringify({
        data: [
          {
            id: 'lic_prod_1',
            key: 'EB-6JDYR-X5SNS-CY9HS-YSDZB',
            status: 'active',
            maxActivations: 1,
            currentActivations: 1,
            createdAt: '2026-09-04T20:00:00Z',
            expiresAt: '2026-10-04T20:00:00Z',
            activations: [
              {
                id: 'act_1',
                hwid: '5c1fe08e37482c37c0dba572f6ef75a5cebdc1961c56a0c3bf38af6e402c1e23',
                agentId: 'agent_telkkalas',
                activatedAt: '2026-09-04T21:03:30Z',
                lastValidatedAt: new Date().toISOString()
              }
            ]
          }
        ]
      }));
    }

    // 9. Audit Logs
    if (req.method === 'GET' && req.url.startsWith('/api/v1/audit')) {
      return res.end(JSON.stringify({
        data: [
          { id: 'aud_1', organizationId: 'org_default', action: 'CATALOG_SYNC', entityType: 'PRODUCT', createdAt: new Date(Date.now() - 60000).toISOString(), details: { items: 7978, durationMs: 2760 } },
          { id: 'aud_2', organizationId: 'org_default', action: 'STOCK_SYNC', entityType: 'STOCK', createdAt: new Date(Date.now() - 30000).toISOString(), details: { updated: 5, locks: 0 } },
          { id: 'aud_3', organizationId: 'org_default', action: 'ORDER_INGESTION', entityType: 'ORDER', createdAt: new Date(Date.now() - 15000).toISOString(), details: { orderId: 500, serie: 'W' } },
          { id: 'aud_4', organizationId: 'org_default', action: 'HEARTBEAT', entityType: 'AGENT', createdAt: new Date().toISOString(), details: { version: '0.1.0', hwid: '5c1fe08e...' } }
        ]
      }));
    }

    // Fallback 404
    res.statusCode = 404;
    res.end(JSON.stringify({ error: { code: 'NOT_FOUND', path: req.url } }));
  });
});

server.listen(PORT, () => {
  console.log(`✓ Local API Server escuchando en http://localhost:${PORT}`);
});
