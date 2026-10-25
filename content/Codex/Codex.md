---
title: "Codex(OpenAI Codex)"
modified: 2026-10-18
---

[[OpenAI]] の**AI コーディングエージェント**。コードを読み・編集し・コマンドを実行し・検証する。[[Claude Code]] と同じカテゴリの道具。2026年現在は **ChatGPT の一部**として提供され、ChatGPT の「Work」(調査・資料作成)と利用枠を共有する。
> ※ 2021年頃の同名のコード生成モデル(GitHub Copilot の初期基盤)とは別物。現在の Codex はエージェント製品を指す。

OpenAI 公式ドキュメント(learn.chatgpt.com/docs、**2026年9月時点**)を読んで整理したノート群の入口。

## 学ぶ順番
| # | ノート | 内容 |
| --- | --- | --- |
| 01 | [[Codex_01_概要・導入・モデル]] | 使える場所、インストール、ログイン、モデル選び |
| 02 | [[Codex_02_基本操作(CLI・スラッシュコマンド・exec)]] | 日常の操作、非対話実行 |
| 03 | [[Codex_03_AGENTS.mdとconfig.toml]] | プロジェクトのルール、設定の優先順位 |
| 04 | [[Codex_04_サンドボックス・承認・安全]] | 何をどこまで任せるか |
| 05 | [[Codex_05_拡張(MCP・Skills・Plugins・Hooks・Subagents)]] | 機能を足す |
| 06 | [[Codex_06_クラウド・コードレビュー・自動化]] | 並列実行、PR、CI、SDK |
| 07 | [[Codex_07_プロンプトとベストプラクティス・Claude Codeとの比較]] | 上手な頼み方、使い分け |

## 使える場所
| 場所 | 特徴 |
| --- | --- |
| **ChatGPT デスクトップアプリ**(macOS/Windows/Linux) | Codex を選んでフォルダを開く。プロジェクト、長時間タスク |
| **Codex CLI** | ターミナル。スクリプト・CI(`codex exec`) |
| **IDE 拡張** | VS Code 系・JetBrains など。開いているファイルが自動で文脈に |
| **Codex cloud**(chatgpt.com/codex) | クラウドの隔離環境で並列実行、PR 作成 |
| 連携 | GitHub / GitLab(β)/ Linear / Slack から依頼、GitHub Action |

## 押さえどころ(2026年9月時点)
- 指示ファイルは **AGENTS.md**(他の AI ツールも読む共通規格)。Claude Code と共有するなら AGENTS.md を正本に
- 安全は **サンドボックス × 承認ポリシー**の2層。基本は Auto(workspace-write + on-request)
- `/goal` で条件達成まで長時間の自律作業、MCP・Skills・Plugins・Hooks・Subagents で拡張
- モデルは GPT-6 世代。**GPT-5.5 は 2026年10月14日に ChatGPT・Codex から引退**

## AI エージェント共通の注意
- 出力は必ず自分で動かして確認する(もっともらしい間違いがある)
- API キーなど秘密情報をチャットに貼らない → [[APIキー・シークレット管理]]
- 大きな依頼は小さく分割、タスクの前後で Git コミット

## 出典
- 公式: https://learn.chatgpt.com/docs , [Unrolling the Codex agent loop](https://openai.com/index/unrolling-the-codex-agent-loop/)
- 参考: [OpenAI Codex (Wikipedia)](https://en.wikipedia.org/wiki/OpenAI_Codex_(AI_agent)) , [Codex CLI Guide 2026 (Blake Crosley)](https://blakecrosley.com/guides/codex)

## 関連
- [[Claude Code]] / [[OpenAI]] / [[MCP]] / [[mdファイル使い分け]]
