// PitchAPI'den fikstürleri ve biten maçların istatistiklerini SQLite'a eşitler.
// Kullanım: node scripts/sync.mjs [--season 2025/2026] [--limit 20]
// Tekrar çalıştırmak güvenlidir: yalnızca detayı henüz çekilmemiş maçlar indirilir.
import { api } from "./api.mjs";
import { openDb } from "./db.mjs";

const LEAGUES = [
  { id: "l_4WFCIZ", name: "Premier League" },
  { id: "l_0ErfuF", name: "LaLiga" },
  { id: "l_0S1uaf", name: "Süper Lig" },
];

const args = process.argv.slice(2);
const argValue = (flag) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined);
const season = argValue("--season");
const limit = Number(argValue("--limit") ?? Infinity);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 429 ve 5xx yanıtlarında bekleyip yeniden dener.
async function get(path, attempt = 1) {
  try {
    return (await api(path)).data;
  } catch (err) {
    const status = Number(String(err.message).slice(0, 3));
    if (attempt < 5 && (status === 429 || status >= 500 || Number.isNaN(status))) {
      await sleep(attempt * 3000);
      return get(path, attempt + 1);
    }
    throw err;
  }
}

const db = openDb();

const upsertLeague = db.prepare(
  `INSERT INTO leagues (id, name, image_url) VALUES (?, ?, ?)
   ON CONFLICT(id) DO UPDATE SET name = excluded.name, image_url = excluded.image_url`,
);
const upsertTeam = db.prepare(
  `INSERT INTO teams (id, name, image_url) VALUES (?, ?, ?)
   ON CONFLICT(id) DO UPDATE SET name = excluded.name, image_url = excluded.image_url`,
);
const upsertPlayer = db.prepare(
  `INSERT INTO players (id, name, image_url) VALUES (?, ?, ?)
   ON CONFLICT(id) DO UPDATE SET name = excluded.name, image_url = excluded.image_url`,
);
const upsertMatch = db.prepare(
  `INSERT INTO matches (id, league_id, season, date, time_utc, status, home_team_id, away_team_id, score_home, score_away)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
   ON CONFLICT(id) DO UPDATE SET date = excluded.date, time_utc = excluded.time_utc, status = excluded.status,
     score_home = excluded.score_home, score_away = excluded.score_away`,
);
const setMatchDetails = db.prepare(
  `UPDATE matches SET round_name = ?, referee = ?, details_at = ? WHERE id = ?`,
);
const insertPlayerStats = db.prepare(
  `INSERT OR REPLACE INTO player_match_stats
     (match_id, player_id, team_id, minutes, goals, assists, shots, shots_on_target, fouls, was_fouled,
      corners, offsides, tackles, saves, yellow_cards, red_cards)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
);
const insertTeamStats = db.prepare(
  `INSERT OR REPLACE INTO team_match_stats
     (match_id, team_id, period, corners, fouls, yellow_cards, red_cards, shots, shots_on_target, offsides, possession)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
);

