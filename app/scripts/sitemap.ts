// Writes public/sitemap.xml and public/robots.txt for the website. Run with `npm run sitemap` after adding destinations.
import { writeFileSync } from 'node:fs';
import { DESTS } from '../src/engine/data';
import { SITE_URL } from '../src/site/url';

const pages = ['/', '/destinations', '/app', '/about', '/contact', '/plan', ...DESTS.map(d => `/destinations/${d.id}`)];
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(p => `  <url><loc>${SITE_URL}${p === '/' ? '/' : p}</loc></url>`).join('\n')}
</urlset>
`;
writeFileSync(new URL('../public/sitemap.xml', import.meta.url), xml);
writeFileSync(new URL('../public/robots.txt', import.meta.url), `User-agent: *\nDisallow: /admin\nDisallow: /follow\nDisallow: /split\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);
console.log(`sitemap.xml: ${pages.length} pages`);
