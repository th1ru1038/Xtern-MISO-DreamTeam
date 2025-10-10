# Data-Center Policy Momentum (Live-API MVP)

Predict early shifts in **U.S. policy attention** to data centers using **primary federal sources**:
- Federal Register API (documents)
- OIRA / Reginfo (Unified Agenda & EO 12866 reviews)
- WhiteHouse.gov (Executive Orders & Fact Sheets)

## What this repo contains
- `lexicon.yaml` — topic keywords
- `score.py` — pulls data from live sources, builds features & momentum score (0–100), outputs `topic_day.csv`
- `streamlit_app.py` — minimal dashboard to visualize momentum and drill down to sources

## Quickstart
```bash
python3 score.py --days 365 --out topic_day.csv
streamlit run streamlit_app.py
```
> Tip: first run will be slower; subsequent runs cache raw pulls in `./cache/`.

## Sources
- Federal Register API (no key required). Docs available on federalregister.gov developer REST API.
- Reginfo / OIRA Unified Agenda (XML/HTML endpoints).
- White House Executive Orders & Fact Sheets listing pages.

## Notes
- Prototype for the MISO Social Listening challenge. If a structured endpoint is missing, we do a lightweight HTML table parse as fallback.
- Change topics/keywords in `lexicon.yaml`.
