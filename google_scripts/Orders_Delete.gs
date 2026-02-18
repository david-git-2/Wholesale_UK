// ============================
// Orders_Delete.gs (FIXED + optimized)
// Orders sheet MAP (12 cols):
// 0 sl
// 1 order_id
// 2 created_at
// 3 email
// 4 total
// 5 final_commission_total
// 6 status
// 7 shipName
// 8 shipPhone
// 9 shipDistrict
// 10 shipThana
// 11 shipAddress
// ============================

function readOrderRow_(ordersSheet, orderId) {
  const data = ordersSheet.getDataRange().getValues();
  const oid = String(orderId || "").trim();

  for (let i = 1; i < data.length; i++) {
    // order_id is column B (index 1)
    if (String(data[i][1] || "").trim() === oid) {
      return { rowIndex: i + 1, row: data[i] };
    }
  }
  return null;
}

// ============================
// Soft delete order (Pending only)
// body: { action:"delete_order", email, order_id }
// ============================
function handleDeleteOrder(body) {
  const email = String(body.email || "").trim();
  const orderId = String(body.order_id || "").trim();

  if (!email) return jsonResponse({ success: false, error: "Missing email" });
  if (!orderId) return jsonResponse({ success: false, error: "Missing order_id" });

  const auth = requireUser_(email);
  if (!auth.ok) return jsonResponse({ success: false, error: auth.error });

  const admin = isAdmin_(auth.user);

  const ordersSheet = getSheet_("Orders");
  const itemsSheet = getSheet_("OrderItems");
  if (!ordersSheet) return jsonResponse({ success: false, error: "Missing sheet: Orders" });
  if (!itemsSheet) return jsonResponse({ success: false, error: "Missing sheet: OrderItems" });

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const found = readOrderRow_(ordersSheet, orderId);
    if (!found) return jsonResponse({ success: false, error: "Order not found" });

    const rowIndex = found.rowIndex;
    const orderRow = found.row;

    // Orders indexes with SL:
    const ownerEmail = String(orderRow[3] || "").trim(); // D
    const status = String(orderRow[6] || "").trim();     // G

    // customers: only own
    if (!admin && ownerEmail !== email) {
      return jsonResponse({ success: false, error: "Not allowed" });
    }

    // Pending-only delete for BOTH (your rule)
    if (status !== "Pending") {
      return jsonResponse({ success: false, error: "Only Pending orders can be deleted" });
    }

    // soft delete order: status is column G => getRange(rowIndex, 7)
    ordersSheet.getRange(rowIndex, 7).setValue("Deleted");

    // --- soft delete items for this order ---
    // OrderItems map (18 cols): status = col 18 (index 17)
    const itemsData = itemsSheet.getDataRange().getValues();

    // Collect rows to update, then do fewer writes
    const toUpdateRowNumbers = [];
    for (let i = 1; i < itemsData.length; i++) {
      if (String(itemsData[i][0] || "").trim() !== orderId) continue;

      const cur = String(itemsData[i][17] || "").trim();
      // Only mark "active" rows; skip historical rows too
      if (cur === "Deleted" || cur === "Replaced") continue;

      toUpdateRowNumbers.push(i + 1); // sheet row number
    }

    // Batch update (still per-row, but avoids extra checks)
    for (const r of toUpdateRowNumbers) {
      itemsSheet.getRange(r, 18).setValue("Deleted");
    }

    return jsonResponse({
      success: true,
      order_id: orderId,
      deleted_items_rows: toUpdateRowNumbers.length
    });
  } finally {
    lock.releaseLock();
  }
}

// ============================
// Hard delete shipped items rows (Admin only)
// body: { action:"hard_delete_shipped_items", email, order_id }
// ============================
function handleHardDeleteShippedItems(body) {
  const email = String(body.email || "").trim();
  const orderId = String(body.order_id || "").trim();

  if (!email) return jsonResponse({ success: false, error: "Missing email" });
  if (!orderId) return jsonResponse({ success: false, error: "Missing order_id" });

  const auth = requireUser_(email);
  if (!auth.ok) return jsonResponse({ success: false, error: auth.error });
  if (!isAdmin_(auth.user)) return jsonResponse({ success: false, error: "Admin only" });

  const ordersSheet = getSheet_("Orders");
  const itemsSheet = getSheet_("OrderItems");
  if (!ordersSheet) return jsonResponse({ success: false, error: "Missing sheet: Orders" });
  if (!itemsSheet) return jsonResponse({ success: false, error: "Missing sheet: OrderItems" });

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const found = readOrderRow_(ordersSheet, orderId);
    if (!found) return jsonResponse({ success: false, error: "Order not found" });

    // Orders status index 6 (col G)
    const status = String(found.row[6] || "").trim();
    if (status !== "Shipped") {
      return jsonResponse({ success: false, error: "Only Shipped orders can be hard-deleted" });
    }

    // Delete item rows for this order (bottom-up)
    const data = itemsSheet.getDataRange().getValues();
    let removed = 0;

    for (let i = data.length - 1; i >= 1; i--) {
      if (String(data[i][0] || "").trim() === orderId) {
        itemsSheet.deleteRow(i + 1);
        removed++;
      }
    }

    return jsonResponse({ success: true, removed_items: removed });
  } finally {
    lock.releaseLock();
  }
}
