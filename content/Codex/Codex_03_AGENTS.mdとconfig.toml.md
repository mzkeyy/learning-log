---
title: "Codex 03 AGENTS.md と config.toml"
modified: 2026-09-29
---

## AGENTS.md(プロジェクトのルール)
Codex は作業前に必ず AGENTS.md を読む。Claude Code の CLAUDE.md に相当し、**他の多くの AI ツールも読む共通規格**。

### 読み込み順(指示チェーン)
1. **グローバル**: `~/.codex/AGENTS.override.md` があればそれ、なければ `~/.codex/AGENTS.md`(`CODEX_HOME` で変更可)
2. **プロジェクト**: リポジトリのルートから現在のディレクトリまで下りながら、各階層の `AGENTS.override.md` または `AGENTS.md`
3. **結合**: 上から順に連結。**現在地に近いファイルほど後に来る = 優先される**
- 合計 32KiB(`project_doc_max_bytes`)で打ち切り → 大きくしすぎない
- 空ファイルはスキップ
- 開始時に1回読む(セッション中の変更は次回から)

### 例
```markdown
# ~/.codex/AGENTS.md(自分の全プロジェクト共通)
## Working agreements
- JavaScript を変更したら必ず `npm test` を実行
- 依存は pnpm で入れる
- 本番依存を追加する前に確認を取る
```
```markdown
# AGENTS.md(リポジトリ直下・チーム共有)
## Repository expectations
- PR を開く前に `npm run lint`
- 公開ユーティリティの挙動を変えたら docs/ を更新
```
```markdown
# services/payments/AGENTS.override.md(この下だけのルール)
- `npm test` ではなく `make test-payments`
- API キーのローテーションはセキュリティチャンネルに通知してから
```
- 確認: `codex --ask-for-approval never "Summarize the current instructions."` / 「読み込んだ指示ファイルを列挙して」
- `/init` で雛形を生成

### 書くべきこと
- ビルド・テスト・lint のコマンド
- コード規約(デフォルトと違うもの)、ディレクトリ構成の要点
- やってはいけないこと、確認が必要なこと
- 完了の定義(テストが通る、型チェックが通る など)

### Claude Code と共有するには
- Claude Code は CLAUDE.md が無ければ AGENTS.md を自動で読む。CLAUDE.md も使うなら `@AGENTS.md` と書いて取り込む([[04_CLAUDE.mdとメモリ]])
- → **AGENTS.md を正本**にすると両方のツールで同じルールを使える

## config.toml(Codex 自体の設定)
- ユーザー: `~/.codex/config.toml`
- プロジェクト: `.codex/config.toml`(信頼したプロジェクトだけ読み込まれる)
- CLI と IDE 拡張は同じ設定を共有

### 優先順位(上が強い)
1. CLI フラグ・`--config`(`-c`)
2. プロジェクトの `.codex/config.toml`(現在地に近いほど優先)
3. プロファイル(`--profile 名前` → `~/.codex/名前.config.toml`)
4. ユーザーの `~/.codex/config.toml`
5. クラウド管理の既定値
6. システム(`/etc/codex/config.toml`)
7. 組み込み既定値
- 組織は `requirements.toml` で制約を強制できる(例: `approval_policy = "never"` の禁止)
- プロジェクトを「信頼しない」にすると、プロジェクトの `.codex/`(設定・hooks・rules)は読まれない

### よく変える設定
```toml
model = "gpt-6-sol"
approval_policy = "on-request"
sandbox_mode = "workspace-write"
# web_search = "live"      # 最新の Web を検索(既定はキャッシュされた索引)

[sandbox_workspace_write]
network_access = true      # ワークスペース書き込みモードでネットワークを許可

[windows]
sandbox = "elevated"       # ネイティブ Windows 推奨

[mcp_servers.context7]     # MCP サーバー([[Codex_05_拡張(MCP・Skills・Plugins・Hooks・Subagents)]])
command = "npx"
args = ["-y", "@upstash/context7-mcp"]
```
### プロファイル(用途別の設定セット)
```toml
# ~/.codex/readonly_quiet.config.toml
approval_policy = "never"
sandbox_mode = "read-only"
```
```bash
codex --profile readonly_quiet
```
- 権限プロファイル: 組み込み `:read-only` `:workspace` `:danger-full-access`、自作は `[permissions.<名前>]`

## 関連
- 前: [[Codex_02_基本操作(CLI・スラッシュコマンド・exec)]] / 次: [[Codex_04_サンドボックス・承認・安全]]
- [[mdファイル使い分け]]
- 公式: https://learn.chatgpt.com/docs/agent-configuration/agents-md , https://learn.chatgpt.com/docs/config-file/config-basic
