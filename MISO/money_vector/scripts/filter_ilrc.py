import pandas as pd
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(SCRIPT_DIR, "..", "data_raw")
CLEAN = os.path.join(SCRIPT_DIR, "..", "data_clean")
os.makedirs(CLEAN, exist_ok=True)

# Keywords for energy/utility/data center/tech
KEYWORDS = [
    'energy', 'power', 'electric', 'utility', 'gas', 'coal', 'oil',
    'data center', 'datacenter', 'microsoft', 'amazon', 'google', 'meta',
    'duke', 'aep', 'nipsco', 'vectren', 'citizens', 'indianapolis power',
    'renewable', 'solar', 'wind', 'nuclear', 'generation',
    'tech', 'computing', 'server', 'cloud'
]

def detect_name_column(df):
    for col in df.columns:
        cl = col.lower()
        if 'lobbyist' in cl or 'employer' in cl or 'name' in cl or 'company' in cl:
            return col
    return None

def filter_energy(df, year):
    print(f"\n{year} columns: {list(df.columns)}")
    name_col = detect_name_column(df)
    if not name_col:
        print(f"⚠️ No name column detected in {year}")
        return pd.DataFrame()
    print(f"Using column for filtering: '{name_col}'")
    pattern = '|'.join(KEYWORDS)
    mask = df[name_col].astype(str).str.lower().str.contains(pattern, na=False, regex=True)
    out = df[mask].copy()
    print(f"{year} total rows: {len(df)}  |  energy-related: {len(out)}")
    return out

def process(year):
    xfname = f"{RAW}/{year}-Employer-Lobbyist-Total.xlsx"
    df = pd.read_excel(xfname)
    filtered = filter_energy(df, year)
    if not filtered.empty:
        outp = f"{CLEAN}/indiana_energy_lobbying_{year}.csv"
        filtered.to_csv(outp, index=False)
        print(f"✓ Saved: {outp}")
    return filtered

if __name__ == "__main__":
    # 2024 (for growth context)
    try:
        e24 = process(2024)
    except Exception as e:
        print(f"❌ 2024 error: {e}")
        e24 = pd.DataFrame()

    # 2025 (primary)
    try:
        e25 = process(2025)
    except Exception as e:
        print(f"❌ 2025 error: {e}")
        e25 = pd.DataFrame()

    # Year-over-year signal
    if not e24.empty and not e25.empty:
        c24, c25 = len(e24), len(e25)
        delta = c25 - c24
        pct = (delta / c24 * 100) if c24 > 0 else 0
        print(f"\nYoY comparison: 2024={c24} → 2025={c25}  |  Δ={delta:+d} ({pct:+.1f}%)")
        if delta > 0:
            print("🔥 Momentum detected: more energy‑related employers in 2025")
        elif delta < 0:
            print("⚠️ Fewer energy‑related employers in 2025")
        else:
            print("→ Stable year‑over‑year")
    else:
        print("\nNote: One or both years missing; saved what was available.")