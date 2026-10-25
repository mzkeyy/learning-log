import { ChevronRightIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/markdown";
import { Toc } from "@/components/toc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { extractToc, markdownToHast } from "@/lib/markdown";
import { getAllNotes, getBacklinks, getNoteBySlug } from "@/lib/notes";
import { findTopicOf } from "@/lib/site";

// 静的出力なので、generateStaticParams で返したページ以外は存在しない
export const dynamicParams = false;

/** ビルド時に「どのページを作るか」を Next.js に教える。ノート1つにつき1ページ */
export function generateStaticParams() {
  return getAllNotes().map((note) => ({ slug: note.slug }));
}

/** URL の日本語や記号はエンコードされて届くことがあるので、元の文字に戻してから探す */
async function findNote(params: PageProps<"/[...slug]">["params"]) {
  const { slug } = await params;
  return getNoteBySlug(slug.map((segment) => decodeURIComponent(segment)));
}

export async function generateMetadata({ params }: PageProps<"/[...slug]">): Promise<Metadata> {
  const note = await findNote(params);
  return { title: note?.title };
}

export default async function NotePage({ params }: PageProps<"/[...slug]">) {
  const note = await findNote(params);
  if (!note) notFound();

  const tree = await markdownToHast(note.body);
  const toc = extractToc(tree);
  const backlinks = getBacklinks(note);
  const place = findTopicOf(note);

  return (
    <>
      <main className="min-w-0 flex-1 py-8">
        <nav aria-label="パンくずリスト" className="mb-4 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Learning Log
          </Link>
          {place && (
            <>
              <ChevronRightIcon className="size-3.5" aria-hidden="true" />
              <span>{place.field.name}</span>
              {place.link.href !== note.href && (
                <>
                  <ChevronRightIcon className="size-3.5" aria-hidden="true" />
                  <Link href={place.link.href} className="hover:text-foreground">
                    {place.link.title}
                  </Link>
                </>
              )}
            </>
          )}
        </nav>

        {/* data-pagefind-body: 検索の対象はこの中だけ(ヘッダーやサイドバーは含めない) */}
        <article data-pagefind-body className="prose prose-zinc max-w-3xl dark:prose-invert">
          <h1 className="mb-2">{note.title}</h1>
          {note.modified && (
            <p className="mt-0 text-sm text-muted-foreground" data-pagefind-ignore>
              更新日: <time dateTime={note.modified}>{note.modified}</time>
            </p>
          )}
          <Markdown tree={tree} />
        </article>

        {backlinks.length > 0 && (
          <Card className="mt-12 max-w-3xl">
            <CardHeader>
              <CardTitle className="text-base">このノートを参照しているノート</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-1.5 text-sm">
                {backlinks.map((b) => (
                  <li key={b.href}>
                    <Link href={b.href} className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                      {b.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </main>
      <aside className="hidden w-52 shrink-0 xl:block">
        <div className="sticky top-14 max-h-[calc(100svh-3.5rem)] overflow-y-auto py-8">
          <Toc items={toc} />
        </div>
      </aside>
    </>
  );
}
