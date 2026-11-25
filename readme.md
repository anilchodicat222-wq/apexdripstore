# APEXDRIP STORE

An affiliate-first product discovery website for gaming gear, tech, audio, computer accessories, creator gadgets and lifestyle finds, organised by region (India, USA, UK, Chile and International).

## What's in the project
- **Storefront** (`index.html`, `app.js`, `styles.css`): The Hub, department pages (`#gaming`, `#technology`, `#audio`, `#accessories`, `#creator`, `#gadgets`, `#lifestyle`, `#software`, `#deals`, `#discover`), a Shop by Region section, buying guide cards and the existing sponsored banners.
- **Catalog data** (`catalog.js`): every product, with region, currency, retailer, link type (affiliate or retailer), shipping note and, only where checked, a price with the date it was checked.
- **Shared product cards** (`product-ui.js`): used by the storefront, guides and regional pages.
- **Static SEO pages** (generated): `/guides/` with five buying guides, `/regions/` with five regional shops, plus `/about`, `/contact`, `/disclosure`, `/privacy`, `/terms`, `sitemap.xml` and `robots.txt`.
- **Owner dashboard** (`/admin/`, APEXDRIP / CONTROL ROOM): sign-in with Netlify Identity; product changes are published to Netlify Database through the server API.
- **Server API** (`netlify/server/`): `GET /api/products` (public, read-only) and `/api/admin/*` (owner only, checked on the server).

## Editing content
- Guide text: `scripts/guides-content.mjs`. Page templates: `scripts/generate-pages.mjs`.
- After changing the catalog or guide text, run `npm run pages` and commit the regenerated HTML.
- The homepage product sections (Trending Products, Shop by Region, Featured Deals, Departments and the default catalog) are pre-rendered into `index.html` from `catalog.js` by `scripts/prerender-home.mjs`, so cards show without JavaScript. This runs with `npm run pages` and again on every deploy. Keep the `<!--prerender:…-->` markers in `index.html`. Trending Products shows 12 cards and puts products with a checked price and an affiliate link first, then other checked prices, then other affiliate links (`trendingPicks` in `product-ui.js`). Change the count in both `app.js` and `scripts/prerender-home.mjs`.
- Day-to-day product edits can be made in the Control Room instead. Published edits update the storefront and refresh the product cards on guide and region pages. The pre-rendered HTML on those pages comes from `catalog.js`, so copy important changes back into `catalog.js` (Export JSON in the dashboard helps) and regenerate.

## Owner access (one-time setup)
1. In the Netlify dashboard, open Identity, set registration to **Invite only**, and invite your email.
2. Accept the invite from the email (the link opens the Control Room so you can set a password).
3. Open your user in the Identity list and add the role `admin`.
Only users with the `admin` role can read or change the catalog through `/api/admin/*`. The `/admin/` page itself is just a sign-in screen; it holds no data or secrets.

## Affiliate links
Cards labelled “Affiliate link” use your tracking links (Redragon `aff=7443` / APEX10, REDMAGIC, ASUS, Lenovo Chile and the sponsored banners). Cards labelled “Retailer link” go straight to the official store until you add an approved tracking URL in the Control Room and switch the link type to Affiliate.

## Prices
Never enter a price you haven't checked on the retailer's site. Record the date in “Price checked on”. Unchecked products show “Price on retailer site”.

## Build
Netlify runs `npm run build`, which copies the site into `dist/` and bundles the Control Room script. Database migrations live in `netlify/database/migrations/` and are applied automatically on deploy.
