import json, glob, re
import pandas as pd
from dateutil import parser

KEYWORDS = [k.strip().lower() for k in open("keywords.txt") if k.strip()]

def read_jsonl(path):
    rows = []
    with open(path) as f:
        for line in f:
            rows.append(json.loads(line))
    return rows

def normalize_date(s):
    if not s: return None
    try:
        return parser.parse(s, fuzzy=True)
    except Exception:
        # handle Indeed "Just posted", "1 day ago"
        m = re.search(r"(\d+)\s+day", s)
        if m:
            return pd.Timestamp.utcnow().normalize() - pd.Timedelta(days=int(m.group(1)))
        return None

def detect_keywords(text):
    text = (text or "").lower()
    hits = sorted({k for k in KEYWORDS if k in text})
    return ",".join(hits)

files = glob.glob("data_raw/*_raw.jsonl")
frames = []
for fp in files:
    rows = read_jsonl(fp)
    df = pd.DataFrame(rows)
    frames.append(df)

df = pd.concat(frames, ignore_index=True).fillna("")
# unify fields
df["posted_at"] = df["posted_raw"].apply(normalize_date)
df["text"] = (df["job_title"].astype(str) + " " + df["desc"].astype(str))
df["keywords_detected"] = df["text"].apply(detect_keywords)

# filter: keep rows with ≥1 keyword
df = df[df["keywords_detected"] != ""]

# dedupe by title+company+location
df["dedupe_key"] = (df["job_title"].str.lower()+"|"+df["company"].str.lower()+"|"+df["location"].str.lower())
df = df.sort_values("posted_at", ascending=False).drop_duplicates("dedupe_key")

# select columns
df_out = df[[
    "posted_at","job_title","company","location","keywords_detected","source","url"
]].sort_values("posted_at", ascending=False)

csv_path = "data_clean/people_vector_clean.csv"
parquet_path = "data_clean/people_vector_clean.parquet"
df_out.to_csv(csv_path, index=False)
df_out.to_parquet(parquet_path, index=False)
print(f"Rows: {len(df_out)}")
print(f"Wrote {csv_path} and {parquet_path}")

# quick daily counts (starter signal)
daily = df_out.assign(date=df_out["posted_at"].dt.date).groupby("date").size().reset_index(name="count")
daily.to_csv("data_clean/daily_counts.csv", index=False)
