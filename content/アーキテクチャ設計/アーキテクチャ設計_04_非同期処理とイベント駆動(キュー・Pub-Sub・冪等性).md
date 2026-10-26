---
title: "アーキテクチャ設計 04 非同期処理とイベント駆動(キュー・Pub/Sub・冪等性)"
modified: 2026-10-26
---

## なぜ非同期にするか
```
同期:   注文 API ─▶ 決済 ─▶ メール送信 ─▶ 在庫連携 ─▶ 応答(遅い・どれかが落ちると全部失敗)
非同期: 注文 API ─▶ 決済 ─▶ キューに「注文確定」を入れる ─▶ すぐ応答
                                      │
                         ワーカー ─▶ メール送信 / 在庫連携(後で・失敗したら再試行)
```
| うれしいこと | 例 |
| --- | --- |
| **応答が速い** | 時間のかかる処理(メール・画像変換・AI の処理・レポート)を後回しに |
| **ピークを吸収** | アクセスが集中しても、キューに溜めて一定の速さで処理 |
| **失敗に強い** | 送り先が落ちていても、復旧後に再試行 |
| **疎結合** | 注文の処理が、メールや在庫のサービスのことを知らなくていい |
| 代わりに | 結果がすぐ確定しない、順番・重複・デバッグの難しさ |

## キューと Pub/Sub
| 方式 | 動き | 例 |
| --- | --- | --- |
| **キュー**(Point-to-Point) | 1つのメッセージを、**ワーカーのどれか1つ**が処理 | 仕事の割り振り(メール送信・画像変換) |
| **Pub/Sub**(発行・購読) | 1つのイベントを、**購読している全員**が受け取る | 「注文が確定した」を在庫・メール・分析がそれぞれ受け取る |
| ストリーム | 順番付きのイベントの記録を、各自が自分の位置から読む | ログ・分析・イベントの再生 |
| サービス | AWS | Cloudflare | その他 |
| --- | --- | --- | --- |
| キュー | **SQS** | **Queues** | Redis(BullMQ)、RabbitMQ |
| Pub/Sub | **SNS**、EventBridge | Queues + 複数の consumer | Google Pub/Sub |
| ストリーム | Kinesis、MSK(Kafka) | | Kafka |
| ワークフロー | Step Functions | Workflows | Temporal、Inngest |
→ [[SAA_07_疎結合と分析(SQS・SNS・EventBridge・Kinesis・Athena)]] / [[Cloudflare_03_バインディングとデータ保存(D1・R2・KV・DO・Queues)]]

### よく使う組み合わせ(ファンアウト)
```
注文サービス ─ 発行 ─▶ SNS(注文確定)─┬─▶ SQS ─▶ メール送信
                                      ├─▶ SQS ─▶ 在庫連携
                                      └─▶ SQS ─▶ 分析
```
- 受け取る側ごとにキューを持つので、1つが遅れても他に影響しない

## メッセージ処理の現実: 「少なくとも1回」
- 多くのキューは **at-least-once**(少なくとも1回は届く。**2回届くこともある**)
- ワーカーが処理中に落ちると、同じメッセージがもう一度届く
- 順番も保証されないことが多い(FIFO キューは順番を保てるが、処理量に制限)
- → **受け取る側の処理を冪等にする**のが基本

## 冪等性(べきとうせい)
**同じ処理を何回実行しても、1回実行したのと同じ結果になる**こと。
```ts
// ❌ 2回届くとポイントが2倍
await db.update(users).set({ points: sql`points + 100` }).where(eq(users.id, userId))

// ✅ 処理済みのメッセージ ID を記録し、2回目は何もしない
await db.transaction(async (tx) => {
  const inserted = await tx.insert(processedMessages)
    .values({ messageId })
    .onConflictDoNothing()          // 一意制約で2回目を弾く
    .returning()
  if (inserted.length === 0) return  // 処理済み
  await tx.update(users).set({ points: sql`points + 100` }).where(eq(users.id, userId))
})
```
| 方法 | 内容 |
| --- | --- |
| 処理済み ID の記録 | 上の例。一意制約で重複を防ぐ |
| 状態を見て判断 | 「すでに発送済みなら何もしない」 |
| 上書き型にする | 「+100」ではなく「= 計算した値」 |
| **冪等キー**(API) | クライアントが `Idempotency-Key` を送り、同じキーなら前回の結果を返す(決済 API の定番)→ [[アーキテクチャ設計_03_API設計とBFF(REST・GraphQL・RPC)]] |

