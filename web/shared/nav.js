(function () {
  function isIn(pathPart) {
    return location.pathname.includes("/" + pathPart + "/");
  }

  function getHrefs() {
    // Works if structure is: /web/index.html, /web/kbeauty/*, /web/uk/*
    // If you're using /docs instead of /web, change "web" to "docs" below.

    const baseRoot = isIn("kbeauty") || isIn("uk")
      ? ".."          // from /web/kbeauty/* or /web/uk/* to /web/
      : ".";          // from /web/ to /web/

    return {
      HOME_HREF: `${baseRoot}/index.html`,
      KBEAUTY_HREF: `${baseRoot}/kbeauty/index.html`,
      UK_HREF: `${baseRoot}/uk/index.html`,
    };
  }

  function setActiveLink(navEl) {
    const path = location.pathname;

    let key = "home";
    if (path.includes("/kbeauty/")) key = "kbeauty";
    if (path.includes("/uk/")) key = "uk";

    navEl.querySelectorAll(".bwNavLink").forEach(a => {
      a.classList.toggle("isActive", a.dataset.nav === key);
a.setAttribute(
  "aria-current",
  a.dataset.nav === key ? "page" : "false"
);

    });
  }

  async function mountNav() {
    const mount = document.getElementById("bwNavMount");
    if (!mount) return;

    // load nav.html
    const hrefs = getHrefs();
    const res = await fetch(
      `${hrefs.HOME_HREF.replace("index.html", "")}shared/nav.html`,
      { cache: "no-store" }
    );
    let html = await res.text();

    // replace placeholders
    html = html
      .replaceAll("{{HOME_HREF}}", hrefs.HOME_HREF)
      .replaceAll("{{KBEAUTY_HREF}}", hrefs.KBEAUTY_HREF)
      .replaceAll("{{UK_HREF}}", hrefs.UK_HREF);

    mount.innerHTML = html;

    // ✅ Tell auth.js that nav (and loginSection/userSection) now exists
    window.dispatchEvent(new Event("bw:nav-mounted"));

    // ensure css is loaded once
    if (!document.getElementById("bwNavCss")) {
      const link = document.createElement("link");
      link.id = "bwNavCss";
      link.rel = "stylesheet";
      link.href = `${hrefs.HOME_HREF.replace("index.html", "")}shared/nav.css`;
      document.head.appendChild(link);
    }

    // highlight active
    const navEl = mount.querySelector(".bwNav");
    if (navEl) setActiveLink(navEl);
  }

  document.addEventListener("DOMContentLoaded", mountNav);
})();
