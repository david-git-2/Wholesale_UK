// docs/assets/uk.orders.api.js
window.BW_UK_ORDERS_API = (() => {
  function apiUrl() {
    const u = window.BW_CONFIG && window.BW_CONFIG.API_URL;
    if (!u) throw new Error("Missing BW_CONFIG.API_URL");
    return u;
  }

  function getUser() {
    // Prefer runtime BW_USER set by auth.js
    if (window.BW_USER && window.BW_USER.email) return window.BW_USER;

    // Fallback to localStorage
    try {
      const raw = localStorage.getItem("bw_user");
      if (!raw) return null;
      const u = JSON.parse(raw);
      return (u && u.email) ? u : null;
    } catch {
      return null;
    }
  }

  function requireEmail() {
    const u = getUser();
    const email = String(u?.email || "").trim();
    if (!email) throw new Error("Not logged in");
    return email;
  }

  function getRole() {
    const u = getUser();
    return String(u?.role || "customer").toLowerCase();
  }

  // Use text/plain JSON (same as your login call)
  async function post(action, payload = {}) {
    const email = payload.email || requireEmail();

    const res = await fetch(apiUrl(), {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, email, ...payload })
    });

    const data = await res.json();
    if (!data || data.success !== true) throw new Error(data?.error || "Request failed");
    return data;
  }

  // Convenience functions
  const fetchOrders = (opts = {}) => post("uk_fetch_orders", opts);
  const getOrder = (orderId) => post("uk_get_order", { orderId });

  const createOrder = ({ orderName, status = "draft", items }) =>
    post("uk_create_order", { orderName, status, items });

  const updateOrder = (orderId, patch) => post("uk_update_order", { orderId, ...patch });
  const deleteOrder = (orderId) => post("uk_delete_order", { orderId });

  const updateItems = (orderId, items) => post("uk_update_items", { orderId, items });
  const deleteItems = (orderId, barcodes) => post("uk_delete_items", { orderId, barcodes });

  const aggregateStockList = (stockListId, useShipped = true) =>
    post("uk_admin_aggregate_stocklist", { stockListId, useShipped });

  return {
    post,
    getUser,
    requireEmail,
    getRole,
    fetchOrders,
    getOrder,
    createOrder,
    updateOrder,
    deleteOrder,
    updateItems,
    deleteItems,
    aggregateStockList
  };
})();
