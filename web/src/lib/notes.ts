import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

// sync.py が作る公開用ノートの置き場所(web/ の1つ上の content/)
const CONTENT_DIR = path.join(process.cwd(), "..", "content");

export type Note = {
  /** URL の各階層。例: ["Claude-Code", "01_概要とインストール"] */
  slug: string[];
  /** ファイル名(拡張子なし)。wikilink の [[名前]] はこれで探す */
  name: string;
  title: string;
  modified?: string;
  /** フロントマターを除いた Markdown 本文 */
  body: string;
};

/** ファイルの相対パス → URL の階層。空白はハイフンにする(Quartz と同じ) */
function toSlug(relPath: string): string[] {
  return relPath
    .replace(/\.md$/, "")
    .split(path.sep)
    .map((segment) => segment.replaceAll(" ", "-"));
}

function readNote(relPath: string): Note {
  const raw = fs.readFileSync(path.join(CONTENT_DIR, relPath), "utf-8");
  const { data, content } = matter(raw);
  const name = path.basename(relPath, ".md");
  return {
    slug: toSlug(relPath),
    name,
    title: typeof data.title === "string" ? data.title : name,
    // gray-matter は日付を Date に変換するので、YYYY-MM-DD の文字列に戻す
    modified:
      data.modified instanceof Date
        ? data.modified.toISOString().slice(0, 10)
        : data.modified,
    body: content,
  };
}

let cache: Note[] | undefined;

/** index.md を除く全ノート。ビルド中に何度も呼ばれるので一度だけ読む */
export function getAllNotes(): Note[] {
  cache ??= fs
    .readdirSync(CONTENT_DIR, { recursive: true, encoding: "utf-8" })
    .filter((rel) => rel.endsWith(".md") && rel !== "index.md")
    .sort()
    .map(readNote);
  return cache;
}

export function getIndexNote(): Note {
  return readNote("index.md");
}

export function getNoteBySlug(slug: string[]): Note | undefined {
  const key = slug.join("/");
  return getAllNotes().find((note) => note.slug.join("/") === key);
}

/** wikilink の [[名前]] → リンク先 URL の対応表 */
export function getLinkMap(): Map<string, string> {
  return new Map(
    getAllNotes().map((note) => [note.name, `/${note.slug.join("/")}/`]),
  );
}
