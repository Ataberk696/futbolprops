// TFF Fantezi Lig puanlaması, sıradaki maç için beklenen puan tahmini ve kadro seçimi.
// Tahmin sunucuda (derleme anında) hesaplanır; kadro seçimi tarayıcıda da çalışır.
import type { FantasyRow } from "./data";
import type { TeamData } from "./stats";
import { matchTff, type TffPlayer } from "./tff.ts";

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
  /** Resmi listeden: fiyat (milyon TL), seçilme yüzdesi ve durum. */
  cost: number;
  selected: number;
  /** Kadroya alınabilir mi (cezalı, sakat ya da oynama ihtimali düşük değilse). */
  available: boolean;
  /** Alınamıyorsa ya da şüpheliyse kısa açıklama. */
  note: string | null;
  /** Beklenen puanın kalemleri (oynama oranıyla çarpılmadan önce). */
  parts: { appearance: number; attack: number; cleanSheet: number; conceded: number; saves: number; cards: number; bonus: number };
};

export type FantasyInput = {
  id: string;
  name: string;
  img: string | null;
  pos: number;
  teamId: string;
  tff: TffPlayer;
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

    const xpParts = {
      appearance: blend(scored.map((x) => x.s.appearance)),
      attack: blend(scored.map((x) => x.s.attack)) * atk,
      cleanSheet: CLEAN_SHEET_POINTS[p.pos] * p60 * cs,
      conceded: p.pos <= 1 ? -expectedConcededPenalty(lambda) * minuteShare : 0,
      saves: blend(scored.map((x) => x.s.saves)) * clamp(opp.avgF.sot / avgSot, 0.6, 1.6),
      cards: blend(scored.map((x) => x.s.cards)),
      bonus: blend(scored.map((x) => x.bonus)) * (p.pos >= 2 ? atk : 1),
    };
    const perGame = Object.values(xpParts).reduce((a, b) => a + b, 0);
    // Resmi listedeki durum: cezalı/sakat oyuncu alınmaz; oynama ihtimali verilmişse puan onunla çarpılır.
    const chance = p.tff.chance == null ? 1 : p.tff.chance / 100;
    const available = p.tff.status === "AVAILABLE" && chance >= 0.5;
    const note = p.tff.status !== "AVAILABLE" || chance < 1 ? statusNote(p.tff) : null;

    const pts = scored.map((x) => total(x.s) + x.bonus);
    out.push({
      id: p.id, name: p.name, img: p.img, pos: p.pos,
      teamId: team.id, team: team.name, teamImg: team.img,
      opp: opp.name, home: team.next.home, date: team.next.date,
      cost: p.tff.cost, selected: p.tff.selected, available, note,
      xp: play * perGame * chance, form: mean(pts.slice(0, 5)), season: mean(pts), games: pts.length,
      play, atk, cs, parts: xpParts,
    });
  }
  return out.sort((a, b) => b.xp - a.xp);
}

const STATUS_LABEL: Record<string, string> = { SUSPENDED: "Cezalı", INJURED: "Sakat", DOUBTFUL: "Şüpheli", UNAVAILABLE: "Yok" };
function statusNote(t: TffPlayer) {
  const label = STATUS_LABEL[t.status] ?? (t.status === "AVAILABLE" ? "Şüpheli" : t.status);
  const news = t.news ? t.news.toLocaleLowerCase("tr") : null;
  return [label, news, t.chance != null ? `%${t.chance}` : null].filter(Boolean).join(" · ");
}

// Resmi kadro kuralları (tfffantezilig.com/yardim?tab=kurallar).
export const SQUAD_QUOTA = [2, 5, 5, 3];
export const BUDGET = 100;
export const MAX_PER_TEAM = 3;
// Yedeklerin puanı normalde sayılmaz; kadro seçerken küçük bir ağırlıkla hesaba katılır.
const BENCH_WEIGHT = 0.1;

export type Squad = {
  formation: [number, number, number];
  starters: Candidate[];
  /** Yedek kaleci başta, sonra üç saha oyuncusu. */
  bench: Candidate[];
  captainId: string;
  /** İlk 11'in beklenen puanı; kaptanınki iki kez sayılır. */
  xp: number;
  cost: number;
};

