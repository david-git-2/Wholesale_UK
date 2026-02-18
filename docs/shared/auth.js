/* ============================
   docs/assets/auth.js (FIX: login button sometimes not showing)
   - Waits for nav.html to be mounted before running init (bw:nav-mounted)
   - Waits for Google Identity Services to load (google.accounts)
   - Prevents auth.js from crashing if script is late/blocked
   - Shows loading indicator while initializing
   - Shows logged-in email
   ============================ */

let BW_USER = null;
let BW_AUTH_BOOTED = false;

function setLoginLoading(isLoading, msg) {
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
  } else {
    // do nothing; renderButton() will replace it
  }
}

// Wait until google.accounts exists
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

async function initGoogleLogin() {
  const loginEl = document.getElementById("loginSection");
  if (!loginEl) return;

  // If user already logged in, don't render button
  if (BW_USER?.email) return;

  try {
    setLoginLoading(true, "Preparing login…");
    await waitForGoogleIdentity();

    // Safety checks
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

    google.accounts.id.renderButton(loginEl, {
      theme: "outline",
      size: "medium",
      width: 200
    });

    // Optional: show "One Tap" prompt (can be annoying)
    // google.accounts.id.prompt();

  } catch (err) {
    console.warn("Login init failed:", err);

    // Friendly UI fallback
    loginEl.innerHTML = `
      <div class="badge" style="border-color:#fecaca;background:#fff1f2;color:#991b1b;">
        Login could not load. Please refresh the page.
      </div>
    `;
  }
}

async function handleCredentialResponse(response) {
  try {
    // show loader while verifying email
    setLoginLoading(true, "Signing in…");

    const payload = parseJwt(response.credential);
    const email = payload.email;

    const res = await fetch(BW_CONFIG.API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "login", email })
    });

    const data = await res.json();

    if (data.success) {
      BW_USER = { email, role: data.role || "customer" };
      localStorage.setItem("bw_user", JSON.stringify(BW_USER));
      showUserLoggedIn();
    } else {
      BW_USER = null;
      localStorage.removeItem("bw_user");
      alert(data.error || "Not authorized");
      // re-render button
      initGoogleLogin();
    }
  } catch (err) {
    console.error("Login error:", err);
    alert("Login failed. Check console.");
    initGoogleLogin();
  }
}

function showUserLoggedIn() {
  const loginSection = document.getElementById("loginSection");
  const userSection = document.getElementById("userSection");
  const userEmail = document.getElementById("userEmail");

  if (loginSection) loginSection.style.display = "none";
  if (userSection) userSection.style.display = "flex";
  if (userEmail) userEmail.textContent = BW_USER?.email || "";
}

// make logout globally callable (your HTML uses onclick="logout()")
window.logout = function logout() {
  BW_USER = null;
  localStorage.removeItem("bw_user");
  location.reload();
};

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

function loadUserFromStorage() {
  const stored = localStorage.getItem("bw_user");
  if (stored) {
    try {
      BW_USER = JSON.parse(stored);
      if (BW_USER?.email) showUserLoggedIn();
    } catch {
      BW_USER = null;
      localStorage.removeItem("bw_user");
    }
  }
}

function bootAuthOnce() {
  if (BW_AUTH_BOOTED) return;
  BW_AUTH_BOOTED = true;

  loadUserFromStorage();

  // Only init login if not already logged in
  if (!BW_USER?.email) initGoogleLogin();
}

// ✅ Wait for nav.html to be mounted (so #loginSection/#userSection exist)
document.addEventListener("DOMContentLoaded", () => {
  // If nav mounts later (common case)
  window.addEventListener("bw:nav-mounted", bootAuthOnce, { once: true });

  // If nav already exists (auth.js loaded late)
  if (document.getElementById("loginSection") || document.getElementById("userSection")) {
    bootAuthOnce();
  }
});
