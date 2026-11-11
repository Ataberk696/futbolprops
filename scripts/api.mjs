// PitchAPI'ye tek istek atıp JSON'u yazdırır.  Kullanım: node scripts/api.mjs /v1/leagues
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Anahtar önce ortam değişkeninden (GitHub Actions), yoksa yereldeki .env dosyasından okunur.
function readKey() {
  if (process.env.PITCHAPI_KEY) return process.env.PITCHAPI_KEY.trim();
  const envPath = fileURLToPath(new URL("../.env", import.meta.url));
  let text = "";
  try {
    text = readFileSync(envPath, "utf8");
  } catch {}
  const match = text.match(/^\s*PITCHAPI_KEY\s*=\s*["']?([^"'\s]+)/m);
  if (!match) throw new Error("PITCHAPI_KEY bulunamadı (ortam değişkeni ya da .env)");
  return match[1];
}
const key = readKey();

export async function api(path) {
  const res = await fetch("https://api.pitchapi.dev" + path, {
    headers: { "X-API-KEY": key },
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  if (!res.ok) throw new Error(`${res.status} ${path}: ${text.slice(0, 500)}`);
  return body;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  // Git Bash baştaki "/" işaretini Windows yoluna çevirdiği için yol "v1/leagues" biçiminde de verilebilir.
  const body = await api("/" + (process.argv[2] ?? "v1/leagues").replace(/^\//, ""));
  console.log(JSON.stringify(body, null, 2));
}
