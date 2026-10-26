---
title: "18 管理者向け・Agent SDK・その他"
modified: 2026-10-25
---

個人の学習ではまず不要だが、「こういうものがある」と知っておくと役立つ範囲。

## Agent SDK(Claude Code をライブラリとして使う)
- Claude Code と**同じツール・エージェントループ・コンテキスト管理**を、Python / TypeScript から使える
- 自作アプリに「自分で計画してツールを呼ぶエージェント」を組み込みたい時に使う
```bash
npm install @anthropic-ai/claude-agent-sdk   # TypeScript
pip install claude-agent-sdk                  # Python
```
- できること: カスタムツール、MCP 接続、サブエージェント、Skills、プラグイン、権限制御、Hooks、ファイルのチェックポイント、構造化出力、コスト追跡、OpenTelemetry
- `claude -p`(非対話モード)は SDK の CLI 版 → [[15_自動化(headless・goal・loop・routines・CI)]]

| やりたいこと | 使うもの |
| --- | --- |
| 自分のアプリにエージェントを組み込む | **Agent SDK** |
| ターミナルで対話的に開発 | Claude Code CLI |
| Claude API を直接呼ぶ(ツールループは自前) | Client SDK(`anthropic` パッケージ) |
| サーバー側で管理されたエージェント | Managed Agents |
- 4つの作り方の比較とアプリへの組み込み方 → [[AIアプリ開発_05_エージェント(ループ・Agent SDK・Managed Agents)]]

## 組織への導入(Administration)
- **管理設定(Managed settings)**: 組織のポリシーを全開発者のPCに配布。誰も上書きできない。配布方法は claude.ai 管理コンソール / MDM / ファイル
  - 例: 危険なコマンドを deny、サンドボックス強制、ログイン方法や組織の固定、使えるモデルの制限(`availableModels` / `deniedModels`)、使える API プロバイダの制限(`allowedProviders`)、MCP サーバーの許可/拒否リスト、Auto モードの無効化、Mods の制限
- **管理 CLAUDE.md**: 組織共通の行動指針(強制ではなく指示)
- **認証**: claude.ai アカウント(Pro/Max/Team/Enterprise)、Claude Console(API)、SSO
- **クラウドプロバイダ経由**: Amazon Bedrock / Google Cloud(Agent Platform)/ Microsoft Foundry / Claude Platform on AWS(`/setup-bedrock` `/setup-vertex` ウィザード)
- **LLM ゲートウェイ**: 社内のゲートウェイ経由で送る、Claude apps gateway(SSO・利用上限・ポリシー)
- **ネットワーク**: プロキシ、証明書、許可が必要なドメイン
- **Dev Container**: チーム全員で同じ隔離環境に Claude Code を入れる
- **セルフホスト環境**: クラウドセッションを自社インフラで実行(Team/Enterprise 公開β)
- **Auto モードの設定**: `/auto-mode-setup` や公式「Configure auto mode」で、組織の環境(信頼するドメイン・リポジトリ)を分類器に教える
- **監視**: OpenTelemetry で利用量・コスト・ツール使用をエクスポート(止められた操作は `claude_code.safety_event`)、利用分析ダッシュボード
- **HIPAA**: HIPAA 対応組織向けのローカルモード設定ガイドがある
- **導入支援**: 社内告知用キット、推進役(チャンピオン)向けキット

## データの扱い
- **個人プラン(Free/Pro/Max)**: 設定で「モデル改善に使ってよい」を ON にしている場合、Claude Code の利用データも学習に使われる。`/privacy-settings` や claude.ai の設定で変更可能
- **商用(Team/Enterprise/API/クラウドプロバイダ)**: 原則として学習に使われない
- `/feedback` `/bug` で送った会話は5年保持
- ローカルの会話履歴は `~/.claude/projects/`(既定約30日で自動削除。`cleanupPeriodDays`)
- Zero Data Retention(ZDR): 対象の Enterprise 向けに個別契約で提供

## トラブルシューティング
| 困りごと | まずやること |
| --- | --- |
| インストール・ログインできない | 公式「Troubleshoot installation and login」、`claude doctor` |
| CLAUDE.md・設定・Hook・MCP・Skill が効かない | `/context`(読み込まれた物)、`/doctor`、`/hooks`、`/mcp`、`/skills` |
| 動作がおかしい | `/debug`、`claude --debug` |
| 重い・メモリを食う | 公式 Troubleshooting(`/heapdump`) |
| カスタマイズのどれかが原因か切り分けたい | `claude --safe-mode`(全カスタマイズを無効にして起動) |
| 自動コンパクションが繰り返しエラー | 巨大なファイル/出力が原因。`/clear` して範囲を絞る |
| エラーメッセージの意味 | 公式「Error reference」 |
| 大規模リポジトリ・モノレポ | ネストした CLAUDE.md、パス指定の rules、パッケージ単位の Skills、コードインテリジェンス、sparse worktree(公式「large codebases」) |

## 他ツールからの移行
- `/import codex|gemini|cursor` で指示ファイル・MCP・コマンド・サブエージェント・Skills を取り込み
- `/init` も `.cursorrules` や Copilot の指示を読む
- AGENTS.md はそのまま読める → [[04_CLAUDE.mdとメモリ]]

## 用語集(よく出る言葉)
| 用語 | 意味 |
| --- | --- |
| エージェントループ | 情報収集→行動→検証の繰り返し |
| ハーネス | モデルの周りでツールと文脈を管理する層(= Claude Code) |
| コンテキストウィンドウ | モデルが一度に見られる情報量 |
| コンパクション | コンテキストが溢れそうな時の要約 |
| チェックポイント | 巻き戻し用のスナップショット |
| system reminder | Claude Code が会話に自動で足す注意書き |
| frontmatter | Markdown 先頭の `---` で囲んだ YAML 設定 |
| worktree | 同じリポジトリの別作業ディレクトリ |
| スコープ | 設定の有効範囲(user / project / local / managed) |
| ワークスペーストラスト | 初めてのフォルダを信頼するかの確認 |
| Mod | プラグインに入れた JavaScript で Claude Code 自体の画面・動作を変える仕組み |
| settings hook | settings.json に書く従来の Hook(Mod の hook と区別した呼び方) |

## 最新情報の追い方
- `/release-notes`(版ごとの変更)
- 公式 What's new(週ごとのダイジェスト): https://code.claude.com/docs/en/whats-new
- 2026年の主な動き:
  - 7月: Sonnet 5 / Opus 5、Claude in Chrome 一般提供
  - 8月: セッション間メッセージ、Auto モード既定化(Pro/Max/Team)、`/design`
  - 9月: Fable 5.1、`claude plugin eval`、Opus 5.5(全プランの既定に)、Sonnet 5.5、AGENTS.md の自動読込、claude.ai のスキル同期、ターミナルでも Auto が既定に
  - 10月: Mods、Haiku 5.5、Routines → Scheduled tasks に改名、アイドル時のコンパクション、`/auto-mode-setup`、Claude Tag(Slack)
- ※ What's new(週ごとのダイジェスト)は Week 37(9月7〜11日)以降は更新が止まっているので、それ以降は Changelog を見る

## 関連
- [[Claude Code]] / [[AIアプリ開発]]
- 公式: https://code.claude.com/docs/en/agent-sdk/overview , https://code.claude.com/docs/en/admin-setup , https://code.claude.com/docs/en/data-usage , https://code.claude.com/docs/en/troubleshooting
