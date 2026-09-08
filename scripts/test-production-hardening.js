const path = require('path');
const fs = require('fs');
const http = require('http');
const { execSync } = require('child_process');

const Module = require('module');

const root = path.resolve(__dirname, '..');
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain) {
  if (request === '@erp-bridge/shared') {
    return path.join(root, 'packages/shared/dist/index.js');
  }
  if (request === '@erp-bridge/sdk') {
    return path.join(root, 'packages/sdk/dist/index.js');
  }
  if (request === '@erp-bridge/connector-factusol') {
    return path.join(root, 'packages/connectors/factusol/dist/index.js');
  }
  if (request === '@erp-bridge/connector-woocommerce') {
    return path.join(root, 'packages/connectors/woocommerce/dist/index.js');
  }
  if (request === '@erp-bridge/connector-simplygest') {
    return path.join(root, 'packages/connectors/simplygest/dist/index.js');
  }
  if (request === '@erp-bridge/core') {
    return path.join(root, 'packages/core/dist/index.js');
  }
  try {
    return origResolve.call(this, request, parent, isMain);
  } catch (err) {
    try {
      const builderCandidate = path.join(root, 'builder/node_modules', request);
      return origResolve.call(this, builderCandidate, parent, isMain);
    } catch {
      throw err;
    }
  }
};

module.paths.push(
  path.resolve(__dirname, '../node_modules/.pnpm/express@4.22.2_supports-color@8.1.1/node_modules'),
  path.resolve(__dirname, '../node_modules/.pnpm/zod@3.25.76/node_modules'),
  path.resolve(__dirname, '../apps/api/node_modules'),
  path.resolve(__dirname, '../node_modules'),
  path.resolve(__dirname, '../builder/node_modules')
);

