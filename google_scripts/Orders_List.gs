// ============================
// Orders_List.gs (OPTIMIZED)
// - Do NOT load full sheets
// - Read only a recent window of rows
// - Keep your "only items for returned orders" speed-up
// ============================

function handleListOrders(body) {
  const email = String(body.email || "").trim();
  const includeItems =
    body.include_items === true ||
    String(body.include_items || "").toLowerCase() === "true";
  const limit = Math.max(1, Math.min(Number(body.limit || 50), 200));

  if (!email) return jsonResponse({ success: false, error: "Missing email" });

  const auth = requireUser_(email);
  if (!auth.ok) return jsonResponse({ success: false, error: auth.error });

  const admin = isAdmin_(auth.user);

  // ✅ Open SS once
  const ss = openSS_();
  const ordersSheet = ss.getSheetByName("Orders");
  const itemsSheet = ss.getSheetByName("OrderItems");

  if (!ordersSheet) return jsonResponse({ success: false, error: "Missing sheet: Orders" });

  const lastRow = ordersSheet.getLastRow();
  if (lastRow < 2) return jsonResponse({ success: true, orders: [] });

  // ✅ Read only recent window instead of whole sheet
  // Window size is a best-effort: enough to find `limit` orders after filtering.
  const window = Math.min(lastRow - 1, Math.max(limit * 10, 300));
  const startRow = Math.max(2, lastRow - window + 1);

  // Orders columns = 12
  const ordersData = ordersSheet.getRange(startRow, 1, lastRow - startRow + 1, 12).getValues();

  const out = [];
  const orderIdsSet = new Set();

  // newest first (bottom-up)
  for (let i = ordersData.length - 1; i >= 0; i--) {
    const r = ordersData[i];

    // Map:
    // 0 sl, 1 order_id, 2 created_at, 3 email, 4 total, 5 final_commission_total,
    // 6 status, 7 shipName, 8 shipPhone, 9 shipDistrict, 10 shipThana, 11 shipAddress
    const rowEmail = String(r[3] || "").trim();
    const status = String(r[6] || "").trim();

    if (!admin && rowEmail !== email) continue;
    if (!admin && status === "Deleted") continue;

    const oid = String(r[1] || "").trim();
    if (!oid) continue;

    const slRaw = Number(r[0]);
    const sl = Number.isFinite(slRaw) && slRaw > 0 ? slRaw : null;

    out.push({
      sl,
      order_id: oid,
      created_at: toIso_(r[2]),
      email: rowEmail,
      total: Number(r[4] || 0),
      final_commission_total: Number(r[5] || 0),
      status,
      shipping: {
        name: String(r[7] || ""),
        phone: String(r[8] || ""),
        district: String(r[9] || ""),
        thana: String(r[10] || ""),
        address: String(r[11] || "")
      }
    });

    orderIdsSet.add(oid);

    if (out.length >= limit) break;
  }

  if (!includeItems) return jsonResponse({ success: true, orders: out });
  if (!itemsSheet) return jsonResponse({ success: true, orders: out, warning: "Missing sheet: OrderItems" });

  const itemsLastRow = itemsSheet.getLastRow();
  if (itemsLastRow < 2) {
    const withItems0 = out.map(o => ({ ...o, items: [] }));
    return jsonResponse({ success: true, orders: withItems0 });
  }

  // ✅ Only read a recent window of OrderItems as well.
  // Tune multiplier if your orders have many items each.
  const itemsWindow = Math.min(itemsLastRow - 1, Math.max(orderIdsSet.size * 60, 600));
  const itemsStartRow = Math.max(2, itemsLastRow - itemsWindow + 1);

  // OrderItems columns = 18
  const itemsData = itemsSheet.getRange(itemsStartRow, 1, itemsLastRow - itemsStartRow + 1, 18).getValues();

  const itemsByOrder = {};
  out.forEach(o => { itemsByOrder[o.order_id] = []; });

  const seenByOrder = {}; // { [orderId]: Set(product_id) }

  for (let i = 0; i < itemsData.length; i++) {
    const r = itemsData[i];

    const oid = String(r[0] || "").trim();
    if (!orderIdsSet.has(oid)) continue;

    const rowEmail = String(r[2] || "").trim();
    if (!admin && rowEmail !== email) continue;

    const itemStatus = String(r[17] || "").trim();
    if (itemStatus === "Replaced" || itemStatus === "Deleted") continue;

    const pid = String(r[3] || "").trim();
    if (!pid) continue;

    if (!seenByOrder[oid]) seenByOrder[oid] = new Set();
    if (seenByOrder[oid].has(pid)) continue;
    seenByOrder[oid].add(pid);

    itemsByOrder[oid].push({
      product_id: pid,
      sku: String(r[4] || ""),
      name: String(r[5] || ""),
      image_url: String(r[6] || ""),
      unit_price: Number(r[7] || 0),
      qty: Number(r[8] || 0),
      packaging: String(r[9] || ""),
      packing_cost: Number(r[10] || 0),
      commission_amount: Number(r[11] || 0),
      cod_amount: Number(r[12] || 0),
      awrc_amount: Number(r[13] || 0),
      final_per_unit: Number(r[14] || 0),
      line_total: Number(r[15] || 0),
      final_line_total: Number(r[16] || 0),
      status: itemStatus
    });
  }

  const withItems = out.map(o => ({ ...o, items: itemsByOrder[o.order_id] || [] }));
  return jsonResponse({ success: true, orders: withItems });
}
