# project_canary/analysis/momentum/momentum_model.py
from pathlib import Path
import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler

BASE_DIR = Path(__file__).resolve().parents[1] / "data"
PEOPLE_CSV = BASE_DIR / "people" / "people_vector_clean.csv"
MONEY_CSV  = BASE_DIR / "money"  / "money_vector_clean.csv"
PAPER_CSV  = BASE_DIR / "paper"  / "paper_vector_clean.csv"

# --- 1. Load People Vector ---
people_df = pd.read_csv(PEOPLE_CSV)
# explode comma-separated keywords
people_df["keywords_detected"] = (
    people_df["keywords_detected"].astype(str)
    .str.lower()
    .str.replace(r"\s+", "", regex=True)
)
people_keywords = (
    people_df["keywords_detected"]
    .str.split(",")
    .explode()
    .dropna()
    .reset_index(drop=True)
)

people_signal = (
    people_keywords.value_counts()
    .rename_axis("keyword")
    .reset_index(name="people_count")
)

# --- 2. Load optional Money/Paper vectors (safe if empty) ---
def load_optional_csv(path: Path, colname: str):
    if not path.exists() or path.stat().st_size == 0:
        return pd.DataFrame(columns=["keyword", colname])
    df = pd.read_csv(path)
    # expect a column with keyword names
    if "category" in df.columns:
        s = df["category"]
    elif "topic" in df.columns:
        s = df["topic"]
    elif "keyword" in df.columns:
        s = df["keyword"]
    else:
        s = pd.Series(dtype=str)
    s = s.astype(str).str.lower().str.replace(r"\s+", "", regex=True)
    return s.value_counts().rename_axis("keyword").reset_index(name=colname)

money_signal = load_optional_csv(MONEY_CSV, "money_count")
paper_signal = load_optional_csv(PAPER_CSV, "paper_count")

# --- 3. Merge all signals ---
merged = people_signal.merge(money_signal, on="keyword", how="outer")
merged = merged.merge(paper_signal, on="keyword", how="outer").fillna(0)

# --- 4. Normalize and score ---
scaler = MinMaxScaler()
merged[["people_norm", "money_norm", "paper_norm"]] = scaler.fit_transform(
    merged[["people_count", "money_count", "paper_count"]]
)

merged["momentum_score"] = (
    0.4 * merged["people_norm"] +
    0.3 * merged["money_norm"] +
    0.3 * merged["paper_norm"]
)

# --- 5. Save outputs ---
OUTPUT_DIR = BASE_DIR / "momentum"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
merged.to_csv(OUTPUT_DIR / "momentum_scores.csv", index=False)
merged.to_json(OUTPUT_DIR / "momentum_scores.json", orient="records")

print("✅ Policy Momentum scores saved to data/momentum/")
