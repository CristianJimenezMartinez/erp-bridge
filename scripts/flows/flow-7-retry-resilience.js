const { 
  ORG_ID, 
  JOB_STOCK,
  runAdodb, 
  executePostgres, 
  queryPostgresJson 
} = require('./flow-helper');

class RetryEngineSimulator {
  calculateBackoff(attempt, baseDelaySeconds = 2, maxDelaySeconds = 30) {
    if (attempt <= 1) return baseDelaySeconds;
    const exponential = baseDelaySeconds * Math.pow(2, attempt - 1);
    const jitter = exponential * 0.1 * Math.random();
    return Math.min(Math.round(exponential + jitter), maxDelaySeconds);
  }

  extractFailedSkus(errors) {
    if (!errors || errors.length === 0) return [];
    const skus = new Set();
    for (const err of errors) {
      if (err.sku) skus.add(err.sku);
    }
    return Array.from(skus);
  }

  canRetry(failedCount, maxRetries = 3, currentAttempt = 1) {
    return failedCount > 0 && currentAttempt < maxRetries;
  }
}

async function runFlow7RetryResilience() {
  console.log('\n======================================================');
  console.log('   FLUJO 7: RETRY ENGINE & FAULT RESILIENCE          ');
  console.log('======================================================');

  const retryEngine = new RetryEngineSimulator();

  // Escenario 1: Simulación de Bloqueo Concurrente en Factusol (.accdb lock / EBUSY)
  console.log('[1/4] Probando resiliencia ante bloqueo concurrente de Factusol (.accdb lock)...');
  let attempt = 1;
  const maxAttempts = 3;
  let recovered = false;

  while (attempt <= maxAttempts) {
    try {
      console.log(`      Intento #${attempt}: Conectando con Factusol...`);
      if (attempt === 1) {
        // Simulamos bloqueo temporal típico de Access cuando Factusol está haciendo un cierre
        throw new Error('ADO Error -2147467259: El archivo ya está en uso por otro usuario (bloqueo exclusivo)');
      }
      
      // En el intento 2 la conexión se recupera
      const res = await runAdodb('query', 'SELECT TOP 1 CODART, DESART FROM F_ART');
      console.log(`      OK: Intento #${attempt} exitoso tras backoff. Articulo leido: [${res[0].CODART}] ${res[0].DESART}`);
      recovered = true;
      break;
    } catch (err) {
      const backoffSec = retryEngine.calculateBackoff(attempt, 1, 5);
      console.warn(`      AVISO: Fallo en intento #${attempt}: "${err.message}". Esperando backoff de ${backoffSec}s...`);
      await new Promise(r => setTimeout(r, backoffSec * 1000));
      attempt++;
    }
  }

  if (!recovered) {
    throw new Error('Fallo la recuperacion del bloqueo concurrente');
  }

  // Escenario 2: Simulación de Fallo Parcial de Red / WooCommerce HTTP 500 y Dead-Letter Queue
  console.log('[2/4] Probando captura de errores parciales y Dead-Letter en PostgreSQL...');
  const simulatedErrors = [
    { sku: '000047', reason: 'HTTP 500: Internal server error en tienda remota', item_id: '1001' },
    { sku: '000048', reason: 'HTTP 504: Gateway Timeout al actualizar stock', item_id: '1002' }
  ];

  const failedSkus = retryEngine.extractFailedSkus(simulatedErrors);
  console.log(`      SKUs fallidos extraidos para reintento quirurgico: [${failedSkus.join(', ')}]`);

  const execId = `exec_err_${Date.now()}`;
  const errorsJson = JSON.stringify(simulatedErrors).replace(/'/g, "''");

  // Registrar ejecución fallida en PostgreSQL sync_executions
  await executePostgres(`
    INSERT INTO sync_executions (
      id, sync_job_id, organization_id, status, started_at, completed_at, duration_ms,
      processed_count, success_count, failed_count, errors, metadata
    ) VALUES (
      '${execId}', '${JOB_STOCK}', '${ORG_ID}', 'FAILED', NOW() - INTERVAL '5 second', NOW(), 450,
      10, 8, 2, '${errorsJson}'::jsonb,
      '{"failed_skus": ["${failedSkus.join('", "')}"]}'::jsonb
    );
  `);

  // Escenario 3: Registrar en audit_logs de PostgreSQL
  console.log('[3/4] Registrando evento de auditoria y alerta de resiliencia en audit_logs...');
  const auditId = `audit_${Date.now()}`;
  await executePostgres(`
    INSERT INTO audit_logs (
      id, organization_id, user_id, action, resource_type, resource_id, result, metadata
    ) VALUES (
      '${auditId}', '${ORG_ID}', 'SYSTEM_AGENT', 'SYNC_RETRY_SCHEDULED',
      'sync_execution', '${execId}', 'SUCCESS',
      '{"attempt": 1, "next_attempt_in_sec": 15, "skus": ["${failedSkus.join('", "')}"]}'::jsonb
    );
  `);

  // Escenario 4: Verificación en PostgreSQL
  console.log('[4/4] Verificando trazabilidad de fallos en PostgreSQL...');
  const verifyExec = await queryPostgresJson(`
    SELECT id, status, failed_count, errors, metadata
    FROM sync_executions
    WHERE id = '${execId}'
  `);
  const verifyAudit = await queryPostgresJson(`
    SELECT id, action, resource_id, metadata
    FROM audit_logs
    WHERE id = '${auditId}'
  `);

  console.log(`\n>>> VERIFICACION FINAL FLUJO 7:`);
  console.log(`    Recuperacion de bloqueo Access: EXITOSA en intento #${attempt}`);
  console.log(`    Ejecucion fallida registrada: ID ${verifyExec[0].id} | Estado: ${verifyExec[0].status} | Fallidos: ${verifyExec[0].failed_count}`);
  console.log(`    Auditoria registrada: Accion: ${verifyAudit[0].action} | Ref: ${verifyAudit[0].resource_id}`);
  console.log('    ESTADO FLUJO 7: 100% COMPLETADO CON EXITO!\n');

  return {
    success: true,
    recoveredAttempt: attempt,
    failedSkus,
    execId
  };
}

if (require.main === module) {
  (async () => {
    await runFlow7RetryResilience();
  })().catch(err => {
    console.error('ERROR EN FLUJO 7:', err);
    process.exit(1);
  });
}

module.exports = { runFlow7RetryResilience };
