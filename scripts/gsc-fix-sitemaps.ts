import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
  project_id: string;
}

const keyPath = path.resolve(__dirname, '../vault/gsc-key.json');
const keyData: ServiceAccountKey = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

function generateSignedJwt(email: string, privateKey: string, scopes: string[]): string {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: email,
    scope: scopes.join(' '),
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };
  const b64 = (obj: any) => Buffer.from(JSON.stringify(obj)).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const unsigned = `${b64(header)}.${b64(payload)}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsigned);
  const sig = signer.sign(privateKey, 'base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${unsigned}.${sig}`;
}

async function getAccessToken(): Promise<string> {
  const scopes = ['https://www.googleapis.com/auth/webmasters'];
  const jwt = generateSignedJwt(keyData.client_email, keyData.private_key, scopes);
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }).toString(),
  });
  const data: any = await res.json();
  return data.access_token;
}

async function submitSitemap(token: string, siteUrl: string, sitemapPath: string) {
  const encodedSite = encodeURIComponent(siteUrl);
  const encodedFeed = encodeURIComponent(sitemapPath);
  const res = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodedSite}/sitemaps/${encodedFeed}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  });
  return { status: res.status, ok: res.status === 204 || res.ok };
}

async function deleteSitemap(token: string, siteUrl: string, sitemapPath: string) {
  const encodedSite = encodeURIComponent(siteUrl);
  const encodedFeed = encodeURIComponent(sitemapPath);
  const res = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodedSite}/sitemaps/${encodedFeed}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return { status: res.status, ok: res.status === 204 || res.ok };
}

async function fix() {
  const token = await getAccessToken();
  const siteUrl = 'https://bridge.cristianjm.com/';

  console.log('>>> [GSC API] Eliminando posible sitemap erróneo itemap-docs.xml...');
  const delRes = await deleteSitemap(token, siteUrl, 'https://bridge.cristianjm.com/itemap-docs.xml');
  console.log('    Resultado eliminación itemap-docs.xml:', delRes);

  console.log('>>> [GSC API] Enviando sitemap oficial de documentación: sitemap-docs.xml...');
  const subDocs = await submitSitemap(token, siteUrl, 'https://bridge.cristianjm.com/sitemap-docs.xml');
  console.log('    Resultado envío sitemap-docs.xml:', subDocs);

  console.log('>>> [GSC API] Re-enviando sitemap-index.xml...');
  const subIndex = await submitSitemap(token, siteUrl, 'https://bridge.cristianjm.com/sitemap-index.xml');
  console.log('    Resultado envío sitemap-index.xml:', subIndex);

  console.log('>>> [GSC API] Re-enviando sitemap-main.xml...');
  const subMain = await submitSitemap(token, siteUrl, 'https://bridge.cristianjm.com/sitemap-main.xml');
  console.log('    Resultado envío sitemap-main.xml:', subMain);

  console.log('>>> [GSC API] Re-enviando sitemap-ciudades.xml...');
  const subCiudades = await submitSitemap(token, siteUrl, 'https://bridge.cristianjm.com/sitemap-ciudades.xml');
  console.log('    Resultado envío sitemap-ciudades.xml:', subCiudades);

  console.log('>>> [GSC API] Re-enviando sitemap.xml principal...');
  const subSitemap = await submitSitemap(token, siteUrl, 'https://bridge.cristianjm.com/sitemap.xml');
  console.log('    Resultado envío sitemap.xml:', subSitemap);

  console.log('\n>>> [GSC API] Consultando sitemaps registrados actualmente en Google Search Console...');
  const encodedSite = encodeURIComponent(siteUrl);
  const listRes = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodedSite}/sitemaps`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const listData: any = await listRes.json();
  const activeSitemaps = listData.sitemap || [];
  console.log(`Total sitemaps activos en GSC: ${activeSitemaps.length}`);
  for (const sm of activeSitemaps) {
    console.log(`  ✓ ${sm.path}`);
    console.log(`    - Última descarga: ${sm.lastDownloaded || 'Pendiente (en cola de procesamiento de Google)'}`);
    console.log(`    - Errores: ${sm.errors || 0} | Advertencias: ${sm.warnings || 0}`);
  }
}

fix().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
