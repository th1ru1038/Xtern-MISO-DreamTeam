import {
  processJobToVector,
  processMoneyData,
  processMomentumScores,
} from "../utils/dataProcessor";
import type {
  PeopleVectorItem,
  MoneyVectorItem,
  MomentumScore,
  PaperVectorData,
  PaperVectorItem,
  PaperVectorTrendPoint,
  JobPosting,
  MomentumKeywordData,
  TopRecipient,
} from "../types/data";

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === "number" && !Number.isNaN(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
};

const toBoolean = (value: unknown): boolean => {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "" || normalized === "0" || normalized === "false") {
      return false;
    }
    return true;
  }
  return false;
};

async function loadVectorDataFromJSON() {
  try {
    const response = await fetch("/data/vector_data.json");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Failed to load vector data:", error);
    return null;
  }
}

export async function loadPeopleVectorData(): Promise<PeopleVectorItem[]> {
  const data = await loadVectorDataFromJSON();
  if (!data?.people_vector) {
    return getSamplePeopleData();
  }

  return data.people_vector.map((job: JobPosting) =>
    processJobToVector(
      job.job_title,
      job.company,
      job.keywords_detected,
      job.location,
      job.posted_at,
      job.source
    )
  );
}

export async function loadMoneyVectorData(): Promise<MoneyVectorItem[]> {
  const data = await loadVectorDataFromJSON();
  if (!data?.money_vector) {
    return processMoneyData();
  }

  const moneyData: MoneyVectorItem[] = [];

  interface RawMoneyItem {
    component: string;
    value: string | number;
    signal?: string;
  }

  const stateEntries: Array<{
    year: number;
    employers: number;
    signal?: string;
  }> = [];

  const summaryItems: RawMoneyItem[] = Array.isArray(data.money_vector.summary)
    ? data.money_vector.summary
    : [];

  const parseCurrency = (num: number, suffix: string) => {
    if (suffix.includes("%")) {
      return num;
    }
    if (suffix.includes("b")) {
      return num * 1e9;
    }
    if (suffix.includes("m")) {
      return num * 1e6;
    }
    if (suffix.includes("k")) {
      return num * 1e3;
    }
    return num;
  };

  summaryItems.forEach((item) => {
    const component = item.component ?? "";
    const raw = String(item.value ?? "").trim();
    const normalizedSignal =
      item.signal && item.signal.toUpperCase() !== "N/A"
        ? item.signal
        : undefined;

    const yearMatch = component.match(/\((\d{4})\)/);
    const year = yearMatch ? Number(yearMatch[1]) : undefined;

    if (/state lobbying/i.test(component)) {
      const employerMatch = raw.match(/(\d+(?:\.\d+)?)/);
      const employers = employerMatch ? Number(employerMatch[1]) : 0;
      if (year) {
        stateEntries.push({
          year,
          employers,
          signal: normalizedSignal,
        });
      }
      return;
    }

    const percentInParens = raw.match(/\(([-+]?\d+(?:\.\d+)?)\s*%\)/);
    const anyPercent = raw.match(/([-+]?\d+(?:\.\d+)?)\s*%/);
    const leadingNumber = raw.match(/^\s*[-+]?\$?([\d,.,]+)/);

    let numericValue = 0;
    let unit: MoneyVectorItem["unit"] = "currency";
    let displayValue: string | undefined;

    if (percentInParens) {
      numericValue = Number(percentInParens[1].replace(/,/g, ""));
      unit = "percentage";
    } else if (anyPercent) {
      numericValue = Number(anyPercent[1].replace(/,/g, ""));
      unit = "percentage";
    } else if (leadingNumber) {
      const num = Number(leadingNumber[1].replace(/,/g, ""));
      const suffixMatch = raw
        .slice(leadingNumber[0].length)
        .match(/^\s*([kKmMbB%]*)/);
      const suffix = suffixMatch ? suffixMatch[1].toLowerCase() : "";
      numericValue = parseCurrency(num, suffix);
      if (suffix.includes("%")) {
        unit = "percentage";
      }
    }

    if (unit === "percentage") {
      const sign = numericValue < 0 ? "-" : "+";
      const rounded = Number.isFinite(numericValue)
        ? Math.abs(numericValue).toFixed(1)
        : "0.0";
      displayValue = `${sign}${rounded}%`;
    }

    moneyData.push({
      category: component,
      value: numericValue,
      unit,
      signal: normalizedSignal,
      description: component,
      ...(displayValue ? { displayValue } : {}),
    });
  });

  if (stateEntries.length) {
    stateEntries.sort((a, b) => b.year - a.year);
    const latest = stateEntries[0];
    const previous = stateEntries.find((entry) => entry.year < latest.year);

    const diff = previous ? latest.employers - previous.employers : 0;
    const pct =
      previous && previous.employers ? (diff / previous.employers) * 100 : 0;

    const derivedSignal = (() => {
      if (latest.signal) {
        return latest.signal;
      }
      if (!previous) {
        return "MEDIUM";
      }
      if (pct >= 5) {
        return "HIGH";
      }
      if (pct <= -5) {
        return "LOW";
      }
      return "MEDIUM";
    })();

    let description = `${latest.year} employer count`;
    if (previous) {
      const direction = diff >= 0 ? "Up" : "Down";
      description = `${direction} ${Math.abs(diff)} vs ${previous.year}`;
    }

    moneyData.push({
      category: "State Lobbying",
      value: latest.employers,
      unit: "count",
      unitLabel: "employers",
      signal: derivedSignal,
      description,
      deltaValue: diff,
      deltaUnit: "count",
      deltaLabel: previous ? `vs ${previous.year}` : undefined,
    });

    const stateGrowthMetric = moneyData.find(
      (item) => item.category === "State Growth"
    );
    if (stateGrowthMetric) {
      stateGrowthMetric.deltaValue = diff;
      stateGrowthMetric.deltaUnit = "count";
      stateGrowthMetric.deltaLabel = previous
        ? `vs ${previous.year}`
        : undefined;
      stateGrowthMetric.description = `Year-over-year change among ${latest.employers} employers`;
    }
  }

  return moneyData;
}

