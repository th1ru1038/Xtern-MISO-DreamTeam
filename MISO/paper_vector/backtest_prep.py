#!/usr/bin/env python3
import pandas as pd
import sys

# usage: python3 backtest_prep.py 2023-07-27
if len(sys.argv) < 2:
    print("Usage: python3 backtest_prep.py <YYYY-MM-DD>")
    sys.exit(1)

cutoff = pd.to_datetime(sys.argv[1])
df = pd.read_csv("filings_hist.csv", parse_dates=["date"])
df_past = df[df["date"] < cutoff]

out_path = f"filings_before_{cutoff.date()}.csv"
df_past.to_csv(out_path, index=False)
print(f"[OK] wrote {out_path} with {len(df_past)} rows (before {cutoff.date()})")
