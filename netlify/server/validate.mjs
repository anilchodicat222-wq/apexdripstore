// Validation for products submitted from the owner dashboard. Anything not listed here is dropped.
export const CATEGORIES = ["Gaming", "Technology", "Audio", "Accessories", "Creator", "Gadgets", "Lifestyle", "Software", "Deals"];
export const REGIONS = ["India", "USA", "UK", "Chile", "International"];
export const CURRENCIES = ["", "INR", "USD", "GBP", "CLP", "EUR"];
export const LINK_TYPES = ["affiliate", "retailer"];
const MAX_PRODUCTS = 600;

const text = (value, max) => (typeof value === "string" ? value.trim().slice(0, max) : "");
function httpUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.href.slice(0, 2048) : "";
  } catch {
    return "";
  }
}
function image(value) {
  const raw = String(value || "").trim();
  if (/^\/?assets\/[a-z0-9-]+\.(webp|svg|png|jpg)$/i.test(raw)) return raw.replace(/^\//, "");
  return httpUrl(raw).startsWith("https:") ? httpUrl(raw) : "";
}

export function validateProduct(input, index) {
  const errors = [];
  if (!input || typeof input !== "object") return { errors: [`Item ${index + 1} is not a product.`] };
  const id = text(input.id, 64);
  const name = text(input.name, 160);
  const affiliateUrl = httpUrl(input.affiliateUrl);
  const img = image(input.image);
  if (!/^[A-Za-z0-9_-]+$/.test(id)) errors.push(`Item ${index + 1}: invalid id.`);
  if (!name) errors.push(`Item ${index + 1}: name is required.`);
  if (!affiliateUrl) errors.push(`${name || `Item ${index + 1}`}: a valid http(s) store link is required.`);
  if (!img) errors.push(`${name || `Item ${index + 1}`}: image must be an assets/ path or an https URL.`);
  const category = CATEGORIES.includes(input.category) ? input.category : "Gaming";
  const region = REGIONS.includes(input.region) ? input.region : "International";
  const currency = CURRENCIES.includes(input.currency) ? input.currency : "";
  let price = input.price === "" || input.price == null ? null : Number(input.price);
  if (price !== null && (!Number.isFinite(price) || price < 0 || price > 1e9)) {
    errors.push(`${name}: price must be a positive number or empty.`);
    price = null;
  }
  if (price !== null && !currency) errors.push(`${name}: choose a currency for the price.`);
  const priceCheckedOn = /^\d{4}-\d{2}-\d{2}$/.test(input.priceCheckedOn || "") ? input.priceCheckedOn : undefined;
  const product = {
    id, name,
    brand: text(input.brand, 80),
    retailer: text(input.retailer, 80),
    category,
    also: Array.isArray(input.also) ? [...new Set(input.also.filter(value => CATEGORIES.includes(value) && value !== category))] : [],
    type: text(input.type, 60),
    badge: text(input.badge, 40),
    description: text(input.description, 600),
    image: img,
    affiliateUrl,
    linkType: LINK_TYPES.includes(input.linkType) ? input.linkType : "retailer",
    region, currency, price,
    priceFrom: Boolean(input.priceFrom) && price !== null,
    shipping: text(input.shipping, 300),
    featured: Boolean(input.featured),
  };
  if (price !== null && priceCheckedOn) product.priceCheckedOn = priceCheckedOn;
  return { product, errors };
}

export function validateCatalog(list) {
  if (!Array.isArray(list)) return { errors: ["Expected a list of products."] };
  if (list.length > MAX_PRODUCTS) return { errors: [`The catalog is limited to ${MAX_PRODUCTS} products.`] };
  const products = [];
  const errors = [];
  const ids = new Set();
  list.forEach((item, index) => {
    const result = validateProduct(item, index);
    errors.push(...result.errors);
    if (result.product) {
      if (ids.has(result.product.id)) errors.push(`Duplicate product id: ${result.product.id}`);
      ids.add(result.product.id);
      products.push(result.product);
    }
  });
  return { products, errors };
}
