// Netlify build: copy the static site into dist/ and bundle the Control Room script.
import fs from "node:fs";
import path from "node:path";
import { build } from "esbuild";
import { prerenderHome } from "./prerender-home.mjs";
import { packageDownload } from "./package-download.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const OUT = path.resolve(ROOT, process.env.OUT_DIR || "dist");
const SKIP = new Set(["node_modules", "dist", "scripts", "db", "netlify", ".git", ".netlify", "package.json", "package-lock.json", "drizzle.config.ts", "netlify.toml", "readme.md", ".gitignore", "admin.src.mjs"]);

fs.rmSync(OUT, { recursive: true, force: true });
function copy(from, to) {
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    if (SKIP.has(entry.name) || entry.name.startsWith(".")) continue;
    const source = path.join(from, entry.name);
    const target = path.join(to, entry.name);
    if (entry.isDirectory()) copy(source, target);
    else {
      fs.mkdirSync(to, { recursive: true });
      fs.copyFileSync(source, target);
    }
  }
}
copy(ROOT, OUT);
// Keep the pre-rendered homepage product cards in sync with catalog.js on every deploy.
const home = path.join(OUT, "index.html");
fs.writeFileSync(home, await prerenderHome(fs.readFileSync(home, "utf8")));
await build({
  entryPoints: [path.join(ROOT, "admin/admin.src.mjs")],
  outfile: path.join(OUT, "admin/admin.js"),
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2020",
  minify: true,
  legalComments: "none",
});
// Downloads area for the finished public pages: /downloads/ (full zip, single pages, scripts)
const pack = packageDownload(OUT);
console.log(`Downloads: zip with ${pack.files} files (${(pack.bytes / 1048576).toFixed(1)} MB), ${pack.pages} single pages`);
console.log(`Site built into ${path.relative(ROOT, OUT) || OUT}`);
