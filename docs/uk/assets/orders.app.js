// assets/orders.app.js
(function () {
  const API = window.BW_UK_ORDERS_API;

  const elMeta = document.getElementById("meta");
  const elTbl = document.getElementById("ordersTbl");
  const elStatusFilter = document.getElementById("statusFilter");
  const elRefresh = document.getElementById("refreshBtn");
  const elWho = document.getElementById("who");

  const elStockListId = document.getElementById("stockListId");
  const elAggBtn = document.getElementById("aggBtn");

  const modal = document.getElementById("modal");
  const mClose = document.getElementById("mClose");
  const mTitle = document.getElementById("mTitle");
  const mSub = document.getElementById("mSub");

  const mOrderName = document.getElementById("mOrderName");
  const mStatus = document.getElementById("mStatus");
  const mSaveOrder = document.getElementById("mSaveOrder");
  const mDeleteOrder = document.getElementById("mDeleteOrder");

  const mConversionRate = document.getElementById("mConversionRate");
  const mCuriaCost = document.getElementById("mCuriaCost");
  const mStockListId = document.getElementById("mStockListId");

  const tCostG = document.getElementById("tCostG");
  const tCostB = document.getElementById("tCostB");
  const tOff = document.getElementById("tOff");
  const tCus = document.getElementById("tCus");
  const tFin = document.getElementById("tFin");

  const mSubmit = document.getElementById("mSubmit");
  const mAcceptOffer = document.getElementById("mAcceptOffer");

  const itemsTbl = document.getElementById("itemsTbl");
  const mSaveItems = document.getElementById("mSaveItems");
  const mDeleteItems = document.getElementById("mDeleteItems");

  const STATUS = [
    "draft","submitted","priced","under_review","finalized",
    "processing","partially_delivered","delivered","cancelled"
  ];

  let CURRENT_ORDER = null;
  let CURRENT_ITEMS = [];

  function money(n) {
    const x = Number(n || 0);
    return x.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function openModal() { modal.style.display = "flex"; }
  function closeModal() { modal.style.display = "none"; }

  function setWho() {
    const email = API.getEmail();
    const role = API.getRole();
    elWho.textContent = `${email || "Not logged in"} • role: ${role || "customer"}`;
  }

  function renderStatusOptions() {
    mStatus.innerHTML = STATUS.map(s => `<option value="${s}">${s}</option>`).join("");
  }

  async function loadOrders() {
    setWho();
    elMeta.textContent = "Loading…";
    const status = elStatusFilter.value || "";
    try {
      const res = await API.fetchOrders({ status, limit: 400 });
      const orders = res.orders || [];
      elMeta.textContent = `${orders.length} order(s)`;

      renderOrdersTable(orders);
    } catch (e) {
      console.error(e);
      elMeta.textContent = `Error: ${e.message || e}`;
      elTbl.innerHTML = "";
    }
  }

  function renderOrdersTable(orders) {
    elTbl.innerHTML = `
      <thead>
        <tr>
          <th>Order</th>
          <th>Status</th>
          <th>Creator</th>
          <th>StockList</th>
          <th>Totals (BDT)</th>
          <th>Updated</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${orders.map(o => {
          const totals = `Off: ${money(o.TotalOfferedBDT)} • Cus: ${money(o.TotalCustomerBDT)} • Fin: ${money(o.TotalFinalBDT)}`;
          return `
            <tr>
              <td>
                <div style="font-weight:900;">${o.OrderName || "(no name)"}</div>
                <div class="muted">${o.OrderId}</div>
              </td>
              <td><span class="pill">${o.Status}</span></td>
              <td class="muted">${o.CreatorEmail}</td>
              <td class="muted">${o.StockListId || "—"}</td>
              <td>${totals}</td>
              <td class="muted">${o.UpdatedAt || o.CreatedAt || ""}</td>
              <td><button class="btn2" data-open="${o.OrderId}">Open</button></td>
            </tr>
          `;
        }).join("")}
      </tbody>
    `;

    elTbl.querySelectorAll("[data-open]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const orderId = btn.getAttribute("data-open");
        await openOrder(orderId);
      });
    });
  }

  async function openOrder(orderId) {
    const res = await API.getOrder(orderId);
    CURRENT_ORDER = res.order;
    CURRENT_ITEMS = res.items || [];

    mTitle.textContent = CURRENT_ORDER.OrderName || "Order";
    mSub.textContent = `${CURRENT_ORDER.OrderId} • ${CURRENT_ORDER.Status} • ${CURRENT_ORDER.CreatorEmail}`;

    mOrderName.value = CURRENT_ORDER.OrderName || "";
    mStatus.value = CURRENT_ORDER.Status || "draft";
    mConversionRate.value = (CURRENT_ORDER.ConversionRate ?? "");
    mCuriaCost.value = (CURRENT_ORDER.CuriaCost ?? "");
    mStockListId.value = (CURRENT_ORDER.StockListId ?? "");

    tCostG.textContent = money(CURRENT_ORDER.TotalCostGBP);
    tCostB.textContent = money(CURRENT_ORDER.TotalCostBDT);
    tOff.textContent = money(CURRENT_ORDER.TotalOfferedBDT);
    tCus.textContent = money(CURRENT_ORDER.TotalCustomerBDT);
    tFin.textContent = money(CURRENT_ORDER.TotalFinalBDT);

    renderItemsTable(CURRENT_ITEMS);

    openModal();
  }

  function renderItemsTable(items) {
    itemsTbl.innerHTML = `
      <thead>
        <tr>
          <th></th>
          <th>Barcode</th>
          <th>Description</th>
          <th>Qty</th>
          <th>Weights (g)</th>
          <th>Offer (BDT)</th>
          <th>Customer</th>
          <th>Final</th>
          <th>Shipped</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(it => `
          <tr data-row="${it.Barcode}">
            <td><input type="checkbox" data-del="${it.Barcode}" /></td>
            <td class="muted">${it.Barcode}</td>
            <td>
              <div style="font-weight:900;font-size:13px;">${it.Description || ""}</div>
              <div class="muted">${it.Brand || ""}</div>
            </td>

            <td>
              <input data-k="orderedQuantity" style="width:90px"
                value="${it.OrderedQuantity ?? ""}" />
            </td>

            <td>
              <div class="row" style="gap:6px;">
                <input data-k="productWeight" style="width:90px" value="${it.ProductWeight ?? ""}" />
                <input data-k="packageWeight" style="width:90px" value="${it.PackageWeight ?? ""}" />
              </div>
            </td>

            <td class="muted">${money(it.OfferedPriceBDT)}</td>

            <td>
              <input data-k="customerPriceBDT" style="width:110px"
                value="${it.CustomerPriceBDT ?? ""}" />
            </td>

            <td>
              <input data-k="finalPriceBDT" style="width:110px"
                value="${it.FinalPriceBDT ?? ""}" />
            </td>

            <td>
              <input data-k="shippedQuantity" style="width:90px"
                value="${it.ShippedQuantity ?? ""}" />
            </td>
          </tr>
        `).join("")}
      </tbody>
    `;
  }

  function readItemsEdits() {
    const out = [];
    itemsTbl.querySelectorAll("tbody tr[data-row]").forEach(tr => {
      const barcode = tr.getAttribute("data-row");
      const patch = { barcode };

      tr.querySelectorAll("input[data-k]").forEach(inp => {
        const k = inp.getAttribute("data-k");
        const v = inp.value;

        // send only if changed-ish
        if (k === "orderedQuantity") patch.orderedQuantity = v === "" ? null : Number(v);
        if (k === "productWeight") patch.productWeight = v === "" ? null : Number(v);
        if (k === "packageWeight") patch.packageWeight = v === "" ? null : Number(v);
        if (k === "customerPriceBDT") patch.customerPriceBDT = v === "" ? null : Number(v);
        if (k === "finalPriceBDT") patch.finalPriceBDT = v === "" ? null : Number(v);
        if (k === "shippedQuantity") patch.shippedQuantity = v === "" ? null : Number(v);
      });

      out.push(patch);
    });
    return out;
  }

  function selectedBarcodes() {
    const out = [];
    itemsTbl.querySelectorAll("input[data-del]:checked").forEach(cb => {
      out.push(cb.getAttribute("data-del"));
    });
    return out;
  }

  // ----- Actions -----

  mClose.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

  mSaveOrder.addEventListener("click", async () => {
    if (!CURRENT_ORDER) return;

    const patch = {
      orderName: mOrderName.value.trim(),
      status: mStatus.value,
      conversionRate: mConversionRate.value === "" ? null : Number(mConversionRate.value),
      curiaCost: mCuriaCost.value === "" ? null : Number(mCuriaCost.value),
      stockListId: mStockListId.value.trim(),
    };

    try {
      await API.updateOrder(CURRENT_ORDER.OrderId, patch);
      await openOrder(CURRENT_ORDER.OrderId);
      await loadOrders();
      alert("Order saved.");
    } catch (e) {
      alert(e.message || String(e));
    }
  });

  mDeleteOrder.addEventListener("click", async () => {
    if (!CURRENT_ORDER) return;
    if (!confirm("Delete this order? This removes all items too.")) return;

    try {
      await API.deleteOrder(CURRENT_ORDER.OrderId);
      closeModal();
      await loadOrders();
    } catch (e) {
      alert(e.message || String(e));
    }
  });

  mSaveItems.addEventListener("click", async () => {
    if (!CURRENT_ORDER) return;
    const items = readItemsEdits();
    try {
      await API.updateItems(CURRENT_ORDER.OrderId, items);
      await openOrder(CURRENT_ORDER.OrderId);
      await loadOrders();
      alert("Items saved.");
    } catch (e) {
      alert(e.message || String(e));
    }
  });

  mDeleteItems.addEventListener("click", async () => {
    if (!CURRENT_ORDER) return;
    const barcodes = selectedBarcodes();
    if (!barcodes.length) return alert("Select items first.");
    if (!confirm(`Delete ${barcodes.length} item(s)?`)) return;

    try {
      await API.deleteItems(CURRENT_ORDER.OrderId, barcodes);
      await openOrder(CURRENT_ORDER.OrderId);
      await loadOrders();
    } catch (e) {
      alert(e.message || String(e));
    }
  });

  // Customer submit: draft -> submitted
  mSubmit.addEventListener("click", async () => {
    if (!CURRENT_ORDER) return;
    try {
      await API.updateOrder(CURRENT_ORDER.OrderId, { status: "submitted" });
      await openOrder(CURRENT_ORDER.OrderId);
      await loadOrders();
      alert("Submitted.");
    } catch (e) {
      alert(e.message || String(e));
    }
  });

  // Customer accept offer: priced -> finalized (server allows priced->finalized)
  mAcceptOffer.addEventListener("click", async () => {
    if (!CURRENT_ORDER) return;
    try {
      await API.updateOrder(CURRENT_ORDER.OrderId, { status: "finalized" });
      await openOrder(CURRENT_ORDER.OrderId);
      await loadOrders();
      alert("Offer accepted.");
    } catch (e) {
      alert(e.message || String(e));
    }
  });

  // Aggregate stock list (admin)
  elAggBtn.addEventListener("click", async () => {
    const stockListId = elStockListId.value.trim();
    if (!stockListId) return alert("Enter StockListId");
    try {
      const res = await API.aggregateStockList(stockListId, true);
      const lines = (res.items || []).map(it =>
        `${it.barcode} • qty=${it.totalOrderedQuantity} • shipped=${it.totalShippedQuantity}`
      ).join("\n");
      alert(`StockList: ${stockListId}\nOrders: ${res.orderCount}\n\n${lines || "No items"}`);
    } catch (e) {
      alert(e.message || String(e));
    }
  });

  // Filters
  elStatusFilter.addEventListener("change", loadOrders);
  elRefresh.addEventListener("click", loadOrders);

  // init
  renderStatusOptions();
  loadOrders();
})();
