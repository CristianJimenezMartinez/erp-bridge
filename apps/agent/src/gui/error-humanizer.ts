/**
 * Bentian ERP Bridge — Centralized Human Error Catalog
 * Translates cryptic and technical errors into actionable, user-friendly guidance
 */

export type TargetTab =
  | 'overview'
  | 'factusol'
  | 'channel'
  | 'sync'
  | 'history'
  | 'logs'
  | 'license';

export interface HumanizedError {
  code: string;
  title: string;
  message: string;
  suggestion: string;
  actionLabel: string;
  targetTab: TargetTab;
  targetInputId?: string;
  helpUrl?: string;
  snippet?: string;
}

interface ErrorPatternRule {
  code: string;
  pattern: RegExp;
  build: (rawMessage: string) => HumanizedError;
}

export const ERROR_RULES: ErrorPatternRule[] = [
  // 1. Factusol OLEDB Missing / 0x80004005
  {
    code: 'ERR_OLEDB_MISSING',
    pattern: /0x80004005|Microsoft\.ACE\.OLEDB|proveedor no registrado|no está registrado en el equipo local/i,
    build: () => ({
      code: 'ERR_OLEDB_MISSING',
      title: 'Controlador Access Database Engine no instalado',
      message: 'Windows no dispone del controlador de Microsoft necesario para leer archivos de base de datos Factusol (.accdb / .mdb).',
      suggestion: 'Descarga e instala gratis el controlador oficial "Microsoft Access Database Engine 2016 Redistributable (64 bits)" desde la web de Microsoft.',
      actionLabel: 'Ir a configuración de Factusol',
      targetTab: 'factusol',
      targetInputId: 'input-factusol-db',
      helpUrl: 'https://bridge.cristianjm.com/docs/factusol-oledb-guide/',
    }),
  },

  // 2. Factusol File Not Found / Invalid Path
  {
    code: 'ERR_FACTUSOL_FILE_NOT_FOUND',
    pattern: /archivo no encontrado|ruta no válida|no existe el archivo|ENOENT|no se encontró la base de datos|fichero no existe|no se detectó factusol/i,
    build: () => ({
      code: 'ERR_FACTUSOL_FILE_NOT_FOUND',
      title: 'Base de datos de Factusol no encontrada',
      message: 'No se pudo localizar el archivo de base de datos en la ruta indicada. Es posible que el archivo haya sido movido o el disco/NAS no esté accesible.',
      suggestion: 'Pulsa en "📁 Examinar en Windows" para buscar y seleccionar directamente tu archivo .accdb o .mdb en tu equipo o unidad de red.',
      actionLabel: 'Seleccionar base de datos de Factusol',
      targetTab: 'factusol',
      targetInputId: 'input-factusol-db',
      helpUrl: 'https://bridge.cristianjm.com/docs/factusol-setup/',
    }),
  },

  // 3. Factusol Exclusive Lock / .ldb / .laccdb
  {
    code: 'ERR_FACTUSOL_EXCLUSIVE_LOCK',
    pattern: /\.l(acc)?db|bloqueo|en modo exclusivo|exclusively locked|otro usuario está intentando|detuvo el proceso porque otro/i,
    build: () => ({
      code: 'ERR_FACTUSOL_EXCLUSIVE_LOCK',
      title: 'Base de datos bloqueada por otro usuario o proceso',
      message: 'Factusol o un usuario de la red tiene la base de datos abierta en modo exclusivo o con un archivo de bloqueo (.laccdb/.ldb) temporal.',
      suggestion: 'Pide a los demás puestos que guarden su trabajo y cierren Factusol momentáneamente, o espera unos segundos a que finalice la operación. Bentian reintentará automáticamente.',
      actionLabel: 'Revisar estado de Factusol',
      targetTab: 'factusol',
      targetInputId: 'btn-test-fact',
      helpUrl: 'https://bridge.cristianjm.com/docs/factusol-locking/',
    }),
  },

  // 4. Web Channel 401 Unauthorized / Authorization Headers Blocked
  {
    code: 'ERR_WEB_AUTH_BLOCKED',
    pattern: /401|unauthorized|cabeceras? de autorización bloqueadas|no autorizado|claves? inválidas?|signature_invalid/i,
    build: () => ({
      code: 'ERR_WEB_AUTH_BLOCKED',
      title: 'Cabeceras de autorización bloqueadas en tu servidor web',
      message: 'Tu servidor web (Apache, LiteSpeed, Plesk, cPanel) filtra la cabecera "Authorization" por una directiva de seguridad del hosting antes de llegar a PHP.',
      suggestion: 'Añade estas 2 líneas al principio de tu archivo .htaccess en la raíz de tu web:\n\nSetEnvIf Authorization "(.*)" HTTP_AUTHORIZATION=$1\nRewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]\n\nO comprueba que la clave del conector web coincide exactamente.',
      actionLabel: 'Revisar claves del canal web',
      targetTab: 'channel',
      targetInputId: 'input-wc-key',
      helpUrl: 'https://bridge.cristianjm.com/docs/hosting-auth-headers/',
      snippet: 'SetEnvIf Authorization "(.*)" HTTP_AUTHORIZATION=$1\nRewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]',
    }),
  },

  // 5. WooCommerce 403 Forbidden / Read-Only Keys
  {
    code: 'ERR_WOO_PERMISSIONS',
    pattern: /403|forbidden|claves? de solo lectura|permisos insuficientes|woocommerce_rest_cannot_edit|read-only/i,
    build: () => ({
      code: 'ERR_WOO_PERMISSIONS',
      title: 'Permisos insuficientes en las claves de WooCommerce',
      message: 'Las claves de la API REST que has configurado tienen permisos de "Solo Lectura". Bentian requiere permisos de "Lectura y Escritura" para actualizar stock y pedidos.',
      suggestion: 'En WordPress, ve a WooCommerce > Ajustes > Avanzado > REST API. Edita la clave de Bentian y cambia el permiso a "Lectura y Escritura".',
      actionLabel: 'Comprobar credenciales de WooCommerce',
      targetTab: 'channel',
      targetInputId: 'input-wc-key',
      helpUrl: 'https://bridge.cristianjm.com/docs/woocommerce-api-keys/',
    }),
  },

  // 6. Network Connection Failed / Refused / Timeout
  {
    code: 'ERR_WEB_CONNECTION_FAILED',
    pattern: /ECONNREFUSED|ETIMEDOUT|no se pudo conectar|ENOTFOUND|getaddrinfo|Failed to fetch|NetworkError|host no alcanzable|timeout/i,
    build: () => ({
      code: 'ERR_WEB_CONNECTION_FAILED',
      title: 'No se pudo conectar con la tienda web',
      message: 'La dirección web introducida no responde, el servidor está fuera de servicio o hay una errata en la URL configurada.',
      suggestion: 'Verifica que tu tienda abre correctamente en tu navegador y asegúrate de haber escrito "https://" al inicio sin barras al final.',
      actionLabel: 'Corregir dirección de la tienda web',
      targetTab: 'channel',
      targetInputId: 'input-wc-url',
      helpUrl: 'https://bridge.cristianjm.com/docs/network-troubleshooting/',
    }),
  },

  // 7. License Expired / Trial Concluded
  {
    code: 'ERR_LICENSE_EXPIRED',
    pattern: /EXPIRED|periodo de prueba finalizado|beta finalizada|licencia caducada|trial expired|periodo de evaluación/i,
    build: () => ({
      code: 'ERR_LICENSE_EXPIRED',
      title: 'Periodo de prueba de 60 días concluido',
      message: '¡Gracias por probar Bentian! El periodo de evaluación gratuita de la beta pública ha concluido en este ordenador.',
      suggestion: 'Para seguir sincronizando tu Factusol con tu tienda web de forma desatendida, activa tu Plan Fundador con descuento vitalicio del 30%.',
      actionLabel: 'Ir a activar o renovar licencia',
      targetTab: 'license',
      targetInputId: 'input-lic-key',
      helpUrl: 'https://bridge.cristianjm.com/dashboard/?action=upgrade&plan=founder_annual',
    }),
  },

  // 8. License Invalid Key
  {
    code: 'ERR_LICENSE_INVALID',
    pattern: /INVALID_KEY|clave no encontrada|clave no válida|formato de clave|invalid license|clave no reconocida/i,
    build: () => ({
      code: 'ERR_LICENSE_INVALID',
      title: 'Clave de licencia no reconocida',
      message: 'La clave de licencia introducida no tiene el formato estándar o contiene caracteres incorrectos.',
      suggestion: 'Las claves oficiales de Bentian comienzan con "EB-" (ejemplo: EB-PRO-XXXXX) y no deben incluir espacios en blanco.',
      actionLabel: 'Introducir clave de licencia',
      targetTab: 'license',
      targetInputId: 'input-lic-key',
      helpUrl: 'https://bridge.cristianjm.com/beta/',
    }),
  },

  // 9. Windows Script Host / cscript.exe Blocked by EDR / Antivirus
  {
    code: 'ERR_CSCRIPT_BLOCKED',
    pattern: /cscript(\.exe)?|windows script host|antivirus|EDR|WScript\.Shell|bloqueado por directiva/i,
    build: () => ({
      code: 'ERR_CSCRIPT_BLOCKED',
      title: 'Windows Script Host (cscript.exe) bloqueado por antivirus o EDR',
      message: 'El sistema de seguridad de Windows o tu antivirus ha bloqueado el intérprete local "cscript.exe" necesario para la lectura OLEDB de Factusol.',
      suggestion: 'Añade el ejecutable Bentian Agent o el proceso "cscript.exe" a las exclusiones de tu antivirus (Windows Defender, Kaspersky, SentinelOne, etc.).',
      actionLabel: 'Ver diagnóstico del sistema',
      targetTab: 'overview',
      targetInputId: 'pf-alert-box',
      helpUrl: 'https://bridge.cristianjm.com/docs/antivirus-exclusions/',
    }),
  },

  // 10. Universal Bridge Endpoint Not Found (404)
  {
    code: 'ERR_ENDPOINT_NOT_FOUND',
    pattern: /404|erp-bridge-endpoint\.php|endpoint no encontrado|archivo conector no encontrado/i,
    build: () => ({
      code: 'ERR_ENDPOINT_NOT_FOUND',
      title: 'Archivo erp-bridge-endpoint.php no detectado en tu web',
      message: 'El servidor web devolvió un error 404. El archivo del conector no está subido a la carpeta raíz de tu tienda online o la URL no es correcta.',
      suggestion: 'Descarga "erp-bridge-endpoint.php" desde la pestaña Canal Web y súbelo a la carpeta pública de tu hosting (por ejemplo public_html o httpdocs).',
      actionLabel: 'Configurar Canal Web Universal',
      targetTab: 'channel',
      targetInputId: 'input-universal-url',
      helpUrl: 'https://bridge.cristianjm.com/docs/universal-bridge-install/',
    }),
  },

  // 11. SSL Certificate Error
  {
    code: 'ERR_SSL_INVALID',
    pattern: /SSL|CERT_|self[- ]signed|DEPTH_ZERO_SELF_SIGNED_CERT|certificado no válido/i,
    build: () => ({
      code: 'ERR_SSL_INVALID',
      title: 'Certificado de seguridad SSL de la tienda no válido',
      message: 'No se pudo establecer una conexión HTTPS cifrada de confianza porque el certificado SSL de tu web ha caducado o no está configurado.',
      suggestion: 'Comprueba y renueva el certificado SSL gratuito (Let\'s Encrypt o cPanel) en el panel de control de tu proveedor de hosting.',
      actionLabel: 'Revisar dirección de la web',
      targetTab: 'channel',
      targetInputId: 'input-universal-url',
      helpUrl: 'https://bridge.cristianjm.com/docs/ssl-setup/',
    }),
  },
];

