/* Shared product rendering for the storefront, regional pages and buying guides.
   Works in the browser (window.ApexUI) and in Node (page generator). */
(function (root) {
  var LOCALES = { INR: "en-IN", USD: "en-US", GBP: "en-GB", CLP: "es-CL", EUR: "en-IE" };
  var REGION_FLAGS = { India: "🇮🇳", USA: "🇺🇸", UK: "🇬🇧", Chile: "🇨🇱", International: "🌐" };
  var CATEGORY_LABELS = { Deals: "Best Deals", Audio: "Audio Accessories", Accessories: "Computer Accessories", Creator: "Creator Gadgets" };
  var FALLBACK = "/assets/product-fallback.svg";

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function labelFor(category) { return CATEGORY_LABELS[category] || category; }
  function hasPrice(product) {
    var value = product.price;
    return value !== null && value !== undefined && value !== "" && isFinite(Number(value)) && Number(value) > 0 && Boolean(product.currency);
  }
  function money(value, currency) {
    try {
      var text = new Intl.NumberFormat(LOCALES[currency] || "en-US", { style: "currency", currency: currency, maximumFractionDigits: currency === "CLP" || currency === "INR" ? 0 : 2 }).format(Number(value));
      // Make dollar currencies unambiguous: "US$" / "CLP $"
      if (currency === "CLP") text = "CLP " + text.replace(/^CLP\s*/, "");
      if (currency === "USD") text = "US" + text.replace(/^US/, "");
      return text;
    } catch (error) {
      return currency + " " + value;
    }
  }
  function formatDate(iso) {
    if (!iso) return "";
    var date = new Date(iso + "T12:00:00Z");
    if (isNaN(date)) return "";
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  }
  function webUrl(value) {
    try {
      var url = new URL(value);
      return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
    } catch (error) {
      return "";
    }
  }
  function imageUrl(value) {
    if (/^\/?assets\/[a-z0-9-]+\.(webp|svg|png|jpg)$/i.test(value || "")) return value.charAt(0) === "/" ? value : "/" + value;
    return webUrl(value) || FALLBACK;
  }
  function retailerFor(product) { return product.retailer || product.brand || ""; }
  function regionLabel(product) {
    var region = product.region || "International";
    return region + (product.currency ? " · " + product.currency : "");
  }
  function priceHtml(product) {
    if (!hasPrice(product)) return '<span class="price price-check">Price on retailer site</span>';
    var checked = product.priceCheckedOn ? '<span class="price-checked">Checked ' + escapeHtml(formatDate(product.priceCheckedOn)) + "</span>" : "";
    return '<span class="price">' + (product.priceFrom ? "<small>From</small> " : "") + escapeHtml(money(product.price, product.currency)) + "</span>" + checked;
  }
  function linkTag(product) {
    if (!webUrl(product.affiliateUrl)) return '<span class="link-tag link-pending">Awaiting store link</span>';
    return product.linkType === "affiliate"
      ? '<span class="link-tag link-affiliate" title="APEXDRIP may earn a commission from qualifying purchases">Affiliate link</span>'
      : '<span class="link-tag link-retailer" title="Direct link to the official store. Affiliate link pending.">Retailer link</span>';
  }
  function altText(product) {
    return product.name + (product.brand && product.name.indexOf(product.brand) === -1 ? " by " + product.brand : "") + " product photo";
  }
  function shopLink(product, className, label) {
    var url = webUrl(product.affiliateUrl);
    if (!url) return "";
    var rel = product.linkType === "affiliate" ? "sponsored nofollow noopener" : "nofollow noopener";
    return '<a class="' + className + '" href="' + escapeHtml(url) + '" target="_blank" rel="' + rel + '" aria-label="' + escapeHtml((label || "Shop now") + ": " + product.name + " at " + retailerFor(product)) + ' (opens in a new tab)">' + escapeHtml(label || "SHOP NOW") + ' <svg class="icon" aria-hidden="true"><use href="#i-external"/></svg></a>';
  }
  function productCard(product, options) {
    options = options || {};
    var id = escapeHtml(product.id);
    var name = escapeHtml(product.name);
    var heading = options.headingLevel || 3;
    var badge = escapeHtml(product.badge || "APEX PICK");
    var badgeClass = product.category === "Deals" ? "badge-deal" : product.featured ? "badge-featured" : "";
    var image = '<img loading="lazy" decoding="async" src="' + escapeHtml(imageUrl(product.image)) + '" alt="' + escapeHtml(altText(product)) + '" width="820" height="500">';
    var media = options.interactive === false
      ? '<a class="product-image" href="' + escapeHtml(options.detailsHref || "/#discover") + '">' + image + '<span class="product-badge ' + badgeClass + '">' + badge + "</span></a>"
      : '<button type="button" class="product-image" data-view="' + id + '" aria-label="View details for ' + name + '">' + image + '<span class="product-badge ' + badgeClass + '">' + badge + "</span></button>";
    var details = options.interactive === false
      ? '<a class="view-product" href="' + escapeHtml(options.detailsHref || "/#discover") + '">' + escapeHtml(options.detailsLabel || "MORE LIKE THIS") + "</a>"
      : '<button class="view-product" type="button" data-view="' + id + '" aria-label="Details for ' + name + '">DETAILS <svg class="icon" aria-hidden="true"><use href="#i-arrow"/></svg></button>';
    return '<article class="product-card" data-region="' + escapeHtml(product.region || "International") + '">' + media +
      '<div class="product-info"><div class="product-meta"><span class="product-brand">' + escapeHtml(retailerFor(product)) + '</span> <span class="region-tag">' + escapeHtml(regionLabel(product)) + "</span></div>" +
      "<h" + heading + ' class="product-name">' + name + "</h" + heading + '><p class="product-desc">' + escapeHtml(product.description) + "</p>" +
      '<p class="product-cat">' + escapeHtml(labelFor(product.category)) + (product.type ? " / " + escapeHtml(product.type) : "") + "</p>" +
      '<div class="price-row">' + priceHtml(product) + "</div>" +
      '<div class="link-row">' + linkTag(product) + "</div>" +
      '<div class="product-bottom">' + details + " " + shopLink(product, "buy-link") + "</div></div></article>";
  }
  function inCollection(product, key) {
    return product.category === key || (Array.isArray(product.also) && product.also.indexOf(key) !== -1);
  }
  function regionMatches(product, regionName) {
    return (product.region || "International") === regionName;
  }
  function byFeatured(first, second) { return Number(Boolean(second.featured)) - Number(Boolean(first.featured)); }
  function isDeal(product) { return product.category === "Deals"; }
  // Interleave by a field (category by default) so a list shows a mix of departments or brands.
  function mixCategories(list, field) {
    field = field || "category";
    var groups = [], seen = {};
    list.forEach(function (product) {
      var key = product[field] || "";
      if (!seen[key]) groups.push(seen[key] = []);
      seen[key].push(product);
    });
    var mixed = [];
    for (var index = 0; mixed.length < list.length; index++) groups.forEach(function (group) { if (group[index]) mixed.push(group[index]); });
    return mixed;
  }
  function popularPicks(products, limit) {
    return mixCategories(products.filter(function (product) { return !isDeal(product); }).sort(byFeatured)).slice(0, limit || 8);
  }
  function hasAffiliateLink(product) { return product.linkType === "affiliate" && Boolean(webUrl(product.affiliateUrl)); }
  // Trending ranks shoppable cards first: a checked price plus an affiliate link, then a checked price, then an affiliate link.
  function trendScore(product) {
    return (hasPrice(product) ? 2 : 0) + (hasAffiliateLink(product) ? 1 : 0) + (hasPrice(product) && hasAffiliateLink(product) ? 4 : 0);
  }
  function rankForTrending(list) {
    var tiers = {};
    list.forEach(function (product) { (tiers[trendScore(product)] = tiers[trendScore(product)] || []).push(product); });
    return Object.keys(tiers).map(Number).sort(function (a, b) { return b - a; }).reduce(function (ranked, score) {
      return ranked.concat(mixCategories(tiers[score].sort(byFeatured), "brand"));
    }, []);
  }
  // Trending Products on The Hub. Used by the browser and by the page generator, so both show the same cards.
  // Never returns an empty list: a filter with no products falls back to popular picks.
  function trendingPicks(products, filter, limit) {
    limit = limit || 12;
    var pool = rankForTrending(products.filter(function (product) { return filter === "All" ? !isDeal(product) : inCollection(product, filter); }));
    var picks = filter === "All" ? mixCategories(pool.slice(0, limit)) : pool.slice(0, limit);
    return picks.length ? picks : popularPicks(products, limit);
  }
  function regionPicks(products, regionName) {
    return products.filter(function (product) { return regionMatches(product, regionName); })
      .sort(function (first, second) { return Number(hasPrice(second)) - Number(hasPrice(first)) || byFeatured(first, second); });
  }
  function featuredDeals(products, limit) {
    return products.filter(isDeal).sort(byFeatured).slice(0, limit || 3);
  }
  var DEPARTMENTS = {
    gaming: {title:"Gaming", highlight:"Gear", category:"Gaming", eyebrow:"01 / THE GAMING EDIT", icon:"game", images:["assets/gaming-setup.webp","assets/shop-rm-12-pro.webp","assets/console.webp","assets/keyboard.webp","assets/shop-rm-astra-2-gaming-tablet.webp","assets/shop-asus-tuf-a16.webp","assets/mouse.webp","assets/gaming-chair.webp"], description:"Shop gaming laptops, phones, tablets, keyboards, mice, headsets, controllers, chairs and consoles from ASUS, Lenovo, REDMAGIC, Razer, HyperX, Kreo, Redragon, Logitech, Secretlab and more."},
    technology: {title:"Technology", category:"Technology", eyebrow:"02 / THE TECH EDIT", icon:"screen", images:["assets/phones.webp","assets/shop-asus-zenbook-s14.webp","assets/notebook.webp","assets/headphones.webp","assets/shop-asus-proart-pa279cdv.webp","assets/laptop.webp","assets/cybersecurity.webp"], description:"Find laptops, tablets, monitors, smartphones, audio and electronics from ASUS, Lenovo and other official stores and retailers."},
    audio: {title:"Audio", highlight:"Accessories", label:"Audio", collection:"Audio", eyebrow:"03 / THE SOUND EDIT", icon:"audio", images:["assets/headphones.webp","assets/shop-hx-cloud-iii.webp","assets/shop-lg-g733.webp","assets/speaker.webp","assets/shop-hx-quadcast-s.webp"], description:"Gaming headsets, earphones, desk speakers and microphones from HyperX, Logitech G, Razer, Kreo, Redragon and more."},
    accessories: {title:"Computer", highlight:"Accessories", label:"Computer Accessories", collection:"Accessories", eyebrow:"04 / THE DESK EDIT", icon:"keyboard", images:["assets/keyboard.webp","assets/shop-lg-superlight-2.webp","assets/shop-kreo-hive75-he.webp","assets/shop-lg-g915x.webp","assets/mouse.webp"], description:"Mechanical keyboards, gaming mice, mouse pads, webcams and productivity peripherals for every kind of desk."},
    creator: {title:"Creator", highlight:"Gadgets", label:"Creator Gadgets", collection:"Creator", eyebrow:"05 / THE CREATOR EDIT", icon:"camera", images:["assets/creator-gear.webp","assets/shop-hx-quadcast-s.webp","assets/shop-kreo-kast.webp","assets/shop-lg-litra-glow.webp","assets/shop-kreo-owl-4k-pro.webp"], description:"Microphones, webcams, key lights and creator displays that make streams, calls and videos look and sound better."},
    gadgets: {title:"Smart", highlight:"Gadgets", label:"Gadgets", category:"Gadgets", eyebrow:"06 / THE GADGET EDIT", icon:"box", images:["assets/power.webp","assets/creator-gear.webp","assets/speaker.webp","assets/headphones.webp"], description:"Find useful upgrades, from portable chargers and laptop coolers to wearable displays."},
    lifestyle: {title:"Lifestyle", highlight:"Finds", label:"Lifestyle", category:"Lifestyle", eyebrow:"07 / THE EVERYDAY EDIT", icon:"spark", images:["assets/streetwear.webp","assets/sneakers.webp","assets/fashion.webp","assets/speaker.webp"], description:"Discover everyday essentials, sneakers, backpacks and gear you’ll actually use."},
    software: {title:"Software", highlight:"& Tools", label:"Software", category:"Software", eyebrow:"08 / THE CREATOR STACK", icon:"laptop", images:["assets/shop-elementor-hero.webp","assets/web-tools.webp","assets/cybersecurity.webp","assets/design-apps.webp","assets/shop-host-og.webp"], description:"Build, design and protect with hosting, website builders, creative apps and security tools."},
    deals: {title:"Best", highlight:"Deals", label:"Best Deals", category:"Deals", eyebrow:"09 / THE DEAL RADAR", icon:"bolt", images:["assets/pc-games.webp","assets/game-keys.webp","assets/laptop.webp","assets/sneakers.webp"], description:"Find retailer sales and special offers. Confirm prices and availability before you buy."},
    discover: {title:"Discover", highlight:"More", label:"Discover", eyebrow:"10 / THE FULL CATALOG", icon:"compass", images:["assets/gaming-setup.webp","assets/design-apps.webp","assets/web-tools.webp","assets/streetwear.webp","assets/phones.webp"], description:"Browse every find from multiple shopping platforms and independent brand stores, with region and currency labels on each card."}
  };
  var DEPARTMENT_ORDER = Object.keys(DEPARTMENTS);
  function icon(name) { return '<svg class="icon" aria-hidden="true"><use href="#i-' + name + '"/></svg>'; }
  function inDepartment(product, page) {
    return page.collection ? inCollection(product, page.collection) : page.category ? inCollection(product, page.category) : true;
  }
  function departmentCards(products) {
    return DEPARTMENT_ORDER.map(function (key) {
      var page = DEPARTMENTS[key];
      var count = products.filter(function (product) { return inDepartment(product, page); }).length;
      return '<a class="department-card" href="#' + key + '">' + icon(page.icon) + "<h3>" + (page.label || page.title) + "</h3><p>" + page.description + '</p><span class="department-count">' + count + ' picks</span><span class="department-arrow">' + icon("external") + "</span></a>";
    }).join("");
  }
  function chipsHtml(values, active, labeller) {
    return values.map(function (value) {
      return '<button class="chip" type="button" data-value="' + escapeHtml(value) + '" aria-pressed="' + (value === active) + '">' + escapeHtml(labeller(value)) + "</button>";
    }).join("");
  }
  function hubChipLabel(value) { return value === "All" ? "All picks" : labelFor(value); }
  var HUB_FILTERS = ["All", "Gaming", "Technology", "Audio", "Accessories", "Creator", "Gadgets", "Lifestyle", "Software"];
  function regionChipLabel(regions) {
    return function (value) {
      var region = regions.filter(function (item) { return item.key === value; })[0];
      return region.name + (region.currency ? " · " + region.currency : "");
    };
  }
  function dealRow(product) {
    return '<button class="deal-row" type="button" data-view="' + escapeHtml(product.id) + '"><img loading="lazy" decoding="async" src="' + escapeHtml(imageUrl(product.image)) + '" alt="' + escapeHtml(altText(product)) + '" width="640" height="420"><span><strong>' + escapeHtml(product.name) + "</strong> <small>" + escapeHtml(retailerFor(product)) + " · " + escapeHtml(regionLabel(product)) + "</small></span>" + icon("arrow") + "</button>";
  }
  function regionInfoHtml(region, count) {
    return '<div class="region-info-main"><span class="region-flag" aria-hidden="true">' + icon("globe") + "</span><div><h3>" + escapeHtml(region.title) + "</h3><p>" + escapeHtml(region.summary) + '</p></div></div><dl class="region-facts"><div><dt>Currency</dt><dd>' + (region.currency ? escapeHtml(region.currency) + " (" + escapeHtml(region.symbol) + ")" : "Local currency at checkout") + "</dd></div><div><dt>Shipping</dt><dd>" + escapeHtml(region.shipping) + "</dd></div><div><dt>Listings</dt><dd>" + count + ' products</dd></div></dl><a class="btn btn-ghost" href="/regions/' + region.key + '/">ALL ' + escapeHtml(region.name.toUpperCase()) + " OFFERS " + icon("arrow") + "</a>";
  }
  function stripHtml(images) {
    var unique = [];
    images.map(imageUrl).forEach(function (src) { if (src !== FALLBACK && unique.indexOf(src) === -1) unique.push(src); });
    unique = unique.slice(0, 16);
    while (unique.length && unique.length < 8) unique.push.apply(unique, unique.slice(0, 8 - unique.length));
    var tiles = unique.map(function (src) { return '<span class="strip-tile"><img src="' + escapeHtml(src) + '" alt="" width="320" height="210" loading="lazy" decoding="async"></span>'; }).join("");
    return unique.length ? '<div class="strip-track">' + tiles + tiles + "</div>" : "";
  }
  function loadLiveCatalog(fallback) {
    // Public, read-only. The owner publishes catalog changes from /admin/.
    return fetch("/api/products", { headers: { accept: "application/json" } })
      .then(function (response) { return response.ok ? response.json() : null; })
      .then(function (data) { return data && Array.isArray(data.products) && data.products.length ? data.products : fallback; })
      .catch(function () { return fallback; });
  }

  root.ApexUI = {
    escapeHtml: escapeHtml, labelFor: labelFor, hasPrice: hasPrice, money: money, formatDate: formatDate, webUrl: webUrl, imageUrl: imageUrl,
    retailerFor: retailerFor, regionLabel: regionLabel, priceHtml: priceHtml, linkTag: linkTag, shopLink: shopLink, altText: altText,
    productCard: productCard, inCollection: inCollection, regionMatches: regionMatches, byFeatured: byFeatured, loadLiveCatalog: loadLiveCatalog,
    DEPARTMENTS: DEPARTMENTS, inDepartment: inDepartment, departmentCards: departmentCards, chipsHtml: chipsHtml, hubChipLabel: hubChipLabel, HUB_FILTERS: HUB_FILTERS,
    regionChipLabel: regionChipLabel, dealRow: dealRow, regionInfoHtml: regionInfoHtml, stripHtml: stripHtml,
    isDeal: isDeal, hasAffiliateLink: hasAffiliateLink, mixCategories: mixCategories, popularPicks: popularPicks, trendingPicks: trendingPicks, regionPicks: regionPicks, featuredDeals: featuredDeals,
    REGION_FLAGS: REGION_FLAGS, FALLBACK: FALLBACK
  };
  if (typeof module !== "undefined") module.exports = root.ApexUI;
})(typeof window !== "undefined" ? window : globalThis);
