---
title: "Cloudflare"
modified: 2026-10-18
---

世界中にあるサーバー網(エッジ)で、**Webサイトの配信・サーバー処理・データベース・ファイル保存**までまとめて提供するプラットフォーム。もともとは CDN・DDoS 対策・[[DNS]] の会社。無料枠が大きく、個人開発の最初の公開先として優秀。

公式ドキュメント(developers.cloudflare.com、**2026年9月時点**)の Workers 周辺を読んで整理したノート群の入口。

## 学ぶ順番
| # | ノート | 内容 |
| --- | --- | --- |
| 01 | [[Cloudflare_01_全体像とサービス地図]] | 何ができるか、サービスの選び方、料金、Pages と Workers |
| 02 | [[Cloudflare_02_Workersの基本(作成・Wrangler・設定)]] | 最初の Worker、wrangler、設定ファイル、ドメイン |
| 03 | [[Cloudflare_03_バインディングとデータ保存(D1・R2・KV・DO・Queues)]] | DB・ファイル・キャッシュ・非同期処理 |
| 04 | [[Cloudflare_04_環境変数・シークレット・環境分離]] | vars、secret、.dev.vars、本番/ステージング |
| 05 | [[Cloudflare_05_フレームワーク連携とデプロイ]] | Vite / React / TanStack Start / Next.js、Git 連携 |
| 06 | [[Cloudflare_06_運用・制限・ベストプラクティス]] | ログ、制限、落とし穴、テスト、AI 開発 |

## 全体の構成イメージ
```
ユーザー ──HTTPS──▶ Cloudflare(DNS・CDN・DDoS 防御)
                          │
                          ▼
                  Worker(あなたのコード)──┬─ Static Assets(HTML/CSS/JS)
                                            ├─ D1(SQL データベース)
                                            ├─ R2(ファイル)
                                            ├─ KV(設定・キャッシュ)
                                            ├─ Durable Objects(リアルタイム・状態)
                                            ├─ Queues / Workflows(裏での処理)
                                            └─ 外部 API / Hyperdrive(外部DB)
```

## 押さえどころ(2026年9月時点)
- **新規は Pages ではなく Workers**(Static Assets で静的配信も1つの Worker で完結。Cloudflare の投資は Workers に集中)
- 個人の学習・小規模サイトは**無料枠で収まることが多い**(料金表 → [[Cloudflare_01_全体像とサービス地図]])
- Next.js は Cloudflare 推奨の **vinext**(ベータ)、既存アプリは OpenNext([[Cloudflare_05_フレームワーク連携とデプロイ]])
- 秘密は `wrangler secret`、D1 の変更は migration、本番と開発で別リソース

## 出典
- 公式: https://developers.cloudflare.com/workers/
- [Your frontend, backend, and database — now in one Cloudflare Worker (公式ブログ)](https://blog.cloudflare.com/full-stack-development-on-cloudflare-workers/)
- [Migrate from Pages to Workers (公式)](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/)
- [Workers Pricing (公式)](https://developers.cloudflare.com/workers/platform/pricing/)
- [Cloudflare Pages vs Workers 2026 (cogley.jp)](https://cogley.jp/articles/cloudflare-pages-to-workers-migration)

## 関連
- [[Next.js]] / [[Vite]] / [[TanStack Start]]
- [[DNS]] / [[HTTP・HTTPS・TLS]] / [[Cicdパイプライン]] / [[APIキー・シークレット管理]]
