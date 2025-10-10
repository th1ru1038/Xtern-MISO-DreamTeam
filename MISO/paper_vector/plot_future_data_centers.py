#!/usr/bin/env python3
import pandas as pd
import matplotlib.pyplot as plt

# Load the trimmed file created by backtest_prep.py
df = pd.read_csv("filings_hist.csv", parse_dates=["date"])

# Monthly aggregates
monthly_filings = df.resample("M", on="date").size().rename("filings_count")
monthly_keywords = df.resample("M", on="date")["keyword_count"].sum().rename("keyword_hits")

# Plot
ax = monthly_filings.plot(figsize=(9,4), label="filings_count")
monthly_keywords.plot(ax=ax, linestyle="--", label="keyword_hits")
plt.axvline(pd.Timestamp("2023-07-27"), color="red", linestyle=":", label="FERC Order 2023")
plt.title("Regulatory Activity Before FERC Order 2023")
plt.ylabel("Count")
plt.legend()
plt.tight_layout()
plt.show()
