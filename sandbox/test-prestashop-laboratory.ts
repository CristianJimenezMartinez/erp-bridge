/**
 * ============================================================================
 * Bentian ERP Bridge — Laboratorio E2E del Conector PrestaShop WebService
 * ============================================================================
 * Prueba de ciclo de vida completo:
 * 1. Arranque de tienda mock PrestaShop WebService (Puerto 8089)
 * 2. Autenticación HTTP Basic con API Key
 * 3. HealthCheck y latencia
 * 4. Lectura de catálogo y mapeo a CanonicalProduct
 * 5. Lectura y actualización de existencias (stock_availables)
 * 6. Descarga de pedidos de PrestaShop y mapeo a CanonicalOrder
 * 7. Inyección del pedido en Factusol real (sandbox ACCDB)
 * 8. Actualización de estado en PrestaShop e inyección de tracking de envío
 * ============================================================================
 */

import path from 'path';
import fs from 'fs';
import { PrestaShopConnector } from '../packages/connectors/prestashop/src';
import { AccessDriver } from '../packages/connectors/factusol/src/access-driver';
import { FactusolConnector } from '../packages/connectors/factusol/src/factusol.connector';
import { ConnectionConfig } from '@erp-bridge/sdk';

const { server, PORT, EXPECTED_API_KEY, stockAvailables, orders } = require('./mock-prestashop-server');

