---
title: "DDD 04 戦術的設計②(集約・リポジトリ・ドメインイベント)"
modified: 2026-10-05
---

← [[DDD_03_戦術的設計①(エンティティ・値オブジェクト・ドメインサービス)]] / 入口 → [[DDD]] / 次 → [[DDD_05_アーキテクチャ(レイヤード・オニオン・クリーン・CQRS)]]

## 1. 集約(Aggregate)と集約ルート
**一緒に整合性(ルール)を守らなければならないオブジェクトのまとまり**。外からは**集約ルート**(窓口のエンティティ)だけを触る。

例:注文(Order)と注文明細(OrderLine)
- ルール「合計金額 = 明細の合計」「明細は最大50件」「確定後は明細を変更できない」
- これは Order と OrderLine をまとめて見ないと守れない → **1つの集約**

```
┌──────── Order 集約 ────────┐
│ Order(集約ルート)          │ ← 外部はここだけ触る
│   ├─ OrderLine            │
│   ├─ OrderLine            │
│   └─ ShippingAddress (値) │
└───────────────────────────┘
       customerId だけ持つ(Customer 集約は別)
```

```ts
export class Order {
  private lines: OrderLine[] = [];
  private status: 'draft' | 'placed' = 'draft';
  constructor(readonly id: OrderId, readonly customerId: CustomerId) {}

  addLine(productId: ProductId, unitPrice: Money, quantity: number) {
    if (this.status !== 'draft') throw new Error('確定済みの注文は変更できません');
    if (this.lines.length >= 50) throw new Error('明細は50件までです');
    this.lines.push(new OrderLine(productId, unitPrice, quantity));
  }
  get total(): Money {
    return this.lines.reduce((sum, l) => sum.add(l.subtotal), Money.of(0));
  }
  place() {
    if (this.lines.length === 0) throw new Error('明細がありません');
    this.status = 'placed';
  }
}
// ✗ order.lines.push(...) や line.quantity = 999 を外から直接できないようにする
```

### 集約設計の4つのルール(Vernon)
| ルール | 意味 | 理由 |
| --- | --- | --- |
| **本当に必要な不変条件だけを集約の中に** | 「常に同時に正しくないと困る」ものだけまとめる | 大きいとロック競合・読み込みが重くなる |
| **集約は小さく** | 多くはルート+値オブジェクト数個で足りる | 同時更新の衝突を減らす |
| **他の集約は ID で参照** | `customer: Customer` ではなく `customerId: CustomerId` | 境界を明確にし、うっかり他集約を変更しない |
| **1トランザクションで変更するのは1集約** | 他の集約への反映は**結果整合性**(少し後で揃う) | 疎結合・スケールしやすい |

- 「注文したら在庫を減らす」は Order と Stock の2集約 → **ドメインイベントで後から在庫を減らす**(数秒ずれても困らないか業務の人に確認)
- 本当に同時でないと困るなら、集約の境界が間違っている可能性がある
- 小さなアプリでは、2集約を1トランザクションで更新する妥協もアリ。**ルールとして理解したうえで破る**

## 2. リポジトリ(Repository)
**集約を保存・取得するための入れ物**。ドメイン層からは「コレクションのように見える」ようにし、DB・ORM・SQL の存在を隠す。

```ts
// ドメイン層: インターフェースだけ置く(DB を知らない)
export interface OrderRepository {
  findById(id: OrderId): Promise<Order | null>;
  save(order: Order): Promise<void>;
  nextId(): OrderId;
}

// インフラ層: 実装(Drizzle / D1 など)
export class DrizzleOrderRepository implements OrderRepository {
  constructor(private db: DrizzleD1Database) {}
  async findById(id: OrderId) {
    const row = await this.db.query.orders.findFirst({ where: eq(orders.id, id.value), with: { lines: true } });
    return row ? OrderMapper.toDomain(row) : null;   // DB の行 → ドメインオブジェクト
  }
  async save(order: Order) {
    // 集約まるごと保存(ルート+明細)。db.batch で1トランザクションに
  }
  nextId() { return OrderId.of(crypto.randomUUID()); }
}
```

ポイント:
- **リポジトリは集約ごとに1つ**(`OrderLineRepository` は作らない。明細は Order 経由で保存)
- メソッド名はドメインの言葉で(`findActiveByStaff`)。汎用的な `findWhere(sql)` を生やさない
- テストでは**メモリ上の偽実装**に差し替えられる → DB なしでドメインのテストが書ける
- 一覧画面・検索・集計のような**読み取り専用の複雑なクエリはリポジトリに詰め込まない** → 05章の CQRS(クエリ用の別経路)
- [[N+1]] に注意:集約を1件ずつループで `findById` しない

## 3. ファクトリ(Factory)
**生成が複雑な集約の組み立てを担当**。コンストラクタで済むなら不要。
- 例:見積もりから注文を作る、他の集約の情報を使って初期値を決める
- 静的メソッド(`Order.createFromQuote(quote)`)や専用関数で十分なことが多い

## 4. ドメインイベント(Domain Event)
**業務上意味のある「起きた出来事」**。過去形で名付ける。
- `OrderPlaced`(注文が確定した)、`ReservationCancelled`(予約がキャンセルされた)、`PaymentReceived`(入金があった)

```ts
export type OrderPlaced = {
  type: 'OrderPlaced';
  orderId: string;
  customerId: string;
  total: number;
  occurredAt: Date;
};

export class Order {
  private events: OrderPlaced[] = [];
  place(now: Date) {
    /* ...ルールチェック... */
    this.status = 'placed';
    this.events.push({ type: 'OrderPlaced', orderId: this.id.value, customerId: this.customerId.value,
                       total: this.total.amount, occurredAt: now });
  }
  pullEvents() { const e = this.events; this.events = []; return e; }
}
```

使いどころ:
- **他の集約・コンテキストへの反映**:注文確定 → 在庫引当・ポイント付与・確認メール送信
- **疎結合**:注文側は「誰が反応するか」を知らない。機能追加は購読側を足すだけ
- **監査・履歴**:何が起きたかの記録になる

実装の注意:
- 「DB 保存は成功したのにイベント送信が失敗」「イベントは送ったのに保存がロールバック」を防ぐため、**イベントも同じトランザクションで DB(outbox テーブル)に保存し、別プロセスで送る**(トランザクショナル・アウトボックス)
- 購読側は**同じイベントが2回届いても大丈夫**に作る(冪等性)
- Cloudflare なら Queues、AWS なら SQS/EventBridge などで配送することが多い
- 小さなアプリなら、同じプロセス内で関数を順に呼ぶだけでもよい

## 5. 初学者向けまとめ
- 集約 = **「ここまでは必ず同時に正しい」範囲**。小さく作り、他は ID で参照
- リポジトリは**集約単位**。ドメインから DB を隠す
- 集約をまたぐ反映は**ドメインイベント**で(結果整合性を業務の人と合意する)
