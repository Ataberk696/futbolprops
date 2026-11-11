// Sunucu tarafı SQLite sorguları. Veritabanını scripts/sync.mjs doldurur.
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import type { Agg, AggKey, Game, League, PlayerData, TeamData } from "./stats";

const DB_PATH = path.join(process.cwd(), "..", "data", "props.db");
const AGG_KEYS: AggKey[] = ["shots", "sot", "fouls", "cards", "corners", "goals"];

function query<T>(sql: string, ...params: (string | number)[]): T[] {
  const db = new DatabaseSync(DB_PATH, { readOnly: true });
  try {
    // node:sqlite prototipsiz nesneler döndürür; istemci bileşenlerine geçebilmeleri için düz nesneye çevrilir.
    return db.prepare(sql).all(...params).map((row) => ({ ...row })) as T[];
  } finally {
    db.close();
  }
}

// Takım ortalamaları her ligin yalnızca en güncel sezonundan hesaplanır.
const CURRENT_SEASON = `WITH cur AS (SELECT league_id, max(season) AS season FROM matches GROUP BY league_id)`;

export function getLeagues(): League[] {
  return query<League>(`SELECT id, name FROM leagues ORDER BY name`);
}

export type TeamMatch = {
  league_id: string;
  date: string;
  team_id: string;
  opp_id: string;
  f: Agg;
  a: Agg;
};

type TeamMatchRow = {
  league_id: string;
  date: string;
  team_id: string;
  opp_id: string;
} & Record<`f_${AggKey}` | `a_${AggKey}`, number | null>;

/** Güncel sezonda her takımın her maçı: kendi (f) ve rakibinin (a) değerleri. En yeni başta. */
export function getTeamMatches(): TeamMatch[] {
  const side = (alias: string, prefix: string, isHome: string) => `
    ${alias}.shots AS ${prefix}_shots, ${alias}.shots_on_target AS ${prefix}_sot, ${alias}.fouls AS ${prefix}_fouls,
    coalesce(${alias}.yellow_cards, 0) + coalesce(${alias}.red_cards, 0) AS ${prefix}_cards,
    ${alias}.corners AS ${prefix}_corners,
    CASE WHEN ${isHome} THEN m.score_home ELSE m.score_away END AS ${prefix}_goals`;
  const rows = query<TeamMatchRow>(
    `${CURRENT_SEASON}
     SELECT m.league_id, m.date, t.team_id, o.team_id AS opp_id,
       ${side("t", "f", "m.home_team_id = t.team_id")},
       ${side("o", "a", "m.home_team_id = o.team_id")}
     FROM team_match_stats t
     JOIN team_match_stats o ON o.match_id = t.match_id AND o.team_id <> t.team_id AND o.period = 'All'
     JOIN matches m ON m.id = t.match_id
     JOIN cur ON cur.league_id = m.league_id AND cur.season = m.season
     WHERE t.period = 'All'
     ORDER BY m.date DESC, m.time_utc DESC`,
  );
  return rows.map((r) => ({
    league_id: r.league_id,
    date: r.date,
    team_id: r.team_id,
    opp_id: r.opp_id,
    f: Object.fromEntries(AGG_KEYS.map((k) => [k, r[`f_${k}`] ?? 0])) as Agg,
    a: Object.fromEntries(AGG_KEYS.map((k) => [k, r[`a_${k}`] ?? 0])) as Agg,
  }));
}

