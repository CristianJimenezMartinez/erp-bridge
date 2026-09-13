import {
  InvoiceMutationResult,
  ReadInvoicesOptions,
  ConnectionError,
  ErrorCode,
} from '@erp-bridge/sdk';
import { CanonicalInvoice, Logger } from '@erp-bridge/shared';
import { AccessDriver } from '../access-driver';
import {
  SELECT_INVOICES_HEADER_QUERY,
  SELECT_INVOICE_LINES_QUERY,
} from '../queries';
import { FactusolInvoiceMapper } from '../mappers';
import { FactusolConnectionConfig } from '../factusol.connector';

export class FactusolInvoiceHandler {
  constructor(
    private readonly driver: AccessDriver,
    private readonly config: FactusolConnectionConfig,
    private readonly logger: Logger
  ) {}

  public async readInvoices(options?: ReadInvoicesOptions): Promise<CanonicalInvoice[]> {
    const query = SELECT_INVOICES_HEADER_QUERY;
    const headers = await this.driver.query<Record<string, unknown>>(query);
    const limit = options?.limit || 50;
    const slice = headers.slice(0, limit);

    const invoices: CanonicalInvoice[] = [];
    for (const h of slice) {
      const tipfac = String(h['TIPFAC'] || h['tipfac'] || '1').trim();
      const codfac = Number(h['CODFAC'] || h['codfac'] || 0);

      const linesQuery = SELECT_INVOICE_LINES_QUERY
        .replace('?', `'${tipfac}'`)
        .replace('?', String(codfac));

      const lines = await this.driver.query<Record<string, unknown>>(linesQuery).catch(() => []);
      invoices.push(FactusolInvoiceMapper.toCanonical(h, lines));
    }

    return invoices;
  }