/** 15 kişilik kadrodan kurallara uyan en iyi 11'i seçer: 1 kaleci, en az 3 defans, en az 1 forvet. */
function lineup(squad: Candidate[], value: (c: Candidate) => number) {
  const by = [0, 1, 2, 3].map((pos) => squad.filter((c) => c.pos === pos).sort((a, b) => value(b) - value(a)));
  let best: { score: number; formation: [number, number, number] } | null = null;
  const top = (pos: number, n: number) => by[pos].slice(0, n).reduce((a, c) => a + value(c), 0);
  const all = squad.reduce((a, c) => a + value(c), 0);
  for (let d = 3; d <= 5; d++) {
    for (let f = 1; f <= 3; f++) {
      const m = 10 - d - f;
      if (m < 2 || m > 5) continue;
      const start = top(0, 1) + top(1, d) + top(2, m) + top(3, f);
      const score = start + BENCH_WEIGHT * (all - start);
      if (!best || score > best.score) best = { score, formation: [d, m, f] };
    }
  }
  return { ...best!, by };
}

/**
 * Bütçe, mevki kontenjanı ve takım sınırına uyan, değeri en yüksek 15 kişilik kadro.
 * Önce "değer − λ·fiyat" sıralamasıyla bütçeye sığan bir kadro kurulur, sonra tekli ve ikili
 * oyuncu değişimleriyle iyileşme kalmayana kadar düzeltilir (tam çözüm değil, iyi bir yaklaşık çözüm).
 */
export function pickSquad(
  candidates: Candidate[],
  value: (c: Candidate) => number = (c) => c.xp,
  allowed: (c: Candidate) => boolean = () => true,
): Squad | null {
  const pool = candidates.filter((c) => c.available && allowed(c));

  const greedy = (lambda: number) => {
    const need = [...SQUAD_QUOTA];
    const perTeam = new Map<string, number>();
    const squad: Candidate[] = [];
    for (const c of [...pool].sort((a, b) => value(b) - lambda * b.cost - (value(a) - lambda * a.cost))) {
      if (!need[c.pos] || (perTeam.get(c.teamId) ?? 0) >= MAX_PER_TEAM) continue;
      need[c.pos]--;
      perTeam.set(c.teamId, (perTeam.get(c.teamId) ?? 0) + 1);
      squad.push(c);
    }
    return squad.length === 15 ? squad : null;
  };
  const costOf = (sq: Candidate[]) => sq.reduce((a, c) => a + c.cost, 0);

  let lo = 0;
  let hi = 8;
  let squad = greedy(0);
  if (!squad) return null;
  if (costOf(squad) > BUDGET) {
    const cheap = greedy(hi);
    if (!cheap || costOf(cheap) > BUDGET) return null;
    squad = cheap;
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      const sq = greedy(mid);
      if (sq && costOf(sq) <= BUDGET) {
        hi = mid;
        squad = sq;
      } else lo = mid;
    }
  }

  const feasible = (sq: Candidate[]) => {
    if (costOf(sq) > BUDGET + 1e-9) return false;
    const perTeam = new Map<string, number>();
    for (const c of sq) {
      const n = (perTeam.get(c.teamId) ?? 0) + 1;
      if (n > MAX_PER_TEAM) return false;
      perTeam.set(c.teamId, n);
    }
    return true;
  };
  // Değişim adayları: her mevkide değeri ve fiyat başına değeri en yüksek oyuncular.
  const shortlist = [0, 1, 2, 3].map((pos) => {
    const list = pool.filter((c) => c.pos === pos);
    const a = [...list].sort((x, y) => value(y) - value(x)).slice(0, 14);
    const b = [...list].sort((x, y) => value(y) / y.cost - value(x) / x.cost).slice(0, 8);
    return [...new Set([...a, ...b])];
  });

  let score = lineup(squad, value).score;
  for (let pass = 0; pass < 40; pass++) {
    let improved = false;
    const tryReplace = (out: number[], ins: Candidate[]) => {
      const next = squad!.filter((_, i) => !out.includes(i)).concat(ins);
      if (new Set(next.map((c) => c.id)).size !== 15 || !feasible(next)) return false;
      const s = lineup(next, value).score;
      if (s <= score + 1e-9) return false;
      squad = next;
      score = s;
      return (improved = true);
    };
    for (let i = 0; i < 15; i++) {
      for (const c of shortlist[squad[i].pos]) if (tryReplace([i], [c])) break;
    }
    for (let i = 0; i < 15 && !improved; i++) {
      for (let j = i + 1; j < 15 && !improved; j++) {
        search: for (const a of shortlist[squad[i].pos]) {
          for (const b of shortlist[squad[j].pos]) if (a !== b && tryReplace([i, j], [a, b])) break search;
        }
      }
    }
    if (!improved) break;
  }

  const { formation, by } = lineup(squad, value);
  const counts = [1, ...formation];
  const starters = by.flatMap((list, pos) => list.slice(0, counts[pos]));
  const bench = by.flatMap((list, pos) => list.slice(counts[pos]));
  const captain = [...starters].sort((a, b) => b.xp - a.xp)[0];
  return {
    formation, starters, bench, captainId: captain.id,
    xp: starters.reduce((a, c) => a + c.xp, 0) + captain.xp,
    cost: costOf(squad),
  };
}

