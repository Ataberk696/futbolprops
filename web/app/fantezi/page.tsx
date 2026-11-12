import { FantasyView } from "@/components/fantasy-view";
import { getFantasyRows, getTeams } from "@/lib/data";
import { project, type FantasyInput } from "@/lib/fantasy";

const LEAGUE = "Süper Lig";

export default function Page() {
  const rows = getFantasyRows(LEAGUE);
  const teams = getTeams(new Date().toISOString().slice(0, 10));

  const players = new Map<string, FantasyInput>();
  const teamMatches: Record<string, string[]> = {};
  for (const r of rows) {
    const list = (teamMatches[r.team_id] ??= []);
    if (!list.includes(r.match_id)) list.push(r.match_id);
    if (r.position == null || r.position < 0 || r.position > 3) continue;
    let p = players.get(r.player_id);
    if (!p) {
      // Satırlar yeniden eskiye sıralı: ilk görülen takım oyuncunun güncel takımıdır.
      p = { id: r.player_id, name: r.name, img: r.image_url, pos: r.position, teamId: r.team_id, games: [] };
      players.set(r.player_id, p);
    }
    if (r.minutes == null) continue; // dakikası bilinmeyen maç puanlanamaz
    p.games.push({
      matchId: r.match_id, date: r.date, minutes: r.minutes, goals: r.goals, assists: r.assists,
      saves: r.saves, yellow: r.yellow, red: r.red, conceded: r.conceded,
    });
  }
  const candidates = project([...players.values()], teams, teamMatches);

  return (
    <>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Fantezi kadro</h1>
      <p className="mb-5 text-sm text-muted">
        {LEAGUE} için TFF Fantezi Lig puanlamasına göre sıradaki maçta beklenen puanı en yüksek kadro.
      </p>
      <FantasyView candidates={candidates} />
    </>
  );
}
