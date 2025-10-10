#!/usr/bin/env python3
import matplotlib
matplotlib.use("TkAgg")  # Ensures the plot window shows up

import pandas as pd
import matplotlib.pyplot as plt
from datetime import datetime, timedelta

# Load the full dataset
df = pd.read_csv("filings_before_2025-10-10.csv", parse_dates=["date"])

# Define date range: last 2 years
today = pd.Timestamp(datetime.today().date())
start_date = today - pd.DateOffset(years=2)

# Filter data for the last 2 years only
df = df[(df["date"] >= start_date) & (df["date"] <= today)]

# Check if data exists
if df.empty:
    print(f"No data available between {start_date.date()} and {today.date()}.")
    exit()

# Monthly aggregates
monthly_filings = df.resample("M", on="date").size().rename("filings_count")
monthly_keywords = df.resample("M", on="date")["keyword_count"].sum().rename("keyword_hits")

# Plot
ax = monthly_filings.plot(figsize=(9, 4), label="filings_count")
monthly_keywords.plot(ax=ax, linestyle="--", label="keyword_hits")

# Mark today's date
plt.axvline(today, color="red", linestyle=":", label="Future Data Centers")

# Titles and labels
plt.title(f"Regulatory Activity Related to Future Data Centers ({start_date.year}–{today.year})")
plt.ylabel("Count")
plt.legend()
plt.tight_layout()

# Save the plot
output_filename = f"future_data_centers_{start_date.year}_{today.year}.png"
plt.savefig(output_filename, dpi=300)
print(f"Plot saved as {output_filename}")

# Show the plot
plt.show()
