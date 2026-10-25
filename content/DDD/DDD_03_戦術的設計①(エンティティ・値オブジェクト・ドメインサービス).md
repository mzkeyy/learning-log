---
title: "DDD 03 戦術的設計①(エンティティ・値オブジェクト・ドメインサービス)"
modified: 2026-10-05
---

← [[DDD_02_戦略的設計(境界づけられたコンテキスト・サブドメイン・コンテキストマップ)]] / 入口 → [[DDD]] / 次 → [[DDD_04_戦術的設計②(集約・リポジトリ・ドメインイベント)]]

戦術的設計 = **1つのコンテキストの中で、業務ルールをコードに落とすための部品**。例はすべて [[TypeScript]]。

## 1. 値オブジェクト(Value Object) ― まずここから
**値そのもので区別されるもの**。金額・メールアドレス・住所・期間・数量など。

| 性質 | 意味 |
| --- | --- |
| **不変(イミュータブル)** | 作ったら変えない。変えたいときは新しく作る |
| **値で等価判定** | 「1000円」と「1000円」は同じ。ID は持たない |
| **自分で正しさを守る** | 作る時点で検証。**不正な値のインスタンスは存在できない** |
| **振る舞いを持つ** | 足し算・比較・表示など、その値に関する処理をまとめる |

```ts
export class Money {
  private constructor(readonly amount: number, readonly currency: 'JPY') {}

  static of(amount: number): Money {
    if (!Number.isInteger(amount)) throw new Error('金額は整数で指定してください');
    if (amount < 0) throw new Error('金額はマイナスにできません');
    return new Money(amount, 'JPY');
  }
  add(other: Money): Money { return Money.of(this.amount + other.amount); }
  multiply(n: number): Money { return Money.of(this.amount * n); }
  equals(other: Money): boolean { return this.amount === other.amount && this.currency === other.currency; }
}

export class EmailAddress {
  private constructor(readonly value: string) {}
  static of(raw: string): EmailAddress {
    const v = raw.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) throw new Error('メールアドレスの形式が不正です');
    return new EmailAddress(v);
  }
}
```

効果:
- `number` や `string` をそのまま使う(**プリミティブ執着**)と、「マイナスの金額」「税込と税抜の足し算」「未検証のメール」がどこにでも紛れ込む
- 値オブジェクトにすれば**検証は1か所**、受け取る側は「もう正しい」前提で書ける
- 関数の引数が `(price: Money, email: EmailAddress)` なら**取り違えを型が防ぐ**

### クラスを使わない軽量版(ブランド型 + 関数)
```ts
type Email = string & { readonly __brand: 'Email' };
function parseEmail(raw: string): Email {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) throw new Error('invalid email');
  return raw as Email;
}
function sendWelcome(to: Email) { /* ... */ }
sendWelcome('a@example.com');            // ✗ 型エラー(未検証の string は渡せない)
sendWelcome(parseEmail('a@example.com')); // ○
```
Zod などのスキーマで検証して `.brand()` を付ける方法もある。**「検証済みの値だけが通れる型」を作る**のが本質で、クラスかどうかは好みでよい。

## 2. エンティティ(Entity)
**ID で区別されるもの**。中身(名前・住所・状態)が変わっても同じもの。会員・注文・予約など。

| | 値オブジェクト | エンティティ |
| --- | --- | --- |
| 区別の仕方 | 値が同じなら同じ | **ID が同じなら同じ** |
| 変化 | 不変 | 状態が変わる(ライフサイクルがある) |
| 例 | 金額、住所、期間 | 会員、注文、予約 |

```ts
type ReservationStatus = 'tentative' | 'confirmed' | 'cancelled';

export class Reservation {
  private constructor(
    readonly id: ReservationId,
    private status: ReservationStatus,
    readonly slot: TimeSlot,          // 値オブジェクト
    private readonly heldAt: Date,
  ) {}

  static holdTentatively(id: ReservationId, slot: TimeSlot, now: Date) {
    return new Reservation(id, 'tentative', slot, now);
  }

  // 業務の言葉のメソッド。ルールはここに書く
  confirm(now: Date) {
    if (this.status !== 'tentative') throw new Error('仮予約のみ確定できます');
    if (now.getTime() - this.heldAt.getTime() > 24 * 60 * 60 * 1000)
      throw new Error('仮予約の期限(24時間)を過ぎています');
    this.status = 'confirmed';
  }
  cancel() {
    if (this.status === 'cancelled') throw new Error('すでにキャンセル済みです');
    this.status = 'cancelled';
  }
  get currentStatus() { return this.status; }
}
```

ポイント:
- **setter を公開しない**(`reservation.status = 'confirmed'` を外から書けない)。状態を変えるのは**業務の言葉のメソッド**だけ
- **不正な状態遷移をメソッドの中で防ぐ** → どの画面・API から呼ばれてもルールが守られる
- 現在時刻は引数で受け取ると**テストしやすい**

### ドメインモデル貧血症(Anemic Domain Model)
✗ エンティティがデータの入れ物(getter/setter だけ)で、ルールが全部サービスに散らばっている状態。
```ts
// ✗ 貧血: ルールが外にある。別の場所で同じチェックを忘れるとバグ
if (r.status === 'tentative' && within24h(r)) { r.status = 'confirmed'; }
// ○ ルールはエンティティの中
r.confirm(now);
```
※ 単純な CRUD なら貧血でも問題ない。**ルールが増えてきたら中に寄せる**。

## 3. ドメインサービス(Domain Service)
**どのエンティティ・値オブジェクトにも自然に属さない業務ロジック**。
- 例:「同じ時間帯にスタッフの予約が重複していないか」(1件の予約だけでは判断できない)
- 例:「2つの口座間の振替」(どちらの口座のメソッドにするのも不自然)

```ts
export class ReservationPolicy {
  constructor(private readonly reservations: ReservationRepository) {}
  async canBook(staffId: StaffId, slot: TimeSlot): Promise<boolean> {
    const existing = await this.reservations.findActiveByStaff(staffId, slot.date);
    return existing.every(r => !r.slot.overlaps(slot));
  }
}
```

注意:
- **何でもドメインサービスにしない**。まず「エンティティか値オブジェクトに書けないか」を考える(書きすぎると貧血症に逆戻り)
- 名前は業務の言葉で(`ReservationPolicy`, `PricingService`)。`ReservationManager` のような曖昧な名前は避ける
- **アプリケーションサービス(05章)とは別物**:ドメインサービスは「業務ルール」、アプリケーションサービスは「手順の組み立て(取得→実行→保存)」

## 4. どれにするか迷ったら
```
ID で追いかける必要がある? ── はい → エンティティ
        │いいえ
        ▼
値として扱える(同じ値なら同じ)? ── はい → 値オブジェクト
        │
        ▼
複数のオブジェクトにまたがるルール? ── はい → ドメインサービス
```
迷ったら**値オブジェクトを優先**。不変で扱いやすく、バグが減りやすい。

## 5. 初学者向けまとめ
- 一番費用対効果が高いのは**値オブジェクト**(金額・メール・期間などに型をつける)
- エンティティは「**外から状態を直接書き換えさせない**、業務の言葉のメソッドで変える」
- ドメインサービスは最後の手段
