import { loadAllVectorData } from "./services/dataService";
import type {
  PeopleVectorItem,
  MoneyVectorItem,
  MomentumScore,
} from "./types/data";

export { loadAllVectorData };

export const peopleVector: PeopleVectorItem[] = [
  {
    name: "Supervisory Healthcare Engineer - Veterans Health Administration",
    v: [0.8, 0.6, 0.9],
    relevance: 0.75,
    location: "San Juan, Puerto Rico",
    keywords: ["doe", "energy", "epa", "utility"],
  },
  {
    name: "Mechanical Engineer - U.S. Army Corps of Engineers",
    v: [0.7, 0.9, 0.4],
    relevance: 0.67,
    location: "Redstone Arsenal, Alabama",
    keywords: ["energy", "renewable"],
  },
  {
    name: "Supervisor DLA Energy Americas - Defense Logistics Agency",
    v: [0.9, 0.5, 0.7],
    relevance: 0.7,
    location: "Seal Beach, California",
    keywords: ["energy"],
  },
  {
    name: "Medical Records Technician - Veterans Health Administration",
    v: [0.3, 0.8, 0.6],
    relevance: 0.57,
    location: "Bay Pines, Florida",
    keywords: ["compliance", "regulatory"],
  },
];

export const moneyVector: MoneyVectorItem[] = [
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

export const paperVector = [
  { title: "Energy Policy Reform Act 2025", score: 0.85 },
  { title: "Renewable Infrastructure Investment Bill", score: 0.72 },
  { title: "Grid Modernization Standards", score: 0.68 },
  { title: "Carbon Emissions Regulatory Framework", score: 0.91 },
];

export const momentumScores: MomentumScore[] = [
  { date: "2025-01", score: 0.25 },
  { date: "2025-02", score: 0.32 },
  { date: "2025-03", score: 0.28 },
  { date: "2025-04", score: 0.45 },
  { date: "2025-05", score: 0.62 },
  { date: "2025-06", score: 0.58 },
  { date: "2025-07", score: 0.71 },
  { date: "2025-08", score: 0.83 },
  { date: "2025-09", score: 0.79 },
  { date: "2025-10", score: 0.87 },
];

export const topRecipients = [
  { name: "HEIDELBERG MATERIALS US INC", amount: 504992811.0 },
  { name: "FCA US LLC", amount: 249999999.0 },
  { name: "STATE OF INDIANA", amount: 128956782.34 },
  { name: "PURDUE UNIVERSITY", amount: 126242382.49 },
  {
    name: "HOOSIER ENERGY RURAL ELECTRIC COOPERATIVE INC",
    amount: 102785519.0,
  },
];

export const energyKeywords = [
  { keyword: "compliance", count: 88, momentum: 0.27 },
  { keyword: "epa", count: 130, momentum: 0.4 },
  { keyword: "doe", count: 56, momentum: 0.17 },
  { keyword: "regulatory", count: 48, momentum: 0.15 },
  { keyword: "energy", count: 29, momentum: 0.09 },
  { keyword: "utility", count: 26, momentum: 0.08 },
];
