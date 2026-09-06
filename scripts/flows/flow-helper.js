const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const http = require('http');

const DB_PATH = path.resolve(__dirname, '../../../API/bentian/2252025.accdb');
const ADODB_JS = path.resolve(__dirname, '../../packages/connectors/factusol/src/adodb.js');
const CSCRIPT = fs.existsSync('C:\\Windows\\SysWOW64\\cscript.exe')
  ? 'C:\\Windows\\SysWOW64\\cscript.exe'
  : 'C:\\Windows\\System32\\cscript.exe';

const ORG_ID = 'org_bentian_test';
const CONN_FACTUSOL = 'conn_factusol';
const CONN_WOO = 'conn_woocommerce';
const JOB_PRODUCTS = 'job_sync_products';
const JOB_STOCK = 'job_sync_stock';
const JOB_ORDERS = 'job_sync_orders';

// 1. Factusol / Access ADODB Driver
function runAdodb(action, sql, provider = 'Microsoft.ACE.OLEDB.12.0') {
  return new Promise((resolve, reject) => {
    const connStr = `Provider=${provider};Data Source=${DB_PATH};Persist Security Info=False;`;
    const input = JSON.stringify({ connection: connStr, sql });

    const child = childProcess.spawn(CSCRIPT, ['//Nologo', ADODB_JS, action], { windowsHide: true });
    const stdoutChunks = [];
    const stderrChunks = [];

    child.stdout.on('data', (c) => stdoutChunks.push(c));
    child.stderr.on('data', (c) => stderrChunks.push(c));
    child.on('error', (err) => reject(err));

    child.on('close', () => {
      if (stderrChunks.length > 0) {
        const errText = Buffer.concat(stderrChunks).toString('utf8');
        try {
          const parsedErr = JSON.parse(errText);
          return reject(new Error(parsedErr.message || errText));
        } catch {
          return reject(new Error(errText));
        }
      }
      const buf = Buffer.concat(stdoutChunks);
      let text = buf.toString('utf8');
      try {
        const parsed = JSON.parse(text);
        return resolve(parsed);
      } catch {
        text = buf.toString('latin1');
        try {
          const parsed = JSON.parse(text);
          return resolve(parsed);
        } catch (e2) {
          return reject(new Error('ADODB JSON parse error: ' + e2.message + ' Raw: ' + text.substring(0, 100)));
        }
      }
    });

    child.stdin.end(input, 'utf8');
  });
}

// 2. PostgreSQL Client via Docker Container bentian-postgres
function executePostgres(sql) {
  return new Promise((resolve, reject) => {
    const child = childProcess.spawn('docker', [
      'exec', '-i', 'bentian-postgres', 'psql', '-U', 'postgres', '-d', 'Factusol', '-c', sql
    ]);
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', d => stdout += d);
    child.stderr.on('data', d => stderr += d);
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) return reject(new Error(stderr || `psql exited with code ${code}`));
      resolve(stdout.trim());
    });
  });
}

function queryPostgresJson(querySql) {
  return new Promise((resolve, reject) => {
    const wrappedSql = `SELECT coalesce(json_agg(t), '[]'::json) FROM (${querySql}) t;`;
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
        reject(new Error('Postgres JSON parse error: ' + e.message + ' Output: ' + stdout));
      }
    });
  });
}

// 3. WooCommerce HTTP Client (port 8090)
function wcRequest(endpoint, method = 'GET', data = null, port = 8090) {
  return new Promise((resolve, reject) => {
    const bodyStr = data ? JSON.stringify(data) : '';
    const req = http.request({
      hostname: 'localhost',
      port,
      path: endpoint,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {})
      }
    }, (res) => {
      let respData = '';
      res.on('data', chunk => respData += chunk);
      res.on('end', () => {
        try {
          const parsed = respData ? JSON.parse(respData) : null;
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ statusCode: res.statusCode, data: parsed });
          } else {
            reject(new Error(`WC HTTP ${res.statusCode}: ${JSON.stringify(parsed)}`));
          }
        } catch (e) {
          resolve({ statusCode: res.statusCode, raw: respData });
        }
      });
    });

    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// 4. Seed initial metadata into PostgreSQL
async function ensureSeedData() {
  const seedSql = `
    INSERT INTO organizations (id, name, slug, status, plan)
    VALUES ('${ORG_ID}', 'Bentian Demo Org', 'bentian-demo', 'ACTIVE', 'enterprise')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO connectors (id, name, slug, type, version, status, capabilities, metadata)
    VALUES 
      ('conn_type_factusol', 'Factusol ERP', 'factusol', 'factusol', '1.0.0', 'OFFICIAL', '["products", "stock", "orders", "invoices"]'::jsonb, '{}'::jsonb),
      ('conn_type_woocommerce', 'WooCommerce Store', 'woocommerce', 'woocommerce', '1.0.0', 'OFFICIAL', '["products", "stock", "orders"]'::jsonb, '{}'::jsonb)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO connections (id, organization_id, connector_id, name, status, configuration)
    VALUES
      ('${CONN_FACTUSOL}', '${ORG_ID}', 'conn_type_factusol', 'Factusol Local MS Access', 'CONNECTED', '{"driver": "access", "path": "2252025.accdb"}'::jsonb),
      ('${CONN_WOO}', '${ORG_ID}', 'conn_type_woocommerce', 'WooCommerce Online Store', 'CONNECTED', '{"url": "http://localhost:8090"}'::jsonb)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO sync_jobs (id, organization_id, name, source_connection_id, destination_connection_id, entity, direction, schedule, status, configuration)
    VALUES
      ('${JOB_PRODUCTS}', '${ORG_ID}', 'Sync Productos Factusol a WooCommerce', '${CONN_FACTUSOL}', '${CONN_WOO}', 'products', 'ONE_WAY_SOURCE_TO_DEST', 'MANUAL', 'ACTIVE', '{}'::jsonb),
      ('${JOB_STOCK}', '${ORG_ID}', 'Sync Stock Factusol a WooCommerce', '${CONN_FACTUSOL}', '${CONN_WOO}', 'stock', 'ONE_WAY_SOURCE_TO_DEST', 'MANUAL', 'ACTIVE', '{}'::jsonb),
      ('${JOB_ORDERS}', '${ORG_ID}', 'Sync Pedidos WooCommerce a Factusol', '${CONN_WOO}', '${CONN_FACTUSOL}', 'orders', 'ONE_WAY_SOURCE_TO_DEST', 'MANUAL', 'ACTIVE', '{}'::jsonb)
    ON CONFLICT (id) DO NOTHING;
  `;
  await executePostgres(seedSql);
}

module.exports = {
  DB_PATH,
  ORG_ID,
  CONN_FACTUSOL,
  CONN_WOO,
  JOB_PRODUCTS,
  JOB_STOCK,
  JOB_ORDERS,
  runAdodb,
  executePostgres,
  queryPostgresJson,
  wcRequest,
  ensureSeedData
};
