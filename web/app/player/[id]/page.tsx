import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PlayerView } from "@/components/player-view";
import { getPlayer, getPlayers, getTeams } from "@/lib/data";

export const dynamicParams = false;

export function generateStaticParams() {
  return getPlayers(1).map((p) => ({ id: p.id }));
}

export default async function Page({ params }: PageProps<"/player/[id]">) {
  const { id } = await params;
  const player = getPlayer(id);
  if (!player) notFound();
  const teams = getTeams(new Date().toISOString().slice(0, 10));
  const team = teams[player.teamId];
  const opp = team?.next ? teams[team.next.oppId] : undefined;
  const teamNames = Object.fromEntries(player.games.map((g) => [g.oppId, teams[g.oppId]?.name ?? "?"]));
  return (
    <>
      <Link href="/" className="mb-4 inline-block text-sm text-muted hover:text-ink">← Oyuncu propları</Link>
      {/* PlayerView adres çubuğundaki ?stat= değerini okuduğu için Suspense içinde olmalı. */}
      <Suspense fallback={<p className="text-sm text-muted">Yükleniyor…</p>}>
        <PlayerView player={player} team={team} opp={opp} teamNames={teamNames} />
      </Suspense>
    </>
  );
}
