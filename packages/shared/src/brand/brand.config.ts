export interface BrandConfig {
  /** Nombre comercial de la plataforma */
  brandName: string;
  /** Identificador de aplicación para Windows / OS */
  brandAppId: string;
  /** Carpeta en %APPDATA% donde se almacenan configuraciones y logs */
  brandDataFolder: string;
  /** Puerto HTTP local inmutable para la GUI y health check (Regla 10: Anti Port-Hopping) */
  readonly brandPort: 39281;
  /** URL canónica del servidor cloud central */
  cloudUrl: string;
}

export const BRAND_CONFIG: BrandConfig = {
  brandName: (typeof process !== 'undefined' && process.env?.BRAND_NAME) || 'Bentian',
  brandAppId: (typeof process !== 'undefined' && process.env?.BRAND_APP_ID) || 'Bentian.ERPBridge',
  brandDataFolder: (typeof process !== 'undefined' && process.env?.BRAND_DATA_FOLDER) || 'Bentian Agent',
  brandPort: 39281,
  cloudUrl: (typeof process !== 'undefined' && process.env?.BRAND_CLOUD_URL) || 'https://bridge.cristianjm.com',
};

/**
 * Obtiene la configuración de marca activa resolviendo variables de entorno
 * dinámicamente si han variado en tiempo de ejecución.
 */
export function getBrandConfig(): BrandConfig {
  return {
    brandName: (typeof process !== 'undefined' && process.env?.BRAND_NAME) || BRAND_CONFIG.brandName,
    brandAppId: (typeof process !== 'undefined' && process.env?.BRAND_APP_ID) || BRAND_CONFIG.brandAppId,
    brandDataFolder: (typeof process !== 'undefined' && process.env?.BRAND_DATA_FOLDER) || BRAND_CONFIG.brandDataFolder,
    brandPort: 39281,
    cloudUrl: (typeof process !== 'undefined' && process.env?.BRAND_CLOUD_URL) || BRAND_CONFIG.cloudUrl,
  };
}
