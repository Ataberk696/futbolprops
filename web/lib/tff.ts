// TFF Fantezi Lig'in resmi oyuncu listesi (data/tff-players.json; kullanıcının siteden dışa aktardığı dosya)
// ile veri kaynağımızdaki oyuncuları eşleştirir. İki tarafta ortak kimlik olmadığı için kulüp + ad kullanılır.

export type TffPlayer = {
  id: number;
  name: string;
  surname: string;
  matchName: string;
  club: string;
  /** 0 kaleci, 1 defans, 2 orta saha, 3 forvet */
  pos: number;
  shirt: number | null;
  /** Fiyat, milyon TL. */
  cost: number;
  /** Oyuncuyu kadrosuna alan menajerlerin yüzdesi. */
  selected: number;
  points: number;
  /** AVAILABLE | SUSPENDED | INJURED ... */
  status: string;
  /** Oynama ihtimali yüzdesi; bilinmiyorsa null. */
  chance: number | null;
  news: string | null;
};

const FOLD: Record<string, string> = { ı: "i", ø: "o", đ: "d", ł: "l", ß: "ss", æ: "ae", œ: "oe", ð: "d", þ: "th" };

export function tokens(s: string): string[] {
  return s
    .toLocaleLowerCase("tr")
    .replace(/[ıøđłßæœðþ]/g, (c) => FOLD[c])
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
}

const CLUB_NOISE = new Set(["fk", "sk", "as", "sportif", "istanbul", "spor", "kulubu"]);
/** "İstanbul Başakşehir" ve "Başakşehir", "Amed" ve "Amed Sportif" aynı anahtara düşer. */
export const clubKey = (club: string) => tokens(club).filter((t) => !CLUB_NOISE.has(t)).join(" ").replace(/spor$/, "");

function similarity(ours: string[], t: TffPlayer): number {
  const theirs = new Set(tokens(`${t.name} ${t.surname} ${t.matchName}`));
  const hit = ours.filter((o) => theirs.has(o)).length;
  if (!hit) return 0;
  const match = tokens(t.matchName);
  const matchHit = match.length > 0 && match.every((m) => ours.includes(m));
  return hit / ours.length + (matchHit ? 0.5 : 0);
}

/**
 * Oyuncularımızı resmi listeyle eşleştirir: önce aynı kulüp içinde, kalanlar için tüm listede tam ad eşleşmesi.
 * Her resmi oyuncu en çok bir kez kullanılır. Dönen harita: bizim oyuncu kimliği -> resmi oyuncu.
 */
export function matchTff(
  ours: { id: string; name: string; club: string }[],
  list: TffPlayer[],
): Map<string, TffPlayer> {
  const pairs: { id: string; t: TffPlayer; score: number }[] = [];
  const byClub = new Map<string, TffPlayer[]>();
  for (const t of list) byClub.set(clubKey(t.club), [...(byClub.get(clubKey(t.club)) ?? []), t]);
  for (const o of ours) {
    const toks = tokens(o.name);
    for (const t of byClub.get(clubKey(o.club)) ?? []) {
      const score = similarity(toks, t);
      if (score > 0.5) pairs.push({ id: o.id, t, score: score + 1 });
    }
    // Kulübü tutmayanlar (transfer, farklı kulüp adı): yalnızca adın tamamı uyuyorsa.
    for (const t of list) {
      if (clubKey(t.club) === clubKey(o.club)) continue;
      const score = similarity(toks, t);
      if (score >= 1.5) pairs.push({ id: o.id, t, score });
    }
  }
  const out = new Map<string, TffPlayer>();
  const used = new Set<number>();
  for (const p of pairs.sort((a, b) => b.score - a.score)) {
    if (out.has(p.id) || used.has(p.t.id)) continue;
    out.set(p.id, p.t);
    used.add(p.t.id);
  }
  return out;
}
