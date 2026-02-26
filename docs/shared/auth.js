/* ============================
   ../shared/auth.js  (FULL)
   - Uses Google Identity Services button rendered into #loginSection (in nav.html)
   - Sends email extracted from Google token to backend: { action:"uk_login", email }
   - Stores user in localStorage "bw_user"
   - Stores token in localStorage "bw_id_token"
   - Redirect rules:
      - If NOT logged in and NOT on login.html -> redirect to login.html
      - On logout -> redirect to login.html
   - After successful login -> reload page (clean init)
   ============================ */

let BW_USER = null;
let BW_AUTH_BOOTED = false;

function isLoginPage_() {
  return location.pathname.toLowerCase().endsWith("login.html");
}

function redirectToLogin_() {
  if (!isLoginPage_()) {
    // keep it simple (same folder). If login.html is in another folder, adjust path.
    location.replace("login.html");
  }
}

function setLoginLoading(isLoading, msg) {
  // optional overlay hook (your pages define BW_SET_LOGIN_LOADING)
  try {
    if (window.BW_SET_LOGIN_LOADING) {
      window.BW_SET_LOGIN_LOADING(!!isLoading, msg || "");
    }
  } catch {}

  const el = document.getElementById("loginSection");
  if (!el) return;

  if (isLoading) {
    el.style.display = "flex";
    el.style.alignItems = "center";
    el.style.gap = "8px";
    el.innerHTML = `
      <div class="badge" style="display:flex;align-items:center;gap:8px;">
        <span class="dot" style="animation:pulse 1.2s infinite;"></span>
        <span>${msg || "Loading login…"}</span>
      </div>
    `;
  }
}

function waitForGoogleIdentity(maxMs = 8000, stepMs = 50) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const t = setInterval(() => {
      if (window.google && google.accounts && google.accounts.id) {
        clearInterval(t);
        resolve(true);
        return;
      }
      if (Date.now() - start > maxMs) {
        clearInterval(t);
        reject(new Error("Google Identity script not loaded (google.accounts.id missing)"));
      }
    }, stepMs);
  });
}

// --- token helpers ---
function getStoredIdToken() {
  try { return String(localStorage.getItem("bw_id_token") || "").trim(); }
  catch { return ""; }
}

function setStoredIdToken(t) {
  try {
    if (!t) localStorage.removeItem("bw_id_token");
    else localStorage.setItem("bw_id_token", String(t));
  } catch {}
}

function clearStoredAuth() {
  try { localStorage.removeItem("bw_user"); } catch {}
  try { localStorage.removeItem("bw_id_token"); } catch {}
}

function emitAuthChanged_() {
  try {
    window.dispatchEvent(new CustomEvent("bw:auth-changed", { detail: { user: BW_USER } }));
  } catch {}
}

// --- JWT decode (UI convenience only) ---
function parseJwt(token) {
  const base64Url = token.split(".")[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split("")
      .map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
      .join("")
  );
  return JSON.parse(jsonPayload);
}

async function initGoogleLogin() {
  const loginEl = document.getElementById("loginSection");
  if (!loginEl) return;

  // If user already logged in, don't render button
  if (BW_USER?.email) return;

  try {
    setLoginLoading(true, "Preparing login…");
    await waitForGoogleIdentity();

    if (!window.BW_CONFIG?.GOOGLE_CLIENT_ID) {
      loginEl.innerHTML = `<div class="badge" style="border-color:#fecaca;background:#fff1f2;color:#991b1b;">
        Missing BW_CONFIG.GOOGLE_CLIENT_ID
      </div>`;
      return;
    }

    google.accounts.id.initialize({
      client_id: BW_CONFIG.GOOGLE_CLIENT_ID,
      callback: handleCredentialResponse
    });

    // Clear loader before rendering button
    loginEl.innerHTML = "";
    setLoginLoading(false);

    google.accounts.id.renderButton(loginEl, {
      theme: "outline",
      size: "medium",
      width: 220
    });

  } catch (err) {
    console.warn("Login init failed:", err);
    loginEl.innerHTML = `
      <div class="badge" style="border-color:#fecaca;background:#fff1f2;color:#991b1b;">
        Login could not load. Please refresh the page.
      </div>
    `;
    setLoginLoading(false);
  }
}

