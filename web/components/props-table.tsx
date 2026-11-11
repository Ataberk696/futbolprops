"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  STATS, autoLine, fmt1, fmtDate, hitRate, mean,
  type League, type PlayerData, type Rate, type Side, type TeamData,
} from "@/lib/stats";
import { Avatar, Field, RatePill, Seg, inputClass } from "./ui";

type SortKey = "name" | "line" | "avg" | "l5" | "l10" | "all" | "opp";
type Row = {
  p: PlayerData;
  team: TeamData;
  opp: TeamData;
  home: boolean;
  date: string;
  line: number;
  avg: number;
  l5: Rate;
  l10: Rate;
  all: Rate;
  oppVal: number;
  oppRank: number;
};

const LINE_OPTIONS = ["auto", "0.5", "1.5", "2.5", "3.5", "4.5"] as const;
const PAGE = 100;

export function PropsTable({
  players,
  teams,
  leagues,
}: {
  players: PlayerData[];
  teams: Record<string, TeamData>;
  leagues: League[];
}) {
  const [league, setLeague] = useState("all");
  const [si, setSi] = useState(0);
  const [side, setSide] = useState<Side>("over");
  const [lineMode, setLineMode] = useState<(typeof LINE_OPTIONS)[number]>("auto");
  const [minGames, setMinGames] = useState(5);
  const [minMinutes, setMinMinutes] = useState(30);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "l10", dir: -1 });
  const [limit, setLimit] = useState(PAGE);

  const stat = STATS[si];

  const rows = useMemo(() => {
    const out: Row[] = [];
    const needle = search.trim().toLocaleLowerCase("tr");
    for (const p of players) {
      const team = teams[p.teamId];
      if (!team?.next) continue;
      if (league !== "all" && team.leagueId !== league) continue;
      const opp = teams[team.next.oppId];
      if (!opp) continue;
      if (p.games.length < minGames) continue;
      // Takımın son üç maçında hiç oynamayan oyuncular (sakat, ayrılmış) listelenmez.
      if (p.games[0].date < team.recent) continue;
      if (needle && !`${p.name} ${team.name}`.toLocaleLowerCase("tr").includes(needle)) continue;
      const minutes = p.games.slice(0, 5).flatMap((g) => (g.min == null ? [] : [g.min]));
      if (minutes.length && mean(minutes) < minMinutes) continue;

      const values = p.games.map((g) => g.v[si]);
      const line = lineMode === "auto" ? autoLine(values) : Number(lineMode);
      const oppAgg = stat.oppSide === "A" ? opp.avgA : opp.avgF;
      const oppRanks = stat.oppSide === "A" ? opp.rankA : opp.rankF;
      out.push({
        p, team, opp,
        home: team.next.home,
        date: team.next.date,
        line,
        avg: mean(values.slice(0, 10)),
        l5: hitRate(values.slice(0, 5), line, side),
        l10: hitRate(values.slice(0, 10), line, side),
        all: hitRate(values, line, side),
        oppVal: oppAgg[stat.oppKey],
        oppRank: oppRanks[stat.oppKey],
      });
    }
    const value = (r: Row): number | string => {
      switch (sort.key) {
        case "name": return r.p.name;
        case "line": return r.line;
        case "avg": return r.avg;
        case "opp": return r.oppVal;
        default: return r[sort.key].pct;
      }
    };
    return out.sort((a, b) => {
      const x = value(a);
      const y = value(b);
      const primary = typeof x === "string" ? x.localeCompare(y as string, "tr") : x - (y as number);
      return primary * sort.dir || b.all.pct - a.all.pct || b.avg - a.avg;
    });
  }, [players, teams, league, si, side, lineMode, minGames, minMinutes, search, sort, stat]);

  const th = (key: SortKey, label: string, title?: string, align = "text-right") => (
    <th scope="col" className={`px-3 py-2.5 font-medium ${align}`} title={title}>
      <button
        type="button"
        onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : key === "name" ? 1 : -1 }))}
        className={`inline-flex items-center gap-1 hover:text-ink ${sort.key === key ? "text-ink" : ""}`}
      >
        {label}
        <span aria-hidden className="w-2 text-[10px]">{sort.key === key ? (sort.dir === 1 ? "▲" : "▼") : ""}</span>
      </button>
    </th>
  );

  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setLimit(PAGE);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <Seg
          label="Lig"
          value={league}
          onChange={reset(setLeague)}
          options={[{ value: "all", label: "Tümü" }, ...leagues.map((l) => ({ value: l.id, label: l.name }))]}
        />
        <Seg
          label="İstatistik"
          value={si}
          onChange={reset(setSi)}
          options={STATS.map((s, i) => ({ value: i, label: s.label }))}
        />
      </div>
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <Field label="Yön">
          <Seg
            label="Yön"
            value={side}
            onChange={setSide}
            options={[{ value: "over", label: "Üst" }, { value: "under", label: "Alt" }]}
          />
        </Field>
        <Field label="Çizgi">
          <select className={inputClass} value={lineMode} onChange={(e) => setLineMode(e.target.value as typeof lineMode)}>
            {LINE_OPTIONS.map((o) => (
              <option key={o} value={o}>{o === "auto" ? "Otomatik" : o.replace(".", ",")}</option>
            ))}
          </select>
        </Field>
        <Field label="En az maç">
          <select className={inputClass} value={minGames} onChange={(e) => reset(setMinGames)(Number(e.target.value))}>
            {[3, 5, 8, 10].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </Field>
        <Field label="Son 5 maç ort. dakika">
          <select className={inputClass} value={minMinutes} onChange={(e) => reset(setMinMinutes)(Number(e.target.value))}>
            {[0, 30, 45, 60, 75].map((n) => <option key={n} value={n}>{n === 0 ? "Hepsi" : `${n}+`}</option>)}
          </select>
        </Field>
        <Field label="Ara">
          <input
            className={`${inputClass} w-56`}
            placeholder="Oyuncu veya takım"
            value={search}
            onChange={(e) => reset(setSearch)(e.target.value)}
          />
        </Field>
        <p className="ml-auto text-sm text-muted">{rows.length} oyuncu</p>
      </div>

      <div className="overflow-x-auto rounded-xl bg-surface ring-1 ring-hair">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="border-b border-hair text-xs text-muted">
            <tr>
              {th("name", "Oyuncu", undefined, "text-left")}
              <th scope="col" className="px-3 py-2.5 text-left font-medium">Sıradaki maç</th>
              {th("line", "Çizgi", "Otomatik çizgi: son 10 maç ortalamasına en yakın buçuklu değer")}
              {th("avg", "Ort.", "Son 10 maç ortalaması")}
              {th("l5", "Son 5")}
              {th("l10", "Son 10")}
              {th("all", "Sezon")}
              {th("opp", "Rakip", `${stat.oppLabel} ve ligdeki sırası (1 = en yüksek)`)}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, limit).map((r) => (
              <tr key={r.p.id} className="border-b border-hair/60 last:border-0 hover:bg-raised/60">
                <td className="px-3 py-2">
                  <Link
                    href={`/player/${r.p.id}?stat=${stat.key}`}
                    prefetch={false}
                    className="flex items-center gap-3 hover:underline"
                  >
                    <Avatar src={r.p.img} />
                    <span className="flex flex-col">
                      <span className="font-medium">{r.p.name}</span>
                      <span className="text-xs text-muted">{r.team.name}</span>
                    </span>
                  </Link>
                </td>
                <td className="px-3 py-2">
                  <span className="flex items-center gap-2">
                    <Avatar src={r.opp.img} size={20} round={false} />
                    <span className="flex flex-col">
                      <span>{r.opp.name}</span>
                      <span className="text-xs text-muted">{r.home ? "İç saha" : "Deplasman"} · {fmtDate(r.date)}</span>
                    </span>
                  </span>
                </td>
                <td className="px-3 py-2 text-right font-medium">
                  <span className="text-xs font-normal text-muted">{side === "over" ? "Ü" : "A"} </span>
                  {fmt1(r.line)}
                </td>
                <td className="px-3 py-2 text-right text-muted">{fmt1(r.avg)}</td>
                <td className="px-3 py-2 text-right"><RatePill rate={r.l5} /></td>
                <td className="px-3 py-2 text-right"><RatePill rate={r.l10} /></td>
                <td className="px-3 py-2 text-right"><RatePill rate={r.all} /></td>
                <td className="px-3 py-2 text-right">
                  {fmt1(r.oppVal)}
                  <span className="ml-1.5 text-xs text-muted">{r.oppRank}/{r.opp.leagueSize}</span>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={8} className="px-3 py-10 text-center text-muted">Bu süzgeçlere uyan oyuncu yok.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {rows.length > limit && (
        <button
          type="button"
          onClick={() => setLimit((l) => l + PAGE)}
          className="self-center rounded-lg bg-surface px-4 py-2 text-sm ring-1 ring-hair hover:bg-raised"
        >
          Daha fazla göster
        </button>
      )}
    </div>
  );
}
