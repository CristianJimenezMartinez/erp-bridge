# Bentian AI Commerce Assistant: Especificación Modular
## Sección 2: Onboarding BYOK y Gestión Criptográfica de Credenciales

### 2.1. El Asistente Visual en 60 Segundos (GUI `:39281/ai-setup`)

Para eliminar cualquier fricción con el cliente final (el gerente de la pyme o el técnico de la tienda), el proceso de alta se realiza en 3 pasos simples dentro de la GUI local de Bentian:

1. **Paso 1: Selección de Proveedor Gratuito**
   - El usuario abre `http://127.0.0.1:39281/ai-setup` y pulsa *"Activar Asistente de IA (Coste Cero)"*.
   - Elige entre **Google Gemini** (Recomendado) o **Groq Cloud**.
2. **Paso 2: Generación de Clave sin Tarjeta**
   - El sistema abre directamente en el navegador la página oficial de generación de clave (`aistudio.google.com/app/apikey` o `console.groq.com/keys`).
   - El usuario pulsa *"Create API Key"* con su cuenta de Google habitual. No se solicita ningún dato de pago.
3. **Paso 3: Validación y Guardado Atómico**
   - El usuario pega la clave en el formulario.
   - El agente ejecuta un test sintético inmediato (`temperature: 0`). Si el test devuelve `200 OK`, activa el módulo.

---

### 2.2. Almacenamiento Seguro en AppData (Regla 1 de Bentian)

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
