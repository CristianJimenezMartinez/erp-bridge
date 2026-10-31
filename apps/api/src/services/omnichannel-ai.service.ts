import { Logger } from '@erp-bridge/shared';
import {
  BENTIAN_MASTER_SYSTEM_PROMPT,
  SessionMemoryContext,
  composeExpertEngineeringReply,
  extractEntitiesFromText,
} from './omnichannel-knowledge';

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiReplyResult {
  reply: string;
  intent: 'pricing' | 'partner' | 'erp_compat' | 'trial_beta' | 'security' | 'human_handoff' | 'general';
  detectedEmail?: string;
  detectedPhone?: string;
  detectedErp?: string;
  detectedStore?: string;
  shouldNotifyAdmin: boolean;
}

const logger = new Logger('OmnichannelAiService');

export class OmnichannelAiService {
  private static readonly EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  private static readonly PHONE_REGEX = /(?:\+34|0034)?[\s.-]*[6789](?:[\s.-]*\d){8}/;

  public static async generateAutonomousReply(
    userMessage: string,
    channel: string,
    visitorName?: string,
    history: ChatTurn[] = [],
    prevMemory?: Partial<SessionMemoryContext>
  ): Promise<AiReplyResult> {
    const cleanMsg = userMessage.trim();
    const lower = cleanMsg.toLowerCase();
    const emailMatch = cleanMsg.match(this.EMAIL_REGEX);
    const phoneMatch = cleanMsg.match(this.PHONE_REGEX);
    const detectedEmail = emailMatch ? emailMatch[0].toLowerCase() : prevMemory?.visitorEmail;
    const detectedPhone = phoneMatch ? phoneMatch[0].trim() : prevMemory?.visitorPhone;

    const entities = extractEntitiesFromText(cleanMsg, {
      detectedErp: prevMemory?.detectedErp,
      detectedStore: prevMemory?.detectedStore,
    });
    const turnCount = Math.floor(history.length / 2) + 1;

    const memory: SessionMemoryContext = {
      turnCount,
      detectedErp: entities.detectedErp,
      detectedStore: entities.detectedStore,
      visitorName,
      visitorEmail: detectedEmail,
      visitorPhone: detectedPhone,
    };

    const intent = this.classifyIntent(lower, Boolean(emailMatch || phoneMatch));
    const shouldNotifyAdmin =
      Boolean(emailMatch || phoneMatch) ||
      intent === 'human_handoff' ||
      intent === 'partner' ||
      intent === 'trial_beta';

    const expertComposedReply = composeExpertEngineeringReply({
      userMessage: cleanMsg,
      visitorName,
      detectedEmail: emailMatch ? detectedEmail : undefined,
      detectedPhone: phoneMatch ? detectedPhone : undefined,
      memory,
    });

    // En preguntas de seguimiento (turno >= 2) o cuando hay API Key configurada, usamos el LLM con toda la memoria de la sesión:
    const isOpenFollowUp =
      turnCount >= 2 &&
      !emailMatch &&
      !phoneMatch &&
      !lower.includes('corta') &&
      !lower.includes('internet') &&
      !lower.includes('instal');

    if (process.env['OMNICHANNEL_AI_API_KEY'] || intent === 'general' || isOpenFollowUp) {
      const llmReply = await this.callLlmWithPlaybook(
        cleanMsg,
        channel,
        visitorName,
        history,
        memory,
        expertComposedReply
      );
      if (llmReply) {
        return {
          reply: llmReply,
          intent,
          detectedEmail,
          detectedPhone,
          detectedErp: entities.detectedErp,
          detectedStore: entities.detectedStore,
          shouldNotifyAdmin,
        };
      }
    }

    return {
      reply: expertComposedReply,
      intent,
      detectedEmail,
      detectedPhone,
      detectedErp: entities.detectedErp,
      detectedStore: entities.detectedStore,
      shouldNotifyAdmin,
    };
  }

