/* APEXDRIP storefront. Product data comes from catalog.js and, once the owner publishes
   from the secure dashboard at /admin/, from the read-only /api/products endpoint.
   No editing happens in this public script. */
const UI = window.ApexUI;
const CATALOG = window.APEX_CATALOG;
const brands = CATALOG.brands;
const regions = CATALOG.regions;
let products = CATALOG.products.slice();
let currentPage = "hub";
let hubFilter = "All";
let hubRegion = "india";
let catalogFilter = "All";
const pages = UI.DEPARTMENTS;
const pageDescriptions = {
  gaming: "Gaming laptops, keyboards, mice, headsets, controllers and chairs from Razer, Logitech G, HyperX, Lenovo, ASUS, Kreo and Redragon, with region and price labels.",
  technology: "Laptops, monitors, tablets, routers and electronics from ASUS, Lenovo, Logitech and official retailers, organised by region and currency.",
  audio: "Compare gaming headsets, earphones, speakers and USB microphones from HyperX, Logitech G, Razer, Kreo and Redragon.",
  accessories: "Mechanical keyboards, wireless gaming mice, mouse pads and webcams from Logitech, HyperX, Kreo, Razer and Redragon.",
  creator: "Creator gadgets for streamers and video makers: microphones, 4K webcams, key lights and colour-accurate displays.",
  gadgets: "Useful tech gadgets: chargers, laptop coolers, phone coolers and display glasses from ASUS, REDMAGIC, Kreo and Anker.",
  lifestyle: "Sneakers, backpacks, streetwear and everyday gear from PUMA, Adidas, Nike, ASUS TUF and more.",
  software: "Web hosting, website builders, design apps and security software for creators and small businesses.",
  deals: "Current retailer promotions and sale pages for gaming, tech and lifestyle. Always confirm the final price at checkout.",
  discover: "Browse the full APEXDRIP catalog with filters for store, region and category."
};
const icon = name => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const escapeHtml = UI.escapeHtml;
const labelFor = UI.labelFor;
const retailerFor = UI.retailerFor;
const fallbackImage = UI.FALLBACK;
const isDeal = UI.isDeal;
const inPage = UI.inDepartment;

/* Motion: crossfading Ken Burns slideshows, scrolling photo strips and scroll reveals */
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const slideTimers = new WeakMap();
function cycleSlides(host, onChange) {
  clearInterval(slideTimers.get(host));
  const slides = [...host.querySelectorAll("img")];
  if (slides.length < 2 || reduceMotion) return;
  let index = slides.findIndex(slide => slide.classList.contains("is-active"));
  slideTimers.set(host, setInterval(() => {
    if (document.hidden) return;
    slides[index].classList.remove("is-active");
    index = (index + 1) % slides.length;
    slides[index].classList.add("is-active");
    onChange?.(index);
  }, 4800));
}
function startSlides(host, images) {
  host.innerHTML = images.map((src, index) => `<img class="${index === 0 ? "is-active" : ""}" src="${escapeHtml(UI.imageUrl(src))}" alt="" width="640" height="420"${index ? ' loading="lazy"' : ""}>`).join("");
  host.hidden = !images.length;
  cycleSlides(host);
}
function renderStrip(host, images) {
  host.innerHTML = UI.stripHtml(images);
}
const revealObserver = "IntersectionObserver" in window && !reduceMotion ? new IntersectionObserver(entries => entries.forEach(entry => {
  if (!entry.isIntersecting) return;
  entry.target.classList.add("is-visible");
  revealObserver.unobserve(entry.target);
  setTimeout(() => entry.target.style.removeProperty("--delay"), 900);
}), { rootMargin:"0px 0px -8% 0px" }) : null;
function revealIn(host) {
  if (!revealObserver || !host) return;
  host.querySelectorAll(".product-card, .department-card, .brand-tile, .deal-row, .guide-card").forEach((element, index) => {
    if (element.classList.contains("reveal")) return;
    // Cards already on screen stay visible (no flash of the pre-rendered cards); the rest fade in on scroll.
    const box = element.getBoundingClientRect();
    if (box.width && box.top < innerHeight && box.bottom > 0) return;
    element.classList.add("reveal");
    element.style.setProperty("--delay", `${(index % 4) * 70}ms`);
    revealObserver.observe(element);
  });
}

