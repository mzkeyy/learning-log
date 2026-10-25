---
title: "Tailwind CSS"
modified: 2026-10-18
---

HTMLのクラス名に `p-4`(padding 16px)や `text-lg`(大きめの文字)のような**小さな役割のクラスを並べて見た目を作る**CSSフレームワーク。「ユーティリティファースト」と呼ばれる。

## 例
```html
<button class="bg-primary text-white px-4 py-2 rounded-md hover:opacity-90">
  応募する
</button>
```
CSSファイルを別に書かなくても、HTMLだけで見た目が完成する。

## メリット
- CSSファイルとHTMLを行き来しなくてよい
- 使える値(余白・色など)があらかじめ決まっているので、**自然と統一感が出る**(= [[デザイントークン]] と相性が良い)
- 使ったクラスだけが最終的なCSSに含まれるので軽い
- 生成AIが非常に得意。AIに書かせるUIの多くがTailwind前提

## デメリット
- クラス名が長くなりHTMLが読みにくくなる
- 最初はクラス名を覚える必要がある(AIに聞けばOK)

## よく使うクラス
| クラス | 意味 |
| --- | --- |
| `p-4` / `px-4` / `py-2` | padding(4 = 16px。1単位 = 4px) |
| `gap-2` | 子要素同士の間隔 8px |
| `flex` / `grid` | レイアウト |
| `text-sm` / `font-bold` | 文字 |
| `bg-primary` / `text-muted-foreground` | トークン化された色 |
| `md:` `lg:` 接頭辞 | 画面幅ごとの切り替え(レスポンシブ) |
| `dark:` 接頭辞 | ダークモード時 |

## 関連
- [[shadcn-ui]]
- [[デザイントークン]]
- [[Next.js]]
