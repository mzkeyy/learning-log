---
title: "ソフトウェア設計 02 設計原則(SOLID・DRY・KISS・YAGNI・依存性の注入)"
modified: 2026-10-26
---

## SOLID
オブジェクト指向の設計原則の頭文字。クラスに限らず、関数・モジュールにも当てはまる。
| 原則 | 一言で | 破るとどうなる |
| --- | --- | --- |
| **S**: 単一責任 | 変更する理由は1つだけに | 経理の変更と表示の変更が同じファイルでぶつかる |
| **O**: 開放閉鎖 | 拡張に開き、修正に閉じる | 種類を足すたびに既存のコードを直す |
| **L**: リスコフの置換 | 子は親の代わりに使えるように | 差し替えたら動かなくなる |
| **I**: インターフェース分離 | 使わないメソッドに依存させない | 関係ない変更で使う側も壊れる |
| **D**: 依存性逆転 | 具体ではなく抽象に依存する | DB やメールの実装を変えると業務ロジックも直す |

### S: 単一責任の原則
「1つのことだけする」ではなく、**「変更を求める人(理由)が1つ」**。
```ts
// ❌ 計算・保存・メール・PDF が1つのクラスに。経理・デザイン・インフラ、誰の変更でも触る
class Invoice {
  calculateTotal() {}
  saveToDb() {}
  sendEmail() {}
  renderPdf() {}
}

// ✅ 変更の理由ごとに分ける
const calculateInvoiceTotal = (items: Item[]) => { /* 料金ルール(経理) */ }
const invoiceRepository = { save: async (invoice: Invoice) => { /* DB */ } }
const renderInvoicePdf = (invoice: Invoice) => { /* 見た目 */ }
```

### O: 開放閉鎖の原則
- 新しい種類(支払い方法・通知チャネル・エクスポート形式)を、**既存のコードを変えずに足せる**ようにする
- 方法: インターフェース + 実装の追加、設定・テーブルで振る舞いを決める、Strategy パターン → [[ソフトウェア設計_03_デザインパターン(今でも使うもの)]]
- 変化しそうな軸を見極めるのが大事。**変わらない部分まで拡張可能にしない**

### L: リスコフの置換原則
```ts
// ❌ 正方形は長方形の一種…だが、幅だけ変えると高さも変わってしまい、長方形として使えない
class Rectangle { setWidth(w: number) {} setHeight(h: number) {} }
class Square extends Rectangle { /* 幅と高さを連動させる */ }
```
- 子クラスが親の約束(事前条件・事後条件)を破るなら、継承の関係が間違っている
- 例外を投げて「この子ではこの機能は使えない」とするのは、置換原則違反のサイン

### I: インターフェース分離の原則
```ts
// ❌ 読むだけの画面にも書き込みのメソッドまで依存させる
interface UserRepository { find(id: string): Promise<User>; save(u: User): Promise<void>; delete(id: string): Promise<void> }

// ✅ 使う側が必要なものだけ
interface UserReader { find(id: string): Promise<User> }
interface UserWriter { save(u: User): Promise<void> }
```

### D: 依存性逆転の原則
```
❌ 業務ロジック ──依存──▶ PostgreSQL の具体的なコード
✅ 業務ロジック ──依存──▶ インターフェース(OrderRepository) ◀──実装── PostgreSQL のコード
```
- 大事なもの(業務ルール)が、変わりやすいもの(DB・外部サービス・フレームワーク)に依存しない
- これがレイヤード・クリーンアーキテクチャの土台 → [[DDD_05_アーキテクチャ(レイヤード・オニオン・クリーン・CQRS)]]