async function handleCredentialResponse(response) {
  try {
    setLoginLoading(true, "Signing in…");

    const idToken = String(response?.credential || "").trim();
    if (!idToken) throw new Error("Missing Google credential token");
    setStoredIdToken(idToken);

    // Extract email from token
    let email = "";
    try {
      const payload = parseJwt(idToken);
      email = String(payload?.email || "").trim();
    } catch {}
    if (!email) throw new Error("Could not read email from Google token");

    // Call backend (expects {email})
    const res = await fetch(BW_CONFIG.API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "uk_login", email })
    });

    const data = await res.json();

    if (!data || data.success !== true) {
      BW_USER = null;
      clearStoredAuth();
      alert(data?.error || "Not authorized");
      initGoogleLogin();
      emitAuthChanged_();
      setLoginLoading(false);
      return;
    }

    const user = {
      email: String(data.email || email || "").trim(),
      name: String(data.name || "").trim(),
      role: String(data.role || "customer").toLowerCase().trim() || "customer",
      can_see_price_gbp: !!data.can_see_price_gbp,
      active: true
    };

    if (!user.email) {
      BW_USER = null;
      clearStoredAuth();
      alert("Not authorized");
      initGoogleLogin();
      emitAuthChanged_();
      setLoginLoading(false);
      return;
    }

    BW_USER = user;
    localStorage.setItem("bw_user", JSON.stringify(BW_USER));

    // ✅ reload after login (clean init)
    if (!sessionStorage.getItem("bw_reloaded_after_login")) {
      sessionStorage.setItem("bw_reloaded_after_login", "1");
      location.reload();
      return;
    }

    // fallback if reload is blocked
    emitAuthChanged_();
    setLoginLoading(false);

  } catch (err) {
    console.error("Login error:", err);
    BW_USER = null;
    clearStoredAuth();
    alert("Login failed. Check console.");
    initGoogleLogin();
    emitAuthChanged_();
    setLoginLoading(false);
  }
}

function showUserLoggedIn_() {
  const loginSection = document.getElementById("loginSection");
  const userSection = document.getElementById("userSection");
  const userEmail = document.getElementById("userEmail");

  if (loginSection) loginSection.style.display = "none";
  if (userSection) userSection.style.display = "flex";

  const label = (BW_USER?.name ? BW_USER.name : BW_USER?.email) || "";
  if (userEmail) userEmail.textContent = label;
}

// Global logout
window.logout = function logout() {
  BW_USER = null;
  clearStoredAuth();
  emitAuthChanged_();

  // ✅ always go to login page
  location.replace("login.html");
};

function loadUserFromStorage() {
  const stored = localStorage.getItem("bw_user");
  if (!stored) return;

  try {
    const u = JSON.parse(stored);
    if (u && u.email) {
      BW_USER = u;
      showUserLoggedIn_();
    }
  } catch {
    BW_USER = null;
    localStorage.removeItem("bw_user");
  }
}

function bootAuthOnce() {
  if (BW_AUTH_BOOTED) return;
  BW_AUTH_BOOTED = true;

  loadUserFromStorage();

  // ✅ enforce route protection
  if (!BW_USER?.email && !isLoginPage_()) {
    redirectToLogin_();
    return;
  }

  // If on login page and not logged in => render button
  if (!BW_USER?.email && isLoginPage_()) {
    initGoogleLogin();
    return;
  }

  // If logged in => show UI and (optionally) redirect away from login page
  if (BW_USER?.email) {
    showUserLoggedIn_();

    // optional: if user opens login.html while logged in, send them home
    if (isLoginPage_()) {
      location.replace("index.html");
      return;
    }
  }
}

/* ==========================================
   Public auth helper API
   ========================================== */
window.BW_AUTH = {
  isLoggedIn() {
    if (BW_USER?.email) return true;
    try {
      const raw = localStorage.getItem("bw_user");
      if (!raw) return false;
      const u = JSON.parse(raw);
      return !!u?.email;
    } catch {
      return false;
    }
  },

  getUser() {
    if (BW_USER?.email) return BW_USER;
    try {
      const raw = localStorage.getItem("bw_user");
      if (!raw) return null;
      const u = JSON.parse(raw);
      return (u && u.email) ? u : null;
    } catch {
      return null;
    }
  },

  getIdToken() {
    return getStoredIdToken();
  },

  isAdmin() {
    const u = this.getUser();
    return String(u?.role || "").toLowerCase().trim() === "admin";
  },

  canSeePriceGBP() {
    const u = this.getUser();
    if (!u) return false;
    if (String(u.role || "").toLowerCase().trim() === "admin") return true;
    return !!u.can_see_price_gbp;
  }
};

document.addEventListener("DOMContentLoaded", () => {
  window.addEventListener("bw:nav-mounted", bootAuthOnce, { once: true });

  // if nav already mounted
  if (document.getElementById("loginSection") || document.getElementById("userSection")) {
    bootAuthOnce();
  }
});