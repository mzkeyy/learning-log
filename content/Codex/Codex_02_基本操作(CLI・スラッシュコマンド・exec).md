---
title: "Codex 02 基本操作(CLI・スラッシュコマンド・exec)"
modified: 2026-09-29
---

## 入力の基本
- `@` でファイルパスを補完して添付、`/mention` でファイルを添付
- 画像(スクリーンショット)も入力できる
- 作業中に追加の指示を送ると**割り込み・キュー**で反映される(steering)
- IDE 拡張では開いているファイル・選択範囲が自動で文脈に入る(`/ide` で CLI にも IDE の文脈を)

## よく使うスラッシュコマンド(CLI)
| コマンド | 用途 |
| --- | --- |
| `/init` | **AGENTS.md の雛形を生成** |
| `/permissions` | 何を聞かずにやってよいか設定 |
| `/model` / `/fast` | モデル・推論の深さ / 高速枠 |
| `/plan` | プランモード(調べて方針を出してから編集) |
| `/goal` | 目標を設定し、達成まで作業を続けさせる(設定・編集・一時停止・再開・解除) |
| `/review` | 作業ツリーのコードレビュー |
| `/diff` | Git の差分(未追跡ファイルも) |
| `/compact` | 会話を要約してトークンを空ける |
| `/status` / `/usage` | セッション設定・トークン使用量 / アカウントの利用量 |
| `/new` / `/clear` | 新しいチャット |
| `/resume` / `/fork` | 保存したチャットを再開 / 分岐 |
| `/side`(`/btw`) | 一時的な脇道チャット |
| `/rename` / `/archive` / `/delete` | チャット管理 |
| `/mcp` / `/skills` / `/plugins` / `/apps` / `/hooks` | 拡張の確認・利用 |
| `/agent`(`/subagents`) | サブエージェントのスレッド切替 |
| `/memories` | メモリ機能の設定 |
| `/personality` | 応答スタイル |
| `/ps` / `/stop` | バックグラウンドのターミナル確認 / 停止 |
| `/app` | デスクトップアプリで続ける |
| `/import` | **Claude Code や Cursor の設定・プロジェクト・チャットを取り込む** |
| `/copy` / `/mention` / `/vim` / `/keymap` / `/statusline` | 便利機能 |
| `/debug-config` | 設定レイヤーの診断 |
| `/quit` / `/exit` | 終了 |

## 主な CLI コマンド
| コマンド | 用途 |
| --- | --- |
| `codex` | 対話モード(TUI) |
| `codex "指示"` | 最初の指示付きで起動 |
| `codex exec`(`codex e`) | **非対話実行**(スクリプト・CI) |
| `codex resume` / `codex fork` | セッション再開 / 分岐 |
| `codex review` | コードレビュー |
| `codex cloud` | クラウドタスク |
| `codex apply` | クラウドタスクの差分を手元に適用 |
| `codex mcp` / `codex plugin` | MCP・プラグイン管理 |
| `codex login` / `logout` | 認証 |
| `codex doctor` | 環境の不調を診断 |
| `codex sandbox` | サンドボックスでコマンドを試す |
| `codex update` | 更新 |
主なフラグ: `--model`、`--sandbox`、`--ask-for-approval`、`--cd`(作業ディレクトリ)、`--profile`、`-c key=value`(設定の一時上書き)、`--search`(ライブ Web 検索)

## 非対話実行(codex exec)
```bash
codex exec "README の誤字を直して"
codex exec --sandbox workspace-write "テストを実行して失敗を直して"
codex exec --json "依存関係の脆弱性を一覧にして"       # 1行1イベントの JSON
codex exec resume --last "続けて"                      # 前回の非対話タスクを継続
```
- 旧 `--full-auto` は非推奨(`--sandbox workspace-write` を使う)
- CI では `--sandbox read-only --ask-for-approval never` のように**権限を絞る**

## プランモードと Goal
1. `/plan` で調査・方針提案(まだ編集しない)
2. 方針に合意したら実装、または `/goal <達成条件>` で**条件を満たすまで自律的に続行**(数時間〜数日単位の作業にも)
3. 途中で確認・軌道修正・一時停止できる

## 関連
- 前: [[Codex_01_概要・導入・モデル]] / 次: [[Codex_03_AGENTS.mdとconfig.toml]]
- 公式: https://learn.chatgpt.com/docs/developer-commands , https://learn.chatgpt.com/docs/non-interactive-mode
