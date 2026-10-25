---
title: "Orca(ADE)"
modified: 2026-10-18
---

**ADE(Agent Development Environment)**= 複数の AI コーディングエージェント(Claude Code・Codex など)を**同時に**動かし、指示・監視・比較・レビューするための作業環境。Orca はその代表的なアプリで、**無料・オープンソース(MIT)**。
開発は Stably AI(Y Combinator 出身のサンフランシスコの小さな会社)。公式サイト: https://www.onorca.dev/ ・ GitHub: stablyai/orca(2026年9月時点で数万スター、ほぼ毎日更新)。

> 一言で: **「複数の AI 職人に同時に仕事をさせ、成果物を見比べて一番良いものを選ぶための管理画面」**

## 学ぶ順番
| # | ノート | 内容 |
| --- | --- | --- |
| 01 | [[Orca_01_ADEとは・仕組み・向き不向き]] | IDE との違い、git worktree による並列、費用 |
| 02 | [[Orca_02_導入と初期設定]] | インストール、**権限を手動に**、作業フォルダ、通知 |
| 03 | [[Orca_03_使い方(並列実行・レビュー・Design Mode)]] | ワークツリー作成→並列実行→差分レビュー→PR、UI 修正 |
| 04 | [[Orca_04_リモート・モバイル・CLI・運用の注意]] | 別PC・SSH・スマホ・CLI・トラブル |

## 全体像
```
            Orca(デスクトップアプリ)
  ┌─────────────────────────────────────────────┐
  │ リポジトリ                                   │
  │  ├ ワークツリーA(ブランチA)─ Claude Code  │ ← それぞれ別フォルダなので
  │  ├ ワークツリーB(ブランチB)─ Codex        │    同時に動かしてもぶつからない
  │  └ ワークツリーC(ブランチC)─ Gemini 等    │
  │ 分割ターミナル / エディタ / 差分ビュー / 内蔵ブラウザ │
  │ GitHub・Linear・Jira 連携 / 通知 / 使用量表示   │
  └─────────────────────────────────────────────┘
        ↑ スマホアプリで監視・返答   ↑ SSH・リモートサーバーで別マシン実行
```

## 押さえどころ
- Orca 自体は**無料**。費用は中で動かすエージェント(Claude・Codex 等)の契約分。**3体同時なら3体分**消費する
- 仕組みの核は **git worktree**(1つのリポジトリから複数の作業フォルダを作る Git の機能)→ [[Claude Code]] の worktree と同じ考え方
- **既定の権限は「確認なしで実行(Yolo)」→ 最初に「手動」へ変える**(本番 DB や git push まで無確認で走るため)
- 向いている: エージェントを2体以上同時に使いたい、結果を比較したい / 不要: 1体で十分、Git を使わない

## 出典
- 公式: https://www.onorca.dev/ , ドキュメント https://www.onorca.dev/docs/ , GitHub https://github.com/stablyai/orca
- 日本語解説: [Orca とは何か(はてなベース)](https://hatenabase.jp/blog/what-is-orca-ade/) / [Orca の設定手順(はてなベース)](https://hatenabase.jp/blog/orca-ade-setup-guide/) / [Orca を試してみた(Tagbangers)](https://tagbangers.co.jp/en/blog/posts/2026/9/orca-ade)

## 関連
- [[Claude Code]](特に [[14_並列作業(Worktree・Agent View・Workflows)]])/ [[Codex]]
