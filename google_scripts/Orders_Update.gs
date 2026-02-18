// ============================
// Orders_Update.gs (IN-PLACE + RETURNS SL)
// ✅ Fast: updates OrderItems rows in place (no append-only history)
// ✅ Orders sheet MAP (12 cols):
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
//
// Rules implemented:
// - Customer: only own order
//   - Pending: can change qty + packaging, delete items by omitting them
//   - Pending -> Confirmed allowed
//   - cannot change price
// - Admin:
//   - can edit items for any status
//   - can change price + qty + packaging
//   - status transitions:
//       Pending -> Confirmed
//       Confirmed -> Approved
//       Approved  -> Shipped
// ============================

// small numeric helper
function n_(v, fallback) {
  const x = Number(v);
  return Number.isFinite(x) ? x : (fallback ?? 0);
}

// ✅ Orders row lookup (order_id is column B, index 1)
function readOrderRow_(ordersSheet, orderId) {
  const lastRow = ordersSheet.getLastRow();
  if (lastRow < 2) return null;

  // read only used area (faster than getDataRange in big sheets)
  const data = ordersSheet.getRange(1, 1, lastRow, ordersSheet.getLastColumn()).getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1] || "") === String(orderId || "")) {
      return { rowIndex: i + 1, row: data[i] };
    }
  }
  return null;
}

// ✅ get ACTIVE item rows for this order (status not Replaced/Deleted)
function readActiveItemRowsForOrder_(itemsSheet, orderId) {
  const lastRow = itemsSheet.getLastRow();
  if (lastRow < 2) return [];

  const data = itemsSheet.getRange(1, 1, lastRow, itemsSheet.getLastColumn()).getValues();
  const out = [];

  for (let i = 1; i < data.length; i++) {
    const oid = String(data[i][0] || "");
    if (oid !== String(orderId || "")) continue;

    const st = String(data[i][17] || "").trim(); // col 18
    if (st === "Replaced" || st === "Deleted") continue;

    out.push({
      rowIndex: i + 1,         // 1-based sheet row index
      row: data[i],            // full row array
      status: st
    });
  }
  return out;
}

// ✅ helper: compute allowed transitions
function nextStatusForUpdate_(currentStatus, requestedNext, isAdmin) {
  const cur = String(currentStatus || "").trim();
  const next = String(requestedNext || "").trim();
  if (!next) return cur;

  // customer: only Pending -> Confirmed
  if (!isAdmin) {
    if (cur === "Pending" && next === "Confirmed") return "Confirmed";
    return cur;
  }

  // admin transitions
  if (cur === "Pending" && next === "Confirmed") return "Confirmed";
  if (cur === "Confirmed" && next === "Approved") return "Approved";
  if (cur === "Approved" && next === "Shipped") return "Shipped";

  return cur;
}

