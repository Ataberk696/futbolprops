// TFF Fantezi Lig puanlaması, sıradaki maç için beklenen puan tahmini ve kadro seçimi.
// Tahmin sunucuda (derleme anında) hesaplanır; kadro seçimi tarayıcıda da çalışır.
import type { TeamData } from "./stats";

export const POSITIONS = ["Kaleci", "Defans", "Orta saha", "Forvet"] as const;
export const POS_SHORT = ["KL", "DF", "OS", "FV"] as const;

const GOAL_POINTS = [10, 6, 5, 4];
const CLEAN_SHEET_POINTS = [4, 4, 1, 0];
const BONUS = [3, 2, 1];

export type FantasyGame = {
  matchId: string;
  date: string;
  minutes: number;
  goals: number;
  assists: number;
  saves: number;
  yellow: number;
  red: number;
  conceded: number;
};

/** Bir maçın bonus hariç puan kalemleri. */
export function scoreGame(pos: number, g: FantasyGame) {
  const defender = pos <= 1;
  return {
    appearance: g.minutes >= 60 ? 2 : g.minutes > 0 ? 1 : 0,
    attack: g.goals * GOAL_POINTS[pos] + g.assists * 3,
    cleanSheet: g.minutes >= 60 && g.conceded === 0 ? CLEAN_SHEET_POINTS[pos] : 0,
    conceded: defender ? -Math.floor(g.conceded / 2) : 0,
    saves: pos === 0 ? Math.floor(g.saves / 3) : 0,
    cards: -g.yellow - 3 * g.red,
  };
}
type Parts = ReturnType<typeof scoreGame>;
const total = (p: Parts) => p.appearance + p.attack + p.cleanSheet + p.conceded + p.saves + p.cards;

export type Candidate = {
  id: string;
  name: string;
  img: string | null;
  pos: number;
  teamId: string;
  team: string;
  teamImg: string | null;
  opp: string;
  home: boolean;
  date: string;
  /** Sıradaki maç için beklenen puan. */
  xp: number;
  /** Son 5 maçta aldığı ortalama puan (bonus dahil). */
  form: number;
  /** Sezon ortalaması. */
  season: number;
  games: number;
  /** Takımının son 5 maçından kaçında oynadığı (0–1). */
  play: number;
  /** Rakibe göre düzeltme katsayıları; 1 = lig ortalaması. */
  atk: number;
  /** Takımının gol yememe olasılığı. */
  cs: number;
};

export type FantasyInput = {
  id: string;
  name: string;
  img: string | null;
  pos: number;
  teamId: string;
  /** En yeni maç başta; dakikası bilinmeyen maçlar çıkarılmış. */
  games: FantasyGame[];
};

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
// Form ağırlığı: son 5 maç %60, sezonun tamamı %40.
const blend = (xs: number[]) => 0.6 * mean(xs.slice(0, 5)) + 0.4 * mean(xs);

/** Poisson(λ) dağılımında "yenilen her 2 gol için −1" cezasının beklenen değeri. */
function expectedConcededPenalty(lambda: number) {
  let p = Math.exp(-lambda);
  let sum = 0;
  for (let k = 1; k <= 10; k++) {
    p *= lambda / k;
    sum += Math.floor(k / 2) * p;
  }
  return sum;
}

/**
 * Her oyuncu için sıradaki maçın beklenen puanı.
 * Form: oyuncunun kendi maç başı puan kalemleri (son 5 maç ağırlıklı).
 * Rakip: gol/asist puanı rakibin yediği gole, gol yememe ve gol yeme cezası iki takımın gol ortalamalarına,
 * kurtarış rakibin isabetli şutuna göre düzeltilir.
 */