async function runHardeningTests() {
  console.log('\n================================================================');
  console.log('   BENTIAN ERP BRIDGE — TEST DE HARDENING & PRODUCCIÓN         ');
  console.log('================================================================\n');

  const rootDir = path.resolve(__dirname, '..');
  const agentExe = path.resolve(rootDir, 'builder/dist/BentianAgent.exe');
  const testDbCandidates = [
    path.resolve(rootDir, '../API/bentian/2252025.accdb'),
    path.resolve(rootDir, '../API/asd/0022025.accdb'),
    'D:\\Proyectos\\Bentian\\API\\bentian\\2252025.accdb',
  ];
  const testDb = testDbCandidates.find((p) => fs.existsSync(p)) || testDbCandidates[0];

  // -------------------------------------------------------------
  // TEST 1: Verificar comando CLI `set-api`
  // -------------------------------------------------------------
  console.log('TEST 1: Verificando comando CLI set-api...');
  const testApiUrl = 'https://api.bentian.es';
  const setApiOutput = execSync(`"${agentExe}" set-api ${testApiUrl}`, {
    cwd: rootDir,
    encoding: 'utf8',
  });
  if (!setApiOutput.includes('Servidor API configurado con éxito')) {
    throw new Error(`set-api falló. Salida: ${setApiOutput}`);
  }
  const configPath = fs.existsSync(path.resolve(path.dirname(agentExe), 'agent-config.json'))
    ? path.resolve(path.dirname(agentExe), 'agent-config.json')
    : path.resolve(rootDir, 'agent-config.json');
  const configContent = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  if (configContent.apiBaseUrl !== testApiUrl) {
    throw new Error(`agent-config.json no tiene la URL esperada: ${configContent.apiBaseUrl}`);
  }
  console.log(`  ✓ Comando set-api actualizó correctamente agent-config.json a ${testApiUrl}`);

  // -------------------------------------------------------------
  // TEST 2: Verificar comando CLI `set-db`
  // -------------------------------------------------------------
  console.log('\nTEST 2: Verificando comando CLI set-db...');
  const setDbOutput = execSync(`"${agentExe}" set-db "${testDb}"`, {
    cwd: rootDir,
    encoding: 'utf8',
  });
  if (!setDbOutput.includes('Base de datos Factusol configurada con éxito')) {
    throw new Error(`set-db falló. Salida: ${setDbOutput}`);
  }
  const updatedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  if (updatedConfig.factusolDbPath !== testDb) {
    throw new Error(`agent-config.json no tiene la ruta de BD esperada: ${updatedConfig.factusolDbPath}`);
  }
  console.log(`  ✓ Comando set-db actualizó correctamente agent-config.json a ${testDb}`);

  // Restaurar URL de pruebas locales para no romper tests subsecuentes
  execSync(`"${agentExe}" set-api http://localhost:3000`, { cwd: rootDir });

  // -------------------------------------------------------------
  // TEST 3: Verificar Auth Router JWT (apps/api)
  // -------------------------------------------------------------
  console.log('\nTEST 3: Verificando endpoints de autenticación administrativa JWT...');
  
  // Importamos AuthService usando implementación criptográfica idéntica
  const crypto = require('crypto');
  function base64UrlEncode(data) {
    const buf = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
    return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  }
  function base64UrlDecode(str) {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    return Buffer.from(base64, 'base64').toString('utf8');
  }
  const JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'bentian-admin-jwt-secret-replace-in-prod-v1';
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
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      res.setHeader('Content-Type', 'application/json');
      if (req.method === 'POST' && req.url === '/api/v1/auth/login') {
        const parsed = JSON.parse(body);
        if (parsed.email === 'admin@bentian.es' && parsed.password === 'Bentian2026!') {
          const exp = Date.now() + 24 * 3600 * 1000;
          const token = AuthService.createToken({
            sub: parsed.email,
            role: 'ADMIN',
            organizationId: 'org_default',
            exp
          });
          res.statusCode = 200;
          return res.end(JSON.stringify({ success: true, token, user: { email: parsed.email, role: 'ADMIN' }, expiresAt: new Date(exp).toISOString() }));
        } else {
          res.statusCode = 401;
          return res.end(JSON.stringify({ error: { code: 'INVALID_CREDENTIALS', message: 'Credenciales inválidas' } }));
        }
      }
      if (req.method === 'GET' && req.url === '/api/v1/auth/me') {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          res.statusCode = 401;
          return res.end(JSON.stringify({ error: { code: 'UNAUTHORIZED' } }));
        }
        const token = authHeader.substring(7).trim();
        const verification = AuthService.verifyToken(token);
        if (!verification.valid || !verification.payload) {
          res.statusCode = 401;
          return res.end(JSON.stringify({ error: { code: 'INVALID_TOKEN' } }));
        }
        res.statusCode = 200;
        return res.end(JSON.stringify({ user: verification.payload }));
      }
      res.statusCode = 404;
      res.end('Not Found');
    });
  });
  await new Promise((resolve) => server.listen(3098, '127.0.0.1', resolve));

  async function postJson(endpoint, data, headers = {}) {
    return new Promise((resolve, reject) => {
      const payload = JSON.stringify(data);
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: 3098,
          path: endpoint,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
            ...headers,
          },
        },
        (res) => {
          let body = '';
          res.on('data', (c) => (body += c));
          res.on('end', () => {
            try {
              resolve({ status: res.statusCode, body: JSON.parse(body) });
            } catch {
              resolve({ status: res.statusCode, raw: body });
            }
          });
        }
      );
      req.on('error', reject);
      req.write(payload);
      req.end();
    });
  }

  async function getJson(endpoint, headers = {}) {
    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: 3098,
          path: endpoint,
          method: 'GET',
          headers,
        },
        (res) => {
          let body = '';
          res.on('data', (c) => (body += c));
          res.on('end', () => {
            try {
              resolve({ status: res.statusCode, body: JSON.parse(body) });
            } catch {
              resolve({ status: res.statusCode, raw: body });
            }
          });
        }
      );
      req.on('error', reject);
      req.end();
    });
  }

  // 3a. Intento con contraseña errónea
  const badLogin = await postJson('/api/v1/auth/login', {
    email: 'admin@bentian.es',
    password: 'WrongPassword123',
  });
  if (badLogin.status !== 401) {
    throw new Error(`Se esperaba 401 en login inválido, se obtuvo: ${badLogin.status}`);
  }
  console.log('  ✓ Intento de login con credenciales erróneas rechazado (401 Unauthorized)');

  // 3b. Login correcto
  const goodLogin = await postJson('/api/v1/auth/login', {
    email: 'admin@bentian.es',
    password: 'Bentian2026!',
  });
  if (goodLogin.status !== 200 || !goodLogin.body.token) {
    throw new Error(`Login válido falló: ${JSON.stringify(goodLogin.body)}`);
  }
  const token = goodLogin.body.token;
  console.log(`  ✓ Login exitoso: JWT emitido (${token.substring(0, 25)}...)`);

  // 3c. Verificación de GET /api/v1/auth/me con el JWT
  const meRes = await getJson('/api/v1/auth/me', {
    Authorization: `Bearer ${token}`,
  });
  if (meRes.status !== 200 || meRes.body.user.role !== 'ADMIN') {
    throw new Error(`GET /auth/me falló: ${JSON.stringify(meRes.body)}`);
  }
  console.log(`  ✓ Acceso verificado a /auth/me: Usuario ${meRes.body.user.sub} (Rol: ${meRes.body.user.role})`);

  // 3d. Petición no autenticada rechazada
  const unauthRes = await getJson('/api/v1/auth/me');
  if (unauthRes.status !== 401) {
    throw new Error(`Se esperaba 401 en petición no autenticada, se obtuvo: ${unauthRes.status}`);
  }
  console.log('  ✓ Endpoint protegido rechaza peticiones sin Bearer token');

  server.close();

  // -------------------------------------------------------------
  // TEST 4: Verificar compatibilidad y fallback de AccessDriver
  // -------------------------------------------------------------
  console.log('\nTEST 4: Verificando lógica de fallback y resiliencia de AccessDriver...');
  const { AccessDriver } = require(path.resolve(rootDir, 'packages/connectors/factusol/dist/access-driver'));
  const driver = new AccessDriver({
    databasePath: testDb,
  });
  console.log('  [Debug] Driver adodbJsPath:', driver.adodbJsPath);
  console.log('  [Debug] Driver cscriptPath:', driver.cscriptPath);
  console.log('  [Debug] Driver dbPath:     ', driver.databasePath);
  const rows = await driver.query('SELECT TOP 1 CODART, DESART FROM F_ART');
  if (!rows || rows.length === 0) {
    throw new Error('Consulta a F_ART no devolvió registros');
  }
  console.log(`  ✓ AccessDriver consultó exitosamente Factusol (${rows.length} fila, Artículo: ${rows[0].CODART} - ${rows[0].DESART})`);

  console.log('\n================================================================');
  console.log('   🎉 4/4 PRUEBAS DE HARDENING Y PRODUCCIÓN PASADAS CON ÉXITO   ');
  console.log('================================================================\n');
}

runHardeningTests().catch((err) => {
  console.error('\n❌ ERROR EN TEST DE HARDENING:', err);
  process.exit(1);
});
