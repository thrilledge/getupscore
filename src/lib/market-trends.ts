export type MarketRange = 7 | 30;

export type MarketScope = "all" | "filters" | "custom";

export interface MarketTrendsMeta {
  periodDays: number;
  totalJobs: number;
  fixed: number;
  hourly: number;
  other: number;
  medianBudget: number | null;
  avgBudget: number | null;
  medianHourly: number | null;
  avgHourly: number | null;
  avgClientRating: number | null;
  avgClientSpend: number | null;
}

export interface HistoryPoint {
  date: string;
  count: number;
  fixed: number;
  hourly: number;
}

export interface SkillStat {
  name: string;
  count: number;
  recent7: number;
  prev7: number;
  deltaPct: number | null;
}

export interface SkillTrendPoint {
  name: string;
  date: string;
  n: number;
}

export interface SkillPair {
  a: string;
  b: string;
  n: number;
}

export interface BandStat {
  band: string;
  n: number;
}

export interface CategoryStat {
  name: string;
  n: number;
}

export interface GeographyStat {
  name: string;
  n: number;
}

export interface TimingStat {
  dow: number;
  hour: number;
  n: number;
}

export interface TimingData {
  byDay: Array<{ dow: number; n: number }>;
  byHour: Array<{ hour: number; n: number }>;
}

export interface ClientTierStat {
  tier: string;
  n: number;
}

export interface MarketTrends {
  meta: MarketTrendsMeta;
  history: HistoryPoint[];
  skills: SkillStat[];
  skillTrend: SkillTrendPoint[];
  skillPairs: SkillPair[];
  budgetBands: BandStat[];
  hourlyBands: BandStat[];
  timing: TimingData;
  categories: CategoryStat[];
  subcategories: CategoryStat[];
  geography: GeographyStat[];
  clients: {
    tiers: ClientTierStat[];
    paymentVerifiedYes: number;
    paymentVerifiedTotal: number;
  };
  applied?: { scope: MarketScope; filterCount: number };
}

export const RANGES: Array<{ value: MarketRange; label: string }> = [
  { value: 7, label: "7D" },
  { value: 30, label: "30D" },
];

// Chart palette — uses the app's accent colors so charts match the theme.
export const CHART_COLORS = [
  "oklch(0.6 0.12 250)",   // accent-blue
  "oklch(0.65 0.18 145)",  // accent-green
  "oklch(0.75 0.18 75)",   // accent-amber
  "oklch(0.473 0.203 293.3)",  // accent-purple
  "oklch(0.7 0.16 20)",    // warm red
  "oklch(0.68 0.12 190)",  // teal
];

export function formatNumber(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US");
}

