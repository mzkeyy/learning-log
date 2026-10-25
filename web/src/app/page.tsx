import { ArrowRightIcon, InfoIcon } from "lucide-react";
import Link from "next/link";
import { Toc } from "@/components/toc";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { getSiteIndex, type Topic } from "@/lib/site";

function TopicCard({ topic }: { topic: Topic }) {
  const single = topic.links.length === 1 ? topic.links[0] : undefined;
  const header = (
    <CardHeader>
      <div className="flex items-start justify-between gap-2">
        <CardTitle className="text-base">{topic.label}</CardTitle>
        <Badge variant="secondary" className="shrink-0 font-mono">
          {topic.count} notes
        </Badge>
      </div>
    </CardHeader>
  );

  // リンクが1つのトピックはカード全体をリンクにする
  if (single) {
    return (
      <Link href={single.href} className="group rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        <Card className="h-full transition-colors group-hover:bg-muted/50">
          {header}
          <p className="flex items-center gap-1 px-6 text-sm text-muted-foreground">
            {single.chapters.length > 0 ? "目次を開く" : "ノートを開く"}
            <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </p>
        </Card>
      </Link>
    );
  }

  // 「ネットワーク基礎」のように複数のノートをまとめたトピックは、中に各ノートへのリンクを並べる
  return (
    <Card className="h-full">
      {header}
      <ul className="flex flex-wrap gap-x-3 gap-y-1 px-6 text-sm">
        {topic.links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
              {link.title}
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** トップページ(案C)。content/index.md の内容をカードで並べる */
export default function Home() {
  const { intro, about, fields } = getSiteIndex();
  const toc = fields.map((f, i) => ({ id: `field-${i}`, text: f.name, depth: 2 as const }));

  return (
    <>
      <main className="min-w-0 flex-1 py-8">
        <div className="flex max-w-3xl flex-col gap-3">
          <h1 className="text-4xl font-bold tracking-tight">Learning Log</h1>
          <p className="text-lg leading-relaxed text-muted-foreground">{intro}</p>
        </div>

        <Alert className="mt-8 max-w-3xl">
          <InfoIcon />
          <AlertTitle>このサイトについて</AlertTitle>
          <AlertDescription>{about}</AlertDescription>
        </Alert>

        <div className="mt-10 flex flex-col gap-10">
          {fields.map((field, i) => (
            <section key={field.name} aria-labelledby={`field-${i}`} className="flex flex-col gap-4">
              <h2 id={`field-${i}`} className="scroll-mt-20 text-xl font-semibold tracking-tight">
                {field.name}
              </h2>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
                {field.topics.map((topic) => (
                  <TopicCard key={topic.label} topic={topic} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
      <aside className="hidden w-52 shrink-0 xl:block">
        <div className="sticky top-14 py-8">
          <Toc items={toc} />
        </div>
      </aside>
    </>
  );
}
