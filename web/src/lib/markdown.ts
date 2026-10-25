import { slug as toHeadingId } from "github-slugger";
import type { Root as HastRoot } from "hast";
import { toString as hastToString } from "hast-util-to-string";
import type {
  Blockquote,
  Paragraph,
  PhrasingContent,
  Root as MdastRoot,
} from "mdast";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { bundledLanguages } from "shiki";
import { unified } from "unified";
import { SKIP, visit } from "unist-util-visit";
import { BASE_PATH } from "./config";
import { getAssetMap, getNoteMap, WIKILINK } from "./notes";

// ![[名前.svg]] / ![[名前.svg|代替テキスト]] / ![[名前.png|600]](数字は幅)
const EMBED = /!\[\[([^\]|]+)(?:\|([^\]]*))?\]\]/g;

/**
 * Obsidian の画像の埋め込み(![[…]])を <img> にする remark プラグイン。
 * wikilink より先に処理する([[…]] の部分をリンクにされないように)。
 */
function remarkEmbed() {
  const assets = getAssetMap();
  return (tree: MdastRoot) => {
    visit(tree, "text", (node, index, parent) => {
      if (!parent || index === undefined || !node.value.includes("![[")) return;
      const parts: PhrasingContent[] = [];
      let last = 0;
      for (const m of node.value.matchAll(EMBED)) {
        const [whole, name, option] = m;
        const rel = assets.get(name.trim());
        if (!rel) continue; // 画像以外の埋め込み(ノートの埋め込みなど)は文字のまま
        if (m.index > last) parts.push({ type: "text", value: node.value.slice(last, m.index) });
        const width = option && /^\d+$/.test(option) ? option : undefined;
        parts.push({
          type: "image",
          url: `${BASE_PATH}/notes-assets/${rel.split("/").map(encodeURIComponent).join("/")}`,
          alt: (!width && option) || name.replace(/\.drawio\.svg$|\.\w+$/, ""),
          data: width ? { hProperties: { width } } : undefined,
        });
        last = m.index + whole.length;
      }
      if (parts.length === 0) return;
      if (last < node.value.length) parts.push({ type: "text", value: node.value.slice(last) });
      parent.children.splice(index, 1, ...parts);
      return [SKIP, index + parts.length];
    });
  };
}

/**
 * Obsidian の wikilink を普通のリンクに変換する remark プラグイン。
 * Markdown の構文木のテキストだけを書き換えるので、コードブロックやインラインコードの中の
 * [[...]](例: `[[...slug]]`)は自然に対象外になる。
 */