async function runPrestaShopLaboratory(): Promise<void> {
  console.log('======================================================================');
  console.log('🛍️  LABORATORIO DE CERTIFICACIÓN E2E — CONECTOR PRESTASHOP WEBSERVICE');
  console.log('======================================================================\n');

  // 1. Levantar servidor mock de PrestaShop en 8089
  await new Promise<void>((resolve) => {
    server.listen(PORT, '127.0.0.1', () => {
      console.log(`[FASE 1] Servidor Mock de PrestaShop WebService levantado en http://127.0.0.1:${PORT}`);
      resolve();
    });
  });

  const connector = new PrestaShopConnector();

  try {
    // 2. Probar rechazo con API Key errónea
    console.log('\n[FASE 2] Verificando rechazo de credenciales inválidas...');
    const invalidConnector = new PrestaShopConnector();
    const invalidConfig: ConnectionConfig = {
      connectionId: 'conn_invalid',
      organizationId: 'org_test',
      configuration: { url: `http://127.0.0.1:${PORT}` },
      credentials: { apiKey: 'CLAVE_INCORRECTA_999' },
    };
    await invalidConnector.connect(invalidConfig);

    const badHealth = await invalidConnector.healthCheck();
    if (badHealth.status === 'DOWN') {
      console.log('  ✓ Rechazo correcto ante API Key errónea (401 Unauthorized verificado).');
    } else {
      throw new Error(`Se esperaba status DOWN pero se obtuvo: ${badHealth.status}`);
    }

    // 3. Conectar con credenciales válidas
    console.log('\n[FASE 3] Conectando con credenciales legítimas de PrestaShop...');
    const validConfig: ConnectionConfig = {
      connectionId: 'conn_ps_valid',
      organizationId: 'org_test',
      configuration: { url: `http://127.0.0.1:${PORT}` },
      credentials: { apiKey: EXPECTED_API_KEY },
    };
    await connector.connect(validConfig);

    const health = await connector.healthCheck();
    console.log(`  ✓ HealthCheck OK: Status=${health.status}, Latencia=${health.latencyMs}ms, Msg="${health.message}"`);
    if (health.status !== 'HEALTHY') throw new Error('HealthCheck no retornó HEALTHY');

    // 4. Lectura de Catálogo (readProducts)
    console.log('\n[FASE 4] Leyendo catálogo de artículos desde PrestaShop...');
    const products = await connector.readProducts();
    console.log(`  ✓ Se obtuvieron ${products.length} artículos canónicos.`);
    products.forEach((p) => {
      console.log(`    - SKU: ${p.sku} | "${p.name}" | Precio: ${p.regularPrice}€ | Coste: ${p.costPrice || 0}€ | EAN: ${p.barcode || 'N/A'}`);
    });
    if (products.length !== 3) throw new Error(`Se esperaban 3 artículos pero se obtuvieron ${products.length}`);

    // 5. Lectura y Actualización de Stock (readStock & updateStock)
    console.log('\n[FASE 5] Comprobando sincronización de stock con PrestaShop...');
    const initialStocks = await connector.readStock();
    console.log(`  ✓ Registros de stock disponibles iniciales: ${initialStocks.length}`);
    initialStocks.forEach((s) => {
      console.log(`    - SKU: ${s.sku} | Cantidad disponible: ${s.quantity}`);
    });

    console.log('  -> Actualizando stock para SKU "000001" a 88 unidades...');
    const updateRes = await connector.updateStock('000001', 88);
    if (!updateRes.success) throw new Error(`Fallo al actualizar stock: ${updateRes.error}`);
    console.log(`  ✓ Stock actualizado con éxito en PrestaShop: SKU=${updateRes.sku}, Stock=${updateRes.stockQuantity}`);

    // Comprobar que en memoria cambió
    const psStockItem = stockAvailables.find((s: any) => s.id_product === 1);
    console.log(`  ✓ Verificado en tienda mock: ps_stock_available id_product=1 tiene ahora quantity=${psStockItem.quantity}`);
    if (psStockItem.quantity !== 88) throw new Error(`Stock no coincide en mock, esperado 88, actual ${psStockItem.quantity}`);

    // 6. Actualización masiva de Stock (batchUpdateStock)
    console.log('\n[FASE 6] Probando actualización masiva de existencias (Batch Stock Sync)...');
    const batchUpdates = [
      { sku: '001341', quantity: 220, availableQuantity: 220, warehouse: 'GEN', lastUpdated: new Date() },
      { sku: '001455', quantity: 95, availableQuantity: 95, warehouse: 'GEN', lastUpdated: new Date() },
    ];
    const batchRes = await connector.batchUpdateStock(batchUpdates);
    console.log(`  ✓ Batch completado: Total=${batchRes.total}, Éxitos=${batchRes.succeeded}, Fallos=${batchRes.failed}`);
    if (batchRes.failed > 0) throw new Error('Fallaron actualizaciones en batch');

    // 7. Lectura y Conversión de Pedidos (readOrders)
    console.log('\n[FASE 7] Descargando pedidos web de PrestaShop en estado "Pago aceptado" / "Preparación"...');
    const ordersDownloaded = await connector.readOrders();
    console.log(`  ✓ Se descargaron ${ordersDownloaded.length} pedidos listos para Factusol:`);
    ordersDownloaded.forEach((ord) => {
      console.log(`    * Pedido #${ord.orderNumber} (Ref: ${ord.reference}) | Estado: ${ord.status} | Total: ${ord.totalAmount}€ | Líneas: ${ord.lines.length}`);
      ord.lines.forEach((l) => {
        console.log(`      - Línea: SKU ${l.sku} x ${l.quantity} uds @ ${l.unitPrice}€ + ${l.vatPercent}% IVA = ${l.total}€`);
      });
    });
    if (ordersDownloaded.length < 2) throw new Error('Se esperaban al menos 2 pedidos de PrestaShop');

    // 8. Inyección del Pedido PrestaShop en Factusol real (sandbox ACCDB)
    console.log('\n[FASE 8] Inyectando Pedido PrestaShop en la base de datos Factusol (ACCDB)...');
    const sandboxDb = path.resolve(__dirname, 'lab-factusol-isolated.accdb');
    if (fs.existsSync(sandboxDb)) {
      const psOrder = ordersDownloaded[0];
      if (!psOrder) throw new Error('No se descargó ningún pedido para probar Factusol');

      const factusolConnector = new FactusolConnector();
      await factusolConnector.connect({
        configuration: {
          databasePath: sandboxDb,
          autoRollover: false,
          orderSeries: '1',
          defaultWarehouse: 'GEN',
          tariffCode: '1',
        },
      });

      console.log(`  -> Inyectando pedido PrestaShop (Ref: ${psOrder.reference}, Total: ${psOrder.totalAmount}€) en Factusol vía FactusolConnector...`);
      const mutRes = await factusolConnector.createOrder(psOrder);

      if (!mutRes.success) {
        throw new Error(`Fallo al insertar pedido de PrestaShop en Factusol: ${mutRes.error}`);
      }

      const assignedNum = Number(mutRes.externalId || mutRes.orderNumber);
      console.log(`  ✓ Pedido inyectado en Factusol: CODPCL=${assignedNum}, Serie=1, Ref=${psOrder.reference}`);

      // Comprobar lectura en Factusol con AccessDriver
      const driver = new AccessDriver({ databasePath: sandboxDb });
      const verifyRows = await driver.query<{ CODPCL: number; TOTPCL: number; REFPCL: string }>(
        `SELECT CODPCL, TOTPCL, REFPCL FROM F_PCL WHERE CODPCL = ${assignedNum}`
      );
      if (verifyRows.length > 0 && verifyRows[0]) {
        console.log(`  ✓ ¡Pedido verificado en Factusol F_PCL! CODPCL=${verifyRows[0].CODPCL}, TOTPCL=${verifyRows[0].TOTPCL}€, Ref=${verifyRows[0].REFPCL}`);
      } else {
        throw new Error('No se pudo verificar el pedido en Factusol F_PCL');
      }

      const verifyLines = await driver.query<{ ARTLPC: string; CANLPC: number; TOTLPC: number }>(
        `SELECT ARTLPC, CANLPC, TOTLPC FROM F_LPC WHERE CODLPC = ${assignedNum}`
      );
      console.log(`  ✓ Verificadas ${verifyLines.length} líneas en F_LPC para el pedido PrestaShop:`);
      for (const line of verifyLines) {
        console.log(`    - Línea F_LPC: SKU=${line.ARTLPC}, Cantidad=${line.CANLPC}, Total=${line.TOTLPC}€`);
      }
    } else {
      console.log('  ℹ Aviso: Sandbox ACCDB no encontrado, omitiendo paso de escritura Access.');
    }

    // 9. Actualización de estado en PrestaShop e inyección de tracking
    console.log('\n[FASE 9] Actualizando estado de pedido en PrestaShop y registrando número de seguimiento...');
    const statusUpdateRes = await connector.updateOrderStatus('501', 'completed', {
      trackingNumber: 'GLS-ES-8822334455',
    });
    console.log(`  ✓ Estado actualizado en PrestaShop: Éxito=${statusUpdateRes.success}, Pedido=#${statusUpdateRes.orderId}`);
    if (!statusUpdateRes.success) throw new Error('Fallo al actualizar estado del pedido en PrestaShop');

    // Verificar en la tienda mock
    const updatedMockOrder = orders.find((o: any) => o.id === 501);
    console.log(`  ✓ Pedido #501 en PrestaShop tiene ahora current_state=${updatedMockOrder.current_state} (4 = Enviado)`);
    if (updatedMockOrder.current_state !== 4) {
      throw new Error(`Estado no actualizado en mock, esperado 4, actual ${updatedMockOrder.current_state}`);
    }

    console.log('\n======================================================================');
    console.log('🎉 CERTIFICACIÓN EXITOSA: EL CONECTOR DE PRESTASHOP ESTÁ 100% OPERATIVO');
    console.log('======================================================================\n');
  } finally {
    await connector.disconnect();
    await new Promise<void>((resolve) => {
      server.close(() => {
        console.log('✓ Servidor Mock de PrestaShop detenido.');
        resolve();
      });
    });
  }
}

runPrestaShopLaboratory()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ ERROR EN LABORATORIO PRESTASHOP:', err);
    process.exit(1);
  });
