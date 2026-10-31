# Bentian AI Commerce Assistant: Especificación Modular
## Sección 8: Hoja de Ruta de Implementación y Contratos TypeScript

### 8.1. Fases de Desarrollo Planificadas

```
FASE 1: Motor Core Local & BYOK Cloud
├─ Creado el servicio apps/agent/src/ai/ai-orchestrator.service.ts
├─ Integración de Transformers.js (ONNX) con Xenova/paraphrase-multilingual-MiniLM-L12-v2
├─ Almacén vectorial atómico en %APPDATA%\Bentian Agent\vectors\
├─ Conector BYOK para Google AI Studio (Gemini 2.0 Flash) y Groq Cloud (Llama 3.1)
└─ Implementación de las 4 herramientas canónicas de Function Calling

FASE 2: Seguridad & Widget Web E-Commerce
├─ Filtro de purga SafePublicCatalogItem (blindaje anti-costes)
├─ Protocolo de Doble Factor para consulta de pedidos (Nº Pedido + Email)
├─ Endpoint local /api/local/ai/chat en mini-router (:39281)
└─ Widget Web embeddable en JS puro (<25 KB) para WooCommerce, PrestaShop y Shopify

FASE 3: Paquete Soberano 100% Offline (Ollama Windows Pack)
├─ Detección automática del servicio Ollama en localhost:11434
├─ Selector inteligente de modelo según hardware (Phi-3.5 Mini en CPU / Qwen 2.5 7B en GPU)
├─ Modo Contingencia Air-Gapped sin conexión a internet
└─ Verificación de Quality Gate (Gate 1 a Gate 10)
```

---

### 8.2. Mantenimiento Estricto de Módulos Sellados (Gate 7)

De acuerdo con la **Regla 9 de Bentian**, los 13 módulos marcados como `status: "FROZEN"` (como `connectors.factusol`, `agent.erp`, `agent.config.persistence`, etc.) **no serán modificados bajo ningún concepto**.
* El módulo de IA residirá exclusivamente en una carpeta nueva: `apps/agent/src/ai/`.
* Consumirá los datos de los ERPs a través de la interfaz pública inalterada [`IErpConnector`](../../apps/agent/src/erp/erp-connector.interface.ts), asegurando que los hashes SHA-256 de los 13 módulos sellados permanezcan 100% íntegros.

---

### 8.3. Contratos de Datos Canónicos Previstos

```typescript
export interface AiAssistantConfig {
  enabled: boolean;
  provider: 'google_ai_studio' | 'groq' | 'ollama_local';
  model: string;
  encryptedApiKey?: string;
  maxRpm: number;
  maxRpd: number;
  localOllamaUrl?: string; // Por defecto: http://127.0.0.1:11434
  vectorIndexScheduleMinutes: number; // Por defecto: 120 (cada 2 horas)
}

export interface AiChatMessageRequest {
  sessionId: string;
  message: string;
  storeContext?: {
    channel: 'woocommerce' | 'prestashop' | 'shopify' | 'counter';
    tariffCode?: string;
    warehouseCode?: string;
  };
}

export interface AiChatMessageResponse {
  reply: string;
  toolCallsExecuted?: Array<{ name: string; params: any }>;
  productCards?: Array<{
    sku: string;
    name: string;
    priceWithVat: number;
    inStock: boolean;
    imageUrl?: string;
  }>;
  orderInfo?: {
    orderNumber: string;
    statusText: string;
    trackingUrl?: string;
  };
}
```
