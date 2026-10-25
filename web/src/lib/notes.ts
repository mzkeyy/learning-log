import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

// sync.py が作る公開用ノートの置き場所(web/ の1つ上の content/)
const CONTENT_DIR = path.join(process.cwd(), "..", "content");

// [[名前]] / [[名前#見出し]] / [[名前|表示名]] / [[名前#見出し|表示名]]
// 表の中では [[名前\|表示]] と | をエスケープするので、| の前の \ はリンク先に含めない
export const WIKILINK = /\[\[([^\]|#\\]+)(?:#([^\]|\\]+))?\\?(?:\|([^\]]+))?\]\]/g;

export type Note = {
  /** URL の各階層。例: ["Claude-Code", "01_概要とインストール"] */
  slug: string[];
  /** サイト内の URL(basePath なし)。例: "/Claude-Code/01_概要とインストール/" */
  href: string;
  /** ファイル名(拡張子なし)。wikilink の [[名前]] はこれで探す */
  name: string;
  title: string;
  modified?: string;
  /** フォルダに入っているノートなら、そのフォルダ名(= トピック)。例: "Claude Code" */
  folder?: string;
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
  const slug = toSlug(relPath);
  const dir = path.dirname(relPath);
  return {
    slug,
    href: `/${slug.join("/")}/`,
    name,
    title: typeof data.title === "string" ? data.title : name,
    // gray-matter は日付を Date に変換するので、YYYY-MM-DD の文字列に戻す
    modified:
      data.modified instanceof Date
        ? data.modified.toISOString().slice(0, 10)
        : data.modified,
    folder: dir === "." ? undefined : dir,
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

/** wikilink の [[名前]] → ノート の対応表 */
export function getNoteMap(): Map<string, Note> {
  return new Map(getAllNotes().map((note) => [note.name, note]));
}

/** トピック(フォルダ)の目次ノート。フォルダと同じ名前のノート。例: Claude Code/Claude Code.md */
export function isTopicIndex(note: Note): boolean {
  return note.folder !== undefined && path.basename(note.folder) === note.name;
}

/** 同じフォルダに入っている章ノート(目次ノート自身は除く) */
export function getChapters(folder: string): Note[] {
  return getAllNotes().filter(
    (note) => note.folder === folder && !isTopicIndex(note),
  );
}

/** コードブロックとインラインコードを取り除いた本文。その中の [[...]] はリンクではないため */
function stripCode(markdown: string): string {
  return markdown.replace(/^```[\s\S]*?^```/gm, "").replace(/`[^`\n]*`/g, "");
}

let backlinkCache: Map<string, Note[]> | undefined;

/** そのノートを [[wikilink]] で参照しているノートの一覧(バックリンク) */
export function getBacklinks(note: Note): Note[] {
  if (!backlinkCache) {
    backlinkCache = new Map();
    for (const source of getAllNotes()) {
      const targets = new Set(
        [...stripCode(source.body).matchAll(WIKILINK)].map((m) => m[1].trim()),
      );
      for (const target of targets) {
        if (target === source.name) continue;
        const list = backlinkCache.get(target) ?? [];
        list.push(source);
        backlinkCache.set(target, list);
      }
    }
  }
  return backlinkCache.get(note.name) ?? [];
}

/** ノートに埋め込む画像(![[名前.svg]])の拡張子 */
export const ASSET_EXTENSIONS = [".svg", ".png", ".jpg", ".jpeg", ".gif", ".webp"];

let assetCache: Map<string, string> | undefined;

/**
 * 画像のファイル名 → content/ からの相対パス。Obsidian と同じく、埋め込みはファイル名だけで探す。
 * 画像は scripts/copy-assets.mjs が public/notes-assets/ にコピーする
 */
export function getAssetMap(): Map<string, string> {
  assetCache ??= new Map(
    fs
      .readdirSync(CONTENT_DIR, { recursive: true, encoding: "utf-8" })
      .filter((rel) => ASSET_EXTENSIONS.some((ext) => rel.toLowerCase().endsWith(ext)))
      .map((rel) => [path.basename(rel), rel.split(path.sep).join("/")]),
  );
  return assetCache;
}
