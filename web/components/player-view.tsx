"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  STATS, autoLine, fmt1, fmtDate, fmtPct, hitRate, mean, median,
  type Game, type PlayerData, type Side, type TeamData,
} from "@/lib/stats";
import { Avatar, Field, Seg } from "./ui";

type Venue = "all" | "home" | "away";

export function PlayerView({
  player,
  team,
  opp,
  teamNames,
}: {
  player: PlayerData;
  /** Oyuncunun takımı ve sıradaki rakibi. */
  team?: TeamData;
  opp?: TeamData;
  /** Maç dökümündeki rakiplerin adları; sayfa boyutu küçük kalsın diye yalnızca adlar gelir. */
  teamNames: Record<string, string>;
}) {
  const initialKey = useSearchParams().get("stat");
  const [si, setSi] = useState(() => Math.max(0, STATS.findIndex((s) => s.key === initialKey)));
  const [side, setSide] = useState<Side>("over");
  const [range, setRange] = useState(10);
  const [venue, setVenue] = useState<Venue>("all");
  // İstatistik başına elle seçilmiş çizgi; yoksa otomatik çizgi kullanılır.
  const [manual, setManual] = useState<Record<number, number>>({});

  const stat = STATS[si];

  const auto = autoLine(player.games.map((g) => g.v[si]));
  const line = manual[si] ?? auto;
  const setLine = (v: number) => setManual((m) => ({ ...m, [si]: Math.max(0.5, v) }));

  const pool = player.games.filter((g) => venue === "all" || (venue === "home") === g.home);
  const shown = pool.slice(0, range);
  const values = shown.map((g) => g.v[si]);
  const rate = hitRate(values, line, side);
  const minutes = shown.flatMap((g) => (g.min == null ? [] : [g.min]));

  const oppVal = opp && (stat.oppSide === "A" ? opp.avgA : opp.avgF)[stat.oppKey];
  const oppRank = opp && (stat.oppSide === "A" ? opp.rankA : opp.rankF)[stat.oppKey];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-4">
        <Avatar src={player.img} size={64} />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{player.name}</h1>
          <p className="flex items-center gap-2 text-sm text-muted">
            {team && <Avatar src={team.img} size={18} round={false} />}
            {team?.name}
            {team?.next && opp && (
              <span>
                · Sıradaki: {opp.name} ({team.next.home ? "iç saha" : "deplasman"}, {fmtDate(team.next.date)})
              </span>
            )}
          </p>
        </div>
      </div>

      <Seg label="İstatistik" value={si} onChange={setSi} options={STATS.map((s, i) => ({ value: i, label: s.label }))} />

      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <Field label="Çizgi">
          <div className="inline-flex h-9 items-center rounded-lg bg-surface ring-1 ring-hair">
            <button type="button" aria-label="Çizgiyi düşür" onClick={() => setLine(line - 1)} className="h-full px-3 text-muted hover:text-ink">−</button>
            <span className="min-w-10 text-center text-sm font-medium text-ink">{fmt1(line)}</span>
            <button type="button" aria-label="Çizgiyi yükselt" onClick={() => setLine(line + 1)} className="h-full px-3 text-muted hover:text-ink">+</button>
          </div>
        </Field>
        {manual[si] != null && manual[si] !== auto && (
          <button
            type="button"
            onClick={() => setManual(({ [si]: _, ...rest }) => rest)}
            className="h-9 text-sm text-muted underline-offset-2 hover:text-ink hover:underline"
          >
            Otomatiğe dön ({fmt1(auto)})
          </button>
        )}
        <Field label="Yön">
          <Seg label="Yön" value={side} onChange={setSide} options={[{ value: "over", label: "Üst" }, { value: "under", label: "Alt" }]} />
        </Field>
        <Field label="Maç sayısı">
          <Seg
            label="Maç sayısı"
            value={range}
            onChange={setRange}
            options={[{ value: 5, label: "Son 5" }, { value: 10, label: "Son 10" }, { value: 20, label: "Son 20" }, { value: 999, label: "Tümü" }]}
          />
        </Field>
        <Field label="Saha">
          <Seg
            label="Saha"
            value={venue}
            onChange={setVenue}
            options={[{ value: "all", label: "Hepsi" }, { value: "home", label: "İç saha" }, { value: "away", label: "Deplasman" }]}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label={`${side === "over" ? "Üst" : "Alt"} ${fmt1(line)} isabet`} value={rate.n ? fmtPct(rate.pct) : "–"} sub={`${rate.hit}/${rate.n} maç`} />
        <Tile label="Ortalama" value={rate.n ? fmt1(mean(values)) : "–"} sub={`Medyan ${fmt1(median(values))}`} />
        <Tile label="Ortalama dakika" value={minutes.length ? String(Math.round(mean(minutes))) : "–"} sub={`${shown.length} maç`} />
        <Tile
          label={stat.oppLabel}
          value={oppVal != null ? fmt1(oppVal) : "–"}
          sub={opp ? `${opp.name} · ligde ${oppRank}/${opp.leagueSize}` : "Sıradaki maç yok"}
        />
      </div>

      <section className="rounded-xl bg-surface p-4 ring-1 ring-hair">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-medium">{stat.label} · maç maç</h2>
          <ul className="flex gap-4 text-xs text-muted">
            <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-good" aria-hidden />Tuttu</li>
            <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-bad" aria-hidden />Tutmadı</li>
            <li className="flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed border-ink" aria-hidden />Çizgi {fmt1(line)}</li>
          </ul>
        </div>
        {shown.length ? (
          <BarChart games={[...shown].reverse()} si={si} line={line} side={side} teamNames={teamNames} label={stat.label} />
        ) : (
          <p className="py-10 text-center text-sm text-muted">Bu süzgeçte maç yok.</p>
        )}
      </section>

      <section className="overflow-x-auto rounded-xl bg-surface ring-1 ring-hair">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-hair text-xs text-muted">
            <tr>
              <th scope="col" className="px-3 py-2.5 text-left font-medium">Tarih</th>
              <th scope="col" className="px-3 py-2.5 text-left font-medium">Rakip</th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">Dk</th>
              {STATS.map((s, i) => (
                <th key={s.key} scope="col" className={`px-3 py-2.5 text-right font-medium ${i === si ? "text-ink" : ""}`}>{s.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pool.map((g) => (
              <tr key={g.date + g.oppId} className="border-b border-hair/60 last:border-0">
                <td className="px-3 py-2 text-muted">{fmtDate(g.date)} {g.date.slice(0, 4)}</td>
                <td className="px-3 py-2">
                  {teamNames[g.oppId] ?? "–"} <span className="text-xs text-muted">{g.home ? "İç saha" : "Deplasman"}</span>
                </td>
                <td className="px-3 py-2 text-right text-muted">{g.min ?? "–"}</td>
                {g.v.map((v, i) => (
                  <td key={i} className={`px-3 py-2 text-right ${i === si ? "font-medium text-ink" : "text-muted"}`}>{v}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl bg-surface p-4 ring-1 ring-hair">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-0.5 text-xs text-muted">{sub}</p>
    </div>
  );
}

const shortName = (name: string) => name.replace(/^(FC|CF|AFC|RCD|RC|CA|UD|SD) /, "").slice(0, 3).toLocaleUpperCase("tr");

/** Eskiden yeniye maç başına bir çubuk; çizginin tuttuğu maçlar yeşil, tutmayanlar kırmızı. */
function BarChart({
  games, si, line, side, teamNames, label,
}: {
  games: Game[];
  si: number;
  line: number;
  side: Side;
  teamNames: Record<string, string>;
  label: string;
}) {
  const top = Math.max(...games.map((g) => g.v[si]), Math.ceil(line), 1);
  const step = top <= 6 ? 1 : top <= 12 ? 2 : Math.ceil(top / 5);
  const max = Math.ceil(top / step) * step;
  const ticks = Array.from({ length: max / step + 1 }, (_, i) => i * step);
  const pct = (v: number) => `${(v / max) * 100}%`;

  return (
    <div className="flex gap-2">
      <div className="relative h-56 w-5 shrink-0 text-right text-[11px] text-faint" aria-hidden>
        {ticks.map((t) => (
          <span key={t} className="absolute right-0 translate-y-1/2" style={{ bottom: pct(t) }}>{t}</span>
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <div className="relative h-56 border-b border-[#383835]" role="img" aria-label={`${label}, son ${games.length} maç; çizgi ${fmt1(line)}`}>
          {ticks.slice(1).map((t) => (
            <div key={t} className="absolute inset-x-0 border-t border-grid" style={{ bottom: pct(t) }} />
          ))}
          <div className="absolute inset-0 flex items-end justify-around gap-0.5">
            {games.map((g) => {
              const v = g.v[si];
              const hit = side === "over" ? v > line : v < line;
              const opp = teamNames[g.oppId] ?? "?";
              return (
                <div key={g.date + g.oppId} className="group relative flex h-full max-w-12 flex-1 items-end justify-center">
                  <div
                    className={`w-full max-w-9 rounded-t ${hit ? "bg-good" : "bg-bad"} opacity-90 group-hover:opacity-100`}
                    style={{ height: v ? pct(v) : 3 }}
                  />
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 hidden w-max -translate-x-1/2 translate-y-10 rounded-lg bg-raised px-3 py-2 text-xs shadow-lg ring-1 ring-hair group-hover:block">
                    <p className="font-medium text-ink">{label}: {v} · {hit ? "tuttu" : "tutmadı"}</p>
                    <p className="text-muted">{opp} ({g.home ? "iç saha" : "deplasman"})</p>
                    <p className="text-muted">{fmtDate(g.date)} {g.date.slice(0, 4)}{g.min != null && ` · ${g.min} dk`}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="pointer-events-none absolute inset-x-0 border-t-2 border-dashed border-ink" style={{ bottom: pct(line) }} />
        </div>
        <div className="mt-1.5 flex justify-around gap-0.5 text-[10px] text-faint" aria-hidden>
          {games.map((g) => (
            <span key={g.date + g.oppId} className="max-w-12 flex-1 truncate text-center">
              {shortName(teamNames[g.oppId] ?? "?")}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
