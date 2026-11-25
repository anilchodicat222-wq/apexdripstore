// APEXDRIP Control Room. Bundled at build time with @netlify/identity.
// Nothing here is a secret: every read or write of private data goes through /api/admin/*,
// which checks the signed-in user's "admin" role on the server.
import { login, logout, getUser, handleAuthCallback, requestPasswordRecovery, updateUser, acceptInvite, refreshSession, AuthError, MissingIdentityError } from "@netlify/identity";

const UI = window.ApexUI;
const BUNDLED = window.APEX_CATALOG.products;
const CATEGORIES = ["Gaming", "Technology", "Audio", "Accessories", "Creator", "Gadgets", "Lifestyle", "Software", "Deals"];
const REGIONS = ["India", "USA", "UK", "Chile", "International"];
const CURRENCIES = [["", "— none —"], ["INR", "INR — Indian Rupee (₹)"], ["USD", "USD — US Dollar ($)"], ["GBP", "GBP — Pound Sterling (£)"], ["CLP", "CLP — Chilean Peso ($)"], ["EUR", "EUR — Euro (€)"]];
const REGION_CURRENCY = { India: "INR", USA: "USD", UK: "GBP", Chile: "CLP", International: "" };

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const esc = UI.escapeHtml;
let products = [];
let source = "bundled";
let dirty = false;
let editingId = null;
let pendingInviteToken = null;

