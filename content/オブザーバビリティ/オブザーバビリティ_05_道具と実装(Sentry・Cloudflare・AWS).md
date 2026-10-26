---
title: "オブザーバビリティ 05 道具と実装(Sentry・Cloudflare・AWS)"
modified: 2026-10-26
---

## 道具の地図
| 分類 | 代表例 | 役割 |
| --- | --- | --- |
| **エラー追跡** | Sentry、Cloudflare Workers の Issues | 例外をまとめて通知。スタック・発生回数・影響ユーザー数 |
| プラットフォーム付属 | Cloudflare Workers Observability、AWS CloudWatch、Vercel | ログ・メトリクス・トレースがすぐ見られる |
| 総合(APM) | Datadog、New Relic、Grafana Cloud、Honeycomb | 全部を1か所で。高機能だが費用に注意 |
| OSS を自分で運用 | Prometheus + Grafana、Loki、Jaeger / Tempo | 費用を抑えられるが運用が必要 |
| 外からの監視 | UptimeRobot、Better Stack、Checkly | 死活監視・ステータスページ |
| AI アプリ向け | Langfuse、LangSmith、Braintrust など | プロンプト・トークン・評価の記録 |
- 個人開発・小さなチームなら「**プラットフォーム付属 + Sentry + 死活監視**」で十分なことが多い

## Sentry(エラー追跡)
- 例外が起きると、スタックトレース・リクエスト情報・直前の操作(パンくず)・ユーザー・リリース番号を記録して**まとめて通知**
- 同じエラーは1つの Issue にまとまる。「新しく出たエラー」「再発したエラー」がわかる
- フロント(ブラウザ)とサーバーの両方に入れられる。パフォーマンス計測・セッションリプレイもある
- **ソースマップ**をアップロードすると、圧縮後のコードではなく元のファイルと行番号で表示される

### Cloudflare Workers + Hono
```ts
import * as Sentry from '@sentry/cloudflare'
import { Hono } from 'hono'

const app = new Hono<{ Bindings: { SENTRY_DSN: string } }>()
app.get('/', (c) => c.text('ok'))

export default Sentry.withSentry(
  (env) => ({
    dsn: env.SENTRY_DSN,
    tracesSampleRate: 0.1,     // パフォーマンス計測は 10%
    sendDefaultPii: false,     // 個人情報を送らない
  }),
  app,
)
```

### Node.js
```ts
// instrument.ts(アプリより先に読み込む)
import * as Sentry from '@sentry/node'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: process.env.GIT_SHA,   // どのバージョンで起きたか
  tracesSampleRate: 0.1,
})
```
```ts
// 捕まえて処理したエラーも送りたいとき
try { await chargeCard() } catch (e) { Sentry.captureException(e); throw e }
```
- Sentry の SDK は内部で OpenTelemetry を使っていて、トレースもまとめて見られる
- `onError`(Hono)で握りつぶしたエラーが送られているか確認する

## Cloudflare Workers の組み込み機能
```jsonc
// wrangler.jsonc
"observability": {
  "enabled": true,
  "logs":   { "enabled": true, "head_sampling_rate": 1 },
  "traces": { "enabled": true, "head_sampling_rate": 0.1 }
}
```
| 機能 | 内容 |
| --- | --- |
| **Workers Logs** | `console.log` と呼び出しの記録を保存・検索(Query Builder で集計も) |
| リアルタイムログ | `npx wrangler tail` で本番のログを流し見 |
| **Traces**(ベータ) | コード不要で fetch・バインディング呼び出しのスパンを記録 |
| **Issues**(ベータ) | 例外・5xx・エラーログを自動でまとめる(SDK 不要)。通知や AI エージェントへの連携も |
| メトリクス | リクエスト数・エラー・CPU 時間・実行時間 |
| OpenTelemetry 出力 | ログとトレースを外部(Honeycomb・Grafana Cloud・Axiom など)へ。`persist: false` で Cloudflare に保存せず送るだけ |
- ソースマップを有効にすると、スタックが元の TypeScript の行で出る
- 保存したログ・トレースは量に応じて課金対象になる(2026年12月から)。サンプリング率で調整
- 運用・制限の全体 → [[Cloudflare_06_運用・制限・ベストプラクティス]]

## AWS(CloudWatch など)
| 用途 | サービス |
| --- | --- |
| ログ | CloudWatch Logs(Lambda・ECS の標準出力が自動で入る)、Logs Insights で検索 |
| メトリクス・アラーム | CloudWatch メトリクス・アラーム → SNS で通知 |
| トレース | X-Ray / CloudWatch Application Signals(OpenTelemetry 対応) |
| 外形監視 | CloudWatch Synthetics |
| 監査(誰が何をしたか) | CloudTrail |
- 詳しく → [[SAA_補足_監視と監査(CloudTrail・CloudWatch・Config)]] / [[SAA_補足_ログのまとめ(種類・保存先・分析)]]
- 何をどこにどれだけ残すかの決め方 → [[オブザーバビリティ_06_AWSのログ設計(アカウント構成・保存期間・コスト)]]

## AI アプリの監視
普通の Web アプリの指標に加えて、次を記録する。→ [[AIアプリ開発_07_評価・コスト・セキュリティ・運用]]
| 項目 | 取り方 |
| --- | --- |
| 入力・出力トークン数、キャッシュの読み込み量 | `response.usage` をログに |
| 費用(ユーザー別・機能別) | トークン数 × 単価で計算して集計 |
| 最初の文字が出るまでの時間・全体の時間 | ストリーミングの開始・終了で計測 |
| `stop_reason`(`max_tokens`・`refusal`)、429・529 の回数 | ログ・メトリクス |
| ツール呼び出しの回数・失敗 | スパン or ログ |
| ユーザーの評価(👍👎) | 業務ログ |
- Claude の SDK・API は OpenTelemetry のスパン(`gen_ai.*` の属性)を出せる(ベータ)。既定ではプロンプトや応答の本文は含まれない(メタデータのみ)
- 本文を記録するなら、保存先の**閲覧権限と保存期間**を決める

## 設定のチェックリスト
- [ ] エラー追跡(Sentry / Issues)が本番で動き、通知が届く(わざとエラーを出して確認)
- [ ] ソースマップをアップロードしている
- [ ] ログは JSON。requestId(traceId)・バージョン・環境が入っている
- [ ] パスワード・トークン・個人情報がログ・スパンに出ていない
- [ ] 外からの死活監視がある(DNS・証明書切れも検知)
- [ ] ダッシュボードでリクエスト数・エラー率・p95 が見られる
- [ ] アラートは「ユーザーへの影響」に対して。通知先と対応手順が決まっている
- [ ] サンプリング率と保存期間を決めた(費用の確認)
- [ ] デプロイ時刻・バージョンがわかり、すぐロールバックできる → [[Cicdパイプライン]]

## 関連
- 前: [[オブザーバビリティ_04_トレースとOpenTelemetry]] / 次: [[オブザーバビリティ_06_AWSのログ設計(アカウント構成・保存期間・コスト)]]
- [[Cloudflare]] / [[AWS SAA]] / [[Hono]] / [[AIアプリ開発]]
- 参考: https://docs.sentry.io/platforms/javascript/guides/cloudflare/ , https://docs.sentry.io/platforms/javascript/guides/node/ , https://developers.cloudflare.com/workers/observability/ , https://developers.cloudflare.com/workers/observability/opentelemetry-export/
