---
title: "Docker"
modified: 2026-10-26
---

**アプリと、その動作に必要なもの(OS のライブラリ・言語のランタイム・設定)をまとめて「コンテナ」にし、どこでも同じように動かす仕組み**。「自分の PC では動くのに」をなくし、開発環境の準備・テスト用 DB・本番のデプロイまで同じ形で扱える。

Docker の公式ドキュメント(**2026年10月時点**)を読んで、Node.js / TypeScript の Web アプリを前提に整理したノート群の入口。

## 学ぶ順番
| # | ノート | 内容 |
| --- | --- | --- |
| 01 | [[Docker_01_仕組み(イメージ・コンテナ・基本コマンド)]] | VM との違い、イメージとコンテナ、よく使うコマンド |
| 02 | [[Docker_02_Dockerfile(マルチステージ・キャッシュ・安全)]] | Node.js アプリのイメージの作り方 |
| 03 | [[Docker_03_Docker Compose(開発環境・DB・watch)]] | アプリ + DB をまとめて起動、ホットリロード |
| 04 | [[Docker_04_本番とデプロイ(レジストリ・脆弱性・実行先)]] | イメージの公開、脆弱性チェック、ECS・Cloud Run など |

## 用語
| 用語 | 意味 | たとえ |
| --- | --- | --- |
| **イメージ** | アプリと環境を固めた読み取り専用のテンプレート | 設計図・型 |
| **コンテナ** | イメージから起動した実行中のもの | 型から作った製品 |
| **Dockerfile** | イメージの作り方を書いたファイル | レシピ |
| **レジストリ** | イメージの置き場(Docker Hub、ECR、GHCR) | 倉庫 |
| **ボリューム** | コンテナを消しても残るデータの置き場 | 外付けディスク |
| **Compose** | 複数のコンテナをまとめて定義・起動 | 一式の手順書 |

## 押さえどころ
- **コンテナは使い捨て**。データは中に置かず、ボリュームや外部の DB・ストレージに
- 設定・秘密情報は**イメージに焼き込まず、環境変数で渡す** → [[APIキー・シークレット管理]]
- Dockerfile は**マルチステージ**で、本番イメージを小さく・余計なものなしに
- `.dockerignore` で `node_modules`・`.env`・`.git` を入れない
- 開発は **Docker Compose**(アプリ + PostgreSQL + Redis などを1コマンドで)
- 本番は「コンテナを動かすサービス」(ECS Fargate・Cloud Run など)に任せる
- 1コンテナ1プロセス、ログは標準出力へ → [[オブザーバビリティ_02_ログ(構造化ログ・レベル・個人情報)]]

## いつ使うか
| 場面 | Docker を使う? |
| --- | --- |
| 開発で DB・Redis などを手元に立てる | **使う**(一番手軽で効果が大きい) |
| チームで同じ開発環境を揃える | 使う(Compose・Dev Containers) |
| テストで本物の DB を使う | 使う(Testcontainers・CI の services)→ [[テスト_03_APIとDBのテスト(Hono・MSW・Workers)]] |
| ECS・Cloud Run・Kubernetes にデプロイ | 使う |
| Vercel・Cloudflare Workers にデプロイ | 不要(プラットフォームがビルドする) |
| 静的サイト | 不要 |

## 関連
- [[AWS SAA]] / [[SAA_04_コンピューティング(EC2・Auto Scaling・Lambda・コンテナ)]] / [[Cicdパイプライン]]
- [[PostgreSQLとDrizzle]] / [[テスト]] / [[オブザーバビリティ]]
- 公式: https://docs.docker.com/get-started/ , https://docs.docker.com/build/building/best-practices/ , https://docs.docker.com/compose/
