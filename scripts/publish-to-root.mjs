import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const dist = join(root, "dist");

if (!existsSync(dist)) {
  console.error("dist/ missing — run vite build first");
  process.exit(1);
}

// Prefer renamed index.html; fall back to the source entry name Vite may emit
const distHtmlCandidates = ["index.html", "index.source.html"];
const distHtml = distHtmlCandidates
  .map((name) => join(dist, name))
  .find((path) => existsSync(path));

if (!distHtml) {
  console.error("No HTML file found in dist/");
  process.exit(1);
}

const assetsOut = join(root, "assets");
if (existsSync(assetsOut)) {
  rmSync(assetsOut, { recursive: true, force: true });
}

const distAssets = join(dist, "assets");
if (existsSync(distAssets)) {
  mkdirSync(assetsOut, { recursive: true });
  for (const name of readdirSync(distAssets)) {
    cpSync(join(distAssets, name), join(assetsOut, name), { recursive: true });
  }
}

let html = readFileSync(distHtml, "utf8");
// Normalize any leftover source filename in asset refs (shouldn't remain, but safe)
html = html.replaceAll("index.source-", "index-");
writeFileSync(join(root, "index.html"), html);

const favicon = join(dist, "favicon.svg");
if (existsSync(favicon)) {
  cpSync(favicon, join(root, "favicon.svg"));
}

rmSync(dist, { recursive: true, force: true });
console.log("Published build to repository root (index.html, assets/).");
