// docs/assets/auth.access.js
// Blocks UI until uk_check_access completes
// Adds global BW_INITIAL_LOADING flag

(function () {

  // 🔹 Global loading state
  window.BW_INITIAL_LOADING = true;

  function setInitialLoading_(val) {
    window.BW_INITIAL_LOADING = !!val;

    // Notify the app
    try {
      window.dispatchEvent(
        new CustomEvent("bw:initial-loading", {
          detail: { loading: window.BW_INITIAL_LOADING }
        })
      );
    } catch {}
  }

  function hideApp_() {
    const el = document.getElementById("appRoot");
    if (el) el.style.display = "none";
  }

  function showApp_() {
    const el = document.getElementById("appRoot");
    if (el) el.style.display = "";
  }

  function getCachedUser_() {
    try {
      const raw = localStorage.getItem("bw_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function setCachedUser_(u) {
    try {
      if (!u) localStorage.removeItem("bw_user");
      else localStorage.setItem("bw_user", JSON.stringify(u));
    } catch {}
  }

  function emitAuthChanged_(user) {
    try {
      window.dispatchEvent(
        new CustomEvent("bw:auth-changed", { detail: { user } })
      );
    } catch {}
  }

  async function refreshAccess_() {
    setInitialLoading_(true);
    hideApp_();

    if (!window.BW_CONFIG?.API_URL) {
      setInitialLoading_(false);
      showApp_();
      return;
    }

    const cached = getCachedUser_();
    const email = String(cached?.email || "").trim();

    // No cached user → allow page to load (login page etc.)
    if (!email) {
      setInitialLoading_(false);
      showApp_();
      return;
    }

    try {
      const res = await fetch(window.BW_CONFIG.API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "uk_check_access",
          email
        })
      });

      const data = await res.json();

      if (!data || data.success !== true) {
        setCachedUser_(null);
        emitAuthChanged_(null);

        setInitialLoading_(false);
        showApp_();
        return;
      }

      const updatedUser = {
        ...cached,
        email: String(data.email || email).trim(),
        role: String(data.role || "customer").toLowerCase().trim(),
        can_see_price_gbp: !!data.can_see_price_gbp,
        is_admin: !!data.is_admin,
        active: true
      };

      setCachedUser_(updatedUser);

      if (typeof window.BW_USER !== "undefined") {
        window.BW_USER = updatedUser;
      }

      emitAuthChanged_(updatedUser);

      setInitialLoading_(false);
      showApp_();

    } catch (err) {
      console.error("Access check failed:", err);

      setInitialLoading_(false);
      showApp_(); // Don't block UI if network fails
    }
  }

  window.BW_ACCESS = {
    refresh: refreshAccess_
  };

  document.addEventListener("DOMContentLoaded", refreshAccess_);

})();


 (function () {
    function setOverlayVisible(show) {
      const o = document.getElementById("bwInitOverlay");
      if (!o) return;
      o.style.display = show ? "flex" : "none";
    }

    // initial state
    setOverlayVisible(!!window.BW_INITIAL_LOADING);

    // listen to updates from auth.access.js
    window.addEventListener("bw:initial-loading", (e) => {
      setOverlayVisible(!!e.detail?.loading);
    });
  })();