# project_canary/analysis/momentum/momentum_dashboard.py
import pandas as pd
import streamlit as st
import altair as alt
from pathlib import Path

# --- CONFIG ---
st.set_page_config(
    page_title="Project Canary — Policy Momentum Dashboard",
    page_icon="🐤",
    layout="wide"
)

# --- LOAD DATA ---
BASE_DIR = Path(__file__).resolve().parents[1] / "data" / "momentum"
csv_path = BASE_DIR / "momentum_scores.csv"

if not csv_path.exists():
    st.error("No momentum_scores.csv found. Run momentum_model.py first.")
    st.stop()

df = pd.read_csv(csv_path)
df = df.sort_values("momentum_score", ascending=False)

st.title("🐤 Project Canary — Policy Momentum Dashboard")
st.caption("Visualizing early policy signals across People, Money, and Paper vectors.")

# --- TOP 10 TABLE ---
st.subheader("Top 10 Momentum Keywords")
top10 = df.nlargest(10, "momentum_score")
st.dataframe(top10.style.format({
    "people_count": "{:,.0f}",
    "momentum_score": "{:.3f}"
}))

# --- BAR CHART ---
st.subheader("Momentum Signal Strength")
bar = (
    alt.Chart(top10)
    .mark_bar(cornerRadiusTopLeft=4, cornerRadiusTopRight=4)
    .encode(
        x=alt.X("momentum_score:Q", title="Momentum Score", scale=alt.Scale(domain=[0, 1])),
        y=alt.Y("keyword:N", sort='-x', title="Keyword"),
        color=alt.Color("momentum_score:Q", scale=alt.Scale(scheme='blues')),
        tooltip=["keyword", "people_count", "momentum_score"]
    )
    .properties(height=400)
)
st.altair_chart(bar, use_container_width=True)

# --- INDIVIDUAL VECTORS ---
st.subheader("Underlying Vector Counts")
cols = st.columns(3)
cols[0].metric("People Vector Signals", f"{df['people_count'].sum():,.0f}")
cols[1].metric("Money Vector Signals", f"{df['money_count'].sum():,.0f}")
cols[2].metric("Paper Vector Signals", f"{df['paper_count'].sum():,.0f}")

# --- FILTERS (future-ready) ---
with st.expander("🔧 Filter / Explore"):
    keyword_filter = st.multiselect("Filter by Keyword", df["keyword"].tolist(), [])
    if keyword_filter:
        filtered = df[df["keyword"].isin(keyword_filter)]
        st.dataframe(filtered)
    else:
        st.write("Select keywords above to explore their breakdown across vectors.")

st.markdown("---")
st.caption("Built for the MISO Challenge — Project Canary | Data by People, Money, and Paper vectors.")
