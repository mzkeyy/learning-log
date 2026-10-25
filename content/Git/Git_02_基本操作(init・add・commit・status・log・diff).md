---
title: "Git 02 基本操作(init・add・commit・status・log・diff)"
modified: 2026-10-04
---

## 最初に一度だけ: 初期設定
```bash
git --version                                     # 入っているか確認(Mac は Xcode CLT で入る)
git config --global user.name "Your Name"         # コミットに記録される名前
git config --global user.email "you@example.com"  # GitHub のアカウントと同じメール(公開したくなければ GitHub の noreply アドレス)
git config --global init.defaultBranch main       # 最初のブランチ名を main に(Git 3.0 で標準になる)
git config --global pull.rebase false             # pull の挙動を明示(後述。迷ったらこれ)
git config --global --list                        # 設定の確認
```

## リポジトリを始める
```bash
git init                                    # 今のフォルダを Git 管理にする(.git/ ができる)
git clone https://github.com/user/repo.git  # GitHub から履歴ごとコピーしてくる
```

## 毎日の基本サイクル
```bash
git status                  # ① 今どうなっているか確認(迷ったらまずこれ)
git diff                    # ② 何を変えたか(まだステージしていない変更)
git add index.html          # ③ コミットしたい変更を選ぶ
git add .                   #    フォルダ内の変更をまとめて(入れたくない物が混ざらないか status で確認)
git diff --staged           # ④ ステージした内容の最終確認
git commit -m "ヘッダーにロゴを追加"   # ⑤ 記録
git push                    # ⑥ GitHub へ送る(→ 04章)
```

## 確認系コマンド
| コマンド | 意味 |
| --- | --- |
| `git status` | 変更されたファイル・ステージ状況・今のブランチ |
| `git status -s` | 短い表示(`M` 変更 / `A` 追加 / `??` 未追跡) |
| `git diff` | 作業ツリー vs ステージ の差分 |
| `git diff --staged` | ステージ vs 最新コミット の差分 |
| `git log` | コミット履歴(`q` で抜ける) |
| `git log --oneline --graph --all` | 1行ずつ・枝分かれを図で・全ブランチ |
| `git log -p ファイル名` | そのファイルの変更内容つき履歴 |
| `git show a1b2c3d` | 特定コミットの中身 |
| `git blame ファイル名` | 各行を最後に変えたのは誰・どのコミットか |

## 良いコミットの作り方
- **1コミット = 1つの目的**(「ログイン修正」と「ボタンの色変更」は分ける)
- **小さく・こまめに**。動く状態ごとにコミットすると戻しやすい
- メッセージは「何を・なぜ」。1行目は短く要約、必要なら空行の後に詳細
```
ログインボタンが二重送信される問題を修正

送信中はボタンを無効化する。連打で注文が重複していたため。
```
- チームでは **Conventional Commits** 形式もよく使われる: `feat: 〜` `fix: 〜` `docs: 〜` `refactor: 〜` `chore: 〜`
- ダメな例: `修正` `update` `あああ` `WIP`(後で見て何もわからない)

## ファイルの削除・移動
```bash
git rm old.html          # 削除してステージ
git mv a.html b.html     # 名前変更してステージ
```
(普通にエディタで消す/名前を変えてから `git add .` しても同じ結果になる)

## 関連
- 前: [[Git_01_考え方(リポジトリ・コミット・3つの場所)]] / 次: [[Git_03_ブランチとマージ(merge・rebase・コンフリクト)]]
- 入口: [[Git]]
