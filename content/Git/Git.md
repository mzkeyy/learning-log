---
title: "Git(ギット)"
modified: 2026-10-18
---

**ファイルの変更履歴を記録・管理するための道具(バージョン管理システム)**。「いつ・誰が・何を・なぜ変えたか」を残し、いつでも過去の状態に戻せる。Linux の作者 Linus Torvalds が 2005 年に開発。今ではほぼすべてのソフトウェア開発で使われている。

公式ドキュメント(git-scm.com)と Pro Git(日本語版あり)を元に、生成AIと開発する初学者向けに整理したノート群の入口。

## 学ぶ順番
| # | ノート | 内容 |
| --- | --- | --- |
| 01 | [[Git_01_考え方(リポジトリ・コミット・3つの場所)]] | Git とは、なぜ必要か、作業ツリー・ステージ・リポジトリ |
| 02 | [[Git_02_基本操作(init・add・commit・status・log・diff)]] | 毎日使うコマンドと初期設定 |
| 03 | [[Git_03_ブランチとマージ(merge・rebase・コンフリクト)]] | 枝分かれして安全に試す、合流させる |
| 04 | [[Git_04_GitHubと共同作業(remote・push・pull・PR)]] | GitHub に送る、人や AI と一緒に作業する |
| 05 | [[Git_05_取り消しと復旧(restore・revert・reset・stash・reflog)]] | 「やってしまった」ときの戻し方 |
| 06 | [[Git_06_実務の注意(gitignore・秘密情報・AI開発・トラブル)]] | 事故を防ぐ設定、Claude Code との使い方、よくある問題 |

## まず一言で
> **記録した変更は戻せる。記録していない変更は戻せない。**
> (ただし戻せるのはコードだけ。送信済みのメールや削除した DB のデータは戻らない)

## Git と GitHub の違い
```
[自分の PC]                              [インターネット上]
 Git(道具)                               GitHub / GitLab / Bitbucket(置き場所+共同作業の場)
 ・履歴を記録する                ── push →   ・履歴のバックアップ
 ・ブランチを切る               ← pull ──   ・Pull Request でレビュー
 ・オフラインで動く                          ・GitHub Actions で自動テスト・デプロイ
```
- **Git = 道具**(ソフトウェア)、**GitHub = Git の履歴を預けるサービス**
- Git だけでも使えるが、PC が壊れたら消える。GitHub に push して初めてバックアップになる

## 用語の地図
| 用語 | 一言 |
| --- | --- |
| **リポジトリ(repo)** | 履歴ごと管理されているプロジェクトのフォルダ(中に隠しフォルダ `.git/`) |
| **コミット(commit)** | 変更のひとまとまりの記録。セーブポイント |
| **ステージ(add)** | 次のコミットに入れる変更を選ぶ |
| **ブランチ(branch)** | 本流から分かれた作業ライン。失敗したら捨てられる |
| **マージ(merge)** | ブランチを合流させる |
| **リモート(remote)** | GitHub など別の場所にあるリポジトリ。通常は `origin` |
| **push / pull** | リモートへ送る / リモートから取り込む |
| **Pull Request(PR)** | 「この変更を本流に入れてください」という確認依頼 |
| **コンフリクト(衝突)** | 同じ箇所を別々に変えたため Git が自動で合わせられない状態 |
| **HEAD** | 今自分がいる場所(今見ているコミット) |

## 最新動向(2026年10月時点)
- 最新安定版は **Git 2.55 系**(2026年6月リリース。`git history` の fixup、Linux 向け fsmonitor、`git push` でリモートグループ指定 など)
- **Git 3.0** が 2026年末ごろを目安に準備中(日付は未確定)。新規リポジトリで
  - 最初のブランチ名が **`master` → `main`** に(GitHub などは既に `main` が標準)
  - ハッシュが **SHA-1 → SHA-256** に(SHA-1 の衝突攻撃への対策)
  - ref の保存形式が **reftable** に、Git のビルドに **Rust** が必須に
  - **既存のリポジトリはそのまま動く**。初学者が今やることは `git config --global init.defaultBranch main` を入れておく程度
- 生成AI([[Claude Code]] / [[Codex]])は Git を前提に動く。**コミット=AI の変更を戻せる保険**、**worktree=複数 AI の並列作業場所** として重要度が増している

## 出典
- 公式: https://git-scm.com/doc , [Pro Git(日本語)](https://git-scm.com/book/ja/v2) , [BreakingChanges](https://git-scm.com/docs/BreakingChanges)
- [Highlights from Git 2.55 (GitHub Blog)](https://github.blog/open-source/git/)
- [Git 3.0 will use main as the default branch (thoughtbot)](https://thoughtbot.com/blog/git-3-0-will-use-main-as-the-default-branch)
- [Git considers SHA-256, Rust, LLMs, and more (LWN.net)](https://lwn.net/Articles/1042172/)

## 関連
- [[Cicdパイプライン]](push したら自動でテスト・公開)
- [[APIキー・シークレット管理]](鍵を Git に入れない)
- [[14_並列作業(Worktree・Agent View・Workflows)]] / [[06_セッション管理とチェックポイント]]
