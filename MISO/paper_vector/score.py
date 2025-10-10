#!/usr/bin/env python3
import os, sys, time, json, math, argparse, re
import datetime as dt
from typing import List, Dict
import pandas as pd
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlencode, quote_plus
from io import StringIO


CACHE_DIR = "./cache"
os.makedirs(CACHE_DIR, exist_ok=True)

def load_lexicon(path="lexicon.yaml")->Dict[str, List[str]]:
    import yaml
    with open(path, "r") as f:
        raw = yaml.safe_load(f)
    return {k: [s.lower() for s in v.get("include", [])] for k,v in raw.items()}

# ---- Federal Register ----
def pull_federal_register(keywords:List[str], days:int=365)->pd.DataFrame:
    # API docs: https://www.federalregister.gov/developers/documentation/api/v1
    base = "https://www.federalregister.gov/api/v1/documents.json"
    start_date = (pd.Timestamp.utcnow().normalize() - pd.Timedelta(days=days)).date().isoformat()
    params = {
        "per_page": 250,
        "order": "newest",
        "conditions[publication_date][gte]": start_date,
    }
    rows, seen_ids = [], set()
    for kw in keywords:
        q = params.copy()
        if " " in kw: kw = f'"{kw}"'
        q["conditions[term]"] = kw
        url = f"{base}?{urlencode(q, quote_via=quote_plus)}"
        try:
            r = requests.get(url, timeout=30)
            r.raise_for_status()
            data = r.json()
            for d in data.get("results", []):
                if d.get("document_number") in seen_ids:
                    continue
                seen_ids.add(d.get("document_number"))
                rows.append({
                    "source":"FR",
                    "id": d.get("document_number"),
                    "title": d.get("title"),
                    "agencies": ", ".join([a.get("name","") for a in d.get("agencies", [])]) if d.get("agencies") else None,
                    "publication_date": d.get("publication_date"),
                    "type": d.get("type"),
                    "comments_close_on": d.get("comments_close_on"),
                    "html_url": d.get("html_url"),
                })
            time.sleep(0.25)
        except Exception as e:
            print("[WARN] FR fetch failed for", kw, "->", e, file=sys.stderr)
            continue
    return pd.DataFrame(rows)

# ---- OIRA / Reginfo ----
def pull_oira_under_review(days:int=365)->pd.DataFrame:
    # Fallback: parse EO review page tables (no API key). 
    url = "https://www.reginfo.gov/public/do/eoReviewSearch"
    try:
                # --- FIX: fetch HTML manually to avoid SSL verify errors with read_html(url) ---
        html = requests.get(url, timeout=30).text
        tables = pd.read_html(StringIO(html))
    except Exception as e:
        print("[WARN] Could not parse OIRA page:", e, file=sys.stderr)
        return pd.DataFrame(columns=["source","id","title","agency","stage","received","status","detail_url"])
    frames = []
    for t in tables:
        cols = [str(c).lower() for c in t.columns]
        if any("agency" in c for c in cols) and any("received" in c for c in cols):
            df = t.copy()
            df.columns = [str(c).strip().lower() for c in df.columns]
            if "received" in df.columns:
                df["received"] = pd.to_datetime(df["received"], errors="coerce")
            cutoff = pd.Timestamp.utcnow().normalize() - pd.Timedelta(days=days)
            df = df[df["received"] >= cutoff]
            df["source"] = "OIRA"
            df["id"] = df["rin"] if "rin" in df.columns else None
            df["title"] = df["title"] if "title" in df.columns else df.get("subject")
            df["agency"] = df.get("agency")
            df["stage"] = df.get("stage")
            df["status"] = df.get("status")
            df["detail_url"] = None
            frames.append(df[["source","id","title","agency","stage","received","status","detail_url"]])
    if not frames:
        return pd.DataFrame(columns=["source","id","title","agency","stage","received","status","detail_url"])
    return pd.concat(frames, ignore_index=True).drop_duplicates()

