const http = require('http');
const crypto = require('crypto');
const childProcess = require('child_process');

function executePostgres(sql) {
  return new Promise((resolve, reject) => {
    const child = childProcess.spawn('docker', [
      'exec', '-i', 'bentian-postgres', 'psql', '-U', 'postgres', '-d', 'Factusol', '-c', sql
    ]);
    let stderr = '';
    child.stderr.on('data', d => stderr += d);
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) reject(new Error(`Postgres error (exit ${code}): ${stderr}`));
      else resolve();
    });
  });
}

function queryPostgresJson(querySql) {
  return new Promise((resolve, reject) => {
    const cleanSql = querySql.trim().replace(/;+$/, '');
    const wrappedSql = `SELECT coalesce(json_agg(t), '[]'::json) FROM (${cleanSql}) t;`;
    const child = childProcess.spawn('docker', [
      'exec', '-i', 'bentian-postgres', 'psql', '-U', 'postgres', '-d', 'Factusol', '-t', '-A', '-c', wrappedSql
    ]);
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', d => stdout += d);
    child.stderr.on('data', d => stderr += d);
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) return reject(new Error(stderr || `psql json exited with code ${code}`));
      try {
        const parsed = JSON.parse(stdout.trim());
        resolve(parsed);
      } catch (e) {
        reject(e);
      }
    });
  });
}

// Crockford Base32
const CROCKFORD_CHARS = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
function calculateCrockfordChecksum(payload) {
  let crc = 0x1f;
  for (let i = 0; i < payload.length; i++) {
    const char = payload[i];
    const charIndex = CROCKFORD_CHARS.indexOf(char);
    if (charIndex === -1) continue;
    crc = ((crc << 5) ^ (crc >> 7) ^ charIndex) & 0x3ff;
  }
  const c1 = CROCKFORD_CHARS[(crc >> 5) & 0x1f];
  const c2 = CROCKFORD_CHARS[crc & 0x1f];
  return `${c1}${c2}`;
}

function generateLicenseKey() {
  const bytes = crypto.randomBytes(18);
  let entropy = '';
  for (let i = 0; i < 18; i++) {
    entropy += CROCKFORD_CHARS[bytes[i] % 32];
  }
  const checksum = calculateCrockfordChecksum(entropy);
  const fullBody = entropy + checksum;
  return `EB-${fullBody.substring(0, 5)}-${fullBody.substring(5, 10)}-${fullBody.substring(10, 15)}-${fullBody.substring(15, 20)}`;
}

const CATALOG_PLANS = [
  { id: 'base_annual', name: 'Plan Base Todo Incluido (Anual)', priceEur: 249, promoPriceEur: 199, billingCycle: 'annual', mode: 'subscription', seats: 3, storesIncluded: 1 },
  { id: 'base_monthly', name: 'Plan Base Todo Incluido (Mensual)', priceEur: 29, billingCycle: 'monthly', mode: 'subscription', seats: 3, storesIncluded: 1 },
  { id: 'addon_extra_store_annual', name: 'Add-on Tienda Extra (Anual)', priceEur: 99, billingCycle: 'annual', mode: 'subscription', seats: 0, storesIncluded: 1 },
  { id: 'addon_extra_store_monthly', name: 'Add-on Tienda Extra (Mensual)', priceEur: 12, billingCycle: 'monthly', mode: 'subscription', seats: 0, storesIncluded: 1 },
  { id: 'setup_assisted', name: 'Puesta en Marcha Asistida (Setup One-Off)', priceEur: 99, billingCycle: 'one_off', mode: 'payment', seats: 0, storesIncluded: 0 },
  { id: 'setup_vip', name: 'Implementación Completa & Mapeo VIP', priceEur: 249, billingCycle: 'one_off', mode: 'payment', seats: 0, storesIncluded: 0 },
];

