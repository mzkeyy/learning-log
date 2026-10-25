---
title: "Git 04 GitHub と共同作業(remote・push・pull・PR)"
modified: 2026-10-04
---

## リモートの登録
```bash
git remote -v                                              # 登録済みのリモート一覧
git remote add origin https://github.com/user/repo.git     # 自分で init したリポジトリを GitHub と紐づけ
git push -u origin main                                    # 初回 push(-u で「main は origin/main と対応」と覚えさせる)
```
- `clone` してきた場合は `origin` が自動で登録済み
- 認証: パスワードは使えない。**GitHub CLI(`gh auth login`)** か **SSH 鍵** で認証するのが簡単

## push / fetch / pull
| コマンド | 意味 |
| --- | --- |
| `git push` | 自分のコミットをリモートへ送る |
| `git push -u origin feature/login` | 新しいブランチを初めて送る |
| `git fetch` | リモートの最新を**取ってくるだけ**(自分のファイルは変わらない) |
| `git pull` | fetch + 取り込み(merge か rebase)。作業前の習慣に |
```
pull = fetch(取ってくる) + merge(合わせる)
```
- push が **rejected** されたら: リモートに自分の持っていないコミットがある → `git pull` してから再度 push
- ⚠ **force push(`git push --force`)は原則禁止**。共有ブランチの他人の(AI の)作業を消す。どうしても必要なら自分専用ブランチで `--force-with-lease`

## Pull Request(PR)の流れ
```
① main から branch を切る
② 作業してコミット → push
③ GitHub で PR を作る(何を・なぜ・確認方法を書く)
④ 自動テスト(GitHub Actions)・プレビュー・レビューで確認
⑤ 指摘があれば同じブランチにコミットして push(PR に自動で反映)
⑥ main にマージ → ブランチを削除 → 自動デプロイ
```
```bash
# GitHub CLI を使うとターミナルから完結
gh pr create --title "ログイン機能" --body "..."
gh pr list
gh pr checkout 123     # 他人の PR を手元で試す
gh pr merge
```
- PR のマージ方法: **Merge commit**(履歴そのまま)/ **Squash and merge**(1コミットにまとめる。AI の細かいコミットが多いときに便利)/ **Rebase and merge**
- 本番に影響する変更は**必ず PR を通す**。AI が作った変更も差分を人が見てからマージ

## main を守る設定(GitHub)
- **Branch protection / Rulesets**: main への直接 push 禁止、PR 必須、テスト合格必須、force push 禁止
- 一人開発でも設定しておくと、AI が誤って main を壊す事故を防げる

## fork(他人のリポジトリへの貢献)
- 自分のアカウントにコピー(fork)→ そこで branch・push → 元のリポジトリへ PR
- 元の更新は `upstream` として登録して取り込む: `git remote add upstream <元のURL>`

## GitHub のその他の機能
| 機能 | 一言 |
| --- | --- |
| **Issues** | やること・バグの管理 |
| **Actions** | push / PR をきっかけにテスト・デプロイを自動実行 → [[Cicdパイプライン]] |
| **Releases / Tags** | `git tag v1.0.0` で節目に名前を付ける |
| **公開範囲** | Public は全世界に見える。**最初は Private** にして、公開する場合は秘密情報が無いか確認 |

## 関連
- 前: [[Git_03_ブランチとマージ(merge・rebase・コンフリクト)]] / 次: [[Git_05_取り消しと復旧(restore・revert・reset・stash・reflog)]]
- [[Cicdパイプライン]] / [[Cloudflare_05_フレームワーク連携とデプロイ]]
- 入口: [[Git]]
