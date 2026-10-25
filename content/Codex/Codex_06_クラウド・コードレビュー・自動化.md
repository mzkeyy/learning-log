---
title: "Codex 06 クラウド・コードレビュー・自動化"
modified: 2026-09-29
---

## Codex cloud(クラウドで並列実行)
OpenAI 管理の**隔離されたコンテナ**でタスクを実行。PC を閉じても続く。
### 始め方
1. https://chatgpt.com/codex にサインイン
2. **GitHub**(または GitLab β)を接続し、アクセスさせるリポジトリを選ぶ
3. **環境(Environment)を作成**: 依存関係、ツール、環境変数、シークレット、セットアップ手順
4. 環境を選んでタスクを依頼(ログを見る or 放置)
5. 要約と差分を確認 → 追加修正を頼む or **PR を作成**
### ポイント
- 2段階: セットアップ(依存のインストールでネットワーク可)→ エージェント実行(既定でネットワーク制限。ドメイン許可リストで開放可)
- 複数タスクを同時に投げて、終わったものから確認
- GitHub の PR、GitLab の MR・issue、Linear の issue、Slack から依頼できる
- CLI から: `codex cloud`、結果を手元に: `codex apply`
- 手元の作業をクラウドへ: `/cloud`、戻す: `/local`

## コードレビュー
- CLI: `/review`(未コミットの変更 or ベースブランチとの比較)、`codex review`
- デスクトップアプリ: レビューペインで差分・指摘・インラインコメント、ステージ/取り消し
- **PR レビュー**: GitHub 連携で PR を自動レビュー
- 複数リポジトリのレビューにも対応
- 利用枠を消費する(料金ページに「Code Review の使用量」の説明あり)

## 自動化
### CI から(codex exec)
```bash
codex exec --sandbox read-only --ask-for-approval never --json "このブランチの変更点を要約して" > summary.jsonl
```
- 権限は最小限に(読み取り専用が基本)
- GitHub Action も提供されている(公式ドキュメント「GitHub Action」)

### Goal モード(長時間の自律作業)
- `/goal 達成条件` で、数時間〜数日単位でも条件達成まで作業を続ける。途中で確認・修正・一時停止

### スケジュール実行(Automations)
- ChatGPT のスケジュールタスクで定期実行(例: 毎朝の依存関係チェック)

### Codex SDK / App Server
- **Codex SDK**: プログラムからローカルの Codex エージェントを制御
- **App Server**: 自社プロダクトに Codex を組み込むためのプロトコル

## 実務での使い分け
| 状況 | 使う面 |
| --- | --- |
| 手元で対話しながら開発 | CLI / IDE 拡張 / デスクトップアプリ |
| 独立したタスクを複数並行、PC を閉じたい | Codex cloud |
| PR の一次レビュー | PR レビュー連携、`/review` |
| 定型作業の自動化 | `codex exec` in CI、Automations |

## 関連
- 前: [[Codex_05_拡張(MCP・Skills・Plugins・Hooks・Subagents)]] / 次: [[Codex_07_プロンプトとベストプラクティス・Claude Codeとの比較]]
- [[Cicdパイプライン]] / [[15_自動化(headless・goal・loop・routines・CI)]]
- 公式: https://learn.chatgpt.com/docs/cloud , https://learn.chatgpt.com/docs/code-review , https://learn.chatgpt.com/docs/codex-sdk
