---
title: "Zod 02 スキーマの種類(文字列・数値・オブジェクト・配列・union)"
modified: 2026-11-01
---

## 基本の型
| スキーマ | 型 |
| --- | --- |
| `z.string()` / `z.number()` / `z.boolean()` / `z.bigint()` / `z.date()` | そのまま |
| `z.int()` | 整数の number(`Infinity`・小数は不可)。`z.number().int()` と同じ |
| `z.literal("admin")` / `z.literal(["a", "b"])` | `"admin"` / `"a" \| "b"` |
| `z.null()` / `z.undefined()` | |
| `z.unknown()` / `z.any()` | 何でも通す(`unknown` の方が安全) |
| `z.never()` | 何も通さない |
| `z.file()` | `File`(アップロード)。`.max(5_000_000).mime(["image/png"])` |
- `z.number()` は `NaN` と `Infinity` を通さない

## 文字列
```ts
z.string().min(1)            // 空文字を不可(必須の入力)
z.string().max(100)
z.string().length(7)
z.string().trim()            // 前後の空白を取ってから確かめる(値も変わる)
z.string().toLowerCase()
z.string().regex(/^[a-z0-9-]+$/)
z.string().startsWith("sk_") / .endsWith(".png") / .includes("@")
```
### 形式(v4 からは z の直下)
| スキーマ | 確かめる形 |
| --- | --- |
| `z.email()` | メールアドレス |
| `z.url()` | URL(**`javascript:` も通る**)。Web の URL だけなら **`z.httpUrl()`** |
| `z.uuid()` / `z.nanoid()` / `z.cuid2()` / `z.ulid()` | ID の形式 |
| `z.iso.date()` / `z.iso.datetime()` / `z.iso.time()` | `"2026-11-01"` / `"2026-11-01T09:00:00Z"` |
| `z.ipv4()` / `z.ipv6()` / `z.cidrv4()` | IP アドレス |
| `z.jwt()` / `z.base64()` / `z.hex()` | |
| `z.templateLiteral(["user_", z.number()])` | `` `user_${number}` `` |
- 形式のスキーマも文字列なので、`.min()` などをつなげられる(`z.email().max(255)`)

## 数値
```ts
z.number().min(0)          // >= 0(.nonnegative() と同じ)
z.number().positive()      // > 0
z.number().max(100)
z.number().multipleOf(5)
z.int().min(1)             // 1 以上の整数
```

## 選択肢(enum)
```ts
const Role = z.enum(["admin", "member", "guest"]);
type Role = z.infer<typeof Role>;    // "admin" | "member" | "guest"
Role.options;                        // ["admin", "member", "guest"](select の選択肢に)
Role.exclude(["guest"]);             // admin | member
z.enum(MyTsEnum);                    // TypeScript の enum や as const のオブジェクトからも
```

## 省略できる・null を許す
| 書き方 | 型 | 意味 |
| --- | --- | --- |
| `.optional()` | `T \| undefined` | 項目がない・`undefined` を許す |
| `.nullable()` | `T \| null` | `null` を許す |
| `.nullish()` | `T \| null \| undefined` | 両方 |
| `.default(値)` | `T`(出力) | `undefined` なら値を入れる |
| `z.exactOptional(T)` | `key?: T` | 項目がないのはよいが、**`undefined` を明示するのは不可** |

## オブジェクト
```ts
const User = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  email: z.email(),
  profile: z.object({ bio: z.string().max(200).optional() }),   // 入れ子
});
```
| 種類 | 知らない項目があると |
| --- | --- |
| `z.object` | **黙って取り除く**(既定) |
| `z.strictObject` | エラー(打ち間違いや余計なデータを拒否したいとき) |
| `z.looseObject` | そのまま残す |

### 組み立て直す
```ts
const CreateUser = User.omit({ id: true });              // id を除く(作成時の入力)
const UpdateUser = CreateUser.partial();                 // 全部省略可(更新時の入力)
const UserName   = User.pick({ name: true });            // name だけ
const Admin      = User.extend({ role: z.literal("admin") });  // 項目を足す
const WithAudit  = User.extend(AuditFields.shape);       // 別のスキーマを合わせる(v3 の merge)
const Required   = UpdateUser.required();                // 全部必須に戻す
User.shape.email;                                        // 個別の項目のスキーマ
User.keyof();                                            // z.enum(["id", "name", ...])
z.deepPartial(User);                                     // 入れ子まで全部省略可(4.6)
```
- **1つの元のスキーマから「作成用」「更新用」「表示用」を作る**と、項目を足したときに漏れない

## 配列・タプル・レコード
```ts
z.array(z.string())                 // string[]
z.array(z.string()).min(1).max(10)  // 1〜10 個
z.tuple([z.string(), z.number()])   // [string, number]
z.record(z.string(), z.number())    // { [key: string]: number }
z.record(z.enum(["a", "b"]), z.number())         // a と b の両方が必須
z.partialRecord(z.enum(["a", "b"]), z.number())  // どちらかだけでもよい
z.map(z.string(), z.number()) / z.set(z.string())
```
- `z.record` に enum のキーを渡すと**全部のキーが必須**になる(よくはまる)

## union(どれか)
```ts
z.union([z.string(), z.number()])   // string | number
z.string().or(z.number())           // 同じ

// 種類を表す項目があるなら discriminatedUnion(速く、エラーも分かりやすい)
const Event = z.discriminatedUnion("type", [
  z.object({ type: z.literal("click"), x: z.number(), y: z.number() }),
  z.object({ type: z.literal("keypress"), key: z.string() }),
]);
type Event = z.infer<typeof Event>;
// { type: "click"; x: number; y: number } | { type: "keypress"; key: string }

z.xor([A, B])   // ちょうど1つだけに当てはまること(両方に当てはまるとエラー)
```
- API のレスポンスで `{ ok: true, data } | { ok: false, error }` のような形はこれで書く → [[TypeScript_03_型の組み立て(ユニオン・リテラル・interface・type)]]
- `z.intersection(A, B)` もあるが、オブジェクト同士なら `A.extend(B.shape)` の方が扱いやすい

## 再帰(木構造)
```ts
const Category = z.object({
  name: z.string(),
  get children() {             // getter にすると、自分自身を参照できる
    return z.array(Category);
  },
});
type Category = z.infer<typeof Category>;   // 型も自動で再帰になる
```

## 型を区別する(brand)
```ts
const UserId = z.string().brand<"UserId">();
type UserId = z.infer<typeof UserId>;   // string & { [z.$brand]: "UserId" }

function getUser(id: UserId) { /* ... */ }
getUser("u1");                    // ❌ 型エラー(ただの string は渡せない)
getUser(UserId.parse("u1"));      // ✅ 確かめたものだけ渡せる
```
→ [[DDD_03_戦術的設計①(エンティティ・値オブジェクト・ドメインサービス)]](値オブジェクトの代わりに)

## 関連
- 前: [[Zod_01_基本(スキーマ・parse・型推論)]] / 次: [[Zod_03_変換と検証のカスタマイズ(refine・transform・coerce・codec)]]
- 公式: https://zod.dev/api
