import {
  processJobToVector,
  processMoneyData,
  processMomentumScores,
} from "../utils/dataProcessor";
import type {
  PeopleVectorItem,
  MoneyVectorItem,
  MomentumScore,
  JobPosting,
  MomentumKeywordData,
} from "../types/data";

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
      job.location
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
  data.money_vector.summary?.forEach((item: RawMoneyItem) => {
    let value = 0;
    const raw = String(item.value).trim();
    // match number + optional suffix like K, M, B or %
    const match = raw.match(/^\s*\$?([\d,.,]+)\s*([kKmMbB%]*)/) || [];
    if (match && match[1]) {
      const num = parseFloat(match[1].replace(/,/g, ""));
      const suf = (match[2] || "").toLowerCase();
      if (suf.includes("%")) {
        value = num;
      } else if (suf.includes("b")) {
        value = num * 1e9;
      } else if (suf.includes("m")) {
        value = num * 1e6;
      } else if (suf.includes("k")) {
        value = num * 1e3;
      } else {
        // no suffix — apply heuristics: if this is a lobbying/award metric and number is small, assume millions
        if (/lobb(y|ing)|award|federal|state/i.test(item.component || "")) {
          if (num < 10000) value = num * 1e6;
          else value = num;
        } else {
          value = num;
        }
      }
    } else {
      // fallback: try to parse percent or plain number
      if (raw.includes("%")) value = parseFloat(raw.replace("%", ""));
      else if (/employers/i.test(raw)) value = parseInt(raw.split(" ")[0]) || 0;
      else value = parseFloat(raw.replace(/[$,]/g, "")) || 0;
    }

    moneyData.push({
      category: item.component,
      value: value,
      signal: item.signal,
      description: item.component,
    });
  });

  return moneyData;
}

export async function loadMomentumScores(): Promise<MomentumScore[]> {
  const data = await loadVectorDataFromJSON();
  if (!data?.momentum_scores) {
    return getSampleMomentumData();
  }

  return processMomentumScores(data.momentum_scores);
}

export async function loadTopRecipients() {
  const data = await loadVectorDataFromJSON();
  if (!data?.money_vector?.recipients) {
    return [
      { name: "HEIDELBERG MATERIALS US INC", amount: 504992811.0 },
      { name: "FCA US LLC", amount: 249999999.0 },
      { name: "STATE OF INDIANA", amount: 128956782.34 },
      { name: "PURDUE UNIVERSITY", amount: 126242382.49 },
      {
        name: "HOOSIER ENERGY RURAL ELECTRIC COOPERATIVE INC",
        amount: 102785519.0,
      },
    ];
  }

  return data.money_vector.recipients.slice(0, 5);
}

export async function loadPaperVectorData() {
  return [
    { title: "Energy Policy Reform Act 2025", score: 0.85 },
    { title: "Renewable Infrastructure Investment Bill", score: 0.72 },
    { title: "Grid Modernization Standards", score: 0.68 },
    { title: "Carbon Emissions Regulatory Framework", score: 0.91 },
  ];
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
      job.location
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

export async function loadAllVectorData() {
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
