import pandas as pd
import matplotlib.pyplot as plt
from collections import Counter

df = pd.read_csv("data_clean/people_vector_clean.csv", parse_dates=["posted_at"])

# Daily counts
daily = df.assign(date=df["posted_at"].dt.date).groupby("date").size().reset_index(name="count")
plt.figure()
plt.plot(daily["date"], daily["count"])
plt.title("Energy/Regulatory Job Postings per Day")
plt.xlabel("Date"); plt.ylabel("Postings")
plt.xticks(rotation=45)
plt.tight_layout()
plt.savefig("data_clean/daily_counts.png", dpi=160)

# Top keywords
def explode_keywords(s):
    if pd.isna(s): return []
    return [k.strip() for k in str(s).split(",") if k.strip()]

kw = Counter(k for ks in df["keywords_detected"].map(explode_keywords) for k in ks)
top = pd.DataFrame(kw.most_common(15), columns=["keyword","count"])

plt.figure()
plt.bar(top["keyword"], top["count"])
plt.title("Top Detected Keywords")
plt.xlabel("Keyword"); plt.ylabel("Count")
plt.xticks(rotation=45, ha="right")
plt.tight_layout()
plt.savefig("data_clean/top_keywords.png", dpi=160)

print("Wrote plots to data_clean/daily_counts.png and data_clean/top_keywords.png")
