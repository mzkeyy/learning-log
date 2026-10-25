---
title: "09 Skills(スキル)"
modified: 2026-10-25
---

`SKILL.md` に指示を書くと、Claude の道具箱に加わる。**関係ある時に Claude が自動で使う**か、**`/スキル名` で自分で呼ぶ**。
- 同じ指示・チェックリスト・手順を何度も貼っているなら Skill にする
- CLAUDE.md の一部が「事実」ではなく「手順」になってきたら Skill に移す
- 本文は使う時だけ読み込まれるので、長い参考資料もほぼコストゼロ
- **カスタムコマンドは Skills に統合済み**: `.claude/commands/deploy.md` も `.claude/skills/deploy/SKILL.md` も `/deploy` になる(旧形式も動く)
- オープン標準「Agent Skills」(agentskills.io)準拠。他のAIツールでも使える

## 最初のスキルを作る
```bash
mkdir -p ~/.claude/skills/summarize-changes
```
`~/.claude/skills/summarize-changes/SKILL.md`:
```yaml
---
description: 未コミットの変更を要約し、リスクを指摘する。変更内容を聞かれた時、コミットメッセージが欲しい時、差分レビューを頼まれた時に使う。
---
## Current changes
!`git diff HEAD`
## Instructions
上の変更を2〜3点で要約し、エラー処理漏れ・ハードコード値・更新が必要なテストなどのリスクを挙げる。差分が空なら「未コミットの変更なし」と答える。
```
- `` !`コマンド` `` = **動的コンテキスト注入**。Claude が読む前にコマンドを実行し、出力で置き換える
- 試す: 「何を変更した?」(自動)または `/summarize-changes`(手動)

## 置き場所
| 場所 | パス | 有効範囲 |
| --- | --- | --- |
| 個人 | `~/.claude/skills/<名前>/SKILL.md` | 自分の全プロジェクト |
| プロジェクト | `.claude/skills/<名前>/SKILL.md` | このリポジトリ(コミットでチーム共有) |
| ネスト | `<subdir>/.claude/skills/...` | そのサブフォルダで作業する時 |
| プラグイン | `<plugin>/skills/<名前>/SKILL.md` | `/プラグイン名:スキル名` |
| 組織 | 管理設定ディレクトリ | 組織全員 |
| claude.ai アカウント | claude.ai で有効にしたスキル | Cowork・クラウド・同じアカウントでログインしたターミナル(v2.1.275〜。`~/.claude/skills/synced/` に同期。止めるなら `syncClaudeAiSkills: false`) |
- 同名なら 組織 > 個人 > プロジェクト。セッション中の編集は自動反映(新しいフォルダ作成時は `/reload-skills`。v2.1.304 から新規・変更分だけを送る)
- **クラウドセッションやルーティンは `~/.claude/skills` を読まない** → リポジトリにコミットするか claude.ai で有効化

## スキルの2タイプ
- **参照型**: 規約・スタイルガイド・ドメイン知識。作業中ずっと参考にされる
- **タスク型**: デプロイ・コミットなど具体的な手順。`disable-model-invocation: true` で手動専用にするのが定番

## フロントマター(主要項目)
| 項目 | 意味 |
| --- | --- |
| `name` | コマンド名(省略時はフォルダ名) |
| `description` | **何をするか・いつ使うか**(推奨。Claude が自動起動の判断に使う。要点を先頭に、1,536文字で切られる) |
| `when_to_use` | 起動のきっかけとなる言い回し・例 |
| `argument-hint` | 引数のヒント(`[issue-number]`) |
| `disable-model-invocation: true` | **自分だけが呼べる**(副作用のあるもの向け。説明文もコンテキストに入らない) |
| `user-invocable: false` | **Claude だけが呼べる**(背景知識) |
| `allowed-tools` | そのターンだけ確認なしで使えるツール(`Bash(git commit *)` など) |
| `disallowed-tools` | スキル実行中は使わせないツール |
| `model` / `effort` | このスキル実行時のモデル・思考量 |
| `context: fork` | 別のサブエージェント(フォーク)で実行 |
| `agent` | fork 時に使うサブエージェントの種類 |
| `hooks` | スキル起動後に有効になる Hooks |
| `paths` | 該当ファイルを扱う時だけ自動起動 |
※ claude.ai へのアップロードや Skills API では `name` `description` `license` `compatibility` `metadata` `allowed-tools` のみ有効

## 引数
```yaml
---
name: fix-issue
description: GitHub issue を修正する
disable-model-invocation: true
---
GitHub issue $ARGUMENTS を規約に沿って修正する。
1. `gh issue view` で内容確認 2. 実装 3. テスト 4. コミット
```
- `/fix-issue 123` → `$ARGUMENTS` が `123` に
- 位置指定: `$ARGUMENTS[0]` または `$0` `$1`…(`/migrate-component SearchBar JavaScript TypeScript`)
- 変数: `${CLAUDE_SESSION_ID}` `${CLAUDE_SKILL_DIR}` など

## 補助ファイル
```text
my-skill/
├── SKILL.md       (必須・概要と案内。500行以下推奨)
├── reference.md   (詳細。必要な時だけ読まれる)
├── examples.md
└── scripts/helper.py (実行される。読み込まれない)
```
SKILL.md から「詳細は reference.md」とリンクしておく。

## 同梱スキル(Bundled skills)
設定なしで使える: `/doctor` `/code-review` `/simplify` `/batch` `/debug` `/loop` `/claude-api` `/run` `/verify` `/run-skill-generator` `/fewer-permission-prompts` `/update-config` `/dataviz` `/design` など。
- `/run-skill-generator` … アプリの起動手順を `.claude/skills/run-<名前>/` に記録し、`/run` `/verify` が毎回同じ手順で動作確認できるようにする

## 注意点
- 一度読み込まれたスキル本文は会話に残り続ける(=毎ターンのコスト)。本文は簡潔に
- コンパクション後は直近のスキルが先頭5,000トークンまで再添付(合計25,000トークン枠)。スキル一覧も再送される
- ファイル名・フォルダ名に見えない文字や `<` `>` が入ったスキルは、名前を直すまで読み込まれない
- 他人のリポジトリのスキルは `allowed-tools` で広い権限を持ちうる → 確認してから使う
- `/skills` で一覧と各トークン数、`/skill-doctor` で使用頻度とコスト
- 評価と改善: `skill-creator` で eval を回せる

## 関連
- [[08_拡張機能の全体像]]
- [[10_サブエージェント]]
- 公式: https://code.claude.com/docs/en/skills
