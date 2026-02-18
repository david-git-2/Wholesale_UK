/* ============================
   docs/assets/app.js  (MODERNIZED)
   - Cart button uses icon (no big text)
   - Clicking a card opens a MODAL popup for details (no expand/collapse)
   - NEW: Loading skeleton (no other behavior changed)
   ============================ */

// CONFIG (match your ENV values)
const CFG = window.BW_CART_CONFIG || {};
const CONFIG = {
  COD_RATE: Number(CFG.COD_RATE ?? 0.01),
  PACKING_WHITE_BOX: Number(CFG.PACKING_WHITE_BOX ?? 38),
  PACKING_WHITE_POLY: Number(CFG.PACKING_WHITE_POLY ?? 19),
  AWRC_FIXED: Number(CFG.AWRC_FIXED ?? 20),
};

const BRANDS_URL = CFG.BRANDS_URL || "../data/brands.json";
const DATA_URL   = CFG.DATA_URL   || "../data/koba_data.json";


let allItems = [];
let allBrands = [];

const taka = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return "-";
  return "৳ " + num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const safeText = (v) => (v === null || v === undefined ? "" : String(v));

function compute(item){
  const price = Number(item.price) || 0;
  // UI uses commission AMOUNT (not %)
  const commission = Number(item.commission) || 0;

  const cod = price * CONFIG.COD_RATE;
  const awrc = CONFIG.AWRC_FIXED;

  const packBox = CONFIG.PACKING_WHITE_BOX;
  const packPoly = CONFIG.PACKING_WHITE_POLY;

  const finalBox = commission - (cod + awrc + packBox);
  const finalPoly = commission - (cod + awrc + packPoly);

  return { price, commission, cod, awrc, packBox, packPoly, finalBox, finalPoly };
}

function itemMatches(item, needle) {
  if (!needle) return true;
  const blob = JSON.stringify(item).toLowerCase();
  return blob.includes(needle);
}

function itemBrandMatches(item, selectedBrand) {
  if (!selectedBrand) return true;

  const brand = String(item.brand || item.Brand || "").trim();
  if (brand) return brand.toLowerCase() === selectedBrand.toLowerCase();

  const name = String(item.name || "").toLowerCase();
  return name.includes(selectedBrand.toLowerCase());
}

function getSortFn(mode) {
  const byName = (a,b) => safeText(a.name).localeCompare(safeText(b.name));
  const byPrice = (a,b) => (Number(a.price) || 0) - (Number(a.price) || 0);
  const byStock = (a,b) => (Number(a.stock_quantity) || 0) - (Number(b.stock_quantity) || 0);
  const byFinalBox = (a,b) => compute(a).finalBox - compute(b).finalBox;
  const byFinalPoly = (a,b) => compute(a).finalPoly - compute(b).finalPoly;

  switch (mode) {
    case "name_desc": return (a,b) => byName(b,a);
    case "price_asc": return (a,b) => byPrice(a,b);
    case "price_desc": return (a,b) => byPrice(b,a);
    case "stock_asc": return (a,b) => byStock(a,b);
    case "stock_desc": return (a,b) => byStock(b,a);
    case "final_box_desc": return (a,b) => byFinalBox(b,a);
    case "final_poly_desc": return (a,b) => byFinalPoly(b,a);
    default: return (a,b) => byName(a,b);
  }
}

