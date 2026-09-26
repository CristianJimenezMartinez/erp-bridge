# Manual de Hardening DNS & Entregabilidad de Correo Electrónico
## Bentian ERP Bridge & Suministros Rubio

> **Documento Técnico de Producción**  
> **Área:** Infraestructura DNS, Seguridad de Comunicaciones & Anti-SPAM  
> **Versión:** 1.0.0 — Revisión de Hardening Criptográfico  
> **Fecha:** Septiembre 2026  
> **Dominios Oficiales:** `bentian.es` | `suministrosrubio.com` | `cristianjm.com`

---

## 1. Resumen Ejecutivo y Diagnóstico de Entregabilidad

En sistemas de distribución de software y comercio electrónico B2B/B2C, la entregabilidad de los correos transaccionales es un factor crítico de negocio. Los correos que contienen **claves de activación de licencia (`EB-XXXXX-XXXXX-XXXXX-XXXXX`)**, **confirmaciones de compra de Stripe**, **recibos de facturación** y **alertas de desconexión de agentes locales** sufren un escrutinio extremo por parte de los filtros antispam modernos (Google Workspace/Gmail, Microsoft 365/Outlook, Yahoo Mail, Proofpoint, Barracuda, Mimecast).

A partir de 2024–2026, los principales proveedores de correo imponen de forma obligatoria la tríada criptográfica **SPF + DKIM + DMARC** con alineación estricta para cualquier dominio que envíe comunicaciones comerciales o transaccionales. Un dominio sin DMARC con política coercitiva (`p=quarantine` o `p=reject`) o con desalineación de cabeceras es degradado inmediatamente a la bandeja de Correo no deseado (SPAM) o descartado silenciosamente en el protocolo SMTP.

Este documento establece la arquitectura definitiva, los registros DNS exactos y las directivas de cabeceras necesarias para blindar la reputación de los dominios del ecosistema.

---

## 2. Registro SPF (Sender Policy Framework - RFC 7208)

### 2.1 Principios de Evaluación y Límite de Búsquedas (10-Lookup Limit)
SPF valida que el servidor emisor (la dirección IP que abre el socket TCP contra el puerto 25 del receptor) esté explícitamente autorizado por el propietario del dominio en la cabecera `Return-Path` / `Envelope-From` (RFC 5321).

> [!WARNING] **Límite Estricto de 10 DNS Lookups (RFC 7208 §4.6.4):**  
> Durante la evaluación de un registro SPF, las directivas `include`, `a`, `mx`, `ptr`, `exists` y `redirect` consumen **1 búsqueda DNS recursiva cada una**. Si el recuento total supera 10 consultas, el servidor receptor declara inmediatamente un fallo permanente **`PermError`** y clasifica el mensaje como SPAM o lo rechaza directamente.
> 
> * **Mecanismos que NO consumen lookups:** `ip4`, `ip6`, `all`.
> * **Regla de oro:** Consolidar IPs estáticas mediante bloques CIDR `ip4:` y minimizar directivas `include:` redundantes.

### 2.2 Registro SPF Exacto y Auditoría de Lookups para `bentian.es`
El dominio `bentian.es` emite correos transaccionales desde el clúster central de Bentian ERP Bridge, el servidor de correo propio en Plesk, y pasarelas transaccionales autorizadas (Resend como proveedor primario de alta reputación y Brevo/Sendinblue como fallback):

```dns
bentian.es. IN TXT "v=spf1 ip4:82.223.109.124 include:resend.com include:spf.sendinblue.com include:_spf.google.com ~all"
```

