---
title: "15 自動化(放置で動かす・定期実行・CI 連携)"
modified: 2026-09-28
---

## 非対話モード(headless / `claude -p`)
スクリプトや CI から Claude を呼ぶ。中身は **Agent SDK の CLI 版**。
```bash
claude -p "このプロジェクトの概要を説明して"                    # テキストで出力して終了
claude -p "APIエンドポイントを全部列挙して" --output-format json   # JSON({"result": ...})
claude -p "ログを分析して" --output-format stream-json --verbose  # 1行1JSONのストリーム
claude -p "auth.py のバグを直して" --allowedTools "Read,Edit,Bash" # 許可ツールを指定
cat error.log | claude -p "原因は?"                            # パイプで渡す
claude -c -p "続けて"                                          # 直前の会話を継続
```
- `--permission-mode dontAsk` + `--allowedTools` で「許可したものだけ実行、他は拒否」= CI 向け
- `--bare` で CLAUDE.md や Hooks などの自動読込を省いて高速・再現性重視
- `--append-system-prompt` でシステムプロンプトに追記
- `claude setup-token` でサブスク用の長期トークンを発行(CI 用)
- ファンアウト: `for file in $(cat files.txt); do claude -p "Migrate $file ..." --allowedTools "Edit,Bash(git commit *)"; done`

## /goal(条件達成まで自動で続ける)
```text
/goal test/auth のテストが全て通り、lint がクリーンになる
```
- 各ターン後に小さなモデルが「条件を満たしたか」を判定。満たすまで次のターンを自動で開始
- 解除条件: 達成 / 不可能と判断 / 人間が直すべきエラー / `/goal clear`
- 良い条件: **測定できる終着点1つ** + **確認方法**(「`npm test` が exit 0」) + **守るべき制約**(「他のテストファイルは変更しない」)。「または20ターンで停止」のような上限も書ける
- 判定モデルはコマンドを実行しない → Claude が会話中に証拠を出すような条件にする
- 放置したいなら Auto モードと組み合わせる

## /loop(一定間隔で繰り返す。セッションが開いている間)
```text
/loop 5m デプロイが終わったか確認して     # 5分ごと
/loop PR のCIを見張って                  # 間隔は Claude が決める
/loop 20m /review-pr 1234               # スキルを繰り返す
/loop                                   # 組み込みのメンテナンス or loop.md
```
- 一回だけのリマインダーも設定可能(「3時に〜を確認して」)
- セッション限定(再開時は復元される。7日で期限切れ)

## 定期実行の3つの選択肢
| | クラウド(Routines) | デスクトップ定期タスク | `/loop` |
| --- | --- | --- | --- |
| 動く場所 | クラウド | 自分のPC | 自分のPC |
| PCの電源 | 不要 | 必要 | 必要 |
| セッションを開いておく | 不要 | 不要 | 必要 |
| ローカルファイル | 使えない(毎回クローン) | 使える | 使える |

### Routines(ルーティン、研究プレビュー)
- プロンプト + リポジトリ + コネクタ(MCP)をまとめた設定を、**クラウドで自動実行**
- トリガー: **スケジュール**(毎晩・毎週・指定日時) / **API**(HTTP POST) / **GitHub イベント**(PR 作成・リリースなど)。組み合わせ可
- 作成: claude.ai/code/routines、または CLI で `/schedule`
- Pro / Max / Team / Enterprise
- 注意: ローカルの `~/.claude/skills` は使えない → スキルはリポジトリにコミットか claude.ai で有効化

### デスクトップの定期タスク
- デスクトップアプリの Routines 画面から。毎朝のコードレビュー、依存関係チェック、朝のブリーフィングなど
- アプリが開いていてPCが起きている時だけ動く

## Channels(外部イベントを実行中セッションへ)
- MCP サーバーが、開いているセッションにイベントを押し込む(CI の失敗、チャットのメッセージ、監視アラート)
- Telegram / Discord / iMessage が研究プレビューで提供。双方向で返信もできる

## GitHub 連携
### Claude Code GitHub Actions
- PR や issue のコメントで **`@claude`** とメンションすると、Claude が分析・実装・コミット
- 任意の GitHub イベントでプロンプトを自動実行することも可能
- セットアップ: Claude Code で **`/install-github-app`**(GitHub CLI `gh` が必要、リポジトリ管理者権限)。GitHub App のインストール、シークレット(`ANTHROPIC_API_KEY` または `CLAUDE_CODE_OAUTH_TOKEN`)登録、ワークフローの PR まで用意してくれる
- 使用例: `@claude この issue を実装して`、`@claude このPRのセキュリティ問題を確認して`
- GitLab CI/CD 版もある

### Code Review(Team / Enterprise、研究プレビュー)
- GitHub PR を自動レビューし、該当行にコメント。複数の専門エージェントがコードベース全体の文脈で論理エラー・セキュリティ・回帰を探す
- 承認/ブロックはしない(既存のレビュー運用を壊さない)。`CLAUDE.md` や `REVIEW.md` で指摘内容を調整

### ローカルでのレビュー
- `/code-review [low〜max]` … 差分のバグを探す。`--fix` で適用、`--comment` で PR にコメント
- `/code-review ultra`(`/ultrareview`)… クラウドで多数のレビュアーが検証まで行う深いレビュー(Pro/Max は無料3回、以降は追加クレジット)
- `/autofix-pr` … クラウドセッションが PR を見張り、CI 失敗やレビューコメントに自動で修正を push

## その他
- **Deep links**: リンクから Claude Code のセッションを起動
- **Agent SDK**: Python / TypeScript で Claude Code をライブラリとして組み込む → [[18_管理者向け・Agent SDK・その他]]

## 関連
- [[Cicdパイプライン]]
- [[14_並列作業(Worktree・Agent View・Workflows)]]
- 公式: https://code.claude.com/docs/en/headless , https://code.claude.com/docs/en/goal , https://code.claude.com/docs/en/scheduled-tasks , https://code.claude.com/docs/en/routines , https://code.claude.com/docs/en/github-actions , https://code.claude.com/docs/en/code-review
