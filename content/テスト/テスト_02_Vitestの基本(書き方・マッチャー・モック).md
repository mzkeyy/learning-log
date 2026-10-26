---
title: "テスト 02 Vitest の基本(書き方・マッチャー・モック)"
modified: 2026-10-26
---

## Vitest とは
- [[Vite]] の仕組みで動くテストツール。TypeScript・ESM がそのまま動き、**速い**
- 書き方は Jest とほぼ同じ(`describe` / `it` / `expect` / モック)
- Vite のプロジェクトなら `vite.config.ts` の設定(エイリアス・プラグイン)をそのまま使える
- **v5(2026年10月時点)**: Node.js 22.12 以上・Vite 6.4 以上が必要。`vite` は自分のプロジェクトに入れる(peer dependency)

## 導入
```bash
npm install -D vitest vite
```
```jsonc
// package.json
"scripts": {
  "test": "vitest",          // 監視モード
  "test:run": "vitest run",  // 1回だけ(CI)
  "coverage": "vitest run --coverage"
}
```
```ts
// vitest.config.ts(必要なときだけ。Vite のプロジェクトなら vite.config.ts の test でもよい)
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',           // DOM が要るなら jsdom / happy-dom、または Browser Mode(→ 04)
    setupFiles: ['./test/setup.ts'],
  },
})
```
- テストファイルは `*.test.ts`(または `*.spec.ts`)。対象のファイルの隣に置くのが一般的
- `globals: true` にすると `describe` などを import せずに使える(Jest からの移行向け)

## 書き方
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { Cart } from './cart'

describe('Cart', () => {
  let cart: Cart
  beforeEach(() => { cart = new Cart() })   // 各テストの前に毎回作り直す

  it('空のカートの合計は 0', () => {
    expect(cart.total()).toBe(0)
  })

  it('同じ商品を追加すると数量が増える', () => {
    cart.add({ id: 'p1', price: 500 })
    cart.add({ id: 'p1', price: 500 })
    expect(cart.items()).toEqual([{ id: 'p1', price: 500, qty: 2 }])
  })

  it.todo('割引クーポンを適用できる')       // あとで書く
})
```
| 関数 | 用途 |
| --- | --- |
| `describe` | テストのまとまり |
| `it` / `test` | 1つのテスト |
| `beforeEach` / `afterEach` | 各テストの前後 |
| `beforeAll` / `afterAll` | まとまりの最初と最後に1回 |
| `it.only` / `it.skip` | そのテストだけ / 飛ばす(**コミットしない**) |
| `it.each` | 同じテストを入力を変えて繰り返す |

### 表で書く(`it.each`)
```ts
it.each([
  { input: 999, expected: 1098 },
  { input: 1000, expected: 1100 },
  { input: 0, expected: 0 },
])('税込み価格: $input 円 → $expected 円', ({ input, expected }) => {
  expect(withTax(input)).toBe(expected)
})
```

## よく使うマッチャー
| マッチャー | 意味 |
| --- | --- |
| `toBe(x)` | 同じ値(`===`)。数値・文字列・真偽値 |
| `toEqual(obj)` | 中身が同じ(オブジェクト・配列) |
| `toStrictEqual(obj)` | `undefined` のプロパティや型まで厳密に |
| `toMatchObject(obj)` | 一部のプロパティが一致 |
| `toContain(x)` / `toHaveLength(n)` | 配列・文字列 |
| `toBeTruthy()` / `toBeNull()` / `toBeUndefined()` | 真偽・null |
| `toBeCloseTo(0.3)` | 小数の比較(誤差を許す) |
| `toThrow('メッセージ')` | 例外が出る |
| `expect.any(String)` / `expect.stringContaining('a')` | 部分一致の部品 |
| `toMatchSnapshot()` / `toMatchInlineSnapshot()` | 前回の出力と比較(スナップショット) |
- スナップショットは便利だが、**中身を確認せずに更新しがち**。小さいものや、変わったら気づきたい出力にだけ使う

## 非同期
```ts
it('ユーザーを取得できる', async () => {
  const user = await fetchUser('u_1')
  expect(user.name).toBe('Taro')
})

it('存在しないと例外', async () => {
  await expect(fetchUser('nope')).rejects.toThrow('not found')   // ★ await を忘れない
})
```
- v5 では**待っていない非同期のアサーションはテスト失敗**になる(`await` 忘れに気づける)

## モック
### 関数のモック
```ts
import { vi } from 'vitest'

const send = vi.fn().mockResolvedValue({ ok: true })
await notifyUser('u_1', send)

expect(send).toHaveBeenCalledTimes(1)
expect(send).toHaveBeenCalledWith(expect.objectContaining({ to: 'u_1' }))
```
### 既存の関数を見張る・差し替える
```ts
const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
// ...
expect(spy).toHaveBeenCalled()
spy.mockRestore()
```
### モジュールごと差し替える
```ts
vi.mock(import('./mailer'), () => ({
  sendMail: vi.fn().mockResolvedValue({ id: 'm_1' }),
}))
```
- `vi.mock` は**ファイルの先頭に巻き上げられる**(v5 では最上位に書く必要がある)
- v5 では `clearMocks` が既定で有効: 各テストの前に呼び出し履歴が消える(実装はそのまま)

### 時刻
```ts
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-26T09:00:00+09:00')) })
afterEach(() => { vi.useRealTimers() })

it('24時間後に期限切れ', () => {
  const token = issueToken()
  vi.advanceTimersByTime(24 * 60 * 60 * 1000)
  expect(token.isExpired()).toBe(true)
})
```

### モックしすぎに注意
- モックだらけのテストは「モックが正しく呼ばれたか」しか確かめておらず、**本物とつないだら壊れる**ことがある
- 外部 API・時刻・乱数・メール送信など**遅い・不安定・お金がかかるもの**だけ置き換える。自分のコード同士はなるべく本物で
- HTTP 通信の置き換えは MSW が便利 → [[テスト_03_APIとDBのテスト(Hono・MSW・Workers)]]

## カバレッジ
```bash
npm install -D @vitest/coverage-v8
npx vitest run --coverage
```
- `coverage/` に HTML のレポートができる。テストされていない分岐を探すのに使う

## 便利な機能
| 機能 | 内容 |
| --- | --- |
| `vitest --ui` | ブラウザでテスト結果を見る画面 |
| `vitest related src/cart.ts` | 変更したファイルに関係するテストだけ |
| `-t "名前"` | 名前でテストを絞る |
| projects | 1つの設定で、Node 用・ブラウザ用など複数の設定を同時に回す(モノレポにも) |
| 型のテスト | `expectTypeOf` で型が期待どおりか確かめる → [[TypeScript]] |
| VS Code 拡張 | エディタから1つずつ実行・デバッグ |

## Jest から移るとき
- `jest.fn()` → `vi.fn()`、`jest.mock()` → `vi.mock()`
- 既定では `describe` などを import する(`globals: true` で Jest と同じに)
- ESM・TypeScript の設定(babel・ts-jest)が要らなくなる

## 関連
- 前: [[テスト_01_考え方(種類・何をテストするか)]] / 次: [[テスト_03_APIとDBのテスト(Hono・MSW・Workers)]]
- [[Vite]] / [[TypeScript]]
- 公式: https://vitest.dev/guide/ , https://vitest.dev/api/expect , https://vitest.dev/guide/mocking , https://vitest.dev/guide/migration