  private static classifyIntent(
    lower: string,
    hasNewContactInfo: boolean
  ): AiReplyResult['intent'] {
    if (hasNewContactInfo && (lower.includes('beta') || lower.includes('prueba') || lower.includes('clave') || lower.includes('licencia'))) {
      return 'trial_beta';
    }
    if (lower.includes('humano') || lower.includes('cristian') || lower.includes('llamar') || lower.includes('llamada') || lower.includes('teléfono') || lower.includes('telefono') || lower.includes('urgente')) {
      return 'human_handoff';
    }
    if (lower.includes('partner') || lower.includes('agencia') || lower.includes('comisión') || lower.includes('comision') || lower.includes('distribuidor') || lower.includes('mantenimiento') || lower.includes('ganamos')) {
      return 'partner';
    }
    if (lower.includes('precio') || lower.includes('cuánto') || lower.includes('cuanto') || lower.includes('cuesta') || lower.includes('coste') || lower.includes('tarifa') || lower.includes('plan') || lower.includes('249')) {
      return 'pricing';
    }
    if (lower.includes('beta') || lower.includes('probar') || lower.includes('prueba') || lower.includes('gratis') || lower.includes('descarga') || lower.includes('instalador')) {
      return 'trial_beta';
    }
    if (lower.includes('puerto') || lower.includes('firewall') || lower.includes('seguridad') || lower.includes('ldb') || lower.includes('laccdb') || lower.includes('bloqueo') || lower.includes('3045')) {
      return 'security';
    }
    if (
      lower.includes('factusol') ||
      lower.includes('simplygest') ||
      lower.includes('sage') ||
      lower.includes('a3erp') ||
      lower.includes('agora') ||
      lower.includes('ágora') ||
      lower.includes('holded') ||
      lower.includes('icg') ||
      lower.includes('frontretail') ||
      lower.includes('visionwin') ||
      lower.includes('aplifisa') ||
      lower.includes('odoo') ||
      lower.includes('facturascripts') ||
      lower.includes('business central') ||
      lower.includes('navision') ||
      lower.includes('classicges') ||
      lower.includes('erp') ||
      lower.includes('tpv') ||
      lower.includes('woocommerce') ||
      lower.includes('prestashop') ||
      lower.includes('shopify') ||
      lower.includes('programa') ||
      lower.includes('conector')
    ) {
      return 'erp_compat';
    }
    return 'general';
  }

  private static async callLlmWithPlaybook(
    userMessage: string,
    channel: string,
    visitorName: string | undefined,
    history: ChatTurn[],
    memory: SessionMemoryContext,
    referencePlaybook: string
  ): Promise<string | null> {
    if (process.env['OMNICHANNEL_DISABLE_EXTERNAL_LLM'] === 'true') {
      return null;
    }

    const memorySummary = [
      `[MEMORIA DE SESIÓN ACTIVA — Turno #${memory.turnCount}]`,
      `ERP detectado del cliente: ${memory.detectedErp || 'No especificado aún'}`,
      `Tienda online detectada: ${memory.detectedStore || 'No especificada aún'}`,
      `Contacto guardado: ${[memory.visitorEmail, memory.visitorPhone].filter(Boolean).join(' / ') || 'Pendiente'}`,
    ].join(' | ');

    const recentTurns = history.slice(-8);
    const messages = [
      {
        role: 'system',
        content: `${BENTIAN_MASTER_SYSTEM_PROMPT}\n\n${memorySummary}\n\nDatos verificados de referencia:\n${referencePlaybook}`,
      },
      ...recentTurns,
      {
        role: 'user',
        content: `[Canal: ${channel}${visitorName ? ` | Interlocutor: ${visitorName}` : ''}] ${userMessage}`,
      },
    ];

    const customApiKey = process.env['OMNICHANNEL_AI_API_KEY'];
    const apiUrl = customApiKey
      ? process.env['OMNICHANNEL_AI_API_URL'] || 'https://api.groq.com/openai/v1/chat/completions'
      : process.env['OMNICHANNEL_FREE_LLM_URL'] || 'https://text.pollinations.ai/openai';
    const model = customApiKey
      ? process.env['OMNICHANNEL_AI_MODEL'] || 'llama-3.3-70b-versatile'
      : process.env['OMNICHANNEL_FREE_LLM_MODEL'] || 'openai';

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 16000);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (customApiKey) headers['Authorization'] = `Bearer ${customApiKey}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ model, messages }),
        signal: controller.signal,
      });

      if (!response.ok) return null;
      const json = (await response.json()) as any;
      const content = json?.choices?.[0]?.message?.content;
      if (typeof content === 'string' && content.trim().length > 40) {
        return content
          .trim()
          .replace(/SQLite/gi, 'JSON atómico en AppData');
      }
      return null;
    } catch (err: any) {
      logger.warn(`Usando compositor experto directo (${err?.message || 'timeout'})`);
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
}
