import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/markdown";
import { markdownToHast } from "@/lib/markdown";
import { getAllNotes, getNoteBySlug } from "@/lib/notes";

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

export async function generateMetadata({
  params,
}: PageProps<"/[...slug]">): Promise<Metadata> {
  const note = await findNote(params);
  return { title: note?.title };
}

export default async function NotePage({ params }: PageProps<"/[...slug]">) {
  const note = await findNote(params);
  if (!note) notFound();

  const tree = await markdownToHast(note.body);

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <article className="prose prose-zinc max-w-none">
        <h1>{note.title}</h1>
        {note.modified && (
          <p className="text-sm text-zinc-500">更新日: {note.modified}</p>
        )}
        <Markdown tree={tree} />
      </article>
    </main>
  );
}
