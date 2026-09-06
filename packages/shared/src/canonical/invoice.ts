import { z } from 'zod';

export const CanonicalTaxBreakdownSchema = z.object({
  rate: z.number().min(0).max(100), // e.g. 21, 10, 4, 0
  baseAmount: z.number(), // Base imponible
  taxAmount: z.number(), // Cuota de impuesto
  surchargeRate: z.number().min(0).optional(), // Recargo de equivalencia %
  surchargeAmount: z.number().optional(), // Cuota recargo
});

export type CanonicalTaxBreakdown = z.infer<typeof CanonicalTaxBreakdownSchema>;

export const CanonicalInvoiceLineSchema = z.object({
  id: z.string().optional(),
  position: z.number().int().min(1),
  sku: z.string().min(1),
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number(), // Precio unitario antes de impuestos
  discountPercent: z.number().min(0).max(100).default(0),
  taxRate: z.number().min(0).default(21), // 21, 10, 4, 0
  taxAmount: z.number().default(0),
  lineTotal: z.number(), // Importe total de la línea
});

export type CanonicalInvoiceLine = z.infer<typeof CanonicalInvoiceLineSchema>;

export const CanonicalInvoiceStatusSchema = z.enum([
  'draft',
  'issued',
  'paid',
  'cancelled',
]);

export type CanonicalInvoiceStatus = z.infer<typeof CanonicalInvoiceStatusSchema>;

export const CanonicalInvoiceSchema = z.object({
  id: z.string(),
  series: z.string().default('1'), // Serie de facturación (ej: '1', 'A', 'WEB')
  invoiceNumber: z.string(), // Número de factura correlativo
  orderReference: z.string().optional(), // Referencia del pedido de origen
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date().optional(),
  status: CanonicalInvoiceStatusSchema.default('issued'),
  customer: z.object({
    id: z.string().optional(),
    customerCode: z.string().optional(),
    name: z.string().min(1),
    taxId: z.string().optional(), // NIF / CIF / NIE
    email: z.string().email().optional(),
    phone: z.string().optional(),
    billingAddress: z.object({
      street: z.string().optional(),
      city: z.string().optional(),
      postalCode: z.string().optional(),
      province: z.string().optional(),
      country: z.string().default('ES'),
    }).optional(),
  }),
  lines: z.array(CanonicalInvoiceLineSchema).min(1),
  shippingCost: z.number().default(0),
  netAmount: z.number(), // Base imponible total
  taxAmount: z.number(), // Total cuota de impuestos
  taxBreakdown: z.array(CanonicalTaxBreakdownSchema).default([]),
  totalAmount: z.number(), // Total factura a pagar
  currency: z.string().default('EUR'),
  notes: z.string().optional(),
  sourceSystem: z.string().optional(),
  externalId: z.string().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

export type CanonicalInvoice = z.infer<typeof CanonicalInvoiceSchema>;
