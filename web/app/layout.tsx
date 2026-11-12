import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "Futbol Props",
  description: "Süper Lig, Premier League, LaLiga ve Bundesliga oyuncu propları",
};

const NAV = [
  { href: "/", label: "Oyuncu propları", short: "Proplar" },
  { href: "/takimlar", label: "Takımlar", short: "Takımlar" },
  { href: "/hakemler", label: "Hakemler", short: "Hakemler" },
  { href: "/fantezi", label: "Fantezi kadro", short: "Fantezi" },
] as const;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <header className="sticky top-0 z-20 border-b border-hair bg-bg/90 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:gap-6">
            <Link href="/" className="flex shrink-0 items-center gap-2 whitespace-nowrap text-[15px] font-semibold tracking-tight">
              <span className="size-2.5 rounded-full bg-good" aria-hidden />
              <span className="hidden sm:inline">Futbol Props</span>
              <span className="sm:hidden">FP</span>
            </Link>
            <nav className="flex min-w-0 gap-0.5 overflow-x-auto whitespace-nowrap text-sm sm:gap-1">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="rounded-md px-2 py-1.5 text-muted transition-colors hover:bg-raised hover:text-ink sm:px-3"
                >
                  {/* Telefonda başlık tek satıra sığsın diye kısa ad. */}
                  <span className="sm:hidden">{n.short}</span>
                  <span className="hidden sm:inline">{n.label}</span>
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
