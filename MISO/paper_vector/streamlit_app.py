import pandas as pd
import streamlit as st
import altair as alt

st.set_page_config(page_title="Data-Center Policy Momentum", layout="wide")

st.title("Data-Center Policy Momentum (Federal Signals)")

uploaded = st.file_uploader("Upload topic_day.csv (or run score.py to generate)", type=["csv"])
if uploaded:
    df = pd.read_csv(uploaded, parse_dates=["date"])
else:
    try:
        df = pd.read_csv("topic_day.csv", parse_dates=["date"])
    except:
        st.info("Run `python3 score.py` first, then refresh.")
        st.stop()

topics = sorted(df["topic"].unique().tolist())
pick = st.multiselect("Topics", topics, default=topics)

df = df[df["topic"].isin(pick)]

st.subheader("Momentum Heatmap (score 0–100)")
heat = df[["topic","date","score"]]
chart = alt.Chart(heat).mark_rect().encode(
    x=alt.X("date:T", axis=alt.Axis(format="%Y-%m-%d", labelAngle=-45)),
    y=alt.Y("topic:N", sort=topics),
    color=alt.Color("score:Q", scale=alt.Scale(domain=[0,100])),
    tooltip=["topic","date","score"]
).properties(height=300)
st.altair_chart(chart, use_container_width=True)

st.subheader("Trend (rolling)")
topic_sel = st.selectbox("Drill-down topic", topics, index=0 if topics else None)
line = alt.Chart(df[df["topic"]==topic_sel]).mark_line().encode(
    x="date:T",
    y="score:Q",
    tooltip=["date","score"]
).properties(height=250)
st.altair_chart(line, use_container_width=True)

st.subheader("Watchlist (Top 3 today)")
today = df["date"].max()
today_scores = (df[df["date"]==today]
                .sort_values("score", ascending=False)
                .head(3))[["topic","score"]]
st.dataframe(today_scores.reset_index(drop=True))

st.caption("Sources: Federal Register API; Reginfo/OIRA pages; WhiteHouse.gov listings.")
