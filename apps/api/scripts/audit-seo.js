const fs = require('fs');
const path = require('path');

const publicDir = path.resolve(__dirname, '../public');

function getHtmlFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      if (!['modals', 'dashboard', 'js', 'css', 'assets', 'releases', 'sections', 'layout'].includes(file)) {
        results = results.concat(getHtmlFiles(fullPath));
      }
    } else if (file.endsWith('.html')) {
      results.push(fullPath);
    }
  }
  return results;
}

const htmlFiles = getHtmlFiles(publicDir);
console.log('Auditing', htmlFiles.length, 'HTML files...');

const issues = [];
const pages = [];

for (const filePath of htmlFiles) {
  const content = fs.readFileSync(filePath, 'utf8');
  const rel = path.relative(publicDir, filePath).split(path.sep).join('/');
  
  // Title
  const titleMatch = content.match(/<title>([^<]*)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';
  if (!title) {
    issues.push({ file: rel, issue: 'Missing or empty <title>' });
  }

  // Description
  const descMatch = content.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i) ||
                    content.match(/<meta\s+content=["']([^"']*)["']\s+name=["']description["']/i);
  const desc = descMatch ? descMatch[1].trim() : '';
  if (!desc) {
    issues.push({ file: rel, issue: 'Missing or empty <meta name="description">' });
  }

  // Canonical
  const canonicalMatch = content.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']*)["']/i) ||
                         content.match(/<link\s+href=["']([^"']*)["']\s+rel=["']canonical["']/i);
  const canonical = canonicalMatch ? canonicalMatch[1].trim() : '';
  if (!canonical) {
    issues.push({ file: rel, issue: 'Missing <link rel="canonical">' });
  }

  // Check noindex
  if (content.match(/content=["'][^"']*noindex[^"']*["']/i)) {
    issues.push({ file: rel, issue: 'Contains NOINDEX tag' });
  }

  // Check JSON-LD
  let jsonLdCount = 0;
  let hasMerchantWarning = false;
  const jsonLdRegex = /<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi;
  let jm;
  while ((jm = jsonLdRegex.exec(content)) !== null) {
    jsonLdCount++;
    try {
      const parsed = JSON.parse(jm[1]);
      // Check if Product has missing shippingDetails or hasMerchantReturnPolicy
      const checkProduct = (obj) => {
        if (!obj) return;
        if (obj['@type'] === 'Product' || (Array.isArray(obj['@graph']) && obj['@graph'].some(x => x['@type'] === 'Product'))) {
          // If product has offers
          const offers = obj.offers || (obj['@graph'] && obj['@graph'].find(x => x['@type'] === 'Product')?.offers);
          if (offers) {
            const offerList = Array.isArray(offers) ? offers : [offers];
            for (const off of offerList) {
              if (!off.shippingDetails || !off.hasMerchantReturnPolicy) {
                hasMerchantWarning = true;
              }
            }
          }
        }
      };
      checkProduct(parsed);
      if (parsed['@graph']) {
        parsed['@graph'].forEach(checkProduct);
      }
    } catch (e) {
      issues.push({ file: rel, issue: 'Invalid JSON-LD: ' + e.message });
    }
  }

  pages.push({
    file: rel,
    title,
    descLength: desc.length,
    canonical,
    jsonLdCount,
    hasMerchantWarning
  });
}

console.log('Audit complete.');
console.log('Total issues found:', issues.length);
issues.forEach(i => console.log(' - [' + i.file + ']: ' + i.issue));

console.log('\n--- Checking Merchant Listing requirements (offers) across all pages ---');
let offerPagesCount = 0;
for (const filePath of htmlFiles) {
  const content = fs.readFileSync(filePath, 'utf8');
  const rel = path.relative(publicDir, filePath).split(path.sep).join('/');
  if (content.includes('"offers"') || content.includes("'offers'")) {
    offerPagesCount++;
    const hasShipping = content.includes('shippingDetails');
    const hasReturn = content.includes('hasMerchantReturnPolicy');
    const hasBrand = content.includes('"brand"');
    const hasId = content.includes('"sku"') || content.includes('"mpn"') || content.includes('"gtin"');
    console.log(`Page: ${rel} | shipping: ${hasShipping} | return: ${hasReturn} | brand: ${hasBrand} | identifier: ${hasId}`);
  }
}
console.log(`Total pages with offers: ${offerPagesCount}`);

