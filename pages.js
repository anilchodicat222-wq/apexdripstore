/* Shared behaviour for guide, region and information pages. */
(function () {
  var UI = window.ApexUI;
  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  var toggle = document.getElementById("menuToggle");
  var nav = document.getElementById("mainNav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") !== "true";
      nav.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", String(open));
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && nav.classList.contains("open")) { nav.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); toggle.focus(); }
    });
  }

  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  [].slice.call(document.querySelectorAll(".collection-slides")).forEach(function (host) {
    var slides = [].slice.call(host.querySelectorAll("img")), index = 0;
    if (slides.length < 2 || reduce) return;
    setInterval(function () {
      if (document.hidden) return;
      slides[index].classList.remove("is-active");
      index = (index + 1) % slides.length;
      slides[index].classList.add("is-active");
    }, 4800);
  });

  document.addEventListener("error", function (event) {
    var target = event.target;
    if (target && target.tagName === "IMG" && !/product-fallback\.svg$/.test(target.getAttribute("src") || "")) target.src = UI.FALLBACK;
  }, true);

  // Product grids are pre-rendered from the bundled catalog. If the owner has published
  // updates from the Control Room, refresh them with the live data.
  var grids = [].slice.call(document.querySelectorAll("[data-grid]"));
  var picks = [].slice.call(document.querySelectorAll("[data-pick]"));
  if (!UI || (!grids.length && !picks.length)) return;
  UI.loadLiveCatalog(null).then(function (live) {
    if (!live) return;
    var byId = {};
    live.forEach(function (product) { byId[product.id] = product; });
    grids.forEach(function (grid) {
      var list;
      if (grid.dataset.ids) list = grid.dataset.ids.split(",").map(function (id) { return byId[id]; }).filter(Boolean);
      else list = live.filter(function (product) {
        return (!grid.dataset.region || UI.regionMatches(product, grid.dataset.region)) && (!grid.dataset.collection || UI.inCollection(product, grid.dataset.collection)) && (!grid.dataset.exclude || !UI.inCollection(product, grid.dataset.exclude));
      }).sort(UI.byFeatured);
      if (!list.length) return;
      grid.innerHTML = list.map(function (product) {
        return UI.productCard(product, { interactive: false, detailsHref: grid.dataset.more || "/#discover", detailsLabel: "MORE LIKE THIS", headingLevel: Number(grid.dataset.heading) || 3 });
      }).join("");
    });
    picks.forEach(function (block) {
      var product = byId[block.dataset.pick];
      if (!product) return;
      var price = block.querySelector(".price-row");
      var link = block.querySelector(".pick-shop");
      var tag = block.querySelector(".link-row");
      if (price) price.innerHTML = UI.priceHtml(product);
      if (tag) tag.innerHTML = UI.linkTag(product);
      if (link) link.innerHTML = UI.shopLink(product, "buy-link");
    });
  });
})();