function placeholderSvg(text){
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120">
      <rect width="100%" height="100%" fill="#f1f5f9"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
        font-family="system-ui" font-size="12" fill="#94a3b8">${text}</text>
    </svg>`
  );
}

function getItemId(item){
  return String(item?.id ?? item?.sku ?? item?.name ?? "");
}

// ----------------------------
// Icons (inline SVG)
// ----------------------------
const ICON = {
  cartPlus: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6h15l-2 8H7L6 6Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      <path d="M6 6L5 3H2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <circle cx="9" cy="19" r="1.5" fill="none" stroke="currentColor" stroke-width="2"/>
      <circle cx="18" cy="19" r="1.5" fill="none" stroke="currentColor" stroke-width="2"/>
      <path d="M12 9v6M9 12h6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `,
  cartCheck: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6h15l-2 8H7L6 6Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      <path d="M6 6L5 3H2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <circle cx="9" cy="19" r="1.5" fill="none" stroke="currentColor" stroke-width="2"/>
      <circle cx="18" cy="19" r="1.5" fill="none" stroke="currentColor" stroke-width="2"/>
      <path d="M9.5 12.5l1.8 1.8 3.8-3.8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `,
  info: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/>
      <path d="M12 10v6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path d="M12 7h.01" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
    </svg>
  `,
  x: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18 6L6 18M6 6l12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `
};

function iconWrap(svg, size = 18){
  return `
    <span style="width:${size}px;height:${size}px;display:inline-flex;align-items:center;justify-content:center;">
      <span style="width:${size}px;height:${size}px;display:inline-flex;">${svg}</span>
    </span>
  `;
}

// ----------------------------
// Cart item sanitation (unchanged)
// ----------------------------
function toCartItem(item){
  return {
    id: item?.id ?? item?.sku ?? item?.name ?? "",
    sku: String(item?.sku || ""),
    name: String(item?.name || ""),
    price: Number(item?.price) || 0,
    commission: Number(item?.commission) || 0,
    image_url: String(item?.image_url || "")
  };
}

// ----------------------------
// NEW: Loading Skeleton (added only)
// ----------------------------
function ensureSkeletonStyles(){
  if (document.getElementById("bwSkeletonStyles")) return;

  const st = document.createElement("style");
  st.id = "bwSkeletonStyles";
  st.textContent = `
    @keyframes bwShimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    .bwSkCard{
      border:1px solid #e2e8f0;
      border-radius:16px;
      padding:12px;
      background:#fff;
      display:grid;
      gap:12px;
      margin-bottom:12px;
    }
    .bwSkHeader{ display:flex; gap:12px; align-items:center; }
    .bwSkImg{
      width:72px; height:72px; border-radius:16px;
      border:1px solid #e2e8f0;
    }
    .bwSkMain{ flex:1; display:grid; gap:10px; }
    .bwSkLine{ height:12px; border-radius:999px; }
    .bwSkLine.big{ height:16px; width:70%; }
    .bwSkLine.mid{ width:55%; }
    .bwSkLine.small{ width:35%; }
    .bwSkPills{ display:flex; gap:8px; flex-wrap:wrap; }
    .bwSkPill{ height:26px; width:120px; border-radius:999px; }
    .bwSkActions{ display:flex; gap:10px; justify-content:flex-end; }
    .bwSkBtn{ width:40px; height:40px; border-radius:14px; }

    .bwSk{
      background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 37%, #f1f5f9 63%);
      background-size: 400% 100%;
      animation: bwShimmer 1.2s ease-in-out infinite;
    }
  `;
  document.head.appendChild(st);
}

function showLoadingSkeleton(count = 6){
  ensureSkeletonStyles();
  const list = document.getElementById("list");
  if (!list) return;

  list.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const sk = document.createElement("div");
    sk.className = "bwSkCard";
    sk.innerHTML = `
      <div class="bwSkHeader">
        <div class="bwSkImg bwSk"></div>
        <div class="bwSkMain">
          <div class="bwSkLine big bwSk"></div>
          <div class="bwSkLine mid bwSk"></div>
          <div class="bwSkPills">
            <div class="bwSkPill bwSk"></div>
            <div class="bwSkPill bwSk"></div>
            <div class="bwSkPill bwSk"></div>
          </div>
        </div>
      </div>
      <div class="bwSkActions">
        <div class="bwSkBtn bwSk"></div>
        <div class="bwSkBtn bwSk"></div>
      </div>
    `;
    list.appendChild(sk);
  }
}

