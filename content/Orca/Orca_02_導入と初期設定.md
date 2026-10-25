---
title: "Orca 02 導入と初期設定"
modified: 2026-09-29
---

## インストール
| OS | 方法 |
| --- | --- |
| macOS | `brew install --cask stablyai/orca/orca`(更新: `brew upgrade --cask orca`)または公式サイトの .dmg(Apple Silicon / Intel) |
| Windows | 公式サイトの .exe |
| Linux | AppImage、Arch は `yay -S stably-orca-bin` |
| スマホ | iOS は App Store、Android は GitHub Releases の APK |
- ダウンロード: https://onorca.dev/download
- 前提: 使いたいエージェント(Claude Code・Codex など)を**先に普通のターミナルで動く状態**にしておく
- 初回起動時にホームフォルダへのアクセス許可を求められる

## 初日に必ず決める3つ
### 1. エージェントの権限(設定 → Agent)★最重要
- **既定は「Yolo」= 全エージェントに「確認なしで実行」の引数が付く** → 本番 DB 接続や git push まで無確認で走る
- 業務・学習とも**「手動」に変更**し、各 CLI 本来の確認手順(Claude Code の権限モードなど)に戻す

### 2. 作業フォルダの置き場(設定 → 一般・プロジェクト)
- ワークスペースディレクトリ: 絶対パスで1か所にまとめる
- ネストワークスペース: オン(リポジトリ名で階層化)
- 削除前に確認: オン
- **新しいワークツリーには `node_modules` や `.env` が無い** → 毎回セットアップしないよう設定:
  - **ワークツリー共有パス**(設定 → Repository)/ `orca.yaml` の `worktree.sharedDirectories`: `node_modules`・`.cache` など作り直せる大きなフォルダを共有
  - **`.worktreeinclude`**: `.env` などコピーするファイルを列挙(ワイルドカード不可、パスをそのまま書く)
  - **ワークツリーフック**: 作成時に `npm install` などを実行

### 3. 通知(設定 → 通知)
- 通知を有効化、エージェントのタスク完了時に通知、通知音オン、集中モード中は抑制
- 3体以上並べるなら必須(どれが入力待ちか分からなくなる)

## その他のおすすめ設定
| 項目 | 場所 | 設定 |
| --- | --- | --- |
| スリープ防止 | Agent | エージェント作業中だけスリープさせない |
| エージェント状態フック | Agent | 有効(作業中/入力待ち/完了の表示) |
| ブランチ名の自動変更 | Git | 有効 |
| JIS 配列の ¥ キー | ターミナル | 「JIS 円 → バックスラッシュ」をオン |
| GitHub 連携 | 連携 → GitHub | `gh` CLI の認証を使う |
| 複数アカウント | AI プロバイダーアカウント | Claude・Codex の契約を複数登録し、上限が近づいたら切替 |
| テレメトリ | プライバシーとテレメトリ | 会社で使う前に情シスに確認 |
| Orca CLI | 一般 → Orca CLI | 登録(`command -v orca` で確認) |

## セッションの残り方
| 状況 | エージェント |
| --- | --- |
| Orca を閉じる | 動き続ける |
| PC の再起動・電源断 | 止まる(作業フォルダと設定は残る) |
| スリープ | 止まる |
→ 長時間放置するなら、スリープ防止かリモートサーバー([[Orca_04_リモート・モバイル・CLI・運用の注意]])

## 関連
- 前: [[Orca_01_ADEとは・仕組み・向き不向き]] / 次: [[Orca_03_使い方(並列実行・レビュー・Design Mode)]]
- 出典: https://hatenabase.jp/blog/orca-ade-setup-guide/ , https://www.onorca.dev/docs/model/worktrees