function transaction(fn) {
  db.exec("BEGIN");
  try {
    fn();
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

async function syncFixtures(league) {
  const query = new URLSearchParams({ status: "all" });
  if (season) query.set("season", season);
  const data = await get(`/v1/leagues/${league.id}/matches?${query}`);
  transaction(() => {
    upsertLeague.run(league.id, league.name, data.league.image_url ?? null);
    for (const m of data.matches) {
      for (const t of [m.home_team, m.away_team]) upsertTeam.run(t.id, t.name, t.image_url ?? null);
      upsertMatch.run(
        m.id, league.id, data.league.season, m.date, m.time_utc ?? null, m.status,
        m.home_team.id, m.away_team.id, m.score_home ?? null, m.score_away ?? null,
      );
    }
  });
  console.log(`${league.name} ${data.league.season}: ${data.matches.length} maç`);
}

// Oyuncunun gruplara dağılmış istatistiklerini { anahtar: değer } haline getirir.
function flattenPlayerStats(groups) {
  const flat = {};
  for (const group of groups) {
    for (const { key, stat } of Object.values(group.stats)) {
      if (key && stat.type !== "boolean") flat[key] = stat.value;
    }
  }
  return flat;
}

async function syncMatchDetails(matchId) {
  const [summary, players, stats, events] = await Promise.all([
    get(`/v1/matches/${matchId}`),
    get(`/v1/matches/${matchId}/players`),
    get(`/v1/matches/${matchId}/stats`),
    get(`/v1/matches/${matchId}/events`),
  ]);

  const cards = new Map(); // player_id -> { yellow, red }
  for (const e of events.events) {
    if (!e.player || (e.event_type !== "yellowcard" && e.event_type !== "redcard")) continue;
    const c = cards.get(e.player.id) ?? { yellow: 0, red: 0 };
    if (e.event_type === "yellowcard") c.yellow++;
    else c.red++;
    cards.set(e.player.id, c);
  }

  const featured = players.filter((p) => p.stats.length).map((p) => ({ ...p, s: flattenPlayerStats(p.stats) }));
  // Kaynak bazı maçlarda hiçbir oyuncu için dakika vermiyor; o maçlarda dakika NULL kalır.
  const hasMinutes = featured.some((p) => p.s.minutes_played);

  transaction(() => {
    for (const p of featured) {
      const s = p.s;
      if (hasMinutes && !s.minutes_played) continue; // oynamayan yedekler
      const c = cards.get(p.player.id) ?? { yellow: 0, red: 0 };
      // İkinci sarıdan kırmızıda kaynak bazen iki sarı olayı veriyor; oyuncu başına en çok 1 sarı sayılır.
      c.yellow = Math.min(c.yellow, 1);
      upsertPlayer.run(p.player.id, p.player.name, p.player.image_url ?? null);
      insertPlayerStats.run(
        matchId, p.player.id, p.team_id, s.minutes_played ?? null,
        s.goals ?? 0, s.assists ?? 0, s.total_shots ?? 0, s.ShotsOnTarget ?? 0,
        s.fouls ?? 0, s.was_fouled ?? 0, s.corners ?? 0, s.Offsides ?? 0,
        s["matchstats.headers.tackles"] ?? 0, s.saves ?? 0, c.yellow, c.red,
      );
    }

    for (const period of stats.periods) {
      const home = {};
      const away = {};
      for (const group of period.groups) {
        for (const item of group.items) {
          home[item.key] = item.home;
          away[item.key] = item.away;
        }
      }
      const int = (v) => (v == null || v === "" ? null : parseInt(v, 10));
      for (const [teamId, t] of [[stats.home_team.id, home], [stats.away_team.id, away]]) {
        insertTeamStats.run(
          matchId, teamId, period.period, int(t.corners), int(t.fouls), int(t.yellow_cards), int(t.red_cards),
          int(t.total_shots), int(t.ShotsOnTarget), int(t.Offsides), int(t.BallPossesion),
        );
      }
    }

    setMatchDetails.run(summary.round_name ?? null, summary.referee ?? null, new Date().toISOString(), matchId);
  });
}

for (const league of LEAGUES) await syncFixtures(league);

// Kaynak aynı fikstürü bazen iki ayrı kimlikle veriyor (Süper Lig). Aynı ev-deplasman eşleşmesinden
// oynanmış bir kayıt varsa onu, yoksa en küçük kimlikli olanı tutar.
const dupes = db
  .prepare(
    `DELETE FROM matches WHERE status = 'not_started' AND EXISTS (
       SELECT 1 FROM matches o
       WHERE o.league_id = matches.league_id AND o.season = matches.season
         AND o.home_team_id = matches.home_team_id AND o.away_team_id = matches.away_team_id
         AND o.id <> matches.id AND (o.status <> 'not_started' OR o.id < matches.id))`,
  )
  .run();
if (dupes.changes) console.log(`Çift fikstür kaydı silindi: ${dupes.changes}`);

const pending = db
  .prepare(`SELECT id FROM matches WHERE status = 'finished' AND details_at IS NULL ORDER BY date DESC`)
  .all()
  .slice(0, limit);
console.log(`Detayı çekilecek maç: ${pending.length}`);

let done = 0;
const failed = [];
for (const { id } of pending) {
  try {
    await syncMatchDetails(id);
    done++;
  } catch (err) {
    failed.push(id);
    console.log(`HATA ${id}: ${err.message.slice(0, 200)}`);
  }
  if ((done + failed.length) % 25 === 0) console.log(`  ${done + failed.length}/${pending.length}`);
  await sleep(250);
}
console.log(`Bitti: ${done} maç işlendi, ${failed.length} hata.`);
