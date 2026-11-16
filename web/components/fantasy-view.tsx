"use client";

import Link from "next/link";
import { useState } from "react";
import { BUDGET, POSITIONS, POS_SHORT, type Candidate, type NamedSquad } from "@/lib/fantasy";
import { fmt1, fmtPct } from "@/lib/stats";
import { Seg } from "./ui";

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

      <Pitch starters={squad.starters} captainId={squad.captainId} />

      <section className="rounded-xl bg-surface px-2 py-3 ring-1 ring-hair sm:px-4">
        <h2 className="mb-2 px-1 text-xs text-faint">Yedekler</h2>
        <div className="flex justify-around gap-1">
          {squad.bench.map((c) => <Token key={c.id} c={c} />)}
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

/** İlk 11: kaleci üstte, forvetler altta; sahanın çizgileri yalnızca süs. */
function Pitch({ starters, captainId }: { starters: Candidate[]; captainId: string }) {
  return (
    <section
      aria-label="İlk 11"
      className="relative overflow-hidden rounded-xl bg-[#13241a] ring-1 ring-hair"
      style={{ backgroundImage: "repeating-linear-gradient(180deg, transparent 0 12.5%, rgba(255,255,255,0.025) 12.5% 25%)" }}
    >
      <div aria-hidden className="pointer-events-none absolute inset-2 rounded-md border border-white/15 sm:inset-3">
        <div className="absolute left-1/2 top-0 h-[17%] w-[46%] -translate-x-1/2 border border-t-0 border-white/15" />
        <div className="absolute left-1/2 top-0 h-[7%] w-[20%] -translate-x-1/2 border border-t-0 border-white/15" />
        <div className="absolute bottom-0 left-1/2 aspect-[2/1] w-[24%] -translate-x-1/2 rounded-t-full border border-b-0 border-white/15" />
      </div>
      <div className="relative flex flex-col gap-5 px-1 py-6 sm:gap-8 sm:px-6 sm:py-9">
        {[0, 1, 2, 3].map((pos) => (
          <div key={pos} role="group" aria-label={POSITIONS[pos]} className="flex justify-around gap-1">
            {starters.filter((c) => c.pos === pos).map((c) => <Token key={c.id} c={c} captain={c.id === captainId} />)}
          </div>
        ))}
      </div>
    </section>
  );
}

/** Beklenen puan rozeti: yüksek puan yeşil, orta sarı, düşük gri. Sayı her zaman yazılı. */
const xpTone = (xp: number) => (xp >= 7 ? "bg-good text-white" : xp >= 5 ? "bg-[#b7791f] text-white" : "bg-raised text-ink ring-1 ring-hair");
const lastName = (name: string) => name.split(" ").slice(1).join(" ") || name;

function Token({ c, captain = false }: { c: Candidate; captain?: boolean }) {
  return (
    <Link
      href={`/player/${c.id}`}
      prefetch={false}
      title={`${c.name} · ${POSITIONS[c.pos]} · ${c.team}`}
      className="group flex w-[19%] min-w-0 max-w-36 flex-col items-center text-center"
    >
      <span className="relative">
        <span className="block size-11 overflow-hidden rounded-full bg-raised ring-2 ring-white/20 group-hover:ring-white/60 sm:size-14">
          {c.img && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.img} alt="" loading="lazy" className="size-full object-cover" />
          )}
        </span>
        {captain && (
          <span className="absolute -right-1.5 -top-1 rounded bg-ink px-1 text-[10px] font-bold leading-4 text-bg" title="Kaptan">K</span>
        )}
        <span className={`absolute -bottom-2 left-1/2 -translate-x-1/2 rounded px-1.5 text-[11px] font-semibold leading-[18px] ${xpTone(c.xp)}`}>
          {fmt1(c.xp)}
        </span>
      </span>
      <span className="mt-3 w-full truncate text-xs font-medium sm:text-sm">
        <span className="sm:hidden">{lastName(c.name)}</span>
        <span className="hidden sm:inline">{c.name}</span>
      </span>
      {/* Telefonda yer dar: takım yerine rakip, altında yalnızca fiyat yazılır. */}
      <span className="w-full truncate text-[10px] text-muted sm:text-xs">
        <span className="sm:hidden">{c.home ? "" : "@ "}{c.opp}</span>
        <span className="hidden sm:inline">{POS_SHORT[c.pos]} · {c.team}</span>
      </span>
      <span className="w-full truncate text-[10px] text-faint sm:text-xs">
        <span className="hidden sm:inline">{c.home ? "" : "@ "}{c.opp} · </span>{fmt1(c.cost)}M
      </span>
    </Link>
  );
}