function handleUpdateOrder(body) {
  const email = String(body.email || "").trim();
  const orderId = String(body.order_id || "").trim();
  const items = Array.isArray(body.items) ? body.items : [];

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

    const orderRowIndex = found.rowIndex;
    const orderRow = found.row;

    // Orders sheet indexes (0-based array):
    const sl = n_(orderRow[0], 0);
    const ownerEmail = String(orderRow[3] || "").trim();
    const currentStatus = String(orderRow[6] || "").trim();

    // customers: only own
    if (!admin && ownerEmail !== email) {
      return jsonResponse({ success: false, error: "Not allowed" });
    }

    // customer restriction:
    // - can confirm Pending->Confirmed
    // - item edits only if Pending
    if (!admin) {
      const requestedStatus = String(body.status || "").trim();
      const wantsConfirm = (currentStatus === "Pending" && requestedStatus === "Confirmed");

      if (!wantsConfirm && !canCustomerEditOrder_(currentStatus)) {
        return jsonResponse({ success: false, error: "Only Pending orders can be updated" });
      }
    }

    if (!items.length) return jsonResponse({ success: false, error: "Missing items" });

    // Load ACTIVE items rows for this order
    const activeRows = readActiveItemRowsForOrder_(itemsSheet, orderId);
    if (!activeRows.length) return jsonResponse({ success: false, error: "No existing items found" });

    // Map existing by product_id -> {rowIndex, row}
    // OrderItems row map (18 cols, unchanged):
    // 0 order_id
    // 1 created_at
    // 2 email
    // 3 product_id
    // 4 sku
    // 5 name
    // 6 image_url
    // 7 unit_price
    // 8 qty
    // 9 packaging
    // 10 packing_cost
    // 11 commission_amount
    // 12 cod_amount
    // 13 awrc_amount
    // 14 final_per_unit
    // 15 line_total
    // 16 final_line_total
    // 17 status
    const existingByPid = {};
    for (const r of activeRows) {
      const pid = String(r.row[3] || "").trim();
      if (!pid) continue;
      existingByPid[pid] = r;
    }

    // Request map (customer sends {id, qty, packaging, price?})
    const reqById = {};
    for (const it of items) {
      const pid = String(it.id ?? "").trim();
      if (!pid) continue;
      reqById[pid] = it;
    }

    // Decide final status first (used for item rows too)
    const requestedStatus = String(body.status || "").trim();
    const finalStatus = nextStatusForUpdate_(currentStatus, requestedStatus, admin);

    // Build "next items" normalized payload (for totals recompute)
    // AND write back to sheet IN PLACE for rows that exist
    const nextItems = [];

    // We will delete rows for items omitted from request (in place, bottom-up later)
    const rowsToDelete = [];

    for (const pid in existingByPid) {
      const exWrap = existingByPid[pid];
      const ex = exWrap.row;

      const req = reqById[pid];

      // omitted => delete item row from sheet (this is the "delete item" behavior)
      if (!req) {
        rowsToDelete.push(exWrap.rowIndex);
        continue;
      }

      const oldQty = Math.max(1, n_(ex[8], 1));
      const newQty = Math.max(1, n_(req.qty, oldQty));

      const packaging = String(req.packaging || ex[9] || "box").toLowerCase() === "poly" ? "poly" : "box";

      // preserve per-unit commission fields from existing row
      const packingCost = n_(ex[10], 0);
      const commissionAmount = n_(ex[11], 0);
      const codAmount = n_(ex[12], 0);
      const awrcAmount = n_(ex[13], 0);

      // Preserve final values safely
      let finalPerUnit = n_(ex[14], 0);
      const existingFinalLine = n_(ex[16], 0);
      if ((!finalPerUnit || finalPerUnit <= 0) && existingFinalLine > 0 && oldQty > 0) {
        finalPerUnit = existingFinalLine / oldQty;
      }

      // price rules
      let unitPrice = n_(ex[7], 0);
      if (admin) unitPrice = n_(req.price, unitPrice);

      const lineTotal = unitPrice * newQty;

      // final line total: compute from finalPerUnit; if still 0, scale old final line by qty change
      let finalLineTotal = finalPerUnit * newQty;
      if ((!finalLineTotal || finalLineTotal <= 0) && existingFinalLine > 0) {
        finalLineTotal = (existingFinalLine / oldQty) * newQty;
      }

      // --- write back IN PLACE (single row update)
      // update cols:
      // 7 unit_price
      // 8 qty
      // 9 packaging
      // 15 line_total
      // 16 final_line_total
      // 17 status
      // (also keep email correct if needed)
      itemsSheet.getRange(exWrap.rowIndex, 8).setValue(unitPrice);        // col H (8)
      itemsSheet.getRange(exWrap.rowIndex, 9).setValue(newQty);           // col I (9)
      itemsSheet.getRange(exWrap.rowIndex, 10).setValue(packaging);       // col J (10)
      itemsSheet.getRange(exWrap.rowIndex, 16).setValue(lineTotal);       // col P (16)
      itemsSheet.getRange(exWrap.rowIndex, 17).setValue(finalLineTotal);  // col Q (17)
      itemsSheet.getRange(exWrap.rowIndex, 18).setValue(finalStatus);     // col R (18)

      // build nextItems for totals recompute
      nextItems.push({
        id: pid,
        sku: String(ex[4] || ""),
        name: String(ex[5] || ""),
        image_url: String(ex[6] || ""),
        price: unitPrice,
        qty: newQty,
        packaging,
        packing_cost: packingCost,
        commission_amount: commissionAmount,
        cod_amount: codAmount,
        awrc_amount: awrcAmount,
        final_per_unit: finalPerUnit,
        line_total: lineTotal,
        final_line_total: finalLineTotal
      });
    }

    // must keep at least 1 item
    if (!nextItems.length) {
      return jsonResponse({ success: false, error: "Order must have at least 1 item." });
    }

    // delete removed item rows (bottom-up so row indexes stay valid)
    rowsToDelete.sort((a, b) => b - a);
    for (const rIx of rowsToDelete) {
      itemsSheet.deleteRow(rIx);
    }

    // Recompute totals server-side
    const calc = normalizeItemsV2_(nextItems);
    if (!calc.normalized.length) return jsonResponse({ success: false, error: "No valid items after update" });

    // ✅ Update Orders totals + status (NEW column numbers)
    // total = col E => 5
    // final_commission_total = col F => 6
    // status = col G => 7
    ordersSheet.getRange(orderRowIndex, 5).setValue(calc.orderTotal);
    ordersSheet.getRange(orderRowIndex, 6).setValue(calc.finalCommissionTotal);

    if (finalStatus !== currentStatus) {
      ordersSheet.getRange(orderRowIndex, 7).setValue(finalStatus);
    }

    return jsonResponse({
      success: true,
      sl: sl,                       // ✅ return SL for human-friendly reference
      order_id: orderId,
      status: finalStatus,
      order_total: calc.orderTotal,
      final_commission_total: calc.finalCommissionTotal,
      removed_items: rowsToDelete.length
    });
  } finally {
    lock.releaseLock();
  }
}
