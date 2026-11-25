// Builds the downloads area at the end of every deploy, so every download matches what is live:
//   /downloads/                           Download page (lists everything below)
//   /downloads/apexdripstore-html.zip     The complete public website, ready to open offline or host anywhere
//   /downloads/pages/<page>.html          Any single page as one HTML file (loads styles and images from the live site)
//   /downloads/files/<file>               The shared stylesheet and scripts
// The owner Control Room (/admin/) is left out on purpose: it only works with the site's secure server.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const SITE = "https://apexdripstore.com";
const FOLDER = "apexdripstore-site";
const ZIP_NAME = "apexdripstore-html.zip";
const LEAVE_OUT = new Set(["admin", "downloads"]);
const SHARED_FILES = ["styles.css", "catalog.js", "product-ui.js", "app.js", "pages.js"];

const README = `Apex Drip Store - complete website files
=========================================

This folder holds every public page of apexdripstore.com, exactly as it is published:

  index.html                 Homepage (Trending Products and Shop the Catalog are already in the HTML)
  about.html, contact.html, disclosure.html, privacy.html, terms.html, 404.html
  guides/                    Buying guides (each guide is guides/<name>/index.html)
  regions/                   Regional pages (USA, UK, India, Chile, International)
  styles.css                 All styling
  catalog.js, product-ui.js, app.js, pages.js   Search, sorting, filters and the product catalog
  assets/                    Images, fonts, logo and icons
  robots.txt, sitemap.xml

How to use these files
- To view them on your computer: unzip, open the "${FOLDER}" folder and double-click index.html.
  Every link, image, style and script uses relative paths, so the whole site (search, sorting,
  filters and all pages) works straight from the folder, with no web server needed.
- To host them: upload the contents of this folder to any web host, at the top level of a
  domain or inside a sub-folder. No special settings are needed.

Good to know
- Shop links go to the real retailer and affiliate pages, so they need an internet connection.
- The contact form only sends messages on the live site (${SITE}/contact).
- The private owner Control Room (/admin/) and the server that saves catalog edits are not
  included. The pages show the product catalog stored in catalog.js.

Built: ${new Date().toISOString().slice(0, 10)}
`;

// Small helper injected into downloaded pages. Scripts build some links and image paths at runtime
// (for example "/assets/..." for product images); this rewrites them the same way as the static HTML.
function shim(root, mode) {
  return `<script>/* APEXDRIP download copy: keeps links and images working outside apexdripstore.com */
(function(root,files){var site=${JSON.stringify(SITE)};
function fix(u){if(!u||u.charAt(0)!=="/"||u.charAt(1)==="/")return u;var m=/^([^?#]*)(.*)$/.exec(u),p=m[1],rest=m[2];
if(!files||/^\\/(admin|api|downloads)(\\/|$)/.test(p))return site+u;
if(p==="/")p="/index.html";else if(p.slice(-1)==="/")p+="index.html";else if(!/\\.[a-z0-9]+$/i.test(p.split("/").pop()))p+=".html";
return root+p.slice(1)+rest;}
var A=["src","href","action"];function el(n){if(!n.getAttribute)return;for(var i=0;i<A.length;i++){var v=n.getAttribute(A[i]);if(v){var f=fix(v);if(f!==v)n.setAttribute(A[i],f);}}}
function walk(n){if(n.nodeType!==1)return;el(n);var l=n.querySelectorAll("[src^='/'],[href^='/'],[action^='/']");for(var i=0;i<l.length;i++)el(l[i]);}
new MutationObserver(function(rs){for(var i=0;i<rs.length;i++){var r=rs[i];if(r.type==="attributes")el(r.target);else for(var j=0;j<r.addedNodes.length;j++)walk(r.addedNodes[j]);}}).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:A});
})(${JSON.stringify(root)},${mode === "files"});</script>`;
}

