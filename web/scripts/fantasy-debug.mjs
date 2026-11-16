// Fantezi kadro hesabının dökümünü yazdırır (iş akışı günlüğünden denetlemek için).
// web klasöründen çalıştırılır: node scripts/fantasy-debug.mjs
import { getFantasyRows, getTeams } from "../lib/data.ts";
import { buildCandidates, pickSquad, POS_SHORT } from "../lib/fantasy.ts";

const teams = getTeams(new Date().toISOString().slice(0, 10));
const rows = getFantasyRows("Süper Lig");
const candidates = buildCandidates(rows, teams);
const f = (n) => n.toFixed(1);

const league = Object.values(teams).filter((t) => t.leagueId === Object.values(teams).find((x) => x.name === candidates[0]?.team)?.leagueId);
console.log("TAKIMLAR (maç, attığı, yediği, sıradaki rakip)");
for (const t of league.sort((a, b) => b.avgF.goals - b.avgA.goals - (a.avgF.goals - a.avgA.goals))) {
  const next = t.next ? `${t.next.home ? "" : "@"}${teams[t.next.oppId]?.name} ${t.next.date}` : "-";
  console.log(`  ${t.name.padEnd(24)} ${String(t.n).padStart(2)} ${f(t.avgF.goals)} ${f(t.avgA.goals)}  ${next}`);
}

const line = (c) =>
  `  ${POS_SHORT[c.pos]} ${c.name.slice(0, 22).padEnd(22)} ${c.team.slice(0, 14).padEnd(14)} ${(c.home ? "" : "@") + c.opp.slice(0, 13)}`.padEnd(60) +
  ` xp ${f(c.xp)} | oyn ${f(c.parts.appearance)} hücum ${f(c.parts.attack)} cs ${f(c.parts.cleanSheet)} yenen ${f(c.parts.conceded)}` +
  ` kurt ${f(c.parts.saves)} kart ${f(c.parts.cards)} bonus ${f(c.parts.bonus)} | play ${f(c.play)} atk ${f(c.atk)} csP ${f(c.cs)} son5 ${f(c.form)} sezon ${f(c.season)} maç ${c.games}`;

const squad = pickSquad(candidates, null, 3);
if (squad) {
  console.log(`KADRO ${squad.formation.join("-")} toplam ${f(squad.xp)}`);
  for (const c of squad.starters) console.log(line(c));
  console.log("YEDEKLER");
  for (const c of [squad.gkBench, ...squad.bench]) if (c) console.log(line(c));
}
console.log("İLK 40 ADAY");
for (const c of candidates.slice(0, 40)) console.log(line(c));
