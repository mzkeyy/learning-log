// ノートに埋め込む画像(content/ の .svg・.png など)を public/notes-assets/ にコピーする。
// next build / next dev の前に自動で実行される(package.json の prebuild・predev)
import fs from "node:fs";
import path from "node:path";

const CONTENT_DIR = path.join(import.meta.dirname, "..", "..", "content");
const OUT_DIR = path.join(import.meta.dirname, "..", "public", "notes-assets");
const EXTENSIONS = [".svg", ".png", ".jpg", ".jpeg", ".gif", ".webp"];

fs.rmSync(OUT_DIR, { recursive: true, force: true });
let count = 0;
for (const rel of fs.readdirSync(CONTENT_DIR, { recursive: true, encoding: "utf-8" })) {
  if (!EXTENSIONS.some((ext) => rel.toLowerCase().endsWith(ext))) continue;
  fs.mkdirSync(path.join(OUT_DIR, path.dirname(rel)), { recursive: true });
  fs.copyFileSync(path.join(CONTENT_DIR, rel), path.join(OUT_DIR, rel));
  count += 1;
}
console.log(`画像を ${count} 個 public/notes-assets/ にコピーしました`);
