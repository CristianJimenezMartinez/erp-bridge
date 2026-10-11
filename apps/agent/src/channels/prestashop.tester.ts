import { PrestashopChecklist, PrestashopTestResult, PrestashopTestSettings } from './channel.types';

function isBlockedSsrf(hostname: string): boolean {
  const h = hostname.toLowerCase().trim().replace(/^\[|\]$/g, '');
  if (
    h === '169.254.169.254' ||
    h === '0.0.0.0' ||
    h === '::1' ||
    h === '0:0:0:0:0:0:0:1' ||
    h.startsWith('fe80:') ||
    h.startsWith('fc00:') ||
    h.startsWith('fd00:') ||
    h.startsWith('::ffff:') ||
    h.endsWith('.internal') ||
    h.endsWith('.local') ||
    h.endsWith('.onion')
  ) {
    return true;
  }
  if (h === 'localhost' || h === '127.0.0.1') {
    return false;
  }
  const ipMatch = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (ipMatch) {
    const b0 = parseInt(ipMatch[1]!, 10);
    const b1 = parseInt(ipMatch[2]!, 10);
    if (b0 === 10) return true;
    if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;
    if (b0 === 192 && b1 === 168) return true;
    if (b0 === 127 || b0 === 0) return true;
    if (b0 === 169 && b1 === 254) return true;
    if (b0 === 100 && b1 >= 64 && b1 <= 127) return true;
    if (b0 >= 224) return true;
  }
  return false;
}

