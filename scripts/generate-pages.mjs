// Generates the static SEO pages (guides, regional shops, policies), sitemap.xml and robots.txt
// from catalog.js. Run with: npm run pages   (outputs are committed alongside the site)
import fs from "node:fs";
import path from "node:path";
import { guides } from "./guides-content.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const SITE = "https://apexdripstore.com";
// catalog.js and product-ui.js are browser scripts that also attach themselves to globalThis.
await import(path.join(ROOT, "catalog.js"));
await import(path.join(ROOT, "product-ui.js"));
const catalog = globalThis.APEX_CATALOG;
const UI = globalThis.ApexUI;
const { products, regions } = catalog;
const byId = Object.fromEntries(products.map(product => [product.id, product]));
const esc = UI.escapeHtml;
const TODAY = catalog.updated;
const written = [];

function write(relative, html) {
  const file = path.join(ROOT, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
  written.push(relative);
}
function need(id) {
  if (!byId[id]) throw new Error(`Unknown product id in content: ${id}`);
  return byId[id];
}
const deptFor = product => {
  if (product.category === "Deals") return "/#deals";
  const map = { Gaming: "gaming", Technology: "technology", Audio: "audio", Accessories: "accessories", Creator: "creator", Gadgets: "gadgets", Lifestyle: "lifestyle", Software: "software" };
  return `/#${map[product.category] || "discover"}`;
};

const ICONS = `<svg xmlns="http://www.w3.org/2000/svg" class="icon-library" aria-hidden="true">
    <symbol id="i-arrow" viewBox="0 0 24 24"><path d="M5 12h14m-6-6 6 6-6 6"/></symbol>
    <symbol id="i-external" viewBox="0 0 24 24"><path d="M6 18 18 6M7 6h11v11"/></symbol>
    <symbol id="i-menu" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></symbol>
    <symbol id="i-search" viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.3"/><path d="m16 16 4 4"/></symbol>
    <symbol id="i-spark" viewBox="0 0 24 24"><path d="M12 2c0 6-4 10-10 10 6 0 10 4 10 10 0-6 4-10 10-10-6 0-10-4-10-10Z"/></symbol>
    <symbol id="i-globe" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 3.8 5.6 3.8 9s-1.2 6.4-3.8 9c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3Z"/></symbol>
    <symbol id="i-book" viewBox="0 0 24 24"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15ZM4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/></symbol>
  </svg>`;

function header(active) {
  const link = (href, label, key) => `<a href="${href}"${active === key ? ' aria-current="page"' : ""}>${label}</a>`;
  return `<a class="skip-link" href="#main-content">Skip to content</a>
  <header class="site-header"><div class="wrap header-inner"><a class="brand" href="/" aria-label="APEXDRIP — The Hub"><img class="brand-logo" src="/assets/logo.webp" alt="APEXDRIP logo" width="38" height="38"><span>APEX<span>DRIP</span></span></a>
    <nav class="desktop-nav" id="mainNav" aria-label="Main navigation">
      <a href="/#hub" class="hub-link"><span class="hub-dot" aria-hidden="true"></span>THE HUB</a>
      ${link("/#gaming", "Gaming")}${link("/#technology", "Technology")}${link("/#gadgets", "Gadgets")}${link("/#lifestyle", "Lifestyle")}${link("/#software", "Software")}${link("/#deals", "Best Deals")}${link("/#discover", "Discover")}
      ${link("/regions/", "Regions", "regions")}${link("/guides/", "Guides", "guides")}${link("/contact", "Contact", "contact")}
    </nav>
    <div class="header-actions"><a class="icon-btn" href="/#discover" aria-label="Search products" title="Search products"><svg class="icon"><use href="#i-search"/></svg></a><button class="icon-btn menu-btn" id="menuToggle" type="button" aria-label="Menu" aria-controls="mainNav" aria-expanded="false"><svg class="icon"><use href="#i-menu"/></svg></button></div>
  </div></header>`;
}
const FOOTER = `<footer class="footer wrap">
    <div class="footer-main"><div><a class="brand" href="/"><img class="brand-logo" src="/assets/logo.webp" alt="APEXDRIP logo" width="38" height="38"><span>APEX<span>DRIP</span></span></a><p>Level up your loot. Independent product discovery for gaming gear, tech, audio, creator gadgets and street style, organised for shoppers in India, the USA, the UK, Chile and worldwide.</p><div class="footer-social"><strong>Follow us</strong><div class="social-links"><a href="https://www.instagram.com/apexdripstore" target="_blank" rel="noopener me" aria-label="APEXDRIP on Instagram (opens in a new tab)"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r=".7" fill="currentColor" stroke="none"/></svg><span>Instagram</span></a><a href="https://www.facebook.com/61596759547447/" target="_blank" rel="noopener me" aria-label="APEXDRIP on Facebook (opens in a new tab)"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 3.5H17v3.6h-2.1c-.7 0-1.1.4-1.1 1.1v2.3H17l-.5 3.6h-2.7v6.4H10v-6.4H7.5v-3.6H10V7.6c0-2.5 1.6-4.1 4.5-4.1Z"/></svg><span>Facebook</span></a></div></div></div>
      <nav class="footer-cols" aria-label="Footer">
        <div class="footer-links"><strong>Shop</strong><a href="/#gaming">Gaming</a><a href="/#technology">Technology</a><a href="/#audio">Audio accessories</a><a href="/#accessories">Computer accessories</a><a href="/#creator">Creator gadgets</a><a href="/#lifestyle">Lifestyle</a><a href="/#deals">Best deals</a><a href="/#discover">All products</a></div>
        <div class="footer-links"><strong>Regions</strong>${regions.map(region => `<a href="/regions/${region.key}/">${esc(region.name)}${region.currency ? ` (${region.currency})` : ""}</a>`).join("")}</div>
        <div class="footer-links"><strong>Guides</strong><a href="/guides/best-budget-mechanical-keyboards/">Budget keyboards</a><a href="/guides/best-gaming-mice-competitive/">Competitive mice</a><a href="/guides/top-creator-desk-gadgets/">Creator gadgets</a><a href="/guides/best-gaming-headsets/">Gaming headsets</a><a href="/guides/gaming-setup-essentials/">Setup essentials</a></div>
        <div class="footer-links"><strong>Company</strong><a href="/about">About us</a><a href="/contact">Contact us</a><a href="/disclosure">Affiliate disclosure</a><a href="/privacy">Privacy policy</a><a href="/terms">Terms of use</a></div>
      </nav>
    </div>
    <div class="footer-bottom"><span>© <span id="year">2026</span> APEXDRIP</span><p>APEXDRIP may earn a commission when you buy through qualifying links, at no extra cost to you.</p></div>
  </footer>`;

function layout({ title, description, canonical, image = "/assets/og-apexdrip.jpg", type = "website", active = "", body, jsonLd = [], extraScripts = "", noindex = false }) {
  const url = `${SITE}${canonical}`;
  const ld = jsonLd.length ? `\n  <script type="application/ld+json">${JSON.stringify(jsonLd.length === 1 ? jsonLd[0] : { "@context": "https://schema.org", "@graph": jsonLd })}</script>` : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#0d0d14">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">${noindex ? '\n  <meta name="robots" content="noindex">' : ""}
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="${type}">
  <meta property="og:site_name" content="APEXDRIP">
  <meta property="og:title" content="${esc(title.replace(/ \| APEXDRIP$/, ""))}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${SITE}${image}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="/assets/favicon.png" type="image/png">
  <link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
  <link rel="preload" href="/assets/chakra-700.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/styles.css">
  <script src="/catalog.js" defer></script>
  <script src="/product-ui.js" defer></script>
  <script src="/pages.js" defer></script>${extraScripts}${ld}
</head>
<body>
  ${ICONS}
  ${header(active)}
<main id="main-content" tabindex="-1">
${body}
</main>
  ${FOOTER}
</body>
</html>
`;
}
function banner({ crumbs, eyebrow, titleHtml, intro = "", images, extra = "" }) {
  return `  <section class="wrap page-banner" aria-labelledby="page-title">
    <div class="collection-slides" aria-hidden="true">${images.map((src, index) => `<img${index ? ' loading="lazy"' : ' class="is-active"'} src="/${src}" alt="" width="640" height="420">`).join("")}</div>
    <div class="collection-copy">
      <nav class="breadcrumb" aria-label="Breadcrumb">${crumbs.map(([href, label]) => href ? `<a href="${href}">${esc(label)}</a><span>/</span>` : `<span aria-current="page">${esc(label)}</span>`).join("")}</nav>
      <span class="eyebrow">${eyebrow}</span>
      <h1 id="page-title">${titleHtml}</h1>${intro ? `\n      <p>${intro}</p>` : ""}${extra}
    </div>
  </section>`;
}
const breadcrumbLd = crumbs => ({ "@type": "BreadcrumbList", itemListElement: crumbs.map(([href, label], index) => ({ "@type": "ListItem", position: index + 1, name: label, item: `${SITE}${href || ""}` })) });
const card = (product, more) => UI.productCard(product, { interactive: false, detailsHref: more || deptFor(product), detailsLabel: "MORE LIKE THIS" });
const DISCLOSURE = `<div class="disclosure-box"><strong>Affiliate disclosure:</strong> APEXDRIP is reader-supported. Some links on this page are affiliate links, and we may earn a commission if you buy through them, at no extra cost to you. Links marked “Retailer link” go straight to the official store while affiliate approval is pending. Commissions never decide which products we recommend. <a href="/disclosure">Read the full disclosure</a>.</div>`;

/* ---------------- Guides ---------------- */
function renderTable(ids, guide) {
  const rows = ids.split(",").map(id => {
    const product = need(id.trim());
    const specs = guide.specs[product.id] || ["", "", ""];
    const price = UI.hasPrice(product) ? `${(product.priceFrom ? "From " : "") + UI.money(product.price, product.currency)}<br><small>${esc(product.region)}, checked ${esc(UI.formatDate(product.priceCheckedOn))}</small>` : `See retailer<br><small>${esc(product.region)} store</small>`;
    return `<tr><td><a href="#pick-${esc(product.id)}">${esc(product.name)}</a></td>${specs.map(value => `<td>${esc(value)}</td>`).join("")}<td>${price}</td><td>${esc(UI.retailerFor(product))}</td></tr>`;
  }).join("");
  return `<div class="table-scroll"><table class="compare-table"><thead><tr><th scope="col">Product</th>${guide.columns.map(column => `<th scope="col">${esc(column)}</th>`).join("")}<th scope="col">Price (region)</th><th scope="col">Store</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
function renderPick(spec) {
  const [id, bestFor, pros = "", cons = ""] = spec.split("|");
  const product = need(id.trim());
  const list = value => value.split(";").filter(Boolean).map(item => `<li>${esc(item)}</li>`).join("");
  return `<article class="pick" id="pick-${esc(product.id)}" data-pick="${esc(product.id)}">
  <div class="pick-head"><img src="${esc(UI.imageUrl(product.image))}" alt="${esc(UI.altText(product))}" width="820" height="500" loading="lazy" decoding="async"><div>
    <span class="pick-label">${esc(bestFor)}</span>
    <h3>${esc(product.name)}</h3>
    <div class="product-meta"><span class="product-brand">${esc(UI.retailerFor(product))}</span><span class="region-tag">${esc(UI.regionLabel(product))}</span></div>
    <p>${esc(product.description)}</p>
    <div class="price-row">${UI.priceHtml(product)}</div>
    <div class="link-row">${UI.linkTag(product)}</div>
    <div class="pick-shop">${UI.shopLink(product, "buy-link")}</div>
  </div></div>
  <div class="pros-cons"><div class="pros"><h4>Advantages</h4><ul>${list(pros)}</ul></div><div class="cons"><h4>Disadvantages</h4><ul>${list(cons)}</ul></div></div>
  ${product.shipping ? `<p class="brand-note">${esc(product.shipping)}</p>` : ""}
</article>`;
}
function renderGrid(ids) {
  const list = ids.split(",").map(id => need(id.trim()));
  return `<div class="product-grid article-products" data-grid data-ids="${esc(list.map(product => product.id).join(","))}">${list.map(product => card(product)).join("")}</div>`;
}
function renderGuideBody(guide) {
  return guide.body
    .replace(/\{\{table:([^}]+)\}\}/g, (_, ids) => renderTable(ids, guide))
    .replace(/\{\{pick:([^}]+)\}\}/g, (_, spec) => renderPick(spec))
    .replace(/\{\{grid:([^}]+)\}\}/g, (_, ids) => renderGrid(ids));
}
function guideTitle(title) {
  const split = title.includes(":") ? title.split(/:\s*/) : title.split(/ (?=for )/);
  return split.length > 1 ? `${esc(split[0])}${title.includes(":") ? ":" : ""} <em>${esc(split.slice(1).join(" "))}</em>` : esc(title);
}
for (const guide of guides) {
  const canonical = `/guides/${guide.slug}/`;
  const crumbs = [["/", "The Hub"], ["/guides/", "Buying Guides"], [null, guide.title]];
  const related = guide.related.map(slug => guides.find(item => item.slug === slug)).filter(Boolean);
  const pickedIds = [...guide.body.matchAll(/\{\{(?:pick|grid|table):([^}|]+)/g)].flatMap(match => match[1].split(",")).map(id => id.trim());
  const body = `${banner({ crumbs, eyebrow: `<svg class="icon"><use href="#i-book"/></svg> BUYING GUIDE / ${guide.kicker}`, titleHtml: guideTitle(guide.title), images: [guide.hero, "assets/gaming-setup.webp", "assets/keyboard.webp"] })}
  <article class="wrap article">
    <p class="article-meta"><span>By the APEXDRIP editors</span><span>Updated ${esc(UI.formatDate(TODAY))}</span><span>${esc(guide.reading)}</span></p>
    ${DISCLOSURE}
    <div class="article-body">
${renderGuideBody(guide)}
<h2 id="how-we-choose">How we choose products</h2>
<p>We shortlist products from established brands with official stores in each region, compare published specifications and the features that matter for each use case, and only list prices we've checked on the retailer's own site, with the date shown. Prices and stock change, so always confirm the final price, delivery and warranty at checkout. Spotted something out of date? <a href="/contact">Tell us</a>.</p>
<h2 id="keep-exploring">Keep exploring</h2>
<div class="related-links"><a href="${guide.collection.startsWith("#") ? "/" + guide.collection : guide.collection}">Shop this category →</a>${related.map(item => `<a href="/guides/${item.slug}/">${esc(item.title)} →</a>`).join("")}<a href="/regions/">Shop by region →</a></div>
    </div>
  </article>`;
  write(`guides/${guide.slug}/index.html`, layout({
    title: guide.metaTitle, description: guide.description, canonical, image: `/${guide.hero}`, type: "article", active: "guides", body,
    jsonLd: [
      { "@type": "Article", headline: guide.title, description: guide.description, image: `${SITE}/${guide.hero}`, datePublished: TODAY, dateModified: TODAY, author: { "@type": "Organization", name: "APEXDRIP" }, publisher: { "@type": "Organization", name: "APEXDRIP", logo: { "@type": "ImageObject", url: `${SITE}/assets/logo.webp` } }, mainEntityOfPage: `${SITE}${canonical}` },
      breadcrumbLd(crumbs),
      { "@type": "ItemList", name: `${guide.title}: products mentioned`, itemListElement: [...new Set(pickedIds)].map((id, index) => ({ "@type": "ListItem", position: index + 1, name: byId[id].name, url: byId[id].affiliateUrl })) },
    ],
  }));
}
{
  const crumbs = [["/", "The Hub"], [null, "Buying Guides"]];
  const body = `${banner({ crumbs, eyebrow: '<svg class="icon"><use href="#i-book"/></svg> BUY SMARTER', titleHtml: "BUYING <em>GUIDES.</em>", intro: "Original, practical advice on gaming keyboards, mice, headsets, creator gadgets and desk setups, with picks from our catalog and clear regional pricing.", images: ["assets/gaming-setup.webp", "assets/keyboard.webp", "assets/headphones.webp", "assets/creator-gear.webp"] })}
  <section class="section wrap" aria-labelledby="guides-list">
    <h2 id="guides-list" class="visually-hidden">All guides</h2>
    <div class="guide-grid">${guides.map(guide => `<a class="guide-card" href="/guides/${guide.slug}/"><img src="/${guide.hero}" alt="${esc(guide.heroAlt)}" width="820" height="500" loading="lazy" decoding="async"><span class="guide-kicker">${esc(guide.kicker)} · ${esc(guide.reading.toUpperCase())}</span><h3>${esc(guide.title)}</h3><p>${esc(guide.description)}</p></a>`).join("")}</div>
    <p class="brand-note">Our guides contain affiliate links. APEXDRIP may earn a commission on qualifying purchases at no extra cost to you. <a href="/disclosure">Learn more</a>.</p>
  </section>`;
  write("guides/index.html", layout({ title: "Buying Guides: Gaming Gear, Audio & Creator Tech | APEXDRIP", description: "APEXDRIP buying guides for budget mechanical keyboards, competitive gaming mice, gaming headsets, creator desk gadgets and gaming setup essentials.", canonical: "/guides/", active: "guides", body, jsonLd: [breadcrumbLd(crumbs), { "@type": "CollectionPage", name: "APEXDRIP Buying Guides", url: `${SITE}/guides/` }] }));
}

/* ---------------- Regions ---------------- */
const SECTION_ORDER = [["Gaming", "Gaming"], ["Technology", "Technology"], ["Audio", "Audio Accessories"], ["Accessories", "Computer Accessories"], ["Creator", "Creator Gadgets"], ["Gadgets", "Gadgets"], ["Lifestyle", "Lifestyle"], ["Software", "Software & Tools"], ["Deals", "Deals & Promotions"]];
for (const region of regions) {
  const list = products.filter(product => UI.regionMatches(product, region.name)).sort((a, b) => Number(UI.hasPrice(b)) - Number(UI.hasPrice(a)) || UI.byFeatured(a, b));
  const used = new Set();
  const sections = SECTION_ORDER.map(([key, label]) => {
    const items = list.filter(product => !used.has(product.id) && product.category === key);
    items.forEach(product => used.add(product.id));
    if (!items.length) return "";
    const anchor = key.toLowerCase();
    return `<section class="section wrap" id="${anchor}" aria-labelledby="h-${anchor}"><div class="section-heading"><div><span class="eyebrow"><svg class="icon"><use href="#i-globe"/></svg> ${esc(region.name.toUpperCase())}${region.currency ? ` · ${region.currency}` : ""}</span><h2 id="h-${anchor}">${esc(label)}</h2></div><a class="text-link" href="/#discover?region=${encodeURIComponent(region.name)}">FILTER IN CATALOG <svg class="icon"><use href="#i-arrow"/></svg></a></div><div class="product-grid">${items.map(product => card(product)).join("")}</div></section>`;
  }).join("\n");
  const priced = list.filter(UI.hasPrice).length;
  const stores = [...new Set(list.map(UI.retailerFor))].sort();
  const crumbs = [["/", "The Hub"], ["/regions/", "Regions"], [null, region.name]];
  const facts = `<div class="region-hero-facts"><span>Currency: ${region.currency ? `${region.currency} (${esc(region.symbol)})` : "local, at checkout"}</span><span>${list.length} listings</span><span>${priced} verified prices</span></div>`;
  const body = `${banner({ crumbs, eyebrow: `<svg class="icon"><use href="#i-globe"/></svg> REGIONAL SHOP / ${esc(region.name.toUpperCase())}`, titleHtml: `${esc(region.name.toUpperCase())} <em>${region.key === "international" ? "STORES." : "OFFERS."}</em>`, intro: esc(region.summary), images: list.slice(0, 4).map(product => product.image.replace(/^\//, "")), extra: facts })}
  <section class="section wrap" aria-labelledby="about-region">
    <div class="region-panel">
      <div class="region-info"><h2 id="about-region">Shopping from ${esc(region.name === "International" ? "anywhere" : region.name)}</h2><dl class="region-facts"><div><dt>Currency</dt><dd>${region.currency ? `All prices on this page are in ${esc(region.currency)} (${esc(region.symbol)}).` : "Prices are shown in your local currency on each retailer's site."}</dd></div><div><dt>Shipping</dt><dd>${esc(region.shipping)}</dd></div><div><dt>Stores</dt><dd>${esc(stores.join(", "))}</dd></div></dl></div>
      <div class="info-copy"><p>${region.key === "chile" ? "These offers are <strong>specific to Chile</strong>: they come from Lenovo's Chilean online store, are priced in Chilean pesos (CLP) and are intended for delivery to Chilean addresses. They are not valid in other countries." : region.key === "international" ? "These stores sell in many countries. The currency, price, taxes and delivery options you see depend on where you are; some products may not be available in every country." : `These listings come from stores that sell to customers in ${esc(region.name === "USA" ? "the United States" : region.name === "UK" ? "the United Kingdom" : region.name)}. Prices are never converted from other currencies.`}</p><p>A price with a “Checked” date was confirmed on the retailer's own site on that date. “Price on retailer site” means we haven't verified a current price, so please check it on the store. Cards labelled “Affiliate link” may earn APEXDRIP a commission; “Retailer link” cards link directly to the store.</p>${DISCLOSURE}</div>
    </div>
    <nav class="related-links" aria-label="Jump to section" style="margin-top:18px">${SECTION_ORDER.filter(([key]) => list.some(product => product.category === key)).map(([key, label]) => `<a href="#${key.toLowerCase()}">${esc(label)}</a>`).join("")}${regions.filter(item => item.key !== region.key).map(item => `<a href="/regions/${item.key}/">${esc(item.name)} offers →</a>`).join("")}</nav>
  </section>
${sections}`;
  write(`regions/${region.key}/index.html`, layout({
    title: region.key === "international" ? "International Stores: Gaming & Tech That Ship Worldwide | APEXDRIP" : `${region.name} Offers (${region.currency}): Gaming Gear & Tech | APEXDRIP`,
    description: `${region.summary} ${list.length} listings from ${stores.slice(0, 5).join(", ")}${stores.length > 5 ? " and more" : ""}, with shipping notes and verified prices where available.`,
    canonical: `/regions/${region.key}/`, active: "regions", body, image: `/${list[0].image.replace(/^\//, "")}`,
    jsonLd: [breadcrumbLd(crumbs), { "@type": "CollectionPage", name: `${region.title} | APEXDRIP`, url: `${SITE}/regions/${region.key}/` }],
  }));
}
{
  const crumbs = [["/", "The Hub"], [null, "Regions"]];
  const tiles = regions.map(region => {
    const count = products.filter(product => UI.regionMatches(product, region.name)).length;
    return `<a class="region-info" href="/regions/${region.key}/"><div class="region-info-main"><span class="region-flag" aria-hidden="true"><svg class="icon"><use href="#i-globe"/></svg></span><div><h2 style="font-size:24px">${esc(region.name)}</h2><p>${esc(region.summary)}</p></div></div><dl class="region-facts"><div><dt>Currency</dt><dd>${region.currency ? `${esc(region.currency)} (${esc(region.symbol)})` : "Local currency"}</dd></div><div><dt>Listings</dt><dd>${count}</dd></div></dl><span class="text-link">SHOP ${esc(region.name.toUpperCase())} <svg class="icon"><use href="#i-arrow"/></svg></span></a>`;
  }).join("");
  const body = `${banner({ crumbs, eyebrow: '<svg class="icon"><use href="#i-globe"/></svg> SHOP WHERE YOU LIVE', titleHtml: "SHOP BY <em>REGION.</em>", intro: "Every offer is grouped by the country of the store that sells it, so prices are always in the store's own currency and never mixed.", images: ["assets/gaming-setup.webp", "assets/shop-ln-legion-5i.webp", "assets/shop-lg-g733.webp", "assets/shop-kreo-hive75-he.webp"] })}
  <section class="section wrap" aria-label="Regions"><div class="region-index-grid">${tiles}</div>
  <p class="brand-note">Not sure which to pick? Choose the store in the country you're shipping to, so warranty, returns and taxes are handled locally. International stores show prices in your local currency at checkout.</p></section>`;
  write("regions/index.html", layout({ title: "Shop by Region: India, USA, UK, Chile & International | APEXDRIP", description: "Find gaming gear and tech offers from stores in India (INR), the USA (USD), the UK (GBP), Chile (CLP) and international stores, with shipping notes on every listing.", canonical: "/regions/", active: "regions", body, jsonLd: [breadcrumbLd(crumbs)] }));
}

/* ---------------- Information pages ---------------- */
function infoPage({ file, canonical, title, description, eyebrow, titleHtml, crumb, images, content, active = "", extraScripts = "" }) {
  const crumbs = [["/", "The Hub"], [null, crumb]];
  const body = `${banner({ crumbs, eyebrow, titleHtml, images })}
  <div class="section wrap"><div class="info-copy">
${content}
  </div></div>`;
  write(file, layout({ title, description, canonical, active, body, extraScripts, jsonLd: [breadcrumbLd(crumbs)] }));
}
const UPDATED = `<p class="article-meta"><span>Last updated ${esc(UI.formatDate(TODAY))}</span></p>`;
infoPage({
  file: "disclosure.html", canonical: "/disclosure", crumb: "Affiliate Disclosure",
  title: "Affiliate Disclosure | APEXDRIP", description: "How APEXDRIP earns money: we may earn a commission when you buy through qualifying links, at no extra cost to you. Learn how we label links and choose products.",
  eyebrow: "TRANSPARENCY FIRST", titleHtml: "AFFILIATE <em>DISCLOSURE.</em>", images: ["assets/gaming-setup.webp", "assets/sneakers.webp", "assets/laptop.webp", "assets/speaker.webp"],
  content: `${UPDATED}
<p><strong>APEXDRIP is an independent product discovery website.</strong> We are reader-supported: when you click some links on this site and make a qualifying purchase, we may earn a commission from the retailer or affiliate network. <strong>This never costs you anything extra</strong> — the price you pay is the same as going to the store directly.</p>
<h2>How we label links</h2>
<ul>
<li><strong>Affiliate link</strong> — the link contains a tracking code from an affiliate programme or network. We may earn a commission on qualifying purchases. These links are marked <em>sponsored</em> for search engines.</li>
<li><strong>Retailer link</strong> — a direct link to the official store with no tracking code, used while affiliate approval for that store is pending. We don't earn from these links today, but they may be replaced with affiliate links in future.</li>
<li><strong>Sponsored banners</strong> — the promotional banners on our department pages link to retailer offers through affiliate networks and are labelled as sponsored for assistive technology.</li>
</ul>
<h2>Which programmes we work with</h2>
<p>We participate in, or have applied to, affiliate programmes run directly by brands and through affiliate networks. These include programmes for brands and stores featured on this site, such as Redragon, REDMAGIC, ASUS and Lenovo. Each programme has its own terms; we follow their rules on disclosure, coupon use and paid advertising.</p>
<h2>How we choose products</h2>
<p>Commission rates do not decide what we feature. We pick products from established brands, compare published specifications and features, and write our own descriptions and guides. We don't accept payment to place products in our buying guides. If a brand ever sponsors content, that content will be clearly labelled as sponsored.</p>
<h2>Prices, availability and regions</h2>
<p>We only show a price when we've checked it on the retailer's own site, and we display the date we checked it. Prices, stock, promotions and shipping can change at any time, and the retailer's checkout is always the final word. Every product shows the country and currency of the store that sells it; we never convert or mix currencies between regions.</p>
<h2>Your purchase is with the retailer</h2>
<p>APEXDRIP does not sell products, take payments or handle orders. When you buy, your contract is with the retailer, and their terms, privacy policy, shipping, returns and warranty apply.</p>
<h2>Questions</h2>
<p>If you have questions about this disclosure or a specific link, please <a href="/contact">contact us</a>. See also our <a href="/privacy">Privacy Policy</a> and <a href="/terms">Terms of Use</a>.</p>
<p><a class="btn btn-primary" href="/">BACK TO THE HUB ↗</a></p>`,
});
infoPage({
  file: "privacy.html", canonical: "/privacy", crumb: "Privacy Policy",
  title: "Privacy Policy | APEXDRIP", description: "How APEXDRIP handles information: contact form messages, the owner sign-in, cookies used by affiliate links and third-party retailers.",
  eyebrow: "YOUR DATA", titleHtml: "PRIVACY <em>POLICY.</em>", images: ["assets/cybersecurity.webp", "assets/web-tools.webp", "assets/laptop.webp", "assets/phones.webp"],
  content: `${UPDATED}
<p>This policy explains what information APEXDRIP (apexdripstore.com) collects and how it's used. APEXDRIP is a product discovery website: we do not offer public user accounts, on-site checkout or payment processing.</p>
<h2>Information you give us</h2>
<p>When you send a message through our <a href="/contact">contact form</a>, we receive the name, email address, optional company name and message you provide. We use it only to reply to you and keep a record of the conversation. The form is processed by our hosting provider, Netlify, which stores submissions for us. We do not sell this information.</p>
<h2>Owner sign-in</h2>
<p>The site has a private management area used only by the site owner. Signing in uses Netlify Identity, which sets cookies needed to keep the owner signed in. Visitors who don't sign in are not affected.</p>
<h2>Cookies and affiliate links</h2>
<p>We don't use advertising cookies on our own pages. When you click an affiliate link, the retailer or affiliate network may set cookies or use similar technology to record that you came from APEXDRIP, so a commission can be attributed if you make a qualifying purchase. Those cookies are controlled by the retailer or network under their own privacy policies.</p>
<h2>Server logs</h2>
<p>Like most websites, our hosting provider automatically processes technical data such as IP address, browser type and pages requested in order to deliver the site, keep it secure and diagnose problems.</p>
<h2>Third-party websites</h2>
<p>Product links take you to third-party stores. Their privacy policies, cookies and terms apply once you leave APEXDRIP.</p>
<h2>Your choices</h2>
<p>You can block or delete cookies in your browser settings. To ask about, correct or delete a message you've sent us, contact us through the <a href="/contact">contact form</a>. Please don't submit sensitive personal information through this website.</p>
<h2>Changes</h2>
<p>If we add analytics, advertising or other services, we'll update this policy to describe them before they're used. The date at the top shows when it last changed.</p>
<p><a class="btn btn-primary" href="/">BACK TO THE HUB ↗</a></p>`,
});
infoPage({
  file: "terms.html", canonical: "/terms", crumb: "Terms of Use",
  title: "Terms of Use | APEXDRIP", description: "The terms for using APEXDRIP, an independent product discovery and affiliate website: product information, prices, third-party stores and liability.",
  eyebrow: "THE FINE PRINT", titleHtml: "TERMS OF <em>USE.</em>", images: ["assets/notebook.webp", "assets/laptop.webp", "assets/web-tools.webp", "assets/gaming-setup.webp"],
  content: `${UPDATED}
<p>By using apexdripstore.com (“APEXDRIP”, “we”, “us”) you agree to these terms. If you don't agree, please don't use the site.</p>
<h2>1. What APEXDRIP is</h2>
<p>APEXDRIP is an independent website that helps you discover products and compare options. We don't sell products, take payments, ship orders or provide customer service for purchases. All purchases are made directly with third-party retailers.</p>
<h2>2. Product information and prices</h2>
<p>We work to keep product names, images, descriptions and prices accurate. Prices are shown only when we've checked them on the retailer's site, with the date we checked. Prices, availability, promotions and specifications can change without notice, and the retailer's website is always authoritative. Product images belong to their respective brands and are used to identify the products.</p>
<h2>3. Regional offers</h2>
<p>Offers are grouped by the country of the selling store. An offer listed for one country (for example, a Chile-specific promotion) may not be valid elsewhere. Check delivery, taxes, duties and warranty coverage for your country before buying.</p>
<h2>4. Affiliate links</h2>
<p>Some links are affiliate links, as explained in our <a href="/disclosure">Affiliate Disclosure</a>. Using them doesn't change the price you pay.</p>
<h2>5. Third-party sites</h2>
<p>Links to other websites are provided for convenience. We don't control and aren't responsible for their content, products, policies or practices.</p>
<h2>6. Acceptable use</h2>
<p>Don't misuse the site: no attempts to access the owner management area without permission, interfere with the site's operation, scrape it in a way that disrupts service, or use it for unlawful purposes.</p>
<h2>7. Content</h2>
<p>Our written content, including buying guides and descriptions, is original to APEXDRIP. You may share links to it, but please don't republish it in full without permission. Brand names and trademarks belong to their owners and are used for identification only.</p>
<h2>8. No warranty and limitation of liability</h2>
<p>The site is provided “as is”. Our guides are general information, not professional advice. To the extent permitted by law, APEXDRIP isn't liable for losses arising from your use of the site or from purchases made with third-party retailers.</p>
<h2>9. Changes and contact</h2>
<p>We may update these terms; the date above shows the latest version. Questions? <a href="/contact">Contact us</a>.</p>
<p><a class="btn btn-primary" href="/">BACK TO THE HUB ↗</a></p>`,
});
infoPage({
  file: "about.html", canonical: "/about", crumb: "About Us",
  title: "About APEXDRIP | Independent Gaming & Tech Product Discovery", description: "APEXDRIP is an independent product discovery site for gaming gear, tech, audio and creator gadgets, with region-specific offers for India, the USA, the UK, Chile and worldwide.",
  eyebrow: "WHO WE ARE", titleHtml: "ABOUT <em>APEXDRIP.</em>", images: ["assets/gaming-setup.webp", "assets/keyboard.webp", "assets/creator-gear.webp", "assets/streetwear.webp"],
  content: `${UPDATED}
<p><strong>APEXDRIP helps gamers, creators and tech fans find their next upgrade.</strong> We collect gaming gear, computer accessories, audio, creator gadgets, software and lifestyle finds from established brands in one place, and point you to the official store for your country.</p>
<h2>What makes us different</h2>
<ul>
<li><strong>Organised by region.</strong> Every product shows the country and currency of the store that sells it, with dedicated pages for <a href="/regions/india/">India</a>, the <a href="/regions/usa/">USA</a>, the <a href="/regions/uk/">UK</a>, <a href="/regions/chile/">Chile</a> and <a href="/regions/international/">international stores</a>.</li>
<li><strong>Honest prices.</strong> We only show a price when we've checked it on the retailer's site, and we show the date.</li>
<li><strong>Clear link labels.</strong> Every card says whether it uses an affiliate link or a direct retailer link.</li>
<li><strong>Useful guides.</strong> Our <a href="/guides/">buying guides</a> explain what matters before you spend money.</li>
</ul>
<h2>Brands you'll find here</h2>
<p>Razer, Logitech and Logitech G, HyperX, Lenovo, ASUS, Acer, Kreo, Redragon, REDMAGIC, Secretlab, PUMA and more, plus software and creator tools from Hostinger, Elementor, Bitdefender, Canva and Adobe.</p>
<h2>How we're funded</h2>
<p>APEXDRIP is supported by affiliate commissions from qualifying purchases, at no extra cost to you. Read our <a href="/disclosure">affiliate disclosure</a> for details.</p>
<h2>Get in touch</h2>
<p>For brand collaborations, affiliate partnerships, corrections or general questions, use our <a href="/contact">contact form</a>.</p>
<div class="related-links"><a href="/#discover">Browse all products →</a><a href="/guides/">Read the guides →</a><a href="/regions/">Shop by region →</a></div>`,
});
{
  const crumbs = [["/", "The Hub"], [null, "Contact Us"]];
  const body = `${banner({ crumbs, eyebrow: "CONTACT US", titleHtml: "LET&rsquo;S <em>CONNECT.</em>", images: ["assets/gaming-setup.webp", "assets/creator-gear.webp", "assets/keyboard.webp", "assets/headphones.webp"] })}
  ${fs.readFileSync(path.join(ROOT, "scripts/partials/contact-main.html"), "utf8").replace(/href="index\.html#hub"/g, 'href="/"')}`;
  const script = fs.readFileSync(path.join(ROOT, "scripts/partials/contact-script.js"), "utf8").split("(function(){\n  var form")[1];
  write("contact.html", layout({ title: "Contact Us | APEXDRIP", description: "Contact APEXDRIP for business inquiries, brand collaborations, affiliate partnerships, corrections or general questions.", canonical: "/contact", active: "contact", body: body + `\n<script>\n(function(){\n  var form${script}</script>`, jsonLd: [breadcrumbLd(crumbs), { "@type": "ContactPage", name: "Contact APEXDRIP", url: `${SITE}/contact` }] }));
}

/* ---------------- 404 page ---------------- */
{
  const crumbs = [["/", "The Hub"], [null, "Page Not Found"]];
  const body = `${banner({ crumbs, eyebrow: "ERROR 404", titleHtml: "PAGE <em>NOT FOUND.</em>", intro: "This link is broken or the page has moved. Everything on APEXDRIP is still one click away.", images: ["assets/gaming-setup.webp", "assets/keyboard.webp", "assets/headphones.webp", "assets/creator-gear.webp"] })}
  <div class="section wrap"><div class="info-copy">
<h2>Try one of these</h2>
<ul>
<li><a href="/">The Hub</a>: trending products, departments and best deals.</li>
<li><a href="/#discover">Discover</a>: search, sort and filter every product.</li>
<li><a href="/guides/">Buying guides</a> and <a href="/regions/">shopping by region</a>.</li>
<li><a href="/downloads/">Downloads</a>: the complete website as a zip, or any single page as an HTML file.</li>
</ul>
<div class="related-links"><a href="/">Back to the Hub →</a><a href="/downloads/">Go to Downloads →</a><a href="/contact">Report a broken link →</a></div>
  </div></div>`;
  write("404.html", layout({ title: "Page Not Found | APEXDRIP", description: "The page you were looking for could not be found on APEXDRIP.", canonical: "/404", body, noindex: true }));
}

/* ---------------- sitemap.xml & robots.txt ---------------- */
const urls = [
  ["/", "daily", "1.0"],
  ["/regions/", "weekly", "0.9"], ...regions.map(region => [`/regions/${region.key}/`, "weekly", "0.8"]),
  ["/guides/", "weekly", "0.9"], ...guides.map(guide => [`/guides/${guide.slug}/`, "monthly", "0.8"]),
  ["/about", "yearly", "0.5"], ["/contact", "yearly", "0.5"], ["/disclosure", "yearly", "0.5"], ["/privacy", "yearly", "0.4"], ["/terms", "yearly", "0.4"],
];
fs.writeFileSync(path.join(ROOT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([loc, freq, priority]) => `  <url><loc>${SITE}${loc}</loc><lastmod>${TODAY}</lastmod><changefreq>${freq}</changefreq><priority>${priority}</priority></url>`).join("\n")}
</urlset>
`);
fs.writeFileSync(path.join(ROOT, "robots.txt"), `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /downloads/

Sitemap: ${SITE}/sitemap.xml
`);
console.log(`Wrote ${written.length} pages + sitemap.xml + robots.txt`);
