// assets/orders.app.js
(function () {
  const API = window.BW_UK_ORDERS_API;
  const MODAL = window.BW_UK_ORDERS_MODAL;

  const elMeta = document.getElementById("meta");
  const elTbl = document.getElementById("ordersTbl");
  const elStatusFilter = document.getElementById("statusFilter");
  const elRefresh = document.getElementById("refreshBtn");
  const elWho = document.getElementById("who");

  // Stock aggregation (admin only)
  const elStockListId = document.getElementById("stockListId");
  const elAggBtn = document.getElementById("aggBtn");

  // Optional: a link button to open aggregate page (recommended)
  const elAggPageBtn = document.getElementById("aggPageBtn"); // create this button in HTML if you want
  

  const elAggWrap =
    document.getElementById("aggWrap") ||
    (elAggBtn ? elAggBtn.closest(".row") : null) ||
    null;

  // ----------------- HARD GUARDS -----------------
  if (!API) {
    console.error("BW_UK_ORDERS_API missing. Check that ./docs/assets/uk.orders.api.js is loaded.");
    if (elMeta) elMeta.textContent = "API missing: uk.orders.api.js not loaded.";
    return;
  }
  if (!MODAL) {
    console.error("BW_UK_ORDERS_MODAL missing. Check that ./assets/orders.modal.js is loaded BEFORE orders.app.js.");
    if (elMeta) elMeta.textContent = "Modal missing: orders.modal.js not loaded.";
    return;
  }

  // ----------------- UI helpers -----------------
  function money(n) {
    const x = Number(n || 0);
    return x.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function setBusy(isBusy, msg = "Loading…") {
    if (elMeta) elMeta.textContent = isBusy ? msg : (elMeta.dataset.readyText || "");
    if (elRefresh) elRefresh.disabled = !!isBusy;
    if (elStatusFilter) elStatusFilter.disabled = !!isBusy;
  }

  function renderSkeletonTable(rows = 8) {
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
        .sk-pill { height:22px; width:86px; border-radius:999px; }
      </style>
    `;

    elTbl.innerHTML = `
      ${shimmer}
      <thead>
        <tr>
          <th>Order</th><th>Status</th><th>Creator</th><th>StockList</th><th>Totals (BDT)</th><th>Updated</th><th></th>
        </tr>
      </thead>
      <tbody>
        ${Array.from({ length: rows }).map(() => `
          <tr>
            <td>
              <div class="sk sk-line" style="width:180px;"></div>
              <div class="sk sk-line" style="width:120px;"></div>
            </td>
            <td><div class="sk sk-pill"></div></td>
            <td><div class="sk sk-line" style="width:140px;"></div></td>
            <td><div class="sk sk-line" style="width:90px;"></div></td>
            <td><div class="sk sk-line" style="width:240px;"></div></td>
            <td><div class="sk sk-line" style="width:120px;"></div></td>
            <td><div class="sk sk-line" style="width:70px;height:28px;"></div></td>
          </tr>
        `).join("")}
      </tbody>
    `;
  }

  // ----------------- Auth helpers -----------------
  function getUser() {
    return (typeof API.getUser === "function") ? API.getUser() : null;
  }

  function mustBeLoggedIn() {
    const user = getUser();
    if (!user?.email) {
      alert("Please login first.");
      location.href = "./index.html";
      return null;
    }
    return user;
  }

  function isAdminUser(user) {
    return user?.role === "admin" || user?.is_admin === true;
  }

  function setWho() {
    const user = getUser();
    const email = user?.email || "Not logged in";
    const role = isAdminUser(user) ? "admin" : "customer";
    if (elWho) elWho.textContent = `${email} • role: ${role}`;
  }

  // ----------------- Data load -----------------
  async function loadOrders() {
    const user = mustBeLoggedIn();
    if (!user) return;

    setWho();
    setBusy(true, "Loading orders…");
    renderSkeletonTable(8);

    const status = elStatusFilter.value || "";
    try {
      const res = await API.fetchOrders({ status, limit: 400 });
      const orders = res.orders || [];
      elMeta.dataset.readyText = `${orders.length} order(s)`;
      setBusy(false);
      if (elMeta) elMeta.textContent = elMeta.dataset.readyText;

      renderOrdersTable(orders);
      applyAggUi();
    } catch (e) {
      console.error(e);
      setBusy(false);
      if (elMeta) elMeta.textContent = `Error: ${e.message || e}`;
      elTbl.innerHTML = "";
    }
  }

  function applyAggUi() {
    const user = getUser();
    const admin = isAdminUser(user);

    const show = admin ? "" : "none";
    if (elAggWrap) elAggWrap.style.display = show;
    if (elAggBtn) elAggBtn.style.display = show;
    if (elStockListId) elStockListId.style.display = show;
    if (elAggPageBtn) elAggPageBtn.style.display = show;
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
    const user = mustBeLoggedIn();
    if (!user) return;

    // lightweight loader feedback
    const prev = elMeta.textContent;
    setBusy(true, "Opening order…");

    try {
      const res = await API.getOrder(orderId);
      MODAL.show({ user, order: res.order, items: res.items || [] });
    } finally {
      setBusy(false);
      if (elMeta) elMeta.textContent = prev || elMeta.dataset.readyText || "";
    }
  }

  // ----------------- Modal action handlers (unchanged) -----------------
  function isOwnerCustomer(user, order) {
    if (!user?.email || !order?.CreatorEmail) return false;
    return String(user.email).toLowerCase() === String(order.CreatorEmail).toLowerCase();
  }

  function uiGuardOrThrow(label) {
    const st = MODAL.getState();
    const user = st.user;
    const order = st.order;

    if (!user?.email) throw new Error("Not logged in");
    if (!order) throw new Error("No order loaded");

    const admin = isAdminUser(user);
    const owner = isOwnerCustomer(user, order);
    const status = order.Status || "draft";

    if (!admin && !owner) throw new Error("Not allowed");
    if (status === "delivered") throw new Error(`Order is delivered (read-only). Cannot ${label}.`);

    return { user, order, admin, owner, status };
  }

  MODAL.bind({
    onSaveOrder: async (patch) => {
      try {
        const { admin, owner, status, order } = uiGuardOrThrow("save order");

        if (!admin) {
          if (!owner) throw new Error("Not allowed");
          if (status !== "draft") throw new Error("Customers can edit OrderName only in draft.");
          if (!patch.orderName) throw new Error("OrderName is required.");

          await API.updateOrder(order.OrderId, { orderName: patch.orderName });
        } else {
          if (!patch.orderName) throw new Error("OrderName is required.");
          await API.updateOrder(order.OrderId, patch);
        }

        await openOrder(order.OrderId);
        await loadOrders();
        alert("Order saved.");
      } catch (e) {
        alert(e.message || String(e));
      }
    },

    onDeleteOrder: async () => {
      try {
        const { admin, order } = uiGuardOrThrow("delete order");
        if (!admin) throw new Error("Only admin can delete orders.");
        if (!confirm("Delete this order? This removes all items too.")) return;

        await API.deleteOrder(order.OrderId);
        MODAL.close();
        await loadOrders();
      } catch (e) {
        alert(e.message || String(e));
      }
    },

    onSaveItems: async (itemsPatch) => {
      try {
        const { admin, owner, status, order } = uiGuardOrThrow("save items");

        if (!admin) {
          if (!owner) throw new Error("Not allowed");
          if (!(status === "draft" || status === "priced" || status === "under_review")) {
            throw new Error("Items are read-only in this status.");
          }

          const safe = itemsPatch.map(p => ({
            barcode: p.barcode,
            orderedQuantity: status === "draft" ? p.orderedQuantity : null,
            customerPriceBDT: (status === "priced" || status === "under_review") ? p.customerPriceBDT : null,
            productWeight: null,
            packageWeight: null,
            finalPriceBDT: null,
            shippedQuantity: null,
          }));

          await API.updateItems(order.OrderId, safe);

          if (status === "priced") {
            await API.updateOrder(order.OrderId, { status: "under_review" });
          }
        } else {
          await API.updateItems(order.OrderId, itemsPatch);
        }

        await openOrder(order.OrderId);
        await loadOrders();
        alert("Items saved.");
      } catch (e) {
        alert(e.message || String(e));
      }
    },

    onDeleteItems: async (barcodes) => {
      try {
        const { admin, owner, status, order } = uiGuardOrThrow("delete items");
        if (!barcodes?.length) return alert("Select items first.");

        if (!admin) {
          if (!owner) throw new Error("Not allowed");
          if (status !== "draft") throw new Error("Customers can delete items only in draft.");
        }

        if (!confirm(`Delete ${barcodes.length} item(s)?`)) return;

        await API.deleteItems(order.OrderId, barcodes);
        await openOrder(order.OrderId);
        await loadOrders();
      } catch (e) {
        alert(e.message || String(e));
      }
    },

    onSubmit: async () => {
      try {
        const { admin, owner, status, order } = uiGuardOrThrow("submit");
        if (admin) throw new Error("Admins do not submit orders.");
        if (!owner) throw new Error("Not allowed");
        if (status !== "draft") throw new Error("Only draft orders can be submitted.");

        await API.updateOrder(order.OrderId, { status: "submitted" });
        await openOrder(order.OrderId);
        await loadOrders();
        alert("Submitted.");
      } catch (e) {
        alert(e.message || String(e));
      }
    },

    onAcceptOffer: async () => {
      try {
        const { admin, owner, status, order } = uiGuardOrThrow("accept offer");
        if (admin) throw new Error("Admins do not accept offers.");
        if (!owner) throw new Error("Not allowed");
        if (status !== "priced") throw new Error("Only priced orders can be accepted.");

        await API.updateOrder(order.OrderId, { status: "finalized" });
        await openOrder(order.OrderId);
        await loadOrders();
        alert("Offer accepted.");
      } catch (e) {
        alert(e.message || String(e));
      }
    }
  });

  // ----------------- Aggregation (admin only) -----------------
  // Keep your old alert aggregation button
  elAggBtn?.addEventListener("click", async () => {
    try {
      const user = mustBeLoggedIn();
      if (!user) return;
      if (!isAdminUser(user)) throw new Error("Admin only.");

      const stockListId = elStockListId.value.trim();
      if (!stockListId) return alert("Enter StockListId");

      const res = await API.aggregateStockList(stockListId, true);
      const lines = (res.items || []).map(it =>
        `${it.barcode} • qty=${it.totalOrderedQuantity} • shipped=${it.totalShippedQuantity}`
      ).join("\n");

      alert(`StockList: ${stockListId}\nOrders: ${res.orderCount}\n\n${lines || "No items"}`);
    } catch (e) {
      alert(e.message || String(e));
    }
  });

  // New: open aggregate page (no dialog)
  elAggPageBtn?.addEventListener("click", () => {
    const user = mustBeLoggedIn();
    if (!user) return;
    if (!isAdminUser(user)) return alert("Admin only.");

    const stockListId = elStockListId.value.trim();
    if (!stockListId) return alert("Enter StockListId");
    location.href = `./aggregate.html?stockListId=${encodeURIComponent(stockListId)}`;
  });

  // ----------------- init -----------------
  MODAL.init();
  setWho();
  applyAggUi();

  elStatusFilter.addEventListener("change", loadOrders);
  elRefresh.addEventListener("click", loadOrders);

  if (mustBeLoggedIn()) loadOrders();
})();
