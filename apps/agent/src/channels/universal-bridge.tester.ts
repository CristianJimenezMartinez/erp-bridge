import { UniversalBridgeTestResult } from './channel.types';

export class UniversalBridgeTester {
  public static async test(settings: {
    storeUrl: string;
    secretKey?: string;
  }): Promise<UniversalBridgeTestResult> {
    const rawUrl = (settings.storeUrl || '').trim();
    if (!rawUrl) {
      return {
        success: false,
        message: 'Por favor, ingrese la URL de su sitio web.',
        checks: { serverOnline: false, sslValid: false, endpointFound: false, databaseReady: false },
      };
    }

    let parsedUrl = rawUrl;
    if (!parsedUrl.startsWith('http://') && !parsedUrl.startsWith('https://')) {
      parsedUrl = 'https://' + parsedUrl;
    }
    const cleanBaseUrl = parsedUrl.replace(/\/+$/, '');

    const checks = {
      serverOnline: false,
      sslValid: false,
      endpointFound: false,
      databaseReady: false,
    };

    let serverDetails: any = { url: cleanBaseUrl };

    // 1. Check server online
    try {
      const pingRes = await fetch(cleanBaseUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(6000),
      }).catch(() => null);

      if (pingRes && (pingRes.status < 500 || pingRes.status === 404)) {
        checks.serverOnline = true;
        serverDetails.httpStatus = pingRes.status;
        serverDetails.serverSoftware = pingRes.headers.get('server') || 'Detectado';
      } else {
        const getRes = await fetch(cleanBaseUrl, {
          method: 'GET',
          signal: AbortSignal.timeout(6000),
        }).catch(() => null);
        if (getRes && getRes.status < 500) {
          checks.serverOnline = true;
          serverDetails.httpStatus = getRes.status;
        }
      }
    } catch {}

    // 2. Check SSL
    if (cleanBaseUrl.startsWith('https://')) {
      try {
        await fetch(cleanBaseUrl, {
          method: 'HEAD',
          signal: AbortSignal.timeout(5000),
        });
        checks.sslValid = true;
        serverDetails.protocol = 'HTTPS (TLS Cifrado)';
      } catch (sslErr: any) {
        if (checks.serverOnline) {
          checks.sslValid = true;
          serverDetails.protocol = 'HTTPS (Certificado Activo)';
        }
      }
    } else {
      serverDetails.protocol = 'HTTP (No seguro)';
    }

    // 3 & 4. Check endpoint & database
    const endpointCandidates = [
      `${cleanBaseUrl}/erp-bridge-endpoint.php`,
      `${cleanBaseUrl}/erp-bridge-endpoint/erp-bridge-endpoint.php`,
      `${cleanBaseUrl}/api/erp-bridge-endpoint.php`,
      `${cleanBaseUrl}/bridge/erp-bridge-endpoint.php`,
    ];

    for (const ep of endpointCandidates) {
      try {
        const pingUrl = `${ep}?action=ping${settings.secretKey ? `&secret=${encodeURIComponent(settings.secretKey)}` : ''}`;
        const epRes = await fetch(pingUrl, {
          method: 'GET',
          signal: AbortSignal.timeout(6000),
        });

        const contentType = (epRes.headers.get('content-type') || '').toLowerCase();
        const rawText = await epRes.text();

        let json: any = null;
        try {
          json = JSON.parse(rawText);
        } catch {}

        if (json && (json.status === 'ok' || json.success === true || json.service)) {
          checks.endpointFound = true;
          serverDetails.endpointUrl = ep;
          serverDetails.version = json.version || '1.0.0';
          const isDbOk =
            json.databaseConnected ||
            json.dbConfigured ||
            (json.database && json.database.connected);

          if (isDbOk) {
            checks.databaseReady = true;
            serverDetails.articlesInShop =
              json.articleCount || json.database?.articleCount || 0;
            serverDetails.dbName =
              json.database?.database || json.databaseName || 'MariaDB';
          } else {
            serverDetails.dbError =
              json.database?.error ||
              json.error ||
              'Credenciales de base de datos incorrectas o EB_DB_NAME no configurado.';
          }
          break;
        } else if (epRes.ok && (contentType.includes('text/html') || rawText.includes('<!DOCTYPE html>') || rawText.includes('<html'))) {
          // Detectamos que el servidor responde 200 con HTML (SPA Angular/Vue o redirección Nginx)
          serverDetails.htmlFallbackDetected = true;
          serverDetails.candidateHtmlUrl = ep;
        } else if (epRes.status === 401 || epRes.status === 403) {
          checks.endpointFound = true;
          serverDetails.endpointUrl = ep;
          serverDetails.authError = 'Clave secreta incorrecta o no configurada en el servidor.';
          break;
        }
      } catch {}
    }

    let msg = 'Comprobación finalizada.';
    if (!checks.serverOnline) {
      msg = 'No pudimos conectar con la web. Revisa que el dominio esté bien escrito y accesible.';
    } else if (!checks.endpointFound) {
      if (serverDetails.htmlFallbackDetected) {
        msg = 'El servidor web responde pero devuelve una página HTML de Angular en lugar de ejecutar PHP. PHP no está activo en este subdominio o la regla de Nginx lo intercepta. Sube erp-bridge-endpoint.php a suministrosrubio.com (donde PHP está activo) o activa PHP en el subdominio.';
      } else {
        msg = 'Servidor web detectado, pero aún no se encuentra el archivo erp-bridge-endpoint.php. Súbelo a la carpeta pública de tu hosting.';
      }
    } else if (!checks.databaseReady) {
      msg = `Conector detectado, pero la base de datos MariaDB no está configurada o fallaron las credenciales${serverDetails.dbError ? `: ${serverDetails.dbError}` : '.'}`;
    } else {
      msg = `¡Conexión excelente! Web online, SSL activo y base de datos MariaDB lista (${serverDetails.articlesInShop || 0} artículos sincronizados).`;
    }

    return {
      success: checks.serverOnline && checks.sslValid && checks.endpointFound && checks.databaseReady,
      message: msg,
      checks,
      details: serverDetails,
    };
  }
}