## 依存性の注入(DI)
**使う部品を、中で作らずに外から渡す**こと。
```ts
// ❌ 中で作る: 差し替えられない、テストで本物のメールが飛ぶ
class SignupService {
  private mailer = new SesMailer()
}

// ✅ 外から渡す(コンストラクタ注入)
class SignupService {
  constructor(private deps: { mailer: Mailer; users: UserRepository; now: () => Date }) {}
}

// 組み立ては1か所(エントリーポイント)で
const signup = new SignupService({ mailer: new SesMailer(), users: drizzleUserRepository, now: () => new Date() })
```
```ts
// 関数で書く場合: 依存を引数に
export const makeSignup = (deps: { mailer: Mailer; users: UserRepository }) =>
  async (email: string) => { /* deps.mailer / deps.users を使う */ }
```
- **DI コンテナ(ライブラリ)は必須ではない**。小〜中規模なら、エントリーポイントで手で組み立てれば十分
- テストでは偽物(フェイク)を渡せる → [[テスト_02_Vitestの基本(書き方・マッチャー・モック)]]
- [[Hono]] ならミドルウェアで `c.set('deps', ...)` して渡す方法もある

## その他の原則
| 原則 | 意味 | 注意 |
| --- | --- | --- |
| **DRY**(Don't Repeat Yourself) | 同じ**知識**を2か所に書かない | 見た目が似ているだけのコードを無理にまとめない(偶然の重複) |
| **KISS**(Keep It Simple) | 単純に保つ | 賢い書き方より読みやすい書き方 |
| **YAGNI**(You Aren't Gonna Need It) | 今いらない機能・抽象化を作らない | 「将来使うかも」の汎用化は、ほとんど使われない |
| **3回目で共通化**(Rule of Three) | 2回までは重複を許し、3回目にまとめる | 2つだけでは正しい共通化の形がわからない |
| **関心の分離** | 違う関心(表示・業務・保存)を混ぜない | |
| **デメテルの法則** | 直接の知り合いとだけ話す(`a.b().c().d()` を避ける) | 中身を辿ると、構造の変更に弱くなる |
| **驚き最小の原則** | 名前から想像できるとおりに動く | `getUser()` が DB を書き換えない |

### DRY の落とし穴
```ts
// 「ユーザー名の検証」と「商品名の検証」がたまたま同じ(1〜50文字)
// → 1つの関数にまとめると、商品名だけ100文字にしたいときに困る
```
- 同じ**理由で変わるもの**だけをまとめる。変わる理由が違うなら、重複していてよい
- 間違った抽象化は、重複より高くつく

## 原則のやりすぎに注意
| やりすぎのサイン | 戻し方 |
| --- | --- |
| 実装が1つしかないインターフェースだらけ | テストで差し替える必要がなければ、インターフェースを消す |
| 1行の処理のために3つのファイルを辿る | 素直にまとめる |
| 何でも「Manager」「Service」「Helper」 | 業務の言葉で名前を付け直す → [[DDD_01_考え方(ドメイン・モデル・ユビキタス言語)]] |
| 設定で何でも変えられるが、誰も変えない | 決め打ちにする |
- 原則は「迷ったときの判断材料」。**小さなアプリ・試作には軽く**、長く育てるコアの部分には丁寧に

## AI と設計原則
- AI は**過剰な抽象化**(インターフェース・Factory・層だらけ)も、**何でも1ファイル**も、どちらも書きがち
- 「既存のコードの書き方に合わせて」「今の要件に必要な分だけ」と伝える。プロジェクトの方針を CLAUDE.md / AGENTS.md に書く → [[04_CLAUDE.mdとメモリ]]

## 関連
- 前: [[ソフトウェア設計_01_オブジェクト指向(カプセル化・ポリモーフィズム・合成)]] / 次: [[ソフトウェア設計_03_デザインパターン(今でも使うもの)]]
- [[DDD_05_アーキテクチャ(レイヤード・オニオン・クリーン・CQRS)]] / [[テスト]]
- 参考: https://blog.cleancoder.com/uncle-bob/2014/05/08/SingleReponsibilityPrinciple.html , https://martinfowler.com/articles/injection.html , https://sandimetz.com/blog/2016/1/20/the-wrong-abstraction , https://martinfowler.com/bliki/Yagni.html
