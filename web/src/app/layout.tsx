import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { SiteNav } from "@/components/site-nav";
import { ThemeProvider } from "@/components/theme-provider";
import { SITE } from "@/lib/config";
import { getSiteIndex } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // 各ページの title が「DNS | Learning Log」のようになる
  title: { default: SITE.name, template: `%s | ${SITE.name}` },
  description:
    "Web 開発まわりで学んだことのまとめノートです。個人の学習メモのため、内容の正確性は保証しません。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const { fields } = getSiteIndex();
  return (
    // next-themes がブラウザ側で <html class="dark"> を付けるので、その差分の警告を抑える
    <html
      lang="ja"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <SiteHeader fields={fields} />
          <div className="mx-auto flex w-full max-w-[1400px] flex-1 gap-10 px-4 sm:px-6">
            {/* 広い画面だけ左にサイドバーを出す(狭い画面はヘッダーのメニューから開く) */}
            <aside className="hidden w-60 shrink-0 border-r lg:block">
              <div className="sticky top-14 h-[calc(100svh-3.5rem)] overflow-y-auto py-8 pr-4">
                <SiteNav fields={fields} />
              </div>
            </aside>
            {children}
          </div>
          <footer className="border-t">
            <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center justify-between gap-2 px-4 py-6 text-sm text-muted-foreground sm:px-6">
              <p>個人の学習メモです。内容の正確性は保証しません。</p>
              <p>Built with Next.js + shadcn/ui</p>
            </div>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
