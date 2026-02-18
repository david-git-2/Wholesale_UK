window.BW_CART_STOCK = (() => {
  let STOCK_MAP = new Map();

  function stockForKey(key){
    if (!key) return 0;
    const v = STOCK_MAP.get(String(key).trim());
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  function getBestStockForItem(it){
    const id = String(it?.id || "").trim();
    const sku = String(it?.sku || "").trim();
    const name = String(it?.name || "").trim();
    return stockForKey(id) || stockForKey(sku) || stockForKey(name) || 0;
  }

  async function loadStockMapFromDataJson(){
    const DATA_URL = window.BW_CART_CONFIG?.DATA_URL || "./data.json";
    try {
      const res = await fetch(DATA_URL, { cache: "no-store" });
      const data = await res.json();
      const items = Array.isArray(data) ? data : (data.items || []);
      const m = new Map();

      for (const it of items) {
        const stock = Number(it.stock_quantity) || 0;
        const id = String(it.id || "").trim();
        const sku = String(it.sku || "").trim();
        const name = String(it.name || "").trim();
        if (id) m.set(id, stock);
        if (sku) m.set(sku, stock);
        if (name) m.set(name, stock);
      }

      STOCK_MAP = m;
    } catch (err) {
      console.warn("Failed to load stock from data.json:", err);
      STOCK_MAP = new Map();
    }
  }

  return { stockForKey, getBestStockForItem, loadStockMapFromDataJson };
})();
