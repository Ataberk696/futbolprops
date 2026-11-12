"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FORMATIONS, POSITIONS, POS_SHORT, pickSquad, type Candidate } from "@/lib/fantasy";
import { fmt1, fmtDate, fmtPct } from "@/lib/stats";
import { Avatar, Field, Seg, inputClass } from "./ui";

const CAPS = [
  { value: 3, label: "3" },
  { value: 4, label: "4" },
  { value: 99, label: "Sınırsız" },
] as const;

export function FantasyView({ candidates }: { candidates: Candidate[] }) {
  const [formation, setFormation] = useState("auto");
  const [cap, setCap] = useState<number>(3);
  const [pos, setPos] = useState(-1);

  const squad = useMemo(
    () => pickSquad(candidates, formation === "auto" ? null : FORMATIONS[Number(formation)], cap),
    [candidates, formation, cap],
  );
  const picked = useMemo(() => {
    const m = new Map<string, string>();
    if (!squad) return m;
    for (const c of squad.starters) m.set(c.id, "11");
    for (const c of squad.bench) m.set(c.id, "Yedek");
    if (squad.gkBench) m.set(squad.gkBench.id, "Yedek");
    return m;
  }, [squad]);
  const listed = candidates.filter((c) => pos < 0 || c.pos === pos).slice(0, 60);

  if (!candidates.length) {
    return (
      <p className="rounded-xl bg-surface px-4 py-10 text-center text-sm text-muted ring-1 ring-hair">
        Henüz mevki verisi yok ya da sıradaki maçlar belli değil. Veri bir sonraki güncellemede gelir.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <Field label="Diziliş">
          <select className={inputClass} value={formation} onChange={(e) => setFormation(e.target.value)}>
            <option value="auto">En iyisi (otomatik)</option>
            {FORMATIONS.map((f, i) => <option key={i} value={i}>{f.join("-")}</option>)}
          </select>
        </Field>
        <Field label="Aynı takımdan en çok">
          <Seg label="Aynı takımdan en çok" value={cap} onChange={setCap} options={CAPS} />
        </Field>
        {squad && (
          <p className="ml-auto text-sm text-muted">
            {squad.formation.join("-")} · ilk 11 beklenen toplam{" "}
            <span className="font-medium text-ink">{fmt1(squad.xp)}</span> puan
          </p>
        )}
      </div>

      {squad ? (
        <>
          <section className="flex flex-col gap-3 rounded-xl bg-surface p-3 ring-1 ring-hair sm:p-4">
            {[3, 2, 1, 0].map((p) => (
              <div key={p}>
                <h2 className="mb-1.5 text-xs text-faint">{POSITIONS[p]}</h2>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                  {squad.starters.filter((c) => c.pos === p).map((c) => <Card key={c.id} c={c} />)}
                </div>
              </div>
            ))}
          </section>
          <section className="rounded-xl bg-surface p-3 ring-1 ring-hair sm:p-4">
            <h2 className="mb-1.5 text-xs text-faint">Yedekler</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {squad.gkBench && <Card c={squad.gkBench} />}
              {squad.bench.map((c) => <Card key={c.id} c={c} />)}
            </div>
          </section>
        </>
      ) : (
        <p className="rounded-xl bg-surface px-4 py-10 text-center text-sm text-muted ring-1 ring-hair">
          Bu ayarlarla 11 kişi çıkmıyor; dizilişi ya da takım sınırını değiştir.
        </p>
      )}

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
                <th scope="col" className="px-2 py-2.5 text-left font-medium sm:px-3">Rakip</th>
                <th scope="col" className="px-2 py-2.5 text-right font-medium sm:px-3" title="Sıradaki maç için beklenen puan">Beklenen</th>
                <th scope="col" className="px-2 py-2.5 text-right font-medium sm:px-3" title="Son 5 maçta maç başı puan">Son 5</th>
                <th scope="col" className="px-2 py-2.5 text-right font-medium sm:px-3" title="Sezon boyunca maç başı puan">Sezon</th>
                <th scope="col" className="px-2 py-2.5 text-right font-medium sm:px-3" title="Takımının son 5 maçından kaçında oynadı">Oynama</th>
                <th scope="col" className="px-2 py-2.5 text-right font-medium sm:px-3" title="Takımının gol yememe olasılığı">Gol yememe</th>
                <th scope="col" className="px-2 py-2.5 text-right font-medium sm:px-3">Kadro</th>
              </tr>
            </thead>
            <tbody>
              {listed.map((c) => (
                <tr key={c.id} className="border-b border-hair/60 last:border-0">
                  <td className="sticky left-0 z-10 max-w-[9rem] bg-surface px-2 py-2 sm:max-w-none sm:px-3">
                    <Link href={`/player/${c.id}`} prefetch={false} className="flex flex-col hover:underline">
                      <span className="truncate font-medium">{c.name}</span>
                      <span className="truncate text-xs text-muted">{POS_SHORT[c.pos]} · {c.team}</span>
                    </Link>
                  </td>
                  <td className="px-2 py-2 text-muted sm:px-3">{c.home ? "" : "@ "}{c.opp}</td>
                  <td className="px-2 py-2 text-right font-medium sm:px-3">{fmt1(c.xp)}</td>
                  <td className="px-2 py-2 text-right text-muted sm:px-3">{fmt1(c.form)}</td>
                  <td className="px-2 py-2 text-right text-muted sm:px-3">{fmt1(c.season)}</td>
                  <td className="px-2 py-2 text-right text-muted sm:px-3">{fmtPct(c.play)}</td>
                  <td className="px-2 py-2 text-right text-muted sm:px-3">{c.pos <= 2 ? fmtPct(c.cs) : "–"}</td>
                  <td className="px-2 py-2 text-right text-xs text-muted sm:px-3">{picked.get(c.id) ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <details className="rounded-xl bg-surface px-4 py-3 text-sm text-muted ring-1 ring-hair">
        <summary className="cursor-pointer text-ink">Beklenen puan nasıl hesaplanıyor?</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Form: oyuncunun bu sezonki maç başı puan kalemleri; son 5 maç %60, sezonun tamamı %40 ağırlıklı.</li>
          <li>Rakip: gol ve asist puanı rakibin yediği gole, gol yememe puanı ve gol yeme cezası iki takımın gol ortalamalarına, kurtarış puanı rakibin isabetli şutuna göre ayarlanır.</li>
          <li>Oynama: oyuncu takımının son 5 maçının kaçında oynadıysa beklenen puan o oranla çarpılır.</li>
          <li>Bonus: her maçta bizim hesabımızla en yüksek puanı alan üç oyuncuya +3, +2, +1 verilir.</li>
          <li>Hesaba girmeyenler: oyuncu fiyatı ve bütçe, penaltı kurtarma ve kaçırma, kendi kalesine gol, sakatlık ve ceza durumu.</li>
          <li>Mevki, oyuncunun son maç kadrosundaki mevkisidir; uygulamadaki mevkiden farklı olabilir.</li>
        </ul>
      </details>
    </div>
  );
}

function Card({ c }: { c: Candidate }) {
  return (
    <Link
      href={`/player/${c.id}`}
      prefetch={false}
      className="flex items-center gap-2.5 rounded-lg bg-raised/60 p-2 ring-1 ring-hair hover:bg-raised"
    >
      <span className="hidden sm:inline-flex"><Avatar src={c.img} size={36} /></span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium">{c.name}</span>
        <span className="truncate text-xs text-muted">{POS_SHORT[c.pos]} · {c.team}</span>
        <span className="truncate text-xs text-faint">{c.home ? "–" : "@"} {c.opp} · {fmtDate(c.date)}</span>
      </span>
      <span className="flex flex-col items-end">
        <span className="text-base font-semibold">{fmt1(c.xp)}</span>
        <span className="text-[10px] text-faint">puan</span>
      </span>
    </Link>
  );
}
