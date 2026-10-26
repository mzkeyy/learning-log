---
title: "オブザーバビリティ 04 トレースと OpenTelemetry"
modified: 2026-10-26
---

## 分散トレースとは
1つのリクエストが**どの処理を・どの順で・何ミリ秒かけて**通ったかを記録したもの。
```
トレース(traceId: 4bf9…)  POST /api/checkout  合計 2,340ms
├─ スパン: 認証ミドルウェア                    12ms
├─ スパン: DB SELECT cart                      35ms
├─ スパン: 外部 API stripe.charges.create   2,180ms  ← ここが遅い
└─ スパン: DB INSERT order                     40ms
```
| 用語 | 意味 |
| --- | --- |
| **トレース** | 1リクエストの全体。`traceId` で識別 |
| **スパン** | その中の1つの処理(名前・開始時刻・所要時間・属性・成功/失敗)。親子関係を持つ |
| **属性** | スパンに付ける情報(`http.route`、`db.system`、`user.id` など) |
| **コンテキスト伝播** | サービスをまたぐとき、`traceparent` ヘッダーで traceId を渡して1本につなぐ |
| **サンプリング** | 全部ではなく一部のリクエストだけ記録して費用を抑える |
- フロント → API → 別のサービス → DB と**またいでも1本の線**として見られるのが強み
- ログに `traceId` を入れておくと、トレースから関係するログに飛べる

## OpenTelemetry(OTel)
**ログ・メトリクス・トレースを集めて送るための、業界標準の規格とライブラリ**(CNCF のプロジェクト)。
| 部品 | 役割 |
| --- | --- |
| API / SDK | アプリの中で計測する(言語ごと) |
| **自動計装** | HTTP・DB・fetch などの主要ライブラリに、コードを書かずにスパンを付ける |
| Exporter | データを送り出す。標準の形式は **OTLP** |
| Collector | 受け取って加工・間引き・振り分けする中継サーバー(任意) |
| セマンティック規約 | 属性名の決まり(`http.request.method`、`gen_ai.usage.input_tokens` など) |
- **一度 OTel で計測しておけば、送り先(Datadog・Grafana・Honeycomb・Sentry・Jaeger など)を後から替えられる**。特定の会社に縛られない
- 生成 AI 用の規約(`gen_ai.*`)もあり、Claude の SDK・API もこれに沿ったスパンを出せる → [[AIアプリ開発_07_評価・コスト・セキュリティ・運用]]

## Node.js に入れる
```bash
npm install @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node @opentelemetry/exporter-trace-otlp-http
```
```ts
// instrumentation.ts(アプリより先に読み込む)
import { NodeSDK } from '@opentelemetry/sdk-node'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'

const sdk = new NodeSDK({
  serviceName: 'my-api',
  traceExporter: new OTLPTraceExporter(),        // 送り先は環境変数 OTEL_EXPORTER_OTLP_ENDPOINT
  instrumentations: [getNodeAutoInstrumentations()],
})
sdk.start()
```
```bash
node --import ./dist/instrumentation.js ./dist/server.js
```
- これだけで HTTP の受信・送信、主要な DB ドライバなどのスパンが自動で取れる
- 送り先の URL や認証ヘッダーは**環境変数**で渡す(`OTEL_EXPORTER_OTLP_ENDPOINT`、`OTEL_EXPORTER_OTLP_HEADERS`、`OTEL_SERVICE_NAME`)
- 手元で試すなら Jaeger(Docker で起動)に送ると、画面でトレースを見られる
- [[Next.js]] は `instrumentation.ts` で OTel を設定する仕組みが用意されている

### 自分でスパンを作る
```ts
import { trace } from '@opentelemetry/api'

const tracer = trace.getTracer('my-api')

export async function generateReport(userId: string) {
  return tracer.startActiveSpan('generate_report', async (span) => {
    span.setAttribute('app.user_id', userId)
    try {
      const data = await loadData(userId)        // この中の DB 呼び出しなどは子スパンになる
      span.setAttribute('app.rows', data.length)
      return render(data)
    } catch (e) {
      span.recordException(e as Error)
      span.setStatus({ code: 2 })                // ERROR
      throw e
    } finally {
      span.end()                                 // ★ 必ず終わらせる
    }
  })
}
```
- 自動計装で取れない**業務上の重い処理**(レポート生成・AI 呼び出し・外部連携)に付ける

## Cloudflare Workers のトレース
- Workers は**コード不要の自動トレース**がある(ベータ)。fetch・KV・R2・D1・Durable Objects の呼び出しが自動でスパンになる
```jsonc
// wrangler.jsonc
"observability": {
  "enabled": true,
  "traces": { "enabled": true, "head_sampling_rate": 0.1 }   // 10% を記録
}
```
- OpenTelemetry 形式で外部(Honeycomb・Grafana Cloud・Axiom など)に送れる(`destinations`)
- 詳しく → [[オブザーバビリティ_05_道具と実装(Sentry・Cloudflare・AWS)]]

## サンプリング
| 方式 | 内容 | 向く場面 |
| --- | --- | --- |
| ヘッドサンプリング | リクエストの最初に「記録するか」を確率で決める | 簡単。Workers の `head_sampling_rate` など |
| テールサンプリング | 終わってから「エラー・遅いものは全部残す」と決める | 大事なものを確実に残す(Collector が必要) |
- アクセスが少ないうちは**全部記録**(1.0)でよい。増えてきたら下げる

## つまずきやすいところ
- サービスをまたぐと線が切れる → `traceparent` ヘッダーが渡っているか確認(自動計装の fetch なら自動)
- スパンを `end()` し忘れる → 記録されない
- 属性に個人情報やトークンを入れる → ログと同じく入れない
- 計装の読み込みがアプリより後 → 自動計装が効かない(`--import` で先に読む)

## 関連
- 前: [[オブザーバビリティ_03_メトリクスとアラート]] / 次: [[オブザーバビリティ_05_道具と実装(Sentry・Cloudflare・AWS)]]
- [[Next.js]] / [[Cloudflare]]
- 参考: https://opentelemetry.io/docs/concepts/signals/traces/ , https://opentelemetry.io/docs/languages/js/getting-started/nodejs/ , https://developers.cloudflare.com/workers/observability/traces/ , https://www.w3.org/TR/trace-context/
