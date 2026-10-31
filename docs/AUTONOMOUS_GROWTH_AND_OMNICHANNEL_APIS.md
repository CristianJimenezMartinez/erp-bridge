# Guía Operativa: Publicidad Autónoma, Redes Sociales y Puente de Chats Omnicanal (`Coste 0 €`)

Este documento deja registrada la configuración paso a paso para conectar las **APIs oficiales gratuitas** tanto al **Puente de Chats Omnicanal (`OmnichannelBridgeService`)** como al **Publicador Autónomo de Redes Sociales (`autonomous-social-publisher.js`)**.

> **Nota importante:** El Chat Web con IA Multi-ERP (`omnichannel-widget.js`), la memoria persistente en PostgreSQL (`omnichannel_sessions` / `omnichannel_messages`), los feeds de sindicación (`/feed.xml` y `/feed.json`), `/llms.txt` y `IndexNow` **ya funcionan en producción sin configurar ninguna clave adicional**. Las variables siguientes en `/opt/bentian/erp-bridge/.env` (o `apps/api/.env`) son opcionales para ir conectando tu móvil y tus redes sociales cuando quieras.

---

## 1. Conectar tu Móvil por Telegram (Puente Bidireccional de Chats — Gratis)

Permite recibir en tu Telegram todos los mensajes que entren desde el **Chat de la Web**, **WhatsApp**, **Telegram** o **Discord**, y **responder directamente desde tu móvil** (haciendo *Reply* al mensaje) para que el visitante web vea tu respuesta en vivo en su pantalla.

1. En Telegram abre **`@BotFather`** y envía `/newbot`.
2. Ponle nombre (ej. `Bentian Omnichannel`) y usuario (ej. `BentianBridgeBot`). Copia el **HTTP API Token**.
3. Abre **`@userinfobot`** en Telegram para ver tu **`Id`** numérico personal.
4. Añade en `.env` del servidor (`apps/api/.env`):
   ```env
   TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
   TELEGRAM_ADMIN_CHAT_ID=TU_ID_NUMERICO
   ```
5. Registra el webhook ejecutando una sola vez en terminal (sustituyendo `<TU_TOKEN>`):
   ```powershell
   curl.exe -i -L "https://api.telegram.org/bot<TU_TOKEN>/setWebhook?url=https://bridge.cristianjm.com/api/v1/chat/webhook/telegram"
   ```
6. *(Opcional)* Si creas un **Canal Público de Telegram** para publicar novedades automáticas con el publicador social, añade el bot como administrador del canal y define:
   ```env
   TELEGRAM_CHANNEL_ID=@TuCanalDeBentian
   ```

---

## 2. Conectar Discord, Slack, Matterbridge, Matrix o WhatsApp (Evolution API / Chatwoot)

* **Recibir notificaciones de chats en un canal de Discord o Slack:**
  ```env
  OMNICHANNEL_WEBHOOK_URL=https://discord.com/api/webhooks/XXXX/YYYY
  SOCIAL_WEBHOOK_URL=https://discord.com/api/webhooks/XXXX/ZZZZ
  ```
* **Conectar plataformas externas entrantes (WhatsApp vía Evolution API, Matterbridge, Matrix o Chatwoot):**
  - Apunta su webhook saliente a: `POST https://bridge.cristianjm.com/api/v1/chat/webhook/bridge`
  - Protege el puente definiendo en `.env`:
    ```env
    OMNICHANNEL_BRIDGE_SECRET=una_clave_larga_aleatoria
    ```
    (Enviándola en la cabecera `x-bridge-secret` o `?secret=...`).

---

## 3. Conectar APIs Oficiales Gratuitas de Redes Sociales (`autonomous-social-publisher.js`)

El script `erp-bridge/scripts/autonomous-social-publisher.js` publica campañas técnicas B2B sin riesgo de bloqueo anti-bot (porque usa las APIs oficiales, nunca navegadores simulados sobre tu cuenta):

### A. Dev.to (100% Gratis — Artículos Técnicos `DA 85+` con Backlink Canónico a tu Web)
1. Crea cuenta en `https://dev.to` -> `Settings` -> `Extensions` -> **`DEV Community API Keys`**.
2. Genera una clave y guárdala en `.env`:
   ```env
   DEVTO_API_KEY=tu_api_key_de_devto
   ```

### B. LinkedIn API Oficial v2 (Gratis — Publicación B2B para Agencias e IT)
1. Entra en `https://www.linkedin.com/developers/apps` -> `Create app`.
2. En la pestaña `Products`, activa **`Share on LinkedIn`** y **`Sign In with LinkedIn using OpenID Connect`**.
3. En `Auth` -> `OAuth 2.0 tools`, genera un token con permiso `w_member_social` y consulta tu identificador (`sub`) en `https://api.linkedin.com/v2/userinfo`.
4. Añade en `.env`:
   ```env
   LINKEDIN_ACCESS_TOKEN=AQV...
   LINKEDIN_AUTHOR_URN=urn:li:person:TU_SUB_ID
   ```

### C. Bluesky (100% Gratis vía AT Protocol — Sin revisión de app)
1. En Bluesky ve a `Settings` -> `Privacy and security` -> **`App Passwords`** -> crea una contraseña de aplicación.
2. Añade en `.env`:
   ```env
   BLUESKY_HANDLE=tuusuario.bsky.social
   BLUESKY_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
   ```

### D. Mastodon / Fediverso Tech (100% Gratis)
1. En tu instancia (ej. `https://mastodon.social` o `https://fosstodon.org`) ve a `Preferencias` -> `Desarrollo` -> **`Nueva aplicación`** (permiso `write:statuses`).
2. Añade en `.env`:
   ```env
   MASTODON_INSTANCE_URL=https://mastodon.social
   MASTODON_ACCESS_TOKEN=tu_access_token
   ```

---

## 4. (Opcional) Acelerador LLM Gratuito con Clave Propia (Groq / Gemini)

El chat omnicanal ya funciona a `0 €` sin claves combinando el compositor experto Multi-ERP con el gateway gratuito integrado. Si algún día deseas respuestas abiertas en `< 0.3s` con `Llama-3.3-70B`:
1. Obtén una clave gratuita en `https://console.groq.com/keys` (14.400 peticiones/día gratis).
2. Añade en `.env`:
   ```env
   OMNICHANNEL_AI_API_KEY=gsk_...
   OMNICHANNEL_AI_API_URL=https://api.groq.com/openai/v1/chat/completions
   OMNICHANNEL_AI_MODEL=llama-3.3-70b-versatile
   ```

---

## 5. Comandos de Ejecución Autónoma

```powershell
# 1. Regenerar feeds RSS/JSON, notificar IndexNow (Bing/Yandex/ChatGPT Search) y actualizar cola de 20 leads B2B:
node scripts/autonomous-growth-engine.js --ping-indexnow

# 2. Preparar o publicar campañas técnicas en todas las redes sociales conectadas:
node scripts/autonomous-social-publisher.js --publish

# 3. Enviar propuesta + Clave Beta real en 1 clic a una agencia o partner del listado:
node scripts/send-postcall-beta.js "email@agencia.es" "Nombre" "Nombre Agencia"
```

---

## 6. Aplicar nuevas claves en Producción (Servidor Hetzner)

Cuando añadas cualquiera de las claves anteriores en `/opt/bentian/erp-bridge/.env` (o `apps/api/.env`) en el servidor de producción, recarga el contenedor para activarlas sin perder sesiones:

```bash
cd /opt/bentian/erp-bridge && docker compose -f docker-compose.prod.yml up -d --force-recreate api
```
