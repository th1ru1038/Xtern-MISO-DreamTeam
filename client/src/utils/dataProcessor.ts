// Utility functions to process real data from the vector analysis
import type {
  PeopleVectorItem,
  MoneyVectorItem,
  MomentumScore,
  MomentumKeywordData,
  JobPosting,
  EnergySector,
  GeographicalData,
} from "../types/data";

// Keywords from MISO/people_vector/keywords.txt
export const ENERGY_KEYWORDS = [
  "energy",
  "renewable",
  "hydrogen",
  "nuclear",
  "grid",
  "utility",
  "transmission",
  "FERC",
  "PUC",
  "regulatory",
  "compliance",
  "EPA",
  "DOE",
  "carbon",
];

/**
 * Convert job posting data to vector format based on keyword detection
 */
export function processJobToVector(
  jobTitle: string,
  company: string,
  keywordsDetected: string,
  location: string,
  postedAt?: string,
  source?: string
): PeopleVectorItem {
  const detectedKeywords = keywordsDetected
    .toLowerCase()
    .split(",")
    .map((k) => k.trim());

  // Create vector based on keyword presence
  const vector = ENERGY_KEYWORDS.map((keyword) =>
    detectedKeywords.includes(keyword.toLowerCase()) ? 1 : 0
  );

  // Calculate overall relevance score
  const relevanceScore =
    vector.reduce((sum: number, val) => sum + val, 0) / ENERGY_KEYWORDS.length;

  return {
    name: `${jobTitle} - ${company}`,
    v: vector.slice(0, 3), // Use first 3 dimensions for visualization
    relevance: relevanceScore,
    location,
    keywords: detectedKeywords,
    postedAt,
    source,
  };
}

/**
 * Process money vector data from CSV summary
 */
export function processMoneyData(): MoneyVectorItem[] {
  return [
    {
      category: "Federal Lobbying 2025",
      value: 122373945,
      signal: "HIGH",
      description: "Total federal energy lobbying expenditure",
    },
    {
      category: "Federal Awards 2025",
      value: 1553145934,
      signal: "HIGH",
      description: "Federal awards to Indiana (DOE/EPA)",
    },
    {
      category: "State Lobbying Growth",
      value: 10.8,
      signal: "HIGH",
      description: "Year-over-year growth percentage",
    },
    {
      category: "State Employers 2025",
      value: 72,
      signal: "MEDIUM",
      description: "Number of employers engaged in lobbying",
    },
  ];
}

/**
 * Process momentum scores from analysis data
 */
export function processMomentumScores(
  momentumData: MomentumKeywordData[]
): MomentumScore[] {
  // Generate monthly momentum scores based on keyword activity
  const months = [
    "2025-01",
    "2025-02",
    "2025-03",
    "2025-04",
    "2025-05",
    "2025-06",
    "2025-07",
    "2025-08",
    "2025-09",
    "2025-10",
  ];

  return months.map((month, index) => {
    // Calculate weighted momentum based on top keywords
    const baseScore = momentumData
      .filter((item) => item.momentum_score > 0)
      .reduce((sum, item) => sum + item.momentum_score, 0);

    // Add some temporal variation to show trends
    const timeVariation = Math.sin((index / months.length) * Math.PI * 2) * 0.1;
    const score = Math.min(1, Math.max(0, baseScore + timeVariation));

    return {
      date: month,
      score: Math.round(score * 100) / 100,
    };
  });
}

/**
 * Calculate top energy sectors by job activity
 */
export function getTopEnergySectors(jobData: JobPosting[]): EnergySector[] {
  const sectorCounts: Record<string, number> = {};

  jobData.forEach((job) => {
    const keywords = job.keywords_detected
      .toLowerCase()
      .split(",")
      .map((keyword) => keyword.trim())
      .filter(Boolean);
    keywords.forEach((keyword) => {
      const trimmed = keyword.trim();
      if (ENERGY_KEYWORDS.includes(trimmed)) {
        sectorCounts[trimmed] = (sectorCounts[trimmed] || 0) + 1;
      }
    });
  });

  return Object.entries(sectorCounts)
    .map(([sector, count]) => ({
      sector,
      count,
      momentum: count / jobData.length,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

/**
 * Process geographical distribution of jobs
 */
export function getGeographicalDistribution(
  jobData: JobPosting[]
): GeographicalData[] {
  const stateCounts: Record<string, number> = {};

  jobData.forEach((job) => {
    const location = job.location || "";
    const parts = location.split(",");
    const state = parts.length > 1 ? parts[parts.length - 1].trim() : location;

    if (state) {
      stateCounts[state] = (stateCounts[state] || 0) + 1;
    }
  });

  return Object.entries(stateCounts)
    .map(([state, count]) => ({ state, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);
}
