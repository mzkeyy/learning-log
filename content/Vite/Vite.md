---
title: "Vite(ヴィート)"
modified: 2026-10-18
---

**Web 開発用の「開発サーバー」と「ビルドツール」**。フランス語で「速い」。React / Vue / Svelte などの土台として使われる、フレームワークではなく“道具”。Vue.js 作者の Evan You が開発。

公式ドキュメント(vite.dev、**Vite 8 / 2026年9月時点**)を読んで整理したノート群の入口。

## 学ぶ順番
| # | ノート | 内容 |
| --- | --- | --- |
| 01 | [[Vite_01_はじめに(仕組み・作成・構成)]] | Vite とは、なぜ速いか、プロジェクト作成 |
| 02 | [[Vite_02_開発の基本(TS・CSS・静的ファイル・環境変数)]] | 日常の開発で使う機能 |
| 03 | [[Vite_03_設定とプラグイン]] | vite.config、エイリアス、プロキシ、プラグイン |
| 04 | [[Vite_04_ビルドとデプロイ]] | 本番ビルド、base、Cloudflare 等への公開 |
| 05 | [[Vite_05_実務構成・テスト・性能・トラブル]] | React SPA の定番構成、Vitest、速度改善、よくある問題 |

## そもそもビルドツールとは
ブラウザは TypeScript や JSX(React の書き方)をそのまま理解できない。そこで
- 開発中: 書いたコードを変換してブラウザで確認できるようにする(**開発サーバー**)
- 公開時: 変換・圧縮して少数のファイルにまとめる(**ビルド/バンドル**)
を行う道具が必要。以前は webpack が主流だったが遅かった。

## 位置づけ
```
[フレームワーク] Next.js(独自: Turbopack)
                TanStack Start / React Router / SvelteKit / Nuxt / Astro ──┐
                                                                         ├─ 中で Vite を使用
[素の SPA]      Vite + React(自分でルーターなどを選ぶ) ─────────────────┘
[ビルドの中身]  Vite 8 = Rolldown(Rust製バンドラー) + Oxc(Rust製変換器)
```
- 「Vite = 部品(ビルドツール)」「Next.js = 完成品(フレームワーク)」とレイヤーが違う
- サーバー処理のない**静的サイトや SPA**なら Vite 単体で十分

## 最新動向(2026年9月時点)
- **Vite 8**(2026年3月12日)が最新メジャー。**Rolldown への一本化**(以前は開発 esbuild / 本番 Rollup の二刀流)で**ビルドが10〜30倍高速**(例: Linear は46秒→6秒)。Vite 2 以来の大きな設計変更
- 既存プラグインはほぼそのまま動く
- 新機能: Vite Devtools、TypeScript のパスエイリアス解決、ブラウザのコンソール出力をターミナルに転送
- **Node.js 20.19+ / 22.12+** が必要
- [[Next.js]] も 16.3 で Vite と同じ書き方の `import.meta.glob` に対応
- [[Cloudflare]] の公式 Vite プラグインで、開発サーバーを本番と同じ Workers 環境で動かせる

## 出典
- 公式: https://vite.dev/guide/ , [Vite 8.0 is out!](https://vite.dev/blog/announcing-vite8) , [Vite Releases](https://vite.dev/releases)
- [Vite team boasts 10-30x faster builds (DEVCLASS)](https://www.devclass.com/development/2026/03/17/vite-team-boasts-10-30x-faster-builds-with-rust-powered-rolldown/5209472)

## 関連
- [[TanStack Start]](Vite ベースのフルスタック FW)
- [[Next.js]] / [[Cloudflare]]
