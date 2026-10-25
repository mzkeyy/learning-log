import type { Root } from "hast";
import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import Link from "next/link";
import { Children, type ComponentProps, isValidElement } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { DiagramTabs } from "@/components/diagram-tabs";
import { MermaidDiagram } from "@/components/mermaid-diagram";

/**
 * ノート内のリンク。サイト内のリンクは next/link にして basePath(/learning-log)を自動で付ける。
 * 外部サイトへのリンクは新しいタブで開く。
 */
function MarkdownLink({ href = "", ...props }: ComponentProps<"a">) {
  if (href.startsWith("/")) {
    return <Link href={href} {...props} />;
  }
  if (href.startsWith("#")) {
    return <a href={href} {...props} />;
  }
  return <a href={href} target="_blank" rel="noreferrer" {...props} />;
}

/**
 * lib/markdown.ts の remarkMermaid が作る枠:
 * - div[data-mermaid]: ```mermaid のブロック → 図にする
 * - div[data-diagram-tabs]: テキストの図と mermaid の図の組 → タブで切り替える
 */
function MarkdownDiv(props: ComponentProps<"div"> & { "data-mermaid"?: string; "data-diagram-tabs"?: string }) {
  const chart = props["data-mermaid"];
  if (chart !== undefined) return <MermaidDiagram chart={chart} />;
  if (props["data-diagram-tabs"] !== undefined) {
    const [text, diagram] = Children.toArray(props.children).filter(isValidElement);
    return <DiagramTabs text={text} diagram={diagram} />;
  }
  return <div {...props} />;
}

/**
 * ノートに埋め込んだ画像(![[…]])。draw.io の図は白地で描かれているので、
 * ダークモードでも読めるよう白い枠に載せる
 */
function MarkdownImage({ src, alt = "", ...props }: ComponentProps<"img">) {
  const drawio = typeof src === "string" && src.endsWith(".drawio.svg");
  return (
    // 静的出力では next/image の最適化が使えないので、普通の <img> にする
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={drawio ? "mx-auto rounded-lg border bg-white p-3" : "mx-auto rounded-lg"}
      {...props}
    />
  );
}

/** HTML の構文木を React 要素として描画する(dangerouslySetInnerHTML を使わない) */
export function Markdown({ tree }: { tree: Root }) {
  return toJsxRuntime(tree, {
    Fragment,
    jsx,
    jsxs,
    components: { a: MarkdownLink, div: MarkdownDiv, img: MarkdownImage },
  });
}
