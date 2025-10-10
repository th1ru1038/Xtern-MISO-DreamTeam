import pandas as pd
import os

print("="*70)
print("MONEY VECTOR - COMPLETE ANALYSIS")
print("="*70)

# ===================================================================
# STEP 1: FEDERAL LOBBYING
# ===================================================================
print("\n[1/3] Federal Lobbying (OpenSecrets)")
federal_lobbying_amount = 122_373_945  # 2025 Q1
print(f"   ✓ Energy & Natural Resources: ${federal_lobbying_amount:,}")

# ===================================================================
# STEP 2: STATE LOBBYING
# ===================================================================
print("\n[2/3] State Lobbying (Indiana ILRC)")

# Files are in data_clean/ folder
ilrc_2024 = pd.read_csv("data_clean/indiana_energy_lobbying_2024.csv")
ilrc_2025 = pd.read_csv("data_clean/indiana_energy_lobbying_2025.csv")

count_2024 = len(ilrc_2024)
count_2025 = len(ilrc_2025)
growth = count_2025 - count_2024
growth_pct = (growth / count_2024 * 100)

print(f"   ✓ 2024: {count_2024} employers")
print(f"   ✓ 2025: {count_2025} employers")
print(f"   ✓ Growth: +{growth} (+{growth_pct:.1f}%)")

# ===================================================================
# STEP 3: FEDERAL AWARDS
# ===================================================================
print("\n[3/3] Federal Awards (USAspending)")

# Files are in scripts/ folder
contracts = pd.read_csv("scripts/Contracts_PrimeAwardSummaries_2025-10-09_H15M27S56_1.csv")
assistance = pd.read_csv("scripts/Assistance_PrimeAwardSummaries_2025-10-09_H15M27S59_1.csv")

contracts_total = pd.to_numeric(contracts['total_obligated_amount'], errors='coerce').sum()
assistance_total = pd.to_numeric(assistance['total_obligated_amount'], errors='coerce').sum()
awards_total = contracts_total + assistance_total

print(f"   ✓ Contracts: ${contracts_total:,.0f} ({len(contracts)} awards)")
print(f"   ✓ Assistance: ${assistance_total:,.0f} ({len(assistance)} awards)")
print(f"   ✓ TOTAL: ${awards_total:,.0f}")

top5 = assistance.groupby('recipient_name')['total_obligated_amount'].apply(
    lambda x: pd.to_numeric(x, errors='coerce').sum()
).sort_values(ascending=False).head(5)

print("\n   Top 5 Recipients:")
for i, (name, amount) in enumerate(top5.items(), 1):
    print(f"   {i}. {name}: ${amount:,.0f}")

# ===================================================================
# MONEY MOMENTUM SCORE
# ===================================================================
print("\n" + "="*70)
print("MONEY MOMENTUM SCORE")
print("="*70)

score = {
    'federal_lobbying': 'HIGH' if federal_lobbying_amount > 100_000_000 else 'MEDIUM',
    'state_growth': 'HIGH' if growth_pct > 10 else 'MEDIUM' if growth_pct > 0 else 'LOW',
    'federal_awards': 'HIGH' if awards_total > 1_000_000_000 else 'MEDIUM'
}

print(f"\n  Federal Lobbying: {score['federal_lobbying']}")
print(f"  State Growth: {score['state_growth']}")
print(f"  Federal Awards: {score['federal_awards']}")

overall = "HIGH" if list(score.values()).count("HIGH") >= 2 else "MEDIUM"
print(f"\n  🎯 OVERALL MOMENTUM: {overall} 🔥")

# ===================================================================
# CREATE DELIVERABLES - DETAILED FORMAT
# ===================================================================
print("\n" + "=" * 70)
print("CREATING FILES")
print("=" * 70)

os.makedirs("final_output", exist_ok=True)

# Build detailed row-by-row dataset
money_vector_data = []

