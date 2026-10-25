---
title: "Cloudflare 01 全体像とサービス地図"
modified: 2026-09-29
---

## Cloudflare の2つの顔
1. **ネットワーク/セキュリティ**: DNS、CDN(キャッシュ配信)、DDoS 防御、WAF、SSL 証明書の自動化
2. **開発者プラットフォーム**: Workers を中心に、アプリを作って動かすためのサービス群

## サービス地図(Webサイト構築で使うもの)
| やりたいこと | サービス | 例えると |
| --- | --- | --- |
| サーバー処理(API・SSR) | **Workers** | 世界中で動くサーバーレス関数 |
| HTML/CSS/JS/画像の配信 | **Workers Static Assets** | Webサイトの置き場 |
| リレーショナルDB | **D1**(SQLite ベース) | 小〜中規模のSQL DB |
| ファイル保存 | **R2**(S3互換、転送量無料) | 画像・動画・PDF置き場 |
| 読み込みが多い小さなデータ | **KV** | 設定値・キャッシュ・フラグ |
| リアルタイム・状態の一貫性 | **Durable Objects** | チャット、共同編集、ゲーム、WebSocket |
| 非同期処理・キュー | **Queues** | メール送信・重い処理を後回し |
| 多段の長い処理 | **Workflows** | 失敗したステップだけ再実行 |
| 外部の Postgres/MySQL | **Hyperdrive** | 接続プール(高速化) |
| AI 推論 | **Workers AI** / AI Gateway / Vectorize | LLM・埋め込み・ベクトル検索 |
| 定期実行 | **Cron Triggers** | 毎時・毎日の処理 |
| ボット対策 | **Turnstile** | CAPTCHA の代替 |
| ドメイン | **Registrar / DNS** | ドメイン購入・管理 |
| 画像変換 | **Images** | リサイズ・最適化 |

## Pages と Workers
- 昔は「静的サイト = Pages」「処理 = Workers」だった
- 今は **Workers が静的配信(Static Assets)にも対応し、1つの Worker でフロント・API・DB接続まで完結**
- Cloudflare の方針: Pages はサポート継続だが、**新機能・投資は Workers に集中** → **新規は Workers を選ぶ**

## サーバーレスとエッジ
- **サーバーレス**: サーバー(OS・常時起動のマシン)を自分で管理しない。リクエストが来た時だけ動き、使った分だけ課金
- **エッジ**: ユーザーの近くのデータセンターでコードが動く → 速い
- Workers は Node.js ではなく **V8 isolate**(Chrome と同じJSエンジン)で動く独自ランタイム。起動が一瞬。`nodejs_compat` フラグで Node.js の多くの API も使える

## 料金(無料枠の目安)
| サービス | 無料プラン | 有料(Workers Paid 月$5〜) |
| --- | --- | --- |
| Workers | 1日10万リクエスト / 1回あたり CPU 10ms | 月1,000万リクエスト込み、CPU 最大5分 |
| D1 | 1日500万行読み取り / 10万行書き込み / 計5GB | 月250億行読み取り込み |
| R2 | 月10GB 保存 | 1GB あたり月$0.015、**転送量(egress)無料** |
| KV | 1日10万読み取り / 1,000書き込み / 1GB | 月1,000万読み取り込み |
| Durable Objects | SQLite 版は無料プランでも利用可(制限あり) | |
| 静的アセット配信 | Worker コードが動かない配信は無料 | |
→ 個人の学習・小規模サイトは**無料枠で収まることが多い**。有料機能は予算アラートを設定。

## Cloudflare を選ぶ理由 / 注意点
**理由**: 無料枠が大きい、速い、R2 の転送量無料、DNS〜DB まで一か所、Vite・TanStack Start・React Router などと公式統合
**注意点**:
- Node.js と完全互換ではない(一部ライブラリが動かないことがある → `nodejs_compat`)
- CPU 時間・メモリ(128MB)に制限 → 重い処理は Queues/Workflows や外部サービスへ
- Next.js は Vercel ほど「そのまま」ではない(vinext / OpenNext 経由)

## 関連
- 次: [[Cloudflare_02_Workersの基本(作成・Wrangler・設定)]]
- 公式: https://developers.cloudflare.com/workers/platform/pricing/ , https://developers.cloudflare.com/workers/platform/limits/
