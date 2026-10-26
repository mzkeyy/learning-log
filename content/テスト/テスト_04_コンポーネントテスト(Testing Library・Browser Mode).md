---
title: "テスト 04 コンポーネントテスト(Testing Library・Browser Mode)"
modified: 2026-10-26
---

## コンポーネントテストとは
画面の部品(React のコンポーネントなど)を1つだけ表示して、**ユーザーと同じように操作して結果を確かめる**テスト。E2E より速く、単体テストより実際の使われ方に近い。

## 基本の考え方(Testing Library)
> テストがソフトウェアの使われ方に近いほど、テストは信頼できる
- 要素は**ユーザーが見て・聞いて探す方法**で探す
- 内部の state や関数ではなく、**表示と操作の結果**を確かめる

### 要素の探し方(優先順)
| 優先 | 探し方 | 例 |
| --- | --- | --- |
| 1 | **役割(role)+ 名前** | `getByRole('button', { name: '保存' })` |
| 2 | ラベル | `getByLabelText('メールアドレス')` |
| 3 | プレースホルダー | `getByPlaceholder('検索')` |
| 4 | 表示テキスト | `getByText('保存しました')` |
| 5 | 画像の代替テキスト | `getByAltText('ロゴ')` |
| 最後 | テスト用 ID | `getByTestId('cart-count')` |
- `getByRole` で探せない = **スクリーンリーダーでも使いにくい**ことが多い。アクセシビリティの確認にもなる → Webパフォーマンスとアクセシビリティ
- CSS のクラス名や DOM の構造で探さない(見た目を変えただけで壊れる)

## 2つのやり方
| | jsdom / happy-dom + Testing Library | **Vitest Browser Mode** |
| --- | --- | --- |
| どこで動く | Node.js の中の「なんちゃって DOM」 | **本物のブラウザ**(Playwright 経由) |
| 速さ | 速い | 少し遅い |
| 正確さ | CSS・レイアウト・一部のブラウザ API は再現されない | 本物と同じ |
| 位置づけ | 従来からの定番 | Vitest が推奨 |

### Vitest Browser Mode(推奨)
```bash
npm install -D @vitest/browser-playwright vitest-browser-react
npx playwright install chromium
```
```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'

export default defineConfig({
  test: {
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
    },
  },
})
```
```tsx
// Counter.test.tsx
import { render } from 'vitest-browser-react'
import { expect, test } from 'vitest'
import { Counter } from './Counter'

test('ボタンを押すと数が増える', async () => {
  const screen = render(<Counter initial={0} />)

  await screen.getByRole('button', { name: '+1' }).click()

  await expect.element(screen.getByText('カウント: 1')).toBeInTheDocument()
})
```
- `expect.element(...)` は**表示されるまで自動で待つ**(非同期の更新に強い)
- Node 用のテストとブラウザ用のテストは **projects** で分けて同時に回せる

### jsdom + Testing Library(従来の方法)
```bash
npm install -D jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom
```
```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

test('フォームを送信すると完了メッセージ', async () => {
  const user = userEvent.setup()
  render(<ContactForm />)

  await user.type(screen.getByLabelText('メールアドレス'), 'taro@example.com')
  await user.click(screen.getByRole('button', { name: '送信' }))

  expect(await screen.findByText('送信しました')).toBeInTheDocument()   // find は待つ
})
```
- 設定の `environment: 'jsdom'`(または `happy-dom`)
- 操作は `fireEvent` より **`userEvent`**(キー入力やフォーカスの移動まで本物に近い)
- `getBy`(すぐ・無ければエラー)/ `queryBy`(無ければ null。「無いこと」の確認に)/ `findBy`(現れるまで待つ)

## 何を確かめるか
- 表示: 渡したデータが出る、空のとき・読み込み中・エラーのときの表示
- 操作: クリック・入力・送信で期待どおりに変わる
- 呼び出し: 「保存」で `onSave` が正しい値で呼ばれる
- アクセシビリティ: ラベルが付いている、キーボードで操作できる
- データ取得するコンポーネントは、**API を MSW で差し替えて**テストする → [[テスト_03_APIとDBのテスト(Hono・MSW・Workers)]]

## 見た目のテスト
- **スクリーンショットの比較**(ビジュアルリグレッション): 前回の画像と比べて、意図しない見た目の変化を見つける。Vitest Browser Mode の `toMatchScreenshot`、Playwright の `toHaveScreenshot`、Storybook + Chromatic など
- フォントや OS で画像が微妙に変わるので、**CI の同じ環境で**撮る
- Storybook でコンポーネントのカタログを作り、そのままテストにする方法もある → [[デザインシステム]]

## Next.js の Server Components
- 非同期の Server Components は、コンポーネント単体のテストツールがまだ十分でない
- 中のロジックは関数に分けて単体テスト、画面全体は E2E で確かめるのが現実的 → [[Next.js_09_デプロイ・テスト・AI開発・実務チェックリスト]]

## 関連
- 前: [[テスト_03_APIとDBのテスト(Hono・MSW・Workers)]] / 次: [[テスト_05_E2Eテスト(Playwright)]]
- [[React]] / [[Next.js]] / [[shadcn-ui]]
- 公式: https://vitest.dev/guide/browser/ , https://vitest.dev/guide/browser/component-testing , https://testing-library.com/docs/queries/about#priority , https://testing-library.com/docs/user-event/intro
