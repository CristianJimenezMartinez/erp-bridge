import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
  project_id: string;
}

// 1. Cargar clave de la cuenta de servicio desde vault/gsc-key.json
const keyPath = path.resolve(__dirname, '../vault/gsc-key.json');
if (!fs.existsSync(keyPath)) {
  console.error('❌ Error: No se encontró la clave en vault/gsc-key.json');
  process.exit(1);
}

const keyData: ServiceAccountKey = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

// 2. Generar JWT firmado con RS256 usando crypto nativo de Node.js
function generateSignedJwt(email: string, privateKey: string, scopes: string[]): string {
  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const payload = {
    iss: email,
    scope: scopes.join(' '),
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const base64UrlEncode = (obj: any) =>
    Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

  const encodedHeader = base64UrlEncode(header);
  const encodedPayload = base64UrlEncode(payload);
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsignedToken);
  const signature = signer
    .sign(privateKey, 'base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${unsignedToken}.${signature}`;
}

// 3. Obtener Access Token de Google
async function getAccessToken(): Promise<string> {
  const scopes = [
    'https://www.googleapis.com/auth/webmasters',
    'https://www.googleapis.com/auth/webmasters.readonly',
  ];

  const jwt = generateSignedJwt(keyData.client_email, keyData.private_key, scopes);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }).toString(),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Error obteniendo token de Google OAuth: ${res.status} - ${errorText}`);
  }

  const data: any = await res.json();
  return data.access_token;
}

// 4. Consultar sitios verificados
async function listSites(token: string) {
  const res = await fetch('https://www.googleapis.com/webmasters/v3/sites', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Error listando sitios: ${res.status} - ${await res.text()}`);
  }

  const data: any = await res.json();
  return data.siteEntry || [];
}

