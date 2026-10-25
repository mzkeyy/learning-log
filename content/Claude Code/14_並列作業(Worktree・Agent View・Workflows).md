---
title: "14 並列作業(複数の Claude を同時に動かす)"
modified: 2026-09-29
---

Claude Code には「同時に複数の作業をする」方法が複数ある。違いは**自分がどれだけ関わるか**と**どこで動くか**。

| 方法 | 内容 | 向いている時 |
| --- | --- | --- |
| **サブエージェント** | 1セッション内の作業者。要約を返す | 脇作業で会話を汚したくない → [[10_サブエージェント]] |
| **Worktree** | git の別作業ディレクトリで別セッション | 複数の機能を同時に、ファイル衝突なく |
| **エージェントビュー** | バックグラウンドセッションを1画面で管理(研究プレビュー) | 独立したタスクを複数投げて、様子を見る |
| **エージェントチーム** | リーダーが複数セッションに仕事を割り振る(実験的・既定OFF) | Claude に分担と調整まで任せたい |
| **動的ワークフロー** | Claude が書いたスクリプトが多数のサブエージェントを動かす | コードベース全体の監査、大規模移行 |
| **Projects** | claude.ai/code の1つの会話から、Claude が並列スレッド(クラウド)を起動・管理(Pro/Max 公開β) | 数日〜数週間にわたる一連の仕事 |
| **セッション間メッセージ** | 自分の別セッションにメッセージを送る | 並行セッション間で発見・警告を共有 |

## Git Worktree
worktree = 同じリポジトリ履歴を共有しつつ、**別のフォルダ・別のブランチ**で作業できる git の機能。セッションごとに分ければ編集がぶつからない。
```bash
claude --worktree feature-auth     # .claude/worktrees/feature-auth/ にブランチ worktree-feature-auth を作って起動
claude -w bugfix-123               # 別ターミナルでもう1つ
```
- 名前を省略すると自動命名
- 終了時: 変更がなければ自動削除、あれば「残す/消す」を聞かれる。再開は表示される `claude --worktree <name> --resume`
- `.worktreeinclude` で `.env` など git 管理外のファイルを worktree にコピー
- サブエージェントも `isolation: worktree` で隔離できる
- デスクトップアプリではセッション開始時に worktree オプションを選ぶだけ
- git 以外の VCS は `WorktreeCreate` / `WorktreeRemove` Hook で対応

## エージェントビュー(Agent view)
```bash
claude agents
```
1. 下の入力欄にタスクを書いて Enter → **新しいバックグラウンドセッション**が1行として起動(何行でも並列に)
2. 各行に「作業中 / 返答待ち / 完了」が表示される
3. `Space` でのぞき見(最新出力や質問)、その場で返信
4. `Enter` / `→` でアタッチ(通常の会話画面に)、空欄で `←` でデタッチ
5. 既存セッションは `/bg`(`/background`)でバックグラウンドへ移せる
- シェルから: `claude --bg "タスク"`、`claude attach <id>`、`claude logs <id>`、`claude stop <id>`
- 各セッションが個別に利用枠を消費する点に注意

## 動的ワークフロー(Dynamic workflows)
- Claude が JavaScript のスクリプトを書き、多数のサブエージェントをバックグラウンドで動かす。結果を**相互検証**してから1つの結果を返す
- 起動: プロンプトに `ultracode` キーワードを含める、または「ワークフローを使って」と頼む
  ```text
  ultracode: src/routes/ 以下の全APIエンドポイントで認証チェック漏れを監査して
  ```
- `/effort ultracode` にすると、実質的なタスクごとに Claude がワークフローを計画
- 同梱ワークフロー: `/deep-research 質問`(Web検索を広げて出典を相互確認し、引用付きレポート)
- `/workflows` で進捗確認・一時停止・再開・保存(保存するとコマンドとして再利用可能)

## /batch(大規模変更の分割)
```text
/batch src/ を JavaScript から TypeScript に移行
```
コードベースを調べて5〜30の独立した単位に分割 → 計画を提示 → 承認後、単位ごとに worktree でバックグラウンドのサブエージェントが実装・テスト。

## エージェントチーム(実験的)
- `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` で有効化
- 1セッションがリーダーになり、タスク割り当て・結果統合。メンバー同士も直接メッセージ可能
- 向いている: 調査とレビュー(別々の観点で調べて互いに反論)、独立したモジュールの新規開発
- まずはサブエージェントやセッション間メッセージで足りないか検討する

## セッション間メッセージ(Cross-session messaging)
- 同じマシン上の自分の別セッションに Claude がメッセージを送る(v2.1.224〜、設定不要)
- 「この変更があなたの作業を壊す」「さっきの疑問の答えはこれ」を自動で伝達
- `/list-agents`(`/peers`)で送れる相手を確認
- 送られるのはテキストだけ(会話履歴やファイルではない)

## 品質のための並列
- **Writer / Reviewer**: A で実装、B(きれいなコンテキスト)でレビュー → 自分の書いたコードへのバイアスがない
- テストを書く Claude と実装する Claude を分ける

## 関連
- [[Orca]] … Claude Code・Codex など複数のエージェントを worktree で並列に動かす ADE(外部アプリ)
- [[06_セッション管理とチェックポイント]]
- [[15_自動化(headless・goal・loop・routines・CI)]]
- 公式: https://code.claude.com/docs/en/agents , https://code.claude.com/docs/en/worktrees , https://code.claude.com/docs/en/agent-view , https://code.claude.com/docs/en/workflows , https://code.claude.com/docs/en/agent-teams
