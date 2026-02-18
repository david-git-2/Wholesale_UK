window.BW_CART_MATH = (() => {
  const CFG = window.BW_CART_CONFIG;

  function packingCost(packaging){
    return (packaging === "poly") ? CFG.PACKING_WHITE_POLY : CFG.PACKING_WHITE_BOX;
  }

  function commissionPerUnit(it){
    const amt = Number(it.commission) || 0;
    if (amt > 0) return amt;

    const price = Number(it.price) || 0;
    const pct = Number(it.commission_percentage) || 0;
    return price * (pct / 100);
  }

  function computePerUnit(it){
    const price = Number(it.price) || 0;
    const packaging = (it.packaging === "poly") ? "poly" : "box";

    const commission_amount = commissionPerUnit(it);
    const cod_amount = price * CFG.COD_RATE;
    const awrc_amount = CFG.AWRC_FIXED;
    const packing_cost = packingCost(packaging);

    const final_per_unit = commission_amount - (cod_amount + awrc_amount + packing_cost);
    return { price, packaging, commission_amount, cod_amount, awrc_amount, packing_cost, final_per_unit };
  }

  function computeLine(it){
    const qty = Math.max(1, Number(it.qty) || 1);
    const u = computePerUnit(it);

    return {
      qty,
      ...u,
      line_total: u.price * qty,
      commission_line_total: u.commission_amount * qty,
      cod_line_total: u.cod_amount * qty,
      awrc_line_total: u.awrc_amount * qty,
      packing_line_total: u.packing_cost * qty,
      final_line_total: u.final_per_unit * qty
    };
  }

  return { computePerUnit, computeLine };
})();
