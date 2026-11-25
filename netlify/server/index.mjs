// APEXDRIP API (Netlify Server).
//   GET    /api/products        public, read-only catalog published by the owner
//   GET    /api/admin/session   owner only: who is signed in
//   GET    /api/admin/products  owner only: published catalog for editing
//   PUT    /api/admin/products  owner only: publish the whole catalog
//   DELETE /api/admin/products  owner only: unpublish (site falls back to the bundled catalog)
import { asc } from "drizzle-orm";
import { db, schema } from "../../db/index.ts";
import { getAdmin } from "./auth.mjs";
import { validateCatalog } from "./validate.mjs";

export const config = { path: "/api/*" };

const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "x-content-type-options": "nosniff", ...headers },
  });
const privateHeaders = { "cache-control": "no-store", "x-robots-tag": "noindex" };

async function readCatalog() {
  const rows = await db.select().from(schema.products).orderBy(asc(schema.products.position));
  return {
    products: rows.map(row => row.data),
    updatedAt: rows.reduce((latest, row) => (row.updatedAt > latest ? row.updatedAt : latest), new Date(0)),
  };
}

async function publicProducts() {
  try {
    const { products, updatedAt } = await readCatalog();
    return json(
      { products, updatedAt: products.length ? updatedAt.toISOString() : null },
      200,
      { "cache-control": "public, max-age=0, must-revalidate", "netlify-cdn-cache-control": "public, max-age=60, stale-while-revalidate=300" },
    );
  } catch (error) {
    console.error("Failed to read catalog", error);
    // The storefront falls back to the bundled catalog when this is empty.
    return json({ products: [], updatedAt: null }, 200, { "cache-control": "no-store" });
  }
}

async function admin(request, pathname) {
  const auth = await getAdmin(request);
  if (auth.error) return json({ error: auth.error }, auth.status, privateHeaders);
  const { user } = auth;

  if (pathname === "/api/admin/session" && request.method === "GET") {
    return json({ email: user.email, roles: user.roles }, 200, privateHeaders);
  }
  if (pathname !== "/api/admin/products") return json({ error: "Not found" }, 404, privateHeaders);

  if (request.method === "GET") {
    const { products, updatedAt } = await readCatalog();
    return json({ products, source: products.length ? "database" : "bundled", updatedAt: products.length ? updatedAt.toISOString() : null }, 200, privateHeaders);
  }
  if (request.method === "PUT") {
    if (!(request.headers.get("content-type") || "").includes("application/json")) return json({ error: "Expected JSON." }, 415, privateHeaders);
    const body = await request.text();
    if (body.length > 2_000_000) return json({ error: "Catalog is too large." }, 413, privateHeaders);
    let payload;
    try {
      payload = JSON.parse(body);
    } catch {
      return json({ error: "Invalid JSON." }, 400, privateHeaders);
    }
    const { products, errors } = validateCatalog(payload?.products);
    if (errors.length) return json({ error: "Some products need fixing before they can be published.", details: errors.slice(0, 25) }, 422, privateHeaders);
    if (!products.length) return json({ error: "Add at least one product before publishing." }, 422, privateHeaders);
    await db.transaction(async tx => {
      await tx.delete(schema.products);
      await tx.insert(schema.products).values(products.map((product, position) => ({ id: product.id, position, data: product, updatedBy: user.email || user.id })));
    });
    return json({ ok: true, count: products.length }, 200, privateHeaders);
  }
  if (request.method === "DELETE") {
    await db.delete(schema.products);
    return json({ ok: true }, 200, privateHeaders);
  }
  return json({ error: "Method not allowed" }, 405, privateHeaders);
}

export default {
  async fetch(request) {
    const { pathname } = new URL(request.url);
    try {
      if (pathname === "/api/products" && request.method === "GET") return await publicProducts();
      if (pathname.startsWith("/api/admin/")) return await admin(request, pathname);
      return json({ error: "Not found" }, 404);
    } catch (error) {
      console.error(error);
      return json({ error: "Something went wrong." }, 500, privateHeaders);
    }
  },
};