function remarkWikilink() {
  const notes = getNoteMap();
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
        const note = notes.get(target.trim());
        const label = alias ?? target;
        parts.push(
          note
            ? {
                type: "link",
                // 見出しへのリンクは rehype-slug と同じ規則で id を作る
                url: heading ? `${note.href}#${toHeadingId(heading)}` : note.href,
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

const CALLOUT = /^\[!(\w+)\]([+-]?)[ \t]*/;
const CALLOUT_LABELS: Record<string, string> = {
  note: "メモ",
  info: "情報",
  tip: "ヒント",
  abstract: "概要",
  question: "質問",
  success: "答え",
  example: "例",
  warning: "注意",
  danger: "危険",
  quote: "引用",
};

/**
 * Obsidian の callout(> [!note] タイトル)を <div class="callout"> に変換する remark プラグイン。
 * [!type]- / [!type]+ は折りたたみ式なので <details> と <summary> にする。
 */
function remarkCallout() {
  return (tree: MdastRoot) => {
    visit(tree, "blockquote", (node) => {
      const first = node.children[0];
      if (first?.type !== "paragraph") return;
      const head = first.children[0];
      if (head?.type !== "text") return;
      const m = head.value.match(CALLOUT);
      if (!m) return;

      const type = m[1].toLowerCase();
      const fold = m[2];
      head.value = head.value.slice(m[0].length);

      // 1行目(最初の改行まで)がタイトル、残りが本文
      const titleNodes: PhrasingContent[] = [];
      const rest: PhrasingContent[] = [];
      let inTitle = true;
      for (const child of first.children) {
        if (!inTitle) {
          rest.push(child);
        } else if (child.type === "text" && child.value.includes("\n")) {
          const i = child.value.indexOf("\n");
          if (i > 0) titleNodes.push({ type: "text", value: child.value.slice(0, i) });
          if (i < child.value.length - 1) {
            rest.push({ type: "text", value: child.value.slice(i + 1) });
          }
          inTitle = false;
        } else if (child.type === "break") {
          inTitle = false;
        } else {
          titleNodes.push(child);
        }
      }
      const hasTitle = titleNodes.some(
        (n) => n.type !== "text" || n.value.trim() !== "",
      );

      const title: Paragraph = {
        type: "paragraph",
        children: hasTitle
          ? titleNodes
          : [{ type: "text", value: CALLOUT_LABELS[type] ?? type }],
        data: {
          hName: fold ? "summary" : "div",
          hProperties: { className: ["callout-title"] },
        },
      };
      const content: Blockquote = {
        type: "blockquote",
        children: [
          ...(rest.length > 0 ? [{ ...first, children: rest }] : []),
          ...node.children.slice(1),
        ],
        data: { hName: "div", hProperties: { className: ["callout-content"] } },
      };

      node.children = [title, content];
      node.data = {
        hName: fold ? "details" : "div",
        hProperties: {
          className: ["callout"],
          dataCallout: type,
          open: fold === "+" ? true : undefined,
        },
      };
    });
  };
}

/**
 * ```mermaid のコードブロックを、図として描画する枠(div[data-mermaid])に変える。
 * 実際の描画はブラウザで行う(components/mermaid-diagram.tsx)。Obsidian でも同じ書き方で図になる。
 *
 * テキストの図(```)のすぐ後に ```mermaid があれば、2つを1組(div[data-diagram-tabs])にまとめ、
 * サイトでは「図 / テキスト」のタブで切り替えて見せる(components/diagram-tabs.tsx)。
 * Obsidian ではタブにならず、2つが上下に並ぶ。
 */
function remarkMermaid() {
  return (tree: MdastRoot) => {
    visit(tree, "code", (node, index, parent) => {
      if (node.lang !== "mermaid" || !parent || index === undefined) return;
      // remark-rehype は知らない種類のノードを、子を持つ div として出力する(data.hName・hProperties も効く)。
      // code のままだと <pre> で包まれてしまうので、別の種類のノードに置き換える
      const block = (type: string, dataProps: Record<string, string>, children: unknown[]) =>
        ({ type, data: { hName: "div", hProperties: dataProps }, children }) as unknown as MdastRoot["children"][number];
      const diagram = block("mermaid", { dataMermaid: node.value }, []);
      const prev = index > 0 ? parent.children[index - 1] : undefined;
      if (prev?.type === "code" && prev.lang !== "mermaid") {
        parent.children.splice(index - 1, 2, block("diagramTabs", { dataDiagramTabs: "" }, [prev, diagram]));
        return [SKIP, index];
      }
      parent.children[index] = diagram;
      return [SKIP, index + 1];
    });
  };
}

/** shiki が知らない言語(gitignore など)は書式なしとして扱う。知らない言語があるとビルドが止まるため */
function remarkCodeLang() {
  return (tree: MdastRoot) => {
    visit(tree, "code", (node) => {
      if (node.lang && !(node.lang in bundledLanguages)) node.lang = "plaintext";
    });
  };
}

/** 横に長い表を、表だけ横スクロールする枠(div.table-wrap)で包む rehype プラグイン */
function rehypeTableWrap() {
  return (tree: HastRoot) => {
    visit(tree, "element", (node, index, parent) => {
      if (node.tagName !== "table" || !parent || index === undefined) return;
      parent.children[index] = {
        type: "element",
        tagName: "div",
        properties: { className: ["table-wrap"] },
        children: [node],
      };
      return SKIP;
    });
  };
}

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkEmbed)
  .use(remarkWikilink)
  .use(remarkCallout)
  // Obsidian と同じく、1回の改行もそのまま改行として表示する(callout のタイトル分けより後に置く)
  .use(remarkBreaks)
  .use(remarkMermaid)
  .use(remarkCodeLang)
  .use(remarkRehype)
  .use(rehypeTableWrap)
  .use(rehypeSlug)
  .use(rehypePrettyCode, {
    // ライト・ダークの両方の色を出力し、CSS で切り替える(globals.css)
    theme: { light: "github-light", dark: "github-dark" },
    keepBackground: false,
    defaultLang: { block: "plaintext" },
  });

/** Markdown 本文 → HTML の構文木(hast)。描画は components/markdown.tsx が行う */
export async function markdownToHast(markdown: string): Promise<HastRoot> {
  return processor.run(processor.parse(markdown));
}

export type TocItem = { id: string; text: string; depth: 2 | 3 };

/** ページ内目次用に h2・h3 を取り出す */
export function extractToc(tree: HastRoot): TocItem[] {
  const items: TocItem[] = [];
  for (const node of tree.children) {
    if (node.type !== "element" || (node.tagName !== "h2" && node.tagName !== "h3")) {
      continue;
    }
    const id = node.properties.id;
    if (typeof id === "string") {
      items.push({ id, text: hastToString(node), depth: node.tagName === "h2" ? 2 : 3 });
    }
  }
  return items;
}