# Add state lobbying entries (from ILRC)
for idx, row in ilrc_2025.iterrows():
    employer_name = row.get('Lobbyist', 'Unknown')
    # Try to extract any dollar amounts from the row
    total_col = [c for c in ilrc_2025.columns if 'Total' in c and 'Exp' in c]
    amount = row[total_col[0]] if total_col else 0

    money_vector_data.append({
        'date': '2025',
        'organization': employer_name,
        'spend_amount': amount if pd.notna(amount) else 0,
        'topic': 'state lobbying (energy)'
    })

# Add federal awards entries (from USAspending)
for idx, row in assistance.iterrows():
    recipient = row.get('recipient_name', 'Unknown')
    amount = pd.to_numeric(row.get('total_obligated_amount', 0), errors='coerce')
    action_date = row.get('award_latest_action_date', '2025')

    # Try to infer topic from award description
    desc = str(row.get('award_description', '')).lower()
    if 'data' in desc or 'computing' in desc:
        topic = 'data centers'
    elif 'battery' in desc or 'storage' in desc:
        topic = 'battery storage'
    elif 'grid' in desc or 'transmission' in desc:
        topic = 'grid modernization'
    elif 'renewable' in desc or 'solar' in desc or 'wind' in desc:
        topic = 'renewable energy'
    else:
        topic = 'energy infrastructure'

    money_vector_data.append({
        'date': action_date if pd.notna(action_date) else '2025',
        'organization': recipient,
        'spend_amount': amount if pd.notna(amount) else 0,
        'topic': topic
    })

# Create DataFrame and save
df_money = pd.DataFrame(money_vector_data)
df_money = df_money.sort_values('date', ascending=False)
df_money.to_csv("final_output/MONEY_VECTOR_DETAILED.csv", index=False)
print("✅ Created: final_output/MONEY_VECTOR_DETAILED.csv")

# Also create the summary table
summary = pd.DataFrame({
    'Component': [
        'Federal Lobbying (2025)',
        'State Lobbying (2024)',
        'State Lobbying (2025)',
        'State Growth',
        'Federal Awards (2025)'
    ],
    'Value': [
        f'${federal_lobbying_amount:,}',
        f'{count_2024} employers',
        f'{count_2025} employers',
        f'+{growth} (+{growth_pct:.1f}%)',
        f'${awards_total:,.0f}'
    ],
    'Signal': [
        score['federal_lobbying'],
        'N/A',
        'N/A',
        score['state_growth'],
        score['federal_awards']
    ]
})

summary.to_csv("final_output/MONEY_VECTOR_SUMMARY.csv", index=False)
print("✅ Created: final_output/MONEY_VECTOR_SUMMARY.csv")

# Keep the findings document
findings = f'''# MONEY VECTOR - FINAL REPORT

## Overall Assessment: {overall} MOMENTUM 🔥

Total entries in detailed dataset: {len(df_money)}

---

## Component 1: Federal Lobbying
- **Amount:** ${federal_lobbying_amount:,}
- **Signal:** {score['federal_lobbying']}

## Component 2: State Lobbying (Indiana)
- **2024:** {count_2024} employers
- **2025:** {count_2025} employers
- **Growth:** +{growth} (+{growth_pct:.1f}%)
- **Signal:** {score['state_growth']}

## Component 3: Federal Awards (DOE/EPA)
- **Total:** ${awards_total:,.0f}
- **Signal:** {score['federal_awards']}

### Top 5 Recipients
'''

for i, (name, amt) in enumerate(top5.items(), 1):
    findings += f'{i}. {name}: ${amt:,.0f}\n'

findings += f'''

**Report generated:** {pd.Timestamp.now().strftime('%Y-%m-%d %I:%M %p')}
'''

with open("final_output/MONEY_VECTOR_FINDINGS.md", "w") as f:
    f.write(findings)
print("✅ Created: final_output/MONEY_VECTOR_FINDINGS.md")

print("\n" + "=" * 70)
print("✅ MONEY VECTOR COMPLETE!")
print("=" * 70)
print("\nFiles created:")
print("  1. MONEY_VECTOR_DETAILED.csv     ← Row-by-row format (date, org, amount, topic)")
print("  2. MONEY_VECTOR_SUMMARY.csv      ← Summary table")
print("  3. MONEY_VECTOR_FINDINGS.md      ← Full report")
print("\n🎉 Ready for your presentation!")
