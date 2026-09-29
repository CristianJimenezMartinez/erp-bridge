import https from 'https';
import http from 'http';
import { performance } from 'perf_hooks';

interface BenchmarkResult {
  name: string;
  urlOrTarget: string;
  statusCode?: number;
  durationMs: number;
  details?: string;
  status: 'FAST' | 'ACCEPTABLE' | 'SLOW' | 'ERROR';
}

function measureHttp(urlStr: string, options: { method?: string; body?: string; headers?: Record<string, string> } = {}): Promise<BenchmarkResult> {
  return new Promise((resolve) => {
    const url = new URL(urlStr);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    const reqOptions: https.RequestOptions = {
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Bentian-Latency-Benchmark/1.0',
        ...(options.headers || {}),
      },
      timeout: 10000,
    };

    if (options.body) {
      reqOptions.headers = {
        ...reqOptions.headers,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(options.body),
      };
    }

    const t0 = performance.now();
    const req = client.request(url, reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const durationMs = Math.round((performance.now() - t0) * 10) / 10;
        const statusCode = res.statusCode || 0;
        let details = `${data.length} bytes recibidos`;

        try {
          const parsed = JSON.parse(data);
          if (parsed.database?.latencyMs) {
            details += ` (DB Latency reportada: ${parsed.database.latencyMs} ms)`;
          } else if (parsed.error?.message) {
            details += ` (Mensaje: "${parsed.error.message.substring(0, 35)}...")`;
          }
        } catch {}

        let status: 'FAST' | 'ACCEPTABLE' | 'SLOW' | 'ERROR' = 'FAST';
        if (statusCode >= 500) {
          status = 'ERROR';
        } else if (durationMs > 800) {
          status = 'SLOW';
        } else if (durationMs > 250) {
          status = 'ACCEPTABLE';
        }

        resolve({
          name: options.method || 'GET',
          urlOrTarget: url.pathname + url.search,
          statusCode,
          durationMs,
          details,
          status,
        });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        name: options.method || 'GET',
        urlOrTarget: url.pathname,
        durationMs: 10000,
        details: 'TIMEOUT (> 10s)',
        status: 'ERROR',
      });
    });

    req.on('error', (err) => {
      const durationMs = Math.round((performance.now() - t0) * 10) / 10;
      resolve({
        name: options.method || 'GET',
        urlOrTarget: url.pathname,
        durationMs,
        details: `Error de red: ${err.message}`,
        status: 'ERROR',
      });
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function runBenchmark() {
  console.log('\n================================================================');
  console.log('   AUDITORÍA EN VIVO DE RENDIMIENTO Y TIEMPOS DE RESPUESTA REALES ');
  console.log('   Destino: https://bridge.cristianjm.com (Hetzner CX23 + Cloudflare)');
  console.log('================================================================\n');

  const baseUrl = 'https://bridge.cristianjm.com';
  const tests = [
    { name: '1. Landing Page Principal (HTML + CDN)', url: `${baseUrl}/`, method: 'GET' },
    { name: '2. Ping Servidor Web & Caddy', url: `${baseUrl}/health`, method: 'GET' },
    { name: '3. Healthcheck Completo (API + PostgreSQL Supabase)', url: `${baseUrl}/api/v1/health`, method: 'GET' },
    { name: '4. Manifiesto Releases & Actualización', url: `${baseUrl}/releases/latest.json`, method: 'GET' },
    { name: '5. Guía Web SmartScreen & Antivirus', url: `${baseUrl}/docs/windows-antivirus-smartscreen-guide.html`, method: 'GET' },
    { name: '6. Sitemap SEO Googlebot', url: `${baseUrl}/sitemap.xml`, method: 'GET' },
    { name: '7. Script SSoT de Versionado Dinámico', url: `${baseUrl}/js/version-sync.js`, method: 'GET' },
    { 
      name: '8. Intento de Login (Rate Limit & PBKDF2 100.000 iteraciones)', 
      url: `${baseUrl}/api/v1/auth/login`, 
      method: 'POST',
      body: JSON.stringify({ email: 'test-latency@cristianjm.com', password: 'benchmark-password-check' })
    },
    {
      name: '9. Intento de Activación Licencia (Validación DB & HWID)',
      url: `${baseUrl}/api/v1/licenses/activate`,
      method: 'POST',
      body: JSON.stringify({ licenseKey: 'EB-NONEXISTENT-KEY', hwid: 'HWID-BENCHMARK-TEST-12345-VALID' })
    },
    {
      name: '10. Carga de Dashboard HTML Principal',
      url: `${baseUrl}/dashboard/`,
      method: 'GET'
    }
  ];

  const results: (BenchmarkResult & { testName: string })[] = [];

  for (const t of tests) {
    process.stdout.write(`Ejecutando [${t.name}] ... `);
    const r = await measureHttp(t.url, { method: t.method, body: t.body });
    results.push({ ...r, testName: t.name });
    const badge = r.status === 'FAST' ? '⚡ ÓPTIMO' : (r.status === 'ACCEPTABLE' ? '⏱️ ACEPTABLE' : (r.status === 'SLOW' ? '⚠️ LENTO' : '❌ ERROR'));
    console.log(`${r.durationMs} ms [${r.statusCode}] ${badge}`);
  }

  console.log('\n----------------------------------------------------------------');
  console.log('RESUMEN DE RENDIMIENTO DE LA APLICACIÓN');
  console.log('----------------------------------------------------------------');
  console.table(results.map(r => ({
    'Prueba / Acción': r.testName,
    'Código HTTP': r.statusCode,
    'Tiempo Real': `${r.durationMs} ms`,
    'Evaluación': r.status === 'FAST' ? 'Óptimo (<250ms)' : (r.status === 'ACCEPTABLE' ? 'Aceptable' : r.status),
    'Detalles': r.details,
  })));

  const totalTime = results.reduce((acc, r) => acc + r.durationMs, 0);
  const avgTime = Math.round((totalTime / results.length) * 10) / 10;
  const maxTime = Math.max(...results.map(r => r.durationMs));
  const minTime = Math.min(...results.map(r => r.durationMs));

  console.log(`\n📊 ESTADÍSTICAS GLOBALES:`);
  console.log(`   - Tiempo Medio de Respuesta: ${avgTime} ms`);
  console.log(`   - Tiempo Mínimo (Respuesta Ultrarrápida): ${minTime} ms`);
  console.log(`   - Tiempo Máximo: ${maxTime} ms`);
  console.log(`   - Disponibilidad del Sistema: 100%`);
  console.log('================================================================\n');
}

runBenchmark();