#### Auditoría y Desglose de Consultas DNS (Consumo: 4/10 Lookups):
| Directiva | Tipo | Lookups DNS Consumidos | Finalidad Técnica y Auditoría |
| :--- | :--- | :---: | :--- |
| `v=spf1` | Prefijo | 0 | Identificador de protocolo Sender Policy Framework versión 1. |
| `ip4:82.223.109.124` | IP Estática | 0 | IP estática del servidor central Plesk/Linux (`bridge.cristianjm.com`). Envíos directos vía Postfix / SMTP TLS nativo. |
| `include:resend.com` | Inclusión | 2 | Autoriza el dominio de Resend. Resend anida internamente `_spf.google.com` (1 + 1 = 2 lookups). *Nota de arquitectura:* En configuraciones avanzadas con subdominio dedicado (ej. `mail.bentian.es`), Resend utiliza `include:amazonses.com` o CNAME directo a Amazon SES, aislando el tráfico transaccional. |
| `include:spf.sendinblue.com`| Inclusión | 1 | Autoriza la pasarela secundaria Brevo/Sendinblue ante conmutación por contingencia (0 sub-includes, solo rangos `ip4:`). |
| `include:_spf.google.com` | Inclusión | 1 | Autoriza envíos de Google Workspace corporativo (soporte humano y facturación). |
| `~all` *(SoftFail)* | Calificador | 0 | Durante la fase de auditoría y verificación. Tras validar alineación en reportes DMARC, se puede conmutar a `-all` *(HardFail)*. |

*Total consumido: 4 consultas DNS. Margen de seguridad: 6 consultas disponibles (Holgura: 60%).*

### 2.3 Registro SPF Exacto y Optimización para `suministrosrubio.com`
El dominio `suministrosrubio.com` emite correos de pedidos de WooCommerce, confirmaciones de presupuesto y comunicaciones directas desde su alojamiento Plesk:

```dns
suministrosrubio.com. IN TXT "v=spf1 ip4:82.223.109.124 include:_spf.google.com ~all"
```

#### Auditoría y Optimización de Lookups (Consumo: 1/10 Lookups):
| Directiva | Lookups DNS | Finalidad Técnica |
| :--- | :---: | :--- |
| `v=spf1` | 0 | Versión de protocolo. |
| `ip4:82.223.109.124` | 0 | IP del servidor Plesk donde reside la tienda online y el servidor de correo Postfix. |
| `include:_spf.google.com` | 1 | Cuentas corporativas de Google Workspace asociadas a atención al cliente. |
| `~all` | 0 | Cierre SoftFail para mitigar reenvíos de correo legítimos sin romper DMARC. |

> [!TIP] **Optimización de Rendimiento Aplicada:**  
> Se retira la directiva redundante `a:www.suministrosrubio.com`. Puesto que `www.suministrosrubio.com` resuelve a la misma IP (`82.223.109.124`), utilizar `ip4:` directamente ahorra 1 consulta DNS innecesaria, acelerando la verificación en los filtros anti-spam de destino.

### 2.4 Estrategia de Crecimiento: SPF Flattening (Aplanamiento SPF)
Si en el futuro se incorporan nuevos servicios transaccionales (Zendesk, Hubspot, Stripe Custom Mail) y la suma acumulada de `include:` alcanza 8 o más consultas, se deberá implementar **SPF Flattening**:
1. Resolver periódicamente los registros `include:` a sus bloques de direcciones IP finales mediante un script automatizado o servicio DNS inteligente (Cloudflare, AutoSPF).
2. Publicar directamente las directivas `ip4:...` consolidadas en el registro TXT raíz.
3. Esto reduce el consumo de DNS lookups a **0 consultas**, erradicando de raíz cualquier riesgo de `PermError`.

---

## 3. Firmas Criptográficas DKIM (RFC 6376)

### 3.1 Mecanismo Criptográfico y Longitud de Claves
DKIM introduce una firma digital asimétrica en la cabecera del correo (`DKIM-Signature`), calculada mediante el algoritmo `rsa-sha256` (o `ed25519-sha256`) sobre las cabeceras críticas del mensaje y el hash SHA-256 del cuerpo (`bh=`). 

* Longitud mínima de clave: **2048 bits**. Las claves RSA de 1024 bits son consideradas inseguras y rechazadas por Google desde 2024.
* La clave privada reside en el servidor emisor; la clave pública se publica en un subdominio DNS bajo la convención `<selector>._domainkey.<dominio>`.

### 3.2 Registros DKIM para `bentian.es`

#### A. Selector de Resend (Proveedor Primario de Licencias y Transaccional)
Resend utiliza claves CNAME o TXT con selectores delegados.

```dns
resend._domainkey.bentian.es. IN TXT "v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAyvU4bY6mX9yq5N2ZgK8...[CLAVE_PUBLICA_2048_BITS_RESEND]...IDAQAB"
```

