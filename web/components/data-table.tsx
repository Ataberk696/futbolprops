"use client";

import { useMemo, useState } from "react";
import { fmt1, fmtPct, type League } from "@/lib/stats";
import { Avatar, Seg } from "./ui";

export type Column = {
  key: string;
  label: string;
  kind: "text" | "int" | "num" | "pct";
  title?: string;
};
export type DataRow = { id: string; leagueId: string; img?: string | null } & Record<string, string | number | null | undefined>;

/** Lig sekmeli, sütun başlığından sıralanabilen genel tablo. */
export function DataTable({
  columns, rows, leagues, initialSort,
}: {
  columns: Column[];
  rows: DataRow[];
  leagues: League[];
  initialSort: string;
}) {
  const [league, setLeague] = useState(leagues[0]?.id ?? "");
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 }>({ key: initialSort, dir: -1 });

  const sorted = useMemo(() => {
    return rows
      .filter((r) => r.leagueId === league)
      .sort((a, b) => {
        const x = a[sort.key];
        const y = b[sort.key];
        const cmp = typeof x === "string" ? x.localeCompare(String(y), "tr") : Number(x ?? 0) - Number(y ?? 0);
        return cmp * sort.dir;
      });
  }, [rows, league, sort]);

  const cell = (c: Column, v: DataRow[string]) => {
    if (v == null) return "–";
    if (c.kind === "num") return fmt1(Number(v));
    if (c.kind === "pct") return fmtPct(Number(v));
    return v;
  };

  return (
    <div className="flex flex-col gap-4">
      <Seg label="Lig" value={league} onChange={setLeague} options={leagues.map((l) => ({ value: l.id, label: l.name }))} />
      <div className="overflow-x-auto rounded-xl bg-surface ring-1 ring-hair">
        <table className="w-full text-sm" style={{ minWidth: columns.length * 84 }}>
          <thead className="border-b border-hair text-xs text-muted">
            <tr>
              {columns.map((c) => (
                <th key={c.key} scope="col" title={c.title} className={`px-3 py-2.5 font-medium ${c.kind === "text" ? "text-left" : "text-right"}`}>
                  <button
                    type="button"
                    onClick={() => setSort((s) => ({ key: c.key, dir: s.key === c.key ? (s.dir === 1 ? -1 : 1) : c.kind === "text" ? 1 : -1 }))}
                    className={`inline-flex items-center gap-1 hover:text-ink ${sort.key === c.key ? "text-ink" : ""}`}
                  >
                    {c.label}
                    <span aria-hidden className="w-2 text-[10px]">{sort.key === c.key ? (sort.dir === 1 ? "▲" : "▼") : ""}</span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.id} className="border-b border-hair/60 last:border-0 hover:bg-raised/60">
                {columns.map((c, i) => (
                  <td key={c.key} className={`px-3 py-2 ${c.kind === "text" ? "text-left" : "text-right"} ${i === 0 ? "font-medium" : ""}`}>
                    {i === 0 && r.img !== undefined ? (
                      <span className="flex items-center gap-2.5">
                        <Avatar src={r.img} size={22} round={false} />
                        {cell(c, r[c.key])}
                      </span>
                    ) : (
                      cell(c, r[c.key])
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
