import assert from 'assert';
import { resolveOrgId } from '../src/routes/org-scope';
import { withKeyedLock } from '../src/middleware/keyed-mutex';

function fakeReq(user: any, headers: Record<string, string> = {}, query: Record<string, string> = {}): any {
  return { user, headers, query };
}

async function main() {
  console.log('--- org-scope: aislamiento por organización ---');
  const foreign = { 'x-organization-id': 'org_ajena' };

  assert.strictEqual(resolveOrgId(fakeReq({ role: 'RESELLER', organizationId: 'org_partner' }, foreign)), 'org_partner',
    'RESELLER no puede cambiar de organización con la cabecera');
  assert.strictEqual(resolveOrgId(fakeReq({ role: 'RESELLER', organizationId: 'org_partner' }, {}, { organizationId: 'org_ajena' })), 'org_partner',
    'RESELLER no puede cambiar de organización con ?organizationId=');
  assert.strictEqual(resolveOrgId(fakeReq({ role: 'TENANT_CLIENT', organizationId: 'org_a' }, foreign)), 'org_a');
  assert.strictEqual(resolveOrgId(fakeReq({ role: 'OPERATOR', organizationId: 'org_a' }, foreign)), 'org_a');
  assert.strictEqual(resolveOrgId(fakeReq({ role: 'SUPERADMIN', organizationId: 'org_root' }, foreign)), 'org_ajena',
    'SUPERADMIN sí puede operar sobre cualquier organización');
  assert.strictEqual(resolveOrgId(fakeReq({ role: 'ADMIN', organizationId: 'org_root' })), 'org_root');
  console.log('  ✓ Solo SUPERADMIN/ADMIN pueden apuntar a otra organización.');

  console.log('--- keyed-mutex: serialización de activaciones ---');
  let active = 0;
  let maxActive = 0;
  const order: number[] = [];
  const job = (n: number) => withKeyedLock('lic-1', async () => {
    active++;
    maxActive = Math.max(maxActive, active);
    await new Promise((r) => setTimeout(r, 15));
    order.push(n);
    active--;
    return n;
  });
  const results = await Promise.all([job(1), job(2), job(3), job(4)]);
  assert.strictEqual(maxActive, 1, 'Nunca debe haber dos activaciones simultáneas de la misma licencia');
  assert.deepStrictEqual(order, [1, 2, 3, 4], 'Se respeta el orden de llegada');
  assert.deepStrictEqual(results, [1, 2, 3, 4]);

  // Claves distintas sí corren en paralelo
  let parallel = 0;
  let maxParallel = 0;
  const other = (k: string) => withKeyedLock(k, async () => {
    parallel++;
    maxParallel = Math.max(maxParallel, parallel);
    await new Promise((r) => setTimeout(r, 15));
    parallel--;
  });
  await Promise.all([other('a'), other('b')]);
  assert.strictEqual(maxParallel, 2, 'Licencias distintas no se bloquean entre sí');

  // Un fallo no bloquea la cola
  await assert.rejects(withKeyedLock('lic-err', async () => { throw new Error('boom'); }), /boom/);
  assert.strictEqual(await withKeyedLock('lic-err', async () => 'ok'), 'ok', 'Tras un error la clave se libera');
  console.log('  ✓ Cerrojo por clave correcto (serializa, no bloquea otras claves, se libera tras error).');

  console.log('\nTODAS LAS PRUEBAS org-scope / keyed-mutex SUPERADAS');
}

main().catch((e) => { console.error(e); process.exit(1); });
