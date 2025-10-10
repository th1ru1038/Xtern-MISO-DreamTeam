# Script to copy and process real vector data for client consumption
# This script converts the CSV data from the MISO analysis into JSON format for the client

import json
import csv
import os
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path

# Define paths
PROJECT_ROOT = Path(__file__).parent
MISO_DATA = PROJECT_ROOT / "MISO"
CANARY_DATA = PROJECT_ROOT / "project_canary" / "analysis" / "data"
CLIENT_DATA = PROJECT_ROOT / "client" / "public" / "data"

# Create client data directory if it doesn't exist
CLIENT_DATA.mkdir(parents=True, exist_ok=True)

def process_people_vector():
    """Process people vector CSV data"""
    people_file = CANARY_DATA / "people" / "people_vector_clean.csv"
    if not people_file.exists():
        print(f"Warning: {people_file} not found")
        return []
    
    people_data = []
    with open(people_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            people_data.append({
                'posted_at': row['posted_at'],
                'job_title': row['job_title'], 
                'company': row['company'],
                'location': row['location'],
                'keywords_detected': row['keywords_detected'],
                'source': row['source'],
                'url': row['url']
            })
    
    return people_data[:50]  # Limit for performance

def process_money_vector():
    """Process money vector summary data"""
    money_summary = MISO_DATA / "money_vector" / "final_output" / "MONEY_VECTOR_SUMMARY.csv"
    recipients_file = MISO_DATA / "money_vector" / "final_output" / "TOP_RECIPIENTS.csv"
    
    money_data = {
        'summary': [],
        'recipients': []
    }
    
    if money_summary.exists():
        with open(money_summary, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                money_data['summary'].append({
                    'component': row['Component'],
                    'value': row['Value'],
                    'signal': row['Signal']
                })
    
    if recipients_file.exists():
        with open(recipients_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                money_data['recipients'].append({
                    'name': row['recipient_name'],
                    'amount': float(row['total_obligated_amount'])
                })
    
    return money_data


def _parse_float(value, default=0.0):
    try:
        if value is None or value == "":
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def process_paper_vector():
    """Process paper vector momentum scores"""
    paper_file = MISO_DATA / "paper_vector" / "topic_day.csv"
    if not paper_file.exists():
        print(f"Warning: {paper_file} not found")
        return {"topics": [], "trend": []}

    topic_entries: dict[str, list[tuple[datetime, dict]]] = defaultdict(list)
    daily_scores: dict[datetime, list[float]] = defaultdict(list)

    with open(paper_file, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                dt = datetime.strptime(row["date"], "%Y-%m-%d")
            except (KeyError, ValueError):
                continue

            score = _parse_float(row.get("score"), 0.0)
            topic = row.get("topic", "").strip() or "unknown"
            topic_entries[topic].append((dt, row))
            daily_scores[dt].append(score)

    if not topic_entries:
        return {"topics": [], "trend": []}

    top_topics = []
    window = timedelta(days=30)

    for topic, entries in topic_entries.items():
        entries.sort(key=lambda item: item[0])
        latest_dt, latest_row = entries[-1]
        latest_score = _parse_float(latest_row.get("score"), 0.0)

        baseline_score = latest_score
        target_dt = latest_dt - window
        for past_dt, past_row in reversed(entries):
            if past_dt <= target_dt:
                baseline_score = _parse_float(past_row.get("score"), 0.0)
                break

        change_30d = latest_score - baseline_score

        top_topics.append({
            "title": topic.replace("_", " ").title(),
            "topic": topic,
            "score": round(latest_score, 2),
            "date": latest_dt.strftime("%Y-%m-%d"),
            "change_30d": round(change_30d, 2),
            "fr_notices": _parse_float(latest_row.get("fr_notice_count"), 0.0),
            "comment_rate_14d": _parse_float(latest_row.get("comment_rate_14d"), 0.0),
            "under_review": int(_parse_float(latest_row.get("under_review_count"), 0)),
            "econ_significant": bool(int(_parse_float(latest_row.get("econ_significant_flag"), 0))),
            "white_house_hits": _parse_float(latest_row.get("wh_hits"), 0.0),
            "executive_order_hits": _parse_float(latest_row.get("eo_hits_45d"), 0.0),
        })

    top_topics.sort(key=lambda item: item["score"], reverse=True)
    top_topics = top_topics[:5]

    max_dt = max(daily_scores.keys())
    min_dt = max_dt - timedelta(days=90)
    trend = []
    for dt in sorted(daily_scores.keys()):
        if dt < min_dt:
            continue
        scores = daily_scores[dt]
        if not scores:
            continue
        avg_score = sum(scores) / len(scores)
        trend.append({
            "date": dt.strftime("%Y-%m-%d"),
            "score": round(avg_score, 2),
        })

    return {"topics": top_topics, "trend": trend}

def process_momentum_scores():
    """Process momentum scores data"""
    momentum_file = CANARY_DATA / "momentum" / "momentum_scores.csv"
    if not momentum_file.exists():
        print(f"Warning: {momentum_file} not found")
        return []
    
    momentum_data = []
    with open(momentum_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            momentum_data.append({
                'keyword': row['keyword'],
                'people_count': int(float(row['people_count'])),
                'momentum_score': float(row['momentum_score'])
            })
    
    return momentum_data

def process_keywords():
    """Process energy keywords list"""
    keywords_file = MISO_DATA / "people_vector" / "keywords.txt"
    if not keywords_file.exists():
        print(f"Warning: {keywords_file} not found")
        return []
    
    with open(keywords_file, 'r', encoding='utf-8') as f:
        keywords = [line.strip() for line in f if line.strip()]
    
    return keywords

def main():
    """Main processing function"""
    print("Processing MISO vector data for client...")
    
    # Process all data sources
    people_data = process_people_vector()
    money_data = process_money_vector()
    momentum_data = process_momentum_scores()
    paper_data = process_paper_vector()
    keywords = process_keywords()
    
    # Create combined data structure
    combined_data = {
        'people_vector': people_data,
        'money_vector': money_data,
        'paper_vector': paper_data,
        'momentum_scores': momentum_data,
        'energy_keywords': keywords,
        'metadata': {
            'generated_at': '2025-10-09T00:00:00Z',
            'data_sources': [
                'MISO/money_vector/final_output/',
                'MISO/paper_vector/topic_day.csv',
                'project_canary/analysis/data/',
                'MISO/people_vector/'
            ]
        }
    }
    
    # Write to JSON files
    output_file = CLIENT_DATA / "vector_data.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(combined_data, f, indent=2, ensure_ascii=False)
    
    print(f"✓ Data processed and saved to {output_file}")
    print(f"  - People vector entries: {len(people_data)}")
    print(f"  - Money vector components: {len(money_data.get('summary', []))}")
    print(f"  - Top recipients: {len(money_data.get('recipients', []))}")
    print(f"  - Paper vector topics: {len(paper_data.get('topics', []))}")
    print(f"  - Paper vector trend points: {len(paper_data.get('trend', []))}")
    print(f"  - Momentum keywords: {len(momentum_data)}")
    print(f"  - Energy keywords: {len(keywords)}")

if __name__ == "__main__":
    main()