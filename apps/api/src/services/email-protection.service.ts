import { Logger } from '@erp-bridge/shared';

export interface RateLimitCheckResult {
  allowed: boolean;
  retryAfterSeconds?: number;
  reason?: string;
  code?: string;
}

/**
 * EmailProtectionService — Blindaje de cuota y rate-limiting en memoria.
 * Protege la cuota diaria de Resend (100 emails/día) frente a ataques de fuerza bruta,
 * solicitudes repetitivas de OTP, webhooks duplicados de Stripe y bucles de sincronización de pedidos.
 */
export class EmailProtectionService {
  private static readonly logger = new Logger('EmailProtection');

  // 1. Rate-limiting de Códigos OTP (Login)
  private static readonly emailAttempts = new Map<string, { count: number; windowStart: number; lastSentAt: number }>();
  private static readonly ipAttempts = new Map<string, { count: number; windowStart: number; lastSentAt: number }>();

  // 2. Deduplicación de bienvenida de compra (Stripe) (TTL: 7 días)
  private static readonly welcomeEmailsSent = new Map<string, number>();

  // 3. Deduplicación de pedidos de Factusol (TTL: 24 horas)
  private static readonly orderNotificationsSent = new Map<string, number>();

  // 4. Presupuesto diario de Resend (ventana deslizante de 24 horas)
  private static readonly resendDispatchTimestamps: number[] = [];
  public static readonly RESEND_DAILY_BUDGET = 80; // Reserva de 20 para emergencias/compras

  // Configuración de límites OTP
  public static readonly OTP_COOLDOWN_MS = 60 * 1000; // 60 segundos entre envíos
  public static readonly OTP_MAX_PER_EMAIL_PER_HOUR = 5;
  public static readonly OTP_MAX_PER_IP_PER_HOUR = 10;
  public static readonly ONE_HOUR_MS = 60 * 60 * 1000;

  /**
   * Comprueba si se permite despachar un código OTP a un email y desde una IP específica.
   */
  public static checkOtpAllowed(email: string, ip: string): RateLimitCheckResult {
    const now = Date.now();
    this.pruneExpiredRecords(now);

    const normEmail = (email || '').toLowerCase().trim();
    const clientIp = (ip || '127.0.0.1').trim();

    // A. Comprobar Cooldown del Email (60 segundos)
    const emailRec = this.emailAttempts.get(normEmail);
    if (emailRec && now - emailRec.lastSentAt < this.OTP_COOLDOWN_MS) {
      const remainingSeconds = Math.ceil((this.OTP_COOLDOWN_MS - (now - emailRec.lastSentAt)) / 1000);
      this.logger.warn(`Cooldown activo para ${normEmail}: reintento bloqueado por ${remainingSeconds}s`);
      return {
        allowed: false,
        retryAfterSeconds: remainingSeconds,
        code: 'OTP_COOLDOWN_ACTIVE',
        reason: `Espera ${remainingSeconds} segundo${remainingSeconds > 1 ? 's' : ''} antes de solicitar otro código.`,
      };
    }

    // B. Comprobar Límite Horario de Email (Máximo 5 envíos por hora)
    if (emailRec && now - emailRec.windowStart < this.ONE_HOUR_MS) {
      if (emailRec.count >= this.OTP_MAX_PER_EMAIL_PER_HOUR) {
        const resetSeconds = Math.ceil((this.ONE_HOUR_MS - (now - emailRec.windowStart)) / 1000);
        this.logger.warn(`Límite horario de email alcanzado para ${normEmail} (${emailRec.count} envíos)`);
        return {
          allowed: false,
          retryAfterSeconds: resetSeconds,
          code: 'TOO_MANY_EMAIL_REQUESTS',
          reason: 'Has alcanzado el límite máximo de 5 códigos por hora para este correo. Inténtalo más tarde o accede directamente con tu Clave de Licencia.',
        };
      }
    }

    // C. Comprobar Límite Horario de IP (Máximo 10 envíos por hora por IP)
    const ipRec = this.ipAttempts.get(clientIp);
    if (ipRec && now - ipRec.windowStart < this.ONE_HOUR_MS) {
      if (ipRec.count >= this.OTP_MAX_PER_IP_PER_HOUR) {
        const resetSeconds = Math.ceil((this.ONE_HOUR_MS - (now - ipRec.windowStart)) / 1000);
        this.logger.warn(`Límite horario de IP alcanzado para ${clientIp} (${ipRec.count} envíos)`);
        return {
          allowed: false,
          retryAfterSeconds: resetSeconds,
          code: 'TOO_MANY_IP_REQUESTS',
          reason: 'Demasiadas solicitudes de código desde esta conexión IP. Espera antes de volver a intentarlo.',
        };
      }
    }

    // D. Comprobar Presupuesto Diario de Resend
    if (!this.hasResendBudget()) {
      this.logger.error('Presupuesto diario de Resend alcanzado (80/día). Despacho bloqueado para proteger cuota.');
      return {
        allowed: false,
        retryAfterSeconds: 300,
        code: 'DAILY_QUOTA_REACHED',
        reason: 'El servicio de envío de códigos por correo está temporalmente en pausa de seguridad. Por favor, accede directamente utilizando tu Clave de Licencia.',
      };
    }

    return { allowed: true };
  }

