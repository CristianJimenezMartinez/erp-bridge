# Reglas de Bypass Cloudflare WAF y Optimización de Hosting Plesk
## Bentian ERP Bridge — Suministros Rubio & Tiendas Integradas

> **Documento Técnico de Producción**  
> **Área:** Protección Web, WAF, Caché de Red y Rendimiento Web Server  
> **Versión:** 1.0.0  
> **Fecha:** Septiembre 2026  
> **Afecta a:** `www.suministrosrubio.com`, `bridge.cristianjm.com`, APIs REST de WooCommerce y Universal Bridge

---

## 1. Justificación y Problemática en Producción

Bentian ERP Bridge realiza sincronizaciones continuas de alta velocidad entre el software ERP local (Factusol / SimplyGest) y la plataforma de comercio electrónico. Este flujo genera dos tipos de tráfico automatizado intensivo:

1. **WooCommerce REST API (`/wp-json/wc/v3/*`):** Peticiones `POST`, `PUT` y `GET` autenticadas con Consumer Key/Secret (o cabeceras de autorización HTTP Basic), transportando lotes masivos de productos, listas de atributos, imágenes en base64 o URLs y múltiples variaciones de tallas y medidas.
2. **Universal Bridge Endpoint (`/erp-bridge-endpoint.php`):** Script optimizado ultrarrápido que recibe peticiones criptográficamente firmadas con cabecera `X-Bridge-Token` para actualización atómica de stock y descarga de pedidos en crudo.

### Riesgos Operativos Habituales sin Configuración de Bypass:
* **Cloudflare WAF / Managed Rules:** Detecta las sincronizaciones por lotes como ataques de fuerza bruta (*Rate Limiting*), scraping (*Bot Fight Mode*) o inyecciones SQL (*OWASP Ruleset* en campos descriptivos de productos), devolviendo errores `403 Forbidden` o desafíos interactivos `503 Service Unavailable / Cloudflare Turnstile`.
* **Plesk ModSecurity (Apache/Nginx):** Bloquea payloads JSON grandes con falsos positivos de reglas CRS (Core Rule Set) de detección de firmas XSS o SQLi.
* **Timeouts de PHP y Nginx:** Caída con errores `504 Gateway Time-out` o `413 Request Entity Too Large` al procesar catálogos de más de 5.000 artículos o subidas de lotes de fotografías.

---

## 2. Reglas de Bypass en Cloudflare WAF (Custom Rules)

En el panel de control de Cloudflare (sección **Security** -> **WAF** -> **Custom rules**), se deben crear dos reglas de exclusión prioritaria (Action: `Skip`).

### 2.1 Regla WAF 1: Exclusión de la API REST de WooCommerce
Esta regla evita que las peticiones del Agente Bentian a `/wp-json/wc/v3/*` sean bloqueadas por el firewall administrado o la verificación de navegador.

#### Expresión Wirefilter Oficial (Cloudflare Ruleset Engine):
```wirefilter
(starts_with(http.request.uri.path, "/wp-json/wc/v3") and (http.user_agent contains "Bentian" or any(http.request.headers["x-bentian-key"][*] != "") or any(http.request.headers["authorization"][*] contains "Basic")))
```

> [!NOTE] **Directrices de Sintaxis Cloudflare Ruleset Engine:**  
> 1. En Wirefilter moderno, `starts_with(field, string)` es una **función**, NO un operador infijo (escribir `field starts_with "..."` genera un error sintáctico de validación en Cloudflare).
> 2. Las cabeceras HTTP son un mapa de arrays con nombres siempre en **minúsculas** (`x-bentian-key`, `authorization`).
> 3. El operador `any(http.request.headers["..."][*] != "")` es la sintaxis canónica segura para verificar existencia sin errores de desbordamiento de índice (`[0]`).

