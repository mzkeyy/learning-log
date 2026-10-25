---
title: "Codex 04 サンドボックス・承認・安全"
modified: 2026-09-29
---

Codex の安全は **2層**で決まる。
| 層 | 決めること |
| --- | --- |
| **サンドボックス(sandbox_mode)** | 技術的に**何ができるか**(どこに書けるか、ネットワークに出られるか)。OS が強制 |
| **承認ポリシー(approval_policy)** | **いつ人間に聞くか**(サンドボックスの外に出る時、ネットワークを使う時など) |

## 既定の動き
- **ネットワークは既定でオフ**
- 書き込みは**作業中のワークスペース(と /tmp など)だけ**
- Git 管理されたフォルダ → 「Auto」(workspace-write + on-request)を推奨、Git 管理外 → read-only を推奨
- 初めてのフォルダは信頼するまで read-only のことがある(`/permissions` で変更)
- `.git` や `.codex` などは書き込み可能な範囲内でも保護される

## よく使う組み合わせ
| 目的 | 指定 | 動き |
| --- | --- | --- |
| **Auto(既定プリセット)** | 指定なし / `--sandbox workspace-write --ask-for-approval on-request` | ワークスペース内の読み書き・コマンドは自動。外への書き込みやネットワークは確認 |
| 安全に眺めるだけ | `--sandbox read-only --ask-for-approval on-request` | 読むだけ。変更には確認 |
| CI で読み取りのみ | `--sandbox read-only --ask-for-approval never` | 確認なしで読むだけ |
| 自動レビュー | `... -c approvals_reviewer=auto_review` | 確認が必要な操作を別の仕組みが審査 |
| **危険: 全開放** | `--dangerously-bypass-approvals-and-sandbox`(`--yolo`) | サンドボックスも承認もなし(**非推奨。隔離された環境でのみ**) |
- 実行中は `/permissions` で切り替え
- 旧 `approval_policy = "untrusted"` は廃止(残っていると起動しないことがある)

## ネットワーク
```toml
[sandbox_workspace_write]
network_access = true
```
- 宛先ルールでドメインごとに許可/拒否も可能
- クラウドは別設定(ドメイン許可リスト or 全開放)

## Rules(サンドボックス外で実行してよいコマンド、実験的)
```python
# ~/.codex/rules/default.rules
prefix_rule(
    pattern = ["gh", "pr", "view"],
    decision = "prompt",                     # 確認してから許可
    justification = "PR の閲覧は確認付きで許可",
    match = ["gh pr view 7888"],             # テスト例(一致すべき)
    not_match = ["gh pr --repo openai/codex view 7888"],
)
```
- TUI で「今後も許可」を選ぶと `~/.codex/rules/default.rules` に追記される
- Smart approvals(既定)は承認時にルール案を提示 → 範囲が広すぎないか確認してから受け入れる

## 安全監視
- GPT-6 Astra がタスク中の挙動を非同期で監視し、危険と判断すると**一時停止**
- 通知と調査結果を確認してから再開(CLI では再開できずタスク終了)
- 監視はサンドボックスや人間のレビューの代わりではない

## Windows / コンテナ
- ネイティブ Windows: `[windows] sandbox = "elevated"` 推奨
- Dev Container の中で動かすとさらに隔離できる

## 実務の安全ルール
- [ ] 基本は **Auto(workspace-write + on-request)**。全開放はコンテナ・VM の中だけ
- [ ] タスクの前後で **Git コミット**(いつでも戻せる)
- [ ] 秘密情報を含むファイル・本番の認証情報を作業フォルダに置かない
- [ ] 承認を求められたコマンドは読んでから許可(特にネットワーク・削除)
- [ ] 他人のリポジトリの `.codex/`(設定・hooks・rules)は中身を確認してから信頼
- [ ] 監視・テレメトリ(OpenTelemetry)は組織で必要なら有効化

## 関連
- 前: [[Codex_03_AGENTS.mdとconfig.toml]] / 次: [[Codex_05_拡張(MCP・Skills・Plugins・Hooks・Subagents)]]
- [[05_権限とセキュリティ]](Claude Code の同等機能)/ [[APIキー・シークレット管理]]
- 公式: https://learn.chatgpt.com/docs/agent-approvals-security , https://learn.chatgpt.com/docs/agent-configuration/rules
