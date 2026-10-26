import { InvoiceMutationResult, ReadInvoicesOptions, ConnectionError, ErrorCode } from '@erp-bridge/sdk';
import { CanonicalInvoice, Logger } from '@erp-bridge/shared';
import { AccessDatabaseTimeoutError, AccessDriver } from '../access-driver';
import {
  SELECT_INVOICES_HEADER_QUERY,
  SELECT_INVOICE_LINES_QUERY,
  insertInvoiceHeaderQuery,
  getNextPaymentIdQuery,
  insertPaymentRecordQuery,
  insertInvoicePaymentLineQuery,
  selectPaymentsByInvoiceQuery,
  deletePaymentByIdQuery,
  deleteInvoicePaymentLinesQuery,
  PaymentRecordParams,
  sanitizeAndTruncate,
  sanitizeInt,
  sanitizeFloat,
} from '../queries';
import { FactusolInvoiceMapper } from '../mappers';
import { FactusolConnectionConfig } from '../factusol.types';

function isInvoiceCollisionError(err: unknown): boolean {
  const msg = ((err as { message?: string })?.message || String(err)).toLowerCase();
  return (
    msg.includes('duplicate') ||
    msg.includes('duplicad') ||
    msg.includes('primary key') ||
    msg.includes('clave principal') ||
    msg.includes('unique') ||
    msg.includes('índice') ||
    msg.includes('index') ||
    msg.includes('3022')
  );
}

export class FactusolInvoiceHandler {
  constructor(
    private readonly driver: AccessDriver,
    private readonly config: FactusolConnectionConfig,
    private readonly logger: Logger
  ) {}

  public async readInvoices(options?: ReadInvoicesOptions): Promise<CanonicalInvoice[]> {
    const headers = await this.driver.query<Record<string, unknown>>(SELECT_INVOICES_HEADER_QUERY);
    const limit = options?.limit || 50;
    const slice = headers.slice(0, limit);

    const invoices: CanonicalInvoice[] = [];
    for (const h of slice) {
      const tipfac = sanitizeAndTruncate(String(h['TIPFAC'] || h['tipfac'] || '1').trim(), 1);
      const codfac = sanitizeInt(h['CODFAC'] || h['codfac'] || 0);

      const linesQuery = SELECT_INVOICE_LINES_QUERY
        .replace('?', `'${tipfac}'`)
        .replace('?', String(codfac));

      // Sin .catch(() => []): un bloqueo o timeout al leer F_LFA debe propagarse en vez de fabricar una línea 'GENERIC' falsa
      const lines = await this.driver.query<Record<string, unknown>>(linesQuery);
      invoices.push(FactusolInvoiceMapper.toCanonical(h, lines));
    }

    return invoices;
  }

