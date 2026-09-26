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

#### Expresión Wirefilter (Cloudflare Expression Language):
```wirefilter
(http.request.uri.path starts_with "/wp-json/wc/v3" and (http.user_agent contains "Bentian" or http.request.headers["x-bentian-key"][0] ne "" or http.request.headers["authorization"][0] contains "Basic"))
```

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

#### Expresión Wirefilter:
```wirefilter
(http.request.uri.path eq "/erp-bridge-endpoint.php" and (http.request.headers["x-bridge-token"][0] ne "" or http.user_agent contains "Bentian"))
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
  (http.request.uri.path starts_with "/wp-json/wc/v3" or http.request.uri.path eq "/erp-bridge-endpoint.php")
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

### 3.2 Directivas Apache (`.htaccess` o Directivas Adicionales de Apache en Plesk)
En la raíz de la web (`/var/www/vhosts/suministrosrubio.com/httpdocs/.htaccess`) o en Plesk **Configuración de Apache y Nginx**:

```apache
# ====================================================================
# BENTIAN ERP BRIDGE - MODSECURITY & REWRITE OVERRIDES
# ====================================================================

# 1. Desactivar ModSecurity selectivamente para endpoints de sincronización
<IfModule mod_security2.c>
  # Para el conector PHP ligero
  <Files "erp-bridge-endpoint.php">
    SecRuleEngine Off
  </Files>

  # Para la API REST oficial de WooCommerce
  <LocationMatch "^/wp-json/wc/v3">
    # Reglas OWASP CRS habituales que provocan falsos positivos con JSON estructurado
    SecRuleRemoveById 949110 980130 920420 921151 941100 942100
  </LocationMatch>
</IfModule>

# 2. Desactivar compresión GZIP/Brotli intermedia en el endpoint si rompe streaming
<IfModule mod_deflate.c>
  SetEnvIfNoCase Request_URI "^/erp-bridge-endpoint\.php$" no-gzip dont-vary
</IfModule>

# 3. Asegurar cabeceras de autorización HTTP en FastCGI / PHP-FPM
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteCond %{HTTP:Authorization} ^(.*)
  RewriteRule .* - [e=HTTP_AUTHORIZATION:%1]
</IfModule>
```

---

### 3.3 Directivas Nginx (Plesk -> Configuración de Apache y Nginx)
Si Plesk ejecuta Nginx como proxy inverso por delante de Apache (configuración estándar) o en modo dedicado:

En **Directivas adicionales de Nginx**:

```nginx
# ====================================================================
# BENTIAN ERP BRIDGE - DIRECTIVAS NGINX DE TIMEOUT Y BUFFERING
# ====================================================================

# 1. Ampliar tamaño de carga para evitar error 413 (Payload Too Large)
client_max_body_size 64M;

# 2. Evitar error 504 Gateway Time-out durante sincronizaciones de larga duración
proxy_connect_timeout 300s;
proxy_send_timeout 300s;
proxy_read_timeout 300s;

fastcgi_connect_timeout 300s;
fastcgi_send_timeout 300s;
fastcgi_read_timeout 300s;

# 3. Desactivar buffering para streaming de respuestas de sincronización continua
location ~ ^/(erp-bridge-endpoint\.php|wp-json/wc/v3) {
    try_files $uri =404;
    
    # Parámetros FastCGI para streaming directo
    fastcgi_buffering off;
    fastcgi_buffer_size 128k;
    fastcgi_buffers 4 256k;
    fastcgi_busy_buffers_size 256k;
    
    # Pasar parámetros originales a PHP-FPM
    include fastcgi_params;
    fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    fastcgi_pass "unix:///var/www/vhosts/system/suministrosrubio.com/php/php-fpm.sock";
}
```

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