## 失敗したメッセージ
- 再試行は**間隔を空けながら**(指数バックオフ)。何度か失敗したら **DLQ**(デッドレターキュー)へ移す
- DLQ を監視して、原因を直してから再投入する → [[オブザーバビリティ_03_メトリクスとアラート]]
- 「毒メッセージ」(何度やっても失敗する)でキュー全体が詰まらないように

## DB の更新とメッセージ送信を確実に(Outbox パターン)
```
❌ DB に注文を保存 → キューに送信(この間で落ちると、注文はあるのにイベントが出ない)

✅ Outbox
   1つのトランザクションで: 注文を保存 + outbox テーブルに「送るイベント」を保存
   別の処理: outbox を読んでキューに送り、送ったら印を付ける
```
- DB とキューは別のシステムなので、両方を同時に確実に更新できない。**DB の1つのトランザクションにまとめる**のがコツ
- 送信側は「少なくとも1回」になるので、受け取る側は冪等に

## イベントの設計
```json
{
  "id": "evt_01JB...",
  "type": "order.placed",
  "occurredAt": "2026-10-26T12:00:00Z",
  "version": 1,
  "data": { "orderId": "o_123", "userId": "u_1", "totalYen": 4500 }
}
```
- 名前は**過去形**(起きた事実): `order.placed`、`payment.failed`
- **イベントの形も API**。項目の削除・意味の変更は互換性を壊す。`version` を持たせる
- 中身を全部入れる(受け取る側が問い合わせなくていい)か、ID だけ入れる(受け取る側が最新を取りに行く)かを決める
- 業務の言葉で名前を付ける → [[DDD_04_戦術的設計②(集約・リポジトリ・ドメインイベント)]]

## イベントソーシングと CQRS(発展)
- **イベントソーシング**: 現在の状態ではなく、**起きたイベントの列**を保存し、状態はそこから計算する。履歴・監査に強いが、難しい。必要な場面(会計・監査が厳しい領域)に限る
- **CQRS**: 書き込み用と読み取り用でモデル(や DB)を分ける。読み取り用はイベントから作る → [[DDD_05_アーキテクチャ(レイヤード・オニオン・クリーン・CQRS)]]

## 長い処理・複数の手順(ワークフロー)
- 「決済 → 在庫 → 発送手配」のような複数の手順・途中の待ち・再試行・補償は、**ワークフローエンジン**に任せると楽(Step Functions、Cloudflare Workflows、Temporal)→ Saga は [[アーキテクチャ設計_02_モノリスとマイクロサービス(モジュラーモノリス・分け方・Saga)]]
- AI の長い処理(文書の一括処理・エージェント)も、キューやワークフローで非同期にするのが定番 → [[AIアプリ開発_05_エージェント(ループ・Agent SDK・Managed Agents)]]

## 画面への結果の伝え方
| 方法 | 内容 |
| --- | --- |
| 202 + 状態確認 API | 「受け付けました」→ クライアントが `GET /jobs/{id}` で確認(ポーリング) |
| SSE / WebSocket | 終わったらサーバーから知らせる |
| Webhook | 外部のシステムに、終わったら URL を呼んで知らせる |
| メール・通知 | 時間がかかるもの |

## 関連
- 前: [[アーキテクチャ設計_03_API設計とBFF(REST・GraphQL・RPC)]] / 次: [[アーキテクチャ設計_05_スケールとキャッシュ(システム設計の基本)]]
- [[SAA_07_疎結合と分析(SQS・SNS・EventBridge・Kinesis・Athena)]] / [[Cloudflare]] / [[PostgreSQLとDrizzle_04_実務(トランザクション・インデックス・接続・性能)]]
- 参考: https://microservices.io/patterns/data/transactional-outbox.html , https://martinfowler.com/articles/201701-event-driven.html , https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html , https://stripe.com/docs/api/idempotent_requests
