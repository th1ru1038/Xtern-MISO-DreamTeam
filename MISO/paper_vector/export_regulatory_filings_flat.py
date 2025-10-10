#!/usr/bin/env python3
import os, sys, time, argparse, re, string
from typing import List, Dict
import pandas as pd
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlencode, quote_plus
from io import StringIO

CACHE_DIR = "./cache"
os.makedirs(CACHE_DIR, exist_ok=True)

def load_lexicon(path: str = "lexicon.yaml") -> Dict[str, List[str]]:
    import yaml
    with open(path, "r") as f:
        raw = yaml.safe_load(f)
    return {k: [s.lower() for s in v.get("include", [])] for k, v in raw.items()}

def all_keywords(lex: Dict[str, List[str]]) -> List[str]:
    return sorted({kw for kws in lex.values() for kw in kws})

# put this REPLACEMENT in place of your current keyword_count_in_title()
def keyword_count_in_title(title: str, keywords: List[str]) -> int:
    """
    Count UNIQUE keyword hits in the title using boundary-aware regex:
    - treats 'data center' ~ 'data-center'
    - handles simple plurals ('procedure' ~ 'procedures', 'agreement' ~ 'agreements')
    - punctuation/extra spaces in title are ignored
    """
    if not title:
        return 0

    text = title.lower()
    # normalize punctuation to spaces for safer word-boundary matches
    text = re.sub(r"[^\w\s\-]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()

    hits = set()
    for kw in keywords:
        if not kw:
            continue
        k = kw.lower().strip()
        # allow space OR hyphen between words: "data[ -]?center"
        k = re.sub(r"\s+", r"[\\s\\-]?", k)
        # simple plural support: (s|es)? on last token
        # e.g. "procedure(s|es)?", "agreement(s|es)?"
        if " " in kw or "-" in kw:
            # multiword: let the final token pluralize
            parts = re.split(r"[ \-]+", kw.strip().lower())
            if parts:
                last = re.escape(parts[-1])
                tail_plural = rf"(?:s|es)?"
                k = re.sub(rf"{re.escape(parts[-1])}$", last + tail_plural, re.escape(" ".join(parts)))
                k = re.sub(r"\s+", r"[\\s\\-]?", k)
        else:
            # single word plural
            k = re.escape(kw.lower().strip()) + r"(?:s|es)?"

        pattern = rf"\b{k}\b"
        if re.search(pattern, text, flags=re.IGNORECASE):
            hits.add(kw)

    return len(hits)


def fmt_us_date(d: pd.Timestamp) -> str:
    return f"{d.month}/{d.day}/{d.year}"

# ---------------- helpers: robust agency matching ----------------
_PUNCT_TABLE = str.maketrans({c: " " for c in string.punctuation})

def _norm(s: str) -> str:
    s = (s or "").lower().translate(_PUNCT_TABLE)
    s = re.sub(r"\s+", " ", s).strip()
    return s

def compile_agency_matcher(pattern: str):
    """
    pattern: pipe-separated terms, e.g.
      "Department of Energy|Energy Department|DOE|ARPA-E|Loan Programs Office|Office of Electricity|Fossil Energy and Carbon Management|EERE"
    Normalizes both sides and does substring match.
    """
    terms = [_norm(t) for t in (pattern.split("|") if pattern else []) if t.strip()]
    if not terms:
        return lambda s: True
    def _match(s: str) -> bool:
        ns = _norm(s)
        return any(t in ns for t in terms)
    return _match

# ---------------- sources ----------------
def pull_federal_register(keywords: List[str], days: int = 365) -> pd.DataFrame:
    base = "https://www.federalregister.gov/api/v1/documents.json"
    start_date = (pd.Timestamp.utcnow().normalize() - pd.Timedelta(days=days)).date().isoformat()
    params = {"per_page": 250, "order": "newest", "conditions[publication_date][gte]": start_date}
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
                doc_id = d.get("document_number")
                if doc_id in seen_ids: 
                    continue
                seen_ids.add(doc_id)
                rows.append({
                    "source": "FR",
                    "id": doc_id,
                    "title": d.get("title"),
                    # Join all agency names; FR often returns "Energy Department; Office of ...".
                    "agencies": ", ".join([a.get("name","") for a in d.get("agencies", [])]) if d.get("agencies") else "",
                    "publication_date": d.get("publication_date"),
                    "type": d.get("type"),
                    "html_url": d.get("html_url"),
                })
            time.sleep(0.25)
        except Exception as e:
            print("[WARN] FR fetch failed for", kw, "->", e, file=sys.stderr)
            continue
    return pd.DataFrame(rows)

def pull_oira_under_review(days: int = 365) -> pd.DataFrame:
    url = "https://www.reginfo.gov/public/do/eoReviewSearch"
    try:
        html = requests.get(url, timeout=30).text
        tables = pd.read_html(StringIO(html))
    except Exception as e:
        print("[WARN] Could not parse OIRA page:", e, file=sys.stderr)
        return pd.DataFrame()
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
            out = pd.DataFrame({
                "source": "OIRA",
                "title": df.get("title", df.get("subject")),
                "agency": df.get("agency"),
                "date": df["received"]
            })
            frames.append(out)
    return pd.concat(frames, ignore_index=True) if frames else pd.DataFrame()

def pull_unified_agenda_xml() -> pd.DataFrame:
    index_url = "https://www.reginfo.gov/public/do/eAgendaXmlReport"
    try:
        html = requests.get(index_url, timeout=30).text
        soup = BeautifulSoup(html, "html.parser")
        links = [a.get("href") for a in soup.find_all("a") if a.get("href","").lower().endswith(".xml")]
        links = links[:5]
        rows = []
        for link in links:
            link = link if link.startswith("http") else ("https://www.reginfo.gov" + link)
            try:
                xml = requests.get(link, timeout=30).text
                for m in re.finditer(r"<Title>(.*?)</Title>.*?<Agency>(.*?)</Agency>", xml, re.S):
                    title = BeautifulSoup(m.group(1), "xml").text
                    agency = BeautifulSoup(m.group(2), "xml").text
                    rows.append({
                        "source": "UA",
                        "title": title,
                        "agency": agency,
                        "date": pd.Timestamp.utcnow().normalize()
                    })
            except Exception as e:
                print("[WARN] UA subfetch failed:", e, file=sys.stderr)
        return pd.DataFrame(rows)
    except Exception as e:
        print("[WARN] UA index fetch failed:", e, file=sys.stderr)
        return pd.DataFrame()

def pull_whitehouse(days: int = 365) -> pd.DataFrame:
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
                if not m: 
                    continue
                d = pd.to_datetime(m.group(0), errors="coerce")
                if pd.notna(d) and d.date() >= cutoff:
                    rows.append({
                        "source": "WH",
                        "title": text[:200],
                        "agency": "White House",
                        "date": d.normalize()
                    })
        except Exception as e:
            print("[WARN] WhiteHouse scrape failed for", url, "->", e, file=sys.stderr)
    return pd.DataFrame(rows)

# ---------------- flat CSV assembler (with debug) ----------------
def build_flat_csv(days: int, out_path: str, lex_path: str, agency_pattern: str, debug: bool) -> None:
    lex = load_lexicon(lex_path)
    kws = all_keywords(lex)
    agency_ok = compile_agency_matcher(agency_pattern)

    fr_df = pull_federal_register(kws, days=days)
    oira_df = pull_oira_under_review(days=days)
    ua_df = pull_unified_agenda_xml()
    wh_df = pull_whitehouse(days=days)

    rows = []
    unmatched = []

    # FR
    if not fr_df.empty:
        for _, r in fr_df.iterrows():
            d = pd.to_datetime(r.get("publication_date"), errors="coerce")
            if pd.isna(d): 
                continue
            agencies_full = r.get("agencies") or ""
            # primary agency is helpful but we check the whole string too
            primary_agency = (agencies_full.split(",")[0].strip() if agencies_full else "")
            if not agency_ok(primary_agency) and not agency_ok(agencies_full):
                if debug: unmatched.append(agencies_full)
                continue
            title = r.get("title", "")
            rows.append({
                "date": fmt_us_date(d.to_pydatetime()),
                "agency": primary_agency or agencies_full or "Federal Register",
                "filing_title": title,
                "keyword_count": keyword_count_in_title(title, kws)
            })

    # OIRA
    if oira_df is not None and not oira_df.empty:
        for _, r in oira_df.iterrows():
            ag = r.get("agency") or ""
            if not agency_ok(ag):
                if debug: unmatched.append(ag)
                continue
            d = pd.to_datetime(r.get("date"), errors="coerce")
            if pd.isna(d): 
                continue
            title = r.get("title", "")
            rows.append({
                "date": fmt_us_date(d.to_pydatetime()),
                "agency": ag or "OIRA",
                "filing_title": title,
                "keyword_count": keyword_count_in_title(title, kws)
            })

    # UA
    if ua_df is not None and not ua_df.empty:
        for _, r in ua_df.iterrows():
            ag = r.get("agency") or ""
            if not agency_ok(ag):
                if debug: unmatched.append(ag)
                continue
            d = pd.to_datetime(r.get("date"), errors="coerce")
            if pd.isna(d): 
                continue
            title = r.get("title", "")
            rows.append({
                "date": fmt_us_date(d.to_pydatetime()),
                "agency": ag or "Unified Agenda",
                "filing_title": title,
                "keyword_count": keyword_count_in_title(title, kws)
            })

    # WH
    if wh_df is not None and not wh_df.empty:
        for _, r in wh_df.iterrows():
            ag = r.get("agency") or ""
            if not agency_ok(ag):
                if debug: unmatched.append(ag)
                continue
            d = pd.to_datetime(r.get("date"), errors="coerce")
            if pd.isna(d): 
                continue
            title = r.get("title", "")
            rows.append({
                "date": fmt_us_date(d.to_pydatetime()),
                "agency": ag or "White House",
                "filing_title": title,
                "keyword_count": keyword_count_in_title(title, kws)
            })

    flat = pd.DataFrame(rows, columns=["date","agency","filing_title","keyword_count"])
    flat = flat.dropna(subset=["date","filing_title"]).drop_duplicates()
    try:
        flat["_d"] = pd.to_datetime(flat["date"])
        flat = flat.sort_values(["_d","agency"]).drop(columns=["_d"])
    except Exception:
        pass
    flat.to_csv(out_path, index=False)
    print(f"[OK] wrote {out_path} with {len(flat)} rows")

    if debug and (flat.empty or len(unmatched) > 0):
        sample = sorted({u for u in unmatched if u})[:15]
        if sample:
            print("[DEBUG] Example unmatched agency strings (first 15):")
            for s in sample:
                print("  -", s)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, default=365)
    ap.add_argument("--out", type=str, default="filings_flat.csv")
    ap.add_argument("--lexicon", type=str, default="lexicon.yaml")
    ap.add_argument("--agency", type=str,
        default="Department of Energy|Energy Department|DOE|ARPA-E|Loan Programs Office|Office of Electricity|Fossil Energy and Carbon Management|EERE",
        help="Pipe-separated terms for case-insensitive matching")
    ap.add_argument("--debug", action="store_true", help="Print sample of unmatched agency strings")
    args = ap.parse_args()
    build_flat_csv(days=args.days, out_path=args.out, lex_path=args.lexicon, agency_pattern=args.agency, debug=args.debug)

if __name__ == "__main__":
    main()
