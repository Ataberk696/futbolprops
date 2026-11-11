import { PropsTable } from "@/components/props-table";
import { getLeagues, getPlayers, getTeams } from "@/lib/data";

export default function Page() {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Oyuncu propları</h1>
      <p className="mb-5 text-sm text-muted">
        Sıradaki maçı olan oyuncular için seçili çizginin son maçlarda kaç kez tuttuğu.
      </p>
      <PropsTable players={getPlayers()} teams={getTeams(today)} leagues={getLeagues()} />
    </>
  );
}
