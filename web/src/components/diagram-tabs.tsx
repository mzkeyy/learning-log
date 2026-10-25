"use client";

import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * 同じ内容の「図(mermaid)」と「テキストの図」をタブで切り替える。最初は図を見せる。
 * keepMounted: 隠れている側も HTML に残す(JavaScript なしでも中身があり、検索の対象にもなる)
 */
export function DiagramTabs({ diagram, text }: { diagram: ReactNode; text: ReactNode }) {
  return (
    <Tabs defaultValue="diagram" className="my-6 gap-0">
      <TabsList aria-label="図の表示方法" className="not-prose">
        <TabsTrigger value="diagram">図</TabsTrigger>
        <TabsTrigger value="text">テキスト</TabsTrigger>
      </TabsList>
      {/* 本文のスタイル(prose)はコードブロックに効かせたいので、外すのはタブのボタンだけ。
          中の図・コードブロックの上下の余白はタブ側でとるので消す */}
      <TabsContent value="diagram" keepMounted className="[&>figure]:mt-2 [&>figure]:mb-0">
        {diagram}
      </TabsContent>
      <TabsContent value="text" keepMounted className="[&>figure]:mt-2 [&>figure]:mb-0 [&_pre]:my-0">
        {text}
      </TabsContent>
    </Tabs>
  );
}
