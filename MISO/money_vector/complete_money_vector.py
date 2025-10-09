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
# CREATE DELIVERABLES
# ===================================================================
print("\n" + "="*70)
print("CREATING FILES")
print("="*70)

os.makedirs("final_output", exist_ok=True)

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

findings = f'''# MONEY VECTOR - FINAL REPORT

## Overall Assessment: {overall} MOMENTUM 🔥

---

## Component 1: Federal Lobbying
- **Source:** OpenSecrets Energy & Natural Resources Sector
- **Year:** 2025 (Q1)
- **Amount:** ${federal_lobbying_amount:,}
- **Signal:** {score['federal_lobbying']}

The energy sector spent over $122M on federal lobbying in Q1 2025.

---

## Component 2: State Lobbying (Indiana)
- **Source:** Indiana Lobby Registration Commission
- **2024:** {count_2024} energy-related employers
- **2025:** {count_2025} energy-related employers
- **Growth:** +{growth} (+{growth_pct:.1f}%)
- **Signal:** {score['state_growth']}

Energy lobbying activity in Indiana grew {growth_pct:.1f}% year-over-year.

---

## Component 3: Federal Awards (DOE/EPA)
- **Source:** USAspending
- **Year:** 2025
- **Total:** ${awards_total:,.0f}
- **Signal:** {score['federal_awards']}

### Breakdown
- Assistance (Grants): ${assistance_total:,.0f} ({len(assistance)} awards)
- Contracts: ${contracts_total:,.0f} ({len(contracts)} awards)

### Top 5 Recipients
'''

for i, (name, amt) in enumerate(top5.items(), 1):
    findings += f'{i}. {name}: ${amt:,.0f}\n'

findings += f'''

---

## Key Insights for MISO

1. **$1.5B+ in federal awards** to Indiana signals major energy infrastructure investment
2. **State lobbying growth** indicates local policy mobilization
3. **Top recipients include utilities** (Hoosier Energy: $103M) = grid modernization
4. **Industrial awards** (Heidelberg: $505M, FCA: $250M) = high energy demand

## Data Sources
- Federal Lobbying: OpenSecrets.org
- State Lobbying: Indiana ILRC (2024-2025 Employer Lobbyist Totals)
- Federal Awards: USAspending.gov (DOE/EPA to Indiana, 2025)

**Report generated:** {pd.Timestamp.now().strftime('%Y-%m-%d %I:%M %p')}
'''

with open("final_output/MONEY_VECTOR_FINDINGS.md", "w") as f:
    f.write(findings)
print("✅ Created: final_output/MONEY_VECTOR_FINDINGS.md")

top5.to_csv("final_output/TOP_RECIPIENTS.csv")
print("✅ Created: final_output/TOP_RECIPIENTS.csv")

print("\n" + "="*70)
print("✅ MONEY VECTOR COMPLETE!")
print("="*70)
print("\nFiles created in: final_output/")
print("  1. MONEY_VECTOR_SUMMARY.csv")
print("  2. MONEY_VECTOR_FINDINGS.md")
print("  3. TOP_RECIPIENTS.csv")
print("\n🎉 Ready for your presentation!")