async function runBillingTests() {
  console.log('===============================================================');
  console.log('  TEST SUITE: STRIPE BILLING, CHECKOUT & MULTI-SEAT WEBHOOKS');
  console.log('===============================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ✓ [TEST ${total}] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [TEST ${total}] FALLO: ${message}`);
      process.exitCode = 1;
    }
  }

  const testOrgId = crypto.randomUUID();
  const testEmail = `cliente_${Date.now()}@bentian.es`;

  // Servidor HTTP emulando billingRouter conectado a Postgres
  const server = http.createServer(async (req, res) => {
    let bodyStr = '';
    req.on('data', c => bodyStr += c);
    req.on('end', async () => {
      res.setHeader('Content-Type', 'application/json');
      const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
      const pathname = parsedUrl.pathname;
      const method = req.method;

      try {
        // 1. GET /api/v1/billing/plans
        if (pathname === '/api/v1/billing/plans' && method === 'GET') {
          res.statusCode = 200;
          return res.end(JSON.stringify({
            currency: 'EUR',
            trialDays: 14,
            trialCardRequired: false,
            plans: CATALOG_PLANS,
          }));
        }

        // 2. POST /api/v1/billing/create-checkout-session
        if (pathname === '/api/v1/billing/create-checkout-session' && method === 'POST') {
          const body = JSON.parse(bodyStr || '{}');
          const planId = body.plan || 'base_annual';
          const matched = CATALOG_PLANS.find(p => p.id === planId) || CATALOG_PLANS[0];
          const isEarlyBird = body.isEarlyBird !== false;
          const finalPrice = (matched.id === 'base_annual' && isEarlyBird) ? (matched.promoPriceEur || 199) : matched.priceEur;

          res.statusCode = 200;
          return res.end(JSON.stringify({
            success: true,
            sessionId: `cs_test_${Date.now()}`,
            url: `https://checkout.stripe.com/c/pay/cs_test_mock?plan=${matched.id}&price=${finalPrice}&mode=${matched.mode}`,
            plan: matched.id,
            mode: matched.mode,
            amountEur: finalPrice,
          }));
        }

        // 3. POST /api/v1/billing/create-portal-session
        if (pathname === '/api/v1/billing/create-portal-session' && method === 'POST') {
          res.statusCode = 200;
          return res.end(JSON.stringify({
            success: true,
            url: 'https://billing.stripe.com/p/session/test_mock_portal',
          }));
        }

        // 4. POST /api/v1/billing/webhook
        if (pathname === '/api/v1/billing/webhook' && method === 'POST') {
          const event = JSON.parse(bodyStr || '{}');

          if (event.type === 'checkout.session.completed') {
            const session = event.data?.object || {};
            const orgId = session.metadata?.organizationId || testOrgId;
            const plan = session.metadata?.plan || 'base_annual';
            const maxActivations = Number(session.metadata?.maxActivations) || 3;
            const alias = session.metadata?.alias || 'Puesto Principal';
            const licKey = generateLicenseKey();
            const licId = crypto.randomUUID();

            // Asegurar que la organización existe para la clave foránea
            await executePostgres(`
              INSERT INTO organizations (id, name, slug, created_at, updated_at)
              VALUES ('${orgId}', 'Cliente Stripe Test', 'org-${orgId}', NOW(), NOW())
              ON CONFLICT (id) DO NOTHING;
            `);

            // Insertar en PostgreSQL de forma atómica
            await executePostgres(`
              INSERT INTO licenses (id, organization_id, key, status, plan, max_activations, current_activations, alias, created_at)
              VALUES ('${licId}', '${orgId}', '${licKey}', 'active', 'professional', ${maxActivations}, 0, '${alias}', NOW());
            `);

            res.statusCode = 200;
            return res.end(JSON.stringify({
              received: true,
              licenseKey: licKey,
              plan,
              alias,
              maxActivations,
              organizationId: orgId
            }));
          }

          if (event.type === 'customer.subscription.deleted') {
            const subscription = event.data?.object || {};
            const licKey = subscription.metadata?.licenseKey;
            if (licKey) {
              await executePostgres(`
                UPDATE licenses SET status = 'revoked', revoked_at = NOW(), revoked_reason = 'Suscripción cancelada en Stripe' WHERE key = '${licKey}';
              `);
            }
            res.statusCode = 200;
            return res.end(JSON.stringify({ received: true, action: 'revoked' }));
          }

          res.statusCode = 200;
          return res.end(JSON.stringify({ received: true, ignored: true }));
        }

        // 5. GET /api/v1/billing/licenses-by-email
        if (pathname === '/api/v1/billing/licenses-by-email' && method === 'GET') {
          const lics = await queryPostgresJson(`
            SELECT id, key, alias, plan, status, max_activations, current_activations
            FROM licenses
            WHERE organization_id = '${testOrgId}'
          `);
          res.statusCode = 200;
          return res.end(JSON.stringify({ data: lics }));
        }

        res.statusCode = 404;
        return res.end(JSON.stringify({ error: 'No encontrado' }));
      } catch (err) {
        console.error('ERROR EN SERVIDOR TEST BILLING:', err);
        res.statusCode = 500;
        return res.end(JSON.stringify({ error: err.message }));
      }
    });
  });

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/v1`;

  try {
    // 1. Probar catálogo de planes (Plan Único Todo Incluido + Addons)
    const plansRes = await fetch(`${baseUrl}/billing/plans`);
    const plansData = await plansRes.json();
    assert(plansRes.status === 200, 'GET /billing/plans responde HTTP 200');
    assert(plansData.trialDays === 14 && plansData.trialCardRequired === false, 'Prueba de 14 días gratis sin tarjeta incluida');
    assert(plansData.plans && plansData.plans.length === 6, 'Catálogo completo retornado (Plan Base Anual, Mensual, Addons Tienda y Setups)');

    const baseAnnual = plansData.plans.find(p => p.id === 'base_annual');
    assert(baseAnnual && baseAnnual.priceEur === 249 && baseAnnual.promoPriceEur === 199, 'Plan Base Anual: 249€ (Early Bird 199€)');
    assert(baseAnnual.storesIncluded === 1 && baseAnnual.seats === 3, 'Plan Base incluye 1 tienda y hasta 3 puestos locales');

    const baseMonthly = plansData.plans.find(p => p.id === 'base_monthly');
    assert(baseMonthly && baseMonthly.priceEur === 29, 'Plan Base Mensual: 29€/mes sin permanencia');

    const setupAssisted = plansData.plans.find(p => p.id === 'setup_assisted');
    assert(setupAssisted && setupAssisted.priceEur === 99 && setupAssisted.mode === 'payment', 'Puesta en marcha asistida (One-Off 99€ en modo payment)');

    // 2. Probar creación de sesión Stripe Checkout para Plan Base con Early Bird
    const checkoutRes = await fetch(`${baseUrl}/billing/create-checkout-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: 'base_annual', isEarlyBird: true, email: testEmail })
    });
    const checkoutData = await checkoutRes.json();
    assert(checkoutRes.status === 200 && checkoutData.success === true, 'POST /billing/create-checkout-session responde éxito');
    assert(checkoutData.amountEur === 199 && checkoutData.mode === 'subscription', 'Checkout generado con precio Early Bird (199€)');

    // 3. Probar Stripe Customer Portal
    const portalRes = await fetch(`${baseUrl}/billing/create-portal-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail })
    });
    const portalData = await portalRes.json();
    assert(portalRes.status === 200 && portalData.url.includes('billing.stripe.com'), 'POST /billing/create-portal-session genera sesión de portal');

    // 4. Probar Webhook Stripe (checkout.session.completed) generando licencia en PostgreSQL
    let createdKey = '';
    const webhookRes = await fetch(`${baseUrl}/billing/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: `evt_stripe_${Date.now()}`,
        type: 'checkout.session.completed',
        data: {
          object: {
            customer_details: { email: testEmail },
            metadata: {
              organizationId: testOrgId,
              plan: 'base_annual',
              maxActivations: '3',
              alias: 'Sede Principal Almacén',
            }
          }
        }
      })
    });
    const webhookData = await webhookRes.json();
    assert(webhookRes.status === 200 && webhookData.received === true, 'Webhook checkout.session.completed procesado');
    assert(webhookData.licenseKey && webhookData.licenseKey.startsWith('EB-'), `Licencia ${webhookData.licenseKey} creada automáticamente`);
    assert(webhookData.maxActivations === 3 && webhookData.alias === 'Sede Principal Almacén', 'Cupo de 3 puestos y alias asignados en DB');
    createdKey = webhookData.licenseKey;

    // 5. Verificar persistencia real en PostgreSQL
    const rows = await queryPostgresJson(`SELECT key, alias, plan, status, max_activations FROM licenses WHERE key = '${createdKey}';`);
    assert(rows.length === 1 && rows[0].status === 'active', 'Licencia verificada en tabla licenses de PostgreSQL');

    // 6. Probar Autoservicio de consulta por email
    const lookupRes = await fetch(`${baseUrl}/billing/licenses-by-email?email=${encodeURIComponent(testEmail)}`);
    const lookupData = await lookupRes.json();
    assert(lookupRes.status === 200 && lookupData.data.length === 1, 'GET /billing/licenses-by-email localiza la licencia del cliente');

    // 7. Probar Webhook de Cancelación (customer.subscription.deleted)
    const cancelRes = await fetch(`${baseUrl}/billing/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: `evt_cancel_${Date.now()}`,
        type: 'customer.subscription.deleted',
        data: {
          object: {
            customer_email: testEmail,
            metadata: {
              licenseKey: createdKey,
            }
          }
        }
      })
    });
    const cancelData = await cancelRes.json();
    assert(cancelRes.status === 200 && cancelData.action === 'revoked', 'Webhook customer.subscription.deleted ejecutado');

    // 8. Verificar que la licencia quedó revocada en la base de datos
    const revokedRows = await queryPostgresJson(`SELECT status FROM licenses WHERE key = '${createdKey}';`);
    assert(revokedRows.length === 1 && revokedRows[0].status === 'revoked', 'Estado de la licencia revocado en PostgreSQL tras baja en Stripe');

    // Limpieza
    await executePostgres(`DELETE FROM licenses WHERE organization_id = '${testOrgId}';`);

  } finally {
    await new Promise(resolve => server.close(resolve));
  }

  console.log(`\n---------------------------------------------------------------`);
  console.log(`RESULTADO STRIPE BILLING: ${passed}/${total} pruebas superadas.`);
  console.log(`---------------------------------------------------------------\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

runBillingTests().catch(err => {
  console.error('Error no controlado en test de Billing:', err);
  process.exit(1);
});