function message(target, text, isError = false) {
  const element = $(target);
  element.textContent = text;
  element.classList.toggle("error", isError);
}
function authError(error) {
  if (error instanceof MissingIdentityError) return "Sign-in is not available yet on this deploy. Enable Identity for the site, then try again.";
  if (error instanceof AuthError) {
    if (error.status === 401 || error.status === 400) return "Email or password is incorrect.";
    if (error.status === 422) return "Check the email and password and try again.";
    return error.message;
  }
  return "Something went wrong. Please try again.";
}
function token() {
  const match = document.cookie.match(/(?:^|;\s*)nf_jwt=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}
async function api(path, options = {}) {
  await refreshSession().catch(() => null);
  const response = await fetch(path, {
    ...options,
    headers: { accept: "application/json", authorization: `Bearer ${token()}`, ...(options.body ? { "content-type": "application/json" } : {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || `Request failed (${response.status})`);
    error.status = response.status;
    error.details = data.details;
    throw error;
  }
  return data;
}
function setDirty(value) {
  dirty = value;
  $("#draftState").textContent = dirty ? "● UNPUBLISHED CHANGES" : source === "database" ? "PUBLISHED" : "SHOWING BUNDLED CATALOG";
}
window.addEventListener("beforeunload", event => { if (dirty) event.preventDefault(); });

/* ---------- Auth flow ---------- */
function showAuth(title, help, mode = "login") {
  $("#adminShell").hidden = true;
  $("#authScreen").hidden = false;
  $("#authTitle").textContent = title;
  $("#authHelp").textContent = help;
  $("#loginForm").hidden = mode !== "login";
  $("#passwordForm").hidden = mode !== "password";
}
async function enterDashboard() {
  try {
    const session = await api("/api/admin/session");
    $("#adminUser").textContent = `Signed in as ${session.email}`;
  } catch (error) {
    if (error.status === 403) {
      showAuth("No owner access", "You are signed in, but this account does not have the owner role. Ask the site owner to add the admin role to your account.");
      $("#loginForm").hidden = false;
      await logout().catch(() => {});
      return;
    }
    showAuth("Owner sign-in", "Sign in with the account that has owner access.");
    if (error.status !== 401) message("#authMessage", error.message, true);
    return;
  }
  $("#authScreen").hidden = true;
  $("#adminShell").hidden = false;
  await loadProducts();
  show("overview");
}
async function loadProducts() {
  const data = await api("/api/admin/products");
  source = data.source;
  products = data.products.length ? data.products : structuredClone(BUNDLED);
  setDirty(false);
  if (source === "bundled") message("#adminMessage", "The live site is using the catalog bundled with the website. Publishing saves your edited catalog to the database and the live site switches to it.");
}
$("#loginForm").addEventListener("submit", async event => {
  event.preventDefault();
  const form = new FormData(event.target);
  message("#authMessage", "Signing in…");
  try {
    await login(String(form.get("email")), String(form.get("password")));
    message("#authMessage", "");
    await enterDashboard();
  } catch (error) {
    message("#authMessage", authError(error), true);
  }
});
$("#forgotBtn").addEventListener("click", async () => {
  const email = $("#loginForm").elements.email.value.trim();
  if (!email) return message("#authMessage", "Enter your email first, then choose Forgot password.", true);
  try {
    await requestPasswordRecovery(email);
    message("#authMessage", "If that account exists, a reset link is on its way.");
  } catch (error) {
    message("#authMessage", authError(error), true);
  }
});
$("#passwordForm").addEventListener("submit", async event => {
  event.preventDefault();
  const password = String(new FormData(event.target).get("password"));
  try {
    if (pendingInviteToken) await acceptInvite(pendingInviteToken, password);
    else await updateUser({ password });
    pendingInviteToken = null;
    history.replaceState(null, "", "/admin/");
    await enterDashboard();
  } catch (error) {
    message("#authMessage", authError(error), true);
  }
});
$("#logoutBtn").addEventListener("click", async () => {
  if (dirty && !confirm("You have unpublished changes. Sign out anyway?")) return;
  await logout().catch(() => {});
  dirty = false;
  showAuth("Signed out", "Sign in again to manage the catalog.");
});

/* ---------- Views ---------- */
function show(tab) {
  $$(".admin-tab").forEach(button => button.classList.toggle("active", button.dataset.tab === tab));
  if (tab === "overview") renderOverview();
  if (tab === "products") renderProducts();
  if (tab === "add") renderForm(editingId);
}
$$(".admin-tab").forEach(button => button.addEventListener("click", () => { editingId = null; show(button.dataset.tab); }));
$("#adminAddBtn").addEventListener("click", () => { editingId = null; show("add"); });
$("#publishBtn").addEventListener("click", publish);

function renderOverview() {
  $("#adminTitle").textContent = "OVERVIEW";
  const priced = products.filter(UI.hasPrice).length;
  const affiliate = products.filter(product => product.linkType === "affiliate").length;
  const byRegion = REGIONS.map(region => `<li>${region}: <strong>${products.filter(product => (product.region || "International") === region).length}</strong></li>`).join("");
  $("#adminView").innerHTML = `<div class="notice"><strong>HOW PUBLISHING WORKS:</strong> Edits stay in this tab until you choose <em>Publish changes</em>. Publishing saves the catalog to the site database and updates the storefront for every visitor. Only accounts with the owner role can publish.</div>
  <div class="stats-grid"><div class="stat-card"><small>TOTAL PRODUCTS</small><strong>${products.length}</strong></div><div class="stat-card"><small>VERIFIED PRICES</small><strong>${priced}</strong></div><div class="stat-card"><small>AFFILIATE LINKS</small><strong>${affiliate}</strong></div></div>
  <div class="admin-card"><h3>BY REGION</h3><ul>${byRegion}</ul></div>
  <div class="admin-card"><h3>QUICK ACTIONS</h3><div class="form-actions"><button class="btn btn-primary" id="overviewAdd" type="button">＋ ADD PRODUCT</button><button class="small-btn" id="exportProducts" type="button">↓ EXPORT JSON</button><label class="small-btn" for="importFile">↑ IMPORT JSON</label><input id="importFile" type="file" accept=".json,application/json" class="hidden"><button class="small-btn danger" id="revertBundled" type="button">REVERT LIVE SITE TO BUNDLED CATALOG</button></div></div>`;
  $("#overviewAdd").onclick = () => { editingId = null; show("add"); };
  $("#exportProducts").onclick = exportProducts;
  $("#importFile").onchange = importProducts;
  $("#revertBundled").onclick = revertToBundled;
}
function renderProducts() {
  $("#adminTitle").textContent = "PRODUCTS";
  $("#adminView").innerHTML = `<div class="notice">Use approved affiliate tracking URLs when you have them, and mark the link type. Enter a price only after checking it on the retailer's site, and record the date you checked it.</div>
  <div class="admin-filter"><input id="adminSearch" type="search" placeholder="Search products" aria-label="Search products"><select id="adminRegion" aria-label="Filter by region"><option value="">All regions</option>${REGIONS.map(region => `<option>${region}</option>`).join("")}</select></div>
  <div class="admin-card"><h3>PRODUCT CATALOG (<span id="adminCount">${products.length}</span>)</h3><table class="admin-table"><thead><tr><th>IMAGE</th><th>PRODUCT</th><th>CATEGORY</th><th>REGION</th><th>PRICE</th><th>LINK</th><th>ACTIONS</th></tr></thead><tbody id="adminRows"></tbody></table></div>`;
  const draw = () => {
    const term = $("#adminSearch").value.trim().toLowerCase();
    const region = $("#adminRegion").value;
    const list = products.filter(product => (!region || (product.region || "International") === region) && (!term || `${product.name} ${product.brand} ${product.retailer}`.toLowerCase().includes(term)));
    $("#adminCount").textContent = list.length;
    $("#adminRows").innerHTML = list.map(product => `<tr><td><img class="admin-thumb" src="${esc(UI.imageUrl(product.image))}" alt=""></td><td>${esc(product.name)}<small>${esc(UI.retailerFor(product))}</small></td><td>${esc(UI.labelFor(product.category))}</td><td>${esc(product.region || "International")}</td><td>${UI.hasPrice(product) ? esc(UI.money(product.price, product.currency)) : "—"}</td><td>${esc(product.linkType || "retailer")}</td><td><div class="table-actions"><button class="small-btn" data-edit="${esc(product.id)}" type="button">EDIT</button><button class="small-btn danger" data-delete="${esc(product.id)}" type="button">DELETE</button></div></td></tr>`).join("");
  };
  $("#adminSearch").oninput = draw;
  $("#adminRegion").onchange = draw;
  $("#adminRows").onclick = event => {
    const edit = event.target.closest("[data-edit]");
    const remove = event.target.closest("[data-delete]");
    if (edit) { editingId = edit.dataset.edit; show("add"); }
    if (remove && confirm("Delete this product from the catalog? It disappears from the live site when you publish.")) {
      products = products.filter(product => product.id !== remove.dataset.delete);
      setDirty(true);
      draw();
    }
  };
  draw();
}
function renderForm(id) {
  const product = products.find(item => item.id === id) || { category: "Gaming", region: "India", currency: "INR", linkType: "retailer", also: [] };
  $("#adminTitle").textContent = id ? "EDIT PRODUCT" : "ADD PRODUCT";
  const input = (name, label, type = "text", attributes = "", full = false) => `<label class="field${full ? " full" : ""}">${label}<input name="${name}" type="${type}" value="${esc(product[name] ?? "")}" ${attributes}></label>`;
  const select = (name, label, options) => `<label class="field">${label}<select name="${name}">${options.map(([value, text]) => `<option value="${esc(value)}"${(product[name] ?? "") === value ? " selected" : ""}>${esc(text)}</option>`).join("")}</select></label>`;
  $("#adminView").innerHTML = `<div class="notice">Leave the price empty if you haven't checked it on the retailer's site. Changes are not live until you publish.</div>
  <form id="productForm" class="admin-card" novalidate><div class="form-grid">
    ${input("name", "Product name", "text", "required maxlength=160", true)}
    ${input("brand", "Brand", "text", "maxlength=80")}
    ${input("retailer", "Retailer / store name", "text", "maxlength=80")}
    ${select("category", "Main category", CATEGORIES.map(value => [value, UI.labelFor(value)]))}
    ${input("type", "Subcategory (e.g. Headsets)", "text", "maxlength=60")}
    <div class="field full">Also show in<div class="check-grid">${CATEGORIES.map(value => `<label><input type="checkbox" name="also" value="${value}"${(product.also || []).includes(value) ? " checked" : ""}> ${esc(UI.labelFor(value))}</label>`).join("")}</div></div>
    ${select("region", "Region", REGIONS.map(value => [value, value]))}
    ${select("currency", "Currency", CURRENCIES)}
    ${input("price", "Verified price", "number", 'min="0" step=".01"')}
    ${input("priceCheckedOn", "Price checked on", "date")}
    <label class="feature-field"><input name="priceFrom" type="checkbox"${product.priceFrom ? " checked" : ""}> Show as “From” price (varies by option)</label>
    ${select("linkType", "Link type", [["affiliate", "Affiliate tracking link"], ["retailer", "Direct retailer link (affiliate pending)"]])}
    ${input("affiliateUrl", "Store or affiliate URL", "url", 'required pattern="https?://.+"', true)}
    ${input("image", "Image (assets/… path or https URL)", "text", "required", true)}
    ${input("badge", "Badge text", "text", "maxlength=40")}
    ${input("shipping", "Shipping / availability note", "text", "maxlength=300", true)}
    <label class="field full">Short description<textarea name="description" maxlength="600">${esc(product.description || "")}</textarea></label>
    <label class="feature-field"><input name="featured" type="checkbox"${product.featured ? " checked" : ""}> Feature this product</label>
  </div><ul class="error-list" id="formErrors"></ul>
  <div class="form-actions"><button class="btn btn-primary" type="submit">SAVE TO DRAFT</button><button class="small-btn" type="button" id="cancelForm">Cancel</button></div></form>`;
  const form = $("#productForm");
  form.elements.region.onchange = () => { if (!form.elements.price.value) form.elements.currency.value = REGION_CURRENCY[form.elements.region.value]; };
  $("#cancelForm").onclick = () => { editingId = null; show("products"); };
  form.onsubmit = event => {
    event.preventDefault();
    const data = new FormData(form);
    const value = key => String(data.get(key) || "").trim();
    const price = value("price") === "" ? null : Number(value("price"));
    const next = {
      id: id || `p${Date.now()}`, name: value("name"), brand: value("brand"), retailer: value("retailer"), category: value("category"),
      also: data.getAll("also").filter(item => item !== value("category")), type: value("type"), badge: value("badge"), description: value("description"),
      image: value("image"), affiliateUrl: value("affiliateUrl"), linkType: value("linkType"), region: value("region"), currency: value("currency"),
      price, priceFrom: data.has("priceFrom") && price !== null, shipping: value("shipping"), featured: data.has("featured"),
    };
    if (price !== null && value("priceCheckedOn")) next.priceCheckedOn = value("priceCheckedOn");
    const errors = [];
    if (!next.name) errors.push("Add a product name.");
    if (!UI.webUrl(next.affiliateUrl)) errors.push("Add a valid store or affiliate URL starting with https://.");
    if (!next.image) errors.push("Add an image path or URL.");
    if (price !== null && (!Number.isFinite(price) || price < 0)) errors.push("Price must be a positive number.");
    if (price !== null && !next.currency) errors.push("Choose the currency for this price.");
    $("#formErrors").innerHTML = errors.map(error => `<li>${esc(error)}</li>`).join("");
    if (errors.length) return;
    products = id ? products.map(item => item.id === id ? next : item) : [next, ...products];
    editingId = null;
    setDirty(true);
    message("#adminMessage", `Saved “${next.name}” to your draft. Publish to make it live.`);
    show("products");
  };
}
async function publish() {
  message("#adminMessage", "Publishing…");
  try {
    const result = await api("/api/admin/products", { method: "PUT", body: JSON.stringify({ products }) });
    source = "database";
    setDirty(false);
    message("#adminMessage", `Published ${result.count} products. The live site updates within about a minute.`);
  } catch (error) {
    if (error.status === 401) return showAuth("Session expired", "Sign in again to publish. Your draft is kept in this tab.");
    message("#adminMessage", `${error.message}${error.details ? " " + error.details.join(" ") : ""}`, true);
  }
}
async function revertToBundled() {
  if (!confirm("Remove the published catalog from the database? The live site goes back to the catalog bundled with the website.")) return;
  try {
    await api("/api/admin/products", { method: "DELETE" });
    await loadProducts();
    renderOverview();
  } catch (error) {
    message("#adminMessage", error.message, true);
  }
}
function exportProducts() {
  const blob = new Blob([JSON.stringify(products, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement("a"), { href: url, download: "apexdrip-products.json" });
  link.click();
  URL.revokeObjectURL(url);
}
function importProducts(event) {
  const file = event.target.files[0];
  if (!file) return;
  file.text().then(text => {
    const list = JSON.parse(text);
    if (!Array.isArray(list) || !list.every(item => item && typeof item.id === "string" && typeof item.name === "string")) throw new Error();
    products = list;
    setDirty(true);
    message("#adminMessage", `Imported ${list.length} products into your draft. Review, then publish.`);
    renderOverview();
  }).catch(() => message("#adminMessage", "That file isn't a valid product export.", true));
}

/* ---------- Start ---------- */
(async function start() {
  try {
    const result = await handleAuthCallback();
    if (result?.type === "invite") {
      pendingInviteToken = result.token;
      return showAuth("Accept your invite", "Choose a password to finish setting up your owner account.", "password");
    }
    if (result?.type === "recovery") return showAuth("Reset your password", "Choose a new password for your account.", "password");
  } catch (error) {
    message("#authMessage", authError(error), true);
  }
  const user = await getUser();
  if (user) await enterDashboard();
  else showAuth("Owner sign-in", "This area is for the site owner. Sign in with the account that has owner access.");
})();
