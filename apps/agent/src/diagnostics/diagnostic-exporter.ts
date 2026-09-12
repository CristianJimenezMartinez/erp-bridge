import fs from 'fs';
import { AgentConfigFile } from '../config/config.types';
import { SyncHistoryRecord } from '../history/history.types';
import { LogEvent } from './diagnostics.types';
import { SystemInfoService } from './system-info';

export interface DiagnosticData {
  config: AgentConfigFile;
  configFilePath: string;
  currentVersion: string;
  currentHwid: string;
  licenseStatus: string;
  activePlan?: string;
  watcherActive: boolean;
  syncHistory: SyncHistoryRecord[];
  recentEvents: LogEvent[];
}

export class DiagnosticExporter {
  public static generate(data: DiagnosticData): string {
    const { config, configFilePath, currentVersion, currentHwid, licenseStatus, activePlan, watcherActive, syncHistory, recentEvents } = data;
    const sys = SystemInfoService.getSystemInfo();
    const fact = config.factusol || {};
    const woo = config.woocommerce || {};
    const rules = config.syncRules || {};
    const maskedKey = woo.consumerKey ? woo.consumerKey.substring(0, 7) + '...' : 'No configurada';

    const lines = [
      '==============================================================================',
      '   BENTIAN ERP BRIDGE — INFORME DE DIAGNÓSTICO TÉCNICO LOCAL',
      `   Generado: ${new Date().toISOString()}`,
      '==============================================================================',
      '',
      '[1] ENTORNO Y SISTEMA OPERATIVO',
      '------------------------------------------------------------------------------',
      `Agente:             ${config.agentName} (v${currentVersion})`,
      `ID Agente:          ${config.agentId || 'Modo Standalone'}`,
      `Plataforma:         ${sys.platform} (${sys.arch}) - OS: ${sys.osVersion}`,
      `Hardware ID (HWID): ${currentHwid}`,
      `Node.js:            ${sys.nodeVersion} - Uptime: ${sys.uptimeSeconds}s`,
      `Memoria RAM:        ${sys.memoryFreeMb} MB libres / ${sys.memoryTotalMb} MB total`,
      `Núcleos CPU:        ${sys.cpuCores}`,
      `Ruta Ejecutable:    ${process.execPath}`,
      `Archivo Config:     ${configFilePath}`,
      '',
      '[2] LICENCIAMIENTO BENTIAN',
      '------------------------------------------------------------------------------',
      `Estado:             ${licenseStatus}`,
      `Plan Activo:        ${activePlan || 'professional'}`,
      `Clave Licencia:     ${config.licenseKey || 'Sin clave'}`,
      `Servidor Central:   ${config.apiBaseUrl}`,
      '',
      '[3] FACTUSOL ERP (LOCAL ACCESS)',
      '------------------------------------------------------------------------------',
      `Ruta Base Datos:    ${config.factusolDbPath || 'Sin ruta'}`,
      `Existe en Disco:    ${config.factusolDbPath && fs.existsSync(config.factusolDbPath) ? 'SÍ' : 'NO'}`,
      `Vigilante Archivo:  ${watcherActive ? 'ACTIVO (Tiempo Real)' : 'INACTIVO'}`,
      `Tarifa Activa:      ${fact.tariffCode || '1'}`,
      `Serie Pedidos:      ${fact.orderSeries || 'A'}`,
      `Serie Facturas:     ${fact.invoiceSeries || '1'}`,
      `Almacén Defecto:    ${fact.warehouseCode || 'GEN'}`,
      '',
      '[4] WOOCOMMERCE TIENDA ONLINE',
      '------------------------------------------------------------------------------',
      `URL Tienda:         ${woo.storeUrl || 'No configurada'}`,
      `Consumer Key:       ${maskedKey}`,
      `Mapeo Estados:      ${JSON.stringify(woo.orderStatusMapping || {})}`,
      '',
      '[5] REGLAS DE SINCRONIZACIÓN',
      '------------------------------------------------------------------------------',
      `Vigilante Activado: ${rules.enableFileWatcher !== false ? 'SÍ' : 'NO'}`,
      `Debounce:           ${rules.debounceSeconds ?? 5} segundos`,
      `Intervalo Periódico:${rules.periodicIntervalMinutes ?? 15} minutos`,
      `Sincronizar Stock:  ${rules.syncStock !== false ? 'SÍ' : 'NO'}`,
      `Sincronizar Precios:${rules.syncPrices !== false ? 'SÍ' : 'NO'}`,
      `Sincronizar Descr:  ${rules.syncDescriptions ? 'SÍ' : 'NO'}`,
      `Stock Buffer Min:   ${rules.safetyStockBuffer ?? 0}`,
      `Solo Stock > 0:     ${rules.onlyStockAboveZero ? 'SÍ' : 'NO'}`,
      '',
      '[6] HISTORIAL DE EJECUCIONES RECIENTES',
      '------------------------------------------------------------------------------',
    ];

    if (syncHistory.length === 0) {
      lines.push('Sin registros en el historial.');
    } else {
      for (const h of syncHistory.slice(0, 10)) {
        lines.push(`[${h.timestamp}] [${h.type.toUpperCase()}/${h.mode.toUpperCase()}] Estado: ${h.status} | Artículos: ${h.itemsUpdated} | Pedidos: ${h.ordersImported} | ${h.durationSeconds}s | ${h.message}`);
      }
    }

    lines.push('');
    lines.push('[7] REGISTRO DE EVENTOS EN TIEMPO REAL (ÚLTIMOS 50)');
    lines.push('------------------------------------------------------------------------------');
    if (recentEvents.length === 0) {
      lines.push('Sin eventos registrados.');
    } else {
      for (const ev of recentEvents.slice(0, 50)) {
        lines.push(`[${ev.timestamp}] [${ev.level.toUpperCase()}] ${ev.message}`);
      }
    }
    lines.push('==============================================================================');

    return lines.join('\n');
  }
}
