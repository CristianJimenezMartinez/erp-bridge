import { ShopifyLocation, ShopifyTestResult, ShopifyTestSettings } from './channel.types';

function isBlockedSsrf(hostname: string): boolean {
  const h = hostname.toLowerCase().trim();
  if (
    h === '169.254.169.254' ||
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h === '0.0.0.0' ||
    h === '::1' ||
    h.endsWith('.internal') ||
    h.endsWith('.local') ||
    h.endsWith('.onion')
  ) {
    return true;
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
  }
  return false;
}

export class ShopifyTester {
  public static normalizeShopUrl(rawInput: string): {
    success: boolean;
    cleanSubdomain?: string;
    fullUrl?: string;
    error?: string;
  } {
    const raw = (rawInput || '').trim();
    if (!raw) {
      return { success: false, error: 'El subdominio o URL de la tienda Shopify no puede estar vacío.' };
    }

    // SSRF Check on raw input hostname
    let hostToCheck = raw;
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      try {
        const u = new URL(raw);
        hostToCheck = u.hostname;
      } catch {
        return { success: false, error: 'La URL de Shopify ingresada no es válida.' };
      }
    } else {
      hostToCheck = raw.split('/')[0]!.split(':')[0]!;
    }

    if (isBlockedSsrf(hostToCheck)) {
      return {
        success: false,
        error: 'Acceso denegado: el host de la tienda pertenece a una red privada o restringida (Anti-SSRF).',
      };
    }

    // Extraer subdominio limpio
    const cleanSubdomain = raw
      .replace(/^https?:\/\//i, '')
      .replace(/\.myshopify\.com.*$/i, '')
      .replace(/\/.*$/, '')
      .trim();

    if (isBlockedSsrf(cleanSubdomain)) {
      return {
        success: false,
        error: 'Acceso denegado: el host de la tienda pertenece a una red privada o restringida (Anti-SSRF).',
      };
    }

    // Validar formato del subdominio (letras, números y guiones)
    const subdomainRegex = /^[a-zA-Z0-9][-a-zA-Z0-9]*[a-zA-Z0-9]$|^[a-zA-Z0-9]+$/;
    if (!subdomainRegex.test(cleanSubdomain)) {
      return {
        success: false,
        error: 'El subdominio de Shopify no es válido. Debe contener solo caracteres alfanuméricos y guiones (ej: mi-tienda).',
      };
    }

    const fullUrl = `https://${cleanSubdomain}.myshopify.com`;
    return { success: true, cleanSubdomain, fullUrl };
  }

  public static async test(settings: ShopifyTestSettings): Promise<ShopifyTestResult> {
    const rawSubdomain = (settings.shopSubdomain || '').trim();
    const token = (settings.accessToken || '').trim();

    if (!rawSubdomain) {
      return { success: false, message: 'El subdominio o URL de la tienda Shopify no puede estar vacío.' };
    }

    if (!token) {
      return { success: false, message: 'Debe ingresar el Access Token de la API de Shopify (shpat_...).' };
    }

    const norm = this.normalizeShopUrl(rawSubdomain);
    if (!norm.success || !norm.cleanSubdomain || !norm.fullUrl) {
      return { success: false, message: norm.error || 'Subdominio de Shopify no válido.' };
    }

    const apiVersion = settings.apiVersion || '2026-01';
    const endpointUrl = `${norm.fullUrl}/admin/api/${apiVersion}/graphql.json`;
    const query = `{ shop { id name myshopifyDomain } locations(first: 5) { edges { node { id name } } } }`;

    const start = Date.now();
    try {
      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Shopify-Access-Token': token,
          'User-Agent': 'Bentian-ERP-Bridge/0.3.8',
        },
        body: JSON.stringify({ query }),
        signal: AbortSignal.timeout(8000),
      });

      const durationMs = Date.now() - start;

      if (response.status === 401 || response.status === 403) {
        return {
          success: false,
          message: `Error de autenticación en Shopify (HTTP ${response.status}): Access Token incorrecto o sin permisos de API.`,
          durationMs,
        };
      }

      if (response.status === 404) {
        return {
          success: false,
          message: `Tienda Shopify no encontrada en ${norm.fullUrl}. Comprueba el subdominio.`,
          durationMs,
        };
      }

      if (!response.ok) {
        return {
          success: false,
          message: `Servidor de Shopify respondió con código HTTP ${response.status}`,
          durationMs,
        };
      }

      const json = (await response.json()) as any;

      if (json.errors && json.errors.length > 0) {
        const errorMessages = json.errors.map((e: any) => e.message).join('; ');
        return {
          success: false,
          message: `Error en consulta GraphQL de Shopify: ${errorMessages}`,
          durationMs,
        };
      }

      const shop = json.data?.shop;
      const locationEdges = json.data?.locations?.edges || [];
      const locations: ShopifyLocation[] = locationEdges.map((edge: any) => ({
        id: edge.node.id,
        name: edge.node.name,
      }));

      const shopName = shop?.name || norm.cleanSubdomain;
      const myshopifyDomain = shop?.myshopifyDomain || `${norm.cleanSubdomain}.myshopify.com`;

      return {
        success: true,
        message: `Conexión exitosa con Shopify (${shopName})`,
        durationMs,
        shopName,
        myshopifyDomain,
        locations,
      };
    } catch (err: unknown) {
      const durationMs = Date.now() - start;
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        message: `Error de red al conectar con Shopify (${durationMs}ms): ${msg}`,
        durationMs,
      };
    }
  }
}