export function getTeams(today: string): Record<string, TeamData> {
  const teams: Record<string, TeamData> = {};
  const zero = () => Object.fromEntries(AGG_KEYS.map((k) => [k, 0])) as Agg;

  const teamRows = query<{ id: string; name: string; image_url: string | null; league_id: string }>(
    `${CURRENT_SEASON}
     SELECT DISTINCT t.id, t.name, t.image_url, m.league_id
     FROM teams t
     JOIN matches m ON m.home_team_id = t.id
     JOIN cur ON cur.league_id = m.league_id AND cur.season = m.season`,
  );
  for (const t of teamRows) {
    teams[t.id] = {
      id: t.id, name: t.name, img: t.image_url, leagueId: t.league_id, n: 0, next: null,
      avgF: zero(), avgA: zero(), rankF: zero(), rankA: zero(), leagueSize: 0, recent: "",
    };
  }

  const dates: Record<string, string[]> = {};
  for (const m of getTeamMatches()) {
    const t = teams[m.team_id];
    if (!t) continue;
    t.n++;
    (dates[t.id] ??= []).push(m.date);
    for (const k of AGG_KEYS) {
      t.avgF[k] += m.f[k];
      t.avgA[k] += m.a[k];
    }
  }
  for (const t of Object.values(teams)) {
    for (const k of AGG_KEYS) {
      t.avgF[k] = t.n ? t.avgF[k] / t.n : 0;
      t.avgA[k] = t.n ? t.avgA[k] / t.n : 0;
    }
    const d = dates[t.id] ?? [];
    t.recent = d[Math.min(2, d.length - 1)] ?? "";
  }

  const byLeague = new Map<string, TeamData[]>();
  for (const t of Object.values(teams)) {
    byLeague.set(t.leagueId, [...(byLeague.get(t.leagueId) ?? []), t]);
  }
  for (const group of byLeague.values()) {
    for (const k of AGG_KEYS) {
      [...group].sort((x, y) => y.avgF[k] - x.avgF[k]).forEach((t, i) => (t.rankF[k] = i + 1));
      [...group].sort((x, y) => y.avgA[k] - x.avgA[k]).forEach((t, i) => (t.rankA[k] = i + 1));
    }
    for (const t of group) t.leagueSize = group.length;
  }

  const fixtures = query<{ date: string; home_team_id: string; away_team_id: string }>(
    `SELECT date, home_team_id, away_team_id FROM matches
     WHERE status = 'not_started' AND date >= ? ORDER BY date, time_utc`,
    today,
  );
  for (const f of fixtures) {
    const home = teams[f.home_team_id];
    const away = teams[f.away_team_id];
    if (home && !home.next) home.next = { oppId: f.away_team_id, home: true, date: f.date };
    if (away && !away.next) away.next = { oppId: f.home_team_id, home: false, date: f.date };
  }
  return teams;
}

type PlayerRow = {
  player_id: string;
  name: string;
  image_url: string | null;
  team_id: string;
  date: string;
  home_team_id: string;
  away_team_id: string;
  minutes: number | null;
  shots: number;
  sot: number;
  fouls: number;
  was_fouled: number;
  cards: number;
  goals: number;
  assists: number;
};

// Sütun sırası lib/stats.ts içindeki STATS ile aynı olmalı.
const PLAYER_SQL = `
  SELECT s.player_id, p.name, p.image_url, s.team_id, m.date, m.home_team_id, m.away_team_id, s.minutes,
    s.shots, s.shots_on_target AS sot, s.fouls, s.was_fouled,
    min(1, s.yellow_cards + s.red_cards) AS cards, s.goals, s.assists
  FROM player_match_stats s
  JOIN players p ON p.id = s.player_id
  JOIN matches m ON m.id = s.match_id`;

function toGame(r: PlayerRow): Game {
  const home = r.home_team_id === r.team_id;
  return {
    date: r.date,
    oppId: home ? r.away_team_id : r.home_team_id,
    home,
    min: r.minutes,
    v: [r.shots, r.sot, r.fouls, r.was_fouled, r.cards, r.goals, r.assists],
  };
}

/** Tüm oyuncular, oyuncu başına en çok maxGames maç. Takım = oyuncunun son maçındaki takımı. */
export function getPlayers(maxGames = 30): PlayerData[] {
  const rows = query<PlayerRow>(`${PLAYER_SQL} ORDER BY m.date DESC, m.time_utc DESC`);
  const players = new Map<string, PlayerData>();
  for (const r of rows) {
    let p = players.get(r.player_id);
    if (!p) {
      p = { id: r.player_id, name: r.name, img: r.image_url, teamId: r.team_id, games: [] };
      players.set(r.player_id, p);
    }
    if (p.games.length < maxGames) p.games.push(toGame(r));
  }
  return [...players.values()];
}

export function getPlayer(id: string): PlayerData | null {
  const rows = query<PlayerRow>(`${PLAYER_SQL} WHERE s.player_id = ? ORDER BY m.date DESC, m.time_utc DESC`, id);
  if (!rows.length) return null;
  return { id, name: rows[0].name, img: rows[0].image_url, teamId: rows[0].team_id, games: rows.map(toGame) };
}

export type RefereeMatch = { referee: string; league_id: string; yellow: number; red: number; fouls: number };

export function getRefereeMatches(): RefereeMatch[] {
  return query<RefereeMatch>(
    `SELECT m.referee, m.league_id,
       sum(coalesce(t.yellow_cards, 0)) AS yellow, sum(coalesce(t.red_cards, 0)) AS red,
       sum(coalesce(t.fouls, 0)) AS fouls
     FROM matches m
     JOIN team_match_stats t ON t.match_id = m.id AND t.period = 'All'
     WHERE m.referee IS NOT NULL
     GROUP BY m.id`,
  );
}
