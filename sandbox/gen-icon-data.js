const fs = require('fs');
const path = require('path');

const svg = fs.readFileSync('apps/agent/src/gui/assets/icon.svg', 'utf8');
const icoBytes = fs.readFileSync('apps/agent/src/gui/assets/icon.ico');
const icoBase64 = icoBytes.toString('base64');

const manifest = JSON.stringify({
  name: "Bentian ERP Bridge",
  short_name: "Bentian",
  description: "Puente Local-First entre Factusol y E-commerce",
  start_url: "/",
  display: "standalone",
  background_color: "#0d0d11",
  theme_color: "#0d0d11",
  icons: [
    {
      src: "/favicon.ico",
      sizes: "16x16 32x32 48x48 64x64 128x128 256x256",
      type: "image/x-icon"
    },
    {
      src: "/api/local/icon",
      sizes: "any",
      type: "image/svg+xml",
      purpose: "any maskable"
    }
  ]
}, null, 2);

const content = `import fs from 'fs';
import path from 'path';

export const OFFICIAL_BENTIAN_SVG = ${JSON.stringify(svg)};

export const OFFICIAL_MANIFEST_JSON = ${JSON.stringify(manifest)};

// Respaldo binario base64 de icon.ico (34KB) para portabilidad 100% autónoma
export const OFFICIAL_BENTIAN_ICO_BASE64 = ${JSON.stringify(icoBase64)};

let cachedIcoBuffer: Buffer | null = null;

export function getOfficialIconBuffer(): Buffer {
  if (cachedIcoBuffer) {
    return cachedIcoBuffer;
  }

  try {
    const candidates = [
      path.join(path.dirname(process.execPath), 'icon.ico'),
      path.join(__dirname, 'icon.ico'),
      path.join(__dirname, '../assets/icon.ico'),
      path.resolve(process.cwd(), 'builder/dist/icon.ico'),
      path.resolve(process.cwd(), 'apps/agent/src/gui/assets/icon.ico'),
    ];

    for (const p of candidates) {
      if (fs.existsSync(p)) {
        cachedIcoBuffer = fs.readFileSync(p);
        return cachedIcoBuffer;
      }
    }
  } catch {}

  cachedIcoBuffer = Buffer.from(OFFICIAL_BENTIAN_ICO_BASE64, 'base64');
  return cachedIcoBuffer;
}
`;

fs.writeFileSync('apps/agent/src/gui/assets/icon-data.ts', content, 'utf8');
console.log('✓ icon-data.ts generado limpiamente con literales válidos');