export function formatCompact(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function formatCurrency(
  n: number | null | undefined,
  opts: { compact?: boolean; prefix?: string } = {}
): string {
  if (n == null || Number.isNaN(n)) return "—";
  const prefix = opts.prefix ?? "$";
  if (opts.compact) {
    return `${prefix}${Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n)}`;
  }
  return `${prefix}${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function formatPct(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `${n.toLocaleString("en-US", { maximumFractionDigits: 1 })}%`;
}

// Trend deltas can explode when a baseline is near zero (e.g. "+67600%").
// Cap the display so badges stay readable while remaining truthful.
export function formatDelta(n: number | null | undefined): string {
  if (n == null) return "new";
  if (n > 1000) return ">1,000%";
  if (n < -1000) return "<-1,000%";
  return formatPct(n);
}

export function sharePct(part: number, total: number): number {
  if (!total) return 0;
  return (part / total) * 100;
}

export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const DAY_LABELS_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function hourLabel(hour: number): string {
  const h = hour % 12 || 12;
  const suffix = hour < 12 ? "AM" : "PM";
  return `${h} ${suffix}`;
}

export const BAND_LABELS: Record<string, string> = {
  under_100: "Under $100",
  "100_499": "$100 – $499",
  "500_999": "$500 – $999",
  "1000_2499": "$1k – $2.5k",
  "2500_4999": "$2.5k – $5k",
  "5000_plus": "$5k+",
  under_10: "Under $10",
  "10_19": "$10 – $19",
  "20_34": "$20 – $34",
  "35_49": "$35 – $49",
  "50_74": "$50 – $74",
  "75_99": "$75 – $99",
  "100_plus": "$100+",
};

const COUNTRY_CODE_MAP: Record<string, string> = {
  USA: "United States", US: "United States", GBR: "United Kingdom", UK: "United Kingdom",
  IND: "India", CAN: "Canada", AUS: "Australia", DEU: "Germany", PAK: "Pakistan",
  ARE: "United Arab Emirates", UAE: "United Arab Emirates", NLD: "Netherlands",
  PHL: "Philippines", ESP: "Spain", NGA: "Nigeria", FRA: "France", ITA: "Italy",
  POL: "Poland", BRA: "Brazil", MEX: "Mexico", ZAF: "South Africa", EGY: "Egypt",
  SAU: "Saudi Arabia", ISR: "Israel", TUR: "Turkey", UKR: "Ukraine", ROU: "Romania",
  SRB: "Serbia", BGD: "Bangladesh", LKA: "Sri Lanka", NPL: "Nepal", IDN: "Indonesia",
  MYS: "Malaysia", SGP: "Singapore", HKG: "Hong Kong", CHN: "China", JPN: "Japan",
  KOR: "South Korea", VNM: "Vietnam", THA: "Thailand", KEN: "Kenya", GHA: "Ghana",
  ARG: "Argentina", CHL: "Chile", COL: "Colombia", NZL: "New Zealand", IRL: "Ireland",
  CHE: "Switzerland", AUT: "Austria", BEL: "Belgium", DNK: "Denmark", FIN: "Finland",
  NOR: "Norway", SWE: "Sweden", PRT: "Portugal", GRC: "Greece", HUN: "Hungary",
  CZE: "Czechia", BGR: "Bulgaria", HRV: "Croatia", GEO: "Georgia", ARM: "Armenia",
  KAZ: "Kazakhstan", CRI: "Costa Rica", PAN: "Panama", PER: "Peru", VEN: "Venezuela",
  DOM: "Dominican Republic", JOR: "Jordan", KWT: "Kuwait", QAT: "Qatar", OMN: "Oman",
  BHR: "Bahrain", MAR: "Morocco", TUN: "Tunisia", DZA: "Algeria", BOL: "Bolivia",
  ECU: "Ecuador", PRY: "Paraguay", URY: "Uruguay", LUX: "Luxembourg", MLT: "Malta",
  CYP: "Cyprus", ISL: "Iceland", EST: "Estonia", LVA: "Latvia", LTU: "Lithuania",
  SVK: "Slovakia", SVN: "Slovenia", MKD: "North Macedonia", BIH: "Bosnia and Herzegovina",
  ALB: "Albania", MNE: "Montenegro", MDA: "Moldova", RUS: "Russia", UZB: "Uzbekistan",
  TJK: "Tajikistan", KHM: "Cambodia", MMR: "Myanmar", PSE: "Palestine", LBN: "Lebanon",
  IRN: "Iran", IRQ: "Iraq", AFG: "Afghanistan", ZWE: "Zimbabwe", TZA: "Tanzania",
  UGA: "Uganda", ETH: "Ethiopia", SDN: "Sudan", SEN: "Senegal", CIV: "Ivory Coast",
  BWA: "Botswana", NAM: "Namibia", RWA: "Rwanda", MWI: "Malawi", ZMB: "Zambia",
  MOZ: "Mozambique", FJI: "Fiji", PRK: "North Korea", TWN: "Taiwan", LAO: "Laos",
  BRN: "Brunei", LBY: "Libya", YEM: "Yemen", SYR: "Syria",
};

export function normalizeCountry(name: string | null | undefined): string {
  if (!name) return "Unknown";
  const trimmed = name.trim();
  if (COUNTRY_CODE_MAP[trimmed.toUpperCase()]) return COUNTRY_CODE_MAP[trimmed.toUpperCase()];
  return trimmed;
}

export function tierColor(tier: string): string {
  switch (tier) {
    case "Expert":
      return CHART_COLORS[0];
    case "Intermediate":
      return CHART_COLORS[1];
    case "Entry":
      return CHART_COLORS[2];
    default:
      return CHART_COLORS[5];
  }
}

// Rebuild a daily timeline for one skill using the sparse rows from the RPC,
// zero-filling any missing days based on the main history dates.
export function buildSkillTimeline(
  historyDates: string[],
  name: string,
  trend: SkillTrendPoint[]
): Array<{ date: string; n: number }> {
  const map = new Map<string, number>();
  for (const t of trend) {
    if (t.name === name) map.set(t.date, t.n);
  }
  return historyDates.map((date) => ({ date, n: map.get(date) ?? 0 }));
}

export function topRelatedSkills(
  skill: string,
  pairs: SkillPair[],
  limit = 6
): Array<{ name: string; n: number }> {
  const related: Array<{ name: string; n: number }> = [];
  for (const p of pairs) {
    if (p.a === skill) related.push({ name: p.b, n: p.n });
    else if (p.b === skill) related.push({ name: p.a, n: p.n });
  }
  related.sort((x, y) => y.n - x.n);
  return related.slice(0, limit);
}

export function deltaTone(deltaPct: number | null): "up" | "down" | "flat" | "new" {
  if (deltaPct == null) return "new";
  if (deltaPct > 1) return "up";
  if (deltaPct < -1) return "down";
  return "flat";
}
