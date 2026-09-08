import { z } from 'zod';

export const OrderStatusSchema = z.enum([
  'pending',
  'processing',
  'on-hold',
  'completed',
  'cancelled',
  'refunded',
  'failed',
]);

export type OrderStatus = z.infer<typeof OrderStatusSchema>;

export const CanonicalAddressSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  company: z.string().optional(),
  street: z.string().optional(),
  street2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().default('ES'),
  phone: z.string().optional(),
  email: z.string().optional(),
});

export type CanonicalAddress = z.infer<typeof CanonicalAddressSchema>;

export const CanonicalCustomerSchema = z.object({
  id: z.string(),
  customerNumber: z.string().optional(), // Factusol CODCLI or external ID
  taxId: z.string().optional(),          // NIF/CIF (NIFCLI / CNIPCL)
  fiscalName: z.string().min(1, 'Fiscal name is required'), // NOFCLI
  commercialName: z.string().optional(), // NOCCLI
  email: z.string().email().or(z.string()).optional(),
  phone: z.string().optional(),          // TELCLI
  address: CanonicalAddressSchema.optional(),
  accountingCode: z.number().optional(), // CCOCLI
  paymentMethod: z.string().optional(),  // FPACLI
  priceList: z.number().optional(),      // TARCLI
  hasEquivalenceSurcharge: z.boolean().default(false), // REQCLI (Recargo de Equivalencia para minoristas)
  rawSourceData: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type CanonicalCustomer = z.infer<typeof CanonicalCustomerSchema>;

export const CanonicalOrderLineSchema = z.object({
  id: z.string(),
  position: z.number().int().default(1), // POSLPC
  sku: z.string().min(1, 'Product SKU is required'), // ARTLPC
  name: z.string().default(''),          // DESLPC
  quantity: z.number().positive(),       // CANLPC
  unitPrice: z.number().nonnegative(),   // PRELPC
  discountPercent: z.number().min(0).max(100).default(0), // DT1LPC
  vatPercent: z.number().min(0).default(21),
  vatType: z.number().int().default(0),  // Factusol IVALPC: 0=21%, 1=10%, 2=4%, 3=0%
  subtotal: z.number().nonnegative(),
  total: z.number().nonnegative(),       // TOTLPC
  rawSourceData: z.record(z.string(), z.unknown()).optional(),
});

export type CanonicalOrderLine = z.infer<typeof CanonicalOrderLineSchema>;

export const CanonicalOrderSchema = z.object({
  id: z.string(),
  orderNumber: z.string().min(1, 'Order number is required'), // CODPCL / WC ID
  series: z.string().default(''),        // TIPPCL
  reference: z.string().default(''),     // REFPCL (external order ref)
  date: z.date(),                        // FECPCL
  status: OrderStatusSchema.default('pending'),
  customer: CanonicalCustomerSchema,
  shippingAddress: CanonicalAddressSchema.optional(),
  billingAddress: CanonicalAddressSchema.optional(),
  paymentMethod: z.string().optional(),  // e.g. 'bacs', 'cod', 'redsys', 'paypal', 'stripe'
  paymentMethodTitle: z.string().optional(),
  currency: z.string().default('EUR'),
  lines: z.array(CanonicalOrderLineSchema).min(1, 'Order must have at least one line'),
  netAmount: z.number().nonnegative().default(0),       // NET1PCL
  taxAmount: z.number().nonnegative().default(0),       // IIVA1PCL
  shippingAmount: z.number().nonnegative().default(0),  // IPOR1PCL
  discountAmount: z.number().nonnegative().default(0),
  totalAmount: z.number().nonnegative(),                // TOTPCL
  warehouse: z.string().default('GEN'),                 // ALMPCL
  notes: z.string().optional(),                         // OB1PCL
  hasEquivalenceSurcharge: z.boolean().default(false),  // REQPCL en Factusol (1 si aplica R.E., 0 si no)
  equivalenceSurchargeRate: z.number().optional(),      // % de R.E. (5.2%, 1.4%, 0.5%)
  trackingNumber: z.string().optional(),                // Número de seguimiento de expedición
  carrierName: z.string().optional(),                   // Transportista (GLS, MRW, SEUR, Correos Express)
  carrierCode: z.string().optional(),
  shippedAt: z.date().optional(),
  rawSourceData: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type CanonicalOrder = z.infer<typeof CanonicalOrderSchema>;