  public async createInvoice(invoice: CanonicalInvoice): Promise<InvoiceMutationResult> {
    const series = (invoice.series || this.config.invoiceSeries || '1').substring(0, 1);
    const ref = invoice.orderReference || invoice.invoiceNumber;

    try {
      // 1. Idempotency check: does this invoice ref already exist in F_FAC?
      if (ref) {
        const lookupRef = ref.substring(0, 20).replace(/'/g, "''");
        const checkSql = `SELECT CODFAC, TIPFAC, REFFAC, TOTFAC FROM F_FAC WHERE REFFAC = '${lookupRef}' AND TIPFAC = '${series}'`;
        const existing = await this.driver.query<{ CODFAC: number; TIPFAC: string }>(checkSql);
        if (existing && existing.length > 0) {
          const found = existing[0]!;
          this.logger.info(`Factura con referencia ${ref} ya existe en Factusol (CODFAC=${found.CODFAC})`);
          return {
            success: true,
            invoiceId: invoice.id,
            externalId: String(found.CODFAC),
            invoiceNumber: String(found.CODFAC),
            series: found.TIPFAC,
            status: 'issued',
          };
        }
      }

      // 2. Retry loop for atomic transaction execution (up to 5 attempts with backoff) against CODFAC collisions
      const MAX_RETRIES = 5;
      let lastError: unknown = null;
      let invoiceCreated = false;
      let finalInvoiceId = 0;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const maxHeaderRows = await this.driver.query<{ maxid: number }>(`SELECT MAX(CODFAC) AS maxid FROM F_FAC WHERE TIPFAC = '${series}'`);
          const maxLineRows = await this.driver.query<{ maxid: number }>(`SELECT MAX(CODLFA) AS maxid FROM F_LFA WHERE TIPLFA = '${series}'`);
          const maxHeader = Number(maxHeaderRows[0]?.maxid) || 0;
          const maxLine = Number(maxLineRows[0]?.maxid) || 0;
          const nextInvoiceId = Math.max(maxHeader, maxLine) + 1;

          const header = FactusolInvoiceMapper.toFactusolHeader(invoice, nextInvoiceId, this.config.defaultWarehouse);
          const lines = FactusolInvoiceMapper.toFactusolLines(invoice, nextInvoiceId);

          const headerSql = `
            INSERT INTO F_FAC (
              TIPFAC, CODFAC, REFFAC, FECFAC, ESTFAC, ALMFAC, AGEFAC, CLIFAC,
              CNOFAC, CDOFAC, CPOFAC, CCPFAC, CPRFAC, TELFAC, CEMFAC, CPAFAC,
              PIVA1FAC, PIVA2FAC, PIVA3FAC, IPOR1FAC, IIVA1FAC, NET1FAC, TOTFAC
            ) VALUES (
              '${header.tipfac}',
              ${header.codfac},
              '${header.reffac.replace(/'/g, "''")}',
              ${header.fecfac},
              ${header.estfac},
              '${header.almfac}',
              ${header.agefac ? header.agefac : 0},
              ${header.clifac},
              '${header.cnofac.replace(/'/g, "''")}',
              ${header.cdofac ? `'${header.cdofac.replace(/'/g, "''")}'` : "''"},
              ${header.cpofac ? `'${header.cpofac.replace(/'/g, "''")}'` : "''"},
              ${header.ccpfac ? `'${header.ccpfac.replace(/'/g, "''")}'` : "''"},
              ${header.cprfac ? `'${header.cprfac.replace(/'/g, "''")}'` : "''"},
              ${header.telfac ? `'${header.telfac.replace(/'/g, "''")}'` : "''"},
              ${header.cemfac ? `'${header.cemfac.replace(/'/g, "''")}'` : "''"},
              ${header.cpafac ? `'${header.cpafac.replace(/'/g, "''")}'` : "''"},
              ${header.piva1fac},
              ${header.piva2fac},
              ${header.piva3fac},
              ${header.ipor1fac},
              ${header.iiva1fac},
              ${header.net1fac},
              ${header.totfac}
            )
          `.trim();

          const lineSqls = lines.map((line) => `
            INSERT INTO F_LFA (
              TIPLFA, CODLFA, POSLFA, ARTLFA, DESLFA, CANLFA, PRELFA, TOTLFA
            ) VALUES (
              '${line.tiplfa}',
              ${line.codlfa},
              ${line.poslfa},
              '${line.artlfa.replace(/'/g, "''")}',
              '${line.deslfa.replace(/'/g, "''")}',
              ${line.canlfa},
              ${line.prelfa},
              ${line.totlfa}
            )
          `.trim());

          await this.driver.executeTransaction([headerSql, ...lineSqls]);

          finalInvoiceId = nextInvoiceId;
          invoiceCreated = true;
          this.logger.info(`Factura creada exitosamente en Factusol (CODFAC=${nextInvoiceId}, Serie='${series}') para ref ${ref} (intento ${attempt})`);
          break;
        } catch (err: unknown) {
          lastError = err;
          this.logger.warn(`Colisión o fallo en intento ${attempt}/${MAX_RETRIES} al insertar factura ${ref} en Factusol: ${err instanceof Error ? err.message : String(err)}`);
          if (attempt < MAX_RETRIES) {
            const backoffMs = 100 * Math.pow(2, attempt - 1);
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
          }
        }
      }

      if (!invoiceCreated) {
        throw lastError || new Error(`No se pudo crear la factura tras ${MAX_RETRIES} intentos`);
      }

      return {
        success: true,
        invoiceId: invoice.id,
        externalId: String(finalInvoiceId),
        invoiceNumber: String(finalInvoiceId),
        series,
        status: 'issued',
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
    const invoiceNum = parseInt(invoiceId, 10);
    if (isNaN(invoiceNum)) {
      throw new ConnectionError(ErrorCode.VALIDATION_ERROR, `ID de factura Factusol inválido: ${invoiceId}`);
    }

    const series = this.config.invoiceSeries || '1';
    const statusCode = FactusolInvoiceMapper.mapCanonicalStatusToFactusol(status as any);

    const updateSql = `UPDATE F_FAC SET ESTFAC = ${statusCode} WHERE TIPFAC = '${series}' AND CODFAC = ${invoiceNum}`;

    await this.driver.execute(updateSql);
    this.logger.info(`Estado de factura actualizado en Factusol: CODFAC=${invoiceNum}, ESTFAC=${statusCode} (${status})`);

    return {
      success: true,
      invoiceId,
      externalId: String(invoiceNum),
      series,
      status,
    };
  }
}
