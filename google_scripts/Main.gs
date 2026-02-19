// ============================
// Main.gs
// ============================
function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) ? e.postData.contents : "{}");
    const action = String(body.action || "").trim();

    if (action === "login") return handleLogin(body);

    if (action === "kbeauty_create_order") return handleCreateOrder(body);
    if (action === "kbeauty_list_orders") return handleListOrders(body);
    if (action === "kbeauty_update_order") return handleUpdateOrder(body);
    if (action === "kbeauty_delete_order") return handleDeleteOrder(body);

    // optional admin-only hard delete for shipped items
    if (action === "kbeauty_hard_delete_shipped_items") return handleHardDeleteShippedItems(body);

    return jsonResponse({ success: false, error: "Invalid action" });
  } catch (err) {
    return jsonResponse({ success: false, error: err && err.message ? err.message : String(err) });
  }
}
