// assets/app.js
(function () {
  const elList = document.getElementById("list");
  const elMeta = document.getElementById("meta");
  const elQ = document.getElementById("q");
  const elBrand = document.getElementById("brandSelect");
  const elSort = document.getElementById("sortBy");
  const elCfgAWRC = document.getElementById("cfgAWRC");
  const elClear = document.getElementById("clearBtn");

  // NOTE: User asked: show price in GBP (no conversion).
  // We'll still display BW commission % in header if configured.
  const COMM = (window.BW_CFG && Number(window.BW_CFG.AWRC_PERCENT)) || 0;
  elCfgAWRC.textContent = COMM ? `${COMM}%` : "0%";

  let ALL = [];
  let VIEW = [];

  function safeText(s) {
    return String(s || "").replace(/\s+/g, " ").trim();
  }

  function moneyGBP(n) {
    const x = Number(n || 0);
    return `£ ${x.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function computePricingGBP(p) {
    // "PIECE PRICE £" is the cost/price per unit in GBP
    const piece = Number(p.piecePriceGbp || 0);

    // optional: commission display (not applied unless you want it)
    const commAmt = piece * (COMM / 100);

    // if later you want final prices in GBP, you can use these:
    const finalPoly = piece + commAmt;
    const finalBox = finalPoly; // keep same unless you have specific rule

    return { piece, commAmt, finalPoly, finalBox };
  }

  function innerStep(p) {
    const n = Number(p.innerCase || 0);
    return n > 0 ? n : 1;
  }

  function buildBrandOptions(products) {
    const brands = Array.from(new Set(products.map(p => p.brand).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b));
    for (const b of brands) {
      const opt = document.createElement("option");
      opt.value = b;
      opt.textContent = b;
      elBrand.appendChild(opt);
    }
  }

  function matchesQuery(p, q) {
    if (!q) return true;
    const hay = [
      p.name,
      p.code,
      p.brand,
      p.barcode,
      p.origin
    ].join(" ").toLowerCase();
    return hay.includes(q);
  }

  function applyFilters() {
    const q = (elQ.value || "").toLowerCase().trim();
    const b = elBrand.value || "";
    VIEW = ALL
      .filter(p => Number(p.stock || 0) > 0)
      .filter(p => (b ? p.brand === b : true))
      .filter(p => matchesQuery(p, q));

    applySort();
  }

  function applySort() {
    const mode = elSort.value || "name_asc";
    const dir = mode.endsWith("_desc") ? -1 : 1;

    const keyed = VIEW.map(p => ({ p, pr: computePricingGBP(p) }));

    keyed.sort((A, B) => {
      const a = A.p, b = B.p, pa = A.pr, pb = B.pr;

      switch (mode) {
        case "name_desc":
        case "name_asc":
          return dir * safeText(a.name).localeCompare(safeText(b.name));

        // price sort uses GBP piece price
        case "price_desc":
        case "price_asc":
          return dir * (pa.piece - pb.piece);

        case "stock_desc":
        case "stock_asc":
          return dir * (Number(a.stock || 0) - Number(b.stock || 0));

        // keep these options working, but mapped to our computed GBP finals
        case "final_box_desc":
          return -1 * (pa.finalBox - pb.finalBox);
        case "final_poly_desc":
          return -1 * (pa.finalPoly - pb.finalPoly);

        default:
          return dir * safeText(a.name).localeCompare(safeText(b.name));
      }
    });

    VIEW = keyed.map(k => k.p);
    render();
  }

  // ✅ NEW: Get cart key from config (with safe fallback)
  function getCartStorageKey_() {
    return (window.BW_CART_CONFIG_UK && String(window.BW_CART_CONFIG_UK.KEY || "").trim())
      || "bw_cart_v1";
  }

  function ensureCartFallback() {
    // If you already have BW_CART from your cart.* scripts, this won’t override.
    if (window.BW_CART) return;

    // ✅ was: const KEY = "bw_cart_v1";
    const KEY = getCartStorageKey_();

    function read() {
      try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
      catch { return []; }
    }

    function write(items) {
      localStorage.setItem(KEY, JSON.stringify(items));
      syncUI();
    }

    function syncUI() {
      const items = read();
      const count = items.reduce((s, it) => s + (it.qty || 0), 0);
      const elCount = document.getElementById("cartCount");
      if (elCount) elCount.textContent = String(count);

      const elBody = document.getElementById("cartBody");
      const elTotal = document.getElementById("cartTotal");
      if (!elBody || !elTotal) return;

      elBody.innerHTML = items.length
        ? items.map(it => `
          <div style="border:1px solid #e2e8f0; border-radius:14px; padding:10px; margin-bottom:10px;">
            <div style="font-weight:900; font-size:13px;">${safeText(it.name)}</div>
            <div style="color:#64748b; font-size:12px;">
              ${safeText(it.code)} • Barcode: ${safeText(it.barcode || "—")} • Step: ${Number(it.step || 1)}
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-top:10px;">
              <span style="color:#64748b; font-size:12px;">${moneyGBP(it.priceEach)}</span>

              <div style="display:flex; gap:8px; align-items:center;">
                <button class="btn" type="button" data-dec="${it.id}">
                  <i data-lucide="minus" class="i"></i>
                </button>
                <div style="min-width:40px; text-align:center; font-weight:900;">${it.qty}</div>
                <button class="btn" type="button" data-inc="${it.id}">
                  <i data-lucide="plus" class="i"></i>
                </button>
                <button class="btn" type="button" data-remove="${it.id}">
                  <i data-lucide="trash-2" class="i"></i>
                </button>
              </div>
            </div>
          </div>
        `).join("")
        : `<div style="color:#64748b;">Cart is empty.</div>`;

      const total = items.reduce((s, it) => s + (Number(it.qty || 0) * Number(it.priceEach || 0)), 0);
      elTotal.textContent = moneyGBP(total);

      // wire buttons
      elBody.querySelectorAll("[data-remove]").forEach(btn => {
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-remove");
          write(read().filter(x => x.id !== id));
          if (window.lucide) lucide.createIcons();
        });
      });

      elBody.querySelectorAll("[data-inc]").forEach(btn => {
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-inc");
          const items2 = read();
          const it = items2.find(x => x.id === id);
          if (!it) return;
          const step = Number(it.step || 1);
          it.qty = Number(it.qty || 0) + step;
          write(items2);
          if (window.lucide) lucide.createIcons();
        });
      });

      elBody.querySelectorAll("[data-dec]").forEach(btn => {
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-dec");
          const items2 = read();
          const it = items2.find(x => x.id === id);
          if (!it) return;
          const step = Number(it.step || 1);
          it.qty = Number(it.qty || 0) - step;
          if (it.qty <= 0) {
            write(items2.filter(x => x.id !== id));
          } else {
            write(items2);
          }
          if (window.lucide) lucide.createIcons();
        });
      });

      if (window.lucide) lucide.createIcons();
    }

    window.BW_CART = {
      open() {
        const p = document.getElementById("cartPanel");
        if (!p) return;
        p.dataset.open = "true";
        p.setAttribute("aria-hidden", "false");
      },
      close() {
        const p = document.getElementById("cartPanel");
        if (!p) return;
        p.dataset.open = "false";
        p.setAttribute("aria-hidden", "true");
      },
      clear() { write([]); },
      checkout() { alert("Checkout not wired yet."); },

      // add qty (qty is already step-based in UI)
      add(item, qty) {
        const q = Math.max(1, Number(qty || 1));
        const items = read();
        const idx = items.findIndex(x => x.id === item.id);
        if (idx >= 0) items[idx].qty += q;
        else items.push({ ...item, qty: q });
        write(items);
      },

      // Optional: set qty (useful if you later want direct input)
      setQty(id, qty) {
        const items = read();
        const it = items.find(x => x.id === id);
        if (!it) return;
        const q = Number(qty || 0);
        if (q <= 0) write(items.filter(x => x.id !== id));
        else { it.qty = q; write(items); }
      },

      _sync: syncUI
    };

    syncUI();
  }

  function cardHTML(p) {
    const pr = computePricingGBP(p);
    const step = innerStep(p);

    const img = p.imageUrl
      ? `<img
          src="${p.imageUrl}"
          alt="${safeText(p.name)}"
          loading="lazy"
          referrerpolicy="no-referrer"
          onerror="this.onerror=null; this.src='https://via.placeholder.com/600x600?text=No+Image';"
        />`
      : `<div style="color:#64748b; font-size:12px;">No image</div>`;

    return `
      <div class="card" data-card="${p.id}">
        <div class="thumb">${img}</div>

        <div class="cardBody">
          <!-- ✅ Description -->
          <div class="name">
            <i data-lucide="tag" class="i"></i>
            ${safeText(p.name)}
          </div>

          <div class="sub">
            <!-- ✅ Brand -->
            <span class="pill">
              <i data-lucide="badge-check" class="i"></i>
              ${safeText(p.brand || "—")}
            </span>

            <!-- ✅ Barcode -->
            <span class="pill" title="Barcode">
              <i data-lucide="barcode" class="i"></i>
              ${safeText(p.barcode || "—")}
            </span>

            <!-- ✅ Origin -->
            <span class="pill" title="Country of origin">
              <i data-lucide="globe" class="i"></i>
              ${safeText(p.origin || "—")}
            </span>
          </div>

          <!-- ✅ Price in GBP (no conversion) -->
          <div class="priceRow">
            <div>
              <div class="price">
                <i data-lucide="pound-sterling" class="i"></i>
                ${moneyGBP(pr.piece)}
              </div>
              <div class="small">
                <i data-lucide="package" class="i"></i>
                Inner case step: <b>${step}</b> 
              </div>
            </div>
          </div>

          <!-- ✅ Cart controls: increment/decrement by inner case -->
          <div class="actions" style="align-items:center;">
            <button class="btn" type="button" data-dec-card="${p.id}" title="Decrease by inner case">
              <i data-lucide="minus" class="i"></i>
              -${step}
            </button>

            <div class="pill" style="background:#fff;">
              <i data-lucide="shopping-cart" class="i"></i>
              In cart: <span data-incart="${p.id}">0</span>
            </div>

            <button class="btn primary" type="button" data-inc-card="${p.id}" title="Increase by inner case">
              <i data-lucide="plus" class="i"></i>
              +${step}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function getCartQtyFor(id) {
    const KEY = getCartStorageKey_();

    // Works with fallback cart storage format, and won’t crash if your real cart differs.
    try {
      if (window.BW_CART && typeof window.BW_CART.getQty === "function") {
        return Number(window.BW_CART.getQty(id) || 0);
      }

      // ✅ was: localStorage.getItem("bw_cart_v1")
      const raw = localStorage.getItem(KEY);
      if (!raw) return 0;

      const items = JSON.parse(raw || "[]");
      const it = items.find(x => x.id === id);
      return Number(it?.qty || 0);
    } catch {
      return 0;
    }
  }

  function refreshInCartBadges() {
    document.querySelectorAll("[data-incart]").forEach(el => {
      const id = el.getAttribute("data-incart");
      el.textContent = String(getCartQtyFor(id));
    });
  }

  function wireCardCartButtons() {
    elList.querySelectorAll("[data-inc-card]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-inc-card");
        const p = VIEW.find(x => x.id === id);
        if (!p) return;

        const step = innerStep(p);
        const pr = computePricingGBP(p);

       window.BW_CART.add({
  id: p.id,
  code: p.code,
  name: p.name,
  description: p.name,
  brand: p.brand,
  imageUrl: p.imageUrl,
  barcode: p.barcode,
  origin: p.origin,
  priceEach: pr.piece,
  step
}, step);


        if (window.BW_CART._sync) window.BW_CART._sync();
        refreshInCartBadges();
      });
    });

    elList.querySelectorAll("[data-dec-card]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-dec-card");
        const p = VIEW.find(x => x.id === id);
        if (!p) return;

        const step = innerStep(p);

        // If cart has a remove/decrement API, prefer it. Otherwise manipulate fallback storage.
        if (window.BW_CART && typeof window.BW_CART.decrement === "function") {
          window.BW_CART.decrement(id, step);
          if (window.BW_CART._sync) window.BW_CART._sync();
          refreshInCartBadges();
          return;
        }

        // Fallback: edit localStorage (CONFIG KEY)
        const KEY = getCartStorageKey_();
        try {
          const raw = localStorage.getItem(KEY) || "[]";
          const items = JSON.parse(raw);
          const it = items.find(x => x.id === id);
          if (!it) return;
          it.qty = Number(it.qty || 0) - step;
          const next = it.qty <= 0 ? items.filter(x => x.id !== id) : items;
          localStorage.setItem(KEY, JSON.stringify(next));
          if (window.BW_CART._sync) window.BW_CART._sync();
          refreshInCartBadges();
        } catch (e) {
          console.error(e);
        }
      });
    });
  }

  function render() {
    elList.innerHTML = VIEW.map(cardHTML).join("");

    // Lucide icons inside injected HTML
    if (window.lucide) lucide.createIcons();

    wireCardCartButtons();
    refreshInCartBadges();

    elMeta.textContent = `${VIEW.length} products • Showing GBP prices • Updated: ${new Date().toLocaleString()}`;
  }

  async function init() {
    ensureCartFallback();

    try {
      elMeta.textContent = "Loading…";
      ALL = await window.BW_API.loadProducts();
      buildBrandOptions(ALL);

      applyFilters();

      elQ.addEventListener("input", applyFilters);
      elBrand.addEventListener("change", applyFilters);
      elSort.addEventListener("change", applySort);

      elClear.addEventListener("click", () => {
        elQ.value = "";
        elBrand.value = "";
        elSort.value = "name_asc";
        applyFilters();
      });

      // Show orders button only when logged in (if your auth provides this)
      const wrap = document.getElementById("myOrdersWrap");
      if (wrap && window.BW_AUTH && typeof window.BW_AUTH.isLoggedIn === "function" && window.BW_AUTH.isLoggedIn()) {
        wrap.style.display = "block";
      }

    } catch (err) {
      console.error(err);
      elMeta.textContent = "Failed to load data.";
      elList.innerHTML = `<div class="card"><div class="cardBody">
        <div class="name">Could not load products</div>
        <div class="small">${safeText(err.message || err)}</div>
      </div></div>`;
      if (window.lucide) lucide.createIcons();
    }
  }

  init();
})();