// Static version of the same rewrite, applied to the HTML before it is packed.
function rewriteHtml(html, depth, mode, exists) {
  const root = depth ? "../".repeat(depth) : "";
  const fix = url => {
    if (url.startsWith("//")) return url;
    const [, p, rest] = /^([^?#]*)(.*)$/.exec(url);
    if (mode === "live" || /^\/(admin|api|downloads)(\/|$)/.test(p)) return SITE + url;
    let file = p === "/" ? "index.html" : p.endsWith("/") ? `${p.slice(1)}index.html` : p.slice(1);
    if (!/\.[a-z0-9]+$/i.test(file.split("/").pop()) && exists(`${file}.html`)) file += ".html";
    return root + file + rest;
  };
  return html
    .replace(/(\s(?:href|src|action|poster)=")(\/[^"]*)"/g, (_, attr, url) => `${attr}${fix(url)}"`)
    .replace(/<head>\n?/, match => `${match}  ${shim(mode === "live" ? `${SITE}/` : root, mode)}\n`);
}

function listFiles(dir, base = dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    const rel = path.relative(base, full).split(path.sep).join("/");
    if (entry.isDirectory()) {
      if (dir === base && LEAVE_OUT.has(entry.name)) continue;
      files.push(...listFiles(full, base));
    } else if (entry.name !== "netlify.toml") files.push(rel);
  }
  return files;
}

function dosDateTime(date) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const day = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, day };
}

// Minimal standard zip writer (deflate), readable by Windows, macOS and Linux unzip tools.
function createZip(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  const { time, day } = dosDateTime(new Date());
  for (const { name, data } of entries) {
    const nameBuf = Buffer.from(name, "utf8");
    const deflated = zlib.deflateRawSync(data, { level: 9 });
    const stored = deflated.length >= data.length;
    const body = stored ? data : deflated;
    const crc = zlib.crc32(data) >>> 0;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // UTF-8 names
    local.writeUInt16LE(stored ? 0 : 8, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(day, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, nameBuf, body);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(stored ? 0 : 8, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(day, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(body.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBuf);

    offset += local.length + nameBuf.length + body.length;
  }
  const centralBuf = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralBuf, end]);
}

const esc = value => String(value).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
const size = bytes => (bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);
// guides/best-gaming-headsets/index.html -> guides-best-gaming-headsets.html, index.html -> home.html
const pageName = rel => (rel === "index.html" ? "home.html" : `${rel.replace(/\/index\.html$/, "").replace(/\.html$/, "").replace(/\//g, "-")}.html`);
const titleOf = html => (/<title>([^<]*)<\/title>/.exec(html)?.[1] || "").split(" | ")[0].replace(/&amp;/g, "&");
const PAGE_GROUPS = [["Main pages", rel => !rel.includes("/")], ["Buying guides", rel => rel.startsWith("guides/")], ["Regional pages", rel => rel.startsWith("regions/")]];

function downloadsPage(template, { zipBytes, zipFiles, pages, shared }) {
  const fileRow = (href, label, detail, bytes, name) => `<li><a href="${href}" download="${esc(name)}">${esc(label)}</a> <span class="download-meta">${esc(detail)} · ${size(bytes)}</span></li>`;
  const groups = PAGE_GROUPS.map(([heading, test]) => {
    const rows = pages.filter(page => test(page.rel)).map(page => fileRow(`/downloads/pages/${page.name}`, page.title, page.name, page.bytes, page.name));
    return rows.length ? `<h3>${heading}</h3>\n<ul class="download-list">\n${rows.join("\n")}\n</ul>` : "";
  }).join("\n");
  const main = `<main id="main-content" tabindex="-1">
  <section class="wrap page-banner" aria-labelledby="page-title">
    <div class="collection-slides" aria-hidden="true"><img class="is-active" src="/assets/gaming-setup.webp" alt="" width="640" height="420"><img loading="lazy" src="/assets/keyboard.webp" alt="" width="640" height="420"><img loading="lazy" src="/assets/creator-gear.webp" alt="" width="640" height="420"><img loading="lazy" src="/assets/headphones.webp" alt="" width="640" height="420"></div>
    <div class="collection-copy">
      <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">The Hub</a><span>/</span><span aria-current="page">Downloads</span></nav>
      <span class="eyebrow">FULL WEBSITE FILES</span>
      <h1 id="page-title">DOWN<em>LOADS.</em></h1>
      <p>Every public page of APEXDRIP, as it is live today. Rebuilt on every update.</p>
    </div>
  </section>
  <div class="section wrap"><div class="info-copy">
<h2>Complete website (.zip)</h2>
<p>All ${pages.length} pages plus the stylesheet, scripts, product catalog, images and fonts in one file. Unzip it and double-click <strong>index.html</strong>: search, sorting, filters and every page work straight from the folder, or upload the folder to any web host.</p>
<p><a class="btn btn-primary" href="/downloads/${ZIP_NAME}" download="${ZIP_NAME}">DOWNLOAD FULL WEBSITE <span class="download-meta-dark">ZIP · ${size(zipBytes)} · ${zipFiles} files</span></a></p>
<h2>Single pages (.html)</h2>
<p>Each page as one HTML file you can open on its own. Styles, images and scripts load from apexdripstore.com, so it needs an internet connection.</p>
${groups}
<h2>Stylesheet and scripts</h2>
<ul class="download-list">
${shared.map(file => fileRow(`/downloads/files/${file.name}`, file.name, file.name.endsWith(".css") ? "Styles" : "Script", file.bytes, file.name)).join("\n")}
</ul>
<p>Shop links in every download go to the real retailer and affiliate pages. The contact form only sends messages on the live site.</p>
<div class="related-links"><a href="/">Back to the Hub →</a><a href="/guides/">Read the guides →</a><a href="/contact">Contact us →</a></div>
  </div></div>
</main>`;
  const title = "Downloads: Complete Website Files | APEXDRIP";
  const description = "Download the complete APEXDRIP website as a zip, or any single page as an HTML file.";
  return template
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*"/, `$1${esc(description)}"`)
    .replace(/(<meta property="og:title" content=")[^"]*"/, `$1${esc(title.replace(/ \| APEXDRIP$/, ""))}"`)
    .replace(/(<meta property="og:description" content=")[^"]*"/, `$1${esc(description)}"`)
    .replace(/(<link rel="canonical" href=")[^"]*"/, `$1${SITE}/downloads/"`)
    .replace(/(<meta property="og:url" content=")[^"]*"/, `$1${SITE}/downloads/"`)
    .replace(/<script type="application\/ld\+json">.*?<\/script>\n?/s, "")
    .replace(/<main id="main-content"[\s\S]*<\/main>/, main);
}

export function packageDownload(outDir) {
  const files = listFiles(outDir);
  const exists = rel => fs.existsSync(path.join(outDir, rel));
  const htmlFiles = files.filter(rel => rel.endsWith(".html"));
  const read = rel => fs.readFileSync(path.join(outDir, rel));
  const downloads = path.join(outDir, "downloads");
  fs.mkdirSync(path.join(downloads, "pages"), { recursive: true });
  fs.mkdirSync(path.join(downloads, "files"), { recursive: true });

  // 1. Complete website zip, with relative links so it opens straight from the folder.
  const entries = [
    { name: `${FOLDER}/README.txt`, data: Buffer.from(README, "utf8") },
    ...files.map(rel => {
      const data = read(rel);
      if (!rel.endsWith(".html")) return { name: `${FOLDER}/${rel}`, data };
      return { name: `${FOLDER}/${rel}`, data: Buffer.from(rewriteHtml(data.toString("utf8"), rel.split("/").length - 1, "files", exists), "utf8") };
    }),
  ];
  const zip = createZip(entries);
  fs.writeFileSync(path.join(downloads, ZIP_NAME), zip);

  // 2. Single pages that load their styles, scripts and images from the live site.
  const pages = htmlFiles
    .filter(rel => rel !== "404.html")
    .map(rel => {
      const source = read(rel).toString("utf8");
      const html = rewriteHtml(source, 0, "live", exists);
      const name = pageName(rel);
      fs.writeFileSync(path.join(downloads, "pages", name), html);
      return { rel, name, title: rel === "index.html" ? "Homepage" : titleOf(source) || name, bytes: Buffer.byteLength(html) };
    })
    .sort((a, b) => (a.rel === "index.html" ? -1 : b.rel === "index.html" ? 1 : a.rel.localeCompare(b.rel)));

  // 3. Shared stylesheet and scripts.
  const shared = SHARED_FILES.filter(exists).map(name => {
    fs.copyFileSync(path.join(outDir, name), path.join(downloads, "files", name));
    return { name, bytes: fs.statSync(path.join(outDir, name)).size };
  });

  // 4. The download page itself, using the site's own header and footer.
  const template = read(exists("404.html") ? "404.html" : "about.html").toString("utf8");
  fs.writeFileSync(path.join(downloads, "index.html"), downloadsPage(template, { zipBytes: zip.length, zipFiles: entries.length, pages, shared }));

  return { files: entries.length, bytes: zip.length, pages: pages.length };
}
