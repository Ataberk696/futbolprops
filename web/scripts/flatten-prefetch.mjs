// Statik çıktıda Next.js ön yükleme dosyalarını "__next.takimlar/__PAGE__.txt" olarak yazar,
// ama tarayıcı "__next.takimlar.__PAGE__.txt" ister. Düz dosya sunan GitHub Pages'te bu 404 verir;
// burada her dosyanın noktalı adla bir kopyası oluşturulur.
import { copyFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const out = fileURLToPath(new URL("../out", import.meta.url));
let copied = 0;

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const path = join(dir, entry.name);
    if (entry.name.startsWith("__next.")) flatten(dir, path);
    else walk(path);
  }
}

function flatten(pageDir, dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) flatten(pageDir, path);
    else {
      copyFileSync(path, join(pageDir, relative(pageDir, path).split(sep).join(".")));
      copied++;
    }
  }
}

walk(out);
console.log(`Ön yükleme dosyası kopyalandı: ${copied}`);
