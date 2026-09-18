# Reglas de Conexión, Pruebas de Red y Entorno (Suministros Rubio)

## 1. Regla Estricta: Prohibido `curl -s` sin Redirección
* **MOTIVO CRÍTICO:** El servidor web en Plesk para `https://suministrosrubio.com` devuelve un código HTTP `301 Moved Permanently` que redirige obligatoriamente a `https://www.suministrosrubio.com`.
* Si se ejecuta `curl -s "https://suministrosrubio.com/..."`:
  - El flag `-s` silencia la salida.
  - Al no incluir `-L`, curl NO sigue la redirección 301.
  - El resultado es un fallo silencioso: **"Empty log"**.
* **NUNCA volver a ejecutar `curl -s` hacia el dominio sin `www` ni sin `-L`.**

## 2. Dominio Canónico de Producción
* La URL canónica oficial es SIEMPRE con `www`:
  `https://www.suministrosrubio.com/erp-bridge-endpoint.php`
* En frontend (Angular `environment.ts`) y en la configuración del agente, utilizar SIEMPRE `https://www.suministrosrubio.com/...`.

## 3. Comandos de Comprobación Permitidos en Terminal (Windows / PowerShell)
Para verificar la conexión del endpoint, usar EXCLUSIVAMENTE una de estas dos opciones:

### Opción A (curl.exe nativo con seguimiento de redirección):
```powershell
curl.exe -i -L -k "https://www.suministrosrubio.com/erp-bridge-endpoint.php?action=ping"
```
*(Incluye `-i` para cabeceras, `-L` para seguir redirects y `-k` para evitar problemas con certificados locales).*

### Opción B (PowerShell Invoke-RestMethod):
```powershell
Invoke-RestMethod -Uri "https://www.suministrosrubio.com/erp-bridge-endpoint.php?action=ping" -MaximumRedirection 5
```

## 4. Gestión de Subidas a Plesk
* El usuario sube los archivos de servidor (como `erp-bridge-endpoint.php`) **A MANO** desde el Administrador de Archivos de Plesk (`httpdocs/`).
* El agente debe generar el archivo localmente, indicar la ruta exacta al usuario y esperar a que el usuario lo suba antes de verificar cambios remotos.

## 5. Prohibición Absoluta de DuckDNS
* DuckDNS (`suministrosrubios.duckdns.org`) queda totalmente descartado y prohibido. No se debe sugerir, referenciar ni utilizar bajo ninguna circunstancia.
