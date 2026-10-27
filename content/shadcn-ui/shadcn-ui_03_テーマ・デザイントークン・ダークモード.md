---
title: "shadcn/ui 03 テーマ・デザイントークン・ダークモード"
modified: 2026-09-29
---

shadcn/ui のテーマは **CSS 変数 = [[デザイントークン|デザイントークン]]** で管理する(推奨・既定)。
部品のクラスを書き換えずに、変数を変えるだけでサイト全体の見た目が変わる。

## トークンの命名規則
**「面(背景)」と「その上の文字色(-foreground)」をペアで**持つ。
```css
--primary: oklch(0.205 0 0);
--primary-foreground: oklch(0.985 0 0);
```
```tsx
<div className="bg-primary text-primary-foreground">Hello</div>
```

## トークン一覧
| トークン | 役割 | 使われる場所 |
| --- | --- | --- |
| `background` / `foreground` | ページ全体の背景と文字 | ページ、セクション |
| `card` / `card-foreground` | 浮き上がった面 | Card、パネル |
| `popover` / `popover-foreground` | 浮かぶ面 | Popover、Dropdown |
| `primary` / `primary-foreground` | **主要なアクション・ブランド** | 既定の Button、選択状態 |
| `secondary` / `-foreground` | 控えめな塗りのアクション | Secondary ボタン |
| `muted` / `muted-foreground` | 控えめな面・補足文字 | 説明文、プレースホルダ、空状態 |
| `accent` / `accent-foreground` | ホバー・フォーカス・選択中 | Ghost ボタン、メニューのハイライト |
| `destructive` | 削除・エラー | 削除ボタン、不正な入力 |
| `border` / `input` / `ring` | 枠線 / 入力欄の枠 / フォーカスリング | |
| `chart-1`〜`chart-5` | グラフの色 | Chart |
| `sidebar-*` | サイドバー専用 | Sidebar |
| `radius` | 角丸の基準値 | `radius-sm`〜`4xl` が自動で計算される |
- 色の形式は **OKLCH**(人間の見た目に近い色空間。明るさを揃えやすい)
- 基本色: Neutral / Stone / Zinc / Mauve / Olive / Mist / Taupe

## globals.css の構造(Tailwind v4)
```css
@import "tailwindcss";
@import "shadcn/tailwind.css";
@custom-variant dark (&:is(.dark *));

:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  /* ... */
}
.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  /* 役割は同じ、値だけ変える */
}
@theme inline {
  --color-background: var(--background);   /* → bg-background が使える */
  --color-primary: var(--primary);
  /* ... */
}
```

## ブランドカラーに変える
`:root` と `.dark` の `--primary` などを書き換えるだけ。
- 視覚的に作るなら https://ui.shadcn.com/create → プリセットを `npx shadcn@latest apply <code> --only theme`
- コントラスト(文字が読めるか)を確認([[デザインの4原則]] の「対比」、WCAG 4.5:1)

## 新しいトークンを追加する
```css
:root {
  --warning: oklch(0.84 0.16 84);
  --warning-foreground: oklch(0.28 0.07 46);
}
.dark {
  --warning: oklch(0.41 0.11 46);
  --warning-foreground: oklch(0.99 0.02 95);
}
@theme inline {
  --color-warning: var(--warning);
  --color-warning-foreground: var(--warning-foreground);
}
```
```tsx
<div className="bg-warning text-warning-foreground">注意</div>
```
→ 「成功」「情報」など状態色を足す時の定番手順。

## ダークモード(Next.js)
```bash
npm install next-themes
```
```tsx
// components/theme-provider.tsx
'use client'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
export function ThemeProvider({ children, ...props }: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
```
```tsx
// app/layout.tsx
<html lang="ja" suppressHydrationWarning>
  <body>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </ThemeProvider>
  </body>
</html>
```
- 切替ボタン: `useTheme()` の `setTheme('light' | 'dark' | 'system')`
- 仕組み: `<html class="dark">` になると `.dark` の変数が効く
- Vite / Astro / Remix 用の手順も公式にある

## 実務のルール
- **色を直書きしない**(`bg-[#ff5500]` ではなく `bg-primary`)→ AI にもこのルールを CLAUDE.md で伝える
- 主要アクション(`primary`)は1画面に1つ程度→ [[デザイントークン_02_設計と命名(カテゴリ別)]]
- 新しい色が必要になったら「トークンとして追加」してから使う

## 関連
- 前: [[shadcn-ui_02_導入とCLI]] / 次: [[shadcn-ui_04_コンポーネント地図と使い方]]
- 公式: https://ui.shadcn.com/docs/theming , https://ui.shadcn.com/docs/dark-mode
