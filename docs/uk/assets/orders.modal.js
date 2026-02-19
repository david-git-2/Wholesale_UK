// assets/orders.modal.js
// Modal/dialog controller for UK Orders UI.
// Requires the modal HTML elements to exist with the same IDs you already use.

window.BW_UK_ORDERS_MODAL = (() => {
  const STATUS = [
    "draft", "submitted", "priced", "under_review", "finalized",
    "processing", "partially_delivered", "delivered", "cancelled"
  ];

  // ---- DOM ----
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

  // ---- state ----
  let CURRENT_ORDER = null;
  let CURRENT_ITEMS = [];
  let CURRENT_USER = null; // {email, role/is_admin}
  let ON = {
    onSaveOrder: null,
    onDeleteOrder: null,
    onSaveItems: null,
    onDeleteItems: null,
    onSubmit: null,
    onAcceptOffer: null
  };

  // ---- guards ----
  if (!modal || !itemsTbl) {
    console.error("BW_UK_ORDERS_MODAL: modal/itemsTbl missing from HTML.");
  }

  // ---- helpers ----
  function money(n) {
    const x = Number(n || 0);
    return x.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function isAdminUser(user) {
    return user?.role === "admin" || user?.is_admin === true;
  }

  function isOwnerCustomer(user, order) {
    if (!user?.email || !order?.CreatorEmail) return false;
    return String(user.email).toLowerCase() === String(order.CreatorEmail).toLowerCase();
  }

  function open() { modal.style.display = "flex"; }
  function close() { modal.style.display = "none"; }

  function renderStatusOptions() {
    if (!mStatus) return;
    mStatus.innerHTML = STATUS.map(s => `<option value="${s}">${s}</option>`).join("");
  }

  // ---- permissions (UI-level, matches your matrix) ----
  function canCustomerEditOrderName(status) { return status === "draft"; }
  function canCustomerEditItems(status) { return status === "draft" || status === "priced" || status === "under_review"; }
  function canCustomerEditQty(status) { return status === "draft"; }
  function canCustomerEditCustomerPrice(status) { return status === "priced" || status === "under_review"; }

  function canAdminEditOrder(status) { return status !== "delivered"; }
  function canAdminEditItems(status) { return status !== "delivered"; }
  function canAdminUpdateShippedQty(status) { return status === "processing"; }

  // ---- table render: IMAGE instead of BARCODE ----
  function renderItemsTable(items) {
    const imgColW = 96; // "large image"
    itemsTbl.innerHTML = `
      <thead>
        <tr>
          <th></th>
          <th style="width:${imgColW + 10}px;">Image</th>
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
        ${items.map(it => {
          const img = it.ImageUrl || it.ImageURL || it.imageUrl || "";
          const barcode = it.Barcode || "";
          const safeAlt = (it.Description || it.Brand || barcode || "Product").replace(/"/g, "&quot;");

          return `
            <tr data-row="${barcode}">
              <td><input type="checkbox" data-del="${barcode}" /></td>

              <td>
                <div style="
                  width:${imgColW}px;height:${imgColW}px;
                  border-radius:12px;
                  background:#f3f3f3;
                  display:flex;align-items:center;justify-content:center;
                  overflow:hidden;
                ">
                  ${img
                    ? `<img src="${img}" alt="${safeAlt}"
                        style="width:100%;height:100%;object-fit:cover;display:block;" />`
                    : `<div class="muted" style="font-size:12px;text-align:center;padding:8px;">No image</div>`
                  }
                </div>
              </td>

              <td>
                <div style="font-weight:900;font-size:13px;">${it.Description || ""}</div>
                <div class="muted">${it.Brand || ""}</div>
                <div class="muted" style="margin-top:4px;">${barcode}</div>
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
          `;
        }).join("")}
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

  function applyRoleUI() {
    if (!CURRENT_ORDER) return;

    const user = CURRENT_USER;
    const admin = isAdminUser(user);
    const status = CURRENT_ORDER.Status || "draft";
    const owner = isOwnerCustomer(user, CURRENT_ORDER);
    const customerAllowed = !admin && owner;

    // OrderName: customer only in draft; admin anytime
    mOrderName.disabled = admin ? false : !(customerAllowed && canCustomerEditOrderName(status));

    // Status: admin-only
    mStatus.disabled = !admin;
    mStatus.style.display = admin ? "" : "none";

    // Admin-only pricing inputs
    const adminFields = [mConversionRate, mCuriaCost, mStockListId];
    adminFields.forEach(inp => {
      if (!inp) return;
      inp.disabled = !admin || !canAdminEditOrder(status);
      const wrap = inp.closest(".field") || inp.closest("div") || null;
      if (wrap) wrap.style.display = admin ? "" : "none";
      else inp.style.display = admin ? "" : "none";
    });

    // Buttons
    mSaveOrder.style.display = (admin || customerAllowed) ? "" : "none";
    mDeleteOrder.style.display = admin ? "" : "none";

    mSubmit.style.display = (!admin && customerAllowed && status === "draft") ? "" : "none";
    mAcceptOffer.style.display = (!admin && customerAllowed && status === "priced") ? "" : "none";

    // Items editability by role/status
    const rows = itemsTbl.querySelectorAll("tbody tr[data-row]");
    rows.forEach(tr => {
      const inpOrdered = tr.querySelector('input[data-k="orderedQuantity"]');
      const inpPW = tr.querySelector('input[data-k="productWeight"]');
      const inpPackW = tr.querySelector('input[data-k="packageWeight"]');
      const inpCus = tr.querySelector('input[data-k="customerPriceBDT"]');
      const inpFinal = tr.querySelector('input[data-k="finalPriceBDT"]');
      const inpShipped = tr.querySelector('input[data-k="shippedQuantity"]');
      const delCb = tr.querySelector('input[data-del]');

      if (admin) {
        const allowItemsEdit = canAdminEditItems(status);

        if (inpOrdered) inpOrdered.disabled = !allowItemsEdit;
        if (inpPW) inpPW.disabled = !allowItemsEdit;
        if (inpPackW) inpPackW.disabled = !allowItemsEdit;

        if (inpFinal) inpFinal.disabled = !allowItemsEdit;
        if (inpCus) inpCus.disabled = !allowItemsEdit;

        // shipped strict in processing only
        if (inpShipped) inpShipped.disabled = !canAdminUpdateShippedQty(status);

        if (delCb) delCb.disabled = !allowItemsEdit;

        mSaveItems.style.display = allowItemsEdit ? "" : "none";
        mDeleteItems.style.display = allowItemsEdit ? "" : "none";
        mSaveItems.disabled = !allowItemsEdit;
        mDeleteItems.disabled = !allowItemsEdit;
      } else {
        // customer
        if (inpOrdered) inpOrdered.disabled = !(customerAllowed && canCustomerEditQty(status));
        if (inpPW) inpPW.disabled = true;
        if (inpPackW) inpPackW.disabled = true;

        if (inpCus) inpCus.disabled = !(customerAllowed && canCustomerEditCustomerPrice(status));
        if (inpFinal) inpFinal.disabled = true;
        if (inpShipped) inpShipped.disabled = true;

        if (delCb) delCb.disabled = !(customerAllowed && status === "draft");

        const allowItems = customerAllowed && canCustomerEditItems(status);
        mSaveItems.style.display = allowItems ? "" : "none";
        mDeleteItems.style.display = (customerAllowed && status === "draft") ? "" : "none";
      }
    });
  }

  // ---- public: open with data ----
  function show({ user, order, items }) {
    CURRENT_USER = user || null;
    CURRENT_ORDER = order || null;
    CURRENT_ITEMS = items || [];

    if (!CURRENT_ORDER) return;

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
    open();
    applyRoleUI();
  }

  // ---- bind action handlers from app ----
  function bind(handlers = {}) {
    ON = { ...ON, ...handlers };
  }

  // ---- wire UI events ----
  function init() {
    renderStatusOptions();

    mClose?.addEventListener("click", close);
    modal?.addEventListener("click", (e) => { if (e.target === modal) close(); });

    mSaveOrder?.addEventListener("click", () => ON.onSaveOrder && ON.onSaveOrder(getOrderPatch()));
    mDeleteOrder?.addEventListener("click", () => ON.onDeleteOrder && ON.onDeleteOrder());
    mSaveItems?.addEventListener("click", () => ON.onSaveItems && ON.onSaveItems(readItemsEdits()));
    mDeleteItems?.addEventListener("click", () => ON.onDeleteItems && ON.onDeleteItems(selectedBarcodes()));
    mSubmit?.addEventListener("click", () => ON.onSubmit && ON.onSubmit());
    mAcceptOffer?.addEventListener("click", () => ON.onAcceptOffer && ON.onAcceptOffer());
  }

  function getOrderPatch() {
    return {
      orderName: mOrderName.value.trim(),
      status: mStatus.value,
      conversionRate: mConversionRate.value === "" ? null : Number(mConversionRate.value),
      curiaCost: mCuriaCost.value === "" ? null : Number(mCuriaCost.value),
      stockListId: mStockListId.value.trim(),
    };
  }

  function getState() {
    return {
      user: CURRENT_USER,
      order: CURRENT_ORDER,
      items: CURRENT_ITEMS
    };
  }

  return {
    init,
    bind,
    show,
    close,
    applyRoleUI,
    getState,
    getOrderPatch,
    readItemsEdits,
    selectedBarcodes,
    isAdminUser
  };
})();