  public async createInvoice(invoice: CanonicalInvoice): Promise<InvoiceMutationResult> {
    const series = sanitizeAndTruncate(invoice.series || this.config.invoiceSeries || '1', 1);
    const ref = (invoice.orderReference || invoice.invoiceNumber || '').trim();

    const findExistingByRef = async (): Promise<{ CODFAC: number; TIPFAC: string } | null> => {
      if (!ref) return null;
      const lookupRef = sanitizeAndTruncate(ref, 50);
      const checkSql = `SELECT CODFAC, TIPFAC, REFFAC, TOTFAC FROM F_FAC WHERE REFFAC = '${lookupRef}' AND TIPFAC = '${series}'`;
      const existing = await this.driver.query<{ CODFAC: number; TIPFAC: string }>(checkSql);
      return existing?.[0] ?? null;
    };

    try {
      // 1. Idempotency check: does this invoice ref already exist in F_FAC?
      const existing = await findExistingByRef();
      if (existing) {
        this.logger.info(`Factura con referencia ${ref} ya existe en Factusol (CODFAC=${existing.CODFAC})`);
        return {
          success: true,
          invoiceId: invoice.id,
          externalId: String(existing.CODFAC),
          invoiceNumber: String(existing.CODFAC),
          series: existing.TIPFAC || series,
          status: invoice.status || 'issued',
        };
      }

      // 2. Retry loop for atomic transaction execution (up to 5 attempts with backoff) against CODFAC collisions
      const MAX_RETRIES = 5;
      let lastError: unknown = null;
      let invoiceCreated = false;
      let finalInvoiceId = 0;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          if (attempt > 1) {
            const committedOnPrev = await findExistingByRef();
            if (committedOnPrev) {
              this.logger.info(
                `Factura ${ref} encontrada en F_FAC antes del reintento ${attempt} (CODFAC=${committedOnPrev.CODFAC}); se evita duplicado.`
              );
              return {
                success: true,
                invoiceId: invoice.id,
                externalId: String(committedOnPrev.CODFAC),
                invoiceNumber: String(committedOnPrev.CODFAC),
                series: committedOnPrev.TIPFAC || series,
                status: invoice.status || 'issued',
              };
            }
          }

          const maxHeaderRows = await this.driver.query<{ maxid: number }>(`SELECT MAX(CODFAC) AS maxid FROM F_FAC WHERE TIPFAC = '${series}'`);
          const maxLineRows = await this.driver.query<{ maxid: number }>(`SELECT MAX(CODLFA) AS maxid FROM F_LFA WHERE TIPLFA = '${series}'`);
          const maxHeader = Number(maxHeaderRows[0]?.maxid) || 0;
          const maxLine = Number(maxLineRows[0]?.maxid) || 0;
          const nextInvoiceId = Math.max(maxHeader, maxLine) + 1;

          const header = FactusolInvoiceMapper.toFactusolHeader(invoice, nextInvoiceId, this.config.defaultWarehouse);
          const lines = FactusolInvoiceMapper.toFactusolLines(invoice, nextInvoiceId);

          const headerSql = insertInvoiceHeaderQuery(header);
          const lineSqls = lines.map((line) => `
            INSERT INTO F_LFA (
              TIPLFA, CODLFA, POSLFA, ARTLFA, DESLFA, CANLFA, PRELFA, TOTLFA, IVALFA
            ) VALUES (
              '${sanitizeAndTruncate(line.tiplfa, 1)}',
              ${sanitizeInt(line.codlfa)},
              ${sanitizeInt(line.poslfa)},
              '${sanitizeAndTruncate(line.artlfa, 13)}',
              '${sanitizeAndTruncate(line.deslfa, 100)}',
              ${sanitizeFloat(line.canlfa)},
              ${sanitizeFloat(line.prelfa)},
              ${sanitizeFloat(line.totlfa)},
              ${sanitizeFloat(line.ivalfa ?? 0)}
            )
          `.trim());

          const txStatements: string[] = [headerSql, ...lineSqls];

          // 3. Si la factura viene con status === 'paid' y recordPayments !== false, registrar cobro en F_COB y F_LCO
          const shouldRecordPayment = invoice.status === 'paid' && this.config.recordPayments !== false;
          if (shouldRecordPayment) {
            const maxPaymentRows = await this.driver.query<{ maxid: number }>(getNextPaymentIdQuery(series));
            const maxPayment = Number(maxPaymentRows[0]?.maxid) || 0;
            const nextPaymentId = maxPayment + 1;

            const paymentParams: PaymentRecordParams = {
              id: nextPaymentId,
              series,
              invoiceNumber: nextInvoiceId,
              date: invoice.issueDate || new Date(),
              amount: invoice.totalAmount,
              paymentMethod: header.fopfac,
              customerCode: header.clifac,
              status: 2,
            };

            const paymentSql = insertPaymentRecordQuery(paymentParams);
            const paymentLineSql = insertInvoicePaymentLineQuery(paymentParams);
            txStatements.push(paymentSql, paymentLineSql);
          }

          await this.driver.executeTransaction(txStatements);

          finalInvoiceId = nextInvoiceId;
          invoiceCreated = true;
          this.logger.info(`Factura creada exitosamente en Factusol (CODFAC=${nextInvoiceId}, Serie='${series}') para ref ${ref} (intento ${attempt})`);
          break;
        } catch (err: unknown) {
          lastError = err;
          this.logger.warn(`Colisión o fallo en intento ${attempt}/${MAX_RETRIES} al insertar factura ${ref} en Factusol: ${err instanceof Error ? err.message : String(err)}`);
          if (err instanceof AccessDatabaseTimeoutError) {
            break;
          }
          const canSafelyRetry = isInvoiceCollisionError(err) || Boolean(ref);
          if (!canSafelyRetry) {
            break;
          }
          if (attempt < MAX_RETRIES) {
            const backoffMs = 100 * Math.pow(2, attempt - 1);
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
          }
        }
      }

      if (!invoiceCreated) {
        const committedAfterAll = await findExistingByRef().catch(() => null);
        if (committedAfterAll) {
          this.logger.info(
            `Factura ${ref} localizada en F_FAC tras error de transacción (CODFAC=${committedAfterAll.CODFAC}); se devuelve éxito idempotente.`
          );
          return {
            success: true,
            invoiceId: invoice.id,
            externalId: String(committedAfterAll.CODFAC),
            invoiceNumber: String(committedAfterAll.CODFAC),
            series: committedAfterAll.TIPFAC || series,
            status: invoice.status || 'issued',
          };
        }
        throw lastError || new Error(`No se pudo crear la factura tras ${MAX_RETRIES} intentos`);
      }

