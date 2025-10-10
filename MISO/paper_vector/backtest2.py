#!/usr/bin/env python3
import pandas as pd
from datetime import datetime, timedelta

# Load the full historical filings
df = pd.read_csv("filings_hist.csv", parse_dates=["date"])

# Calculate 2-year cutoff from today
today = pd.Timestamp.today().normalize()
cutoff = today - pd.DateOffset(years=2)

# Filter only the last 2 years of data
df_recent = df[df["date"] >= cutoff]

# Save output
out_path = f"filings_last_2_years_until_{today.date()}.csv"
df_recent.to_csv(out_path, index=False)

print(f"[OK] wrote {out_path} with {len(df_recent)} rows (from {cutoff.date()} to {today.date()})")