/**
 * Humanizes any raw error, error object, or string into a structured HumanizedError
 */
export function humanizeError(rawError: unknown): HumanizedError {
  let rawMessage = '';

  if (typeof rawError === 'string') {
    rawMessage = rawError;
  } else if (rawError && typeof rawError === 'object') {
    const obj = rawError as Record<string, unknown>;
    rawMessage = String(obj.message || obj.error || obj.code || obj.status || JSON.stringify(obj));
  } else {
    rawMessage = String(rawError || '');
  }

  for (const rule of ERROR_RULES) {
    if (rule.pattern.test(rawMessage)) {
      return rule.build(rawMessage);
    }
  }

  // Fallback for general errors
  const cleanSnippet = rawMessage.replace(/\s+/g, ' ').trim().substring(0, 140);
  return {
    code: 'ERR_INTERNAL_GENERIC',
    title: 'Incidencia en la operación',
    message: cleanSnippet ? `Se ha producido una incidencia: "${cleanSnippet}"` : 'Se ha producido una incidencia técnica interna.',
    suggestion: 'Revisa la configuración del apartado correspondiente o consulta el registro de eventos técnicos para obtener más detalles.',
    actionLabel: 'Ver registro de eventos técnicos',
    targetTab: 'logs',
    targetInputId: 'full-logs-panel',
    helpUrl: 'https://bridge.cristianjm.com/docs/',
  };
}
