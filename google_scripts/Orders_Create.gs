// ============================
// Orders_Create.gs (OPTIMIZED)
// - open spreadsheet once
// - avoid appendRow (use setValues)
// - longer lock wait to survive spikes
// ============================

function normalizeItemsV2_(items) {
  const arr = Array.isArray(items) ? items : [];

  const normalized = arr.map(it => {
    const productId = String(it.id ?? "").trim();
    const sku = String(it.sku ?? "").trim();
    const name = String(it.name ?? "").trim();
    const imageUrl = String(it.image_url ?? "").trim();

    const unitPrice = Number(it.price ?? 0);
    const qty = Number(it.qty ?? 0);

    const packaging = String(it.packaging || "box").toLowerCase() === "poly" ? "poly" : "box";
    const packingCost = Number(it.packing_cost ?? 0);

    const commissionAmount = Number(it.commission_amount ?? 0);
    const codAmount = Number(it.cod_amount ?? 0);
    const awrcAmount = Number(it.awrc_amount ?? 0);
    const finalPerUnit = Number(it.final_per_unit ?? 0);

    const lineTotal = Number(it.line_total ?? (unitPrice * qty));
    const finalLineTotal = Number(it.final_line_total ?? (finalPerUnit * qty));

    // fallback support
    const commissionPct = Number(it.commission_percentage ?? 0);
    let commissionLineTotal = 0;
    if (commissionAmount > 0) commissionLineTotal = commissionAmount * qty;
    else if (commissionPct > 0) commissionLineTotal = lineTotal * (commissionPct / 100);

    return {
      productId, sku, name, imageUrl,
      unitPrice, qty,
      packaging, packingCost,
      commissionAmount, codAmount, awrcAmount, finalPerUnit,
      lineTotal, finalLineTotal,
      commissionPct, commissionLineTotal
    };
  }).filter(x =>
    x.productId &&
    x.name &&
    Number.isFinite(x.unitPrice) &&
    Number.isFinite(x.qty) &&
    x.qty > 0
  );

  const orderTotal = normalized.reduce((s, x) => s + (Number(x.lineTotal) || 0), 0);
  const finalCommissionTotal = normalized.reduce((s, x) => s + (Number(x.finalLineTotal) || 0), 0);

  return { normalized, orderTotal, finalCommissionTotal };
}

/**
 * Returns next SL number for Orders sheet.
 * Assumes Orders column A = SL, row1 = header.
 */
function nextOrderSl_(ordersSheet) {
  const lastRow = ordersSheet.getLastRow();
  if (lastRow < 2) return 1;

  const slVals = ordersSheet.getRange(2, 1, lastRow - 1, 1).getValues();
  let maxSl = 0;
  for (let i = 0; i < slVals.length; i++) {
    const n = Number(slVals[i][0] || 0);
    if (Number.isFinite(n) && n > maxSl) maxSl = n;
  }
  return maxSl + 1;
}

function handleCreateOrder(body) {
  const email = String(body.email || "").trim();

  // safe date parse
  let createdAt = new Date();
  if (body.created_at) {
    const d = new Date(body.created_at);
    if (!isNaN(d.getTime())) createdAt = d;
  }

  const items = Array.isArray(body.items) ? body.items : [];

  const shipping = body.shipping || {};
  const shipName = String(shipping.name || "").trim();
  const shipPhone = String(shipping.phone || "").trim();
  const shipDistrict = String(shipping.district || "").trim();
  const shipThana = String(shipping.thana || "").trim();
  const shipAddress = String(shipping.address || "").trim();

  if (!email) return jsonResponse({ success: false, error: "Missing email" });

  const auth = requireUser_(email);
  if (!auth.ok) return jsonResponse({ success: false, error: auth.error });

  if (!items.length) return jsonResponse({ success: false, error: "Cart is empty" });

  // ✅ Open SS once + get both sheets
  const ss = openSS_();
  const ordersSheet = ss.getSheetByName("Orders");
  const itemsSheet = ss.getSheetByName("OrderItems");

  if (!ordersSheet) return jsonResponse({ success: false, error: "Missing sheet: Orders" });
  if (!itemsSheet) return jsonResponse({ success: false, error: "Missing sheet: OrderItems" });

  const lock = LockService.getScriptLock();

  // ✅ Increased wait so 20 concurrent is much more likely to succeed
  lock.waitLock(120000); // 2 minutes

  try {
    const sl = nextOrderSl_(ordersSheet);
    const orderId = Utilities.getUuid();

    const calc = normalizeItemsV2_(items);
    if (!calc.normalized.length) return jsonResponse({ success: false, error: "No valid items" });

    const orderTotal = calc.orderTotal;
    const finalCommissionTotal = calc.finalCommissionTotal;

    // ✅ Faster than appendRow (and avoids some overhead)
    const ordersRow = [
      sl,
      orderId,
      createdAt,
      email,
      orderTotal,
      finalCommissionTotal,
      "Pending",
      shipName,
      shipPhone,
      shipDistrict,
      shipThana,
      shipAddress
    ];

    const ordersWriteRow = ordersSheet.getLastRow() + 1;
    ordersSheet.getRange(ordersWriteRow, 1, 1, 12).setValues([ordersRow]);

    // OrderItems rows (18 cols)
    const rows = calc.normalized.map(x => ([
      orderId,
      createdAt,
      email,
      x.productId,
      x.sku,
      x.name,
      x.imageUrl,
      x.unitPrice,
      x.qty,
      x.packaging,
      x.packingCost,
      x.commissionAmount,
      x.codAmount,
      x.awrcAmount,
      x.finalPerUnit,
      x.lineTotal,
      x.finalLineTotal,
      "Pending"
    ]));

    const itemsWriteRow = itemsSheet.getLastRow() + 1;
    itemsSheet.getRange(itemsWriteRow, 1, rows.length, 18).setValues(rows);

    return jsonResponse({ success: true, order_id: orderId, sl });
  } finally {
    lock.releaseLock();
  }
}
