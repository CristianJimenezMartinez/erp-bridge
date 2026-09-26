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
> Si la evaluación recursiva de directivas `include`, `a`, `mx`, `ptr` o `exists` supera 10 consultas DNS, el servidor receptor declara un fallo permanente **`PermError`** y trata el correo como falso o SPAM. Se deben consolidar y minimizar los `include`.

### 2.2 Registro SPF Exacto para `bentian.es`
El dominio `bentian.es` emite correos transaccionales desde el clúster central de Bentian ERP Bridge, el servidor de correo propio en Plesk, y pasarelas transaccionales autorizadas (Resend como proveedor primario de alta reputación y Brevo/Sendinblue como fallback):

```dns
bentian.es. IN TXT "v=spf1 ip4:82.223.109.124 include:resend.com include:spf.sendinblue.com include:_spf.google.com ~all"
```

#### Desglose de Parámetros:
| Directiva | Finalidad Técnica |
| :--- | :--- |
| `v=spf1` | Identificador de protocolo Sender Policy Framework versión 1. |
| `ip4:82.223.109.124` | IP estática del servidor central Plesk/Linux (`bridge.cristianjm.com`). Permite envíos directos mediante socket SMTP TLS nativo sin intermediarios. |
| `include:resend.com` | Autoriza los servidores transaccionales de Resend (AWS SES de alta reputación dedicado). |
| `include:spf.sendinblue.com` | Autoriza la pasarela secundaria Brevo/Sendinblue ante conmutación por contingencia. |
| `include:_spf.google.com` | Autoriza el envío desde cuentas corporativas de Google Workspace (soporte humano, ventas). |
| `~all` *(SoftFail)* | Durante la fase de rodaje y verificación de firmas. Una vez confirmado el 100% de alineación en reportes DMARC, se conmuta al blindaje estricto **`-all`** *(HardFail)*. |

### 2.3 Registro SPF Exacto para `suministrosrubio.com`
El dominio `suministrosrubio.com` emite correos de pedidos de la tienda online WooCommerce, confirmaciones de presupuesto y comunicaciones directas desde su alojamiento Plesk:

```dns
suministrosrubio.com. IN TXT "v=spf1 ip4:82.223.109.124 a:www.suministrosrubio.com include:_spf.google.com ~all"
```

#### Desglose de Parámetros:
| Directiva | Finalidad Técnica |
| :--- | :--- |
| `v=spf1` | Identificador de versión SPF. |
| `ip4:82.223.109.124` | IP del servidor Plesk donde reside la tienda online y el servidor de correo Postfix. |
| `a:www.suministrosrubio.com` | Autoriza explícitamente la IP a la que resuelve el registro A del frontend oficial. |
| `include:_spf.google.com` | Cuentas corporativas asociadas para atención al cliente y facturación. |
| `~all` | Cierre SoftFail para mitigar reenvíos de correo legítimos sin romper DMARC. |

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

## 4. Política DMARC de Máxima Seguridad (RFC 7489)

### 4.1 Registro DMARC Obligatorio para `bentian.es`
Para blindar el dominio contra suplantaciones y garantizar la máxima puntuación en los filtros de reputación de Microsoft Defender for Office y Gmail, se define la siguiente política con rechazo total y alineación estricta:

```dns
_dmarc.bentian.es. IN TXT "v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s; rua=mailto:dmarc-reports@bentian.es; ruf=mailto:dmarc-forensics@bentian.es; pct=100; rf=afrf; ri=86400"
```

### 4.2 Registro DMARC para `suministrosrubio.com`
```dns
_dmarc.suministrosrubio.com. IN TXT "v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s; rua=mailto:dmarc-reports@suministrosrubio.com; ruf=mailto:dmarc-forensics@suministrosrubio.com; pct=100; rf=afrf; ri=86400"
```

### 4.3 Desglose Técnico Exhaustivo de Directivas DMARC

```
v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s; rua=mailto:...; ruf=mailto:...; pct=100; rf=afrf; ri=86400
│         │         │         │       │       │                │                │        │       │
│         │         │         │       │       │                │                │        │       └─ Intervalo de reporte (24h)
│         │         │         │       │       │                │                │        └─ Formato forense AFRF (RFC 6591)
│         │         │         │       │       │                │                └─ Aplicar al 100% del tráfico
│         │         │         │       │       │                └─ Destino reportes forenses en tiempo real
│         │         │         │       │       └─ Destino reportes agregados XML diarios
│         │         │         │       └─ Alineación SPF ESTRICTA (aspf=s)
│         │         │         └─ Alineación DKIM ESTRICTA (adkim=s)
│         │         └─ Subdomain Policy: RECHAZO en subdominios
│         └─ Policy: RECHAZO inmediato de correos que no alineen
└─ Identificador de versión DMARC obligatorio
```

