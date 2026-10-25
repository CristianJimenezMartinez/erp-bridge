import * as fs from 'fs';
import * as path from 'path';
import { renderErpPage, ErpPage } from './seo/erp-page.template';
import { DATA_DIR, PUBLIC_DIR, SITE, getCanonicalVersion, upsertSitemapUrl, writeIfChanged } from './seo/seo-shared';

/**
 * Genera las 7 páginas SEO de conectores ERP en Beta a partir de apps/api/data/erp-pages.json.
 * La versión se lee de package.json (SSoT); nunca se escribe a mano.
 */
function validate(pages: ErpPage[]): void {
  const slugs = new Set(pages.map((p) => p.slug));
  const seenFaq = new Set<string>();
  for (const p of pages) {
    if (p.faq.length !== 5) throw new Error(`${p.slug}: se requieren exactamente 5 FAQ (hay ${p.faq.length}).`);
    for (const f of p.faq) {
      const key = f.q.trim().toLowerCase();
      if (seenFaq.has(key)) throw new Error(`${p.slug}: pregunta FAQ duplicada entre páginas: ${f.q}`);
      seenFaq.add(key);
    }
    if (!/beta/i.test(p.title) || !p.statusNote) throw new Error(`${p.slug}: debe declarar su estado Beta (title y statusNote).`);
    for (const r of p.related) {
      const exists = slugs.has(r.slug) || fs.existsSync(path.join(PUBLIC_DIR, r.slug, 'index.html'));
      if (!exists) throw new Error(`${p.slug}: enlace cruzado a página inexistente /${r.slug}/`);
    }
  }
}

function main(): void {
  const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'erp-pages.json'), 'utf8')) as { pages: ErpPage[] };
  validate(data.pages);
  const version = getCanonicalVersion();

  for (const p of data.pages) {
    writeIfChanged(path.join(PUBLIC_DIR, p.slug, 'index.html'), renderErpPage(p, version));
    upsertSitemapUrl(`${SITE}/${p.slug}/`, p.lastmod, `Conector ${p.name} (Beta) para WooCommerce, PrestaShop y Shopify`, '0.7');
    console.log(`✓ [erp-pages] /${p.slug}/`);
  }
  console.log(`✓ [erp-pages] ${data.pages.length} páginas de conectores Beta generadas (v${version}).`);
}

main();
