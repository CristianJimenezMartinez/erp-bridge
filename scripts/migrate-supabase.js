const fs = require('fs');
const path = require('path');

// Inicializar resolución global de paquetes para entorno pnpm en Windows
const pnpmDir = path.resolve(__dirname, '../node_modules/.pnpm');
if (fs.existsSync(pnpmDir)) {
  const paths = [];
  fs.readdirSync(pnpmDir).forEach(dir => {
    const nm = path.join(pnpmDir, dir, 'node_modules');
    if (fs.existsSync(nm)) paths.push(nm);
  });
  process.env.NODE_PATH = paths.join(path.delimiter);
  require('module').Module._initPaths();
}

const { Pool } = require('pg');

// Cargar variables de .env si existen
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split(/\r?\n/).forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim();
    }
  });
}

const targetUri = process.env.DATABASE_URL || process.argv[2];

if (!targetUri) {
  console.error('❌ Error: DATABASE_URL no está definido en .env ni pasado como argumento.');
  console.error('Uso: node scripts/migrate-supabase.js "<DATABASE_URL>"');
  process.exit(1);
}

const candidates = [
  {
    name: 'DATABASE_URL configurado',
    uri: targetUri
  }
];

async function run() {
  console.log('=== VERIFICANDO CONEXIÓN CON SUPABASE ===');
  let activePool = null;
  let workingUri = null;

  for (const c of candidates) {
    console.log(`\nProbando: ${c.name}...`);
    const pool = new Pool({
      connectionString: c.uri,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 7000
    });

    try {
      const res = await pool.query('SELECT version(), current_database()');
      console.log(`✅ ¡Conexión exitosa con ${c.name}!`);
      console.log(`   Versión: ${res.rows[0].version.split(',')[0]}`);
      console.log(`   Base de datos: ${res.rows[0].current_database}`);
      activePool = pool;
      workingUri = c.uri;
      break;
    } catch (err) {
      console.warn(`   ⚠️ Falló: ${err.message}`);
      await pool.end().catch(() => {});
    }
  }

  if (!activePool) {
    console.error('❌ No se pudo conectar a Supabase con ninguno de los endpoints.');
    process.exit(1);
  }

  console.log('\n=== EJECUTANDO MIGRACIONES EN SUPABASE ===');
  const migrationsDir = path.resolve(__dirname, '../packages/core/src/database/migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  for (const file of files) {
    console.log(`Aplicando ${file}...`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    await activePool.query(sql);
    console.log(`✅ ${file} aplicado correctamente.`);
  }

  console.log('\n=== VERIFICANDO TABLAS CREADAS EN SUPABASE ===');
  const tablesRes = await activePool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);

  console.log(`Tablas encontradas (${tablesRes.rows.length}):`);
  tablesRes.rows.forEach(r => console.log(` - ${r.table_name}`));

  await activePool.end();
  console.log('\n=== RESULTADO: 100% COMPLETADO Y OPERATIVO ===');
  console.log(`URI Funcional guardada: ${workingUri}`);
}

run().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
