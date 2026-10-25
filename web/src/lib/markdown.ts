import type { Root as HastRoot } from "hast";
import type { PhrasingContent, Root as MdastRoot } from "mdast";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { SKIP, visit } from "unist-util-visit";
import { getLinkMap } from "./notes";

// [[名前]] / [[名前#見出し]] / [[名前|表示名]] / [[名前#見出し|表示名]]
const WIKILINK = /\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/g;

/**
 * Obsidian の wikilink を普通のリンクに変換する remark プラグイン。
 * Markdown の構文木のテキストだけを書き換えるので、コードブロックやインラインコードの中の
 * [[...]](例: `[[...slug]]`)は自然に対象外になる。
 */
function remarkWikilink() {
  const links = getLinkMap();
  return (tree: MdastRoot) => {
    visit(tree, "text", (node, index, parent) => {
      if (!parent || index === undefined || !node.value.includes("[[")) return;

      const parts: PhrasingContent[] = [];
      let last = 0;
      for (const m of node.value.matchAll(WIKILINK)) {
        const [whole, target, heading, alias] = m;
        if (m.index > last) {
          parts.push({ type: "text", value: node.value.slice(last, m.index) });
        }
        const href = links.get(target.trim());
        const label = alias ?? target;
        parts.push(
          href
            ? {
                type: "link",
                url: heading ? `${href}#${heading}` : href,
                children: [{ type: "text", value: label }],
              }
            : // リンク先がないものは文字だけ残す(sync.py でも外しているが念のため)
              { type: "text", value: label },
        );
        last = m.index + whole.length;
      }
      if (parts.length === 0) return;
      if (last < node.value.length) {
        parts.push({ type: "text", value: node.value.slice(last) });
      }
      parent.children.splice(index, 1, ...parts);
      // 差し込んだノードはもう見なくてよいので、その次から探索を続ける
      return [SKIP, index + parts.length];
    });
  };
}

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkWikilink)
  .use(remarkRehype)
  .use(rehypeSlug);

/** Markdown 本文 → HTML の構文木(hast)。描画は components/markdown.tsx が行う */
export async function markdownToHast(markdown: string): Promise<HastRoot> {
  return processor.run(processor.parse(markdown));
}
