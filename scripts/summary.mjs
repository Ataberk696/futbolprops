// Veritabanındaki lig başına maç sayılarını yazdırır. İş akışının sonunda çalışır;
// böylece günlük eşitlemenin sonucu günlüğün en altında tek bakışta görülür.
import { openDb } from "./db.mjs";

const rows = openDb()
  .prepare(
    `SELECT l.name AS lig, m.season AS sezon, count(*) AS mac,
       sum(m.status = 'finished') AS biten, sum(m.details_at IS NOT NULL) AS detayli,
       sum(m.status = 'not_started') AS siradaki, max(CASE WHEN m.status = 'finished' THEN m.date END) AS son_mac,
       (SELECT count(DISTINCT s.player_id) FROM player_match_stats s JOIN matches x ON x.id = s.match_id
        WHERE x.league_id = m.league_id AND x.season = m.season) AS oyuncu
     FROM matches m JOIN leagues l ON l.id = m.league_id
     GROUP BY m.league_id, m.season ORDER BY l.name, m.season`,
  )
  .all();
console.table(rows.map((r) => ({ ...r })));
