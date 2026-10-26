---
title: "テスト 06 実務(CI・不安定なテスト・AI とテスト)"
modified: 2026-10-26
---

## CI で毎回回す
push・PR のたびに自動でテストを回し、**落ちたらマージしない**。→ [[Cicdパイプライン]]
```yaml
# .github/workflows/test.yml
name: test
on: [push, pull_request]
jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 24, cache: npm }
      - run: npm ci
      - run: npx tsc --noEmit          # 型チェック
      - run: npm run lint
      - run: npx vitest run --coverage

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 24, cache: npm }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test
      - uses: actions/upload-artifact@v4
        if: failure()                  # 失敗したときだけレポートとトレースを残す
        with: { name: playwright-report, path: playwright-report }
```
- **速いもの(型・lint・単体)を先に**、遅い E2E は後に。早く失敗を知らせる
- PR のブランチ保護で「テストが通らないとマージできない」にする
- 時間がかかってきたら: 変更に関係するテストだけ回す、並列化(`--shard`)、キャッシュ

## 不安定なテスト(flaky テスト)
同じコードなのに、通ったり落ちたりするテスト。**放置すると誰もテストを信じなくなる**。
| よくある原因 | 対策 |
| --- | --- |
| 固定時間の待ち、表示前に操作 | 自動で待つアサーション(`expect.element` / Playwright の `expect(locator)`) |
| テスト同士が同じデータを共有 | テストごとにデータを作る・片付ける |
| 実行順に依存 | 各テストを単独で実行しても通るか確認 |
| 現在時刻・タイムゾーン・乱数 | 時刻を固定(`vi.setSystemTime` / `page.clock`)、TZ を固定 |
| 外部サービスへの通信 | モック(MSW・`page.route`) |
| `await` 忘れ | lint のルール(`no-floating-promises`) |
- 再試行(retries)は応急処置。**原因を直す**
- 不安定なテストを見つけたら記録して、優先して直す。消したりスキップしたりして「通ったことにしない」

## テストのデータと環境
- テスト用の環境変数は `.env.test` などで分ける。本番の DB・API キーをテストで使わない
- DB を使うテストは CI でもコンテナで同じ DB を立てる(GitHub Actions の `services`、Testcontainers)→ [[Docker]]
- E2E はステージング環境に対して回す方法と、CI の中でアプリを起動して回す方法がある

## AI とテスト
### AI にテストを書かせる
- 「この関数のテストを書いて」だけでなく、**確かめたい仕様・境界値・エラーケース**を伝える
- AI は**実装に合わせたテスト**(今の動きをなぞるだけのテスト)を書きがち。仕様から書かせる
- 生成されたテストが**本当に失敗できるか**を確認する: 実装をわざと壊して落ちるか(ミューテーションテストの考え方)
- モックだらけのテストになっていないか見る

### テストを AI のガードレールにする
- 「テストを先に書く → 失敗を確認 → 実装 → テストが通るまで直す」の流れで頼むと、AI がゴールを持って作業できる
- CLAUDE.md / AGENTS.md に**テストの実行コマンド**を書いておく(`npm test`、`npx vitest run path`)→ [[04_CLAUDE.mdとメモリ]] / [[Codex_03_AGENTS.mdとconfig.toml]]
- Hooks で「編集のたびに関係するテストを実行」も可能 → [[11_Hooks]]
- **AI がテストを消したり、`skip` にしたり、期待値を実装に合わせて書き換えたりしていないか**、差分を必ず確認する

### AI の機能のテスト
- AI の出力は毎回変わるので、普通のテストは「形(JSON のスキーマ)」「必ず入るべき情報」などに絞る
- 品質は評価(evals)で測る → [[AIアプリ開発_07_評価・コスト・セキュリティ・運用]]

## チェックリスト
- [ ] `npm test` ひとつで全部のテストが動く
- [ ] CI で型チェック・lint・単体・結合テストが毎回動き、落ちたらマージできない
- [ ] 大事な流れ(ログイン・購入など)に E2E がある
- [ ] 認可(他人のデータにアクセスできない)のテストがある
- [ ] 外部 API はテストでモックしている(本物を呼ばない)
- [ ] 不安定なテストを放置していない
- [ ] バグを直したら、再発防止のテストを足している
- [ ] AI が書いた・変えたテストを人が確認している

## 関連
- 前: [[テスト_05_E2Eテスト(Playwright)]] / 目次: [[テスト]]
- [[Cicdパイプライン]] / [[Claude Code]] / [[Codex]]
- 参考: https://docs.github.com/actions , https://playwright.dev/docs/ci , https://vitest.dev/guide/improving-performance