function renderBrands() {
  $("#brandDirectory").innerHTML = brands.map(brand => `<a class="brand-tile" href="${escapeHtml(brand.url)}" target="_blank" rel="sponsored nofollow noopener noreferrer"><span class="brand-tile-name">${escapeHtml(brand.name)}</span><span class="brand-tile-tag">${escapeHtml(brand.tag)}</span><span class="brand-tile-region">${escapeHtml(brand.region)}</span>${icon("external")}</a>`).join("");
}
function renderDepartments() {
  $("#departmentGrid").innerHTML = UI.departmentCards(products);
}
function renderChips(host, filters, active, clickHandler, labeller = UI.hubChipLabel) {
  host.innerHTML = UI.chipsHtml(filters, active, labeller);
  host.onclick = event => {
    const target = event.target.closest("button[data-value]");
    if (!target) return;
    host.querySelectorAll("button").forEach(button => button.setAttribute("aria-pressed", String(button === target)));
    clickHandler(target.dataset.value);
  };
}
const productCard = product => UI.productCard(product);
const popularPicks = (limit = 8) => UI.popularPicks(products, limit);
// Same count as scripts/prerender-home.mjs so the pre-rendered cards and the live ones match.
const TRENDING_COUNT = 12;
function renderHubPicks() {
  $("#productGrid").innerHTML = UI.trendingPicks(products, hubFilter, TRENDING_COUNT).map(productCard).join("");
  revealIn($("#productGrid"));
  $("#hubMore").href = hubFilter === "All" ? "#discover" : `#${Object.keys(pages).find(key => pages[key].collection === hubFilter || pages[key].category === hubFilter) || "discover"}`;
}
function renderFeaturedDeals() {
  $("#featuredDeals").innerHTML = UI.featuredDeals(products, 3).map(UI.dealRow).join("");
  revealIn($("#featuredDeals"));
}
function renderRegionHub() {
  const region = regions.find(item => item.key === hubRegion) || regions[0];
  const list = UI.regionPicks(products, region.name);
  $("#regionInfo").innerHTML = UI.regionInfoHtml(region, list.length);
  $("#regionGrid").innerHTML = list.slice(0, 6).map(productCard).join("");
  revealIn($("#regionGrid"));
}
function collectionProducts() {
  const page = pages[currentPage];
  return page ? products.filter(product => inPage(product, page)) : products;
}
function catalogOptions(list) {
  const valueFor = currentPage === "discover" ? product => product.category : product => product.type;
  return ["All", ...new Set(list.map(valueFor).filter(Boolean))];
}
function renderCatalog() {
  const retailer = $("#retailerSelect").value;
  const region = $("#regionSelect").value;
  const term = $("#searchInput").value.trim().toLowerCase();
  const sort = $("#sortSelect").value;
  const list = collectionProducts().filter(product => {
    const filterValue = currentPage === "discover" ? product.category : product.type;
    const haystack = [product.name, product.description, product.category, ...(product.also || []).map(labelFor), product.type, product.brand, product.region, product.currency, retailerFor(product)].join(" ").toLowerCase();
    return (catalogFilter === "All" || filterValue === catalogFilter) && (!retailer || retailerFor(product) === retailer) && (!region || UI.regionMatches(product, region)) && term.split(/\s+/).every(word => haystack.includes(word));
  });
  const sortFunctions = {
    featured:UI.byFeatured,
    name:(first, second) => first.name.localeCompare(second.name),
    region:(first, second) => (first.region || "").localeCompare(second.region || "") || UI.byFeatured(first, second),
    "price-low":(first, second) => {
      const a = UI.hasPrice(first), b = UI.hasPrice(second);
      if (!a || !b) return Number(b) - Number(a);
      return first.currency.localeCompare(second.currency) || Number(first.price) - Number(second.price);
    }
  };
  list.sort(sortFunctions[sort] || UI.byFeatured);
  const empty = list.length === 0;
  const shown = empty ? popularPicks() : list;
  $("#allProductGrid").innerHTML = shown.map(productCard).join("");
  revealIn($("#allProductGrid"));
  $("#resultsCount").textContent = empty ? "" : `${list.length} ${list.length === 1 ? "find" : "finds"}${region ? ` in ${region}` : ""}`;
  $("#emptyState").hidden = !empty;
  // The message only exists once a search or filter really comes up empty, so it never appears in the page source.
  $("#emptyMessage").innerHTML = empty ? `Nothing in this collection matches <strong>${term ? `“${escapeHtml($("#searchInput").value.trim())}”` : "those filters"}</strong>, so here are popular picks from across the store.` : "";
}
function updateCatalogControls() {
  const list = collectionProducts();
  const filters = catalogOptions(list);
  const select = $("#retailerSelect");
  const selectedRetailer = select.value;
  const retailers = [...new Set(list.map(retailerFor).filter(Boolean))].sort((first, second) => first.localeCompare(second));
  select.innerHTML = '<option value="">All stores</option>' + retailers.map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("");
  select.value = retailers.includes(selectedRetailer) ? selectedRetailer : "";
  $("#retailerControl").hidden = retailers.length < 2;
  const regionSelect = $("#regionSelect");
  const selectedRegion = regionSelect.value;
  const available = regions.filter(region => list.some(product => UI.regionMatches(product, region.name)));
  regionSelect.innerHTML = '<option value="">All regions</option>' + available.map(region => `<option value="${escapeHtml(region.name)}">${escapeHtml(region.name)}${region.currency ? ` (${region.currency})` : ""}</option>`).join("");
  regionSelect.value = available.some(region => region.name === selectedRegion) ? selectedRegion : "";
  $("#regionControl").hidden = available.length < 2;
  if (!filters.includes(catalogFilter)) catalogFilter = "All";
  renderChips($("#catalogFilters"), filters, catalogFilter, value => { catalogFilter = value; renderCatalog(); });
}
function renderProducts() {
  renderHubPicks();
  renderFeaturedDeals();
  renderRegionHub();
  renderDepartments();
  revealIn($("#departmentGrid"));
  if (currentPage !== "hub") {
    updateCatalogControls();
    renderCatalog();
  }
}
function openProduct(id) {
  const product = products.find(item => item.id === id);
  if (!product) return;
  const region = regions.find(item => item.name === (product.region || "International"));
  const related = guidesFor(product);
  $("#modalContent").innerHTML = `<figure class="modal-image"><img src="${escapeHtml(UI.imageUrl(product.image))}" alt="${escapeHtml(UI.altText(product))}" width="820" height="500"><figcaption>Image: ${escapeHtml(product.brand || retailerFor(product))}</figcaption></figure><div class="modal-copy"><div class="eyebrow">${escapeHtml(labelFor(product.category))} / ${escapeHtml(retailerFor(product))}</div><h2 id="modalTitle">${escapeHtml(product.name)}</h2><p>${escapeHtml(product.description)}</p><div class="price-row">${UI.priceHtml(product)}</div><dl class="modal-facts"><div><dt>Region</dt><dd>${escapeHtml(UI.regionLabel(product))}</dd></div><div><dt>Retailer</dt><dd>${escapeHtml(retailerFor(product))}</dd></div><div><dt>Shipping</dt><dd>${escapeHtml(product.shipping || region?.shipping || "Confirm delivery options on the retailer's site.")}</dd></div><div><dt>Link</dt><dd>${UI.linkTag(product)}</dd></div></dl>${related.length ? `<p class="modal-guides">Read: ${related.map(guide => `<a href="/guides/${guide.slug}/">${escapeHtml(guide.short)}</a>`).join(" · ")}</p>` : ""}<p class="disclosure">Prices, stock and delivery can change and vary by region. Confirm details on the retailer’s site. APEXDRIP may earn a commission from qualifying purchases at no extra cost to you. <a href="/disclosure">How we earn</a></p>${UI.shopLink(product, "btn btn-primary")}</div>`;
  $("#productModal").showModal();
}
const guides = [
  {slug:"best-budget-mechanical-keyboards", short:"Budget mechanical keyboards", match:p => p.type === "Keyboards"},
  {slug:"best-gaming-mice-competitive", short:"Competitive gaming mice", match:p => p.type === "Mice" && p.category === "Gaming"},
  {slug:"top-creator-desk-gadgets", short:"Creator desk gadgets", match:p => UI.inCollection(p, "Creator")},
  {slug:"best-gaming-headsets", short:"Gaming headsets", match:p => p.type === "Headsets"},
  {slug:"gaming-setup-essentials", short:"Gaming setup essentials", match:p => ["Desk Setup","Chairs & Desks","Desk Lighting","Gaming Monitors","Monitors"].includes(p.type)}
];
const guidesFor = product => guides.filter(guide => guide.match(product));

