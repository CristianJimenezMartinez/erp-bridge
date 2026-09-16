import { sanitizeAndTruncate } from './order.queries';

export { sanitizeAndTruncate };

export interface PaymentRecordParams {
  id: number;
  series: string;
  invoiceNumber: number;
  date: Date | string;
  amount: number;
  paymentMethod?: string;
  concept?: string;
  conceptAccount?: number;
  status?: number;
  observations?: string;
  transferFlag?: number;
  type?: number;
  customerCode?: number;
}

function formatAccessDate(d: Date | string): string {
  if (typeof d === 'string' && d.startsWith('#') && d.endsWith('#')) {
    return d;
  }
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `#${year}-${month}-${day}#`;
}

function formatAccessTimestamp(d: Date | string): string {
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const mins = String(dateObj.getMinutes()).padStart(2, '0');
  const secs = String(dateObj.getSeconds()).padStart(2, '0');
  return `#${year}-${month}-${day} ${hours}:${mins}:${secs}#`;
}

/**
 * Retorna la consulta para obtener el siguiente identificador de cobro en F_COB (MAX(CODCOB)).
 * Acepta opcionalmente el parámetro series por compatibilidad de interfaz.
 */
export function getNextPaymentIdQuery(_series?: string): string {
  return `SELECT MAX(CODCOB) AS maxid FROM F_COB`;
}

export const GET_NEXT_PAYMENT_ID_QUERY = `SELECT MAX(CODCOB) AS maxid FROM F_COB`;

/**
 * Genera el INSERT para la tabla F_COB de Factusol con la fecha, importe y concepto formateados.
 */
export function insertPaymentRecordQuery(params: PaymentRecordParams): string {
  const formattedDate = formatAccessDate(params.date);
  const seriesStr = sanitizeAndTruncate(params.series || '1', 1);
  const invoiceNumPadded = String(params.invoiceNumber).padStart(6, '0');
  const defaultConcept = `COBRO FACTURA Nº: ${seriesStr} - ${invoiceNumPadded}`;
  const concept = sanitizeAndTruncate(params.concept || defaultConcept, 40);
  const observations = sanitizeAndTruncate(params.observations || '', 50);
  const conceptAccount = typeof params.conceptAccount === 'number' ? params.conceptAccount : 1;
  const transferFlag = typeof params.transferFlag === 'number' ? params.transferFlag : 0;
  const type = typeof params.type === 'number' ? params.type : 0;
  const amount = Number(params.amount.toFixed(2));

  return `
    INSERT INTO F_COB (
      CODCOB, FECCOB, IMPCOB, CPTCOB, CPACOB, OBSCOB, TRACOB, TIPCOB
    ) VALUES (
      ${params.id},
      ${formattedDate},
      ${amount},
      '${concept}',
      ${conceptAccount},
      '${observations}',
      ${transferFlag},
      ${type}
    )
  `.trim();
}

/**
 * Genera el INSERT para la tabla F_LCO (Líneas de cobro asociadas a facturas).
 * Vincula la factura (TFALCO, CFALCO) con el apunte de cobro maestro en F_COB (MULLCO).
 */
export function insertInvoicePaymentLineQuery(params: PaymentRecordParams): string {
  const formattedDate = formatAccessDate(params.date);
  const nowTimestamp = formatAccessTimestamp(new Date());
  const seriesStr = sanitizeAndTruncate(params.series || '1', 1);
  const invoiceNumPadded = String(params.invoiceNumber).padStart(6, '0');
  const defaultConcept = `COBRO FACTURA Nº: ${seriesStr} - ${invoiceNumPadded}`;
  const concept = sanitizeAndTruncate(params.concept || defaultConcept, 40);
  const paymentMethod = sanitizeAndTruncate(params.paymentMethod || 'TAR', 3).toUpperCase();
  const observations = sanitizeAndTruncate(params.observations || '', 50);
  const amount = Number(params.amount.toFixed(2));

  return `
    INSERT INTO F_LCO (
      TFALCO, CFALCO, LINLCO, FECLCO, IMPLCO, CPTLCO, CPALCO, TRALCO,
      ANTLCO, TIPLCO, FPALCO, OBSLCO, MULLCO, CAJLCO, PCALCO, TPVIDLCO,
      TERLCO, PROLCO, TIDLCO, FALLCO, UALLCO, FUMLCO, UUMLCO
    ) VALUES (
      '${seriesStr}',
      ${params.invoiceNumber},
      1,
      ${formattedDate},
      ${amount},
      '${concept}',
      1,
      0,
      0,
      0,
      '${paymentMethod}',
      '${observations}',
      ${params.id},
      0,
      0,
      '',
      0,
      '',
      '',
      ${nowTimestamp},
      0,
      #1970-01-01 00:00:00#,
      0
    )
  `.trim();
}

/**
 * Consulta para comprobar si ya existe un cobro registrado para una factura en F_LCO.
 */
export function selectPaymentsByInvoiceQuery(series: string, invoiceNumber: number): string {
  const cleanSeries = sanitizeAndTruncate(series, 1);
  return `SELECT TFALCO, CFALCO, LINLCO, MULLCO, IMPLCO, FECLCO, FPALCO FROM F_LCO WHERE TFALCO = '${cleanSeries}' AND CFALCO = ${invoiceNumber}`;
}

/**
 * Elimina un registro de cobro de F_COB por su ID (CODCOB).
 */
export function deletePaymentByIdQuery(paymentId: number): string {
  return `DELETE FROM F_COB WHERE CODCOB = ${paymentId}`;
}

/**
 * Elimina las líneas de cobro de una factura en F_LCO.
 */
export function deleteInvoicePaymentLinesQuery(series: string, invoiceNumber: number): string {
  const cleanSeries = sanitizeAndTruncate(series, 1);
  return `DELETE FROM F_LCO WHERE TFALCO = '${cleanSeries}' AND CFALCO = ${invoiceNumber}`;
}
