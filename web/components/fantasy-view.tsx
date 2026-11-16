"use client";

import Link from "next/link";
import { useState } from "react";
import { BUDGET, POSITIONS, POS_SHORT, type Candidate, type NamedSquad } from "@/lib/fantasy";
import { fmt1, fmtDate, fmtPct } from "@/lib/stats";
import { Avatar, Seg } from "./ui";

export function FantasyView({ candidates, squads }: { candidates: Candidate[]; squads: NamedSquad[] }) {
  const [tab, setTab] = useState(squads[0]?.key ?? "");
  const [pos, setPos] = useState(-1);

  const current = squads.find((s) => s.key === tab) ?? squads[0];
  const role = new Map<string, string>();
  if (current) {
    for (const c of current.squad.starters) role.set(c.id, "11");
    for (const c of current.squad.bench) role.set(c.id, "Yedek");
  }
  const listed = candidates.filter((c) => pos < 0 || c.pos === pos).slice(0, 80);

  if (!candidates.length || !current) {
    return (
      <p className="rounded-xl bg-surface px-4 py-10 text-center text-sm text-muted ring-1 ring-hair">
        Sıradaki maçlar belli değil ya da kadro kurulamadı. Veri bir sonraki güncellemede gelir.
      </p>
    );
  }
  const { squad } = current;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Seg label="Kadro" value={current.key} onChange={setTab} options={squads.map((s) => ({ value: s.key, label: s.label }))} />
        <p className="text-sm text-muted">{current.hint}</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Diziliş" value={squad.formation.join("-")} />
        <Stat label="Beklenen puan" value={fmt1(squad.xp)} sub="ilk 11, kaptan ×2" />
        <Stat label="Toplam fiyat" value={`${fmt1(squad.cost)}M`} sub={`bütçe ${BUDGET}M`} />
      </div>

      <section className="flex flex-col gap-3 rounded-xl bg-surface p-3 ring-1 ring-hair sm:p-4">
        {[3, 2, 1, 0].map((p) => (
          <div key={p}>
            <h2 className="mb-1.5 text-xs text-faint">{POSITIONS[p]}</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {squad.starters.filter((c) => c.pos === p).map((c) => <Card key={c.id} c={c} captain={c.id === squad.captainId} />)}
            </div>
          </div>
        ))}
      </section>
      <section className="rounded-xl bg-surface p-3 ring-1 ring-hair sm:p-4">
        <h2 className="mb-1.5 text-xs text-faint">Yedekler</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {squad.bench.map((c) => <Card key={c.id} c={c} />)}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">Tüm adaylar</h2>
          <Seg
            label="Mevki"
            value={pos}
            onChange={setPos}
            options={[{ value: -1, label: "Hepsi" }, ...POSITIONS.map((label, value) => ({ value, label }))]}
          />
        </div>
        <div className="overflow-x-auto rounded-xl bg-surface ring-1 ring-hair">
          <table className="w-full whitespace-nowrap text-sm">
            <thead className="border-b border-hair text-xs text-muted">
              <tr>
                <th scope="col" className="sticky left-0 z-10 bg-surface px-2 py-2.5 text-left font-medium sm:px-3">Oyuncu</th>
                <th scope="col" className="px-2 py-2.5 text-right font-medium sm:px-3" title="Sıradaki maç için beklenen puan">Beklenen</th>
                <th scope="col" className="px-2 py-2.5 text-right font-medium sm:px-3">Fiyat</th>
                <th scope="col" className="px-2 py-2.5 text-left font-medium sm:px-3">Rakip</th>
                <th scope="col" className="px-2 py-2.5 text-right font-medium sm:px-3" title="Son 5 maçta maç başı puan (bizim hesabımız)">Son 5</th>
                <th scope="col" className="px-2 py-2.5 text-right font-medium sm:px-3" title="Sezon boyunca maç başı puan (bizim hesabımız)">Sezon</th>
                <th scope="col" className="px-2 py-2.5 text-right font-medium sm:px-3" title="Oyuncuyu kadrosuna alan menajerlerin oranı">Seçilme</th>
                <th scope="col" className="px-2 py-2.5 text-right font-medium sm:px-3" title="Takımının son 5 maçından kaçında oynadı">Oynama</th>
                <th scope="col" className="px-2 py-2.5 text-right font-medium sm:px-3" title="Takımının gol yememe olasılığı">Gol yememe</th>
                <th scope="col" className="px-2 py-2.5 text-right font-medium sm:px-3" title="Seçili kadrodaki yeri">Kadro</th>
              </tr>
            </thead>
            <tbody>
              {listed.map((c) => (
                <tr key={c.id} className={`border-b border-hair/60 last:border-0 ${c.available ? "" : "text-faint"}`}>
                  <td className="sticky left-0 z-10 max-w-[9rem] bg-surface px-2 py-2 sm:max-w-none sm:px-3">
                    <Link href={`/player/${c.id}`} prefetch={false} className="flex flex-col hover:underline">
                      <span className="truncate font-medium">{c.name}</span>
                      <span className="truncate text-xs text-muted">
                        {POS_SHORT[c.pos]} · {c.team}
                        {c.note && <span className="text-bad"> · {c.note}</span>}
                      </span>
                    </Link>
                  </td>
                  <td className="px-2 py-2 text-right font-medium sm:px-3">{fmt1(c.xp)}</td>
                  <td className="px-2 py-2 text-right sm:px-3">{fmt1(c.cost)}M</td>
                  <td className="px-2 py-2 text-muted sm:px-3">{c.home ? "" : "@ "}{c.opp}</td>
                  <td className="px-2 py-2 text-right text-muted sm:px-3">{fmt1(c.form)}</td>
                  <td className="px-2 py-2 text-right text-muted sm:px-3">{fmt1(c.season)}</td>
                  <td className="px-2 py-2 text-right text-muted sm:px-3">%{fmt1(c.selected)}</td>
                  <td className="px-2 py-2 text-right text-muted sm:px-3">{fmtPct(c.play)}</td>
                  <td className="px-2 py-2 text-right text-muted sm:px-3">{c.pos <= 2 ? fmtPct(c.cs) : "–"}</td>
                  <td className="px-2 py-2 text-right text-xs text-muted sm:px-3">{role.get(c.id) ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <details className="rounded-xl bg-surface px-4 py-3 text-sm text-muted ring-1 ring-hair">
        <summary className="cursor-pointer text-ink">Kadrolar nasıl kuruluyor?</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Kurallar: 15 oyuncu (2 kaleci, 5 defans, 5 orta saha, 3 forvet), {BUDGET}M bütçe, aynı takımdan en çok 3 oyuncu; ilk 11&apos;de en az 3 defans ve 1 forvet.</li>
          <li>Form: oyuncunun bu sezonki maç başı puan kalemleri; son 5 maç %60, sezonun tamamı %40 ağırlıklı.</li>
          <li>Rakip: gol ve asist puanı rakibin yediği gole, gol yememe puanı ve gol yeme cezası iki takımın gol ortalamalarına, kurtarış puanı rakibin isabetli şutuna göre ayarlanır.</li>
          <li>Oynama: oyuncu takımının son 5 maçının kaçında oynadıysa beklenen puan o oranla çarpılır. Resmi listede cezalı ya da sakat görünen oyuncu kadroya alınmaz.</li>
          <li>Kaptan: ilk 11&apos;de beklenen puanı en yüksek oyuncu; puanı iki kez sayılır.</li>
          <li>Alternatifler: önceki kadrolarda yer alan oyuncuların ağırlığı azaltılarak kurulur. Sürpriz kadro yalnızca az seçilen oyunculardan oluşur.</li>
          <li>Hesaba girmeyenler: penaltı kurtarma ve kaçırma, kendi kalesine gol. Bonus puanı bizim hesabımıza göre verilir.</li>
          <li>Fiyat, mevki ve durum resmi listenin dışa aktarıldığı tarihe aittir; sonradan değişmiş olabilir.</li>
        </ul>
      </details>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-surface p-3 ring-1 ring-hair sm:p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-0.5 text-xl font-semibold tracking-tight sm:text-2xl">{value}</p>
      {sub && <p className="text-xs text-faint">{sub}</p>}
    </div>
  );
}

function Card({ c, captain = false }: { c: Candidate; captain?: boolean }) {
  return (
    <Link
      href={`/player/${c.id}`}
      prefetch={false}
      className="flex items-center gap-2.5 rounded-lg bg-raised/60 p-2 ring-1 ring-hair hover:bg-raised"
    >
      <span className="hidden sm:inline-flex"><Avatar src={c.img} size={36} /></span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium">{c.name}</span>
          {captain && <span className="shrink-0 rounded bg-ink px-1 text-[10px] font-semibold text-bg" title="Kaptan">K</span>}
        </span>
        <span className="truncate text-xs text-muted">{POS_SHORT[c.pos]} · {c.team}</span>
        <span className="truncate text-xs text-faint">{c.home ? "–" : "@"} {c.opp} · {fmtDate(c.date)}</span>
      </span>
      <span className="flex flex-col items-end">
        <span className="text-base font-semibold">{fmt1(c.xp)}</span>
        <span className="text-[10px] text-faint">{fmt1(c.cost)}M</span>
      </span>
    </Link>
  );
}
