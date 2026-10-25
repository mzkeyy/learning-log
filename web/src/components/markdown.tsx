import type { Root } from "hast";
import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import Link from "next/link";
import type { ComponentProps } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";

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

/** HTML の構文木を React 要素として描画する(dangerouslySetInnerHTML を使わない) */
export function Markdown({ tree }: { tree: Root }) {
  return toJsxRuntime(tree, {
    Fragment,
    jsx,
    jsxs,
    components: { a: MarkdownLink },
  });
}
