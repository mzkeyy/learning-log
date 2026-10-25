import type { Nodes, Root, RootContent, TableCell } from "mdast";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { getChapters, getIndexNote, getNoteMap, type Note, WIKILINK } from "./notes";

/**
 * トップページ(content/index.md)の構造をそのままサイトの目次として使う。
 *
 *   ## 分野名            → Field
 *   | [[トピック]] | 19 | → Topic(リンク1つ)
 *   | ネットワーク基礎: [[A]]・[[B]] | 7 | → Topic(ラベル + リンク複数)
 *
 * index.md を書き換えれば、サイドバーとトップページのカードが両方変わる。
 */

export type TopicLink = { title: string; href: string; chapters: ChapterLink[] };
export type ChapterLink = { title: string; href: string };
export type Topic = { label: string; count: number; links: TopicLink[] };
export type Field = { name: string; topics: Topic[] };
export type SiteIndex = { intro: string; about: string; fields: Field[] };

function toText(node: Nodes): string {
  if ("value" in node) return node.value;
  if ("children" in node) return node.children.map(toText).join("");
  return "";
}

function toTopicLink(note: Note): TopicLink {
  return {
    title: note.name,
    href: note.href,
    // フォルダの目次ノートなら、その中の章も持たせる(サイドバーで開いて表示する)
    chapters: note.folder
      ? getChapters(note.folder).map((c) => ({ title: c.title, href: c.href }))
      : [],
  };
}

function parseTopic(cell: TableCell, countCell: TableCell | undefined, notes: Map<string, Note>): Topic {
  const text = toText(cell);
  const links = [...text.matchAll(WIKILINK)]
    .map((m) => notes.get(m[1].trim()))
    .filter((n): n is Note => n !== undefined)
    .map(toTopicLink);
  // 「ネットワーク基礎: [[A]]・[[B]]」のようにラベルがある行は、コロンの前をラベルにする
  const colon = text.indexOf(":");
  const label = colon > 0 && colon < text.indexOf("[[") ? text.slice(0, colon).trim() : links[0]?.title ?? text;
  return { label, count: Number(countCell ? toText(countCell) : 0) || 0, links };
}

let cache: SiteIndex | undefined;

export function getSiteIndex(): SiteIndex {
  if (cache) return cache;
  const notes = getNoteMap();
  // wikilink は remark にとってはただの文字なので、[[...]] のまま読み取れる
  const tree = unified().use(remarkParse).use(remarkGfm).parse(getIndexNote().body) as Root;

  let intro = "";
  let about = "";
  const fields: Field[] = [];
  for (const node of tree.children as RootContent[]) {
    if (node.type === "paragraph" && !intro && fields.length === 0) {
      intro = toText(node);
    } else if (node.type === "blockquote" && !about) {
      // > [!info] このサイトについて の2行目以降
      about = toText(node).split("\n").slice(1).join("").trim();
    } else if (node.type === "heading" && node.depth === 2) {
      fields.push({ name: toText(node), topics: [] });
    } else if (node.type === "table" && fields.length > 0) {
      for (const row of node.children.slice(1)) {
        fields.at(-1)!.topics.push(parseTopic(row.children[0], row.children[1], notes));
      }
    }
  }
  cache = { intro, about, fields };
  return cache;
}

/** ノートが今どの分野・トピックにいるか(パンくずリスト用) */
export function findTopicOf(note: Note): { field: Field; link: TopicLink } | undefined {
  for (const field of getSiteIndex().fields) {
    for (const topic of field.topics) {
      for (const link of topic.links) {
        if (link.href === note.href || link.chapters.some((c) => c.href === note.href)) {
          return { field, link };
        }
      }
    }
  }
  return undefined;
}