#### Parámetros de la Regla en Cloudflare:
| Campo | Valor Configurado |
| :--- | :--- |
| **Rule Name** | `Bypass Bentian ERP Bridge - WooCommerce REST API` |
| **Action** | **Skip** |
| **WAF components to skip** | [x] All remaining custom rules<br>[x] WAF Managed Rules (OWASP & Cloudflare Managed)<br>[x] Rate Limiting Rules<br>[x] Super Bot Fight Mode / Bot Fight Mode<br>[x] Browser Integrity Check (BIC) |
| **Position** | Primera posición (Prioridad 1) |

---

### 2.2 Regla WAF 2: Exclusión de Bentian Universal Bridge (`/erp-bridge-endpoint.php`)
Para tiendas que emplean el conector nativo PHP rápido de Suministros Rubio:

#### Expresión Wirefilter Oficial:
```wirefilter
(http.request.uri.path == "/erp-bridge-endpoint.php" and (any(http.request.headers["x-bridge-token"][*] != "") or http.user_agent contains "Bentian"))
```

#### Parámetros de la Regla:
| Campo | Valor Configurado |
| :--- | :--- |
| **Rule Name** | `Bypass Bentian Universal Bridge Endpoint` |
| **Action** | **Skip** |
| **WAF components to skip** | [x] All remaining custom rules<br>[x] WAF Managed Rules<br>[x] Rate Limiting Rules<br>[x] Browser Integrity Check |
| **Position** | Prioridad 2 |

---

### 2.3 Regla de Bypass de Caché de Cloudflare (Cache Rules)
Las peticiones de inventario, stock y descarga de pedidos **NUNCA** deben ser cacheadas por la red perimetral de Cloudflare.

En **Caching** -> **Cache Rules** -> **Create rule**:
* **Expression:**
  ```wirefilter
  (starts_with(http.request.uri.path, "/wp-json/wc/v3") or http.request.uri.path == "/erp-bridge-endpoint.php")
  ```
* **Cache Eligibility:** **Bypass cache**

---

## 3. Directivas de Servidor Web Plesk (Apache + Nginx + PHP)

En el panel de control de Plesk (ej. `suministrosrubio.com` o servidores de clientes), se deben ajustar los límites de memoria, tiempo de ejecución y ModSecurity.

### 3.1 Directivas PHP (Plesk -> Dominios -> Configuración de PHP)
En el apartado **Directivas adicionales** (o mediante `php.ini`), aplicar:

```ini
; ====================================================================
; BENTIAN ERP BRIDGE - OPTIMIZACIONES DE ENTORNO PHP
; ====================================================================

; Tiempo máximo de ejecución para procesar lotes masivos de catálogo
max_execution_time = 300

; Tiempo máximo para parsear peticiones entrantes grandes
max_input_time = 300

; Memoria asignada al proceso PHP para procesamiento de arrays de productos
memory_limit = 512M

; Límite de variables de entrada para catálogos con cientos de variaciones
max_input_vars = 10000

; Tamaño máximo de payload para subida masiva de imágenes y datos
post_max_size = 64M
upload_max_filesize = 64M

; Buffer de salida y compatibilidad
output_buffering = 4096
```

---

### 3.2 Directivas Apache (Diferenciación Crítica `.htaccess` vs Plesk VirtualHost)

> [!CAUTION] **Regla de Oro Apache:**  
> Las directivas `<Location>` y `<LocationMatch>` están **TERMINANTEMENTE PROHIBIDAS** dentro de archivos `.htaccess`. Colocar `<LocationMatch>` en un fichero `.htaccess` provocará un **Error 500 (Internal Server Error)** fatal en todo el sitio web de WordPress.
> 
> A continuación se detallan las dos alternativas de implementación según el nivel de acceso disponible:

#### Opción A: Configuración en `.htaccess` (En la raíz de WordPress `/httpdocs/.htaccess`)
Para administradores que solo tienen acceso FTP o al Gestor de Archivos de WordPress:

```apache
# ====================================================================
# BENTIAN ERP BRIDGE - MODSECURITY OVERRIDES (COMPATIBLE .HTACCESS)
# ====================================================================

<IfModule mod_security2.c>
  # 1. Desactivación selectiva de ModSecurity para el conector nativo ligero
  <Files "erp-bridge-endpoint.php">
    SecRuleEngine Off
  </Files>

  # 2. Desactivación de reglas OWASP CRS en WooCommerce REST API
  # Se utiliza ctl:ruleRemoveById a nivel de petición URI sin usar LocationMatch
  SecRule REQUEST_URI "@beginsWith /wp-json/wc/v3" \
    "id:1000001,phase:1,pass,nolog,\
ctl:ruleRemoveById=949110,\
ctl:ruleRemoveById=980130,\
ctl:ruleRemoveById=920420,\
ctl:ruleRemoveById=921151,\
ctl:ruleRemoveById=941100,\
ctl:ruleRemoveById=942100"
</IfModule>

# 3. Desactivar compresión GZIP/Brotli intermedia en el endpoint si rompe streaming
<IfModule mod_deflate.c>
  SetEnvIfNoCase Request_URI "^/erp-bridge-endpoint\.php$" no-gzip dont-vary
</IfModule>

# 4. Asegurar cabeceras de autorización HTTP en FastCGI / PHP-FPM
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteCond %{HTTP:Authorization} ^(.*)
  RewriteRule .* - [e=HTTP_AUTHORIZATION:%1]
</IfModule>
```

#### Opción B: Directivas en Plesk Panel (Configuración de Apache y Nginx -> "Directivas adicionales de Apache")
Si tienes acceso de administrador a Plesk (contexto `<VirtualHost>`), puedes aplicar:

```apache
# ====================================================================
# BENTIAN ERP BRIDGE - DIRECTIVAS ADICIONALES APACHE (VIRTUALHOST CONTEXT)
# ====================================================================

<IfModule mod_security2.c>
  # Para el conector PHP ligero
  <Files "erp-bridge-endpoint.php">
    SecRuleEngine Off
  </Files>

  # Para la API REST oficial de WooCommerce (Válido exclusivamente en VirtualHost)
  <LocationMatch "^/wp-json/wc/v3">
    SecRuleRemoveById 949110 980130 920420 921151 941100 942100
  </LocationMatch>
</IfModule>
```

---

### 3.3 Directivas Nginx (Plesk -> Configuración de Apache y Nginx)

> [!WARNING] **Riesgo Crítico de Enrutamiento en Nginx (`try_files`):**  
> Las rutas de la API REST de WooCommerce (`/wp-json/wc/v3/*`) son rutas dinámicas y virtuales procesadas internamente por `index.php`.  
> Utilizar una directiva `try_files $uri =404;` sobre `/wp-json/wc/v3` busca archivos físicos inexistentes en el disco y **devuelve un error 404 Not Found a cada llamada del Agente Bentian**.

Aplica la configuración adecuada según el modo de operación de tu servidor Plesk:

#### Modo A: Plesk Estándar (Nginx como Proxy Inverso delante de Apache con PHP-FPM)
*Este es el modo predeterminado y recomendado en Plesk.* Nginx delega el procesamiento dinámico a Apache vía `proxy_pass`. En **Directivas adicionales de Nginx**, solo es necesario desacoplar los límites y el búfer del proxy:

```nginx
# ====================================================================
# BENTIAN ERP BRIDGE - NGINX REVERSE PROXY (MODO ESTÁNDAR PLESK)
# ====================================================================

# 1. Ampliar tamaño de carga para evitar error 413 (Payload Too Large)
client_max_body_size 64M;

# 2. Evitar error 504 Gateway Time-out durante sincronizaciones de larga duración
proxy_connect_timeout 300s;
proxy_send_timeout 300s;
proxy_read_timeout 300s;

# 3. Desactivar buffering del proxy para streaming en tiempo real de sincronización
proxy_buffering off;
proxy_buffer_size 128k;
proxy_buffers 4 256k;
proxy_busy_buffers_size 256k;
```

#### Modo B: Plesk Modo Nginx Dedicado (Sin Apache, PHP-FPM directo)
Si el dominio tiene desmarcado el servidor Apache y procesa las peticiones directamente con Nginx y PHP-FPM:

```nginx
# ====================================================================
# BENTIAN ERP BRIDGE - NGINX DEDICADO FASTCGI (SIN APACHE)
# ====================================================================

client_max_body_size 64M;

# 1. Endpoint nativo ligero de Universal Bridge (archivo físico real)
location = /erp-bridge-endpoint.php {
    try_files $uri =404;
    fastcgi_pass "unix:///var/www/vhosts/system/suministrosrubio.com/php/php-fpm.sock";
    fastcgi_buffering off;
    fastcgi_connect_timeout 300s;
    fastcgi_send_timeout 300s;
    fastcgi_read_timeout 300s;
    include fastcgi_params;
    fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
}

# 2. Rutas dinámicas de WooCommerce REST API (desvío al enrutador WordPress)
location ~ ^/wp-json/wc/v3 {
    try_files $uri $uri/ /index.php?$args;
    fastcgi_pass "unix:///var/www/vhosts/system/suministrosrubio.com/php/php-fpm.sock";
    fastcgi_buffering off;
    fastcgi_connect_timeout 300s;
    fastcgi_send_timeout 300s;
    fastcgi_read_timeout 300s;
    include fastcgi_params;
    fastcgi_param SCRIPT_FILENAME $document_root/index.php;
}

---

## 4. Reglas Mandatarias de Red y Conectividad (Recordatorio Canónico)

Al auditar, verificar o lanzar comandos desde consola o tests de integración:

> [!IMPORTANT] **REGLAS MANDATARIAS DE RED DEL PROYECTO BENTIAN:**  
> 1. **URL Canónica de Suministros Rubio:**  
>    `suministrosrubio.com` redirige con código `301 Moved Permanently` a `https://www.suministrosrubio.com`.  
>    Un comando `curl -s` sin `-L` no sigue la redirección y devuelve un log completamente vacío (*Empty log*).  
>    La URL oficial **SIEMPRE** lleva las tres `www`:  
>    `https://www.suministrosrubio.com/erp-bridge-endpoint.php`
> 2. **Comando Canónico de Verificación:**  
>    ```bash
>    curl.exe -i -L -k "https://www.suministrosrubio.com/erp-bridge-endpoint.php?action=ping"
>    ```
>    o en PowerShell:  
>    ```powershell
>    Invoke-RestMethod -Uri "https://www.suministrosrubio.com/erp-bridge-endpoint.php?action=ping" -MaximumRedirection 5
>    ```
> 3. **Prohibición Total de DuckDNS:**  
>    El dominio temporal `suministrosrubios.duckdns.org` queda **TOTALMENTE PROHIBIDO**. Todo el tráfico va por HTTPS directo a `www.suministrosrubio.com`.
> 4. **Servidor Central de Bentian:**  
>    La API central y distribución de releases reside en:  
>    `https://bridge.cristianjm.com`

---

## 5. Protocolo de Verificación del Bypass en Producción

Para confirmar que Cloudflare y Plesk permiten el tráfico sin bloqueos:

### Test 1: Comprobación de Ping sin Reto de WAF
```bash
curl.exe -i -L -k -H "User-Agent: BentianAgent/0.3.1" "https://www.suministrosrubio.com/erp-bridge-endpoint.php?action=ping"
```
**Resultado esperado:**
* Código HTTP: `200 OK`
* Cabecera `cf-ray`: Presente (indica paso por Cloudflare).
* Cuerpo de respuesta: `{"success":true,"message":"pong",...}`
* Ausencia total de cabeceras de challenge o páginas HTML de Cloudflare.

### Test 2: Comprobación de Límite de Payload Grande
```bash
curl.exe -i -L -k -X POST -H "User-Agent: BentianAgent/0.3.1" -H "Content-Type: application/json" -d "{\"test\":\"large_payload\",\"items\":[]}" "https://www.suministrosrubio.com/erp-bridge-endpoint.php?action=echo"
```
**Resultado esperado:**
* El servidor acepta el payload sin disparar errores 413, 403 ni 504.
