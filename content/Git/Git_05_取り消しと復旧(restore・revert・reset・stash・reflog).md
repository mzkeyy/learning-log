---
title: "Git 05 取り消しと復旧(restore・revert・reset・stash・reflog)"
modified: 2026-10-04
---

## 早見表: どこまで進んだ変更を戻したいか
| 状況 | コマンド | 危険度 |
| --- | --- | --- |
| 編集したけど**ステージ前**の変更を捨てたい | `git restore ファイル名` | ⚠ 変更は消える |
| **ステージを取り消したい**(変更は残す) | `git restore --staged ファイル名` | 安全 |
| **直前のコミット**のメッセージを直す/入れ忘れを足す | `git add 忘れ物` → `git commit --amend` | push 前なら安全 |
| **push 済み**のコミットを打ち消したい | `git revert コミットID` | 安全(打ち消しコミットを新しく作る) |
| **push 前**のコミットを取り消したい(変更は残す) | `git reset --soft HEAD~1` | 比較的安全 |
| 全部なかったことにして指定コミットに戻す | `git reset --hard コミットID` | ⚠⚠ 未コミットの変更も消える |
| 作業を一時的に退避したい | `git stash` | 安全 |
| reset や削除で消えたコミットを探したい | `git reflog` | 救済用 |

## restore: ファイルを戻す
```bash
git restore index.html              # 最後のコミット(またはステージ)の状態に戻す
git restore --staged index.html     # git add の取り消し
git restore --source=a1b2c3d index.html   # 特定コミット時点の内容に戻す
```
(昔の書き方 `git checkout -- ファイル` と同じ。今は restore / switch に分かれている)

## revert: 履歴を残したまま打ち消す
```
A ── B ── C ── C'   ← C' は「C の変更を逆にした」新しいコミット
```
- **共有済み(push 済み)の変更を戻すときはこれ**。履歴を書き換えないので他の人に迷惑がかからない
- 本番で問題が出たときの「とりあえず戻す」にも使う

## reset: ブランチの位置を巻き戻す
```bash
git reset --soft  HEAD~1   # コミットだけ取り消し。変更はステージに残る
git reset --mixed HEAD~1   # (既定)コミットとステージを取り消し。変更は作業ツリーに残る
git reset --hard  HEAD~1   # すべて捨てる。作業ツリーも戻る
```
- `HEAD~1` = 1つ前、`HEAD~3` = 3つ前
- ⚠ **push 済みのコミットに reset は使わない**(force push が必要になる → revert を使う)

## stash: 作業の一時退避
```bash
git stash                  # 未コミットの変更を退避(作業ツリーがきれいになる)
git stash -u               # 未追跡ファイルも含めて退避
git stash list             # 退避一覧
git stash pop              # 最新の退避を戻して一覧から消す
git stash apply stash@{1}  # 指定の退避を戻す(一覧には残る)
```
- 「急ぎで別ブランチの修正をしたい、でも今の作業はまだコミットしたくない」ときに

## reflog: 最後の砦
```bash
git reflog                     # HEAD が動いた記録(reset 前の位置も残っている)
git reset --hard HEAD@{2}      # その時点に戻る
git switch -c rescue a1b2c3d   # 消えたコミットから新しいブランチを作って救出
```
- **一度コミットしたものは、reflog でたいてい取り戻せる**(通常90日程度は残る)
- コミットしていない変更は reflog にも無い → こまめにコミット

## Claude Code のチェックポイントとの関係
- Claude Code の巻き戻し(Esc 2回 / `/rewind`)は**そのセッション内でのファイル編集**を戻す機能
- bash で消したファイルや外部への操作は戻らない。**Git の代わりにはならない**
- 大事な節目では Git でコミット → [[06_セッション管理とチェックポイント]]

## 関連
- 前: [[Git_04_GitHubと共同作業(remote・push・pull・PR)]] / 次: [[Git_06_実務の注意(gitignore・秘密情報・AI開発・トラブル)]]
- 入口: [[Git]]
