window.BW_CART = (() => {
  const CFG = window.BW_CART_CONFIG;

  const KEY = CFG.KEY;
  let cart = [];

  const STOCK = window.BW_CART_STOCK;
  const MATH = window.BW_CART_MATH;
  const UI = window.BW_CART_UI;

  // ----------------------------
  // Small icon set (inline SVG)
  // ----------------------------
  const ICON = {
    minus: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
    plus: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
    trash: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M9 7V5h6v2" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M7 7l1 14h8l1-14" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`,
    box: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 8l-9-5-9 5 9 5 9-5Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M3 8v10l9 5 9-5V8" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 13v10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
    bag: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 8V7a5 5 0 0110 0v1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M6 8h12l-1 13H7L6 8Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`,
    price: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M16 7a4 4 0 00-4-2H10a3 3 0 000 6h4a3 3 0 010 6H9a4 4 0 01-4-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
    stock: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M8 19V9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 19V12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M16 19V7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M20 19V10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
    spark: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l1.3 5.2L18 9l-4.7 1.8L12 16l-1.3-5.2L6 9l4.7-1.8L12 2Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`
  };

  function ico(svg, size = 16){
    return `<span style="width:${size}px;height:${size}px;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;">
      <span style="width:${size}px;height:${size}px;display:inline-flex;">${svg}</span>
    </span>`;
  }

  function normalizeId(item){
    return String(item?.id ?? item?.sku ?? item?.name ?? "").trim();
  }

  function loadCartFromStorage(){
    try{
      cart = JSON.parse(localStorage.getItem(KEY) || "[]");
      if (!Array.isArray(cart)) cart = [];
    } catch {
      cart = [];
    }

    for (const it of cart) {
      it.id = String(it.id || "").trim();
      it.sku = String(it.sku || "");
      it.name = String(it.name || "");
      it.image_url = String(it.image_url || "");
      it.packaging = (it.packaging === "poly") ? "poly" : "box";

      it.qty = Number(it.qty) || 1;
      it.price = Number(it.price) || 0;

      it.commission = Number(it.commission) || 0;
      it.commission_percentage = Number(it.commission_percentage) || 0;

      it.stock_quantity = Number(it.stock_quantity) || 0;
    }
  }

  function save(emit = true){
    localStorage.setItem(KEY, JSON.stringify(cart));
    updateBadge();
    if (emit) document.dispatchEvent(new CustomEvent("bw_cart_changed"));
  }

  function updateBadge(){
    const count = cart.reduce((s, it) => s + (Number(it.qty)||0), 0);
    const el = document.getElementById("cartCount");
    if (el) el.textContent = count;
  }

  function clampQtyToStock(it){
    it.qty = Math.max(1, Number(it.qty) || 1);
    const stock = Number(it.stock_quantity) || 0;
    if (stock > 0) it.qty = Math.min(it.qty, stock);
  }

  function hasStockViolations(){
    for (const it of cart) {
      const stock = Number(it.stock_quantity) || 0;
      const qty = Number(it.qty) || 0;
      if (stock <= 0) return true;
      if (qty > stock) return true;
    }
    return false;
  }

  function isInCart(id){
    const sid = String(id ?? "").trim();
    return cart.some(x => x.id === sid);
  }

  function totalPrice(){
    return cart.reduce((s, it) => s + (Number(it.price)||0) * (Number(it.qty)||0), 0);
  }

  function totalFinalCommission(){
    return cart.reduce((s, it) => s + MATH.computeLine(it).final_line_total, 0);
  }

  function add(item){
    const id = normalizeId(item) || String(Math.random());
    const existing = cart.find(x => x.id === id);

    const stockFromJson =
      STOCK.stockForKey(item?.id) ||
      STOCK.stockForKey(item?.sku) ||
      STOCK.stockForKey(item?.name) ||
      0;

    if (existing){
      existing.stock_quantity = stockFromJson;

      if (existing.stock_quantity <= 0) return alert("This item is out of stock.");
      if (existing.qty >= existing.stock_quantity) return alert(`Stock limit reached (max ${existing.stock_quantity}).`);

      existing.qty += 1;
      clampQtyToStock(existing);
    } else {
      const it = {
        id,
        sku: String(item.sku || ""),
        name: String(item.name || ""),
        image_url: String(item.image_url || ""),

        price: Number(item.price) || 0,
        commission: Number(item.commission) || 0,
        commission_percentage: Number(item.commission_percentage) || 0,

        qty: 1,
        packaging: "box",
        stock_quantity: stockFromJson
      };

      if (it.stock_quantity <= 0) return alert("This item is out of stock.");

      clampQtyToStock(it);
      cart.push(it);
    }

    save();
    render();
  }

  function remove(id){
    const sid = String(id ?? "").trim();
    cart = cart.filter(x => x.id !== sid);
    save();
    render();
  }

  function inc(id, d){
    const sid = String(id ?? "").trim();
    const it = cart.find(x => x.id === sid);
    if (!it) return;

    it.stock_quantity = STOCK.getBestStockForItem(it);

    if (it.stock_quantity <= 0) return alert("This item is out of stock.");
    if (d > 0 && it.qty >= it.stock_quantity) return alert(`Stock limit reached (max ${it.stock_quantity}).`);

    it.qty = (Number(it.qty)||1) + d;
    if (it.qty <= 0) return remove(sid);

    clampQtyToStock(it);
    save();
    render();
  }

  function setPackaging(id, packaging){
    const sid = String(id ?? "").trim();
    const it = cart.find(x => x.id === sid);
    if (!it) return;

    it.packaging = (packaging === "poly") ? "poly" : "box";
    save();
    render();
  }

  function open(){
    const p = document.getElementById("cartPanel");
    if (!p) return;
    p.classList.add("open");
    p.setAttribute("aria-hidden", "false");
    render();
  }

  function close(){
    const p = document.getElementById("cartPanel");
    if (!p) return;
    p.classList.remove("open");
    p.setAttribute("aria-hidden", "true");
  }

  function clear(){
    cart = [];
    save();
    render();
  }

  async function placeOrderFromModal(){
    const stored = localStorage.getItem("bw_user");
    const user = stored ? JSON.parse(stored) : null;

    if (!user?.email) return UI.showModalError("Please login first.");
    if (!cart.length) return UI.showModalError("Cart is empty.");
    if (!window.BW_CONFIG?.API_URL) return UI.showModalError("Missing API URL (BW_CONFIG.API_URL).");

    for (const it of cart) {
      it.stock_quantity = STOCK.getBestStockForItem(it);
      clampQtyToStock(it);
    }
    save(false);

    if (hasStockViolations()) return UI.showModalError("Some items exceed stock (or stock is 0). Fix cart first.");

    const shipping = UI.collectShipping();
    const v = UI.validateShipping(shipping);
    if (v) return UI.showModalError(v);

    localStorage.setItem("bw_shipping", JSON.stringify(shipping));

    const btn = document.getElementById("bwPlaceOrderBtn");
    const oldHTML = btn ? btn.innerHTML : "";
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span style="display:inline-flex;align-items:center;gap:8px;">
        <span style="width:10px;height:10px;border-radius:999px;border:2px solid rgba(255,255,255,.55);border-top-color:#fff;display:inline-block;animation:bwSpin .7s linear infinite;"></span>
        <span>Placing…</span>
      </span>
      <style>@keyframes bwSpin{to{transform:rotate(360deg)}}</style>`;
    }

    try {
      const items = cart.map(it => {
        const line = MATH.computeLine(it);
        return {
          id: it.id,
          sku: it.sku,
          name: it.name,
          image_url: it.image_url,

          stock_quantity: Number(it.stock_quantity) || 0,
          qty: line.qty,
          price: line.price,
          packaging: line.packaging,

          commission_amount: line.commission_amount,
          cod_amount: line.cod_amount,
          awrc_amount: line.awrc_amount,
          packing_cost: line.packing_cost,

          line_total: line.line_total,
          final_per_unit: line.final_per_unit,
          final_line_total: line.final_line_total
        };
      });

      const payload = {
        action: "kbeauty_create_order",
        email: user.email,
        created_at: new Date().toISOString(),
        total: totalPrice(),
        final_commission_total: totalFinalCommission(),
        shipping,
        items
      };

      const res = await fetch(BW_CONFIG.API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!data.success) {
        console.error("Order failed:", data);
        UI.showModalError(data.error || data.message || "Order failed. Check console.");
        if (btn) { btn.disabled = false; btn.innerHTML = oldHTML; }
        return;
      }

      UI.hideCheckoutModal();
      UI.resetCheckoutModalFields();

      alert(`✅ Order submitted!\nOrder ID: ${data.order_id || "N/A"}`);
      clear();
      close();
    } catch (err) {
      console.error("Checkout error:", err);
      UI.showModalError("Checkout failed. Check console.");
      if (btn) { btn.disabled = false; btn.innerHTML = oldHTML; }
    }
  }

  // ----------------------------
  // Compact Cart UI
  // - No SKU
  // - Price/Stock/Final per pc in ONE LINE (small)
  // - Remove button RED background
  // - Each item more compact
  // ----------------------------
  function render(){
    const body = document.getElementById("cartBody");
    const totalEl = document.getElementById("cartTotal");
    if (!body || !totalEl) return;

    body.innerHTML = "";

    if (!cart.length){
      body.innerHTML = `<div class="cartEmpty">Cart is empty.</div>`;
      totalEl.textContent = UI.taka(0);
      return;
    }

    const miniIconBtn = (enabled = true) => `
      display:inline-flex;align-items:center;justify-content:center;
      width:34px;height:34px;
      border-radius:12px;
      border:1px solid #e2e8f0;
      background:#fff;
      color:#0f172a;
      cursor:${enabled ? "pointer" : "not-allowed"};
      opacity:${enabled ? "1" : "0.5"};
      user-select:none;
      padding:0;
    `;

    const packBtnStyle = (active = false) => `
      display:inline-flex;align-items:center;justify-content:center;gap:6px;
      padding:7px 9px;
      border-radius:12px;
      border:1px solid ${active ? "rgba(15,23,42,.25)" : "#e2e8f0"};
      background:${active ? "#0f172a" : "#fff"};
      color:${active ? "#fff" : "#0f172a"};
      cursor:pointer;
      user-select:none;
      font-size:12px;
      font-weight:800;
      line-height:1;
      white-space:nowrap;
    `;

    for (const it of cart){
      it.stock_quantity = STOCK.getBestStockForItem(it);
      clampQtyToStock(it);

      const line = MATH.computeLine(it);

      // row base (more compact)
      const row = document.createElement("div");
      row.className = "cartItem";
      row.style.gap = "10px";

      const img = document.createElement("img");
      img.alt = it.name || "Product";
      img.loading = "lazy";
      img.referrerPolicy = "no-referrer";
      img.src = it.image_url ? it.image_url : UI.placeholderSvg("No image");
      img.onerror = () => img.src = UI.placeholderSvg("Image error");
      img.style.width = "52px";
      img.style.height = "52px";
      img.style.borderRadius = "14px";
      img.style.objectFit = "cover";

      const right = document.createElement("div");
      right.style.flex = "1";
      right.style.display = "grid";
      right.style.gap = "8px";

      // top: name + pack buttons
      const top = document.createElement("div");
      top.style.display = "flex";
      top.style.justifyContent = "space-between";
      top.style.alignItems = "flex-start";
      top.style.gap = "10px";

      const nm = document.createElement("div");
      nm.className = "cartItemName";
      nm.textContent = it.name;
      nm.style.fontSize = "14px";
      nm.style.lineHeight = "1.25";

      const pack = document.createElement("div");
      pack.style.display = "inline-flex";
      pack.style.gap = "8px";
      pack.style.alignItems = "center";

      const btnBox = document.createElement("button");
      btnBox.type = "button";
      btnBox.style.cssText = packBtnStyle(it.packaging !== "poly");
      btnBox.innerHTML = `${ico(ICON.box, 16)}<span>Box</span>`;

      const btnPoly = document.createElement("button");
      btnPoly.type = "button";
      btnPoly.style.cssText = packBtnStyle(it.packaging === "poly");
      btnPoly.innerHTML = `${ico(ICON.bag, 16)}<span>Poly</span>`;

      btnBox.addEventListener("click", () => setPackaging(it.id, "box"));
      btnPoly.addEventListener("click", () => setPackaging(it.id, "poly"));

      pack.appendChild(btnBox);
      pack.appendChild(btnPoly);

      top.appendChild(nm);
      top.appendChild(pack);

      // ONE LINE: Price • Stock • Final/pc (small)
      const stats = document.createElement("div");
      stats.style.display = "flex";
      stats.style.flexWrap = "wrap";
      stats.style.gap = "10px";
      stats.style.alignItems = "center";
      stats.style.fontSize = "12px";
      stats.style.color = "#475569";
      stats.style.lineHeight = "1.2";

      const dot = `<span style="color:#cbd5e1;">•</span>`;
      stats.innerHTML = `
        <span style="display:inline-flex;align-items:center;gap:6px;">
          ${ico(ICON.price, 14)} <span>Price</span> ${UI.taka(line.price)}
        </span>
        ${dot}
        <span style="display:inline-flex;align-items:center;gap:6px;">
          ${ico(ICON.stock, 14)} <span>Stock</span> ${Number(it.stock_quantity)||0}
        </span>
        ${dot}
        <span style="display:inline-flex;align-items:center;gap:6px;">
          ${ico(ICON.spark, 14)} <span>Final/pc</span> ${UI.taka(line.final_per_unit)}
        </span>
      `;

      // actions: centered qty [-][QTY][+] + final total + remove (red)
      const actions = document.createElement("div");
      actions.style.display = "flex";
      actions.style.alignItems = "center";
      actions.style.justifyContent = "space-between";
      actions.style.gap = "12px";

      const canInc = !(Number(it.stock_quantity) > 0 && Number(it.qty) >= Number(it.stock_quantity));

      const qtyGroup = document.createElement("div");
      qtyGroup.style.display = "inline-flex";
      qtyGroup.style.alignItems = "center";
      qtyGroup.style.gap = "8px";
      qtyGroup.style.padding = "5px";
      qtyGroup.style.border = "1px solid #e2e8f0";
      qtyGroup.style.borderRadius = "14px";
      qtyGroup.style.background = "#fff";

      const decBtn = document.createElement("button");
      decBtn.type = "button";
      decBtn.style.cssText = miniIconBtn(true);
      decBtn.innerHTML = ico(ICON.minus, 18);
      decBtn.title = "Decrease";

      const qtyPill = document.createElement("div");
      qtyPill.style.minWidth = "36px";
      qtyPill.style.textAlign = "center";
      qtyPill.style.fontWeight = "950";
      qtyPill.style.color = "#0f172a";
      qtyPill.style.fontSize = "13px";
      qtyPill.textContent = String(Number(it.qty) || 1);

      const incBtn = document.createElement("button");
      incBtn.type = "button";
      incBtn.style.cssText = miniIconBtn(canInc);
      incBtn.disabled = !canInc;
      incBtn.innerHTML = ico(ICON.plus, 18);
      incBtn.title = canInc ? "Increase" : `Max stock: ${it.stock_quantity}`;

      decBtn.addEventListener("click", () => inc(it.id, -1));
      incBtn.addEventListener("click", () => inc(it.id, +1));

      qtyGroup.appendChild(decBtn);
      qtyGroup.appendChild(qtyPill);
      qtyGroup.appendChild(incBtn);

      const totalFinal = document.createElement("div");
      totalFinal.style.textAlign = "right";
      totalFinal.innerHTML = `
        
      `;

      // Remove button (RED)
      const rmBtn = document.createElement("button");
      rmBtn.type = "button";
      rmBtn.style.cssText = `
        display:inline-flex;align-items:center;justify-content:center;
        width:38px;height:38px;
        border-radius:14px;
        border:1px solid rgba(220,38,38,.35);
        background:#dc2626;
        color:#fff;
        cursor:pointer;
        user-select:none;
      `;
      rmBtn.innerHTML = ico(ICON.trash, 18);
      rmBtn.title = "Remove item";
      rmBtn.addEventListener("click", () => remove(it.id));

      actions.appendChild(qtyGroup);
      actions.appendChild(totalFinal);
      actions.appendChild(rmBtn);

      // show only final commission line (per unit) - small
      const finalLine = document.createElement("div");
      finalLine.style.fontSize = "11px";
      finalLine.style.color = "#64748b";
      finalLine.style.marginTop = "-2px";
      finalLine.innerHTML = `
        Final commission:
        <strong style="color:#0f172a">${UI.taka(line.final_line_total)}</strong>
        <span style="color:#94a3b8">(per unit: ${UI.taka(line.final_per_unit)})</span>
      `;

      right.appendChild(top);
      right.appendChild(stats);
      right.appendChild(actions);
      right.appendChild(finalLine);

      row.appendChild(img);
      row.appendChild(right);
      body.appendChild(row);
    }

    save(false);
    totalEl.textContent = UI.taka(totalPrice());

    const footer = document.createElement("div");
    footer.className = "cartMuted";
    footer.style.marginTop = "10px";
    footer.style.padding = "10px 12px";
    footer.style.border = "1px solid #e2e8f0";
    footer.style.borderRadius = "14px";
    footer.style.background = "#fff";
    footer.style.display = "flex";
    footer.style.alignItems = "center";
    footer.style.justifyContent = "space-between";
    footer.style.gap = "12px";
    footer.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;color:#475569;font-size:13px;">
        ${ico(ICON.spark, 16)}
        <span>Total final commission</span>
      </div>
      <div style="font-weight:950;color:#0f172a;font-size:16px;">
        ${UI.taka(totalFinalCommission())}
      </div>
    `;
    body.appendChild(footer);
  }

  async function checkout(){
    const stored = localStorage.getItem("bw_user");
    const user = stored ? JSON.parse(stored) : null;

    if (!user?.email) return alert("Please login first.");
    if (!cart.length) return alert("Cart is empty.");

    for (const it of cart) {
      it.stock_quantity = STOCK.getBestStockForItem(it);
      clampQtyToStock(it);
    }
    save(false);

    if (hasStockViolations()) {
      alert("Some items exceed stock (or stock is 0). Fix the cart first.");
      render();
      return;
    }

    UI.ensureCheckoutModal(placeOrderFromModal);
    UI.showCheckoutModal(totalPrice(), totalFinalCommission());
  }

  async function init(){
    loadCartFromStorage();
    await STOCK.loadStockMapFromDataJson();

    for (const it of cart) {
      it.stock_quantity = STOCK.getBestStockForItem(it);
      clampQtyToStock(it);
    }

    save(false);
    updateBadge();
    render();
  }

  document.addEventListener("DOMContentLoaded", () => { init(); });

  return { add, remove, open, close, clear, render, checkout, isInCart };
})();