function renderCollection(page, options) {
  $("#breadcrumbCurrent").textContent = page.label || page.title;
  $("#collectionEyebrow").innerHTML = `${icon(page.icon)} ${page.eyebrow}`;
  $("#collectionTitle").innerHTML = page.highlight ? `${page.title} <em>${page.highlight}</em>` : `<em>${page.title}</em>`;
  $("#collectionDescription").textContent = page.description;
  $("#catalogEyebrow").textContent = currentPage === "deals" ? "RETAILER SALES & DISCOUNTS" : "BROWSE THE COLLECTION";
  $("#catalogTitle").innerHTML = currentPage === "deals" ? "Explore <em>Offers</em>" : "Shop the <em>Catalog</em>";
  startSlides($("#collectionImage"), page.images || []);
  renderStrip($("#collectionStrip"), [...(page.images || []), ...collectionProducts().map(product => product.image)]);
  $("#searchInput").value = options.get("q") || "";
  $("#sortSelect").value = "featured";
  $("#retailerSelect").value = "";
  // Start each department fresh; a region picked elsewhere could otherwise leave this collection empty.
  $("#regionSelect").value = "";
  catalogFilter = options.get("type") || "All";
  $("#brands").hidden = currentPage !== "discover";
  $("#dealsAds").hidden = currentPage !== "deals";
  $("#techAds").hidden = currentPage !== "technology";
  $("#techSpotlight").hidden = currentPage !== "technology";
  $("#lifestyleAds").hidden = currentPage !== "lifestyle";
  $("#gamingBanners").hidden = currentPage !== "gaming";
  const guideLinks = guides.filter(guide => collectionProducts().some(guide.match));
  $("#collectionGuides").hidden = !guideLinks.length;
  $("#collectionGuideLinks").innerHTML = guideLinks.map(guide => `<a href="/guides/${guide.slug}/">${escapeHtml(guide.short)} ${icon("arrow")}</a>`).join("");
  updateCatalogControls();
  const region = options.get("region");
  if (region && [...$("#regionSelect").options].some(option => option.value === region)) $("#regionSelect").value = region;
  renderCatalog();
}
function setMenu(open) {
  $("#mainNav").classList.toggle("open", open);
  $("#menuToggle").setAttribute("aria-expanded", String(open));
}
function setMeta(title, description) {
  document.title = title;
  $('meta[name="description"]').setAttribute("content", description);
}
const HUB_TITLE = "APEXDRIP — Gaming Gear, Tech & Creator Gadgets | India, USA, UK, Chile & Worldwide";
const HUB_DESCRIPTION = $('meta[name="description"]').getAttribute("content");
function route(focusHeading = false) {
  const [hash, query] = location.hash.slice(1).split("?");
  if (/^(invite_token|recovery_token|confirmation_token|email_change_token|access_token)=/.test(hash)) {
    // Netlify Identity emails link to the site root; finish the flow in the Control Room.
    location.replace("/admin/" + location.hash);
    return;
  }
  if (hash === "admin") {
    // The owner dashboard lives on its own authenticated page.
    location.replace("/admin/");
    return;
  }
  const aliases = {home:"hub", tech:"technology", "best-deals":"deals", "all-products":"discover", brands:"discover", "computer-accessories":"accessories", "creator-gadgets":"creator", "audio-accessories":"audio"};
  const key = Object.hasOwn(aliases, hash) ? aliases[hash] : hash;
  const page = Object.hasOwn(pages, key) ? pages[key] : null;
  currentPage = page ? key : "hub";
  $("#hubPage").hidden = Boolean(page);
  $("#collectionPage").hidden = !page;
  $$("#mainNav a").forEach(link => {
    if (link.dataset.page === currentPage) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  setMenu(false);
  if (page) setMeta(`${page.label || page.title}${page.highlight && !page.label ? " " + page.highlight : ""} | APEXDRIP`, pageDescriptions[key] || page.description);
  else setMeta(HUB_TITLE, HUB_DESCRIPTION);
  if (page) renderCollection(page, new URLSearchParams(query));
  const anchors = {brands:"brands", categories:"categories", trending:"trending", "featured-deals":"featured-deals", "all-products":"catalogTitle", regions:"regions", guides:"guides"};
  if (Object.hasOwn(anchors, hash)) document.getElementById(anchors[hash]).scrollIntoView();
  else if (focusHeading) {
    $(page ? "#collectionTitle" : "#main-content").focus({ preventScroll:true });
    window.scrollTo(0, 0);
  }
}

$("#searchInput").addEventListener("input", renderCatalog);
$("#sortSelect").addEventListener("change", renderCatalog);
$("#retailerSelect").addEventListener("change", renderCatalog);
$("#regionSelect").addEventListener("change", renderCatalog);
$("#clearFilters").addEventListener("click", () => {
  $("#searchInput").value = "";
  $("#retailerSelect").value = "";
  $("#regionSelect").value = "";
  catalogFilter = "All";
  updateCatalogControls();
  renderCatalog();
  $("#searchInput").focus();
});
$("#searchToggle").addEventListener("click", () => {
  setMenu(false);
  $("#overlaySearch").value = currentPage === "discover" ? $("#searchInput").value : "";
  $("#searchOverlay").showModal();
});
$("#searchForm").addEventListener("submit", event => {
  event.preventDefault();
  const term = $("#overlaySearch").value.trim();
  const target = term ? `#discover?${new URLSearchParams({q:term})}` : "#discover";
  $("#searchOverlay").close();
  if (location.hash === target) route(true);
  else location.hash = target;
});
[["#searchOverlay", "#closeSearch"], ["#productModal", "#modalClose"]].forEach(([dialogId, closeId]) => {
  const dialog = $(dialogId);
  $(closeId).addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
});
$("main").addEventListener("click", event => {
  const trigger = event.target.closest("button[data-view]");
  if (trigger) openProduct(trigger.dataset.view);
});
[$("#main-content"), $("#modalContent")].forEach(host => host.addEventListener("error", event => {
  if (event.target.matches("img") && !event.target.getAttribute("src").endsWith("product-fallback.svg")) event.target.src = fallbackImage;
}, true));
$("#menuToggle").addEventListener("click", event => setMenu(event.currentTarget.getAttribute("aria-expanded") !== "true"));
$("#mainNav").addEventListener("click", event => { if (event.target.closest("a")) setMenu(false); });
document.addEventListener("click", event => {
  const link = event.target.closest("a[href^='#']");
  if (!link || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.hash !== location.hash) return;
  event.preventDefault();
  route(true);
});
document.addEventListener("keydown", event => {
  if (event.key !== "Escape" || !$("#mainNav").classList.contains("open")) return;
  setMenu(false);
  $("#menuToggle").focus();
});
$(".skip-link").addEventListener("click", event => {
  event.preventDefault();
  $("#main-content").focus();
});
$("#year").textContent = new Date().getFullYear();
renderChips($("#hubFilters"), UI.HUB_FILTERS, hubFilter, value => { hubFilter = value; renderHubPicks(); });
renderChips($("#regionTabs"), regions.map(region => region.key), hubRegion, value => { hubRegion = value; renderRegionHub(); }, UI.regionChipLabel(regions));
renderBrands();
revealIn($("#brandDirectory"));
revealIn($("#guideGrid"));
renderStrip($('[data-strip="hub"]'), products.map(product => product.image));
cycleSlides($(".hero-slides"), index => { $("#heroCount").textContent = String(index + 1).padStart(2, "0"); });
renderProducts();
route();
window.addEventListener("hashchange", () => route(true));
UI.loadLiveCatalog(null).then(live => {
  if (!live) return;
  products = live;
  renderProducts();
});