export function project(
  players: FantasyInput[],
  teams: Record<string, TeamData>,
  /** Takım başına son maçların kimlikleri, en yeni başta. */
  teamMatches: Record<string, string[]>,
  minGames = 3,
): Candidate[] {
  // Bonus: her maçta en yüksek puanlı ilk üç oyuncuya +3, +2, +1.
  const byMatch = new Map<string, { key: string; pts: number }[]>();
  const parts = new Map<string, Parts>();
  for (const p of players) {
    for (const g of p.games) {
      const s = scoreGame(p.pos, g);
      const key = `${p.id}|${g.matchId}`;
      parts.set(key, s);
      byMatch.set(g.matchId, [...(byMatch.get(g.matchId) ?? []), { key, pts: total(s) }]);
    }
  }
  const bonus = new Map<string, number>();
  for (const list of byMatch.values()) {
    list.sort((a, b) => b.pts - a.pts).slice(0, 3).forEach((e, i) => bonus.set(e.key, BONUS[i]));
  }

  const league = Object.values(teams).filter((t) => t.n > 0);
  const avgGoals = mean(league.map((t) => t.avgF.goals)) || 1;
  const avgSot = mean(league.map((t) => t.avgF.sot)) || 1;

  const out: Candidate[] = [];
  for (const p of players) {
    const team = teams[p.teamId];
    const opp = team?.next ? teams[team.next.oppId] : undefined;
    if (!team?.next || !opp || p.games.length < minGames) continue;

    const recent = (teamMatches[p.teamId] ?? []).slice(0, 5);
    const played = new Set(p.games.map((g) => g.matchId));
    const play = recent.length ? recent.filter((id) => played.has(id)).length / recent.length : 0;
    if (!play) continue;

    const scored = p.games.map((g) => {
      const key = `${p.id}|${g.matchId}`;
      return { g, s: parts.get(key)!, bonus: bonus.get(key) ?? 0 };
    });
    const atk = clamp(opp.avgA.goals / avgGoals, 0.6, 1.6);
    const lambda = clamp((team.avgA.goals * opp.avgF.goals) / avgGoals, 0.3, 3.5);
    const cs = Math.exp(-lambda);
    const p60 = blend(scored.map((x) => (x.g.minutes >= 60 ? 1 : 0)));
    const minuteShare = Math.min(1, blend(scored.map((x) => x.g.minutes)) / 90);

    const perGame =
      blend(scored.map((x) => x.s.appearance)) +
      blend(scored.map((x) => x.s.attack)) * atk +
      CLEAN_SHEET_POINTS[p.pos] * p60 * cs +
      (p.pos <= 1 ? -expectedConcededPenalty(lambda) * minuteShare : 0) +
      blend(scored.map((x) => x.s.saves)) * clamp(opp.avgF.sot / avgSot, 0.6, 1.6) +
      blend(scored.map((x) => x.s.cards)) +
      blend(scored.map((x) => x.bonus)) * (p.pos >= 2 ? atk : 1);

    const pts = scored.map((x) => total(x.s) + x.bonus);
    out.push({
      id: p.id, name: p.name, img: p.img, pos: p.pos,
      teamId: team.id, team: team.name, teamImg: team.img,
      opp: opp.name, home: team.next.home, date: team.next.date,
      xp: play * perGame, form: mean(pts.slice(0, 5)), season: mean(pts), games: pts.length,
      play, atk, cs,
    });
  }
  return out.sort((a, b) => b.xp - a.xp);
}

/** [defans, orta saha, forvet] */
export const FORMATIONS: [number, number, number][] = [
  [3, 4, 3], [3, 5, 2], [4, 3, 3], [4, 4, 2], [4, 5, 1], [5, 3, 2], [5, 4, 1],
];

export type Squad = { formation: [number, number, number]; starters: Candidate[]; bench: Candidate[]; gkBench: Candidate | null; xp: number };

/**
 * Beklenen puanı en yüksek 11 + 3 yedek + yedek kaleci.
 * Adaylar puana göre sıralı gezilir; mevki kontenjanı ve takım başına sınır dolmadıkça alınır.
 */
export function pickSquad(sorted: Candidate[], formation: [number, number, number] | null, maxPerTeam: number): Squad | null {
  let best: Squad | null = null;
  for (const f of formation ? [formation] : FORMATIONS) {
    const need = [1, ...f];
    const perTeam = new Map<string, number>();
    const take = (c: Candidate) => perTeam.set(c.teamId, (perTeam.get(c.teamId) ?? 0) + 1);
    const free = (c: Candidate) => (perTeam.get(c.teamId) ?? 0) < maxPerTeam;
    const starters: Candidate[] = [];
    for (const c of sorted) {
      if (need[c.pos] > 0 && free(c)) {
        need[c.pos]--;
        starters.push(c);
        take(c);
      }
    }
    if (starters.length < 11) continue;
    const chosen = new Set(starters.map((c) => c.id));
    const bench: Candidate[] = [];
    let gkBench: Candidate | null = null;
    for (const c of sorted) {
      if (chosen.has(c.id) || !free(c)) continue;
      if (c.pos === 0) {
        if (gkBench) continue;
        gkBench = c;
      } else {
        if (bench.length >= 3) continue;
        bench.push(c);
      }
      take(c);
    }
    const xp = starters.reduce((a, c) => a + c.xp, 0);
    if (!best || xp > best.xp) best = { formation: f, starters, bench, gkBench, xp };
  }
  return best;
}
