import { Router, Request, Response, NextFunction } from 'express';
import { rateLimit } from '../middleware/rate-limit';
import { OmnichannelBridgeService, ChatPlatform } from '../services/omnichannel-bridge.service';

export const omnichannelRouter = Router();

const VALID_PLATFORMS = new Set<ChatPlatform>([
  'web',
  'telegram',
  'whatsapp',
  'discord',
  'matterbridge',
  'matrix',
]);

omnichannelRouter.post(
  '/chat/message',
  rateLimit({
    name: 'omnichannel-chat-msg',
    windowMs: 5 * 60 * 1000,
    max: 35,
    message: 'Has enviado muchos mensajes seguidos. Espera unos segundos.',
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId, message, visitorName, visitorEmail, platform } = req.body as {
        sessionId?: string;
        message?: string;
        visitorName?: string;
        visitorEmail?: string;
        platform?: string;
      };

      if (!message || typeof message !== 'string' || message.trim().length < 1) {
        return res.status(400).json({ error: { message: 'El mensaje no puede estar vacío.' } });
      }

      const safePlatform: ChatPlatform =
        platform && VALID_PLATFORMS.has(platform as ChatPlatform) ? (platform as ChatPlatform) : 'web';

      const result = await OmnichannelBridgeService.handleIncomingMessage({
        sessionId,
        platform: safePlatform,
        text: message,
        visitorName,
        visitorEmail,
      });

      return res.status(200).json({
        success: true,
        sessionId: result.sessionId,
        reply: result.aiMsg.text,
        messages: OmnichannelBridgeService.getSessionMessages(result.sessionId),
      });
    } catch (err) {
      return next(err);
    }
  }
);

omnichannelRouter.get(
  '/chat/history/:sessionId',
  rateLimit({
    name: 'omnichannel-chat-history',
    windowMs: 60 * 1000,
    max: 60,
    message: 'Demasiadas consultas de historial.',
  }),
  (req: Request, res: Response) => {
    const sessionId = String(req.params['sessionId'] || '').trim();
    if (!sessionId) {
      return res.status(400).json({ error: { message: 'SessionId requerido.' } });
    }
    const messages = OmnichannelBridgeService.getSessionMessages(sessionId);
    return res.status(200).json({
      success: true,
      sessionId,
      messages,
    });
  }
);

/**
 * Webhook nativo para Telegram Bot (@BotFather):
 * - Si escribe el administrador (haciendo Reply a [#sess_xxxx] o "/reply sess_xxxx texto"), encamina la respuesta al visitante web/WhatsApp.
 * - Si escribe un cliente externo al bot de Telegram, le responde de forma autónoma y notifica a Cristian.
 */
omnichannelRouter.post('/chat/webhook/telegram', async (req: Request, res: Response) => {
  try {
    const msg = req.body?.message;
    if (!msg || typeof msg.text !== 'string') {
      return res.status(200).json({ ok: true });
    }

    const chatId = String(msg.chat?.id || '');
    const text = msg.text.trim();
    const adminChatId = process.env['TELEGRAM_ADMIN_CHAT_ID'] || process.env['TELEGRAM_CHAT_ID'] || '';

    if (adminChatId && chatId === String(adminChatId)) {
      const replyToText = String(msg.reply_to_message?.text || '');
      const tagMatch = replyToText.match(/\[#(sess_[a-zA-Z0-9_-]+)\]/);
      const cmdMatch = text.match(/^\/reply\s+(#?sess_[a-zA-Z0-9_-]+)\s+([\s\S]+)$/i);

      if (cmdMatch && cmdMatch[1] && cmdMatch[2]) {
        await OmnichannelBridgeService.handleAdminReply(cmdMatch[1], cmdMatch[2]);
        await OmnichannelBridgeService.sendTelegramMessage(chatId, `✓ Respuesta enviada a ${cmdMatch[1]}`);
        return res.status(200).json({ ok: true });
      }
      if (tagMatch && tagMatch[1]) {
        await OmnichannelBridgeService.handleAdminReply(tagMatch[1], text);
        await OmnichannelBridgeService.sendTelegramMessage(chatId, `✓ Respuesta entregada en vivo a #${tagMatch[1]}`);
        return res.status(200).json({ ok: true });
      }
    }

    const visitorName = [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(' ') || msg.from?.username || 'Usuario Telegram';
    const result = await OmnichannelBridgeService.handleIncomingMessage({
      sessionId: `sess_tg_${chatId}`,
      platform: 'telegram',
      text,
      visitorName,
      externalChatId: chatId,
    });

    await OmnichannelBridgeService.sendTelegramMessage(chatId, result.aiMsg.text);
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(200).json({ ok: true });
  }
});

/**
 * Webhook Universal para conectar Matterbridge, Chatwoot, Matrix, WhatsApp (Evolution API) o Discord.
 */
omnichannelRouter.post('/chat/webhook/bridge', async (req: Request, res: Response) => {
  try {
    const expectedSecret = process.env['OMNICHANNEL_BRIDGE_SECRET'];
    if (expectedSecret) {
      const provided = req.headers['x-bridge-secret'] || req.query['secret'];
      if (provided !== expectedSecret) {
        return res.status(401).json({ error: { message: 'Bridge secret inválido.' } });
      }
    }

    const { text, username, userid, gateway, protocol, sessionId, senderType } = req.body as Record<string, string>;
    if (!text || typeof text !== 'string') {
      return res.status(200).json({ ok: true });
    }

    if (senderType === 'admin' && sessionId) {
      await OmnichannelBridgeService.handleAdminReply(sessionId, text, username || 'Cristian Jiménez');
      return res.status(200).json({ ok: true, routed: 'admin_reply' });
    }

    const rawProto = String(protocol || gateway || 'matterbridge').toLowerCase();
    const platform: ChatPlatform = VALID_PLATFORMS.has(rawProto as ChatPlatform)
      ? (rawProto as ChatPlatform)
      : 'matterbridge';

    const result = await OmnichannelBridgeService.handleIncomingMessage({
      sessionId: sessionId || `sess_${platform}_${(userid || username || 'anon').replace(/[^a-zA-Z0-9]/g, '')}`,
      platform,
      text,
      visitorName: username || 'Usuario Externo',
    });

    return res.status(200).json({
      ok: true,
      sessionId: result.sessionId,
      reply: result.aiMsg.text,
    });
  } catch {
    return res.status(200).json({ ok: true });
  }
});
