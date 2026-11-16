import { FantasyView } from "@/components/fantasy-view";
import { getFantasyRows, getTeams } from "@/lib/data";
import { buildCandidates } from "@/lib/fantasy";

const LEAGUE = "Süper Lig";

export default function Page() {
  const teams = getTeams(new Date().toISOString().slice(0, 10));
  const candidates = buildCandidates(getFantasyRows(LEAGUE), teams);

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