| Etiqueta | Valor | Significado e Impacto en Producción |
| :--- | :--- | :--- |
| `v=DMARC1` | `DMARC1` | Versión obligatoria. Si no está al principio, el registro se invalida. |
| `p=reject` | `reject` | **Política de rechazo estricto.** Si un correo no supera la alineación SPF o DKIM, el servidor de destino (Gmail, Outlook) debe rechazarlo en la propia sesión SMTP (`550 5.7.1 Unauthenticated mail is not accepted`). El correo nunca entra ni en la carpeta de SPAM del receptor. |
| `sp=reject` | `reject` | **Política de subdominios.** Extiende el rechazo estricto a cualquier subdominio no declarado explícitamente (ej: `marketing.bentian.es`, `mail2.bentian.es`), impidiendo ataques de phishing por subdominios fantasma. |
| `adkim=s` | `s` *(strict)* | **Alineación DKIM Estricta.** El dominio especificado en la cabecera `d=` de la firma DKIM debe coincidir **exactamente** con el dominio del remitente visible en la cabecera `From:` (`RFC 5322.From`). No se permiten subdominios cruzados (`s` vs `r`). |
| `aspf=s` | `s` *(strict)* | **Alineación SPF Estricta.** El dominio del `Return-Path` (`RFC 5321.MailFrom`) debe ser idéntico al dominio visible en la cabecera `From:`. |
| `rua` | `mailto:...` | URI de entrega para reportes agregados en formato XML comprimido (`.xml.gz`). Proporciona visibilidad diaria de cada IP que envía en nombre del dominio. |
| `ruf` | `mailto:...` | URI de reportes forenses inmediatos (Failure Reports) emitidos en el instante en que un mensaje no supera la validación. |
| `pct=100` | `100` | Porcentaje de mensajes sujetos a la política. 100% garantiza que ningún correo sospechoso quede exento. |
| `rf=afrf` | `afrf` | *Authentication Failure Reporting Format* estándar (RFC 6591). |
| `ri=86400` | `86400` | Frecuencia de agregación en segundos (86.400s = 24 horas). |

---

## 5. Prevención Anti-SPAM: Correos de Compra de Stripe y Claves de Licencia

Los correos emitidos tras un checkout de Stripe contienen códigos alfanuméricos (`EB-XXXXX-XXXXX-XXXXX-XXXXX`) e hipervínculos de descarga. Si no se diseñan bajo estándares de entregabilidad, los filtros bayesianos y las heurísticas de aprendizaje automático de Google/Microsoft los catalogan como fraude o phishing.

A continuación se detallan las medidas obligatorias implementadas en Bentian ERP Bridge:

### 5.1 Alineación Completa de Identificadores (SPF + DKIM Alignment)
Para que DMARC declare un estado `PASS`, se requiere alineación entre el remitente visible y el técnico:
* **Cabecera `From` visible:** `Bentian ERP Bridge <soporte@bentian.es>`
* **Cabecera `Return-Path` (Envelope From):** `bounces@bentian.es` (o subdominio delegado con CNAME alineado, ej. `mail.bentian.es`).
* **Firma DKIM `d=`:** `bentian.es`.
* **Resultado:** Alineación 100% idéntica sin discrepancia de subdominios, superando la restricción `adkim=s` y `aspf=s`.

### 5.2 Cabeceras Obligatorias para Gmail y Yahoo (Requisitos RFC 8058)
Desde febrero de 2024, Gmail y Yahoo rechazan correos comerciales y transaccionales que no incluyan el mecanismo de baja en un solo clic y cabeceras de identificación estructurada:

```http
List-Unsubscribe: <https://bridge.cristianjm.com/api/v1/billing/unsubscribe?token=...>, <mailto:bajas@bentian.es?subject=baja>
List-Unsubscribe-Post: List-Unsubscribe=One-Click
Auto-Submitted: auto-generated
X-Auto-Response-Suppress: All
Message-ID: <20260926.112439.98234@bentian.es>
Date: Sat, 26 Sep 2026 11:24:39 +0200
MIME-Version: 1.0
Content-Type: multipart/alternative; boundary="----=_Part_Bentian_98234"
```

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
| Tipo | Nombre / Host | Contenido / Valor | TTL |
| :--- | :--- | :--- | :--- |
| **TXT** | `@` | `"v=spf1 ip4:82.223.109.124 include:resend.com include:spf.sendinblue.com include:_spf.google.com ~all"` | 3600 |
| **TXT** | `_dmarc` | `"v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s; rua=mailto:dmarc-reports@bentian.es; ruf=mailto:dmarc-forensics@bentian.es; pct=100; rf=afrf; ri=86400"` | 3600 |
| **TXT** | `default._domainkey` | `"v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCg...IDAQAB"` | 3600 |
| **TXT** | `resend._domainkey` | *(Valor proporcionado por la consola de Resend)* | 3600 |
| **MX** | `@` | `mail.bentian.es` (Prioridad: 10) | 3600 |
| **A** | `mail` | `82.223.109.124` | 3600 |

### Zona DNS: `suministrosrubio.com`
| Tipo | Nombre / Host | Contenido / Valor | TTL |
| :--- | :--- | :--- | :--- |
| **TXT** | `@` | `"v=spf1 ip4:82.223.109.124 a:www.suministrosrubio.com include:_spf.google.com ~all"` | 3600 |
| **TXT** | `_dmarc` | `"v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s; rua=mailto:dmarc-reports@suministrosrubio.com; ruf=mailto:dmarc-forensics@suministrosrubio.com; pct=100; rf=afrf; ri=86400"` | 3600 |
| **TXT** | `default._domainkey` | `"v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCg...IDAQAB"` | 3600 |
| **MX** | `@` | `mail.suministrosrubio.com` (Prioridad: 10) | 3600 |
| **A** | `mail` | `82.223.109.124` | 3600 |

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
