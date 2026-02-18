import os
import json
import time
import html as htmlmod
from urllib.parse import unquote, urlencode
from typing import Optional, Tuple, List, Dict, Any

from dotenv import load_dotenv
load_dotenv()

import requests
from bs4 import BeautifulSoup

BASE = "https://www.kobareseller.com"
LOGIN_GET = f"{BASE}/login"
LOGIN_POST = f"{BASE}/login"
CSRF_COOKIE_URL = f"{BASE}/sanctum/csrf-cookie"
PRODUCTS_PATH = "/dashboard/products"

OUTFILE = "docs/kbeauty/data/koba_data.json"


def get_env(name: str, default: Optional[str] = None) -> Optional[str]:
    """
    Return env var value as-is.
    - If env var is missing (None): return default
    - If env var is present but empty (""): return "" (caller can handle it)
    """
    v = os.environ.get(name)
    return default if v is None else v


def get_xsrf_token_from_cookies(session: requests.Session) -> Optional[str]:
    token = session.cookies.get("XSRF-TOKEN")
    return unquote(token) if token else None


def extract_inertia_payload(html_text: str) -> Optional[dict]:
    soup = BeautifulSoup(html_text, "lxml")
    el = soup.select_one("#app[data-page]") or soup.select_one("[data-page]")
    if not el:
        return None
    return json.loads(htmlmod.unescape(el["data-page"]))


def login_session(email: str, password: str) -> requests.Session:
    s = requests.Session()
    s.headers.update({
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": LOGIN_GET,
        "Origin": BASE,
    })

    # Seed cookies + Sanctum CSRF
    s.get(BASE + "/", timeout=30)
    s.get(CSRF_COOKIE_URL, timeout=30)

    xsrf = get_xsrf_token_from_cookies(s)
    if xsrf:
        s.headers["X-XSRF-TOKEN"] = xsrf

    # Hit login page (sometimes rotates XSRF)
    s.get(LOGIN_GET, timeout=30)
    xsrf = get_xsrf_token_from_cookies(s)
    if xsrf:
        s.headers["X-XSRF-TOKEN"] = xsrf

    # Login
    r = s.post(LOGIN_POST, data={"email": email, "password": password}, timeout=30)
    if r.status_code != 200 or "/login" in r.url:
        raise SystemExit("Login failed (check credentials or extra checks)")

    return s


def build_products_url(product_filter: str, page: int, per_page: Optional[int]) -> str:
    """
    If product_filter is empty/whitespace, DO NOT include 'product' in query params.
    """
    params = {"page": str(page)}

    if product_filter and product_filter.strip():
        params["product"] = product_filter.strip()

    # only include per_page if you want to try it (site may ignore)
    if per_page is not None:
        params["per_page"] = str(per_page)

    return f"{BASE}{PRODUCTS_PATH}?{urlencode(params)}"


def fetch_page_inertia(
    s: requests.Session,
    url: str,
    retries: int = 2,
    sleep_seconds: float = 2.0
) -> dict:
    """
    Fetch page HTML and return parsed Inertia payload.
    Retries for intermittent 403/409/empty responses.
    """
    last_err = None
    for attempt in range(retries + 1):
        r = s.get(url, timeout=30)

        # Cloudflare/WAF sometimes returns empty body or 403/409 transiently
        if r.status_code == 200 and r.text.strip():
            inertia = extract_inertia_payload(r.text)
            if inertia:
                return inertia
            last_err = f"No Inertia payload found in HTML for {url}"
        else:
            last_err = f"HTTP {r.status_code} or empty body for {url}"

        if attempt < retries:
            time.sleep(sleep_seconds)

    raise SystemExit(f"Failed to fetch/parse page after retries: {last_err}")


def extract_items_and_meta(inertia: dict) -> Tuple[List[Dict[str, Any]], dict]:
    props = inertia.get("props") or {}
    items_obj = props.get("items") or {}
    data = items_obj.get("data")
    meta = items_obj.get("meta") or {}

    if not isinstance(data, list):
        raise SystemExit("Could not find props.items.data list")
    if not isinstance(meta, dict):
        meta = {}

    return data, meta


def main():
    email = get_env("KOBA_EMAIL")
    password = get_env("KOBA_PASSWORD")

    # If KOBA_PRODUCT_FILTER is missing -> default to "" (no filter)
    # If KOBA_PRODUCT_FILTER="" -> stays "" (no filter)
    # If KOBA_PRODUCT_FILTER="cosrx" -> uses "cosrx"
    product_filter = get_env("KOBA_PRODUCT_FILTER", "")
    product_filter = (product_filter or "").strip()

    per_page_str = get_env("KOBA_PER_PAGE")
    per_page = int(per_page_str) if per_page_str and per_page_str.isdigit() else None

    if not email or not password:
        raise SystemExit("Missing KOBA_EMAIL or KOBA_PASSWORD")

    print(f"Logging in as {email} …")
    s = login_session(email, password)
    print("✅ Logged in")

    # 1) Fetch page 1 to discover last_page from meta
    url1 = build_products_url(product_filter, page=1, per_page=per_page)
    print(f"Fetching page 1: {url1}")
    inertia1 = fetch_page_inertia(s, url1)

    items1, meta1 = extract_items_and_meta(inertia1)
    last_page = meta1.get("last_page", 1)
    try:
        last_page = int(last_page)
    except Exception:
        last_page = 1

    print(f"✅ Page 1 items: {len(items1)} | last_page: {last_page}")

    all_items: List[Dict[str, Any]] = []
    all_items.extend(items1)

    # 2) Loop through remaining pages
    for page in range(2, last_page + 1):
        url = build_products_url(product_filter, page=page, per_page=per_page)
        print(f"Fetching page {page}: {url}")
        inertia = fetch_page_inertia(s, url)
        items, meta = extract_items_and_meta(inertia)
        print(f"✅ Page {page} items: {len(items)}")
        all_items.extend(items)

    # 3) Deduplicate by id if present (your data uses string UUID id)
    seen = set()
    deduped = []
    for it in all_items:
        key = it.get("id")
        if key is None:
            deduped.append(it)
            continue
        if key in seen:
            continue
        seen.add(key)
        deduped.append(it)

    os.makedirs(os.path.dirname(OUTFILE), exist_ok=True)
    with open(OUTFILE, "w", encoding="utf-8") as f:
        json.dump(deduped, f, ensure_ascii=False, indent=2)

    filter_label = product_filter if product_filter else "ALL"
    print(f"\n✅ Saved {len(deduped)} total items to {OUTFILE} (filter={filter_label})")


if __name__ == "__main__":
    main()