export class PrestashopTester {
  public static async test(settings: PrestashopTestSettings): Promise<PrestashopTestResult> {
    const rawUrl = (settings.storeUrl || '').trim();
    const apiKey = (settings.apiKey || '').trim();

    const emptyChecks: PrestashopChecklist = {
      serverOnline: false,
      sslValid: false,
      apiActive: false,
      permissionsOk: false,
    };

    if (!rawUrl) {
      return {
        success: false,
        message: 'La URL de la tienda PrestaShop no puede estar vacía.',
        checks: emptyChecks,
      };
    }

    if (!apiKey) {
      return {
        success: false,
        message: 'Debe ingresar la clave Webservice de PrestaShop.',
        checks: emptyChecks,
      };
    }

    let parsedUrl = rawUrl;
    if (!parsedUrl.startsWith('http://') && !parsedUrl.startsWith('https://')) {
      parsedUrl = 'https://' + parsedUrl;
    }
    let cleanUrl = parsedUrl.replace(/\/+$/, '');
    cleanUrl = cleanUrl.replace(/\/api\/?$/i, '');

    let urlObj: URL;
    try {
      urlObj = new URL(cleanUrl);
    } catch {
      return {
        success: false,
        message: 'La URL de la tienda PrestaShop no es válida.',
        checks: emptyChecks,
      };
    }

    // Limpieza de credenciales incrustadas en URL
    urlObj.username = '';
    urlObj.password = '';
    cleanUrl = `${urlObj.origin}${urlObj.pathname}`.replace(/\/+$/, '').replace(/\/api\/?$/i, '');

    const isLocal = urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1';
    if (urlObj.protocol !== 'https:' && !isLocal) {
      return {
        success: false,
        message: 'La URL de la tienda debe utilizar HTTPS seguro (salvo en pruebas locales con localhost).',
        checks: emptyChecks,
      };
    }

    if (isBlockedSsrf(urlObj.hostname)) {
      return {
        success: false,
        message: 'Acceso denegado: el host de la tienda pertenece a una red privada o restringida (Anti-SSRF).',
        checks: emptyChecks,
      };
    }

    const endpoint = `${cleanUrl}/api?output_format=JSON`;
    const authHeader = 'Basic ' + Buffer.from(`${apiKey}:`).toString('base64');
    const start = Date.now();

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          Authorization: authHeader,
          Accept: 'application/json, text/xml;q=0.9, */*;q=0.8',
          'User-Agent': 'Bentian-ERP-Bridge/0.4.7',
        },
        redirect: 'manual',
        signal: AbortSignal.timeout(8000),
      });

      const latencyMs = Date.now() - start;
      const statusCode = response.status;

      let version = response.headers.get('psws-version') || response.headers.get('psws_version') || undefined;
      const responseText = await response.text();

      if (!version && responseText) {
        const vMatch =
          responseText.match(/psversion[":\s]+["']?([0-9.]+)/i) ||
          responseText.match(/version[":\s]+["']?([0-9.]+)/i) ||
          responseText.match(/<prestashop[^>]*\bversion="([^"]+)"/i);
        if (vMatch && vMatch[1]) {
          version = vMatch[1];
        }
      }

      if (response.ok) {
        let storeName: string | undefined = undefined;

        try {
          const json = JSON.parse(responseText);
          const s = json.api?.shops || json.shops;
          if (Array.isArray(s) && s.length > 0 && s[0]?.name) {
            storeName = s[0].name;
          }
        } catch {
          const nameMatch = responseText.match(/<name>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/name>/i);
          if (nameMatch && nameMatch[1]) {
            storeName = nameMatch[1].trim();
          }
        }

        if (!storeName) {
          try {
            const shopsRes = await fetch(`${cleanUrl}/api/shops?display=[id,name]&output_format=JSON`, {
              method: 'GET',
              headers: {
                Authorization: authHeader,
                Accept: 'application/json, text/xml',
                'User-Agent': 'Bentian-ERP-Bridge/0.4.7',
              },
              signal: AbortSignal.timeout(3500),
            });
            if (shopsRes.ok) {
              const shopsText = await shopsRes.text();
              try {
                const sJson = JSON.parse(shopsText);
                const sList = sJson.shops || sJson;
                if (Array.isArray(sList) && sList.length > 0 && sList[0]?.name) {
                  storeName = sList[0].name;
                }
              } catch {
                const sMatch = shopsText.match(/<name>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/name>/i);
                if (sMatch && sMatch[1]) {
                  storeName = sMatch[1].trim();
                }
              }
            }
          } catch {
            // Secondary lookup failed, non-fatal
          }
        }

        if (!storeName) {
          storeName = urlObj.hostname;
        }

        const versionStr = version ? ` (v${version})` : '';
        return {
          success: true,
          message: `Conexión exitosa con PrestaShop Webservices API${versionStr} (${latencyMs}ms)`,
          storeName,
          version,
          latencyMs,
          statusCode: 200,
          checks: {
            serverOnline: true,
            sslValid: true,
            apiActive: true,
            permissionsOk: true,
          },
        };
      }

      if (response.status === 401) {
        return {
          success: false,
          message: 'Error de autenticación (HTTP 401): Clave Webservice de PrestaShop incorrecta o inactiva.',
          version,
          latencyMs,
          statusCode: 401,
          checks: {
            serverOnline: true,
            sslValid: true,
            apiActive: true,
            permissionsOk: false,
          },
        };
      }

      if (response.status === 403) {
        return {
          success: false,
          message:
            'Acceso denegado (HTTP 403): La clave Webservice no tiene los permisos suficientes o el Servicio Web está desactivado.',
          version,
          latencyMs,
          statusCode: 403,
          checks: {
            serverOnline: true,
            sslValid: true,
            apiActive: true,
            permissionsOk: false,
          },
        };
      }

      if (response.status === 404) {
        return {
          success: false,
          message: `Endpoint de PrestaShop no encontrado en ${cleanUrl}/api (HTTP 404). Comprueba que el Servicio Web esté activado en Parámetros Avanzados > Web service.`,
          latencyMs,
          statusCode: 404,
          checks: {
            serverOnline: true,
            sslValid: true,
            apiActive: false,
            permissionsOk: false,
          },
        };
      }

      if (statusCode >= 500) {
        return {
          success: false,
          message: `Error interno del servidor PrestaShop (HTTP ${statusCode}). Revisa los registros de errores en tu hosting.`,
          latencyMs,
          statusCode,
          checks: {
            serverOnline: true,
            sslValid: true,
            apiActive: false,
            permissionsOk: false,
          },
        };
      }

      return {
        success: false,
        message: `Servidor PrestaShop respondió con código HTTP ${statusCode}`,
        latencyMs,
        statusCode,
        checks: {
          serverOnline: true,
          sslValid: true,
          apiActive: false,
          permissionsOk: false,
        },
      };
    } catch (err: unknown) {
      const latencyMs = Date.now() - start;
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        message: `Error de red al conectar con PrestaShop (${latencyMs}ms): ${msg}`,
        latencyMs,
        checks: {
          serverOnline: false,
          sslValid: cleanUrl.startsWith('https:') || isLocal,
          apiActive: false,
          permissionsOk: false,
        },
      };
    }
  }
}