  /**
   * Registra el despacho exitoso de un código OTP en los contadores de email e IP.
   */
  public static recordOtpSent(email: string, ip: string): void {
    const now = Date.now();
    const normEmail = (email || '').toLowerCase().trim();
    const clientIp = (ip || '127.0.0.1').trim();

    // 1. Contador de Email
    const emailRec = this.emailAttempts.get(normEmail);
    if (!emailRec || now - emailRec.windowStart >= this.ONE_HOUR_MS) {
      this.emailAttempts.set(normEmail, { count: 1, windowStart: now, lastSentAt: now });
    } else {
      emailRec.count += 1;
      emailRec.lastSentAt = now;
    }

    // 2. Contador de IP
    const ipRec = this.ipAttempts.get(clientIp);
    if (!ipRec || now - ipRec.windowStart >= this.ONE_HOUR_MS) {
      this.ipAttempts.set(clientIp, { count: 1, windowStart: now, lastSentAt: now });
    } else {
      ipRec.count += 1;
      ipRec.lastSentAt = now;
    }

    this.recordResendDispatch();
  }

  /**
   * Deduplicación de bienvenida de compra Stripe:
   * Evita enviar correos duplicados ante múltiples webhooks (checkout.session.completed + invoice.payment_succeeded + frontend redirect).
   */
  public static shouldSendBillingWelcome(identifier: string): boolean {
    const key = (identifier || '').trim();
    if (!key) return true;

    const existing = this.welcomeEmailsSent.get(key);
    if (existing) {
      this.logger.info(`[Deduplicación Stripe] Email de bienvenida ya enviado para [${key}]. Omitiendo duplicado.`);
      return false;
    }

    this.welcomeEmailsSent.set(key, Date.now());
    this.recordResendDispatch();
    return true;
  }

  /**
   * Deduplicación de Pedidos Factusol:
   * Evita que bucles de sincronización por cortes de red reenvíen la alerta del mismo pedido.
   */
  public static shouldSendOrderAlert(licenseKey: string, orderRef: string): boolean {
    const key = `${(licenseKey || 'anon').trim()}_${(orderRef || '').trim()}`;
    const now = Date.now();
    const lastSent = this.orderNotificationsSent.get(key);

    if (lastSent && now - lastSent < 24 * 60 * 60 * 1000) {
      this.logger.info(`[Deduplicación Pedido] Alerta de pedido [${orderRef}] ya enviada hace ${Math.round((now - lastSent)/1000)}s. Omitiendo duplicado.`);
      return false;
    }

    this.orderNotificationsSent.set(key, now);
    this.recordResendDispatch();
    return true;
  }

  /**
   * Registra un despacho de email en la ventana deslizante de 24 horas.
   */
  public static recordResendDispatch(): void {
    this.resendDispatchTimestamps.push(Date.now());
  }

  /**
   * Comprueba si aún queda presupuesto de Resend en las últimas 24 horas.
   */
  public static hasResendBudget(): boolean {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    while (this.resendDispatchTimestamps.length > 0 && this.resendDispatchTimestamps[0]! < oneDayAgo) {
      this.resendDispatchTimestamps.shift();
    }
    return this.resendDispatchTimestamps.length < this.RESEND_DAILY_BUDGET;
  }

  /**
   * Obtiene estadísticas actuales para monitoreo y telemetría.
   */
  public static getStats(): { dailyDispatches: number; remainingBudget: number; activeEmailTrackers: number } {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    while (this.resendDispatchTimestamps.length > 0 && this.resendDispatchTimestamps[0]! < oneDayAgo) {
      this.resendDispatchTimestamps.shift();
    }
    return {
      dailyDispatches: this.resendDispatchTimestamps.length,
      remainingBudget: Math.max(0, this.RESEND_DAILY_BUDGET - this.resendDispatchTimestamps.length),
      activeEmailTrackers: this.emailAttempts.size,
    };
  }

  /**
   * Limpieza de registros caducados para evitar fugas de memoria (Garbage Collection).
   */
  private static pruneExpiredRecords(now: number): void {
    const oneDay = 24 * 60 * 60 * 1000;
    const sevenDays = 7 * oneDay;

    for (const [k, v] of this.orderNotificationsSent.entries()) {
      if (now - v > oneDay) this.orderNotificationsSent.delete(k);
    }
    for (const [k, v] of this.welcomeEmailsSent.entries()) {
      if (now - v > sevenDays) this.welcomeEmailsSent.delete(k);
    }
    for (const [k, v] of this.emailAttempts.entries()) {
      if (now - v.windowStart > this.ONE_HOUR_MS && now - v.lastSentAt > this.OTP_COOLDOWN_MS) {
        this.emailAttempts.delete(k);
      }
    }
    for (const [k, v] of this.ipAttempts.entries()) {
      if (now - v.windowStart > this.ONE_HOUR_MS) {
        this.ipAttempts.delete(k);
      }
    }
  }
}
