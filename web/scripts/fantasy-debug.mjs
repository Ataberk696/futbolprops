// Fantezi kadro hesabının dökümünü yazdırır (iş akışı günlüğünden denetlemek için).
// web klasöründen çalıştırılır: node scripts/fantasy-debug.mjs
import { getFantasyRows, getTeams } from "../lib/data.ts";
import { readFileSync } from "node:fs";
import { buildCandidates, buildSquads, POS_SHORT } from "../lib/fantasy.ts";

const teams = getTeams(new Date().toISOString().slice(0, 10));
const rows = getFantasyRows("Süper Lig");
const tff = JSON.parse(readFileSync(new URL("../data/tff-players.json", import.meta.url), "utf8"));
const candidates = buildCandidates(rows, teams, tff.players);
console.log(`Resmi listeyle eşleşen aday: ${candidates.length}`);
const f = (n) => n.toFixed(1);

const league = Object.values(teams).filter((t) => t.leagueId === Object.values(teams).find((x) => x.name === candidates[0]?.team)?.leagueId);
console.log("TAKIMLAR (maç, attığı, yediği, sıradaki rakip)");
for (const t of league.sort((a, b) => b.avgF.goals - b.avgA.goals - (a.avgF.goals - a.avgA.goals))) {
  const next = t.next ? `${t.next.home ? "" : "@"}${teams[t.next.oppId]?.name} ${t.next.date}` : "-";
  console.log(`  ${t.name.padEnd(24)} ${String(t.n).padStart(2)} ${f(t.avgF.goals)} ${f(t.avgA.goals)}  ${next}`);
}

const line = (c) =>
  `  ${POS_SHORT[c.pos]} ${c.name.slice(0, 22).padEnd(22)} ${c.team.slice(0, 14).padEnd(14)} ${(c.home ? "" : "@") + c.opp.slice(0, 13)}`.padEnd(60) +
  ` xp ${f(c.xp)} ${f(c.cost)}M %${f(c.selected)} | oyn ${f(c.parts.appearance)} hücum ${f(c.parts.attack)} cs ${f(c.parts.cleanSheet)} yenen ${f(c.parts.conceded)}` +
  ` kurt ${f(c.parts.saves)} kart ${f(c.parts.cards)} bonus ${f(c.parts.bonus)} | play ${f(c.play)} atk ${f(c.atk)} csP ${f(c.cs)} son5 ${f(c.form)} sezon ${f(c.season)} maç ${c.games}`;

for (const { label, squad } of buildSquads(candidates)) {
  console.log(`${label.toUpperCase()} ${squad.formation.join("-")} beklenen ${f(squad.xp)} fiyat ${f(squad.cost)}`);
  for (const c of squad.starters) console.log(line(c) + (c.id === squad.captainId ? " (K)" : ""));
  console.log(" yedek: " + squad.bench.map((c) => `${POS_SHORT[c.pos]} ${c.name} ${f(c.xp)}/${f(c.cost)}M`).join(", "));
}
console.log("ALINAMAYANLAR: " + candidates.filter((c) => !c.available).map((c) => `${c.name} (${c.note})`).join("; "));
console.log("İLK 25 ADAY");
for (const c of candidates.slice(0, 25)) console.log(line(c));
