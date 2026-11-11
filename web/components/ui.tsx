"use client";

import { fmtPct, type Rate } from "@/lib/stats";

export function Seg<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex flex-wrap gap-0.5 rounded-lg bg-surface p-0.5 ring-1 ring-hair">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
            o.value === value ? "bg-ink font-medium text-bg" : "text-muted hover:bg-raised hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-faint">
      {label}
      {children}
    </label>
  );
}

export const inputClass =
  "h-9 rounded-lg bg-surface px-3 text-sm text-ink ring-1 ring-hair outline-none placeholder:text-faint focus:ring-2 focus:ring-muted";

/** İsabet oranı hücresi: yüzde her zaman yazılı, arka plan tonu yalnızca yardımcı ipucu. */
export function RatePill({ rate }: { rate: Rate }) {
  if (!rate.n) return <span className="text-faint">–</span>;
  const tone =
    rate.pct >= 0.7 ? "bg-good/25 ring-good/40" : rate.pct <= 0.3 ? "bg-bad/25 ring-bad/40" : "bg-raised ring-hair";
  return (
    <span
      className={`inline-flex min-w-[4.5rem] items-baseline justify-center gap-1.5 rounded-md px-2 py-1 ring-1 ${tone}`}
    >
      <span className="font-medium text-ink">{fmtPct(rate.pct)}</span>
      <span className="text-xs text-muted">
        {rate.hit}/{rate.n}
      </span>
    </span>
  );
}

export function Avatar({ src, size = 32, round = true }: { src: string | null; size?: number; round?: boolean }) {
  return (
    <span
      className={`inline-block shrink-0 overflow-hidden bg-raised ${round ? "rounded-full" : "rounded"}`}
      style={{ width: size, height: size }}
    >
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" width={size} height={size} loading="lazy" className="size-full object-cover" />
      )}
    </span>
  );
}
