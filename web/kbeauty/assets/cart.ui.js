window.BW_CART_UI = (() => {
  const taka = (n) => {
    const num = Number(n);
    if (!Number.isFinite(num)) return "৳ 0.00";
    return "৳ " + num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  function placeholderSvg(text){
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120">
        <rect width="100%" height="100%" fill="#f1f5f9"/>
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
          font-family="system-ui" font-size="12" fill="#94a3b8">${text}</text>
      </svg>`
    );
  }

  // ----------------------------
  // Icons (inline SVG)
  // ----------------------------
  const ICON = {
    x: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M18 6L6 18M6 6l12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `,
    cart: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 6h15l-2 8H7L6 6Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M6 6L5 3H2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <circle cx="9" cy="19" r="1.5" fill="none" stroke="currentColor" stroke-width="2"/>
        <circle cx="18" cy="19" r="1.5" fill="none" stroke="currentColor" stroke-width="2"/>
      </svg>
    `,
    user: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20 21a8 8 0 10-16 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="2"/>
      </svg>
    `,
    phone: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 3h4l2 5-2 1c1 3 3 5 6 6l1-2 5 2v4c-10 1-19-8-18-16Z"
          fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      </svg>
    `,
    mapPin: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 21s7-5 7-11a7 7 0 10-14 0c0 6 7 11 7 11Z" fill="none" stroke="currentColor" stroke-width="2"/>
        <circle cx="12" cy="10" r="2" fill="none" stroke="currentColor" stroke-width="2"/>
      </svg>
    `,
    home: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 10.5 12 3l9 7.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M6 10v11h12V10" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      </svg>
    `,
    info: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/>
        <path d="M12 10v6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M12 7.2h.01" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
      </svg>
    `
  };

  function iconWrap(svg, size = 18){
    return `<span class="bwIco" style="width:${size}px;height:${size}px;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;">
      <span style="width:${size}px;height:${size}px;display:inline-flex;">${svg}</span>
    </span>`;
  }

  function ensureCheckoutModal(placeOrderHandler){
    if (document.getElementById("bwCheckoutModal")) return;

    const modal = document.createElement("div");
    modal.id = "bwCheckoutModal";

    // Overlay
    modal.style.cssText = `
      display:none; position:fixed; inset:0; z-index:10000;
      background:rgba(15,23,42,.58);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      align-items:center; justify-content:center;
      padding:12px;
    `;

    const inputStyle = `
      width:100%;
      padding:11px 12px;
      border:1px solid #cbd5e1;
      border-radius:14px;
      outline:none;
      background:#fff;
      color:#0f172a;
      font-size:14px;
      transition: box-shadow .15s ease, border-color .15s ease, transform .05s ease;
    `;

    const labelStyle = `
      font-size:12px; color:#475569;
      display:flex; gap:6px; align-items:center;
      user-select:none;
    `;

    const btnBase = `
      border:1px solid #e2e8f0;
      background:#fff;
      color:#0f172a;
      padding:10px 12px;
      border-radius:14px;
      display:inline-flex;
      align-items:center;
      justify-content:center;
      gap:8px;
      cursor:pointer;
      transition: transform .06s ease, box-shadow .15s ease, background .15s ease, border-color .15s ease;
      user-select:none;
      white-space:nowrap;
    `;

    const btnPrimary = `
      background:linear-gradient(180deg,#2563eb,#1d4ed8);
      color:#fff;
      border:1px solid rgba(37,99,235,.55);
      box-shadow: 0 14px 34px rgba(37,99,235,.20);
    `;

    modal.innerHTML = `
      <div id="bwCheckoutCard" style="
        width:min(560px, calc(100vw - 24px));
        background:#fff;
        border:1px solid rgba(226,232,240,.95);
        border-radius:18px;
        box-shadow:0 22px 60px rgba(0,0,0,.22);
        font-family: system-ui;
        overflow:hidden;
        transform: translateY(10px);
        opacity:0;
        animation: bwPop .18s ease-out forwards;
      " role="dialog" aria-modal="true" aria-labelledby="bwCheckoutTitle">
        <style>
          @keyframes bwPop { to { transform: translateY(0); opacity: 1; } }
        </style>

        <!-- Header -->
        <div style="
          padding:14px 16px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
          border-bottom:1px solid #e2e8f0;
          background:linear-gradient(180deg,#ffffff,#f8fafc);
        ">
          <div id="bwCheckoutTitle" style="font-weight:800; color:#0f172a; display:flex; gap:8px; align-items:center;">
            ${iconWrap(ICON.mapPin, 18)}
            <span>Delivery details</span>
          </div>

          <button id="bwCheckoutClose" type="button" style="${btnBase} padding:9px 10px;" aria-label="Close checkout">
            ${iconWrap(ICON.x, 18)}
            <span style="font-weight:600; font-size:13px;">Close</span>
          </button>
        </div>

        <!-- Body -->
        <div style="padding:16px; display:grid; gap:12px;">
          <div style="display:grid; gap:6px;">
            <label style="${labelStyle}">
              ${iconWrap(ICON.user, 16)} <span>Name</span>
            </label>
            <input id="bwShipName" type="text" placeholder="Full name" style="${inputStyle}">
          </div>

          <div style="display:grid; gap:6px;">
            <label style="${labelStyle}">
              ${iconWrap(ICON.phone, 16)} <span>Phone</span>
            </label>
            <input id="bwShipPhone" type="tel" placeholder="01XXXXXXXXX" style="${inputStyle}" inputmode="tel">
          </div>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
            <div style="display:grid; gap:6px;">
              <label style="${labelStyle}">
                ${iconWrap(ICON.mapPin, 16)} <span>District</span>
              </label>
              <input id="bwShipDistrict" type="text" placeholder="District" style="${inputStyle}">
            </div>

            <div style="display:grid; gap:6px;">
              <label style="${labelStyle}">
                ${iconWrap(ICON.mapPin, 16)} <span>Thana</span>
              </label>
              <input id="bwShipThana" type="text" placeholder="Thana" style="${inputStyle}">
            </div>
          </div>

          <div style="display:grid; gap:6px;">
            <label style="${labelStyle}">
              ${iconWrap(ICON.home, 16)} <span>Address</span>
            </label>
            <textarea id="bwShipAddress" rows="3" placeholder="House / Road / Area"
              style="${inputStyle} resize:vertical; min-height:84px;"></textarea>
          </div>

          <div id="bwCheckoutErr" style="
            display:none;
            color:#b91c1c;
            background:linear-gradient(180deg,#fff1f2,#ffe4e6);
            border:1px solid #fecaca;
            padding:10px 12px;
            border-radius:14px;
            font-size:13px;
            line-height:1.35;
          "></div>

          <!-- Footer -->
          <div style="
            display:flex;
            justify-content:space-between;
            align-items:center;
            gap:12px;
            margin-top:2px;
            padding-top:4px;
          ">
            <div style="font-size:13px; color:#334155; line-height:1.35;">
              Total price: <strong id="bwModalTotal" style="color:#0f172a"></strong><br/>
              Final commission: <strong id="bwModalFinal" style="color:#0f172a"></strong>
            </div>

            <button id="bwPlaceOrderBtn" type="button" style="${btnBase} ${btnPrimary} padding:11px 14px;">
              ${iconWrap(ICON.cart, 18)}
              <span style="font-weight:700; font-size:13px;">Place order</span>
            </button>
          </div>

          <div style="font-size:12px;color:#64748b; display:flex; gap:8px; align-items:center; margin-top:-2px;">
            ${iconWrap(ICON.info, 16)}
            <span>Your info will be saved on this device for faster checkout.</span>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Make SVGs inherit text color nicely
    modal.querySelectorAll("svg").forEach(svg => {
      svg.style.width = "100%";
      svg.style.height = "100%";
      svg.style.display = "block";
    });

    // Close / outside click
    const closeBtn = document.getElementById("bwCheckoutClose");
    const placeBtn = document.getElementById("bwPlaceOrderBtn");

    closeBtn.addEventListener("click", () => hideCheckoutModal());
    modal.addEventListener("click", (e) => { if (e.target === modal) hideCheckoutModal(); });

    // Place order
    placeBtn.addEventListener("click", placeOrderHandler);

    // Focus ring (inline)
    const focusIn = (el) => {
      el.style.borderColor = "#60a5fa";
      el.style.boxShadow = "0 0 0 4px rgba(59,130,246,.22)";
    };
    const focusOut = (el) => {
      el.style.borderColor = "#cbd5e1";
      el.style.boxShadow = "none";
    };

    ["bwShipName","bwShipPhone","bwShipDistrict","bwShipThana","bwShipAddress"].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("focus", () => focusIn(el));
      el.addEventListener("blur", () => focusOut(el));
    });

    // Button hover/active (inline)
    const hoverBtn = (btn, on) => {
      if (!btn) return;
      const isPrimary = btn.id === "bwPlaceOrderBtn";
      if (on) {
        btn.style.boxShadow = isPrimary
          ? "0 18px 44px rgba(37,99,235,.26)"
          : "0 12px 30px rgba(2,6,23,.10)";
        btn.style.background = isPrimary
          ? "linear-gradient(180deg,#1d4ed8,#1e40af)"
          : "#f8fafc";
      } else {
        btn.style.boxShadow = isPrimary
          ? "0 14px 34px rgba(37,99,235,.20)"
          : "none";
        btn.style.background = isPrimary
          ? "linear-gradient(180deg,#2563eb,#1d4ed8)"
          : "#fff";
      }
    };

    [closeBtn, placeBtn].forEach(btn => {
      if (!btn) return;
      btn.addEventListener("mouseenter", () => hoverBtn(btn, true));
      btn.addEventListener("mouseleave", () => hoverBtn(btn, false));
      btn.addEventListener("mousedown", () => { btn.style.transform = "translateY(1px)"; });
      btn.addEventListener("mouseup", () => { btn.style.transform = "translateY(0)"; });
    });

    // ESC to close
    document.addEventListener("keydown", (e) => {
      const m = document.getElementById("bwCheckoutModal");
      if (e.key === "Escape" && m && m.style.display === "flex") hideCheckoutModal();
    });
  }

  function showCheckoutModal(totalPrice, totalFinal){
    const tEl = document.getElementById("bwModalTotal");
    const fEl = document.getElementById("bwModalFinal");
    if (tEl) tEl.textContent = taka(totalPrice);
    if (fEl) fEl.textContent = taka(totalFinal);

    const saved = localStorage.getItem("bw_shipping");
    if (saved) {
      try {
        const s = JSON.parse(saved);
        if (s?.name) document.getElementById("bwShipName").value = s.name;
        if (s?.phone) document.getElementById("bwShipPhone").value = s.phone;
        if (s?.district) document.getElementById("bwShipDistrict").value = s.district;
        if (s?.thana) document.getElementById("bwShipThana").value = s.thana;
        if (s?.address) document.getElementById("bwShipAddress").value = s.address;
      } catch {}
    }

    const err = document.getElementById("bwCheckoutErr");
    if (err) { err.style.display = "none"; err.textContent = ""; }

    const m = document.getElementById("bwCheckoutModal");
    if (m) {
      m.style.display = "flex";
      document.documentElement.style.overflow = "hidden"; // prevent background scroll
      setTimeout(() => document.getElementById("bwShipName")?.focus(), 0);
    }
  }

  function hideCheckoutModal(){
    const m = document.getElementById("bwCheckoutModal");
    if (m) m.style.display = "none";
    document.documentElement.style.overflow = "";
  }

  function resetCheckoutModalFields(){
    const ids = ["bwShipName","bwShipPhone","bwShipDistrict","bwShipThana","bwShipAddress"];
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) el.value = "";
    }
    const err = document.getElementById("bwCheckoutErr");
    if (err) { err.style.display = "none"; err.textContent = ""; }

    const btn = document.getElementById("bwPlaceOrderBtn");
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `${iconWrap(ICON.cart, 18)}<span style="font-weight:700; font-size:13px;">Place order</span>`;
      btn.style.opacity = "1";
    }
  }

  function showModalError(msg){
    const err = document.getElementById("bwCheckoutErr");
    if (!err) return;
    err.textContent = msg;
    err.style.display = "block";
  }

  function collectShipping(){
    const name = String(document.getElementById("bwShipName")?.value || "").trim();
    const phone = String(document.getElementById("bwShipPhone")?.value || "").trim();
    const district = String(document.getElementById("bwShipDistrict")?.value || "").trim();
    const thana = String(document.getElementById("bwShipThana")?.value || "").trim();
    const address = String(document.getElementById("bwShipAddress")?.value || "").trim();
    return { name, phone, district, thana, address };
  }

  function validateShipping(s){
    if (!s.name) return "Name is required.";
    if (!s.phone) return "Phone is required.";
    if (!s.district) return "District is required.";
    if (!s.thana) return "Thana is required.";
    if (!s.address) return "Address is required.";
    if (s.phone.length < 10) return "Phone looks too short.";
    return "";
  }

  return {
    taka,
    placeholderSvg,
    ensureCheckoutModal,
    showCheckoutModal,
    hideCheckoutModal,
    resetCheckoutModalFields,
    showModalError,
    collectShipping,
    validateShipping
  };
})();
