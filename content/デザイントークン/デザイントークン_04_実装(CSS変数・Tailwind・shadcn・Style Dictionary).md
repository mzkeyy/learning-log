---
title: "デザイントークン 04 実装(CSS 変数・Tailwind・shadcn・Style Dictionary)"
modified: 2026-09-29
---

## Web の基本: CSS カスタムプロパティ(CSS 変数)
```css
:root {
  /* プリミティブ */
  --blue-500: oklch(0.55 0.2 260);
  --gray-900: oklch(0.2 0 0);
  --space-4: 1rem;
  /* セマンティック(プリミティブを参照) */
  --primary: var(--blue-500);
  --foreground: var(--gray-900);
}
.dark {
  --primary: oklch(0.7 0.15 260);   /* 役割は同じ、値だけ変える */
  --foreground: oklch(0.95 0 0);
}
.button {
  background: var(--primary);
  padding: var(--space-4);
}
```
- 実行時に切り替えられる(ダークモード、ブランド切替)
- ブラウザの開発者ツールで値を確認・調整できる

## Tailwind CSS v4: `@theme` でトークンをクラスに
```css
@import "tailwindcss";

@theme {
  --color-brand-500: oklch(0.55 0.2 260);   /* → bg-brand-500 text-brand-500 */
  --spacing: 0.25rem;                        /* → p-4 = 1rem(4 × 0.25rem)*/
  --font-sans: "Noto Sans JP", system-ui, sans-serif;
  --radius-lg: 0.75rem;                      /* → rounded-lg */
  --breakpoint-md: 48rem;                    /* → md: */
}
```
- `@theme` に書いた変数が**ユーティリティクラスになる**(`--color-*` → `bg-*`、`--radius-*` → `rounded-*` など)
- CSS 変数を参照するだけの時は `@theme inline`(shadcn/ui の方式)
```css
:root { --primary: oklch(0.205 0 0); }
.dark { --primary: oklch(0.922 0 0); }
@theme inline { --color-primary: var(--primary); }   /* → bg-primary(モードで自動切替)*/
```

## shadcn/ui = トークン設計済みのスターター
- `background / foreground / primary / secondary / muted / accent / destructive / border / input / ring / chart-* / sidebar-* / radius` が最初から揃っている
- 新しいトークン(`warning` など)は `:root` `.dark` `@theme inline` の3か所に追加
- 詳細 → [[shadcn-ui_03_テーマ・デザイントークン・ダークモード]]

## Style Dictionary(トークンを各プラットフォームに変換)
W3C DTCG 形式の JSON から、CSS・SCSS・JS・iOS・Android などのコードを生成するビルドツール。
```bash
npm install -D style-dictionary
npx style-dictionary init basic      # 雛形
```
```json
// config.json
{
  "source": ["tokens/**/*.json"],
  "platforms": {
    "css": {
      "transformGroup": "css",
      "buildPath": "build/css/",
      "files": [{ "destination": "variables.css", "format": "css/variables" }]
    },
    "js": {
      "transformGroup": "js",
      "buildPath": "build/js/",
      "files": [{ "destination": "tokens.js", "format": "javascript/es6" }]
    }
  }
}
```
```bash
npx style-dictionary build
```
```js
// Node から
import StyleDictionary from 'style-dictionary'
const sd = new StyleDictionary('config.json')
await sd.buildAllPlatforms()
```
- 生成された `variables.css` を読み込む → Tailwind の `@theme inline` で参照
- 代替: Terrazzo(DTCG ネイティブ)など

## デザインツールとの連携
- **Figma Variables**: Figma 上で色・数値・モード(ライト/ダーク)を変数として管理 → DTCG 形式で書き出し
- **Tokens Studio**(Figma プラグイン): トークンを JSON で管理し GitHub と同期
- 理想の流れ: Figma(デザイナーが更新)→ Git に JSON → CI で Style Dictionary → CSS を自動更新 → PR

## 規模別のおすすめ構成
| 規模 | 構成 |
| --- | --- |
| 個人・小規模 | **shadcn/ui の globals.css を直接編集**(これ自体がトークン) |
| チーム・1プロダクト | globals.css + DESIGN.md(使い方のルール)、Figma Variables と名前を合わせる |
| 複数プロダクト・複数プラットフォーム | DTCG 形式 JSON を正本 → Style Dictionary で生成 → npm パッケージ / shadcn レジストリで配布 |

## 関連
- 前: [[デザイントークン_03_W3C標準形式(DTCG)]] / 次: [[デザイントークン_05_運用(テーマ・アクセシビリティ・AI・チェックリスト)]]
- [[Tailwind CSS]] / [[shadcn-ui]]
- 公式: https://styledictionary.com/ , https://tailwindcss.com/docs/theme
