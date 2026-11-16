import { FantasyView } from "@/components/fantasy-view";
import tff from "@/lib/tff-players.json";
import { getFantasyRows, getTeams } from "@/lib/data";
import { buildCandidates, buildSquads } from "@/lib/fantasy";
import { fmtDate } from "@/lib/stats";

const LEAGUE = "Süper Lig";

export default function Page() {
  const teams = getTeams(new Date().toISOString().slice(0, 10));
  const candidates = buildCandidates(getFantasyRows(LEAGUE), teams, tff.players);
  const squads = buildSquads(candidates);

  return (
    <>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Fantezi kadro</h1>
      <p className="mb-5 text-sm text-muted">
        {LEAGUE} için TFF Fantezi Lig kurallarına göre sıradaki maçta beklenen puanı en yüksek kadrolar. Fiyat, mevki
        ve durum bilgisi resmi listeden ({fmtDate(tff.exportedAt)} tarihli).
      </p>
      <FantasyView candidates={candidates} squads={squads} />
    </>
  );
}