def pull_unified_agenda_xml()->pd.DataFrame:
    # Optional: gather a small sample of UA XML. 
    index_url = "https://www.reginfo.gov/public/do/eAgendaXmlReport"
    try:
        html = requests.get(index_url, timeout=30).text
        soup = BeautifulSoup(html, "html.parser")
        links = [a.get("href") for a in soup.find_all("a") if a.get("href","").lower().endswith(".xml")]
        links = links[:5]
        rows = []
        for link in links:
            if not link.startswith("http"):
                link = "https://www.reginfo.gov" + link
            try:
                xml = requests.get(link, timeout=30).text
                for m in re.finditer(r"<Title>(.*?)</Title>.*?<RIN>(.*?)</RIN>.*?<Agency>(.*?)</Agency>.*?<Stage>(.*?)</Stage>", xml, re.S):
                    title = BeautifulSoup(m.group(1), "xml").text
                    rin = BeautifulSoup(m.group(2), "xml").text
                    agency = BeautifulSoup(m.group(3), "xml").text
                    stage = BeautifulSoup(m.group(4), "xml").text
                    rows.append({"source":"UA","id":rin,"title":title,"agency":agency,"stage":stage,"date":pd.Timestamp.utcnow().normalize()})
            except Exception as e:
                print("[WARN] UA subfetch failed:", e, file=sys.stderr)
        return pd.DataFrame(rows)
    except Exception as e:
        print("[WARN] UA index fetch failed:", e, file=sys.stderr)
        return pd.DataFrame(columns=["source","id","title","agency","stage","date"])

# ---- White House ----
def pull_whitehouse(days:int=365)->pd.DataFrame:
    pages = [
        "https://www.whitehouse.gov/presidential-actions/executive-orders/",
        "https://www.whitehouse.gov/briefings-statements/",
        "https://www.whitehouse.gov/presidential-actions/"
    ]
    rows = []
    cutoff = (pd.Timestamp.utcnow().normalize() - pd.Timedelta(days=days)).date()
    for url in pages:
        try:
            html = requests.get(url, timeout=30).text
            soup = BeautifulSoup(html, "html.parser")
            for item in soup.find_all(["article","li","div","a"]):
                text = item.get_text(" ", strip=True)
                if not text or len(text) < 20:
                    continue
                m = re.search(r"(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}", text)
                if m:
                    d = pd.to_datetime(m.group(0), errors="coerce")
                    if pd.notna(d) and d.date() >= cutoff:
                        href = item.get("href")
                        rows.append({
                            "source":"WH",
                            "title": text[:200],
                            "date": d.date(),
                            "url": href if href and href.startswith("http") else url
                        })
        except Exception as e:
            print("[WARN] WhiteHouse scrape failed for", url, "->", e, file=sys.stderr)
    return pd.DataFrame(rows)

def label_topic(title:str, lex:Dict[str, List[str]]):
    t = (title or "").lower()
    hits = []
    for topic, kws in lex.items():
        if any(kw in t for kw in kws):
            hits.append(topic)
    return hits

