// Baixa as imagens referenciadas por src/assets/*.asset.json (hospedadas no Lovable)
// para public/__l5e/assets-v1/..., para que carreguem fora do Lovable (ex.: Cloudflare Workers).
// Uso: node scripts/sync-lovable-assets.mjs
import { readdir, readFile, mkdir, writeFile, access } from "node:fs/promises";
import { dirname, join } from "node:path";

const HOST =
  process.env.LOVABLE_ASSETS_HOST ?? "https://2382092d-c9df-4fb8-b92b-ab671fd99668.lovableproject.com";
const dir = "src/assets";
let ok = 0;
for (const f of (await readdir(dir)).filter((n) => n.endsWith(".asset.json"))) {
  const { url } = JSON.parse(await readFile(join(dir, f), "utf8"));
  if (!url?.startsWith("/__l5e/assets-v1/")) continue;
  const out = join("public", decodeURIComponent(url));
  try {
    await access(out);
    ok++;
    continue;
  } catch {}
  const res = await fetch(HOST + url);
  if (!res.ok) throw new Error(`${f}: HTTP ${res.status}`);
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, Buffer.from(await res.arrayBuffer()));
  ok++;
  console.log("baixado", out);
}
console.log(`${ok} imagens prontas em public/__l5e`);
