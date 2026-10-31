import https from 'https';
import crypto from 'crypto';
import { DatabaseService } from '@erp-bridge/core';
import { Logger } from '@erp-bridge/shared';
import { MailerService } from './mailer.service';
import { OmnichannelAiService } from './omnichannel-ai.service';

export type ChatPlatform = 'web' | 'telegram' | 'whatsapp' | 'discord' | 'matterbridge' | 'matrix';

export interface OmnichannelMessage {
  id: string;
  sessionId: string;
  platform: ChatPlatform;
  sender: 'visitor' | 'ai' | 'admin';
  senderName: string;
  text: string;
  createdAt: string;
}

interface SessionMeta {
  sessionId: string;
  platform: ChatPlatform;
  visitorName: string;
  externalChatId?: string;
  visitorEmail?: string;
  visitorPhone?: string;
  detectedErp?: string;
  detectedStore?: string;
  updatedAt: number;
  messages: OmnichannelMessage[];
}

const logger = new Logger('OmnichannelBridgeService');

export class OmnichannelBridgeService {
  private static readonly sessions = new Map<string, SessionMeta>();
  private static readonly MAX_SESSIONS = 500;

  public static async handleIncomingMessage(params: {
    sessionId?: string;
    platform: ChatPlatform;
    text: string;
    visitorName?: string;
    externalChatId?: string;
    visitorEmail?: string;
  }): Promise<{ sessionId: string; visitorMsg: OmnichannelMessage; aiMsg: OmnichannelMessage }> {
    const rawSession = (params.sessionId || '').trim().replace(/[^a-zA-Z0-9_-]/g, '');
    const sessionId = rawSession.length >= 6 ? rawSession.slice(0, 48) : `sess_${crypto.randomBytes(5).toString('hex')}`;
    const cleanText = params.text.trim().slice(0, 2000);
    const visitorName = (params.visitorName || 'Visitante').trim().slice(0, 80);

    const session = await this.getOrHydrateSession(sessionId, params.platform, visitorName);
    session.updatedAt = Date.now();
    if (params.visitorName) session.visitorName = visitorName;
    if (params.externalChatId) session.externalChatId = params.externalChatId;
    if (params.visitorEmail) session.visitorEmail = params.visitorEmail;

    const priorHistory = session.messages.map((m) => ({
      role: (m.sender === 'visitor' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.text,
    }));

    const visitorMsg: OmnichannelMessage = {
      id: `msg_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      sessionId,
      platform: params.platform,
      sender: 'visitor',
      senderName: session.visitorName,
      text: cleanText,
      createdAt: new Date().toISOString(),
    };
    session.messages.push(visitorMsg);

    const aiAnalysis = await OmnichannelAiService.generateAutonomousReply(cleanText, params.platform, session.visitorName, priorHistory, {
      detectedErp: session.detectedErp,
      detectedStore: session.detectedStore,
      visitorEmail: session.visitorEmail,
      visitorPhone: session.visitorPhone,
    });

    if (aiAnalysis.detectedEmail) session.visitorEmail = aiAnalysis.detectedEmail;
    if (aiAnalysis.detectedPhone) session.visitorPhone = aiAnalysis.detectedPhone;
    if (aiAnalysis.detectedErp) session.detectedErp = aiAnalysis.detectedErp;
    if (aiAnalysis.detectedStore) session.detectedStore = aiAnalysis.detectedStore;

    const aiMsg: OmnichannelMessage = {
      id: `msg_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      sessionId,
      platform: params.platform,
      sender: 'ai',
      senderName: 'Bentian AI (Autónomo)',
      text: aiAnalysis.reply,
      createdAt: new Date().toISOString(),
    };
    session.messages.push(aiMsg);

    await this.persistSessionAndMessages(session, [visitorMsg, aiMsg]);
    void this.forwardToAdminChannels(session, visitorMsg, aiMsg, aiAnalysis.shouldNotifyAdmin);
    return { sessionId, visitorMsg, aiMsg };
  }

  public static async handleAdminReply(sessionId: string, replyText: string, adminName = 'Cristian Jiménez'): Promise<OmnichannelMessage | null> {
    const cleanId = sessionId.replace(/^#/, '').trim();
    const cleanReply = replyText.trim();
    if (!cleanReply) return null;

    const session = await this.getOrHydrateSession(cleanId, 'web', 'Visitante');
    const msg: OmnichannelMessage = {
      id: `msg_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      sessionId: cleanId,
      platform: session.platform,
      sender: 'admin',
      senderName: adminName,
      text: cleanReply,
      createdAt: new Date().toISOString(),
    };

    session.updatedAt = Date.now();
    session.messages.push(msg);
    if (session.platform === 'telegram' && session.externalChatId) {
      void this.sendTelegramMessage(session.externalChatId, `💬 *${adminName}:*\n${cleanReply}`);
    } else if (session.visitorEmail) {
      void MailerService.sendEmail({
        to: session.visitorEmail,
        from: 'Cristian Jiménez Martínez <soporte@cristianjm.com>',
        subject: 'Respuesta directa a tu consulta en el chat — Bentian ERP Bridge',
        html: `<p>Hola <strong>${session.visitorName}</strong>,</p><p>${cleanReply.replace(/\n/g, '<br/>')}</p><p>Un saludo,<br/><strong>Cristian Jiménez Martínez</strong> (+34 617 205 053)</p>`,
        text: `Hola ${session.visitorName},\n\n${cleanReply}\n\nUn saludo,\nCristian Jiménez Martínez (+34 617 205 053)`,
      });
    }

    await this.persistSessionAndMessages(session, [msg]);
    logger.info(`✓ Respuesta de administrador entregada a la sesión ${cleanId}`);
    return msg;
  }

  public static getSessionMessages(sessionId: string): OmnichannelMessage[] {
    return this.sessions.get(sessionId.trim())?.messages || [];
  }

  private static async getOrHydrateSession(sessionId: string, defaultPlatform: ChatPlatform, defaultVisitorName: string): Promise<SessionMeta> {
    const existing = this.sessions.get(sessionId);
    if (existing) return existing;
    if (this.sessions.size >= this.MAX_SESSIONS) {
      const oldestKey = this.sessions.keys().next().value;
      if (oldestKey) this.sessions.delete(oldestKey);
    }

    const session: SessionMeta = { sessionId, platform: defaultPlatform, visitorName: defaultVisitorName, updatedAt: Date.now(), messages: [] };
    const db = DatabaseService.getInstance();
    if (db.isAvailable()) {
      try {
        const sRes = await db.query(`SELECT * FROM omnichannel_sessions WHERE session_id = $1 LIMIT 1`, [sessionId]);
        if (sRes.rows[0]) {
          const r = sRes.rows[0];
          session.visitorName = r.visitor_name || session.visitorName;
          session.visitorEmail = r.visitor_email || undefined;
          session.visitorPhone = r.visitor_phone || undefined;
          session.detectedErp = r.detected_erp || undefined;
          session.detectedStore = r.detected_store || undefined;
        }
        const mRes = await db.query(`SELECT id, session_id, platform, sender, sender_name, message, created_at FROM omnichannel_messages WHERE session_id = $1 ORDER BY created_at ASC LIMIT 40`, [sessionId]);
        session.messages = mRes.rows.map((r: any) => ({ id: r.id, sessionId: r.session_id, platform: r.platform as ChatPlatform, sender: r.sender, senderName: r.sender_name, text: r.message, createdAt: new Date(r.created_at).toISOString() }));
      } catch {}
    }
    this.sessions.set(sessionId, session);
    return session;
  }

  private static async forwardToAdminChannels(session: SessionMeta, visitorMsg: OmnichannelMessage, aiMsg: OmnichannelMessage, notifyEmail: boolean): Promise<void> {
    const tag = `[#${session.sessionId}] [${session.platform.toUpperCase()}]`;
    const metaParts = [session.visitorEmail, session.visitorPhone, session.detectedErp, session.detectedStore].filter(Boolean).join(' | ');
    const summary = `${tag} 👤 *${session.visitorName}*${metaParts ? ` (${metaParts})` : ''}:\n${visitorMsg.text}\n\n🤖 *Auto-Respuesta:*\n${aiMsg.text}\n\n↩️ _Responde a este mensaje o usa: /reply ${session.sessionId} tu respuesta_`;

    const adminTelegramId = process.env['TELEGRAM_ADMIN_CHAT_ID'] || process.env['TELEGRAM_CHAT_ID'];
    if (adminTelegramId) await this.sendTelegramMessage(adminTelegramId, summary);

    const webhookUrl = process.env['OMNICHANNEL_WEBHOOK_URL'];
    if (webhookUrl) {
      await this.postJson(webhookUrl, { username: 'Bentian Omnichannel Hub', content: summary.replace(/\*/g, '**'), sessionId: session.sessionId, platform: session.platform, visitorName: session.visitorName, visitorEmail: session.visitorEmail, detectedErp: session.detectedErp, message: visitorMsg.text, aiReply: aiMsg.text });
    }

    if (notifyEmail) {
      try {
        await MailerService.sendEmail({
          to: 'cristianjimeneztrabajo@gmail.com',
          from: 'Bentian Omnichannel Chat <soporte@cristianjm.com>',
          replyTo: session.visitorEmail || undefined,
          subject: `[Chat ${session.platform.toUpperCase()}] ${session.visitorName} ${metaParts ? `(${metaParts})` : ''}`,
          html: `<div style="font-family:sans-serif;padding:20px;background:#09090b;color:#f4f4f5;border-radius:12px;"><h3 style="margin-top:0;color:#34d399;">Chat Omnicanal (${session.platform.toUpperCase()})</h3><p><strong>Sesión:</strong> <code>${session.sessionId}</code> | <strong>Ficha:</strong> ${session.visitorName} ${metaParts ? `(${metaParts})` : ''}</p><blockquote style="background:#18181b;padding:12px;border-left:3px solid #6366f1;">${visitorMsg.text}</blockquote><div style="background:#18181b;padding:12px;border-radius:8px;white-space:pre-wrap;">${aiMsg.text}</div></div>`,
          text: summary,
        });
      } catch (err: any) {
        logger.warn(`Aviso: No se pudo notificar chat por email: ${err.message}`);
      }
    }
  }

  public static sendTelegramMessage(chatId: string, text: string): Promise<void> {
    const token = process.env['TELEGRAM_BOT_TOKEN'];
    if (!token || !chatId) return Promise.resolve();
    return this.postJson(`https://api.telegram.org/bot${token}/sendMessage`, { chat_id: chatId, text });
  }

  private static postJson(urlStr: string, payload: Record<string, unknown>): Promise<void> {
    return new Promise((resolve) => {
      try {
        const parsed = new URL(urlStr);
        const body = JSON.stringify(payload);
        const req = https.request({ hostname: parsed.hostname, port: parsed.port || 443, path: parsed.pathname + parsed.search, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }, timeout: 5000 }, (res) => { res.resume(); resolve(); });
        req.on('error', () => resolve());
        req.on('timeout', () => { req.destroy(); resolve(); });
        req.write(body);
        req.end();
      } catch { resolve(); }
    });
  }

  private static async persistSessionAndMessages(session: SessionMeta, newMsgs: OmnichannelMessage[]): Promise<void> {
    const db = DatabaseService.getInstance();
    if (!db.isAvailable()) return;
    try {
      await db.query(`CREATE TABLE IF NOT EXISTS omnichannel_sessions (session_id VARCHAR(64) PRIMARY KEY, platform VARCHAR(32) NOT NULL, visitor_name VARCHAR(128), visitor_email VARCHAR(255), visitor_phone VARCHAR(64), detected_erp VARCHAR(64), detected_store VARCHAR(64), updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW())`);
      await db.query(`CREATE TABLE IF NOT EXISTS omnichannel_messages (id VARCHAR(64) PRIMARY KEY, session_id VARCHAR(64) NOT NULL, platform VARCHAR(32) NOT NULL, sender VARCHAR(16) NOT NULL, sender_name VARCHAR(128), message TEXT NOT NULL, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW())`);
      await db.query(`INSERT INTO omnichannel_sessions (session_id, platform, visitor_name, visitor_email, visitor_phone, detected_erp, detected_store, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) ON CONFLICT (session_id) DO UPDATE SET visitor_name = EXCLUDED.visitor_name, visitor_email = COALESCE(EXCLUDED.visitor_email, omnichannel_sessions.visitor_email), visitor_phone = COALESCE(EXCLUDED.visitor_phone, omnichannel_sessions.visitor_phone), detected_erp = COALESCE(EXCLUDED.detected_erp, omnichannel_sessions.detected_erp), detected_store = COALESCE(EXCLUDED.detected_store, omnichannel_sessions.detected_store), updated_at = NOW()`, [session.sessionId, session.platform, session.visitorName, session.visitorEmail || null, session.visitorPhone || null, session.detectedErp || null, session.detectedStore || null]);
      for (const msg of newMsgs) {
        await db.query(`INSERT INTO omnichannel_messages (id, session_id, platform, sender, sender_name, message, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())`, [msg.id, msg.sessionId, msg.platform, msg.sender, msg.senderName, msg.text]);
      }
    } catch {}
  }
}
