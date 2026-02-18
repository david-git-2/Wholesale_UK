// ============================
// Utils.gs (OPTIMIZED)
// - Cache Spreadsheet open per execution
// - Fast helpers for getting sheets
// ============================

const SPREADSHEET_ID = "1MVGT6IEqFb0opjBUf2p60Sg8hEDC20poiQJVpD2m2rY";

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Cache SS per execution (very common speed win)
let __SS_CACHE = null;

function openSS_() {
  if (__SS_CACHE) return __SS_CACHE;
  __SS_CACHE = SpreadsheetApp.openById(SPREADSHEET_ID);
  return __SS_CACHE;
}

function getSheet_(name) {
  const ss = openSS_();
  const sh = ss.getSheetByName(name);
  return sh || null;
}

// Get multiple sheets with one open
function getSheets_(names) {
  const ss = openSS_();
  const out = {};
  (names || []).forEach(n => out[n] = ss.getSheetByName(n) || null);
  return out;
}

function isAdmin_(user) {
  return String((user && user.role) || "").toLowerCase() === "admin";
}

function canCustomerEditOrder_(status) {
  return String(status || "").trim() === "Pending";
}

function canAdminChangeStatus_(status) {
  return status === "Confirmed" || status === "Approved";
}

function toIso_(d) {
  return (d instanceof Date) ? d.toISOString() : String(d || "");
}
