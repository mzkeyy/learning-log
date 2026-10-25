"use client";

import { useEffect, useState } from "react";
import type { TocItem } from "@/lib/markdown";
import { cn } from "@/lib/utils";

/** 右側の「このページの目次」。今読んでいる見出しを強調する */
export function Toc({ items }: { items: TocItem[] }) {
  const [activeId, setActiveId] = useState<string>();

  useEffect(() => {
    const headings = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null);
    // 画面の上のほうに入ってきた見出しを「今読んでいる見出し」にする
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((e) => e.isIntersecting);
        if (visible) setActiveId(visible.target.id);
      },
      { rootMargin: "0px 0px -70% 0px" },
    );
    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  return (
    <nav aria-label="このページの目次" className="flex flex-col gap-1 text-sm">
      <p className="pb-1 font-medium">このページの目次</p>
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className={cn(
            "py-1 leading-snug text-muted-foreground transition-colors hover:text-foreground",
            item.depth === 3 && "pl-3 text-[13px]",
            activeId === item.id && "font-medium text-foreground",
          )}
        >
          {item.text}
        </a>
      ))}
    </nav>
  );
}
