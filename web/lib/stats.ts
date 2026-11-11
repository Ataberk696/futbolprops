// İstemci ve sunucunun ortak kullandığı tipler ve hesaplar.

export type AggKey = "shots" | "sot" | "fouls" | "cards" | "corners" | "goals";
export type Agg = Record<AggKey, number>;

/** Oyuncu propları. Game.v dizisi bu sırayla tutulur. */
export const STATS = [
  { key: "shots", label: "Şut", oppSide: "A", oppKey: "shots", oppLabel: "Rakibin maç başına yediği şut" },
  { key: "sot", label: "İsabetli şut", oppSide: "A", oppKey: "sot", oppLabel: "Rakibin maç başına yediği isabetli şut" },
  { key: "fouls", label: "Faul", oppSide: "A", oppKey: "fouls", oppLabel: "Rakibe karşı maç başına yapılan faul" },
  { key: "was_fouled", label: "Yediği faul", oppSide: "F", oppKey: "fouls", oppLabel: "Rakibin maç başına yaptığı faul" },
  { key: "cards", label: "Kart", oppSide: "A", oppKey: "cards", oppLabel: "Rakibin rakiplerine maç başına çıkan kart" },
  { key: "goals", label: "Gol", oppSide: "A", oppKey: "goals", oppLabel: "Rakibin maç başına yediği gol" },
  { key: "assists", label: "Asist", oppSide: "A", oppKey: "goals", oppLabel: "Rakibin maç başına yediği gol" },
] as const satisfies readonly {
  key: string;
  label: string;
  oppSide: "A" | "F";
  oppKey: AggKey;
  oppLabel: string;
}[];

export type Game = {
  date: string;
  oppId: string;
  home: boolean;
  min: number | null;
  v: number[];
};

export type PlayerData = {
  id: string;
  name: string;
  img: string | null;
  teamId: string;
  /** En yeni maç başta. */
  games: Game[];
};

export type TeamData = {
  id: string;
  name: string;
  img: string | null;
  leagueId: string;
  n: number;
  next: { oppId: string; home: boolean; date: string } | null;
  /** Takımın kendi maç başı ortalamaları. */
  avgF: Agg;
  /** Takımın rakiplerinin, bu takıma karşı maç başı ortalamaları. */
  avgA: Agg;
  /** Lig içi sıra; 1 = en yüksek değer. */
  rankF: Agg;
  rankA: Agg;
  leagueSize: number;
  /** Takımın sondan üçüncü maçının tarihi; aktif oyuncu süzgeci için. */
  recent: string;
};

export type League = { id: string; name: string };
export type Side = "over" | "under";
export type Rate = { hit: number; n: number; pct: number };

export const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export function median(xs: number[]) {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Bahis sitesi çizgisi olmadığından, son 10 maç ortalamasına en yakın buçuklu çizgi. */
export function autoLine(valuesNewestFirst: number[]) {
  return Math.max(0.5, Math.round(mean(valuesNewestFirst.slice(0, 10))) - 0.5);
}

export function hitRate(values: number[], line: number, side: Side): Rate {
  const hit = values.filter((v) => (side === "over" ? v > line : v < line)).length;
  return { hit, n: values.length, pct: values.length ? hit / values.length : 0 };
}

const MONTHS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

/** "2026-11-21" -> "21 Kas" */
export function fmtDate(iso: string) {
  return `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;
}

export const fmt1 = (n: number) => n.toFixed(1).replace(".", ",");
export const fmtPct = (r: number) => `${Math.round(r * 100)}%`;
