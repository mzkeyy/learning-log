---
title: "DDD 05 アーキテクチャ(レイヤード・オニオン・クリーン・CQRS)"
modified: 2026-10-05
---

← [[DDD_04_戦術的設計②(集約・リポジトリ・ドメインイベント)]] / 入口 → [[DDD]] / 次 → [[DDD_06_実務の注意(やりすぎ・TypeScript・AI開発)]]

目的は1つ:**業務ルール(ドメイン)を、画面・DB・フレームワークなどの技術的な都合から守る**。名前は違っても、どれも「ドメインを真ん中に置き、依存を内側に向ける」考え方。

## 1. 4つの層
| 層 | 役割 | 例 | 知っていてよいもの |
| --- | --- | --- | --- |
| **プレゼンテーション(UI / インターフェース)** | 入出力の変換。HTTP・画面・CLI | Next.js の Route Handler / Server Action、Hono のルート | アプリケーション層 |
| **アプリケーション(ユースケース)** | 1つの操作の手順を組み立てる。トランザクション・権限チェック | `PlaceOrderUseCase` | ドメイン層 |
| **ドメイン** | **業務ルールそのもの** | `Order`, `Money`, `OrderRepository`(interface) | **何にも依存しない** |
| **インフラストラクチャ** | 技術的な実装。DB・外部 API・メール | `DrizzleOrderRepository`, `StripePaymentGateway` | ドメイン層(interface を実装する) |

```
          ┌─────────────────────────────┐
          │  インフラ / UI(外側)          │
          │   ┌─────────────────────┐   │
          │   │ アプリケーション       │   │
          │   │   ┌─────────────┐   │   │
          │   │   │  ドメイン     │   │   │   依存の向き: 外 → 内 だけ
          │   │   └─────────────┘   │   │   ドメインは外を知らない
          │   └─────────────────────┘   │
          └─────────────────────────────┘
```

### 依存性逆転(DIP)がポイント
素朴に作ると「ドメイン → DB」と依存してしまう。DDD ではドメインに**インターフェース(`OrderRepository`)を置き、インフラがそれを実装**する。これで依存が「インフラ → ドメイン」に逆転する。
- DB を D1 → PostgreSQL に変えてもドメインは無傷
- テストではメモリ実装に差し替えられる

## 2. アプリケーションサービス(ユースケース)の書き方
**手順だけ**を書き、業務ルールはドメインに任せる。
```ts
export class PlaceOrderUseCase {
  constructor(
    private orders: OrderRepository,
    private payments: PaymentGateway,
    private events: EventPublisher,
  ) {}

  async execute(input: { orderId: string; userId: string }, now: Date) {
    const order = await this.orders.findById(OrderId.of(input.orderId));   // 1. 取得
    if (!order) throw new NotFoundError();
    if (!order.isOwnedBy(input.userId)) throw new ForbiddenError();        // 2. 認可(必ず!)
    order.place(now);                                                       // 3. ドメインに任せる
    await this.payments.charge(order);
    await this.orders.save(order);                                          // 4. 保存
    await this.events.publish(order.pullEvents());                          // 5. イベント
  }
}
```
- ✗ ここに `if (order.lines.length === 0)` などの業務ルールを書き始めたら、ドメインに移す合図
- **認可チェック(他人の注文を操作できないか)はここで必ず行う**([[認証]]・[[Webセキュリティ対策]])

## 3. 名前の違うよく似たアーキテクチャ
| 名前 | 提唱 | 特徴 |
| --- | --- | --- |
| **レイヤード** | Evans(DDD 本) | 上の4層。最初の形 |
| **ヘキサゴナル(ポート&アダプター)** | Alistair Cockburn | 内側が「ポート(interface)」を定義し、外側の「アダプター」が差し込まれる |
| **オニオン** | Jeffrey Palermo | 同心円。中心がドメインモデル |
| **クリーンアーキテクチャ** | Robert C. Martin | Entities / Use Cases / Interface Adapters / Frameworks の同心円。依存は内向きのみ |

**本質は同じ**:「ドメインが中心」「依存は内向き」「技術は差し替え可能」。用語の細かい違いにこだわる必要はない。

## 4. フォルダ構成の例(TypeScript)
コンテキストごとに分け、その中で層を分ける(**機能優先**)と見通しが良い。
```
src/
  ordering/                 ← 注文コンテキスト
    domain/
      order.ts              (集約: Order, OrderLine)
      money.ts              (値オブジェクト)
      order-repository.ts   (interface)
      events.ts             (OrderPlaced)
    application/
      place-order.ts        (ユースケース)
    infrastructure/
      drizzle-order-repository.ts
    presentation/
      routes.ts             (HTTP ハンドラ)
  shipping/                 ← 配送コンテキスト(同じ構造)
  shared/                   ← 本当に共通なものだけ(ID 生成など)
```
- ✗ `src/domain/`, `src/infrastructure/` のように**層を一番上に置く**と、1機能の修正で全フォルダを渡り歩くことになりがち
- **ルールで縛る**:`domain/` から `infrastructure/` や `drizzle-orm`・`next` を import したら CI で落とす(ESLint の `no-restricted-imports`、dependency-cruiser など)

### Next.js の場合
- `app/` は**プレゼンテーション層**として薄く保つ(入力の検証・ユースケース呼び出し・結果を返すだけ)
- Server Action / Route Handler の中に業務ルールを書かない
- ドメイン層は React・Next.js を import しない([[Next.js]])

## 5. CQRS(コマンドクエリ責務分離)
**書き込み(コマンド)と読み取り(クエリ)で、モデルや経路を分ける**。

```
書き込み: UI → ユースケース → 集約(ルールチェック)→ リポジトリ → DB
読み取り: UI → クエリサービス → SQL / ビューを直接 → 画面用の DTO
```
- 一覧画面・ダッシュボードは複数集約をまたいで集計したい → 集約を全部組み立ててから加工するのは遅いし不自然
- **読み取りはドメインモデルを通らず、画面に必要な形で直接 SQL を書いてよい**([[SQL]])
- 本格版は「書き込み DB と読み取り DB を分け、イベントで同期」まであるが、**最初は同じ DB で経路だけ分ける**ので十分

## 6. 初学者向けまとめ
- 覚えるのは「**ドメインは何にも依存しない、依存は内向き**」の1点
- ユースケースは**手順だけ**、ルールはドメイン、技術はインフラ
- 読み取りはドメインを通さなくてよい(CQRS の軽量版)
