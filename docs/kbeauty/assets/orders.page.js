/* ============================
   docs/assets/orders.page.js
   - page bootstrap + API calls
   - with DEBUG CONSOLES (for action routing + payload verification)
   - FIXED: wires actions for .oCard (Option A UI)
   - NEW:
     ✅ supports status buttons: button[data-act="setStatus"][data-status="..."]
     ✅ customer Pending -> Confirmed button
     ✅ admin step buttons (Confirmed/Approved/Shipped)
   - ✅ NEW: initial load skeleton (shimmer)
   ============================ */

(function (global) {
  const Page = {};
  const C = () => global.OrdersCore;
  const UI = () => global.OrdersUI;

  // Toggle this to silence logs later
  const DEBUG = true;

  const log = (...args) => { if (DEBUG) console.log("[OrdersPage]", ...args); };
  const warn = (...args) => { if (DEBUG) console.warn("[OrdersPage]", ...args); };
  const err  = (...args) => { if (DEBUG) console.error("[OrdersPage]", ...args); };

  function getUser() {
    try {
      const stored = localStorage.getItem("bw_user");
      const parsed = stored ? JSON.parse(stored) : null;
      log("getUser()", parsed);
      return parsed;
    } catch (e) {
      err("getUser() JSON parse failed", e);
      return null;
    }
  }

  async function post(payload) {
    if (!window.BW_CONFIG?.API_URL) throw new Error("Missing BW_CONFIG.API_URL");

    log("POST →", payload);

    const res = await fetch(BW_CONFIG.API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });

    let data = null;
    try {
      data = await res.json();
    } catch (e) {
      err("POST response JSON parse failed", e);
      throw e;
    }

    log("POST ←", payload.action, data);
    return data;
  }

  function isAdminUser(user) {
    const admin = user?.role === "admin" || user?.is_admin === true;
    log("isAdminUser()", admin);
    return admin;
  }

  // ----------------------------
  // ✅ Loading skeleton (initial load)
  // ----------------------------
  function ensureSkelStyle() {
    if (document.getElementById("oSkelStyle")) return;
    const s = document.createElement("style");
    s.id = "oSkelStyle";
    s.textContent = `
      .oSkelWrap{display:grid;gap:12px;}
      .oSkelCard{
        border:1px solid #e2e8f0;border-radius:14px;background:#fff;
        padding:12px;
      }
      .oSkelLine{
        height:10px;border-radius:8px;background:#e2e8f0;
        position:relative;overflow:hidden;
      }
      .oSkelLine::before{
        content:"";position:absolute;inset:0;
        transform:translateX(-60%);
        background:linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.65) 50%, rgba(255,255,255,0) 100%);
        animation:oSkSh 1.1s infinite;
      }
      @keyframes oSkSh{to{transform:translateX(160%)}}
    `;
    document.head.appendChild(s);
  }

  function renderInitialSkeleton(count = 6) {
    ensureSkelStyle();
    const host = UI().elList ? UI().elList() : document.getElementById("ordersList");
    if (!host) return;

    const cards = Array.from({ length: count }).map(() => `
      <div class="oSkelCard">
        <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;">
          <div style="flex:1;min-width:0;">
            <div class="oSkelLine" style="width:38%;height:12px;"></div>
            <div class="oSkelLine" style="width:55%;margin-top:10px;"></div>
            <div class="oSkelLine" style="width:72%;margin-top:10px;"></div>
            <div class="oSkelLine" style="width:64%;margin-top:10px;"></div>
          </div>
          <div style="width:150px;flex:0 0 auto;">
            <div class="oSkelLine" style="width:100%;height:12px;"></div>
            <div class="oSkelLine" style="width:85%;margin-top:10px;"></div>
          </div>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px;">
          <div class="oSkelLine" style="width:72px;height:28px;border-radius:999px;"></div>
          <div class="oSkelLine" style="width:92px;height:28px;border-radius:999px;"></div>
          <div class="oSkelLine" style="width:86px;height:28px;border-radius:999px;"></div>
        </div>
      </div>
    `).join("");

    host.innerHTML = `<div class="oSkelWrap">${cards}</div>`;
  }

  // local UI state
  let STATE = {
    filter: "all",
    q: "",
    sort: "newest",
    orders: [],
    user: null,
    isAdmin: false,
  };

  function applyAndRender() {
    log("applyAndRender()", {
      filter: STATE.filter,
      q: STATE.q,
      sort: STATE.sort,
      ordersCount: (STATE.orders || []).length,
      isAdmin: STATE.isAdmin
    });

    let arr = STATE.orders || [];
    arr = C().filterOrders(arr, STATE.filter);
    arr = C().searchOrders(arr, STATE.q);
    arr = C().sortOrders(arr, STATE.sort);

    log("applyAndRender() after filter/search/sort", { visibleCount: arr.length });

    UI().renderOrders({ user: STATE.user, orders: arr, isAdmin: STATE.isAdmin });

    // wire remove buttons per-render
    UI().wireRemoveButtons(document);

    // wire card actions (save/delete/status buttons)
    wireCardActions();
  }

  function setActiveFilterChip(filter) {
    document.querySelectorAll("[data-filter]").forEach(b => {
      const f = String(b.getAttribute("data-filter") || "");
      b.classList.toggle("active", f === filter);
    });
    log("setActiveFilterChip()", filter);
  }

  async function loadOrders() {
    log("loadOrders() start");

    const user = getUser();
    if (!user?.email) {
      warn("No user email found; redirecting to login");
      alert("Please login first.");
      location.href = "./index.html";
      return;
    }

    STATE.user = user;
    STATE.isAdmin = isAdminUser(user);

    const who = document.getElementById("who");
    if (who) who.textContent = `Logged in as : ${user.email}${STATE.isAdmin ? " (admin)" : ""}`;

    // ✅ show skeleton before network fetch (initial load + refresh)
    renderInitialSkeleton(6);

    const payload = {
      action: "list_orders",
      email: user.email,
      include_items: true,
      limit: 100
    };

    const data = await post(payload);

    if (!data.success) {
      err("list_orders failed", data);
      alert(data.error || "Failed to load orders");
      // show empty state instead of leaving skeleton
      UI().renderEmpty?.(data.error || "Failed to load orders");
      return;
    }

    STATE.orders = Array.isArray(data.orders) ? data.orders : [];
    log("loadOrders() success", { ordersCount: STATE.orders.length });

    if (DEBUG) {
      const ids = STATE.orders.slice(0, 5).map(o => o.order_id);
      log("Recent order ids (first 5)", ids);
    }

    applyAndRender();
  }

  function wireCardActions() {
    const cards = document.querySelectorAll(".oCard");
    log("wireCardActions()", { cards: cards.length });

    cards.forEach(card => {
      const orderId = card.getAttribute("data-order-id");
      const orderStatus = String(card.getAttribute("data-order-status") || "").trim();
      if (!orderId) return;

      const btnSave = card.querySelector('button[data-act="save"]');
      const btnDelete = card.querySelector('button[data-act="delete"]');
      const statusSel = card.querySelector('select[data-act="status"]'); // (legacy dropdown if present)

      // ✅ NEW: status buttons (Confirm / Approved / Shipped)
      const statusBtns = card.querySelectorAll('button[data-act="setStatus"][data-status]');

      if (DEBUG) {
        log("Card actions found", {
          orderId,
          orderStatus,
          hasSave: !!btnSave,
          hasDelete: !!btnDelete,
          hasStatusSelect: !!statusSel,
          statusSelectValue: statusSel ? statusSel.value : null,
          statusBtns: statusBtns.length
        });
      }

      // Delete
      if (btnDelete) {
        btnDelete.onclick = async () => {
          log("CLICK delete", { orderId, orderStatus });

          if (!confirm("Delete this order?")) {
            log("Delete cancelled by user", { orderId });
            return;
          }

          const payload = { action: "delete_order", email: STATE.user.email, order_id: orderId };
          const r = await post(payload);

          if (!r.success) {
            err("delete_order failed", r);
            alert(r.error || "Delete failed");
            return;
          }

          log("delete_order success", r);
          await loadOrders();
        };
      }

      // Save changes (items only)
      if (btnSave) {
        btnSave.onclick = async () => {
          log("CLICK save", { orderId, orderStatus });

          const items = C().readItemsFromCard(card);

          log("Items payload (update_order)", {
            orderId,
            itemsCount: items.length,
            sample: items.slice(0, 2)
          });

          if (!items.length) {
            warn("No items left; blocking update", { orderId });
            alert("No items left. Order must have at least 1 item.");
            return;
          }

          const payload = {
            action: "update_order",
            email: STATE.user.email,
            order_id: orderId,
            items
          };

          // legacy admin dropdown support
          if (STATE.isAdmin && statusSel && statusSel.value) {
            payload.status = statusSel.value;
          }

          log("UPDATE payload final", payload);

          const r = await post(payload);

          if (!r.success) {
            err("update_order failed", r);
            alert(r.error || "Update failed");
            return;
          }

          log("update_order success", r);
          await loadOrders();
        };
      }

      // ✅ NEW: Status buttons handler
      statusBtns.forEach(btn => {
        btn.onclick = async () => {
          const nextStatus = String(btn.getAttribute("data-status") || "").trim();
          if (!nextStatus) return;

          log("CLICK status button", { orderId, from: orderStatus, to: nextStatus });

          if (!confirm(`Change status to ${nextStatus}?`)) {
            log("Status change cancelled by user", { orderId, nextStatus });
            return;
          }

          const items = C().readItemsFromCard(card);
          if (!items.length) {
            warn("No items left; blocking status change", { orderId });
            alert("No items left. Order must have at least 1 item.");
            return;
          }

          const payload = {
            action: "update_order",
            email: STATE.user.email,
            order_id: orderId,
            items,
            status: nextStatus
          };

          log("STATUS payload final", payload);

          const r = await post(payload);

          if (!r.success) {
            err("status update_order failed", r);
            alert(r.error || "Status change failed");
            return;
          }

          log("status change success", r);
          await loadOrders();
        };
      });
    });
  }

  function initControls() {
    log("initControls()");

    // Refresh
    const refreshBtn = document.getElementById("refreshBtn");
    if (refreshBtn) refreshBtn.addEventListener("click", () => {
      log("CLICK refresh");
      loadOrders();
    });

    // Filter chips
    document.querySelectorAll("[data-filter]").forEach(btn => {
      btn.addEventListener("click", () => {
        const f = String(btn.getAttribute("data-filter") || "all");
        log("CLICK filter chip", f);
        STATE.filter = f;
        setActiveFilterChip(STATE.filter);
        applyAndRender();
      });
    });

    // Search
    const qEl = document.getElementById("q");
    if (qEl) {
      qEl.addEventListener("input", () => {
        STATE.q = String(qEl.value || "");
        log("SEARCH input", STATE.q);
        applyAndRender();
      });
    } else {
      warn("Search input #q not found");
    }

    // Sort
    const sortEl = document.getElementById("sort");
    if (sortEl) {
      sortEl.addEventListener("change", () => {
        STATE.sort = String(sortEl.value || "newest");
        log("SORT change", STATE.sort);
        applyAndRender();
      });
    } else {
      warn("Sort select #sort not found");
    }
  }

  Page.init = () => {
    log("Page.init()");
    initControls();

    // ✅ show skeleton immediately on first paint
    renderInitialSkeleton(6);

    loadOrders();
  };

  global.OrdersPage = Page;

  document.addEventListener("DOMContentLoaded", () => Page.init());
})(window);