export async function loadMomentumScores(): Promise<MomentumScore[]> {
  const data = await loadVectorDataFromJSON();
  if (!data?.momentum_scores) {
    return getSampleMomentumData();
  }

  return processMomentumScores(data.momentum_scores);
}

export async function loadTopRecipients(): Promise<TopRecipient[]> {
  const data = await loadVectorDataFromJSON();
  if (!data?.money_vector?.recipients) {
    return [
      {
        name: "HEIDELBERG MATERIALS US INC",
        amount: 504992811.0,
        type: "federal",
      },
      {
        name: "FCA US LLC",
        amount: 249999999.0,
        type: "federal",
      },
      {
        name: "STATE OF INDIANA",
        amount: 128956782.34,
        type: "federal",
      },
      {
        name: "PURDUE UNIVERSITY",
        amount: 126242382.49,
        type: "federal",
      },
      {
        name: "HOOSIER ENERGY RURAL ELECTRIC COOPERATIVE INC",
        amount: 102785519.0,
        type: "federal",
      },
    ];
  }

  const rawRecipients = Array.isArray(data.money_vector.recipients)
    ? (data.money_vector.recipients as Array<Record<string, unknown>>)
    : [];

  const recipients: TopRecipient[] = rawRecipients.slice(0, 5).map((item) => {
    const nameValue = item.name ?? item.recipient ?? "Unknown";
    const name = typeof nameValue === "string" ? nameValue : String(nameValue);
    const typeValue = item.type;
    const normalizedType: TopRecipient["type"] =
      typeValue === "state" || typeValue === "lobbying" ? typeValue : "federal";

    return {
      name,
      amount: toNumber(item.amount, 0),
      type: normalizedType,
    };
  });

  return recipients;
}

export async function loadPaperVectorData(): Promise<PaperVectorData> {
  const data = await loadVectorDataFromJSON();
  if (!data?.paper_vector) {
    return getSamplePaperVector();
  }

  const rawTopics = Array.isArray(data.paper_vector.topics)
    ? (data.paper_vector.topics as Array<Record<string, unknown>>)
    : [];

  const topics: PaperVectorItem[] = rawTopics.map((item) => {
    const titleCandidate = item.title ?? item.topic ?? "Untitled";
    const title =
      typeof titleCandidate === "string"
        ? titleCandidate
        : String(titleCandidate ?? "Untitled");
    const topicValue = typeof item.topic === "string" ? item.topic : "";

    return {
      title,
      topic: topicValue,
      score: toNumber(item.score, 0),
      date: typeof item.date === "string" ? item.date : "",
      change30d: toNumber(
        item.change_30d ?? (item as Record<string, unknown>).change30d,
        0
      ),
      frNotices: toNumber(item.fr_notices, 0),
      commentRate14d: toNumber(item.comment_rate_14d, 0),
      underReview: toNumber(item.under_review, 0),
      econSignificant: toBoolean(item.econ_significant),
      whiteHouseHits: toNumber(item.white_house_hits, 0),
      executiveOrderHits: toNumber(item.executive_order_hits, 0),
    };
  });

  const rawTrend = Array.isArray(data.paper_vector.trend)
    ? (data.paper_vector.trend as Array<Record<string, unknown>>)
    : [];

  const trend: PaperVectorTrendPoint[] = rawTrend.map((point) => ({
    date: typeof point.date === "string" ? point.date : "",
    score: toNumber(point.score, 0),
  }));

  return {
    topics,
    trend,
  };
}

