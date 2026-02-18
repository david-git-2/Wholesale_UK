// ============================
// Auth.gs
// ============================
function getUser_(email) {
  const sheet = getSheet_("Users");
  if (!sheet) return null;

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const rowEmail = String(data[i][0] || "").trim();
    const active = String(data[i][1] || "").toLowerCase().trim();
    const role = String(data[i][2] || "").toLowerCase().trim(); // admin/customer

    if (rowEmail === email) {
      return { email: rowEmail, active: active === "true", role: role || "customer" };
    }
  }
  return null;
}

function requireUser_(email) {
  const user = getUser_(email);
  if (!user || !user.active) return { ok: false, error: "Not authorized" };
  return { ok: true, user };
}

function handleLogin(body) {
  const email = String(body.email || "").trim();
  if (!email) return jsonResponse({ success: false, error: "Missing email" });

  const auth = requireUser_(email);
  if (!auth.ok) return jsonResponse({ success: false, error: auth.error });

  return jsonResponse({ success: true, role: auth.user.role });
}
