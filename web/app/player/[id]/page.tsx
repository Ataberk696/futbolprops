import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { PlayerView } from "@/components/player-view";
import { getPlayer, getTeams } from "@/lib/data";
import { STATS } from "@/lib/stats";

export default function Page(props: PageProps<"/player/[id]">) {
  return (
    <>
      <Link href="/" className="mb-4 inline-block text-sm text-muted hover:text-ink">← Oyuncu propları</Link>
      <Suspense fallback={<p className="text-sm text-muted">Yükleniyor…</p>}>
        <Content {...props} />
      </Suspense>
    </>
  );
}

async function Content({ params, searchParams }: PageProps<"/player/[id]">) {
  await connection();
  const { id } = await params;
  const { stat } = await searchParams;
  const player = getPlayer(id);
  if (!player) notFound();
  const today = new Date().toISOString().slice(0, 10);
  const initialStat = Math.max(0, STATS.findIndex((s) => s.key === stat));
  return <PlayerView player={player} teams={getTeams(today)} initialStat={initialStat} />;
}
