import type { PeopleVectorItem } from "../types/data";

export interface PeopleSignalSummary {
  totalPostings: number;
  recentPostings: number;
  highRelevanceCount: number;
  anyKeywordCount: number;
  avgRelevance: number;
  avgKeywords: number;
  topEmployers: Array<{ name: string; count: number }>;
  signalScore: number;
  signalLabel: "LOW" | "MEDIUM" | "HIGH";
  lastPostingDate?: string;
  sourcesTracked: number;
}

const RECENT_WINDOW_DAYS = 14;
const HIGH_RELEVANCE_THRESHOLD = 0.25;

function parseDate(value?: string): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }
  const normalized = value.replace(/\s+/g, "T");
  const fallback = new Date(normalized);
  if (!Number.isNaN(fallback.getTime())) {
    return fallback;
  }
  return null;
}

export function computePeopleSignals(
  items: PeopleVectorItem[]
): PeopleSignalSummary {
  const totalPostings = items.length;
  if (totalPostings === 0) {
    return {
      totalPostings,
      recentPostings: 0,
      highRelevanceCount: 0,
      anyKeywordCount: 0,
      avgRelevance: 0,
      avgKeywords: 0,
      topEmployers: [],
      signalScore: 0,
      signalLabel: "LOW",
      sourcesTracked: 0,
    };
  }

  const thresholdDate = (() => {
    const now = new Date();
    now.setDate(now.getDate() - RECENT_WINDOW_DAYS);
    return now;
  })();

  let relevanceSum = 0;
  let keywordSum = 0;
  let highRelevanceCount = 0;
  let anyKeywordCount = 0;
  let recentPostings = 0;
  let latestDate: Date | null = null;
  let latestISO: string | undefined;
  const employerCounts = new Map<string, number>();
  const sources = new Set<string>();

  items.forEach((item) => {
    const relevance = item.relevance ?? 0;
    relevanceSum += relevance;
    if (relevance >= HIGH_RELEVANCE_THRESHOLD) {
      highRelevanceCount += 1;
    }

    const keywords = item.keywords ?? [];
    keywordSum += keywords.length;
    if (keywords.length > 0) anyKeywordCount += 1;

    const parts = item.name.split(" - ");
    const employer = parts[1]?.trim() || "Unknown";
    employerCounts.set(employer, (employerCounts.get(employer) ?? 0) + 1);

    if (item.source) {
      sources.add(item.source);
    }

    const postedDate = parseDate(item.postedAt);
    if (postedDate) {
      if (!latestDate || postedDate > latestDate) {
        latestDate = postedDate;
        latestISO = postedDate.toISOString();
      }
      if (postedDate >= thresholdDate) {
        recentPostings += 1;
      }
    }
  });

  const avgRelevance = relevanceSum / totalPostings;
  const avgKeywords = keywordSum / totalPostings;
  const signalScore = totalPostings ? highRelevanceCount / totalPostings : 0;

  let signalLabel: "LOW" | "MEDIUM" | "HIGH" = "LOW";
  if (signalScore >= 0.45) {
    signalLabel = "HIGH";
  } else if (signalScore >= 0.2) {
    signalLabel = "MEDIUM";
  }

  const topEmployers = Array.from(employerCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, count]) => ({ name, count }));

  return {
    totalPostings,
    recentPostings,
    highRelevanceCount,
    anyKeywordCount,
    avgRelevance,
    avgKeywords,
    topEmployers,
    signalScore,
    signalLabel,
    lastPostingDate: latestISO,
    sourcesTracked: sources.size,
  };
}
