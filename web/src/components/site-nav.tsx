"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Field } from "@/lib/site";
import { cn } from "@/lib/utils";

/** URL を比較できる形にそろえる(日本語のエンコードと末尾のスラッシュ) */
function normalize(path: string) {
  const decoded = decodeURIComponent(path);
  return decoded.endsWith("/") ? decoded : `${decoded}/`;
}

/** 左のサイドバー。分野 → トピック → (今いるトピックだけ)章 の順に並べる */
export function SiteNav({ fields, onNavigate }: { fields: Field[]; onNavigate?: () => void }) {
  const pathname = normalize(usePathname());

  return (
    <nav aria-label="ノート一覧" className="flex flex-col gap-6 text-sm">
      {fields.map((field) => (
        <div key={field.name} className="flex flex-col gap-1">
          <p className="px-2 pb-1 text-xs font-semibold text-foreground">{field.name}</p>
          {field.topics.flatMap((topic) =>
            topic.links.map((link) => {
              const active = pathname === normalize(link.href);
              const open =
                active || link.chapters.some((c) => pathname === normalize(c.href));
              return (
                <div key={link.href}>
                  <Link
                    href={link.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "block rounded-md px-2 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                      (active || open) && "font-medium text-foreground",
                      active && "bg-muted",
                    )}
                  >
                    {link.title}
                  </Link>
                  {open && link.chapters.length > 0 && (
                    <ul className="my-1 ml-3 flex flex-col border-l pl-2">
                      {link.chapters.map((chapter) => {
                        const current = pathname === normalize(chapter.href);
                        return (
                          <li key={chapter.href}>
                            <Link
                              href={chapter.href}
                              onClick={onNavigate}
                              aria-current={current ? "page" : undefined}
                              className={cn(
                                "block rounded-md px-2 py-1 text-[13px] leading-snug text-muted-foreground transition-colors hover:text-foreground",
                                current && "bg-muted font-medium text-foreground",
                              )}
                            >
                              {chapter.title}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            }),
          )}
        </div>
      ))}
    </nav>
  );
}