// ----------------------------
// Modern modal (details popup)
// ----------------------------
function ensureDetailsModal(){
  if (document.getElementById("bwItemModal")) return;

  // Inject a tiny style block (still "no external css" — it's in-app)
  const st = document.createElement("style");
  st.textContent = `
    @keyframes bwPop { from { transform: translateY(8px) scale(.98); opacity:.6 } to { transform: translateY(0) scale(1); opacity:1 } }
    .bwModalOverlay{ display:none; position:fixed; inset:0; z-index:10000; background:rgba(15,23,42,.55); backdrop-filter: blur(3px); align-items:center; justify-content:center; padding:16px; }
    .bwModalCard{ width:min(720px, 100%); background:#fff; border:1px solid #e2e8f0; border-radius:18px; box-shadow:0 22px 70px rgba(0,0,0,.22); overflow:hidden; animation:bwPop .14s ease-out; font-family:system-ui; }
    .bwModalHead{ display:flex; align-items:flex-start; justify-content:space-between; gap:12px; padding:14px 16px; border-bottom:1px solid #e2e8f0; }
    .bwModalTitle{ font-weight:900; color:#0f172a; font-size:16px; line-height:1.2; }
    .bwModalSub{ color:#64748b; font-size:12px; margin-top:4px; line-height:1.2; }
    .bwModalBody{ padding:14px 16px; display:grid; gap:12px; }
    .bwGrid{ display:grid; grid-template-columns: 1fr 1fr; gap:12px; }
    @media (max-width: 640px){ .bwGrid{ grid-template-columns: 1fr; } }
    .bwCol{ border:1px solid #e2e8f0; border-radius:16px; padding:12px; background:#f8fafc; }
    .bwColHead{ display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:10px; }
    .bwPill{ display:inline-flex; align-items:center; gap:6px; padding:6px 10px; border-radius:999px; border:1px solid #e2e8f0; background:#fff; color:#0f172a; font-size:12px; font-weight:800; white-space:nowrap; }
    .bwKv{ display:flex; align-items:center; justify-content:space-between; gap:10px; padding:8px 0; border-top:1px dashed #e2e8f0; color:#334155; font-size:12px; }
    .bwKv:first-of-type{ border-top:none; padding-top:0; }
    .bwKv .k{ color:#64748b; font-weight:700; }
    .bwKv .v{ color:#0f172a; font-weight:900; }
    .bwFormula{ color:#64748b; font-size:12px; background:#fff; border:1px solid #e2e8f0; border-radius:14px; padding:10px 12px; }
    .bwCloseBtn{ display:inline-flex; align-items:center; justify-content:center; gap:8px; border:1px solid #e2e8f0; background:#fff; color:#0f172a; padding:9px 10px; border-radius:12px; cursor:pointer; }
    .bwCloseBtn:hover{ box-shadow:0 12px 30px rgba(2,6,23,.10); }
    .bwModalMedia{ display:flex; gap:12px; align-items:center; }
    .bwModalImg{ width:56px; height:56px; border-radius:16px; object-fit:cover; border:1px solid #e2e8f0; background:#f1f5f9; }
  `;
  document.head.appendChild(st);

  const overlay = document.createElement("div");
  overlay.id = "bwItemModal";
  overlay.className = "bwModalOverlay";
  overlay.innerHTML = `
    <div class="bwModalCard" role="dialog" aria-modal="true" aria-labelledby="bwItemModalTitle">
      <div class="bwModalHead">
        <div class="bwModalMedia">
          <img id="bwItemModalImg" class="bwModalImg" alt="Product"/>
          <div>
            <div id="bwItemModalTitle" class="bwModalTitle"></div>
            <div id="bwItemModalSub" class="bwModalSub"></div>
          </div>
        </div>

        <button id="bwItemModalClose" class="bwCloseBtn" type="button" aria-label="Close">
          ${iconWrap(ICON.x, 18)}
        </button>
      </div>

      <div id="bwItemModalBody" class="bwModalBody"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  const close = () => { overlay.style.display = "none"; };
  document.getElementById("bwItemModalClose").addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });

  // Make SVGs render nicely
  overlay.querySelectorAll("svg").forEach(svg => {
    svg.style.width = "100%";
    svg.style.height = "100%";
    svg.style.display = "block";
  });
}

function showDetailsModal(item, c){
  ensureDetailsModal();

  const overlay = document.getElementById("bwItemModal");
  const titleEl = document.getElementById("bwItemModalTitle");
  const subEl = document.getElementById("bwItemModalSub");
  const bodyEl = document.getElementById("bwItemModalBody");
  const imgEl = document.getElementById("bwItemModalImg");

  if (!overlay || !titleEl || !subEl || !bodyEl || !imgEl) return;

  titleEl.textContent = safeText(item?.name || "Product");

  const stock = Number(item?.stock_quantity) || 0;
  const price = taka(c.price);
  const commission = taka(c.commission);

  subEl.textContent = `Price: ${price} • Stock: ${stock} • Commission: ${commission}`;

  imgEl.src = item?.image_url ? item.image_url : placeholderSvg("No image");
  imgEl.onerror = () => imgEl.src = placeholderSvg("Image error");

  bodyEl.innerHTML = `
    <div class="bwGrid">
      <div class="bwCol">
        <div class="bwColHead">
          <span class="bwPill">White Box</span>
          <span class="bwPill">Final: ${taka(c.finalBox)}</span>
        </div>
        <div class="bwKv"><span class="k">COD (product)</span><span class="v">${taka(c.cod)}</span></div>
        <div class="bwKv"><span class="k">BW commission (AWRC)</span><span class="v">${taka(c.awrc)}</span></div>
        <div class="bwKv"><span class="k">Packing</span><span class="v">${taka(c.packBox)}</span></div>
      </div>

      <div class="bwCol">
        <div class="bwColHead">
          <span class="bwPill">White Poly</span>
          <span class="bwPill">Final: ${taka(c.finalPoly)}</span>
        </div>
        <div class="bwKv"><span class="k">COD (product)</span><span class="v">${taka(c.cod)}</span></div>
        <div class="bwKv"><span class="k">BW commission (AWRC)</span><span class="v">${taka(c.awrc)}</span></div>
        <div class="bwKv"><span class="k">Packing</span><span class="v">${taka(c.packPoly)}</span></div>
      </div>
    </div>

    <div class="bwFormula">
      Formula: <strong style="color:#0f172a">Commission − (COD + AWRC + Packing)</strong>
    </div>
  `;

  overlay.style.display = "flex";
}

// ----------------------------
// Cart button (icon-only)
// ----------------------------
function setCartButtonState(btn, itemId){
  const inCart = BW_CART.isInCart(itemId);

  // keep your existing classes if you want, but we style inline for "modern" look
  btn.className = "btn " + (inCart ? "cartRemoveBtn" : "cartAddBtn");
  btn.setAttribute("aria-pressed", inCart ? "true" : "false");
  btn.title = inCart ? "Remove from cart" : "Add to cart";

  btn.style.cssText = `
    display:inline-flex; align-items:center; justify-content:center; gap:8px;
    width:40px; height:40px;
    border-radius:14px;
    border:1px solid ${inCart ? "rgba(15,23,42,.18)" : "#e2e8f0"};
    background:${inCart ? "#0f172a" : "#fff"};
    color:${inCart ? "#fff" : "#0f172a"};
    cursor:pointer;
    user-select:none;
    transition: transform .06s ease, box-shadow .15s ease;
  `;

  btn.innerHTML = iconWrap(inCart ? ICON.cartCheck : ICON.cartPlus, 20);

  // icon svg sizing
  btn.querySelectorAll("svg").forEach(svg => {
    svg.style.width = "100%";
    svg.style.height = "100%";
    svg.style.display = "block";
  });
}

// ----------------------------
// Product list render (card click => modal)
// ----------------------------
function render(items) {
  const list = document.getElementById("list");
  if (!list) return;

  list.innerHTML = "";

  if (!items.length) {
    const d = document.createElement("div");
    d.className = "empty";
    d.textContent = "No in-stock products match your search.";
    list.appendChild(d);
    return;
  }

  for (const item of items) {
    const c = compute(item);
    const itemId = getItemId(item);

    const card = document.createElement("div");
    card.className = "card";

    // make the whole card feel clickable
    card.style.cursor = "pointer";

    // Header (compact)
    const header = document.createElement("div");
    header.className = "cardHeader";

    // clicking anywhere on header/card shows modal
    header.addEventListener("click", () => showDetailsModal(item, c));
    card.addEventListener("click", (e) => {
      // if click is on a button inside card, don't open modal
      if (e.target && e.target.closest && e.target.closest("button")) return;
      showDetailsModal(item, c);
    });

    const imgWrap = document.createElement("div");
    imgWrap.className = "imgwrap";

    const img = document.createElement("img");
    img.alt = safeText(item.name || "Product image");
    img.loading = "lazy";
    img.referrerPolicy = "no-referrer";
    img.src = item.image_url ? item.image_url : placeholderSvg("No image");
    img.onerror = () => img.src = placeholderSvg("Image error");
    imgWrap.appendChild(img);

    const main = document.createElement("div");
    main.className = "main";

    const name = document.createElement("div");
    name.className = "name";
    name.textContent = safeText(item.name);

    const line = document.createElement("div");
    line.className = "line";
    line.innerHTML = `<span class="status">in stock</span> • Stock: <span>${Number(item.stock_quantity)||0}</span>`;

    // mini row (kept, but cleaner)
    const mini = document.createElement("div");
    mini.className = "miniRow";
    mini.style.display = "flex";
    mini.style.flexWrap = "wrap";
    mini.style.gap = "8px";
    mini.innerHTML = `
      <div class="pill">Price: ${taka(c.price)}</div>
      <div class="pill">Final (Box): <strong>${taka(c.finalBox)}</strong></div>
      <div class="pill">Final (Poly): <strong>${taka(c.finalPoly)}</strong></div>
    `;

    main.appendChild(name);
    main.appendChild(line);
    main.appendChild(mini);

    header.appendChild(imgWrap);
    header.appendChild(main);

    // Actions row (icon cart button + info icon)
    const actions = document.createElement("div");
    actions.className = "cardActions";

    const cartBtn = document.createElement("button");
    cartBtn.type = "button";
    cartBtn.dataset.itemId = itemId;
    setCartButtonState(cartBtn, itemId);

    cartBtn.addEventListener("click", (e) => {
      e.stopPropagation();

      if (BW_CART.isInCart(itemId)) {
        BW_CART.remove(itemId);
      } else {
        BW_CART.add(toCartItem(item));
      }
      setCartButtonState(cartBtn, itemId);
    });

    // Optional: an info icon button (opens modal)
    const infoBtn = document.createElement("button");
    infoBtn.type = "button";
    infoBtn.className = "btn";
    infoBtn.title = "View details";
    infoBtn.style.cssText = `
      display:inline-flex; align-items:center; justify-content:center;
      width:40px; height:40px;
      border-radius:14px;
      border:1px solid #e2e8f0;
      background:#fff;
      color:#0f172a;
      cursor:pointer;
      user-select:none;
      transition: transform .06s ease, box-shadow .15s ease;
    `;
    infoBtn.innerHTML = iconWrap(ICON.info, 20);
    infoBtn.querySelectorAll("svg").forEach(svg => {
      svg.style.width = "100%";
      svg.style.height = "100%";
      svg.style.display = "block";
    });

    infoBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      showDetailsModal(item, c);
    });

    // tiny hover feel
    [cartBtn, infoBtn].forEach(b => {
      b.addEventListener("mouseenter", () => { b.style.boxShadow = "0 10px 26px rgba(2,6,23,.10)"; });
      b.addEventListener("mouseleave", () => { b.style.boxShadow = "none"; b.style.transform = "translateY(0)"; });
      b.addEventListener("mousedown", () => { b.style.transform = "translateY(1px)"; });
      b.addEventListener("mouseup", () => { b.style.transform = "translateY(0)"; });
    });

    actions.appendChild(cartBtn);
    actions.appendChild(infoBtn);

    card.appendChild(header);
    card.appendChild(actions);

    list.appendChild(card);
  }
}

function populateBrandDropdown(brands) {
  const sel = document.getElementById("brandSelect");
  if (!sel) return;

  sel.querySelectorAll("option:not(:first-child)").forEach(o => o.remove());

  for (const b of brands) {
    const opt = document.createElement("option");
    opt.value = b;
    opt.textContent = b;
    sel.appendChild(opt);
  }
}

function applyFiltersAndRender() {
  const qEl = document.getElementById("q");
  const sortEl = document.getElementById("sortBy");
  const brandEl = document.getElementById("brandSelect");
  const metaEl = document.getElementById("meta");

  if (!qEl || !sortEl || !brandEl || !metaEl) return;

  const needle = qEl.value.trim().toLowerCase();
  const sortMode = sortEl.value;
  const selectedBrand = brandEl.value;

  let items = allItems.filter(x => String(x.status || "").toLowerCase() === "in_stock");

  if (selectedBrand) items = items.filter(x => itemBrandMatches(x, selectedBrand));
  if (needle) items = items.filter(x => itemMatches(x, needle));

  items.sort(getSortFn(sortMode));
  render(items);

  const brandLabel = selectedBrand ? ` • Brand: ${selectedBrand}` : "";
  metaEl.textContent = `In-stock: ${items.length}${brandLabel}`;
}

function onBrandChange() {
  const qEl = document.getElementById("q");
  if (qEl) qEl.value = "";
  applyFiltersAndRender();
}

function refreshVisibleCartButtons(){
  document.querySelectorAll("button[data-item-id]").forEach(btn => {
    const id = btn.dataset.itemId;
    if (id) setCartButtonState(btn, id);
  });
}

async function run() {
  // show BW commission always
  const cfgEl = document.getElementById("cfgAWRC");
  if (cfgEl) cfgEl.textContent = taka(CONFIG.AWRC_FIXED);

  // ensure modal is available early
  ensureDetailsModal();

  // NEW: show skeleton while loading
  showLoadingSkeleton(8);

  // Load brands.json
  const br = await fetch(BRANDS_URL, { cache: "no-store" });
  const brandsData = await br.json();
  allBrands = Array.isArray(brandsData) ? brandsData : (brandsData.brands || []);
  allBrands = allBrands.map(x => String(x).trim()).filter(Boolean);
  allBrands.sort((a,b) => a.localeCompare(b));
  populateBrandDropdown(allBrands);

  // Load data.json
  const res = await fetch(DATA_URL, { cache: "no-store" });
  const data = await res.json();
  allItems = Array.isArray(data) ? data : (data.items || []);

  applyFiltersAndRender();
  refreshVisibleCartButtons();
}

document.addEventListener("DOMContentLoaded", () => {
  const qEl = document.getElementById("q");
  const sortEl = document.getElementById("sortBy");
  const brandEl = document.getElementById("brandSelect");

  if (qEl) qEl.addEventListener("input", applyFiltersAndRender);
  if (sortEl) sortEl.addEventListener("change", applyFiltersAndRender);
  if (brandEl) brandEl.addEventListener("change", onBrandChange);

  // whenever cart changes (add/remove/clear/qty), update visible product buttons
  document.addEventListener("bw_cart_changed", () => {
    refreshVisibleCartButtons();
  });

  run();
});
