// assets/aggregate.app.js
(function () {
  const API = window.BW_UK_ORDERS_API;

  const elWho = document.getElementById("who");
  const elMeta = document.getElementById("meta");
  const elStockListId = document.getElementById("stockListId");
  const elLoadBtn = document.getElementById("loadBtn");
  const elRefresh = document.getElementById("refreshBtn");

  const tOrders = document.getElementById("tOrders");
  const tItems = document.getElementById("tItems");

  const elOrdersList = document.getElementById("ordersList");
  const elTbl = document.getElementById("aggTbl");

  if (!API) {
    alert("Missing BW_UK_ORDERS_API");
    return;
  }

  let CURRENT = {
    stockListId: "",
    orders: [], // [{orderId, orderName, creatorEmail, status}]
    items: []   // aggregated items
  };

  function isAdminUser(user) {
    return user?.role === "admin" || user?.is_admin === true;
  }

  function getUser() {
    return (typeof API.getUser === "function") ? API.getUser() : null;
  }

  function mustBeAdmin() {
    const user = getUser();
    if (!user?.email) {
      alert("Please login first.");
      location.href = "./index.html";
      return null;
    }
    if (!isAdminUser(user)) {
      alert("Admin only.");
      location.href = "./orders.html";
      return null;
    }
    return user;
  }

  function setWho() {
    const user = getUser();
    const email = user?.email || "Not logged in";
    const role = isAdminUser(user) ? "admin" : "customer";
    if (elWho) elWho.textContent = `${email} • role: ${role}`;
  }

  function setBusy(busy, msg = "Loading…") {
    elMeta.textContent = busy ? msg : (elMeta.dataset.readyText || "—");
    elLoadBtn.disabled = !!busy;
    elRefresh.disabled = !!busy;
    elStockListId.disabled = !!busy;
  }

  function renderSkeleton(rows = 10) {
    const shimmer = `
      <style>
        .sk { position:relative; overflow:hidden; background:#eee; border-radius:10px; }
        .sk::after{
          content:""; position:absolute; top:0; left:-40%;
          width:40%; height:100%;
          background:linear-gradient(90deg, transparent, rgba(255,255,255,.6), transparent);
          animation: sk 1.1s infinite;
        }
        @keyframes sk { 0%{ left:-40%; } 100%{ left:120%; } }
        .sk-line { height:12px; margin:6px 0; }
      </style>
    `;
    elTbl.innerHTML = `
      ${shimmer}
      <thead>
        <tr>
          <th style="width:110px;">Image</th>
          <th>Item</th>
          <th>Total Ordered</th>
          <th>Total Shipped</th>
          <th style="width:360px;">Per-Order Updates</th>
          <th style="width:140px;"></th>
        </tr>
      </thead>
      <tbody>
        ${Array.from({ length: rows }).map(() => `
          <tr>
            <td><div class="sk" style="width:96px;height:96px;"></div></td>
            <td>
              <div class="sk sk-line" style="width:220px;"></div>
              <div class="sk sk-line" style="width:160px;"></div>
            </td>
            <td><div class="sk sk-line" style="width:80px;"></div></td>
            <td><div class="sk sk-line" style="width:80px;"></div></td>
            <td><div class="sk sk-line" style="width:320px;height:36px;"></div></td>
            <td><div class="sk sk-line" style="width:110px;height:30px;"></div></td>
          </tr>
        `).join("")}
      </tbody>
    `;
  }

  function renderOrdersList() {
    const orders = CURRENT.orders || [];
    if (!orders.length) {
      elOrdersList.textContent = "—";
      return;
    }
    elOrdersList.innerHTML = orders.map(o => `
      <div style="padding:6px 0;border-bottom:1px solid rgba(0,0,0,.06);">
        <span style="font-weight:900;">${o.orderName || "(no name)"}</span>
        <span class="muted"> • ${o.orderId} • ${o.status || ""} • ${o.creatorEmail || ""}</span>
      </div>
    `).join("");
  }

  function renderTable() {
    const items = CURRENT.items || [];
    tOrders.textContent = String((CURRENT.orders || []).length);
    tItems.textContent = String(items.length);

    elTbl.innerHTML = `
      <thead>
        <tr>
          <th style="width:110px;">Image</th>
          <th>Item</th>
          <th>Total Ordered</th>
          <th>Total Shipped</th>
          <th style="width:360px;">Per-Order Updates</th>
          <th style="width:140px;"></th>
        </tr>
      </thead>
      <tbody>
        ${items.map(it => {
          const img = it.imageUrl || "";
          const safeAlt = (it.description || it.brand || it.barcode || "Product").replace(/"/g, "&quot;");
          const po = it.perOrder || [];

          return `
            <tr data-barcode="${it.barcode}">
              <td>
                <div style="
                  width:96px;height:96px;
                  border-radius:12px;
                  background:#f3f3f3;
                  display:flex;align-items:center;justify-content:center;
                  overflow:hidden;">
                  ${img
                    ? `<img src="${img}" alt="${safeAlt}" style="width:100%;height:100%;object-fit:cover;display:block;" />`
                    : `<div class="muted" style="font-size:12px;text-align:center;padding:8px;">No image</div>`
                  }
                </div>
              </td>

              <td>
                <div style="font-weight:900;font-size:13px;">${it.description || ""}</div>
                <div class="muted">${it.brand || ""}</div>
                <div class="muted" style="margin-top:4px;">${it.barcode}</div>
              </td>

              <td style="font-weight:900;">${Number(it.totalOrderedQuantity || 0)}</td>
              <td style="font-weight:900;">${Number(it.totalShippedQuantity || 0)}</td>

              <td>
                ${po.length ? po.map(p => `
                  <div class="row" style="gap:6px;align-items:center;margin:6px 0;">
                    <div class="muted" style="min-width:120px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                      ${p.orderId}
                    </div>

                    <input data-k="shipped" data-order="${p.orderId}" style="width:80px"
                      value="${p.shippedQuantity ?? ""}" placeholder="shipped" />

                    <input data-k="final" data-order="${p.orderId}" style="width:90px"
                      value="${p.finalPriceBDT ?? ""}" placeholder="final" />
                  </div>
                `).join("") : `<div class="muted">No per-order rows</div>`}
              </td>

              <td style="text-align:right;">
                <button class="btn" data-save="${it.barcode}">Save</button>
              </td>
            </tr>
          `;
        }).join("")}
      </tbody>
    `;

    // wire per-item save buttons
    elTbl.querySelectorAll("[data-save]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const barcode = btn.getAttribute("data-save");
        await saveOne(barcode, btn);
      });
    });
  }

  // Build updateItems payload PER orderId using the existing API
  async function saveOne(barcode, btnEl) {
    const user = mustBeAdmin();
    if (!user) return;

    const it = (CURRENT.items || []).find(x => x.barcode === barcode);
    if (!it) return alert("Item not found.");

    // Collect edited per-order rows from DOM
    const tr = elTbl.querySelector(`tr[data-barcode="${CSS.escape(barcode)}"]`);
    if (!tr) return alert("Row not found.");

    const rows = [];
    tr.querySelectorAll('input[data-k="shipped"]').forEach(inp => {
      const orderId = inp.getAttribute("data-order");
      const shippedV = inp.value;
      const finInp = tr.querySelector(`input[data-k="final"][data-order="${CSS.escape(orderId)}"]`);
      const finV = finInp ? finInp.value : "";

      rows.push({
        orderId,
        shippedQuantity: shippedV === "" ? null : Number(shippedV),
        finalPriceBDT: finV === "" ? null : Number(finV)
      });
    });

    // Group by orderId (one updateItems call per order)
    const perOrderMap = new Map();
    for (const r of rows) {
      if (!r.orderId) continue;
      if (!perOrderMap.has(r.orderId)) perOrderMap.set(r.orderId, []);
      perOrderMap.get(r.orderId).push({
        barcode,
        shippedQuantity: r.shippedQuantity,
        finalPriceBDT: r.finalPriceBDT
      });
    }

    // UI busy
    const oldTxt = btnEl.textContent;
    btnEl.disabled = true;
    btnEl.textContent = "Saving…";

    try {
      for (const [orderId, itemsPatch] of perOrderMap.entries()) {
        // Your existing API expects: updateItems(orderId, items)
        await API.updateItems(orderId, itemsPatch);
      }
      alert("Saved.");
      // reload whole stocklist for consistent totals
      await loadStockList(CURRENT.stockListId);
    } catch (e) {
      alert(e.message || String(e));
    } finally {
      btnEl.disabled = false;
      btnEl.textContent = oldTxt;
    }
  }

  async function loadStockList(stockListId) {
    const user = mustBeAdmin();
    if (!user) return;

    setWho();
    setBusy(true, "Loading stock list…");
    renderSkeleton(10);

    try {
      const res = await API.aggregateStockList(stockListId, true);

      CURRENT.stockListId = stockListId;
      CURRENT.orders = res.orders || []; // REQUIRED for page display (recommended)
      CURRENT.items = (res.items || []).map(x => ({
        barcode: x.barcode,
        brand: x.brand || x.Brand,
        description: x.description || x.Description,
        imageUrl: x.imageUrl || x.ImageUrl || x.ImageURL || "",
        totalOrderedQuantity: x.totalOrderedQuantity ?? 0,
        totalShippedQuantity: x.totalShippedQuantity ?? 0,

        // REQUIRED: per-order breakdown to save using updateItems()
        perOrder: (x.perOrder || []).map(p => ({
          orderId: p.orderId,
          shippedQuantity: p.shippedQuantity ?? null,
          finalPriceBDT: p.finalPriceBDT ?? null
        }))
      }));

      elMeta.dataset.readyText = `${CURRENT.items.length} item(s) • ${(CURRENT.orders || []).length} order(s)`;
      setBusy(false);
      elMeta.textContent = elMeta.dataset.readyText;

      renderOrdersList();
      renderTable();
    } catch (e) {
      console.error(e);
      setBusy(false);
      elMeta.textContent = `Error: ${e.message || e}`;
      elTbl.innerHTML = "";
      elOrdersList.textContent = "—";
    }
  }

  // init
  const user = mustBeAdmin();
  if (!user) return;
  setWho();

  // read query param
  const url = new URL(location.href);
  const stockListId = (url.searchParams.get("stockListId") || "").trim();
  if (stockListId) elStockListId.value = stockListId;

  elLoadBtn.addEventListener("click", () => {
    const id = elStockListId.value.trim();
    if (!id) return alert("Enter StockListId");
    loadStockList(id);
  });

  elRefresh.addEventListener("click", () => {
    const id = elStockListId.value.trim();
    if (!id) return alert("Enter StockListId");
    loadStockList(id);
  });

  if (stockListId) loadStockList(stockListId);
})();