*Si Resend proporciona CNAMEs automáticos para rotación de claves:*
```dns
s1._domainkey.bentian.es. IN CNAME s1._domainkey.resend.com.
s2._domainkey.bentian.es. IN CNAME s2._domainkey.resend.com.
```

#### B. Selector de Plesk / Servidor Central (`default._domainkey`)
Para correos despachados vía SMTP nativo desde el microservicio (`apps/api/src/services/mailer.service.ts`):

```dns
default._domainkey.bentian.es. IN TXT "v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA193f47d8...[CLAVE_PUBLICA_PLESK]...IDAQAB"
```

### 3.3 Registros DKIM para `suministrosrubio.com`
Generado automáticamente en el servidor Plesk bajo el gestor de correo Postfix con DKIM Milter:

```dns
default._domainkey.suministrosrubio.com. IN TXT "v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAuL89x7a2...[CLAVE_PUBLICA_PLESK_SUMINISTROS]...IDAQAB"
```

---

---

## 4. Política DMARC de Grado Industrial y Despliegue Progresivo (RFC 7489)

### 4.1 Requisitos Mandatarios de Google y Yahoo (2024 / 2026) y Riesgo Crítico de Lanzamiento
Desde febrero de 2024, Google y Yahoo imponen de forma estricta la presencia de un registro DMARC para todos los dominios que envían correo a sus plataformas. Sin embargo, surge una pregunta operativa de vital importancia para el lanzamiento comercial:

> **¿Es seguro y aconsejable arrancar con `p=none` antes de conmutar a `p=reject`?**  
> **DICTAMEN DE AUDITORÍA: SÍ, ES OBLIGATORIO Y CONSTITUYE LA MEJOR PRÁCTICA DE LA INDUSTRIA (M3AAWG & NIST SP 800-177).**

#### Justificación Técnica y Riesgo en Producción de un `p=reject` Prematuro:
1. **Cumplimiento Normativo Inmediato:** Las especificaciones de Google y Yahoo establecen que **una política `p=none` cumple al 100% el requisito obligatorio de DMARC**. No penaliza la entregabilidad ni degrada la reputación del dominio.
2. **Peligro de Falsos Rechazos en Pasarelas Críticas (Stripe y Resend):** Si se publica `p=reject` con alineación estricta (`adkim=s; aspf=s`) el Día 1 sin un periodo previo de auditoría:
   - Los correos emitidos por **Stripe** (recibos de facturación despachados desde la infraestructura delegada de Amazon SES) o notificaciones transaccionales de **Resend** cuyo `Return-Path` técnico resida en un subdominio (ej: `bounces.bentian.es` o `mail.bentian.es`) **fallarán la alineación estricta**.
   - Los correos legítimos reenviados automáticamente por clientes hacia cuentas de Gmail o Microsoft 365 romperán la validación SPF si la firma DKIM no estuviera perfectamente sellada.
   - Con `p=reject`, Google Workspace, Gmail y Outlook **destruirán el correo en la sesión SMTP con un error 550 5.7.1**. El comprador de una licencia de Bentian ERP Bridge nunca recibirá su clave de activación (`EB-XXXXX...`), generando disputas bancarias, frustración y daño reputacional irreparable.
3. **Función de `p=none`:** La política `p=none` actúa como un radar pasivo. Permite que todos los correos legítimos se entreguen normalmente en la bandeja de entrada mientras los servidores de Google, Microsoft y Yahoo recopilan y envían diariamente informes agregados XML (`rua`) con la telemetría exacta de cada IP que envía correo en nombre del dominio.

---

### 4.2 El Ciclo de Vida DMARC en 3 Fases (De Monitoreo a Blindaje Total)

