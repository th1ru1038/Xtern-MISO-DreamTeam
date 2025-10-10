import { loadAllVectorData } from "./services/dataService";
import type {
  PeopleVectorItem,
  MoneyVectorItem,
  MomentumScore,
  TopRecipient,
} from "./types/data";

export type { VectorDataBundle } from "./services/dataService";

export { loadAllVectorData };

export const peopleVector: PeopleVectorItem[] = [];

export const moneyVector: MoneyVectorItem[] = [];

export const paperVector: { title: string; score: number }[] = [];

export const momentumScores: MomentumScore[] = [];

export const topRecipients: TopRecipient[] = [];

export const energyKeywords: {
  keyword: string;
  count: number;
  momentum: number;
}[] = [];
