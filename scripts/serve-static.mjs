// web/out klasörünü GitHub Pages'teki gibi /futbolprops yolu altında sunar (yayın öncesi yerel kontrol için).
// Önce derle: BASE_PATH=/futbolprops npm --prefix web run build     Sonra: node scripts/serve-static.mjs
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "/futbolprops";
const PORT = 4173;
const root = fileURLToPath(new URL("../web/out", import.meta.url));
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css",
  ".txt": "text/plain; charset=utf-8", ".ico": "image/x-icon", ".woff2": "font/woff2", ".json": "application/json",
};

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (!path.startsWith(BASE)) {
    res.writeHead(302, { location: BASE + "/" }).end();
    return;
  }
  let file = join(root, normalize(path.slice(BASE.length)));
  if (!file.startsWith(root)) {
    res.writeHead(403).end();
    return;
  }
  try {
    if ((await stat(file)).isDirectory()) file = join(file, "index.html");
    res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" }).end(await readFile(file));
  } catch {
    res.writeHead(404, { "content-type": TYPES[".html"] }).end(await readFile(join(root, "404.html")));
  }
}).listen(PORT, () => console.log(`http://localhost:${PORT}${BASE}/`));
