"use client";

import { MenuIcon } from "lucide-react";
import { useState } from "react";
import { SiteNav } from "@/components/site-nav";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { Field } from "@/lib/site";

/** 画面が狭いときだけ出る、サイドバーを引き出すボタン */
export function MobileNav({ fields }: { fields: Field[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon-lg" aria-label="メニューを開く" className="lg:hidden" />
        }
      >
        <MenuIcon />
      </SheetTrigger>
      <SheetContent side="left" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>ノート一覧</SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-8">
          <SiteNav fields={fields} onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
