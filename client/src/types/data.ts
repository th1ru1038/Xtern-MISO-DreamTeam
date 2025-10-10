export interface PeopleVectorItem {
  name: string;
  v: number[];
  relevance?: number;
  location?: string;
  keywords?: string[];
  postedAt?: string;
  source?: string;
}

export interface MoneyVectorItem {
  category: string;
  value: number;
  signal?: string;
  description?: string;
  unit?: "currency" | "percentage" | "count";
  unitLabel?: string;
  displayValue?: string;
  deltaValue?: number;
  deltaUnit?: "currency" | "percentage" | "count";
  deltaLabel?: string;
}

export interface PaperVectorItem {
  title: string;
  topic: string;
  score: number;
  date: string;
  change30d: number;
  frNotices: number;
  commentRate14d: number;
  underReview: number;
  econSignificant: boolean;
  whiteHouseHits: number;
  executiveOrderHits: number;
}

export interface PaperVectorTrendPoint {
  date: string;
  score: number;
}

export interface PaperVectorData {
  topics: PaperVectorItem[];
  trend: PaperVectorTrendPoint[];
}

export interface MomentumScore {
  date: string;
  score: number;
}

export interface TopRecipient {
  name: string;
  amount: number;
  type: "federal" | "state" | "lobbying";
}

export interface EnergySector {
  sector: string;
  count: number;
  momentum: number;
}

export interface GeographicalData {
  state: string;
  count: number;
}

export interface JobPosting {
  posted_at: string;
  job_title: string;
  company: string;
  location: string;
  keywords_detected: string;
  source: string;
  url: string;
}

export interface MomentumKeywordData {
  keyword: string;
  people_count: number;
  money_count: number;
  paper_count: number;
  people_norm: number;
  money_norm: number;
  paper_norm: number;
  momentum_score: number;
}