export type NamedSquad = { key: string; label: string; hint: string; squad: Squad };
/** Az seçilen oyuncu eşiği (yüzde); sürpriz kadro yalnızca bunun altındakilerden kurulur. */
export const DIFFERENTIAL_PCT = 10;

/** Ana kadro, ondan farklılaşan iki alternatif ve az seçilen oyunculardan bir sürpriz kadro. */
export function buildSquads(candidates: Candidate[]): NamedSquad[] {
  const out: NamedSquad[] = [];
  const used = new Map<string, number>(); // oyuncu -> önceki kadrolarda kaç kez yer aldı
  const add = (key: string, label: string, hint: string, squad: Squad | null, remember = true) => {
    if (!squad) return;
    out.push({ key, label, hint, squad });
    if (remember) for (const c of [...squad.starters, ...squad.bench]) used.set(c.id, (used.get(c.id) ?? 0) + 1);
  };
  // Alternatiflerde önceki kadrolarda yer alan oyuncunun değeri kırılır; böylece yakın puanlı başka isimler öne çıkar.
  const fresh = (c: Candidate) => c.xp * 0.75 ** (used.get(c.id) ?? 0);
  add("main", "En iyi kadro", "Bütçeye sığan, beklenen puanı en yüksek kadro.", pickSquad(candidates));
  add("alt1", "Alternatif 1", "Ana kadrodaki oyuncuların ağırlığı azaltılarak kurulan ikinci seçenek.", pickSquad(candidates, fresh));
  add("alt2", "Alternatif 2", "İlk iki kadrodan farklılaşan üçüncü seçenek.", pickSquad(candidates, fresh));
  add(
    "surprise", "Sürpriz kadro",
    `Yalnızca menajerlerin %${DIFFERENTIAL_PCT}'undan azının aldığı oyunculardan kurulur.`,
    pickSquad(candidates, (c) => c.xp, (c) => c.selected < DIFFERENTIAL_PCT),
    false,
  );
  return out;
}

/** Veritabanı satırlarından (en yeni maç başta) aday listesini kurar; yalnızca resmi listede bulunan oyuncular alınır. */
export function buildCandidates(rows: FantasyRow[], teams: Record<string, TeamData>, tffList: TffPlayer[]): Candidate[] {
  const seen = new Map<string, { id: string; name: string; club: string }>();
  for (const r of rows) {
    if (!seen.has(r.player_id)) seen.set(r.player_id, { id: r.player_id, name: r.name, club: teams[r.team_id]?.name ?? "" });
  }
  const tff = matchTff([...seen.values()], tffList);

  const players = new Map<string, FantasyInput>();
  const teamMatches: Record<string, string[]> = {};
  for (const r of rows) {
    const list = (teamMatches[r.team_id] ??= []);
    if (!list.includes(r.match_id)) list.push(r.match_id);
    const official = tff.get(r.player_id);
    if (!official) continue;
    let p = players.get(r.player_id);
    if (!p) {
      // Satırlar yeniden eskiye sıralı: ilk görülen takım oyuncunun güncel takımıdır. Mevki resmi listeden gelir.
      p = { id: r.player_id, name: r.name, img: r.image_url, pos: official.pos, teamId: r.team_id, tff: official, games: [] };
      players.set(r.player_id, p);
    }
    if (r.minutes == null) continue; // dakikası bilinmeyen maç puanlanamaz
    p.games.push({
      matchId: r.match_id, date: r.date, minutes: r.minutes, goals: r.goals, assists: r.assists,
      saves: r.saves, yellow: r.yellow, red: r.red, conceded: r.conceded,
    });
  }
  return project([...players.values()], teams, teamMatches);
}
