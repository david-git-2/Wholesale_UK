// docs/assets/cart.checkout.uk.js
(function () {

  /* ============================
     Simple Dialog Utility
     ============================ */

  function ensureDialog_() {
    if (document.getElementById("bwDialog")) return;

    const div = document.createElement("div");
    div.id = "bwDialog";
    div.style.cssText = `
      display:none;
      position:fixed;
      inset:0;
      z-index:10000;
      background:rgba(15,23,42,.45);
      backdrop-filter: blur(2px);
      align-items:center;
      justify-content:center;
    `;

    div.innerHTML = `
      <div style="
        width:min(480px, 92vw);
        background:#fff;
        border:1px solid #e2e8f0;
        border-radius:16px;
        padding:16px;
        box-shadow:0 10px 30px rgba(0,0,0,.18);
        font-family:system-ui;
      ">
        <div style="font-weight:900;font-size:15px;margin-bottom:8px;" id="bwDialogTitle"></div>
        <div style="font-size:14px;margin-bottom:14px;" id="bwDialogBody"></div>
        <div style="display:flex;justify-content:flex-end;gap:8px;" id="bwDialogActions"></div>
      </div>
    `;

    document.body.appendChild(div);

    div.addEventListener("click", e => {
      if (e.target === div) closeDialog_();
    });
  }

  function closeDialog_() {
    const d = document.getElementById("bwDialog");
    if (d) d.style.display = "none";
  }

  function showAlert_(title, message) {
    ensureDialog_();
    const d = document.getElementById("bwDialog");
    document.getElementById("bwDialogTitle").textContent = title;
    document.getElementById("bwDialogBody").textContent = message;

    const actions = document.getElementById("bwDialogActions");
    actions.innerHTML = `
      <button style="
        padding:8px 12px;
        border-radius:10px;
        border:1px solid #0f172a;
        background:#0f172a;
        color:#fff;
        font-weight:600;
        cursor:pointer;
      ">OK</button>
    `;
    actions.querySelector("button").onclick = closeDialog_;
    d.style.display = "flex";
  }

  function showPrompt_(title, defaultValue) {
    ensureDialog_();
    const d = document.getElementById("bwDialog");

    document.getElementById("bwDialogTitle").textContent = title;
    document.getElementById("bwDialogBody").innerHTML = `
      <input id="bwPromptInput" value="${defaultValue || ""}" style="
        width:100%;
        padding:8px 10px;
        border:1px solid #e2e8f0;
        border-radius:10px;
      " />
    `;

    return new Promise(resolve => {
      const actions = document.getElementById("bwDialogActions");
      actions.innerHTML = `
        <button id="bwCancelBtn" style="
          padding:8px 12px;
          border-radius:10px;
          border:1px solid #e2e8f0;
          background:#fff;
          font-weight:600;
          cursor:pointer;
        ">Cancel</button>

        <button id="bwOkBtn" style="
          padding:8px 12px;
          border-radius:10px;
          border:1px solid #0f172a;
          background:#0f172a;
          color:#fff;
          font-weight:600;
          cursor:pointer;
        ">Create</button>
      `;

      document.getElementById("bwCancelBtn").onclick = () => {
        closeDialog_();
        resolve(null);
      };

      document.getElementById("bwOkBtn").onclick = () => {
        const val = document.getElementById("bwPromptInput").value.trim();
        closeDialog_();
        resolve(val || null);
      };

      d.style.display = "flex";
      setTimeout(() => {
        document.getElementById("bwPromptInput")?.focus();
      }, 50);
    });
  }

  /* ============================
     Cart Logic
     ============================ */

  function getCartStorageKey_() {
    return (window.BW_CART_CONFIG_UK && String(window.BW_CART_CONFIG_UK.KEY || "").trim())
      || "bw_cart_v1";
  }

  function readCart_() {
    const KEY = getCartStorageKey_();
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
    catch { return []; }
  }

  function clearCart_() {
    const KEY = getCartStorageKey_();
    localStorage.setItem(KEY, "[]");
    if (window.BW_CART?._sync) window.BW_CART._sync();
  }

  function defaultOrderName_() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `UK Order ${y}-${m}-${day}`;
  }

  async function checkout_() {
    try {
      window.BW_UK_ORDERS_API.requireEmail();

      const cart = readCart_();
      if (!cart.length) {
        showAlert_("Cart Empty", "Your cart is empty.");
        return;
      }

      const items = cart.map(it => ({
        barcode: String(it.barcode || "").trim(),
        brand: String(it.brand || "").trim(),
        description: String(it.description || it.name || "").trim(),
        imageUrl: String(it.imageUrl || "").trim(),
        piecePriceGBP: Number(it.priceEach || 0),
        innerCase: Number(it.step || 1),
        orderedQuantity: Number(it.qty || 0),
      })).filter(x => x.barcode && x.orderedQuantity > 0);

      if (!items.length) {
        showAlert_("Invalid Cart", "Cart items missing barcode or quantity.");
        return;
      }

      const orderName = await showPrompt_("Create Order", defaultOrderName_());
      if (!orderName) return;

      if (window.BW_SET_LOGIN_LOADING)
        window.BW_SET_LOGIN_LOADING(true, "Creating order…");

      const res = await window.BW_UK_ORDERS_API.createOrder({
        orderName,
        status: "draft",
        items
      });

      clearCart_();

      showAlert_("Order Created", `Order ID: ${res.orderId}`);

      setTimeout(() => {
        window.location.href = "./orders.html";
      }, 1000);

    } catch (e) {
      console.error(e);
      showAlert_("Error", e.message || String(e));
    } finally {
      if (window.BW_SET_LOGIN_LOADING)
        window.BW_SET_LOGIN_LOADING(false);
    }
  }

  function patchCheckout_() {
    if (!window.BW_CART) return;
    window.BW_CART.checkout = checkout_;
  }

  window.addEventListener("DOMContentLoaded", () => {
    patchCheckout_();
    setTimeout(patchCheckout_, 250);
    setTimeout(patchCheckout_, 1000);
  });

})();
