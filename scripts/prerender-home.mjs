// Pre-renders The Hub's product sections into index.html so product cards are in the initial HTML:
// visible before JavaScript runs, to visitors with JavaScript turned off, and to crawlers and link checkers.
// app.js re-renders the same sections from the same shared helpers (product-ui.js), so the markup matches.
// Usage: node scripts/prerender-home.mjs [file ...]   (defaults to ./index.html; runs as part of npm run pages and the build)
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const TRENDING_COUNT = 12; // keep in sync with app.js
const REGION_COUNT = 6;
const CATALOG_COUNT = 12;

async function load() {
  await import(pathToFileURL(path.join(ROOT, "catalog.js")).href);
  await import(pathToFileURL(path.join(ROOT, "product-ui.js")).href);
  return { catalog: globalThis.APEX_CATALOG, UI: globalThis.ApexUI };
}

export async function prerenderHome(html) {
  const { catalog, UI } = await load();
  const { products, regions } = catalog;
  const region = regions[0];
  const regionList = UI.regionPicks(products, region.name);
  const catalogList = products.slice().sort(UI.byFeatured);
  const sections = {
    strip: UI.stripHtml(products.map(product => product.image)),
    "hub-filters": UI.chipsHtml(UI.HUB_FILTERS, "All", UI.hubChipLabel),
    trending: UI.trendingPicks(products, "All", TRENDING_COUNT).map(product => UI.productCard(product)).join(""),
    "region-tabs": UI.chipsHtml(regions.map(item => item.key), region.key, UI.regionChipLabel(regions)),
    "region-info": UI.regionInfoHtml(region, regionList.length),
    "region-grid": regionList.slice(0, REGION_COUNT).map(product => UI.productCard(product)).join(""),
    deals: UI.featuredDeals(products, 3).map(UI.dealRow).join(""),
    departments: UI.departmentCards(products),
    "results-count": `${catalogList.length} finds`,
    catalog: catalogList.slice(0, CATALOG_COUNT).map(product => UI.productCard(product)).join(""),
  };
  for (const [name, content] of Object.entries(sections)) {
    const pattern = new RegExp(`(<!--prerender:${name}-->)[\\s\\S]*?(<!--/prerender:${name}-->)`);
    if (!pattern.test(html)) throw new Error(`index.html is missing the <!--prerender:${name}--> slot`);
    html = html.replace(pattern, (match, open, close) => open + content + close);
  }
  return html;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const files = process.argv.slice(2).length ? process.argv.slice(2) : [path.join(ROOT, "index.html")];
  for (const file of files) {
    fs.writeFileSync(file, await prerenderHome(fs.readFileSync(file, "utf8")));
    console.log(`Pre-rendered product sections into ${path.relative(ROOT, file) || file}`);
  }
}
