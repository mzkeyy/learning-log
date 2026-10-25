---
title: "Claude Code"
modified: 2026-10-18
---

Anthropic の**エージェント型コーディングツール**。ターミナル・IDE・デスクトップアプリ・Web で、コードを読み・編集し・コマンドを実行し・検証するところまで自分で進める。

## このノート群について

Anthropic の公式ドキュメント(https://code.claude.com/docs 全約200ページ)を読み、初学者向けに日本語で整理したノート群の入口。
情報は **2026年9月時点(Claude Code v2.1.28x 前後)**。機能の追加・名称変更が非常に速いので、迷ったら `/release-notes` や公式の What's new を確認する。

## 読む順番(おすすめ学習ロードマップ)

### Step 1: まず動かす
1. [[01_概要とインストール]] … Claude Code とは何か、どこで使えるか、インストールとログイン
2. [[03_基本操作(コマンド・ショートカット)]] … `/` コマンド、`@` `!`、Esc・Shift+Tab など最低限の操作

### Step 2: 仕組みを理解する
3. [[02_仕組み(エージェントループ・ツール・コンテキスト)]] … なぜ「コンテキスト管理」が一番大事なのか
4. [[04_CLAUDE.mdとメモリ]] … AIにプロジェクトのルールを覚えさせる方法
5. [[05_権限とセキュリティ]] … AIに何をどこまで許すか(権限モード・サンドボックス)
6. [[06_セッション管理とチェックポイント]] … 会話の再開・巻き戻し・分岐

### Step 3: 上手に使う
7. [[07_ベストプラクティス]] … 公式が推奨する使い方・よくある失敗

### Step 4: 拡張する
8. [[08_拡張機能の全体像]] … CLAUDE.md / Skills / サブエージェント / Hooks / MCP / プラグインの使い分け
9. [[09_Skills]] … 自作コマンド・手順書
10. [[10_サブエージェント]] … 別のAIに仕事を任せる
11. [[11_Hooks]] … 決まった処理を必ず実行させる
12. [[12_MCP(Claude Codeでの使い方)]] … 外部サービスと接続する(一般論は [[MCP]])
13. [[13_プラグイン]] … 拡張機能のパッケージ

### Step 5: 規模を広げる
14. [[14_並列作業(Worktree・Agent View・Workflows)]] … 複数のClaudeを同時に動かす
15. [[15_自動化(headless・goal・loop・routines・CI)]] … 放置で動かす・定期実行・GitHub連携
16. [[16_利用環境(Desktop・IDE・Web・モバイル・ブラウザ)]] … ターミナル以外の使い方
17. [[17_設定とモデル・コスト]] … settings.json、モデル選び、料金
18. [[18_管理者向け・Agent SDK・その他]] … 組織導入、SDK、トラブルシューティング

## ドキュメントの全体構成(公式サイトの章立て)と対応ノート

| 公式の章 | 主なページ | 対応ノート |
| --- | --- | --- |
| Getting started | Overview / Quickstart / Changelog | [[01_概要とインストール]] |
| Core concepts | How Claude Code works / Extend Claude Code / .claude directory / Context window / Prompt caching | [[02_仕組み(エージェントループ・ツール・コンテキスト)]] [[08_拡張機能の全体像]] |
| Use Claude Code | Memory / Sessions / Common workflows / Prompt library / Best practices | [[04_CLAUDE.mdとメモリ]] [[06_セッション管理とチェックポイント]] [[07_ベストプラクティス]] |
| Platforms and integrations | Remote Control / Projects / Mobile / Chrome / Computer use / VS Code / JetBrains / Slack / Cloud / Desktop | [[16_利用環境(Desktop・IDE・Web・モバイル・ブラウザ)]] |
| Code review & CI/CD | Security guidance / Claude Security / Code Review / GitHub Actions / GitLab | [[15_自動化(headless・goal・loop・routines・CI)]] |
| Agents and parallel work | Subagents / Agent view / Agent teams / Cross-session messaging / Workflows / Worktrees | [[10_サブエージェント]] [[14_並列作業(Worktree・Agent View・Workflows)]] |
| MCP / Skills / Artifacts | MCP / Skills / Artifacts | [[12_MCP(Claude Codeでの使い方)]] [[09_Skills]] [[16_利用環境(Desktop・IDE・Web・モバイル・ブラウザ)]] |
| Automation | Hooks / Channels / Scheduled tasks / Goal / Headless / Deep links | [[11_Hooks]] [[15_自動化(headless・goal・loop・routines・CI)]] |
| Plugins | 導入・作成・マーケットプレイス | [[13_プラグイン]] |
| Administration | 組織導入 / 認証 / Bedrock・Vertex等 / ゲートウェイ / 監視・コスト / セキュリティ | [[18_管理者向け・Agent SDK・その他]] [[17_設定とモデル・コスト]] |
| Configuration | Settings / Permissions / Sandboxing / Model / Output styles / Interface | [[17_設定とモデル・コスト]] [[05_権限とセキュリティ]] |
| Reference | CLI / Commands / Env vars / Tools / Interactive mode / Checkpointing / Hooks | [[03_基本操作(コマンド・ショートカット)]] ほか |
| Agent SDK | Python / TypeScript でエージェントを作る | [[18_管理者向け・Agent SDK・その他]] |

## 一言でまとめると
- Claude Code は「**コードを読んで・編集して・コマンドを実行して・確認する**」を自分でぐるぐる回すAI(エージェント)
- 一番大事な資源は **コンテキスト(AIの作業メモリ)**。いっぱいになると性能が落ちる
- 使いこなしの核は **検証手段を渡す / 計画してから実装 / CLAUDE.md を育てる / 余計な話は `/clear`**
- 繰り返す作業は Skills、必ずやらせたいことは Hooks、外部サービスは MCP、重い調査はサブエージェント

## 関連
- [[Codex]] … OpenAI の同種ツール
- [[mdファイル使い分け]]
- 公式: https://code.claude.com/docs/en/overview