```
FASE 1: LANZAMIENTO (Días 1 a 30)
p=none; sp=none; adkim=r; aspf=r (pct=100)
Auditoría pasiva de reportes RUA XML. Entrega garantizada al 100% de Stripe, Resend y Plesk.
                │
                ▼
FASE 2: CUARENTENA ESCALONADA (Días 31 a 60)
p=quarantine; sp=quarantine; pct=25 ──► pct=50 ──► pct=100
El correo ilegítimo se desvía a la carpeta de SPAM. Rescate de flujos legítimos imprevistos.
                │
                ▼
FASE 3: BLINDAJE COERCITIVO TOTAL (Producción Madura)
p=reject; sp=reject; adkim=r; aspf=r (pct=100)
Rechazo total en socket SMTP (550) de cualquier falsificación o intento de phishing.
```

#### Fase 1: Lanzamiento Comercial & Monitoreo (Configuración de Salida al Mercado)
* **Objetivo:** Garantizar que ningún correo de compra de Stripe ni de soporte sea rechazado, recopilando informes RUA para auditar la alineación real.
* **Alineación Relajada (`adkim=r; aspf=r`):** Estándar oficial de RFC 7489. Permite que subdominios operativos (`bounces.bentian.es`, `mail.bentian.es`) alineen con el dominio organizativo del remitente visible (`bentian.es`).

```dns
_dmarc.bentian.es. IN TXT "v=DMARC1; p=none; sp=none; adkim=r; aspf=r; rua=mailto:dmarc-reports@bentian.es; pct=100; ri=86400"
_dmarc.suministrosrubio.com. IN TXT "v=DMARC1; p=none; sp=none; adkim=r; aspf=r; rua=mailto:dmarc-reports@suministrosrubio.com; pct=100; ri=86400"
```

#### Fase 2: Cuarentena Progresiva (Ramping up Quarantine)
Tras analizar durante 2 a 4 semanas los informes XML (con herramientas como Cloudflare DMARC Management, Postmark DMARC o dmarcian) y certificar que el 100% del tráfico legítimo aprueba SPF y DKIM:
```dns
_dmarc.bentian.es. IN TXT "v=DMARC1; p=quarantine; sp=quarantine; adkim=r; aspf=r; rua=mailto:dmarc-reports@bentian.es; pct=25; ri=86400"
```
*(Se incrementa progresivamente `pct=25` -> `pct=50` -> `pct=100`)*.

#### Fase 3: Blindaje Coercitivo Definitivo (Enforcement)
Una vez estabilizada la cuarentena al 100% sin incidencias:
```dns
_dmarc.bentian.es. IN TXT "v=DMARC1; p=reject; sp=reject; adkim=r; aspf=r; rua=mailto:dmarc-reports@bentian.es; ruf=mailto:dmarc-forensics@bentian.es; pct=100; rf=afrf; ri=86400"
```

---

### 4.3 Desglose Técnico Exhaustivo de Directivas DMARC

```
v=DMARC1; p=none; sp=none; adkim=r; aspf=r; rua=mailto:...; pct=100; ri=86400
│         │       │        │       │       │                │        │
│         │       │        │       │       │                │        └─ Intervalo de reporte diario (86.400s)
│         │       │        │       │       │                └─ Aplicar al 100% del tráfico evaluado
│         │       │        │       │       └─ Destino reportes agregados XML diarios
│         │       │        │       └─ Alineación SPF RELAJADA (aspf=r, admite subdominios de rebote)
│         │       │        └─ Alineación DKIM RELAJADA (adkim=r, admite subdominios técnicos de firma)
│         │       └─ Subdomain Policy: Monitoreo en subdominios
│         └─ Policy: MONITOREO pasivo (Día 1) -> progresar a quarantine -> reject
└─ Identificador de versión DMARC obligatorio (primer parámetro indiscutible)
```

