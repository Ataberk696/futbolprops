// PitchAPI'ye tek istek atıp JSON'u yazdırır.  Kullanım: node scripts/api.mjs /v1/leagues
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const envPath = fileURLToPath(new URL("../.env", import.meta.url));
const match = readFileSync(envPath, "utf8").match(/^\s*PITCHAPI_KEY\s*=\s*["']?([^"'\s]+)/m);
if (!match) throw new Error(".env içinde PITCHAPI_KEY bulunamadı");

export async function api(path) {
  const res = await fetch("https://api.pitchapi.dev" + path, {
    headers: { "X-API-KEY": match[1] },
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
