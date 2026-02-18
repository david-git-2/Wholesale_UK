/* ============================
   docs/assets/orders.core.js  (UPDATED)
   - business logic + payload shaping
   - optimized for: list_orders without items + get_order_details for items
   - supports: per-row item payload
   - NEW: helper for admin permanent delete eligibility (optional convenience)
   ============================ */

(function (global) {
  const OrdersCore = {};

  // ---------- configuration ----------
  // Must exist in your page already
  // e.g. window.BW_CONFIG = { API_URL: "https://script.google.com/macros/s/...../exec" }
  OrdersCore.API_URL = () => (global.BW_CONFIG && global.BW_CONFIG.API_URL) ? global.BW_CONFIG.API_URL : "";

  // ---------- API wrapper ----------
  OrdersCore.api = async (payload) => {
    const url = OrdersCore.API_URL();
    if (!url) throw new Error("Missing BW_CONFIG.API_URL");

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload || {})
    });

    // Apps Script often returns JSON already
    const data = await res.json();
    return data;
  };

  // ---------- formatting helpers ----------
  OrdersCore.taka = (n) => {
    const num = Number(n);
    if (!Number.isFinite(num)) return "৳ 0.00";
    return "৳ " + num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  OrdersCore.fmtDate = (iso) => {
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return String(iso || "");
      return d.toLocaleString();
    } catch {
      return String(iso || "");
    }
  };

  OrdersCore.escapeHtml = (s) => {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  };

  // ---------- status helpers ----------
  OrdersCore.isPending = (status) => String(status || "").trim() === "Pending";

  // Customer can edit only Pending (backend enforces too)
  OrdersCore.canCustomerEdit = (status) => OrdersCore.isPending(status);

  OrdersCore.statusPill = (status) => {
    const s = String(status || "").toLowerCase();
    const cls =
      s === "pending" ? "pill warn" :
      s === "deleted" ? "pill danger" :
      s === "shipped" ? "pill ok" :
      "pill";
    return `<span class="${cls}">${OrdersCore.escapeHtml(status || "-")}</span>`;
  };

  // Admin transition policy matches backend:
  // Confirmed -> Approved -> Shipped
  OrdersCore.allowedAdminNextStatuses = (currentStatus) => {
    const s = String(currentStatus || "").trim();
    if (s === "Confirmed") return ["Approved"];
    if (s === "Approved") return ["Shipped"];
    return [];
  };

  // NEW: permanent delete eligibility (optional helper)
  OrdersCore.canAdminPermanentDelete = (status) => {
    const s = String(status || "").trim().toLowerCase();
    return (s === "shipped" || s === "cancelled" || s === "canceled");
  };

  // ---------- search / filter / sort ----------
  OrdersCore.filterOrders = (orders, filter) => {
    const f = String(filter || "all").toLowerCase();
    if (f === "all") return orders;
    return orders.filter(o => String(o.status || "").toLowerCase() === f);
  };

  // ✅ Optimized: list_orders response no longer contains items, so don't scan items here.
  OrdersCore.searchOrders = (orders, q) => {
    const query = String(q || "").trim().toLowerCase();
    if (!query) return orders;

    return orders.filter(o => {
      const parts = [];
      parts.push(String(o.order_id || ""));
      parts.push(String(o.sl ?? ""));              // allow searching SL
      parts.push(String(o.email || ""));
      parts.push(String(o.status || ""));
      parts.push(String(o.shipping?.phone || ""));
      parts.push(String(o.shipping?.district || ""));
      parts.push(String(o.shipping?.thana || ""));
      parts.push(String(o.shipping?.address || ""));

      // NOTE: do NOT scan o.items because list_orders doesn't include it anymore

      return parts.join(" ").toLowerCase().includes(query);
    });
  };

  OrdersCore.sortOrders = (orders, mode) => {
    const m = String(mode || "newest");
    const arr = [...orders];

    if (m === "oldest") {
      arr.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      return arr;
    }

    if (m === "total_desc") {
      arr.sort((a, b) => Number(b.total || 0) - Number(a.total || 0));
      return arr;
    }

    if (m === "total_asc") {
      arr.sort((a, b) => Number(a.total || 0) - Number(b.total || 0));
      return arr;
    }

    // default newest
    arr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return arr;
  };

  // ---------- payload building ----------
  // Backend expects update payload item shape using normalizeItemsV2_():
  // { id, sku, name, image_url, price, qty, packaging, packing_cost, ... }
  // Customer rule: only qty + packaging changes allowed; price must remain unchanged (backend enforces).
  OrdersCore.readItemFromRow = (tr) => {
    if (!tr) return null;

    const id = String(tr.getAttribute("data-product-id") || "").trim();
    if (!id) return null;

    const nameEl = tr.querySelector('[data-role="name"]');
    const name = nameEl ? String(nameEl.textContent || "").trim() : "";

    const getVal = (field) => {
      const el = tr.querySelector(`input[data-field="${field}"], select[data-field="${field}"]`);
      return el ? el.value : "";
    };

    const price = Number(getVal("price") || 0);
    const qty = Number(getVal("qty") || 0);
    const packaging = String(getVal("packaging") || "box").toLowerCase() === "poly" ? "poly" : "box";

    const sku = String(tr.getAttribute("data-sku") || "").trim();
    const imageUrl = String(tr.getAttribute("data-image-url") || "").trim();

    // Optional fields (admin only if you expose them in UI)
    const packingCost = Number(getVal("packing_cost") || 0);
    const commissionAmount = Number(getVal("commission_amount") || 0);
    const codAmount = Number(getVal("cod_amount") || 0);
    const awrcAmount = Number(getVal("awrc_amount") || 0);
    const finalPerUnit = Number(getVal("final_per_unit") || 0);

    if (!qty || qty <= 0) return null;

    return {
      id,
      sku,
      name,
      image_url: imageUrl,
      price,
      qty,
      packaging,
      packing_cost: packingCost,
      commission_amount: commissionAmount,
      cod_amount: codAmount,
      awrc_amount: awrcAmount,
      final_per_unit: finalPerUnit,
    };
  };

  OrdersCore.readItemsFromCard = (cardEl) => {
    const rows = cardEl.querySelectorAll("tbody tr[data-product-id]");
    const out = [];

    rows.forEach(tr => {
      const one = OrdersCore.readItemFromRow(tr);
      if (one) out.push(one);
    });

    return out;
  };

  global.OrdersCore = OrdersCore;
})(window);
