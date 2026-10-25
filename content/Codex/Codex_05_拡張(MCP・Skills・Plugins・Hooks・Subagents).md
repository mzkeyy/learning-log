---
title: "Codex 05 拡張(MCP・Skills・Plugins・Hooks・Subagents)"
modified: 2026-09-29
---

考え方は [[08_拡張機能の全体像|Claude Code の拡張]] とほぼ同じ。置き場所と書式が違う。

## MCP(外部ツール接続)
```toml
# ~/.codex/config.toml または .codex/config.toml
[mcp_servers.openaiDeveloperDocs]
url = "https://developers.openai.com/mcp"      # リモート(HTTP)

[mcp_servers.context7]
command = "npx"                                # ローカル(stdio)
args = ["-y", "@upstash/context7-mcp"]
env_vars = ["LOCAL_TOKEN"]                     # 渡す環境変数
```
- `codex mcp add ...` / `codex mcp list` でも管理、TUI では `/mcp`
- **MCP サーバーは毎回のメッセージにコンテキストを足す → 使わない時は無効化**(利用枠の節約)
- 例: [[shadcn-ui_06_レジストリ・MCP・AI開発・実務の注意|shadcn MCP]]、[[Cloudflare_06_運用・制限・ベストプラクティス|Cloudflare docs MCP]]

## Skills(手順・知識のパッケージ)
`SKILL.md` を含むフォルダ。**Agent Skills 共通規格**なので Claude Code のスキルと考え方は同じ。
| 範囲 | 場所 |
| --- | --- |
| リポジトリ | `.agents/skills/`(現在地からリポジトリのルートまでの各階層) |
| ユーザー | `~/.agents/skills/` |
| 管理者 | `/etc/codex/skills` |
| システム | Codex 同梱(skill-creator など) |
- `/skills` で一覧・利用、有効/無効の切替
- 配布したい時はプラグインにまとめる
- ⚠️ Claude Code は `.claude/skills/`、Codex は `.agents/skills/`。両方で使うならシンボリックリンクなどで共有

## Plugins
- スキル + コネクタ(Google Drive、Gmail、Slack、GitHub など)をまとめたもの。ChatGPT と Codex で共通のディレクトリから入手
- `/plugins`、`codex plugin`、マーケットプレイス

## Hooks(ライフサイクルで自動実行)
| タイミング | イベント |
| --- | --- |
| ターン中 | `PreToolUse` `PermissionRequest` `PostToolUse` `PreCompact` `PostCompact` `UserPromptSubmit` `SubagentStop` `Stop` |
| 中断時 | `Interrupt` |
| 開始時 | `SessionStart` `SubagentStart` |
| 終了時 | `SessionEnd` |
- 置き場所: 設定レイヤーの隣の `hooks.json`、または `config.toml` の `[hooks]`
- 同じイベントの複数 Hook は並列実行
- **管理者配布でない Hook は、確認して信頼するまで実行されない**
- 用途例(公式): チャットをログ基盤へ送る、API キーの貼り付けをブロック、ターン終了時の検証、ディレクトリ別のプロンプト調整

## Subagents(サブエージェント)
- 大きな作業を分割して並列に進め、メインのコンテキストを汚さない
- Ultra モードは自動でサブエージェントを活用
- `/agent`(`/subagents`)でスレッド切替

### カスタムエージェント(TOML ファイル)
場所: `.codex/agents/`(プロジェクト)または `~/.codex/agents/`(ユーザー)
```toml
# .codex/agents/docs-researcher.toml
name = "docs_researcher"
description = "docs MCP で API やフレームワークの挙動を確認する専門家"
model = "gpt-6-luna"
model_reasoning_effort = "high"
sandbox_mode = "read-only"
developer_instructions = """
docs MCP サーバーで API・オプション・バージョン固有の挙動を確認する。
簡潔に答え、可能ならリンクや正確な参照を付ける。コードは変更しない。
"""
```
- 必須: `name` `description` `developer_instructions`。その他 `model`、`sandbox_mode`、`mcp_servers` なども書ける
- 同時実行数: `[agents] max_concurrent_threads_per_session = 6`
- 依頼例(公式): 「main との差分をレビュー。pr_explorer に影響範囲を調べさせ、reviewer に実際のリスクを探させ、docs_researcher にパッチが依存する API を検証させて」

## 関連
- 前: [[Codex_04_サンドボックス・承認・安全]] / 次: [[Codex_06_クラウド・コードレビュー・自動化]]
- [[MCP]] / [[09_Skills]] / [[10_サブエージェント]] / [[11_Hooks]]
- 公式: https://learn.chatgpt.com/docs/build-skills , https://learn.chatgpt.com/docs/hooks , https://learn.chatgpt.com/docs/agent-configuration/subagents
