import { Markdown } from "@/components/markdown";
import { markdownToHast } from "@/lib/markdown";
import { getIndexNote } from "@/lib/notes";

/** トップページ。段階2では content/index.md をそのまま表示する(段階3で案C のデザインにする) */
export default async function Home() {
  const note = getIndexNote();
  const tree = await markdownToHast(note.body);

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <article className="prose prose-zinc max-w-none">
        <h1>{note.title}</h1>
        <Markdown tree={tree} />
      </article>
    </main>
  );
}
