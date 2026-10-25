import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-w-0 flex-1 flex-col items-start gap-4 py-16">
      <p className="font-mono text-sm text-muted-foreground">404</p>
      <h1 className="text-3xl font-bold tracking-tight">ページが見つかりません</h1>
      <p className="text-muted-foreground">URL が変わったか、公開していないノートの可能性があります。</p>
      <Link href="/" className={buttonVariants({ variant: "outline", size: "lg" })}>
        トップページへ
      </Link>
    </main>
  );
}
