---
title: "shadcn/ui"
modified: 2026-10-18
---

**「インストールして import する UI 部品集」ではなく、部品のソースコードを自分のプロジェクトにコピーして、自分のデザインシステムを作るための道具と配布の仕組み。** React 向け。
[[Tailwind CSS]](見た目)+ アクセシブルな土台(Radix UI / Base UI / React Aria から選択)+ CSS 変数の [[デザイントークン]]。

公式ドキュメント(ui.shadcn.com、**2026年9月時点**)を読んで整理したノート群の入口。
(参考として送られた shadcn.net/ja は日本語で読める解説サイト。最新情報は英語の公式を正とする)

## 学ぶ順番
| # | ノート | 内容 |
| --- | --- | --- |
| 01 | [[shadcn-ui_01_考え方と仕組み]] | 「ライブラリではない」の意味、生成されるファイル、他ライブラリとの比較 |
| 02 | [[shadcn-ui_02_導入とCLI]] | Next.js / Vite / TanStack Start への導入、コマンド一覧 |
| 03 | [[shadcn-ui_03_テーマ・デザイントークン・ダークモード]] | CSS 変数、色の追加、ダークモード |
| 04 | [[shadcn-ui_04_コンポーネント地図と使い方]] | 全60種の分類、よく使う部品の書き方 |
| 05 | [[shadcn-ui_05_フォーム(Field・React Hook Form・Zod)]] | 実務で一番使うフォームの作り方 |
| 06 | [[shadcn-ui_06_レジストリ・MCP・AI開発・実務の注意]] | 自作部品の配布、AI 連携、運用のコツ |

## 最短の使い方
```bash
npx shadcn@latest init        # 設定・cn()・CSS 変数を追加
npx shadcn@latest add button  # components/ui/button.tsx が生成される
```
```tsx
import { Button } from '@/components/ui/button'
<Button variant="outline">送信</Button>
```

## 押さえどころ
- コードが手元にある → **自由に編集できるが、更新は自動では入らない**
- 全体の見た目は部品ファイルではなく**トークン(CSS 変数)側で**変える
- AI と相性が良い(コードを読める、学習データに多い、MCP・Skills あり)
- **レジストリ**で自作部品も配布できる→ [[デザインシステム]]

## 出典
- 公式: https://ui.shadcn.com/docs
- 日本語: https://www.shadcn.net/ja

## 関連
- [[Tailwind CSS]] / [[デザイントークン]] / [[デザインシステム]] / [[コンポーネント設計]]
- [[Next.js]] / [[Vite]] / [[TanStack Start]]
