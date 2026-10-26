---
title: "テスト 05 E2E テスト(Playwright)"
modified: 2026-10-26
---

## E2E テストとは
**本物のブラウザでアプリ全体を自動で操作**して、ユーザーの一連の流れが動くか確かめるテスト。画面・API・DB がつながった状態で確認できるが、遅く、不安定になりやすい。
- 対象は**壊れたら困る大事な流れ**に絞る: 新規登録・ログイン・検索・購入・投稿など
- 細かい分岐(入力エラーの種類など)は、速い単体・結合テストで押さえる

## Playwright
- Microsoft 製。Chromium・Firefox・WebKit(Safari 系)を同じコードで動かせる
- **自動で待つ**(要素が表示され、操作できるようになるまで待ってからクリック)ので、`sleep` がほぼ要らない
- テストごとに新しいブラウザの状態(Cookie などが空)で動くので、テスト同士が干渉しない
- 2026年10月時点で 1.64

## 導入
```bash
npm init playwright@latest   # 設定ファイル・サンプル・GitHub Actions の設定まで作ってくれる
```
```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  retries: process.env.CI ? 2 : 0,          // CI でだけ再試行
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',               // 失敗したら記録を残す
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 15'] } },
  ],
  webServer: {                             // テストの前にアプリを起動
    command: 'npm run build && npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

## 書き方
```ts
// e2e/login.spec.ts
import { test, expect } from '@playwright/test'

test('ログインするとダッシュボードが表示される', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('メールアドレス').fill('taro@example.com')
  await page.getByLabel('パスワード').fill('correct-password')
  await page.getByRole('button', { name: 'ログイン' }).click()

  await expect(page).toHaveURL('/dashboard')
  await expect(page.getByRole('heading', { name: 'ダッシュボード' })).toBeVisible()
})

test('パスワードが違うとエラー', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('メールアドレス').fill('taro@example.com')
  await page.getByLabel('パスワード').fill('wrong')
  await page.getByRole('button', { name: 'ログイン' }).click()

  await expect(page.getByRole('alert')).toHaveText('メールアドレスかパスワードが違います')
})
```
### ロケーター(要素の探し方)
| ロケーター | 例 |
| --- | --- |
| `getByRole` | `page.getByRole('link', { name: '料金' })`(**第一候補**) |
| `getByLabel` | フォームの入力欄 |
| `getByText` | 表示テキスト |
| `getByPlaceholder` / `getByAltText` / `getByTitle` | |
| `getByTestId` | `data-testid`(最後の手段) |
| 絞り込み | `page.getByRole('listitem').filter({ hasText: 'りんご' }).getByRole('button', { name: '削除' })` |
- 考え方はコンポーネントテストと同じ(ユーザーの見え方で探す)→ [[テスト_04_コンポーネントテスト(Testing Library・Browser Mode)]]

### 確認(自動で待つアサーション)
| アサーション | 意味 |
| --- | --- |
| `toBeVisible()` / `toBeHidden()` | 見える・見えない |
| `toHaveText()` / `toContainText()` | テキスト |
| `toHaveURL()` / `toHaveTitle()` | URL・タイトル |
| `toHaveValue()` / `toBeChecked()` / `toBeDisabled()` | フォームの状態 |
| `toHaveCount(n)` | 件数 |
| `toHaveScreenshot()` | 見た目の比較 |
- `expect(locator)` 形式は**条件を満たすまで待つ**。`expect(await locator.textContent())` のように値を取り出すと待たないので不安定になる

## ログイン状態を使い回す
毎回ログイン画面を操作すると遅いので、最初に1回ログインして状態を保存する。
```ts
// e2e/auth.setup.ts
import { test as setup } from '@playwright/test'

setup('ログイン', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('メールアドレス').fill(process.env.E2E_USER!)
  await page.getByLabel('パスワード').fill(process.env.E2E_PASSWORD!)
  await page.getByRole('button', { name: 'ログイン' }).click()
  await page.waitForURL('/dashboard')
  await page.context().storageState({ path: 'playwright/.auth/user.json' })  // ★ git に入れない
})
```
- 設定の `projects` で setup を先に動かし、他のテストは `storageState` を読み込む
- テスト用アカウントの情報は環境変数・CI のシークレットに → [[APIキー・シークレット管理]]

## API の差し替え
```ts
await page.route('**/api/recommendations', (route) =>
  route.fulfill({ json: [{ id: 1, title: 'テスト用のおすすめ' }] }),
)
```
- 外部サービス(決済・メール)や不安定な API を差し替えられる
- ただし E2E の価値は「全部つながっていること」なので、差し替えは最小限に

## 便利な道具
| コマンド | 内容 |
| --- | --- |
| `npx playwright test --ui` | テストを一覧・実行・1手ずつ確認できる画面 |
| `npx playwright codegen localhost:3000` | ブラウザを操作すると、そのテストコードを書いてくれる |
| `npx playwright show-report` | HTML のレポート |
| `npx playwright show-trace trace.zip` | **トレース**: 各操作のスクリーンショット・DOM・ネットワーク・コンソールを時系列で見られる |
| `--debug` / `page.pause()` | 1行ずつ止めながら実行 |
- CI で落ちたら、まず**トレースを見る**。手元で再現しなくても原因がわかることが多い

## 不安定にしないコツ
- 固定の待ち時間(`waitForTimeout`)を使わない。自動で待つロケーターとアサーションを使う
- テストごとに**自分専用のデータ**を作る(他のテストが作ったデータに頼らない)
- 日付・乱数・アニメーションに左右されないようにする(時刻の固定 `page.clock`、アニメーションを切る)
- テスト環境の DB を毎回同じ状態から始める
- それでも不安定なテストは → [[テスト_06_実務(CI・不安定なテスト・AIとテスト)]]

## アクセシビリティの自動チェック
```ts
import AxeBuilder from '@axe-core/playwright'

test('トップページにアクセシビリティの重大な問題がない', async ({ page }) => {
  await page.goto('/')
  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations).toEqual([])
})
```
- 自動で見つかるのは一部(コントラスト・ラベル漏れなど)。キーボード操作などは人の確認も必要 → [[Webパフォーマンスとアクセシビリティ]]

## 関連
- 前: [[テスト_04_コンポーネントテスト(Testing Library・Browser Mode)]] / 次: [[テスト_06_実務(CI・不安定なテスト・AIとテスト)]]
- [[認証]] / [[Cicdパイプライン]]
- 公式: https://playwright.dev/docs/intro , https://playwright.dev/docs/locators , https://playwright.dev/docs/auth , https://playwright.dev/docs/trace-viewer , https://playwright.dev/docs/accessibility-testing