def zscore(series: pd.Series)->pd.Series:
    mu, sd = series.mean(), series.std(ddof=0)
    if sd == 0 or pd.isna(sd): 
        return pd.Series([0]*len(series), index=series.index)
    return (series - mu) / sd

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, default=365)
    ap.add_argument("--out", type=str, default="topic_day.csv")
    ap.add_argument("--dump", action="store_true",
                help="Dump intermediate CSVs (raw pulls, labeled events, pre-score features)")

    args = ap.parse_args()

    lex = load_lexicon("lexicon.yaml")

    # 1) Pull data
    all_keywords = sorted({kw for kws in lex.values() for kw in kws})
    fr_df = pull_federal_register(all_keywords, days=args.days)
    oira_df = pull_oira_under_review(days=args.days)
    ua_df = pull_unified_agenda_xml()
    wh_df = pull_whitehouse(days=args.days)

    if args.dump:
        fr_df.to_csv("raw_fr.csv", index=False)
        oira_df.to_csv("raw_oira.csv", index=False)
        ua_df.to_csv("raw_ua.csv", index=False)
        wh_df.to_csv("raw_wh.csv", index=False)


    # 2) Label topics from titles
    def explode(df, date_col, title_col, source_col):
        rows = []
        if df is None or df.empty:
            return pd.DataFrame(columns=["date","topic","source"])
        for _,r in df.iterrows():
            d = pd.to_datetime(r.get(date_col), errors="coerce")
            if pd.isna(d): 
                continue
            topics = label_topic(str(r.get(title_col,"")), lex)
            for t in topics:
                rows.append({"date": d.normalize(), "topic": t, "source": r.get(source_col)})
        return pd.DataFrame(rows)

    fr_topics = explode(fr_df, "publication_date", "title", "source")
    oira_df = oira_df.rename(columns={"received":"date"}) if not oira_df.empty else oira_df
    oira_topics = explode(oira_df, "date", "title", "source")
    ua_df = ua_df if not ua_df.empty else pd.DataFrame(columns=["date","title","source"])
    if "date" not in ua_df.columns and not ua_df.empty:
        ua_df["date"] = pd.Timestamp.utcnow().normalize()
    ua_topics = explode(ua_df, "date", "title", "source")
    wh_topics = explode(wh_df.rename(columns={"date":"date"}), "date", "title", "source")


    parts = [fr_topics, oira_topics, ua_topics, wh_topics]
    events = pd.concat([p for p in parts if not p.empty], ignore_index=True)

    if args.dump:
        events.to_csv("events_labeled.csv", index=False)


    if events.empty:
        print("[WARN] No events labeled; check endpoints/keywords.")
        pd.DataFrame(columns=["date","topic","score"]).to_csv(args.out, index=False)
        return

    # 3) Build daily index and features
    idx = pd.MultiIndex.from_product(
        [sorted(events["topic"].unique()), 
         pd.date_range((pd.Timestamp.utcnow().normalize() - pd.Timedelta(days=args.days)).date(),
                       pd.Timestamp.utcnow().normalize().date(), freq="D")],
        names=["topic","date"]
    )
    feat = pd.DataFrame(index=idx).reset_index()

    fr_daily = fr_topics.groupby(["topic","date"]).size().rename("fr_notice_count").reset_index()
    feat = feat.merge(fr_daily, on=["topic","date"], how="left").fillna({"fr_notice_count":0})

    feat["comment_rate_14d"] = feat.groupby("topic")["fr_notice_count"].transform(lambda s: s.rolling(14, min_periods=1).sum())

    if not oira_topics.empty:
        feat = feat.merge(oira_topics.groupby(["topic","date"]).size().rename("under_review_count").reset_index(),
                          on=["topic","date"], how="left")
    else:
        feat["under_review_count"] = 0
    feat["under_review_count"] = feat["under_review_count"].fillna(0).clip(0,1)

    feat["econ_significant_flag"] = 0  # placeholder; could be upgraded if parsed

    if not wh_topics.empty:
        wh_daily = wh_topics.groupby(["topic","date"]).size().rename("wh_hits").reset_index()
        feat = feat.merge(wh_daily, on=["topic","date"], how="left")
    else:
        feat["wh_hits"] = 0
    feat["wh_hits"] = feat["wh_hits"].fillna(0)
    feat["eo_hits_45d"] = feat.groupby("topic")["wh_hits"].transform(lambda s: s.rolling(45, min_periods=1).sum())

    src_daily = events.groupby(["topic","date"])["source"].nunique().rename("src_n").reset_index()
    feat = feat.merge(src_daily, on=["topic","date"], how="left").rename(columns={"src_n":"agency_diversity"})
    feat["agency_diversity"] = feat["agency_diversity"].fillna(0).clip(0,4)

    if args.dump:
        pre_cols = ["topic","date","fr_notice_count","comment_rate_14d",
                    "under_review_count","econ_significant_flag",
                    "wh_hits","eo_hits_45d","agency_diversity"]
        feat[pre_cols].to_csv("features_pre_score.csv", index=False)

    # Score
    def z(series): 
        mu, sd = series.mean(), series.std(ddof=0)
        return (series - mu) / sd if (sd not in [0, None] and not pd.isna(sd)) else pd.Series([0]*len(series), index=series.index)

    feat["z_fr_notice"] = feat.groupby("topic")["fr_notice_count"].transform(z)
    feat["z_comment_rate"] = feat.groupby("topic")["comment_rate_14d"].transform(z)

    score = (
        20*feat["z_fr_notice"].fillna(0) +
        25*feat["z_comment_rate"].fillna(0) +
        15*feat["under_review_count"].fillna(0) +
        10*feat["econ_significant_flag"].fillna(0) +
        15*feat["eo_hits_45d"].fillna(0) +
         5*feat["agency_diversity"].fillna(0)
    )
    feat["score"] = score.clip(0,100)

    feat.sort_values(["topic","date"]).to_csv(args.out, index=False)
    print(f"[OK] wrote {args.out} with {len(feat)} rows")

if __name__ == "__main__":
    main()
