---
title: "Orca 04 リモート・モバイル・CLI・運用の注意"
modified: 2026-09-29
---

## 別のマシン・場所から使う
| やりたいこと | 方法 |
| --- | --- |
| 複数の PC から**同じ作業を続けたい** | **リモート Orca サーバー**(ベータ) |
| 重い処理だけ**別マシンで動かしたい** | **SSH ホスト(SSH ワークツリー)** |
| 外出先で**様子を見て返答したい** | **スマホアプリ** |

### リモート Orca サーバー
1. サーバーにする PC: 設定 → リモート Orca サーバー → **New Link** → Tailscale のアドレスを選び、出たリンクを控える
2. 使う側の PC: 設定 → リモート Orca サーバー → **Add Server** → リンクを貼って Connect
- 前提は**私設ネットワーク内**(Tailscale など)。インターネットに直接公開しない
- サーバー側が起きていれば、翌日別の PC から続きができる

### SSH ホスト
1. 設定 → SSH ホスト → **Add Target**
2. 接続先・ユーザー・ポート・鍵ファイルを入力 → **Test**
- 接続先に make・C++ コンパイラ・python3 が必要
- ファイル編集・git・ターミナルが使え、自動再接続・ポート転送・パスフレーズのキャッシュに対応

### スマホアプリ
1. PC の Orca: 設定 → モバイル → QR コード生成
2. アプリの **Pair Desktop** で読み取り
3. 同じ LAN、または Orca Relay 経由で接続
- できること: 状態の監視、入力待ちへの返答、完了通知、コミットの確認、使用状況・アカウント切替(本格的な作業は PC で)

## Orca CLI(自動化)
設定 → 一般 → Orca CLI で登録。
```bash
command -v orca && orca status --json   # 確認
orca worktree ps                         # ワークツリー一覧
orca worktree create                     # 作成
orca worktree current                    # 今いるワークツリー
orca worktree rm                         # 削除
orca terminal list / create
orca terminal send --text "continue"     # ターミナルに入力を送る
orca goto --url http://localhost:3000    # 内蔵ブラウザで開く
orca snapshot                            # スクリーンショット
orca click --element @e3                 # 要素をクリック
```
- エージェントに使わせる: `npx skills add https://github.com/stablyai/orca --skill orca-cli`
  → エージェントが自分でワークツリーを作ったり、ブラウザで動作確認したりできる

## よくある詰まりどころ
| 症状 | 原因 | 対処 |
| --- | --- | --- |
| エージェントが起動しない | コマンドにパスが通っていない | 普通のターミナルで `claude` / `codex` が動くか確認 |
| ワークツリーが作れない | 起点ブランチを取得していない | `git fetch origin` |
| GitHub で 403 | トークン権限不足・SSO 未承認 | `gh auth login` → Orca 再起動 |
| API の上限エラー | 1時間の利用上限 | リセット時刻まで待つ / 別アカウントに切替 |
| ¥ キーが効かない | JIS 配列設定がオフ | ターミナル設定で JIS 円をオン |
| 新しいワークツリーで動かない | `node_modules`・`.env` が無い | 共有パス・`.worktreeinclude`・フック([[Orca_02_導入と初期設定]]) |

## 運用の注意(安全)
- **権限は「手動」から**。Yolo(確認なし)のまま並列にすると、事故も並列で起きる
- 並列にすると**費用も並列**。使用量表示と各サービスの上限・通知を設定
- `.env` を共有・コピーする設定は便利だが、**本番の鍵を開発のワークツリーに置かない**
- 同じファイルを複数タスクで同時に触らせない(マージ時に衝突する)
- テレメトリ設定を確認、会社で使う場合は情シスと相談
- 更新が速いので、画面や設定名が変わったら公式ドキュメント(https://www.onorca.dev/docs/)を確認

## 関連
- 前: [[Orca_03_使い方(並列実行・レビュー・Design Mode)]] / 目次: [[Orca]]
- 出典: https://www.onorca.dev/docs/cli/overview , https://www.onorca.dev/docs/ssh , https://hatenabase.jp/blog/orca-ade-setup-guide/
