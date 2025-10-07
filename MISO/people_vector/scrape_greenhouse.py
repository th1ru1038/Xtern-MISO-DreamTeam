import json, requests, time
from datetime import datetime

COMPANIES = [
    "rmi", "nrdc", "formenergy", "breakthroughenergy", "bloomenergy"
]

def fetch(company):
    url = f"https://boards-api.greenhouse.io/v1/boards/{company}/jobs"
    r = requests.get(url, timeout=20)
    r.raise_for_status()
    return r.json().get("jobs", [])

out = []
for c in COMPANIES:
    try:
        jobs = fetch(c)
        for j in jobs:
            out.append({
                "source": "greenhouse",
                "company": c,
                "job_title": j.get("title",""),
                "location": (j.get("location") or {}).get("name",""),
                "posted_raw": j.get("updated_at",""),
                "url": j.get("absolute_url",""),
                "scraped_at": datetime.utcnow().isoformat(timespec="seconds")+"Z",
                "desc": j.get("content","")
            })
        time.sleep(0.5)
    except Exception as e:
        print("err", c, e)

fn = "data_raw/greenhouse_raw.jsonl"
with open(fn,"w") as f:
    for r in out:
        f.write(json.dumps(r, ensure_ascii=False)+"\n")
print(f"Wrote {len(out)} rows -> {fn}")