function getSamplePeopleData(): PeopleVectorItem[] {
  const sampleJobData: JobPosting[] = [
    {
      posted_at: "2025-10-07 11:16:43.850",
      job_title: "Supervisory Healthcare Engineer (Deputy)",
      company: "Veterans Health Administration",
      location: "San Juan, Puerto Rico",
      keywords_detected: "doe,energy,epa,utility",
      source: "usajobs",
      url: "https://www.usajobs.gov:443/job/847639300",
    },
    {
      posted_at: "2025-10-07 09:57:23.350",
      job_title: "Mechanical Engineer",
      company: "U.S. Army Corps of Engineers",
      location: "Redstone Arsenal, Alabama",
      keywords_detected: "energy,renewable",
      source: "usajobs",
      url: "https://www.usajobs.gov:443/job/847621600",
    },
    {
      posted_at: "2025-10-07 09:51:12.827",
      job_title: "Supervisor DLA Energy Americas West Region",
      company: "Defense Logistics Agency",
      location: "Seal Beach, California",
      keywords_detected: "energy",
      source: "usajobs",
      url: "https://www.usajobs.gov:443/job/847621300",
    },
  ];

  return sampleJobData.map((job) =>
    processJobToVector(
      job.job_title,
      job.company,
      job.keywords_detected,
      job.location,
      job.posted_at,
      job.source
    )
  );
}

function getSampleMomentumData(): MomentumScore[] {
  const momentumKeywordData: MomentumKeywordData[] = [
    {
      keyword: "compliance",
      people_count: 88,
      money_count: 0.0,
      paper_count: 0.0,
      people_norm: 0.6744186046511628,
      money_norm: 0.0,
      paper_norm: 0.0,
      momentum_score: 0.26976744186046514,
    },
    {
      keyword: "epa",
      people_count: 130,
      money_count: 0.0,
      paper_count: 0.0,
      people_norm: 1.0,
      money_norm: 0.0,
      paper_norm: 0.0,
      momentum_score: 0.4,
    },
  ];

  return processMomentumScores(momentumKeywordData);
}

function getSamplePaperVector(): PaperVectorData {
  const topics: PaperVectorItem[] = [
    {
      title: "Energy Policy Reform Act 2025",
      topic: "energy_policy_reform_act_2025",
      score: 0.85,
      date: "2025-10-01",
      change30d: 0.12,
      frNotices: 4,
      commentRate14d: 120,
      underReview: 2,
      econSignificant: true,
      whiteHouseHits: 3,
      executiveOrderHits: 1,
    },
    {
      title: "Renewable Infrastructure Investment Bill",
      topic: "renewable_infrastructure_investment_bill",
      score: 0.72,
      date: "2025-10-01",
      change30d: -0.08,
      frNotices: 2,
      commentRate14d: 45,
      underReview: 1,
      econSignificant: false,
      whiteHouseHits: 1,
      executiveOrderHits: 0,
    },
    {
      title: "Grid Modernization Standards",
      topic: "grid_modernization_standards",
      score: 0.68,
      date: "2025-10-01",
      change30d: 0.05,
      frNotices: 1,
      commentRate14d: 32,
      underReview: 1,
      econSignificant: false,
      whiteHouseHits: 0,
      executiveOrderHits: 0,
    },
  ];

  const trend: PaperVectorTrendPoint[] = [
    { date: "2025-09-01", score: 0.6 },
    { date: "2025-09-15", score: 0.7 },
    { date: "2025-10-01", score: 0.8 },
  ];

  return { topics, trend };
}

export interface VectorDataBundle {
  peopleVector: PeopleVectorItem[];
  moneyVector: MoneyVectorItem[];
  momentumScores: MomentumScore[];
  topRecipients: TopRecipient[];
  paperVector: PaperVectorData;
}

export async function loadAllVectorData(): Promise<VectorDataBundle> {
  const [
    peopleVector,
    moneyVector,
    momentumScores,
    topRecipients,
    paperVector,
  ] = await Promise.all([
    loadPeopleVectorData(),
    loadMoneyVectorData(),
    loadMomentumScores(),
    loadTopRecipients(),
    loadPaperVectorData(),
  ]);

  return {
    peopleVector,
    moneyVector,
    momentumScores,
    topRecipients,
    paperVector,
  };
}
