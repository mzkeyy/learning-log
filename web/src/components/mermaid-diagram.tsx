"use client";

import { useTheme } from "next-themes";
import { useEffect, useId, useRef, useState } from "react";

/**
 * Mermaid の図をブラウザで SVG に描画する。
 * mermaid は大きいので、図があるページを開いたときだけ読み込む。
 * ダークモードに切り替えたら、暗い配色で描き直す。
 */
export function MermaidDiagram({ chart }: { chart: string }) {
  const { resolvedTheme } = useTheme();
  const id = `mermaid-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const [svg, setSvg] = useState<string>();
  const [failed, setFailed] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const renders = useRef(0);

  useEffect(() => {
    let cancelled = false;
    import("mermaid")
      .then(async ({ default: mermaid }) => {
        mermaid.initialize({
          startOnLoad: false,
          // 図の中の HTML やクリック時のスクリプトを無効にする
          securityLevel: "strict",
          theme: resolvedTheme === "dark" ? "dark" : "default",
          // 文字の幅を測るフォントと表示するフォントがずれると文字が切れるので、サイトの本文フォントを明示する
          fontFamily: getComputedStyle(document.body).fontFamily,
          // 日本語は単語の区切りがなく、自動の折り返しで幅の計算がずれて文字が切れる。
          // 自動では折り返さず、改行はノート側の <br/> で入れる
          flowchart: { wrappingWidth: 600 },
        });
        // 表示する枠の中で描く(文字の大きさを、実際に表示される CSS のもとで測らせるため)
        // 描き直すとき(テーマの切り替え)は、表示中の古い SVG と ID がぶつからないよう毎回別の ID にする
        renders.current += 1;
        const result = await mermaid.render(`${id}-${renders.current}`, chart, box.current ?? undefined);
        if (!cancelled) setSvg(result.svg);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [chart, id, resolvedTheme]);

  // 描けなかったときは図の元の文字をそのまま見せる
  if (failed) return <pre>{chart}</pre>;
  return (
    // data-pagefind-ignore: 図の元の文字は検索の対象にしない
    <figure className="mermaid-diagram not-prose my-6" data-pagefind-ignore>
      {svg ? (
        // securityLevel: "strict" の mermaid が作った SVG(元はノートに書いた図)
        <div dangerouslySetInnerHTML={{ __html: svg }} />
      ) : (
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">図を表示しています…</div>
      )}
      {/* mermaid が描画中に使う作業用の枠(描き終わると中身は消える) */}
      <div ref={box} aria-hidden className="h-0 overflow-hidden" />
    </figure>
  );
}
