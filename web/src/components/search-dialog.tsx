"use client";

import { SearchIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { BASE_PATH } from "@/lib/config";

type Result = { url: string; title: string; excerpt: string };

type Pagefind = {
  options: (o: { baseUrl: string }) => Promise<void>;
  debouncedSearch: (
    q: string,
  ) => Promise<{ results: { data: () => Promise<{ url: string; meta: { title?: string }; excerpt: string }> }[] } | null>;
};

let pagefind: Promise<Pagefind | null> | undefined;

/**
 * Pagefind はビルド後(npm run build の最後)に out/pagefind/ に検索用のデータを作る。
 * それをブラウザで読み込む。開発サーバー(npm run dev)ではまだ存在しないので null になる。
 */
function loadPagefind() {
  pagefind ??= import(/* webpackIgnore: true */ `${BASE_PATH}/pagefind/pagefind.js`)
    .then(async (pf: Pagefind) => {
      await pf.options({ baseUrl: `${BASE_PATH}/` });
      return pf;
    })
    .catch(() => null);
  return pagefind;
}

/** HTML から <mark> と </mark> 以外のタグを取り除く */
function onlyMarkTags(html: string): string {
  return html.replace(/<(?!\/?mark>)[^>]*>/g, "");
}

export function SearchDialog() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [unavailable, setUnavailable] = useState(false);
  const [searching, setSearching] = useState(false);
  const latest = useRef("");

  // ⌘K / Ctrl+K で開く
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function search(q: string) {
    setQuery(q);
    latest.current = q;
    if (!q.trim()) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const pf = await loadPagefind();
    if (!pf) {
      setUnavailable(true);
      setSearching(false);
      return;
    }
    const res = await pf.debouncedSearch(q);
    // 入力が速いと古い検索結果が後から返ってくるので、最新の入力の結果だけ使う
    if (!res || latest.current !== q) return;
    const data = await Promise.all(res.results.slice(0, 8).map((r) => r.data()));
    if (latest.current !== q) return;
    setSearching(false);
    setResults(
      data.map((d) => ({
        // Pagefind の URL には basePath が付いているので外す(Link が付け直す)
        url: d.url.startsWith(BASE_PATH) ? d.url.slice(BASE_PATH.length) : d.url,
        title: d.meta.title ?? d.url,
        excerpt: d.excerpt,
      })),
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            // Button は shrink-0(縮まない)なので、狭い画面では残りの幅だけ使うよう flex-1 と shrink を付ける
            className="h-9 min-w-0 flex-1 shrink justify-start gap-2 px-3 text-muted-foreground sm:w-64 sm:flex-none"
          />
        }
      >
        <SearchIcon />
        <span className="flex-1 text-left">ノートを検索...</span>
        <kbd className="hidden rounded border bg-muted px-1.5 font-mono text-[11px] sm:inline">⌘K</kbd>
      </DialogTrigger>
      <DialogContent className="top-[15%] translate-y-0 gap-3 sm:max-w-xl">
        <DialogTitle>ノートを検索</DialogTitle>
        <Input
          autoFocus
          type="search"
          value={query}
          onChange={(e) => search(e.target.value)}
          placeholder="キーワードを入力(例: キャッシュ、JOIN、認可)"
          aria-label="検索キーワード"
        />
        <div className="max-h-[60svh] overflow-y-auto">
          {unavailable ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              検索は npm run build の後(公開サイト)で使えます。
            </p>
          ) : searching && results.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">検索中...</p>
          ) : query && results.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">見つかりませんでした。</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {results.map((r) => (
                <li key={r.url}>
                  <Link
                    href={r.url}
                    onClick={() => setOpen(false)}
                    className="block rounded-md px-3 py-2 hover:bg-muted"
                  >
                    <p className="text-sm font-medium">{r.title}</p>
                    {/* Pagefind の抜粋は本文をエスケープ済みで、一致箇所だけ <mark> で囲んだ HTML。
                        念のため <mark> 以外のタグは取り除いてから表示する */}
                    <p
                      className="mt-0.5 line-clamp-2 text-xs text-muted-foreground [&_mark]:bg-yellow-200 [&_mark]:text-foreground dark:[&_mark]:bg-yellow-500/40"
                      dangerouslySetInnerHTML={{ __html: onlyMarkTags(r.excerpt) }}
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