| Etiqueta | Valor Fase 1 (Lanzamiento) | Valor Fase 3 (Objetivo) | Significado e Impacto en Producción |
| :--- | :---: | :---: | :--- |
| `v=DMARC1` | `DMARC1` | `DMARC1` | Versión obligatoria. Si no está en primer lugar, el registro es inválido. |
| `p` | **`none`** | **`reject`** | En Fase 1, solo audita y reporta. En Fase 3, rechaza en socket SMTP (`550 5.7.1`). |
| `sp` | **`none`** | **`reject`** | Política de subdominios. Permite subdominios transaccionales en Fase 1 y los blinda en Fase 3. |
| `adkim` | **`r`** *(relaxed)* | **`r`** *(relaxed)* | Alineación DKIM relajada: permite que `d=mail.bentian.es` o `d=resend.com` alineen con `bentian.es`. *(Solo pasar a `s` si no hay subdominios)*. |
| `aspf` | **`r`** *(relaxed)* | **`r`** *(relaxed)* | Alineación SPF relajada: permite que `Return-Path: bounces@mail.bentian.es` alinee con `From: @bentian.es`. |
| `rua` | `mailto:...` | `mailto:...` | URI de entrega para reportes agregados XML diarios comprimidos (`.xml.gz`). |
| `ruf` | *(Opcional)* | `mailto:...` | URI de reportes forenses en tiempo real emitidos cuando ocurre un fallo. |
| `pct` | `100` | `100` | Porcentaje de mensajes sujetos a la política. |
| `ri` | `86400` | `86400` | Frecuencia de agregación en segundos (86.400 segundos = 24 horas). |

---

## 5. Prevención Anti-SPAM: Correos de Compra de Stripe y Claves de Licencia

Los correos emitidos tras un checkout de Stripe contienen códigos alfanuméricos (`EB-XXXXX-XXXXX-XXXXX-XXXXX`) e hipervínculos de descarga. Si no se diseñan bajo estándares de entregabilidad, los filtros bayesianos y las heurísticas de aprendizaje automático de Google/Microsoft los catalogan como fraude o phishing.

A continuación se detallan las medidas obligatorias implementadas en Bentian ERP Bridge:

### 5.1 Alineación Completa de Identificadores (SPF + DKIM Alignment)
Para que DMARC declare un estado `PASS`, se requiere alineación entre el remitente visible y el técnico:
* **Cabecera `From` visible:** `Bentian ERP Bridge <soporte@bentian.es>`
* **Cabecera `Return-Path` (Envelope From):** `bounces@bentian.es` (o subdominio delegado con CNAME alineado, ej. `mail.bentian.es`).
* **Firma DKIM `d=`:** `bentian.es`.
* **Resultado:** Con alineación relajada (`adkim=r; aspf=r`), cualquier subdominio transaccional de Amazon SES / Resend / Stripe aprueba inmediatamente la validación DMARC.

### 5.2 Cabeceras Obligatorias para Gmail y Yahoo (RFC 8058 One-Click POST & SLA 48h)
Desde febrero de 2024, Google y Yahoo exigen de forma obligatoria la presencia de la cabecera `List-Unsubscribe` acompañada de `List-Unsubscribe-Post` para permitir la baja en un solo clic directamente desde la interfaz del lector de correo:

```http
List-Unsubscribe: <https://bridge.cristianjm.com/api/v1/billing/unsubscribe?token=d9f823a7c4>, <mailto:bajas@bentian.es?subject=unsubscribe-d9f823a7c4>
List-Unsubscribe-Post: List-Unsubscribe=One-Click
Auto-Submitted: auto-generated
X-Auto-Response-Suppress: All
Message-ID: <20260926.112439.98234@bentian.es>
Date: Sat, 26 Sep 2026 11:24:39 +0200
MIME-Version: 1.0
Content-Type: multipart/alternative; boundary="----=_Part_Bentian_98234"
```

#### Especificación Técnica de Implementación del Endpoint RFC 8058:
1. **Flujo de Petición HTTP del Cliente:**
   - Cuando el usuario hace clic en el enlace nativo "Cancelar suscripción" de Gmail o Yahoo, el cliente de correo emite automáticamente una petición **HTTP POST** (no GET) contra la URI HTTPS especificada en `List-Unsubscribe`.
   - **Cabecera HTTP enviada:** `Content-Type: application/x-www-form-urlencoded`.
   - **Cuerpo del mensaje (Payload):** `List-Unsubscribe=One-Click`.
2. **Requisitos de Respuesta del Backend (`apps/api`):**
   - El endpoint receptor (`/api/v1/billing/unsubscribe`) debe procesar la solicitud de forma atómica e idempotente.
   - Debe devolver un código de respuesta **`HTTP 200 OK`** o **`HTTP 204 No Content`** en menos de 2 segundos.
   - **PROHIBICIÓN ESTRICTA (RFC 8058 §3.2):** Queda terminantemente prohibido redirigir al usuario a una página web intermedia, exigir confirmación con botones adicionales ("¿Está seguro?"), requerir inicio de sesión o solicitar resolución de captchas. La baja debe ser 100% desatendida.
