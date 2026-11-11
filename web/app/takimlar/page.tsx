import { DataTable, type Column, type DataRow } from "@/components/data-table";
import { getLeagues, getTeamMatches, getTeams } from "@/lib/data";
import { mean } from "@/lib/stats";

const CORNER_LINES = [8.5, 9.5, 10.5];

const COLUMNS: Column[] = [
  { key: "name", label: "Takım", kind: "text" },
  { key: "n", label: "Maç", kind: "int" },
  { key: "cornersF", label: "Korner", kind: "num", title: "Maç başına kullandığı korner" },
  { key: "cornersA", label: "Rakip korner", kind: "num", title: "Maç başına rakibin kullandığı korner" },
  { key: "cornersT", label: "Toplam korner", kind: "num", title: "Maç başına iki takımın toplam korneri" },
  ...CORNER_LINES.map((l): Column => ({
    key: `c${l}`, label: `Ü ${String(l).replace(".", ",")}`, kind: "pct",
    title: `Toplam kornerin ${l} üstünde bittiği maçların oranı`,
  })),
  { key: "cardsF", label: "Kart", kind: "num", title: "Maç başına gördüğü kart" },
  { key: "cardsA", label: "Rakip kart", kind: "num", title: "Maç başına rakibin gördüğü kart" },
  { key: "foulsF", label: "Faul", kind: "num", title: "Maç başına yaptığı faul" },
  { key: "foulsA", label: "Rakip faul", kind: "num", title: "Maç başına rakibin yaptığı faul" },
  { key: "shotsF", label: "Şut", kind: "num", title: "Maç başına şut" },
  { key: "shotsA", label: "Yediği şut", kind: "num", title: "Maç başına rakibin şutu" },
];

export default function Page() {
  return (
    <>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Takımlar</h1>
      <p className="mb-5 text-sm text-muted">Güncel sezonda maç başı korner, kart, faul ve şut ortalamaları.</p>
      <Content />
    </>
  );
}

function Content() {
  const teams = getTeams(new Date().toISOString().slice(0, 10));
  const totals = new Map<string, number[]>();
  for (const m of getTeamMatches()) {
    totals.set(m.team_id, [...(totals.get(m.team_id) ?? []), m.f.corners + m.a.corners]);
  }
  const rows: DataRow[] = Object.values(teams).map((t) => {
    const corners = totals.get(t.id) ?? [];
    return {
      id: t.id, leagueId: t.leagueId, img: t.img, name: t.name, n: t.n,
      cornersF: t.avgF.corners, cornersA: t.avgA.corners, cornersT: mean(corners),
      ...Object.fromEntries(
        CORNER_LINES.map((l) => [`c${l}`, corners.length ? corners.filter((c) => c > l).length / corners.length : null]),
      ),
      cardsF: t.avgF.cards, cardsA: t.avgA.cards,
      foulsF: t.avgF.fouls, foulsA: t.avgA.fouls,
      shotsF: t.avgF.shots, shotsA: t.avgA.shots,
    };
  });
  return <DataTable columns={COLUMNS} rows={rows} leagues={getLeagues()} initialSort="cornersT" />;
}
