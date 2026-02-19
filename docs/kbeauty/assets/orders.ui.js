/* ============================
   docs/assets/orders.ui.js  (MINIMAL + LIVE TOTALS + STATUS GROUP)
   FIXES:
   ✅ Status buttons keep working after status change (event delegation + re-bind)
   ✅ Admin can change to ANY status (no flow restrictions)
   ✅ If status is Cancelled OR Deleted -> disable status buttons (admin too)
   ✅ Permanent delete button visible only for Shipped/Cancelled (as before)
   ✅ NEW: Packaging change recalculates final commission using BW_CART_CONFIG
   ============================ */

(function (global) {
  const UI = {};
  const C = () => global.OrdersCore;

  UI.elList = () => document.getElementById("ordersList");

  const DETAILS_CACHE = new Map(); // order_id -> { order }

  // ----------------------------
  // BW Cart config (used for commission calc)
  // ----------------------------
  UI.getCartCfg = () => {
    const cfg = global.BW_CART_CONFIG || {};
    return {
      COD_RATE: Number(cfg.COD_RATE ?? 0.01),
      PACKING_WHITE_BOX: Number(cfg.PACKING_WHITE_BOX ?? 38),
      PACKING_WHITE_POLY: Number(cfg.PACKING_WHITE_POLY ?? 19),
      AWRC_FIXED: Number(cfg.AWRC_FIXED ?? 20),
    };
  };

  // Compute final per unit based on cart rules
  UI.computeFinalPerUnit = ({ unitPrice, commissionAmount, packaging }) => {
    const cfg = UI.getCartCfg();
    const price = Number(unitPrice) || 0;
    const commission = Number(commissionAmount) || 0;

    const cod = price * cfg.COD_RATE;
    const awrc = cfg.AWRC_FIXED;
    const pack = (String(packaging || "box").toLowerCase() === "poly")
      ? cfg.PACKING_WHITE_POLY
      : cfg.PACKING_WHITE_BOX;

    // Final commission per unit
    return commission - (cod + awrc + pack);
  };

  // ----------------------------
  // Icons (inline SVG)
  // ----------------------------
  const ICON = {
    eye: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/></svg>`,
    eyeOff: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M2 12s4-7 10-7a9.7 9.7 0 016.8 2.8M22 12s-4 7-10 7a9.7 9.7 0 01-6.8-2.8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
    save: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21h14V7l-3-3H5v17Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M8 21v-8h8v8" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M8 4v4h8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
    trash: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M9 7V5h6v2" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M7 7l1 14h8l1-14" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`,
    x: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
    skull: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c-4.4 0-8 3.4-8 7.6 0 2.3 1 4.4 2.6 5.8V19c0 .6.4 1 1 1h1v2h2v-2h3v2h2v-2h1c.6 0 1-.4 1-1v-3.6c1.6-1.4 2.6-3.5 2.6-5.8C20 5.4 16.4 2 12 2Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M9 10h.01M15 10h.01" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M10 14h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`
  };

  function ico(svg, size = 18) {
    return `<span style="width:${size}px;height:${size}px;display:inline-flex;align-items:center;justify-content:center;">
      <span style="width:${size}px;height:${size}px;display:inline-flex;">${svg}</span>
    </span>`;
  }

  // ----------------------------
  // Helpers
  // ----------------------------
  UI.renderEmpty = (msg) => {
    const host = UI.elList();
    if (!host) return;
    host.innerHTML = `<div class="oEmpty">${C().escapeHtml(msg || "No orders found.")}</div>`;
  };

  UI.statusPill = (status) => {
    const s = String(status || "").toLowerCase();
    const cls =
      s === "pending" ? "oPill warn" :
      s === "deleted" ? "oPill danger" :
      s === "shipped" ? "oPill ok" :
      "oPill";
    return `<span class="${cls}">${C().escapeHtml(status || "-")}</span>`;
  };

  UI.isPending = (order) => String(order?.status || "").trim() === "Pending";
  UI.isCustomerLocked = ({ isAdmin, order }) => (isAdmin ? false : !UI.isPending(order));

  UI.iconBtnStyle = (tone = "ghost") => {
    const base = `
      width:36px;height:36px;
      border-radius:12px;
      display:inline-flex;align-items:center;justify-content:center;
      border:1px solid #e2e8f0;
      background:#fff;
      color:#0f172a;
      cursor:pointer;
      user-select:none;
      transition: transform .06s ease, box-shadow .15s ease, background .15s ease, opacity .15s ease;
    `;
    if (tone === "primary") return base + `
      background:#0f172a;
      border-color: rgba(15,23,42,.25);
      color:#fff;
    `;
    if (tone === "danger") return base + `
      background:#fee2e2;
      border-color:#fecaca;
      color:#991b1b;
    `;
    if (tone === "dangerSolid") return base + `
      background:#991b1b;
      border-color:#7f1d1d;
      color:#fff;
    `;
    return base;
  };

  UI.setBusy = (btn, busy) => {
    if (!btn) return;
    if (busy) {
      btn.dataset._oldHtml = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;">
        <span style="width:12px;height:12px;border-radius:999px;border:2px solid rgba(255,255,255,.55);border-top-color:#fff;display:inline-block;animation:oSpin .7s linear infinite;"></span>
      </span><style>@keyframes oSpin{to{transform:rotate(360deg)}}</style>`;
    } else {
      btn.disabled = false;
      btn.innerHTML = btn.dataset._oldHtml || btn.innerHTML;
      delete btn.dataset._oldHtml;
    }
  };

  UI.skeletonHtml = () => {
    return `
      <div style="padding:12px;border:1px solid #e2e8f0;border-radius:14px;background:#fff;">
        <div class="oSk" style="height:12px;width:36%;border-radius:8px;"></div>
        <div class="oSk" style="height:10px;width:64%;border-radius:8px;margin-top:10px;"></div>
        <div class="oSk" style="height:140px;border-radius:12px;margin-top:14px;"></div>
        <style>
          .oSk{background:#e2e8f0;position:relative;overflow:hidden;}
          .oSk::before{
            content:"";position:absolute;inset:0;transform:translateX(-60%);
            background:linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.65) 50%, rgba(255,255,255,0) 100%);
            animation:oSh 1.1s infinite;
          }
          @keyframes oSh{to{transform:translateX(160%)}}
        </style>
      </div>
    `;
  };

  // Safe numeric
  const n0 = (v) => {
    const x = Number(v);
    return Number.isFinite(x) ? x : 0;
  };

  // ----------------------------
  // Status / locking helpers
  // ----------------------------
  UI.cardStatus = (card) => String(card?.getAttribute("data-order-status") || "").trim();
  UI.isCardLockedForCustomer = (card, isAdmin) => (isAdmin ? false : UI.cardStatus(card) !== "Pending");

  UI.isTerminalStatus = (status) => {
    const s = String(status || "").trim().toLowerCase();
    return (s === "cancelled" || s === "canceled" || s === "deleted");
  };

  UI.isPermanentDeleteEligibleStatus = (status) => {
    const s = String(status || "").trim().toLowerCase();
    return (s === "shipped" || s === "cancelled" || s === "canceled");
  };

  // ----------------------------
  // Status group UI
  // ----------------------------
  UI.statusBtnStyle = ({ active, disabled }) => {
    return `
      padding:7px 10px;
      border-radius:999px;
      border:1px solid ${active ? "rgba(15,23,42,.25)" : "#e2e8f0"};
      background:${active ? "#0f172a" : "#fff"};
      color:${active ? "#fff" : "#0f172a"};
      font-weight:800;
      font-size:12px;
      line-height:1;
      cursor:${disabled ? "not-allowed" : "pointer"};
      opacity:${disabled ? ".45" : "1"};
      user-select:none;
      transition:transform .06s ease, box-shadow .15s ease, background .15s ease, opacity .15s ease;
      box-shadow:${active ? "0 12px 30px rgba(2,6,23,.12)" : "none"};
    `;
  };

  UI.buildStatusGroup = ({ status, isAdmin }) => {
    const cur = String(status || "").trim();

    if (!isAdmin) {
      if (cur !== "Pending") {
        return `<div style="font-size:12px;color:#64748b;font-weight:700;">Status: ${C().escapeHtml(cur || "-")}</div>`;
      }
      return `
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          <button type="button" data-act="setStatus" data-status="Confirmed"
            style="${UI.statusBtnStyle({ active: false, disabled: false })}"
            title="Confirm order">Confirm</button>
        </div>
      `;
    }

    const list = ["Pending", "Confirmed", "Approved", "Shipped", "Cancelled", "Deleted"];
    const terminal = UI.isTerminalStatus(cur);

    const btns = list.map(st => {
      const active = (st === cur);
      const disabled = terminal || active;

      return `
        <button type="button" data-act="setStatus" data-status="${C().escapeHtml(st)}"
          ${disabled ? "disabled" : ""}
          style="${UI.statusBtnStyle({ active, disabled })}"
          title="${terminal ? "Status locked" : (active ? "Current status" : ("Set " + st))}"
        >${C().escapeHtml(st)}</button>
      `;
    }).join("");

    return `<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">${btns}</div>`;
  };

  UI.refreshStatusGroup = (card, { status, isAdmin }) => {
    const host = card.querySelector('[data-role="statusGroupHost"]');
    if (!host) return;
    host.innerHTML = UI.buildStatusGroup({ status, isAdmin });
  };

  // ----------------------------
  // Lock state
  // ----------------------------
  UI.applyCardLockState = (card, { isAdmin }) => {
    const locked = UI.isCardLockedForCustomer(card, isAdmin);

    card.querySelectorAll('.oMiniItem input[data-field="qty"]').forEach(el => el.disabled = locked);
    card.querySelectorAll('.oMiniItem select[data-field="packaging"]').forEach(el => el.disabled = locked);

    card.querySelectorAll('.oMiniItem input[data-field="price"]').forEach(el => {
      if (isAdmin) el.readOnly = false;
      else el.readOnly = true;
    });

    card.querySelectorAll('button[data-act="saveRow"], button[data-act="removeRow"]').forEach(b => {
      if (!isAdmin && locked) b.style.display = "none";
      else b.style.display = "";
    });

    const del = card.querySelector('button[data-act="kbeauty_delete_order"]');
    if (del) {
      if (isAdmin) {
        del.style.display = "";
        del.disabled = false;
      } else {
        const canDelete = UI.cardStatus(card) === "Pending";
        del.style.display = canDelete ? "" : "none";
        del.disabled = !canDelete;
      }
    }

    const pdel = card.querySelector('button[data-act="permanent_kbeauty_delete_order"]');
    if (pdel) {
      if (!isAdmin) {
        pdel.style.display = "none";
      } else {
        const eligible = UI.isPermanentDeleteEligibleStatus(UI.cardStatus(card));
        pdel.style.display = eligible ? "" : "none";
        pdel.disabled = !eligible;
      }
    }
  };

  // ----------------------------
  // Ensure details exist for status update
  // ----------------------------
  UI.ensureOrderDetails = async ({ user, orderId }) => {
    if (DETAILS_CACHE.has(orderId)) return DETAILS_CACHE.get(orderId).order;

    const res = await C().api({
      action: "kbeauty_get_order_details",
      email: user.email,
      order_id: orderId
    });

    if (!res || !res.success) throw new Error(res?.error || "Failed to load order details.");

    DETAILS_CACHE.set(orderId, { order: res.order });
    return res.order;
  };

  UI.itemsPayloadFromOrder = (order) => {
    const items = Array.isArray(order?.items) ? order.items : [];
    return items.map(it => ({
      id: String(it.product_id || it.id || "").trim(),
      sku: String(it.sku || "").trim(),
      name: String(it.name || "").trim(),
      image_url: String(it.image_url || "").trim(),
      price: n0(it.unit_price ?? it.price ?? 0),
      qty: Math.max(1, n0(it.qty || 1)),
      packaging: String(it.packaging || "box").toLowerCase() === "poly" ? "poly" : "box"
    })).filter(x => x.id);
  };

  // ----------------------------
  // Rendering (orders list)
  // ----------------------------
  UI.renderOrders = ({ user, orders, isAdmin }) => {
    const host = UI.elList();
    if (!host) return;

    host.innerHTML = "";
    if (!orders || !orders.length) {
      UI.renderEmpty("No orders found.");
      return;
    }

    for (const o of orders) {
      host.appendChild(UI.buildOrderCard({ user, order: o, isAdmin }));
    }
  };

  UI.buildOrderCard = ({ user, order, isAdmin }) => {
    const status = String(order.status || "").trim();
    const slLabel = (order.sl != null && String(order.sl).trim() !== "") ? String(order.sl) : "-";
    const locked = UI.isCustomerLocked({ isAdmin, order });

    const card = document.createElement("article");
    card.className = "oCard";
    card.setAttribute("data-order-id", order.order_id);
    card.setAttribute("data-order-status", status);

    const head = document.createElement("div");
    head.className = "oHead";

    head.innerHTML = `
      <div style="display:flex;gap:12px;align-items:flex-start;justify-content:space-between;">
        <div style="min-width:0;">
          <div class="oTitleRow" style="gap:10px;">
            <div class="oTitle" style="font-weight:900;">SL <span class="oMono">#${C().escapeHtml(slLabel)}</span></div>
            ${UI.statusPill(status)}
          </div>

          <div class="oMeta" style="margin-top:4px;">${C().escapeHtml(C().fmtDate(order.created_at))}</div>

          <div class="oMeta" style="font-size:13px;font-weight:800;color:#0f172a;margin-top:2px;">
            ${C().escapeHtml(order.email)}
          </div>

          <div class="oMeta" style="margin-top:6px;">
            ${C().escapeHtml(order.shipping?.name || "-")} • ${C().escapeHtml(order.shipping?.phone || "-")}
          </div>

          ${locked ? `<div class="oMeta" style="margin-top:6px;color:#64748b;">Locked</div>` : ``}
        </div>

        <div class="oMoney" style="flex:0 0 auto;min-width:170px;">
          <div class="oMoneyRow"><span>Total</span><strong data-role="hdrTotal">${C().taka(order.total)}</strong></div>
          <div class="oMoneyRow"><span>Final</span><strong data-role="hdrFinal">${C().taka(order.final_commission_total)}</strong></div>
        </div>
      </div>

      <div style="margin-top:10px;display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap;">
        <div data-role="statusGroupHost">
          ${UI.buildStatusGroup({ status, isAdmin })}
        </div>

        <div style="display:flex;gap:10px;align-items:center;">
          <button type="button" title="Items" style="${UI.iconBtnStyle("ghost")}" data-act="toggleDetails">${ico(ICON.eye, 18)}</button>
        </div>
      </div>
    `;

    const actionBar = UI.buildActionsBar({ user, order, isAdmin });

    const detailsHost = document.createElement("div");
    detailsHost.className = "oDetailsHost";
    detailsHost.style.display = "none";

    card.appendChild(head);
    if (actionBar) card.appendChild(actionBar);
    card.appendChild(detailsHost);

    const viewBtn = head.querySelector('button[data-act="toggleDetails"]');
    if (viewBtn) {
      viewBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        await UI.toggleDetails({ card, user, order, isAdmin, btn: viewBtn });
      });
    }

    UI.wireCardEvents(card, { user, isAdmin });
    UI.applyCardLockState(card, { isAdmin });

    return card;
  };

  // ----------------------------
  // Details: lazy fetch items per order
  // ----------------------------
  UI.toggleDetails = async ({ card, user, order, isAdmin, btn }) => {
    const host = card.querySelector(".oDetailsHost");
    if (!host) return;

    const opened = host.style.display !== "none";
    const orderId = order.order_id;

    if (opened) {
      host.style.display = "none";
      if (btn) btn.innerHTML = ico(ICON.eye, 18);
      return;
    }

    host.style.display = "block";
    if (btn) btn.innerHTML = ico(ICON.eyeOff, 18);

    if (DETAILS_CACHE.has(orderId)) {
      host.innerHTML = "";
      host.appendChild(UI.buildItemsEditor({ user, order: DETAILS_CACHE.get(orderId).order, isAdmin }));
      UI.wireItemsEditorEvents(card, { user, isAdmin });
      UI.recalcCardTotals(card);
      UI.applyCardLockState(card, { isAdmin });
      return;
    }

    host.innerHTML = UI.skeletonHtml();

    try {
      const res = await C().api({
        action: "kbeauty_get_order_details",
        email: user.email,
        order_id: orderId
      });

      if (!res || !res.success) {
        host.innerHTML = `<div class="oEmpty">${C().escapeHtml(res?.error || "Failed to load details.")}</div>`;
        return;
      }

      DETAILS_CACHE.set(orderId, { order: res.order });

      host.innerHTML = "";
      host.appendChild(UI.buildItemsEditor({ user, order: res.order, isAdmin }));

      UI.wireItemsEditorEvents(card, { user, isAdmin });
      UI.recalcCardTotals(card);
      UI.applyCardLockState(card, { isAdmin });
    } catch (er) {
      host.innerHTML = `<div class="oEmpty">${C().escapeHtml(er?.message || String(er))}</div>`;
    }
  };

  // ----------------------------
  // Actions bar (order-level)
  // ----------------------------
  UI.buildActionsBar = ({ user, order, isAdmin }) => {
    const status = String(order.status || "").trim();

    const btnDelete = document.createElement("button");
    btnDelete.className = "btn";
    btnDelete.style.cssText = UI.iconBtnStyle("danger");
    btnDelete.innerHTML = ico(ICON.trash, 18);
    btnDelete.title = "Delete";
    btnDelete.setAttribute("data-act", "kbeauty_delete_order");

    if (!isAdmin) {
      btnDelete.disabled = (status !== "Pending");
      if (btnDelete.disabled) btnDelete.style.display = "none";
    } else {
      btnDelete.disabled = false;
      btnDelete.style.display = "";
    }

    const btnPermanent = document.createElement("button");
    btnPermanent.className = "btn";
    btnPermanent.style.cssText = UI.iconBtnStyle("dangerSolid");
    btnPermanent.innerHTML = ico(ICON.skull, 18);
    btnPermanent.title = "Permanent delete (Shipped/Cancelled only)";
    btnPermanent.setAttribute("data-act", "permanent_kbeauty_delete_order");

    if (!isAdmin) {
      btnPermanent.style.display = "none";
    } else {
      const eligible = UI.isPermanentDeleteEligibleStatus(status);
      btnPermanent.style.display = eligible ? "" : "none";
      btnPermanent.disabled = !eligible;
    }

    if (btnDelete.style.display === "none" && btnPermanent.style.display === "none") return null;

    const wrap = document.createElement("div");
    wrap.className = "oActions";

    const row = document.createElement("div");
    row.className = "oActionRow";
    row.style.display = "flex";
    row.style.gap = "10px";
    row.style.alignItems = "center";
    row.style.flexWrap = "wrap";

    if (btnDelete.style.display !== "none") row.appendChild(btnDelete);
    if (btnPermanent.style.display !== "none") row.appendChild(btnPermanent);

    wrap.appendChild(row);
    return wrap;
  };

  // ----------------------------
  // Items editor
  // ----------------------------
  UI.buildItemsEditor = ({ user, order, isAdmin }) => {
    const box = document.createElement("div");
    box.className = "oItems";

    const customerLocked = UI.isCustomerLocked({ isAdmin, order });
    const items = Array.isArray(order.items) ? order.items : [];

    if (!items.length) {
      box.innerHTML = `<div class="oMeta">No items.</div>`;
      return box;
    }

    box.innerHTML = `
      <div style="display:grid;gap:10px;margin-top:10px;">
        ${items.map(it => UI.itemCardHtml(it, { isAdmin, customerLocked })).join("")}
      </div>
    `;

    box.querySelectorAll('button[data-act="saveRow"]').forEach(b => (b.style.cssText = UI.iconBtnStyle("primary")));
    box.querySelectorAll('button[data-act="removeRow"]').forEach(b => (b.style.cssText = UI.iconBtnStyle("danger")));

    return box;
  };

  UI.itemCardHtml = (it, { isAdmin, customerLocked }) => {
    const img = String(it.image_url || "").trim();
    const imgHtml = img
      ? `<img class="oThumb" src="${C().escapeHtml(img)}" alt=""/>`
      : `<div class="oThumbPh">No image</div>`;

    const packaging = String(it.packaging || "box").toLowerCase() === "poly" ? "poly" : "box";

    const stockQty =
      (it.stock_quantity != null ? it.stock_quantity :
      (it.stock != null ? it.stock :
      (it.in_stock != null ? it.in_stock : null)));

    const stockLine = (stockQty == null)
      ? ``
      : `<div class="oMeta" style="margin-top:4px;color:#64748b;">In stock: <span class="oMono">${C().escapeHtml(stockQty)}</span></div>`;

    const canAct = !customerLocked;

    const priceReadonly = isAdmin ? "" : "readonly";
    const qtyDisabled = customerLocked ? "disabled" : "";
    const packDisabled = customerLocked ? "disabled" : "";

    // commission amount per unit (support multiple api keys)
    const commissionAmount = n0(it.commission_amount ?? it.commission ?? 0);

    // base unit price + per-pack prices (API dependent; falls back safely)
    const unitPrice = n0(it.unit_price ?? it.price ?? 0);
    const boxPrice = n0(it.box_price ?? it.unit_price_box ?? it.box_unit_price ?? unitPrice);
    const polyPrice = n0(it.poly_price ?? it.unit_price_poly ?? it.poly_unit_price ?? unitPrice);

    // initial final per unit (prefer api value; else compute)
    const apiFinalPerUnit = n0(it.final_per_unit);
    const initialFinalPerUnit = (apiFinalPerUnit !== 0)
      ? apiFinalPerUnit
      : UI.computeFinalPerUnit({ unitPrice, commissionAmount, packaging });

    const qtyNow = Math.max(1, n0(it.qty || 1));
    const lineTotal = (unitPrice * qtyNow);
    const liveFinalLine = (initialFinalPerUnit * qtyNow);

    const saveBtn = canAct ? `<button type="button" data-act="saveRow" title="Save">${ico(ICON.save, 18)}</button>` : "";
    const removeBtn = canAct ? `<button type="button" data-act="removeRow" title="Remove">${ico(ICON.x, 18)}</button>` : "";

    return `
      <div
        class="oMiniItem"
        style="border:1px solid #e2e8f0;border-radius:14px;padding:12px;background:#fff;display:flex;gap:12px;align-items:flex-start;justify-content:space-between;"
        data-product-id="${C().escapeHtml(it.product_id || it.id || "")}"
        data-sku="${C().escapeHtml(it.sku || "")}"
        data-image-url="${C().escapeHtml(it.image_url || "")}"
        data-price-box="${C().escapeHtml(boxPrice)}"
        data-price-poly="${C().escapeHtml(polyPrice)}"
        data-commission-amount="${C().escapeHtml(commissionAmount)}"
        data-final-per-unit="${C().escapeHtml(initialFinalPerUnit)}"
      >
        <div style="display:flex;gap:12px;min-width:0;">
          <div style="width:44px;height:44px;flex:0 0 auto;overflow:hidden;border-radius:12px;border:1px solid #e2e8f0;background:#f8fafc;">
            ${imgHtml}
          </div>

          <div style="min-width:0;">
            <div style="font-weight:900;line-height:1.15;" data-role="name">${C().escapeHtml(it.name || "")}</div>

            <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px;align-items:flex-start;">
              <div style="display:grid;gap:6px;">
                <div class="oMeta" style="font-size:12px;">Unit</div>
                <input class="oInp" type="number" step="0.01" min="0" data-field="price"
                  value="${unitPrice}" ${priceReadonly} style="width:110px;" />
              </div>

              <div style="display:grid;gap:6px;">
                <div class="oMeta" style="font-size:12px;">Qty</div>
                <div>
                  <input class="oInp" type="number" step="1" min="1" data-field="qty"
                    value="${qtyNow}" ${qtyDisabled} style="width:90px;" />
                  ${stockLine}
                </div>
              </div>

              <div style="display:grid;gap:6px;">
                <div class="oMeta" style="font-size:12px;">Pack</div>
                <select class="ordersSelect" data-field="packaging" ${packDisabled} style="min-width:100px;">
                  <option value="box" ${packaging === "box" ? "selected" : ""}>Box</option>
                  <option value="poly" ${packaging === "poly" ? "selected" : ""}>Poly</option>
                </select>
              </div>

              <div style="display:grid;gap:4px;">
                <div class="oMeta" style="font-size:12px;">Total</div>
                <div style="font-weight:900;" data-role="lineTotal">${C().taka(lineTotal)}</div>
                <div class="oMeta" style="font-size:12px;">
                  Final Com: <span style="font-weight:800;color:#0f172a;" data-role="finalLineTotal">${C().taka(liveFinalLine)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style="display:flex;gap:10px;align-items:center;flex:0 0 auto;">
          ${saveBtn}
          ${removeBtn}
        </div>
      </div>
    `;
  };

  // ----------------------------
  // Live recalculation
  // ----------------------------
  UI.recalcRow = (rowEl) => {
    if (!rowEl) return { lineTotal: 0, finalLineTotal: 0 };

    const price = n0(rowEl.querySelector('[data-field="price"]')?.value);
    const qty = Math.max(1, n0(rowEl.querySelector('[data-field="qty"]')?.value));
    const finalPerUnit = n0(rowEl.getAttribute("data-final-per-unit"));

    const lineTotal = price * qty;
    const finalLineTotal = finalPerUnit * qty;

    const lineEl = rowEl.querySelector('[data-role="lineTotal"]');
    if (lineEl) lineEl.textContent = C().taka(lineTotal);

    const finalEl = rowEl.querySelector('[data-role="finalLineTotal"]');
    if (finalEl) finalEl.textContent = C().taka(finalLineTotal);

    return { lineTotal, finalLineTotal };
  };

  UI.recalcCardTotals = (card) => {
    const rows = Array.from(card.querySelectorAll(".oMiniItem"));
    let sumLine = 0;
    let sumFinal = 0;

    for (const r of rows) {
      const v = UI.recalcRow(r);
      sumLine += n0(v.lineTotal);
      sumFinal += n0(v.finalLineTotal);
    }

    const hdrTotal = card.querySelector('[data-role="hdrTotal"]');
    const hdrFinal = card.querySelector('[data-role="hdrFinal"]');
    if (hdrTotal) hdrTotal.textContent = C().taka(sumLine);
    if (hdrFinal) hdrFinal.textContent = C().taka(sumFinal);
  };

  // ----------------------------
  // Wire events (order-level) - delegation
  // ----------------------------
  UI.wireCardEvents = (card, { user, isAdmin }) => {
    if (!card) return;

    if (card.__bwWired) return;
    card.__bwWired = true;

    card.addEventListener("click", async (e) => {
      const btn = e.target?.closest?.("button[data-act]");
      if (!btn) return;

      const act = btn.getAttribute("data-act");
      const orderId = card.getAttribute("data-order-id");

      if (act === "kbeauty_delete_order") {
        e.preventDefault();
        if (!confirm("Delete this order?")) return;

        UI.setBusy(btn, true);
        try {
          const res = await C().api({ action: "kbeauty_delete_order", email: user.email, order_id: orderId });
          if (!res || !res.success) return alert(res?.error || "Delete failed.");
          card.remove();
        } finally {
          UI.setBusy(btn, false);
        }
        return;
      }

      if (act === "permanent_kbeauty_delete_order") {
        e.preventDefault();
        if (!isAdmin) return;

        const st = UI.cardStatus(card);
        if (!UI.isPermanentDeleteEligibleStatus(st)) return;

        if (!confirm(`PERMANENT DELETE?\n\nOrder: ${orderId}\nStatus: ${st}\n\nThis cannot be undone.`)) return;

        UI.setBusy(btn, true);
        try {
          const res = await C().api({ action: "admin_kbeauty_delete_order_permanent", email: user.email, order_id: orderId });
          if (!res || !res.success) return alert(res?.error || "Permanent delete failed.");
          card.remove();
        } finally {
          UI.setBusy(btn, false);
        }
        return;
      }

      if (act === "setStatus") {
        e.preventDefault();
        const nextStatus = String(btn.getAttribute("data-status") || "").trim();
        if (!nextStatus) return;

        if (UI.isTerminalStatus(UI.cardStatus(card))) return;

        UI.setBusy(btn, true);
        try {
          const ord = await UI.ensureOrderDetails({ user, orderId });
          const items = UI.itemsPayloadFromOrder(ord);

          const res = await C().api({
            action: "kbeauty_update_order",
            email: user.email,
            order_id: orderId,
            status: nextStatus,
            items
          });

          if (!res || !res.success) return alert(res?.error || "Status update failed.");

          const newStatus = res.status || nextStatus;
          card.setAttribute("data-order-status", newStatus);

          const head = card.querySelector(".oHead");
          if (head) {
            const pill = head.querySelector(".oPill");
            if (pill) pill.outerHTML = UI.statusPill(newStatus);
          }

          UI.refreshStatusGroup(card, { status: newStatus, isAdmin });
          UI.applyCardLockState(card, { isAdmin });
        } finally {
          UI.setBusy(btn, false);
        }
        return;
      }
    });
  };

  // ----------------------------
  // Item editor wiring
  // ✅ Packaging change updates price AND recomputes final_per_unit commission
  // ----------------------------
  UI.wireItemsEditorEvents = (card, { user, isAdmin }) => {
    if (!card) return;

    card.querySelectorAll(".oMiniItem").forEach(row => {
      const qtyEl = row.querySelector('input[data-field="qty"]');
      const priceEl = row.querySelector('input[data-field="price"]');
      const packEl = row.querySelector('select[data-field="packaging"]');

      const recomputeFinal = () => {
        const pack = String(packEl?.value || "box").toLowerCase() === "poly" ? "poly" : "box";
        const price = n0(priceEl?.value);
        const commissionAmount = n0(row.getAttribute("data-commission-amount"));
        const fpu = UI.computeFinalPerUnit({ unitPrice: price, commissionAmount, packaging: pack });
        row.setAttribute("data-final-per-unit", String(fpu));
      };

      const applyPackPrice = () => {
        if (!packEl || !priceEl) return;
        const pack = String(packEl.value || "box").toLowerCase() === "poly" ? "poly" : "box";
        const boxP = n0(row.getAttribute("data-price-box"));
        const polyP = n0(row.getAttribute("data-price-poly"));
        const next = (pack === "poly" ? polyP : boxP);
        if (Number.isFinite(next)) priceEl.value = String(next);
      };

      if (packEl) {
        packEl.addEventListener("change", () => {
          applyPackPrice();     // existing behavior
          recomputeFinal();     // ✅ NEW: update commission
          UI.recalcCardTotals(card);
        });
      }

      // if admin changes price manually, commission must update too
      if (priceEl) {
        priceEl.addEventListener("input", () => {
          recomputeFinal();
          UI.recalcCardTotals(card);
        });
        priceEl.addEventListener("change", () => {
          recomputeFinal();
          UI.recalcCardTotals(card);
        });
      }

      if (qtyEl) {
        qtyEl.addEventListener("input", () => UI.recalcCardTotals(card));
        qtyEl.addEventListener("change", () => UI.recalcCardTotals(card));
      }
    });

    // remove row
    card.querySelectorAll('button[data-act="removeRow"]').forEach(btn => {
      btn.onclick = () => {
        if (!isAdmin && UI.isCardLockedForCustomer(card, isAdmin)) return;
        const row = btn.closest(".oMiniItem");
        if (row) row.remove();
        UI.recalcCardTotals(card);
      };
    });

    // per-row save (unchanged)
    card.querySelectorAll('button[data-act="saveRow"]').forEach(btn => {
      btn.onclick = async () => {
        const orderId = card.getAttribute("data-order-id");

        if (!isAdmin && UI.isCardLockedForCustomer(card, isAdmin)) {
          return alert("This order is locked.");
        }

        const items = UI.collectAllItemsPayload(card);

        UI.setBusy(btn, true);
        try {
          const res = await C().api({
            action: "kbeauty_update_order",
            email: user.email,
            order_id: orderId,
            items
          });

          if (!res || !res.success) {
            alert(res?.error || "Save failed.");
            return;
          }

          UI.patchOrderTotals(card, res);

          if (res.status) {
            card.setAttribute("data-order-status", res.status);
            const head = card.querySelector(".oHead");
            if (head) {
              const pill = head.querySelector(".oPill");
              if (pill) pill.outerHTML = UI.statusPill(res.status);
            }
            UI.refreshStatusGroup(card, { status: res.status, isAdmin });
            UI.applyCardLockState(card, { isAdmin });
          }
        } finally {
          UI.setBusy(btn, false);
        }
      };
    });

    UI.applyCardLockState(card, { isAdmin });
  };

  // IMPORTANT: include commission_amount + final_per_unit in payload so backend can persist it (optional but recommended)
  UI.collectAllItemsPayload = (card) => {
    const rows = Array.from(card.querySelectorAll(".oMiniItem"));
    const out = [];

    for (const r of rows) {
      const product_id = String(r.getAttribute("data-product-id") || "").trim();
      if (!product_id) continue;

      const sku = String(r.getAttribute("data-sku") || "").trim();
      const image_url = String(r.getAttribute("data-image-url") || "").trim();
      const name = String(r.querySelector('[data-role="name"]')?.textContent || "").trim();

      const price = n0(r.querySelector('[data-field="price"]')?.value);
      const qty = Math.max(1, n0(r.querySelector('[data-field="qty"]')?.value));
      const packaging = String(r.querySelector('[data-field="packaging"]')?.value || "box").toLowerCase() === "poly" ? "poly" : "box";

      const commission_amount = n0(r.getAttribute("data-commission-amount"));
      const final_per_unit = n0(r.getAttribute("data-final-per-unit"));

      out.push({
        id: product_id,
        sku,
        name,
        image_url,
        price,
        qty,
        packaging,
        commission_amount,
        final_per_unit
      });
    }

    return out;
  };

  UI.patchOrderTotals = (card, res) => {
    const total = res?.order_total;
    const final = res?.final_commission_total;
    if (total == null && final == null) return;

    const hdrTotal = card.querySelector('[data-role="hdrTotal"]');
    const hdrFinal = card.querySelector('[data-role="hdrFinal"]');
    if (hdrTotal && total != null) hdrTotal.textContent = C().taka(total);
    if (hdrFinal && final != null) hdrFinal.textContent = C().taka(final);
  };

  global.OrdersUI = UI;
})(window);
