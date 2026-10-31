# Bentian AI Commerce Assistant: Especificación Modular
## Sección 2: Onboarding BYOK y Gestión Criptográfica de Credenciales

### 2.1. El Principio de Cero Fricción: Lenguaje Humano para Clientes No Técnicos

> **REGLA DE ORO DE EXPERIENCIA DE USUARIO (UX):**
> La inmensa mayoría de dueños de comercios, fontanerías o ferreterías en España no son informáticos. Si la interfaz les muestra términos como *"API Key"*, *"Tokens"*, *"JSON"*, *"LLMs"* o *"RAG"*, se asustan y abandonan el proceso.
> **Queda terminantemente prohibido utilizar jerga de desarrollo en las pantallas dirigidas al usuario final.**

---

### 2.2. El Flujo de los 2 Clics en la Pantalla (`:39281/ai-setup`)

El 99% de las empresas tienen su navegador (Edge o Chrome) con su cuenta normal de Google (Gmail o Google Workspace) ya abierta. En la interfaz local de Bentian, el usuario se encuentra con una pantalla extremadamente visual y limpia:

```
┌────────────────────────────────────────────────────────────────────────┐
│  🤖 ASISTENTE INTELIGENTE PARA TU TIENDA Y CLIENTES                   │
│                                                                        │
│  Atiende a tus compradores en la web las 24 horas y comprueba stock    │
│  en tiempo real sin coste mensual.                                     │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Paso 1:                                                         │  │
│  │  [ 🌐 Conectar con mi cuenta de Google (Gratis para siempre) ]   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Paso 2:                                                         │  │
│  │  [ 📋 Pegar Código de Activación ]                               │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ¿Prefieres que te lo dejemos configurado?                             │
│  [ 💬 Avisar por WhatsApp a Cristian para ayuda remota en 1 minuto ]   │
└────────────────────────────────────────────────────────────────────────┘
```

#### Paso a Paso Real del Usuario:
1. **Clic 1 (Botón Azul):** El usuario pulsa *«Conectar con mi cuenta de Google»*.
   - Bentian abre una ventana en Edge con la URL directa de Google AI Studio.
   - En la ventana de Google solo aparece un botón azul: `Obtener clave gratuita` ➔ `Copiar`. El usuario pulsa **Copiar**.
2. **Clic 2 (Botón Verde):** El usuario regresa a la ventana de Bentian y pulsa *«Pegar Código de Activación»*.
   - El sistema lee automáticamente el portapapeles (`navigator.clipboard.readText()`).
   - Comprueba de forma transparente que el formato sea válido (ej: prefijo `AIzaSy...`).
   - Muestra de inmediato: **`✅ ¡Tu Asistente de Tienda ya está Activo y Conectado a Factusol!`**.

Tiempo total para un usuario no técnico: **menos de 30 segundos**.

---

### 2.3. Las 2 Redes de Seguridad para Casos Difíciles

1. **Canal Partner (Agencias Web e Informáticos de Mantenimiento):**
   - En más del 80% de los proyectos de Kit Digital o ecommerce, Bentian lo instala la agencia o el informático de la empresa.
   - Como el partner se lleva el **100% de la puesta en marcha (300 € – 600 €)** y el **30% recurrente**, la agencia realiza estos 2 clics en medio minuto durante la instalación y entrega el servicio funcionando sin que el comerciante toque nada.
2. **Soporte Remoto en 1 Clic (WhatsApp / AnyDesk):**
   - Si un usuario solitario tiene cualquier duda, el enlace directo a WhatsApp abre conversación con el móvil de Cristian (+34 617 205 053).
   - Por AnyDesk se le conecta la clave en 60 segundos y queda operativa para siempre.

---

### 2.4. Almacenamiento Seguro en AppData (Regla 1 de Bentian)

Las credenciales **jamás se guardan en el directorio del programa** (`C:\Program Files\Bentian Agent\`). Se almacenan en:
`%APPDATA%\Bentian Agent\agent-config.json`

```json
{
  "aiAssistant": {
    "enabled": true,
    "provider": "google_ai_studio",
    "model": "gemini-2.0-flash",
    "encryptedApiKey": "AQAAANCMnd8BFdERjHoAwE/Cl+sBAAAA...",
    "maxRpmLimit": 15,
    "maxRpdLimit": 1500,
    "localFallbackEnabled": true,
    "updatedAt": "2026-10-31T12:00:00.000Z"
  }
}
```

* **Cifrado Windows DPAPI:** En sistemas Windows, la clave se cifra mediante `CryptProtectData` vinculada al usuario de la máquina.
* **Escritura Atómica:** Toda actualización de configuración se realiza escribiendo primero en `.tmp` y ejecutando `fs.renameSync` con copia defensiva `.bak`.

---

### 2.3. Cascada Multi-Proveedor de Conmutación por Error (Auto-Failover)

Si una tienda online sufre un aluvión puntual de visitas y agota las 1.500 consultas de Google AI Studio (`429 Too Many Requests`), el conector aplica un failover automático en memoria:

```
[ Google AI Studio (1.500 RPD) ]
               │
               ▼ (Si devuelve error 429)
[ Groq Cloud Llama 3.1 (14.400 RPD) ]
               │
               ▼ (Si se agota cuota o cae internet)
[ Motor Local Ollama (Phi-3.5 en CPU / Qwen en GPU) ]
```

El usuario final de la tienda jamás percibe una interrupción del servicio y el coste para el comercio se mantiene en **0,00 €**.