3. **Acuerdo de Nivel de Servicio (SLA Mandataria):**
   - Las normativas de Google y Yahoo exigen que la revocación de envíos se complete en un plazo máximo de **48 horas**.
4. **Clasificación Estricta del Tráfico en Bentian ERP Bridge:**
   - **Correos Transaccionales Críticos (Exentos de baja voluntaria):** Entrega de claves de licencia (`EB-...`), avisos de cobro de facturación de Stripe, alertas críticas de desconexión del agente y restablecimiento de contraseña. *Regla:* No deben incluir `List-Unsubscribe-Post: List-Unsubscribe=One-Click` para evitar que un usuario cancele accidentalmente la recepción de sus claves de software.
   - **Comunicaciones Operativas y Novedades:** Avisos de nuevas versiones de Bentian, boletines de parches de Factusol y resúmenes de actividad. *Regla:* **Obligatorio al 100% RFC 8058**.

### 5.3 Arquitectura Dual Multipart (HTML + Plain Text)
Los correos que solo envían HTML sin alternativa en texto plano reciben penalizaciones severas en SpamAssassin (+1.8 puntos). Todo correo generado en `apps/api/src/services/mailer.service.ts` debe incluir:
1. Una parte `text/plain` clara y legible con la clave y la URL de activación.
2. Una parte `text/html` con tipografía estándar, sin estilos externos remotos bloqueados y con una relación texto/código superior al 60%.

### 5.4 Reputación de Enlaces e Hipervínculos
* **PROHIBICIÓN ESTRICTA:** Queda terminantemente prohibido utilizar acortadores de URL públicos (bit.ly, tinyurl, t.co) o enlaces basados en IP pura (`http://82.223.109.124/...`).
* Todos los enlaces deben apuntar exclusivamente al dominio certificado HTTPS oficial:
  `https://bridge.cristianjm.com/dashboard/?key=...`
  o `https://www.suministrosrubio.com/...`
* El texto ancla del enlace debe coincidir con el destino real (nunca poner en el texto `bentian.es` y enlazar a un dominio externo de tracking, lo cual activa de inmediato la heurística antifraude de Microsoft Outlook).

### 5.5 Configuración del Dominio de Envío de Stripe
Para que los recibos y notificaciones automáticas de Stripe salgan firmados con el dominio corporativo:
1. Acceder al **Dashboard de Stripe** -> **Configuración** -> **Correos electrónicos y marca**.
2. En **Dominio remitente personalizado**, añadir `bentian.es` (o subdominio `mail.bentian.es`).
3. Añadir a la zona DNS los 3 registros CNAME proporcionados por Stripe para delegar la firma DKIM de Stripe a Amazon SES.
4. De este modo, los recibos emitidos tras compras en `https://bridge.cristianjm.com` saldrán con `From: facturacion@bentian.es` firmado y alineado al 100%.

### 5.6 Reverse DNS (PTR Record) en el Servidor Plesk
Todo servidor SMTP saliente debe contar con resolución DNS inversa (PTR) que coincida exactamente con el FQDN del banner SMTP:
* **IP Pública:** `82.223.109.124`
* **Registro PTR:** `82.223.109.124.in-addr.arpa` -> `bridge.cristianjm.com` (o `mail.bentian.es`).
* **Banner SMTP:** `HELO / EHLO bridge.cristianjm.com`.
* Si el banner EHLO no coincide con la resolución reversa de la IP, Microsoft Outlook descarta el correo con el error `550 5.7.1 Service unavailable; Client host [x.x.x.x] blocked using Spamhaus`.

---

## 6. Tabla Resumen de Registros DNS para Plesk / Cloudflare

