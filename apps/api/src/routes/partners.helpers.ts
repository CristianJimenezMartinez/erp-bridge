import crypto from 'crypto';
import { z } from 'zod';
import { DatabaseService } from '@erp-bridge/core';
import { Logger } from '@erp-bridge/shared';
import { MailerService } from '../services/mailer.service';

const logger = new Logger('PartnersHelpers');

export const PartnerApplySchema = z.object({
  agencyName: z.string().trim().min(2, 'El nombre de la agencia o empresa es obligatorio').max(120),
  contactName: z.string().trim().min(2, 'El nombre de contacto es obligatorio').max(100),
  email: z.string().trim().email('Introduce un correo electrónico profesional válido').max(200),
  phone: z.string().trim().min(6, 'Introduce un teléfono o WhatsApp de contacto').max(50),
  website: z.string().trim().max(200).optional(),
  partnerType: z.enum(['agencia_ecommerce', 'implantador_erp', 'asesoria_holded']).optional().default('agencia_ecommerce'),
  erps: z.string().trim().max(250).optional().default('Factusol, SimplyGest, Sage 50'),
  estimatedClients: z.string().trim().max(60).optional().default('1-5 clientes'),
  notes: z.string().trim().max(1000).optional(),
});

export const AdminUpdatePartnerSchema = z.object({
  status: z.enum(['ACTIVE', 'PENDING', 'SUSPENDED']).optional(),
  commissionRate: z.number().int().min(5).max(50).optional(),
  referredClientsCount: z.number().int().min(0).max(10000).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export function escapeHtml(str: string | undefined | null): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function buildPartnerCode(agencyName: string): string {
  const cleanPrefix = agencyName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 4)
    .padEnd(3, 'X');
  const suffix = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `PT-${cleanPrefix}-${suffix}`;
}

export async function ensurePartnersTable(): Promise<void> {
  const db = DatabaseService.getInstance();
  if (!db.isAvailable()) return;
  await db.query(`
    CREATE TABLE IF NOT EXISTS partners (
      partner_code VARCHAR(50) PRIMARY KEY,
      secret_hash VARCHAR(255) NOT NULL DEFAULT '',
      contact_email VARCHAR(255),
      active BOOLEAN NOT NULL DEFAULT true,
      quota_trials INT NOT NULL DEFAULT 20,
      id VARCHAR(64),
      agency_name VARCHAR(255),
      contact_name VARCHAR(255),
      email VARCHAR(255),
      phone VARCHAR(64),
      website VARCHAR(255),
      partner_type VARCHAR(64) DEFAULT 'agencia_ecommerce',
      erps VARCHAR(255),
      estimated_clients VARCHAR(64),
      commission_rate INTEGER NOT NULL DEFAULT 25,
      referred_clients_count INTEGER NOT NULL DEFAULT 0,
      nfr_license_key VARCHAR(128),
      nfr_license_id VARCHAR(64),
      status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
      notes TEXT,
      ip_address VARCHAR(128),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `).catch((err) => {
    logger.warn(`No se pudo crear tabla partners: ${err instanceof Error ? err.message : String(err)}`);
  });

  await db.query(`
    ALTER TABLE partners
      ADD COLUMN IF NOT EXISTS secret_hash VARCHAR(255) NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255),
      ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS quota_trials INT NOT NULL DEFAULT 20,
      ADD COLUMN IF NOT EXISTS id VARCHAR(64),
      ADD COLUMN IF NOT EXISTS agency_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS email VARCHAR(255),
      ADD COLUMN IF NOT EXISTS phone VARCHAR(64),
      ADD COLUMN IF NOT EXISTS website VARCHAR(255),
      ADD COLUMN IF NOT EXISTS partner_type VARCHAR(64) DEFAULT 'agencia_ecommerce',
      ADD COLUMN IF NOT EXISTS erps VARCHAR(255),
      ADD COLUMN IF NOT EXISTS estimated_clients VARCHAR(64),
      ADD COLUMN IF NOT EXISTS commission_rate INTEGER NOT NULL DEFAULT 25,
      ADD COLUMN IF NOT EXISTS referred_clients_count INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS nfr_license_key VARCHAR(128),
      ADD COLUMN IF NOT EXISTS nfr_license_id VARCHAR(64),
      ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
      ADD COLUMN IF NOT EXISTS notes TEXT,
      ADD COLUMN IF NOT EXISTS ip_address VARCHAR(128),
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  `).catch(() => {});
}

export function dispatchPartnerOnboardingEmails(params: {
  agencyName: string;
  contactName: string;
  email: string;
  phone: string;
  erps: string;
  estimatedClients: string;
  partnerCode: string;
  nfrLicenseKey: string;
}): void {
  const { agencyName, contactName, email, phone, erps, estimatedClients, partnerCode, nfrLicenseKey } = params;
  void MailerService.sendLicenseWelcomeEmail({
    customerEmail: email,
    licenseKey: nfrLicenseKey,
    planName: `Partner Oficial Bentian (${partnerCode} · 25% Comisión Recurrente + Licencia NFR 2 Puestos)`,
    alias: `Partner NFR (${partnerCode}) - ${agencyName}`,
    companyName: agencyName,
  }).catch(() => {});

  const adminHtml = MailerService.renderBrandedEmail({
    title: `Nuevo Partner B2B Registrado: ${escapeHtml(agencyName)} (${escapeHtml(partnerCode)})`,
    badgeText: 'NUEVO PARTNER 25%',
    badgeType: 'success',
    contentHtml: `
      <h2 style="margin:0 0 12px 0;font-size:18px;color:#ffffff;">🤝 Alta de Nuevo Partner / Agente Digitalizador</h2>
      <p style="font-size:13px;color:#d4d4d8;line-height:1.6;">
        <strong>Agencia:</strong> ${escapeHtml(agencyName)}<br/>
        <strong>Contacto:</strong> ${escapeHtml(contactName)} (<a href="mailto:${escapeHtml(email)}" style="color:#818cf8;">${escapeHtml(email)}</a> · Tel: ${escapeHtml(phone)})<br/>
        <strong>Código Partner:</strong> <code style="color:#34d399;font-weight:700;">${escapeHtml(partnerCode)}</code> (25% recurrente)<br/>
        <strong>ERPs:</strong> ${escapeHtml(erps)} (${escapeHtml(estimatedClients)})<br/>
        <strong>Licencia NFR (2 puestos / Clave acceso Portal):</strong> <code style="color:#818cf8;">${escapeHtml(nfrLicenseKey)}</code>
      </p>
    `,
    previewText: `Nuevo Partner B2B: ${escapeHtml(agencyName)} (${escapeHtml(partnerCode)})`,
  });

  void MailerService.sendEmail({
    to: 'cristianjimeneztrabajo@gmail.com',
    subject: `[NUEVO PARTNER B2B] ${agencyName} (${partnerCode}) se ha unido al Canal de Partners`,
    html: adminHtml,
    text: `Nuevo Partner B2B: ${agencyName} | Contacto: ${contactName} (${email} / ${phone}) | Código: ${partnerCode} | Licencia NFR: ${nfrLicenseKey}`,
  }).catch(() => {});
}
