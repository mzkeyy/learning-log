---
title: "Git 03 ブランチとマージ(merge・rebase・コンフリクト)"
modified: 2026-10-04
---

## ブランチとは
本流(`main`)から分かれた**作業ライン**。中身は「あるコミットを指す付箋」なので、作るのも消すのも一瞬。
```
          ┌── D ── E    ← feature/login(ログイン機能を試作中)
A ── B ── C ── F        ← main(本番。常に動く状態を保つ)
```
- `main` は**いつでも公開できる状態**に保つ。新しい作業は必ずブランチで
- 失敗したらブランチごと捨てればよい。`main` は無傷

## ブランチ操作
```bash
git branch                     # 一覧(* が今いるブランチ)
git branch -a                  # リモートも含めて一覧
git switch -c feature/login    # 新しく作って移動(昔の書き方: git checkout -b)
git switch main                # 既存ブランチへ移動
git branch -d feature/login    # 削除(マージ済みのみ。未マージは -D で強制 → 消える注意)
git branch -m 新しい名前        # 今のブランチの名前変更
```
- 移動前に、未コミットの変更はコミットするか stash(→ 05章)しておく
- 命名の例: `feature/〜`(機能)、`fix/〜`(修正)、`docs/〜`、`chore/〜`

## マージ(merge): 合流させる
```bash
git switch main
git merge feature/login
```
| 種類 | いつ起きる | 結果 |
| --- | --- | --- |
| **Fast-forward** | main がブランチ作成後に進んでいない | main の付箋を前に進めるだけ。一直線の履歴 |
| **マージコミット** | 両方が進んでいる | 2つを合わせた新しいコミットができる |
```
Fast-forward:   A ── B ── C ── D ── E  ← main, feature

マージコミット:          ┌── D ── E ──┐
               A ── B ── C ── F ────── M  ← main(M がマージコミット)
```
- 実務では GitHub の **Pull Request 上でマージ**することが多い(→ 04章)

## リベース(rebase): 土台を付け替える
```bash
git switch feature/login
git rebase main     # feature の変更を main の最新の上に載せ直す
```
```
前:            ┌── D ── E          後:                  ┌── D' ── E'
     A ── B ── C ── F                  A ── B ── C ── F
```
- 履歴が一直線で読みやすくなる。コミットは作り直される(ID が変わる)
- ⚠ **既に push して他の人も使っているブランチは rebase しない**(履歴が食い違い、force push が必要になる)
- 迷ったら **merge を使えば安全**

## コンフリクト(衝突)の解決
同じファイルの同じ場所を両方のブランチで変えると、Git はどちらを採るか決められず止まる。
```
<<<<<<< HEAD
<h1>ようこそ</h1>
=======
<h1>いらっしゃいませ</h1>
>>>>>>> feature/login
```
1. `git status` で衝突したファイルを確認(`both modified`)
2. ファイルを開き、正しい内容に書き換えて **`<<<<<<<` `=======` `>>>>>>>` の印を消す**
3. `git add ファイル名` → `git commit`(rebase 中なら `git rebase --continue`)
- やめたいとき: `git merge --abort` / `git rebase --abort`(始める前の状態に戻る)
- VS Code などのエディタは「現在の変更を採用/入力側を採用/両方」のボタンで解決できる
- Claude Code に「コンフリクトを解消して。両方の意図を残して」と頼むのも有効。**結果は必ず自分で確認**

## コンフリクトを減らすコツ
- ブランチを**長く放置しない**。小さく作ってこまめにマージ
- 作業前に `main` の最新を取り込む(`git pull`)
- 複数の AI エージェントに**同じファイルを同時に触らせない**(worktree で分けても、同じ箇所を変えれば合流時に衝突する)

## 関連
- 前: [[Git_02_基本操作(init・add・commit・status・log・diff)]] / 次: [[Git_04_GitHubと共同作業(remote・push・pull・PR)]]
- [[14_並列作業(Worktree・Agent View・Workflows)]]
- 入口: [[Git]]
