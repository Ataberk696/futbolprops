import { DataTable, type Column, type DataRow } from "@/components/data-table";
import { getLeagues, getRefereeMatches, type RefereeMatch } from "@/lib/data";
import { mean } from "@/lib/stats";

const CARD_LINES = [3.5, 4.5, 5.5];

const COLUMNS: Column[] = [
  { key: "name", label: "Hakem", kind: "text" },
  { key: "n", label: "Maç", kind: "int" },
  { key: "cards", label: "Kart", kind: "num", title: "Maç başına toplam kart (sarı + kırmızı)" },
  { key: "yellow", label: "Sarı", kind: "num", title: "Maç başına sarı kart" },
  { key: "red", label: "Kırmızı", kind: "num", title: "Maç başına kırmızı kart" },
  ...CARD_LINES.map((l): Column => ({
    key: `k${l}`, label: `Ü ${String(l).replace(".", ",")}`, kind: "pct",
    title: `Toplam kartın ${l} üstünde bittiği maçların oranı`,
  })),
  { key: "fouls", label: "Faul", kind: "num", title: "Maç başına toplam faul" },
];

export default function Page() {
  return (
    <>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Hakemler</h1>
      <p className="mb-5 text-sm text-muted">
        Hakemlerin yönettiği maçlarda kart ve faul ortalamaları. İkinci sarıdan çıkan kırmızıda sarı kart sayılmaz.
      </p>
      <Content />
    </>
  );
}

function Content() {
  const groups = new Map<string, RefereeMatch[]>();
  for (const m of getRefereeMatches()) {
    const key = `${m.league_id}|${m.referee}`;
    groups.set(key, [...(groups.get(key) ?? []), m]);
  }
  const rows: DataRow[] = [...groups].map(([key, ms]) => {
    const cards = ms.map((m) => m.yellow + m.red);
    return {
      id: key, leagueId: ms[0].league_id, name: ms[0].referee, n: ms.length,
      cards: mean(cards), yellow: mean(ms.map((m) => m.yellow)), red: mean(ms.map((m) => m.red)),
      ...Object.fromEntries(CARD_LINES.map((l) => [`k${l}`, cards.filter((c) => c > l).length / cards.length])),
      fouls: mean(ms.map((m) => m.fouls)),
    };
  });
  return <DataTable columns={COLUMNS} rows={rows} leagues={getLeagues()} initialSort="n" />;
}