      return {
        success: true,
        invoiceId: invoice.id,
        externalId: String(finalInvoiceId),
        invoiceNumber: String(finalInvoiceId),
        series,
        status: invoice.status || 'issued',
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error al insertar factura en Factusol para ref ${ref}`, error);
      return {
        success: false,
        invoiceId: invoice.id,
        externalId: '',
        error: msg,
      };
    }
  }

  public async updateInvoiceStatus(
    invoiceId: string,
    status: string
  ): Promise<InvoiceMutationResult> {
    let series = sanitizeAndTruncate(this.config.invoiceSeries || '1', 1);
    let parsedNum = NaN;
    const rawId = String(invoiceId || '').trim();
    const canonicalMatch = rawId.match(/^factusol_inv_(?:([a-zA-Z0-9])_)?(\d+)$/i);
    const dashMatch = rawId.match(/^([a-zA-Z0-9])-(\d+)$/);
    if (canonicalMatch) {
      if (canonicalMatch[1]) series = sanitizeAndTruncate(canonicalMatch[1], 1);
      parsedNum = parseInt(canonicalMatch[2]!, 10);
    } else if (dashMatch) {
      series = sanitizeAndTruncate(dashMatch[1]!, 1);
      parsedNum = parseInt(dashMatch[2]!, 10);
    } else {
      parsedNum = parseInt(rawId, 10);
    }

    if (isNaN(parsedNum) || parsedNum <= 0) {
      throw new ConnectionError(ErrorCode.VALIDATION_ERROR, `ID de factura Factusol inválido: ${invoiceId}`);
    }
    const invoiceNum = parsedNum;
    const statusCode = sanitizeInt(FactusolInvoiceMapper.mapCanonicalStatusToFactusol(status as any));

    type FacRow = { TOTFAC: number; CLIFAC: number; FOPFAC: string; FECFAC: string; TIPFAC?: string };
    let facRows = await this.driver.query<FacRow>(
      `SELECT TOTFAC, CLIFAC, FOPFAC, FECFAC, TIPFAC FROM F_FAC WHERE TIPFAC = '${series}' AND CODFAC = ${invoiceNum}`
    );
    if (facRows.length === 0) {
      const anySeries = await this.driver.query<FacRow>(
        `SELECT TOTFAC, CLIFAC, FOPFAC, FECFAC, TIPFAC FROM F_FAC WHERE CODFAC = ${invoiceNum}`
      );
      if (anySeries.length === 1) {
        facRows = anySeries;
        series = sanitizeAndTruncate(String(anySeries[0]!.TIPFAC ?? '').trim() || series, 1);
      } else if (anySeries.length > 1) {
        throw new ConnectionError(
          ErrorCode.VALIDATION_ERROR,
          `La factura Factusol ${invoiceNum} existe en varias series y no coincide con la serie '${series}'.`
        );
      }
    }

    const updateSql = `UPDATE F_FAC SET ESTFAC = ${statusCode} WHERE TIPFAC = '${series}' AND CODFAC = ${invoiceNum}`;
    const txStatements: string[] = [updateSql];
    const shouldRecordPayment = status === 'paid' && this.config.recordPayments !== false;

    if (shouldRecordPayment) {
      // Comprobar si ya existe cobro registrado para esta factura (sin .catch(() => []) para evitar duplicar cobros ante bloqueo temporal)
      const existingCob = await this.driver.query<{ MULLCO: number }>(
        selectPaymentsByInvoiceQuery(series, invoiceNum)
      );

      if (existingCob.length === 0 && facRows.length > 0) {
        const fac = facRows[0]!;
        const maxPaymentRows = await this.driver.query<{ maxid: number }>(getNextPaymentIdQuery(series));
        const nextPaymentId = (Number(maxPaymentRows[0]?.maxid) || 0) + 1;

        const paymentParams: PaymentRecordParams = {
          id: nextPaymentId,
          series,
          invoiceNumber: invoiceNum,
          date: fac.FECFAC ? new Date(fac.FECFAC) : new Date(),
          amount: Number(fac.TOTFAC) || 0,
          paymentMethod: fac.FOPFAC || 'TAR',
          customerCode: Number(fac.CLIFAC) || 1,
          status: 2,
        };

        txStatements.push(insertPaymentRecordQuery(paymentParams), insertInvoicePaymentLineQuery(paymentParams));
      }
    } else if (status !== 'paid') {
      const existingCob = await this.driver.query<{ MULLCO: number }>(
        selectPaymentsByInvoiceQuery(series, invoiceNum)
      );

      if (existingCob.length > 0) {
        txStatements.push(deleteInvoicePaymentLinesQuery(series, invoiceNum));
        for (const cob of existingCob) {
          if (cob.MULLCO) {
            txStatements.push(deletePaymentByIdQuery(cob.MULLCO));
          }
        }
      }
    }

    await this.driver.executeTransaction(txStatements);
    this.logger.info(`Estado de factura actualizado en Factusol: CODFAC=${invoiceNum}, ESTFAC=${statusCode} (${status})`);
    return { success: true, invoiceId, externalId: String(invoiceNum), series, status };
  }
}