// 5. Consultar Sitemaps de un sitio
async function getSitemaps(token: string, siteUrl: string) {
  const encodedSite = encodeURIComponent(siteUrl);
  const res = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodedSite}/sitemaps`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    return { error: `HTTP ${res.status}: ${await res.text()}` };
  }

  const data: any = await res.json();
  return data.sitemap || [];
}

// 5.1 Enviar Sitemap a Google Search Console
async function submitSitemap(token: string, siteUrl: string, sitemapPath: string) {
  const encodedSite = encodeURIComponent(siteUrl);
  const encodedFeed = encodeURIComponent(sitemapPath);
  const res = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodedSite}/sitemaps/${encodedFeed}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 204 || res.ok) {
    return { success: true };
  }
  return { error: `HTTP ${res.status}: ${await res.text()}` };
}

// 5.2 Eliminar Sitemap erróneo de Google Search Console
async function deleteSitemap(token: string, siteUrl: string, sitemapPath: string) {
  const encodedSite = encodeURIComponent(siteUrl);
  const encodedFeed = encodeURIComponent(sitemapPath);
  const res = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodedSite}/sitemaps/${encodedFeed}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 204 || res.ok) {
    return { success: true };
  }
  return { error: `HTTP ${res.status}: ${await res.text()}` };
}

// 6. Inspeccionar URL en vivo (URL Inspection API)
async function inspectUrl(token: string, siteUrl: string, inspectionUrl: string) {
  const res = await fetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      siteUrl,
      inspectionUrl,
      languageCode: 'es-ES',
    }),
  });

  if (!res.ok) {
    return { error: `HTTP ${res.status}: ${await res.text()}` };
  }

  const data: any = await res.json();
  return data.inspectionResult || data;
}

// Ejecutor principal
async function runAudit() {
  console.log('========================================================');
  console.log('🔍 GOOGLE SEARCH CONSOLE AUDITOR — BENTIAN ERP BRIDGE');
  console.log('========================================================');
  console.log(`🔑 Autenticando con cuenta de servicio: ${keyData.client_email}`);

  const token = await getAccessToken();
  console.log('✅ Token OAuth 2.0 obtenido exitosamente de Google.\n');

  console.log('▶ [1/3] Listando propiedades con acceso en Search Console...');
  const sites = await listSites(token);

  if (sites.length === 0) {
    console.log('⚠️  No se encontraron propiedades vinculadas a esta cuenta de servicio.');
    console.log('👉 Asegúrate de añadir el correo en Ajustes -> Usuarios y permisos de Search Console.');
    return;
  }

  for (const site of sites) {
    console.log(`  ✓ Propiedad: ${site.siteUrl} (Permiso: ${site.permissionLevel})`);
  }

  // Auditar cada propiedad
  for (const site of sites) {
    console.log(`\n--------------------------------------------------------`);
    console.log(`🌐 Auditando propiedad: ${site.siteUrl}`);
    console.log(`--------------------------------------------------------`);

    console.log('▶ [Sitemaps]: Comprobando sitemaps registrados...');
    const sitemaps = await getSitemaps(token, site.siteUrl);
    if (Array.isArray(sitemaps)) {
      if (sitemaps.length === 0) {
        console.log('  ℹ No hay sitemaps enviados todavía en esta propiedad.');
      } else {
        for (const sm of sitemaps) {
          console.log(`  ✓ Sitemap: ${sm.path}`);
          console.log(`    - Última descarga de Google: ${sm.lastDownloaded || 'Pendiente'}`);
          console.log(`    - Advertencias: ${sm.warnings || 0} | Errores: ${sm.errors || 0}`);
          if (sm.contents) {
            for (const c of sm.contents) {
              console.log(`    - Tipo ${c.type}: ${c.submitted || 0} enviadas, ${c.indexed || 0} indexadas`);
            }
          }

          // Si el sitemap contiene caracteres erróneos (como %C3%A7 / ç) o errores, lo eliminamos automáticamente
          if (sm.path.includes('%C3%A7') || sm.path.includes('ç')) {
            console.log(`  🗑️ Detectado sitemap erróneo con carácter no válido (${sm.path}), eliminando vía API...`);
            const delRes = await deleteSitemap(token, site.siteUrl, sm.path);
            console.log(`    Resultado eliminación: ${JSON.stringify(delRes)}`);
          }
        }
      }

      // Asegurar el envío del sitemap canónico oficial
      let targetSitemap = '';
      if (site.siteUrl.includes('bridge.cristianjm.com')) {
        targetSitemap = 'https://bridge.cristianjm.com/sitemap.xml';
      } else if (site.siteUrl.includes('cristianjm.com')) {
        targetSitemap = 'https://cristianjm.com/sitemap.xml';
      }

      if (targetSitemap) {
        console.log(`  🚀 Enviando/actualizando sitemap oficial: ${targetSitemap}...`);
        const subRes = await submitSitemap(token, site.siteUrl, targetSitemap);
        console.log(`    Resultado envío: ${JSON.stringify(subRes)}`);
      }
    } else {
      console.log(`  ⚠️ Error consultando sitemaps: ${JSON.stringify(sitemaps)}`);
    }

    // Si es bridge.cristianjm.com, inspeccionar URLs clave
    if (site.siteUrl.includes('bridge.cristianjm.com')) {
      const urlsToInspect = [
        'https://bridge.cristianjm.com/',
        'https://bridge.cristianjm.com/beta/',
        'https://bridge.cristianjm.com/factusol-verifactu-woocommerce/',
        'https://bridge.cristianjm.com/factusol-api-rest/',
        'https://bridge.cristianjm.com/factusol-tallas-colores/',
        'https://bridge.cristianjm.com/factusol-shopify/',
        'https://bridge.cristianjm.com/factusol-ferreterias-suministros/',
        'https://bridge.cristianjm.com/factusol-recargo-equivalencia/',
        'https://bridge.cristianjm.com/conector-factusol/',
        'https://bridge.cristianjm.com/conector-factusol/madrid/',
        'https://bridge.cristianjm.com/alternativa-delsol-conecta/',
      ];

      console.log(`\n▶ [URL Inspection]: Inspeccionando ${urlsToInspect.length} URLs clave...`);
      for (const url of urlsToInspect) {
        console.log(`\n  🔎 Inspeccionando: ${url}`);
        const result = await inspectUrl(token, site.siteUrl, url);
        if (result.error) {
          console.log(`    ⚠️ Respuesta: ${result.error}`);
        } else if (result.indexStatusResult) {
          const idx = result.indexStatusResult;
          console.log(`    * Veredicto de Indexación: ${idx.verdict || 'DESCONOCIDO'}`);
          console.log(`    * Estado de Cobertura: ${idx.coverageState || 'No disponible'}`);
          console.log(`    * Rastreado por: ${idx.crawledAs || 'Aún no rastreado'}`);
          console.log(`    * Último rastreo: ${idx.lastCrawlTime || 'Nunca'}`);
          console.log(`    * Estado de Rastreo: ${idx.pageFetchState || 'N/A'}`);
          console.log(`    * Indexación permitida (Robots): ${idx.indexingState || 'N/A'}`);
        } else {
          console.log(`    * Datos: ${JSON.stringify(result)}`);
        }
      }
    }
  }

  console.log('\n========================================================');
  console.log('✅ AUDITORÍA DE GOOGLE SEARCH CONSOLE COMPLETADA');
  console.log('========================================================');
}

runAudit().catch((err) => {
  console.error('❌ Error ejecutando auditoría GSC:', err);
  process.exit(1);
});
