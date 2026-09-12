import { WooCommerceTestResult } from './channel.types';

export class WooCommerceTester {
  public static async test(settings: {
    storeUrl: string;
    consumerKey: string;
    consumerSecret: string;
  }): Promise<WooCommerceTestResult> {
    const rawUrl = (settings.storeUrl || '').trim();
    if (!rawUrl) {
      return { success: false, message: 'La URL de la tienda no puede estar vacía.' };
    }
    if (!settings.consumerKey || !settings.consumerSecret) {
      return { success: false, message: 'Debe ingresar Consumer Key y Consumer Secret.' };
    }

    const cleanUrl = rawUrl.replace(/\/+$/, '');
    const endpoint = `${cleanUrl}/wp-json/wc/v3/system_status`;
    const authHeader = 'Basic ' + Buffer.from(`${settings.consumerKey.trim()}:${settings.consumerSecret.trim()}`).toString('base64');
    const start = Date.now();

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          Authorization: authHeader,
          'User-Agent': 'Bentian-ERP-Bridge/0.1.5',
        },
        signal: AbortSignal.timeout(8000),
      });

      const latencyMs = Date.now() - start;

      if (response.ok) {
        const data = (await response.json()) as any;
        const storeName = data?.environment?.site_title || cleanUrl;
        return {
          success: true,
          message: `Conexión exitosa con WooCommerce (${latencyMs}ms)`,
          latencyMs,
          storeName,
        };
      }

      if (response.status === 401 || response.status === 403) {
        return {
          success: false,
          message: `Error de autenticación (HTTP ${response.status}): Consumer Key o Secret incorrectos o sin permisos de lectura/escritura.`,
          latencyMs,
        };
      }

      if (response.status === 404) {
        // Fallback testing /wp-json/wc/v3/products
        const pResponse = await fetch(`${cleanUrl}/wp-json/wc/v3/products?per_page=1`, {
          method: 'GET',
          headers: { Authorization: authHeader },
          signal: AbortSignal.timeout(6000),
        });
        if (pResponse.ok) {
          const totalHeader = pResponse.headers.get('x-wp-total');
          const productCount = totalHeader ? parseInt(totalHeader, 10) : undefined;
          return {
            success: true,
            message: `Conexión verificada con catálogo (${latencyMs}ms)`,
            latencyMs,
            productCount,
          };
        }
        return {
          success: false,
          message: `Endpoint de WooCommerce no encontrado en ${cleanUrl}. Asegúrese de que WooCommerce y los enlaces permanentes (Permalinks) estén activos.`,
          latencyMs,
        };
      }

      return {
        success: false,
        message: `Servidor respondió con código HTTP ${response.status}`,
        latencyMs,
      };
    } catch (err: unknown) {
      const latencyMs = Date.now() - start;
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: `Error de red al conectar con WooCommerce (${latencyMs}ms): ${msg}` };
    }
  }
}
