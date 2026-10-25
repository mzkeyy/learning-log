---
title: "Git 06 実務の注意(gitignore・秘密情報・AI開発・トラブル)"
modified: 2026-10-04
---

## .gitignore: Git に入れないものを指定
プロジェクト直下の `.gitignore` に書いたファイルは追跡されない。
```gitignore
# 依存ライブラリ(npm install で再生成できる)
node_modules/
# ビルド結果
dist/
.next/
# 秘密情報 ★最重要
.env
.env.*
!.env.example
.dev.vars
# OS・エディタのゴミ
.DS_Store
.vscode/
*.log
```
- フレームワークのテンプレート(Vite / Next.js など)には最初から入っている。**中身を一度確認**
- **既にコミットしたファイルは ignore に書いても追跡され続ける** → `git rm --cached .env` で追跡だけ外す
- 雛形: https://github.com/github/gitignore

## 秘密情報をコミットしてしまったら
1. **まず鍵を無効化・再発行する**(最優先。履歴から消すより先)
2. 履歴から消すのは二の次。**一度 push した鍵は漏れたものとして扱う**(Public なら数分で自動収集される)
3. 必要なら `git filter-repo` 等で履歴から削除 → force push(チームと調整)
- 予防: `.env` を最初に ignore / GitHub の **Secret scanning・Push protection** を有効に / コミット前に `git diff --staged` を見る
→ [[APIキー・シークレット管理]]

## AI(Claude Code / Codex)と Git
| 場面 | やり方 |
| --- | --- |
| AI に作業させる前 | **きれいな状態でコミットしておく**(`git status` が空)。失敗したら戻れる |
| AI の作業中 | ブランチを切らせる。main で直接作業させない |
| AI の作業後 | `git diff` で**差分を自分で見る**。意図しないファイル変更・削除がないか |
| コミットメッセージ | 「変更内容を見てコミットして」と頼めば書いてくれる |
| 複数の AI を並列に | **worktree** で作業フォルダを分ける → [[14_並列作業(Worktree・Agent View・Workflows)]] / [[Orca]] |
| 危険な操作 | `push --force`、`reset --hard`、`branch -D`、`clean -fd` は**実行前に必ず確認させる**(権限設定で ask/deny に) → [[05_権限とセキュリティ]] |
- コマンドを全部覚える必要はない。**概念(commit / branch / push / PR / revert)を知っていれば AI に正しく頼める**
- 頼み方の例: 「新しいブランチを切って作業して、終わったら PR を作って」「直前のコミットを revert して」「このコンフリクトを両方の意図を残して解消して」

## worktree(1つのリポジトリで複数の作業フォルダ)
```bash
git worktree add ../myapp-login -b feature/login   # 別フォルダに別ブランチを展開
git worktree list
git worktree remove ../myapp-login
```
- ブランチを切り替えずに並行作業できる。Claude Code の `--worktree` はこれを自動でやっている
- `.env` など ignore されたファイルはコピーされない点に注意

## よくあるトラブル
| 症状 | 原因と対処 |
| --- | --- |
| `fatal: not a git repository` | Git 管理外のフォルダにいる。`cd` で正しい場所へ / `git init` |
| push が `rejected (fetch first)` | リモートが先に進んでいる → `git pull` してから push |
| `Your branch is behind 'origin/main'` | `git pull` で取り込む |
| `detached HEAD` | ブランチではなくコミットを直接見ている状態。作業するなら `git switch -c 新ブランチ` |
| pull で `divergent branches` と言われる | pull の方法が未設定 → `git config --global pull.rebase false`(merge で取り込む) |
| コミットに間違ったメール・名前 | `git config user.email` を確認。直前なら `git commit --amend --reset-author` |
| 大きなファイル(動画など)を push できない | GitHub は 100MB 制限。ignore するか Git LFS |
| `Permission denied (publickey)` | SSH 鍵が未登録 → `gh auth login` か SSH 鍵を GitHub に登録 |
| iCloud / Dropbox 内のリポジトリが壊れた | **同期フォルダに `.git` を置かない**のが安全(同期の競合で履歴が壊れることがある) |

## チェックリスト
- [ ] `user.name` / `user.email` / `init.defaultBranch main` を設定した
- [ ] `.gitignore` に `.env` と `node_modules/` が入っている
- [ ] GitHub リポジトリは最初 Private で作った
- [ ] main は保護(直接 push 禁止・PR 必須)
- [ ] AI に作業させる前にコミットした / 作業後に差分を見た
- [ ] force push・reset --hard は使っていない(使うなら意味を理解してから)

## 関連
- 前: [[Git_05_取り消しと復旧(restore・revert・reset・stash・reflog)]]
- 入口: [[Git]]