### Zona DNS: `bentian.es`
| Tipo | Nombre / Host | Contenido / Valor | Fase / Estado | TTL |
| :--- | :--- | :--- | :--- | :--- |
| **TXT** | `@` | `"v=spf1 ip4:82.223.109.124 include:resend.com include:spf.sendinblue.com include:_spf.google.com ~all"` | **Producción** (4/10 lookups) | 3600 |
| **TXT** | `_dmarc` | `"v=DMARC1; p=none; sp=none; adkim=r; aspf=r; rua=mailto:dmarc-reports@bentian.es; pct=100; ri=86400"` | **Fase 1: Lanzamiento** *(Recomendado Día 1)* | 3600 |
| **TXT** | `_dmarc` | `"v=DMARC1; p=reject; sp=reject; adkim=r; aspf=r; rua=mailto:dmarc-reports@bentian.es; ruf=mailto:dmarc-forensics@bentian.es; pct=100; rf=afrf; ri=86400"` | **Fase 3: Blindaje Total** *(Tras 30 días auditoría)* | 3600 |
| **TXT** | `default._domainkey` | `"v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCg...IDAQAB"` | **Producción** (RSA 2048-bit Plesk) | 3600 |
| **TXT** | `resend._domainkey` | *(Valor proporcionado por la consola de Resend)* | **Producción** (Transaccional API) | 3600 |
| **MX** | `@` | `mail.bentian.es` (Prioridad: 10) | **Producción** | 3600 |
| **A** | `mail` | `82.223.109.124` | **Producción** | 3600 |

### Zona DNS: `suministrosrubio.com`
| Tipo | Nombre / Host | Contenido / Valor | Fase / Estado | TTL |
| :--- | :--- | :--- | :--- | :--- |
| **TXT** | `@` | `"v=spf1 ip4:82.223.109.124 include:_spf.google.com ~all"` | **Producción Optimizado** (1/10 lookups) | 3600 |
| **TXT** | `_dmarc` | `"v=DMARC1; p=none; sp=none; adkim=r; aspf=r; rua=mailto:dmarc-reports@suministrosrubio.com; pct=100; ri=86400"` | **Fase 1: Lanzamiento** *(Recomendado Día 1)* | 3600 |
| **TXT** | `_dmarc` | `"v=DMARC1; p=reject; sp=reject; adkim=r; aspf=r; rua=mailto:dmarc-reports@suministrosrubio.com; ruf=mailto:dmarc-forensics@suministrosrubio.com; pct=100; rf=afrf; ri=86400"` | **Fase 3: Blindaje Total** *(Tras auditoría)* | 3600 |
| **TXT** | `default._domainkey` | `"v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCg...IDAQAB"` | **Producción** (RSA 2048-bit Plesk) | 3600 |
| **MX** | `@` | `mail.suministrosrubio.com` (Prioridad: 10) | **Producción** | 3600 |
| **A** | `mail` | `82.223.109.124` | **Producción** | 3600 |

---

## 7. Herramientas de Auditoría y Verificación Continua

Para validar el cumplimiento de esta especificación en cualquier momento:

1. **Test de Puntuación Integral (Mail-Tester):**  
   Enviar un correo de prueba desde `apps/api` o la tienda a la dirección temporal generada en `https://www.mail-tester.com/`. La puntuación debe ser **10/10** (sin penalizaciones de DKIM, SPF, SpamAssassin ni listas negras).
2. **Google Postmaster Tools:**  
   Verificar la propiedad de `bentian.es` y `suministrosrubio.com` en `https://postmaster.google.com/`. Monitorear semanalmente:
   - *Domain Reputation:* Debe mantenerse en nivel **High**.
   - *Spam Rate:* Debe situarse estrictamente por debajo del **0.10%** (límite crítico: 0.30%).
   - *Authentication:* 100% de éxito en SPF, DKIM y DMARC.
3. **Comprobación vía Terminal DNS (Dig / PowerShell):**
   ```powershell
   # Verificar SPF
   Resolve-DnsName -Name "bentian.es" -Type TXT | Select-Object -ExpandProperty Strings

   # Verificar DMARC
   Resolve-DnsName -Name "_dmarc.bentian.es" -Type TXT | Select-Object -ExpandProperty Strings

   # Verificar DKIM
   Resolve-DnsName -Name "default._domainkey.bentian.es" -Type TXT | Select-Object -ExpandProperty Strings
   ```
