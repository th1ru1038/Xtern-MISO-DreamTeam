from playwright.sync_api import sync_playwright
from urllib.parse import urlencode
from bs4 import BeautifulSoup
import random, time
from datetime import datetime
import json

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_3_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.111 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; rv:127.0) Gecko/20100101 Firefox/127.0"
]

BASE = "https://www.indeed.com/jobs"

def fetch_page(q, start=0, l=None):
    params = {"q": q, "start": start}
    if l: params["l"] = l
    url = f"{BASE}?{urlencode(params)}"
    ua = random.choice(USER_AGENTS)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--disable-dev-shm-usage"])
        ctx = browser.new_context(user_agent=ua, viewport={"width":1280, "height":1600})
        page = ctx.new_page()
        page.goto(url, wait_until="domcontentloaded", timeout=45000)
        # give JS a moment to populate cards
        page.wait_for_timeout(1500)
        html = page.content()
        browser.close()
        return html


def parse_list(html, source="indeed"):
    soup = BeautifulSoup(html, "html.parser")
    cards = soup.select("div.job_seen_beacon")
    out = []
    for c in cards:
        title_el = c.select_one("h2 a")
        company_el = c.select_one("span.companyName")
        loc_el = c.select_one("div.companyLocation")
        date_el = c.select_one("span.date")
        if not title_el: 
            continue
        title = title_el.get_text(strip=True)
        url = "https://www.indeed.com" + title_el.get("href", "")
        company = company_el.get_text(strip=True) if company_el else ""
        location = loc_el.get_text(" ", strip=True) if loc_el else ""
        posted = date_el.get_text(strip=True) if date_el else ""
        out.append({
            "source": source,
            "job_title": title,
            "company": company,
            "location": location,
            "posted_raw": posted,
            "url": url,
            "scraped_at": datetime.utcnow().isoformat(timespec="seconds") + "Z",
            "desc": ""  # can fetch detail page later if needed
        })
    return out

if __name__ == "__main__":
    queries = [
        "energy regulatory",
        "utility compliance",
        "grid policy",
        "environmental compliance",
        "FERC analyst",
        "PUC analyst"
    ]
    all_rows = []
    for q in queries:
        # first 3 pages each (0, 10, 20). expand as needed.
        for start in [0, 10, 20]:
            html = fetch_page(q, start=start)
            rows = parse_list(html)
            all_rows.extend(rows)
            time.sleep(1.5)
    fn = "data_raw/indeed_raw.jsonl"
    with open(fn, "w") as f:
        for r in all_rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    print(f"Wrote {len(all_rows)} rows -> {fn}")
