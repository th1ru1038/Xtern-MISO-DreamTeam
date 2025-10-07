import os, json, time
import requests
from datetime import datetime
from urllib.parse import urlencode

API_KEY = os.getenv("USAJOBS_API_KEY")
HEADERS = {
    "User-Agent": "youremail@example.com",
    "Authorization-Key": API_KEY
}
BASE = "https://data.usajobs.gov/api/search"

TERMS = [
    "energy", "regulatory", "utility", "transmission",
    "FERC", "EPA", "DOE", "compliance", "climate"
]

def search(term, page=1):
    params = {"Keyword": term, "ResultsPerPage": 50, "Page": page}
    url = f"{BASE}?{urlencode(params)}"
    r = requests.get(url, headers=HEADERS, timeout=30)
    r.raise_for_status()
    return r.json()

if __name__ == "__main__":
    assert API_KEY, "Set USAJOBS_API_KEY env var"
    out = []
    for term in TERMS:
        for page in range(1, 4):  # first 150 results/term
            data = search(term, page)
            for item in data.get("SearchResult", {}).get("SearchResultItems", []):
                pos = item["MatchedObjectDescriptor"]
                out.append({
                    "source": "usajobs",
                    "job_title": pos.get("PositionTitle",""),
                    "company": pos.get("OrganizationName",""),
                    "location": ", ".join([l.get("LocationName","") for l in pos.get("PositionLocation",[])]),
                    "posted_raw": pos.get("PublicationStartDate",""),
                    "url": pos.get("PositionURI",""),
                    "scraped_at": datetime.utcnow().isoformat(timespec="seconds")+"Z",
                    "desc": pos.get("UserArea",{}).get("Details",{}).get("JobSummary","")
                })
            time.sleep(0.8)
    fn = "data_raw/usajobs_raw.jsonl"
    with open(fn,"w") as f:
        for r in out:
            f.write(json.dumps(r, ensure_ascii=False)+"\n")
    print(f"Wrote {len(out)} rows -> {fn}")
