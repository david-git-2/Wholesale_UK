// assets/api.js
window.BW_API = (() => {

  function driveToImgUrl(url) {
    if (!url) return "";

    // If it's already a googleusercontent image, keep it
    if (url.includes("googleusercontent.com")) return url;

    // Extract file ID from common Drive patterns
    // Examples:
    // - https://drive.google.com/uc?id=FILEID
    // - https://drive.google.com/file/d/FILEID/view?...
    // - https://drive.google.com/open?id=FILEID
    const m =
      url.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
      url.match(/\/file\/d\/([a-zA-Z0-9_-]+)\//) ||
      url.match(/\/d\/([a-zA-Z0-9_-]+)/);

    const id = m?.[1];
    if (!id) return url;

    // Best reliability for <img>: Drive thumbnail endpoint
    // You can change sz to w400/w800 etc.
    return `https://drive.google.com/thumbnail?id=${id}&sz=w800`;
  }

  async function loadProducts() {
    const url = (window.BW_CFG && window.BW_CFG.DATA_URL) || "./data/pc_data.json";
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
    const json = await res.json();
    const raw = Array.isArray(json) ? json : (json.products || []);

    return raw
      .filter(p => Number(p["AVAILABLE UNITS"] || 0) > 0)
      .map((p) => ({
        id: String(p["PRODUCT CODE"] || p["BARCODE"] || crypto.randomUUID()),
        code: String(p["PRODUCT CODE"] || ""),
        name: String(p["DESCRIPTION"] || "").trim(),
        brand: String(p["BRAND"] || "").trim(),
        stock: Number(p["AVAILABLE UNITS"] || 0),

        innerCase: Number(p["INNER CASE"] || 0),
        outerCase: Number(p["OUTER CASE"] || 0),
        outerPerPlt: Number(p["OUTER PER PLT"] || 0),
        expiry: String(p["EXPIRY DATE"] || "").trim(),

        rspGbp: Number(p["RSP"] || 0),
        piecePriceGbp: Number(p["PIECE PRICE £"] || 0),

        barcode: String(p["BARCODE"] || "").trim(),
        origin: String(p["COUNTRY OF ORIGIN"] || "").trim(),
        tariff: String(p["TARIFF CODE"] || "").trim(),
        languages: String(p["LANGUAGES"] || "").trim(),

        // ✅ normalize drive links
        imageUrl: driveToImgUrl(p.imageUrl || p["IMAGE"] || "")
      }));
  }

  return { loadProducts };
})();
