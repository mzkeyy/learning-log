---
title: "モノレポ 03 Turborepo(タスク・キャッシュ・CI)"
modified: 2026-10-26
---

## Turborepo とは
モノレポの**タスク(build・test・lint・dev)を、依存の順番どおりに並列で実行し、結果をキャッシュする**道具。Vercel が開発。
- 入力(ソース・設定・依存)が変わっていないタスクは、**前回の出力とログを再現して一瞬で終わる**
- キャッシュはチームや CI で共有できる(リモートキャッシュ)
- pnpm・npm・Yarn・Bun の workspace の上で動く

```bash
pnpm dlx create-turbo@latest           # 新しいモノレポを作る
pnpm add -D turbo -w                   # 既存のモノレポに入れる(-w はルートに)
```

## turbo.json
```jsonc
{
  "$schema": "https://turborepo.com/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],               // 依存しているパッケージの build を先に
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"]   // キャッシュする出力
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "lint": {},                              // 依存なし・出力なし(ログだけキャッシュ)
    "typecheck": { "dependsOn": ["^build"] },
    "dev": {
      "cache": false,                        // 開発サーバーはキャッシュしない
      "persistent": true                     // 終わらないタスク
    }
  }
}
```
| 設定 | 意味 |
| --- | --- |
| `dependsOn: ["^build"]` | `^` 付き = **依存しているパッケージの**同名タスクを先に |
| `dependsOn: ["build"]` | `^` なし = **同じパッケージの**別タスクを先に |
| `outputs` | キャッシュから戻すファイル。書き忘れると「キャッシュは当たったのに dist がない」になる |
| `inputs` | キャッシュのキーに使うファイル(既定は git で追跡しているファイル全部) |
| `env` | キャッシュのキーに含める環境変数(`API_URL` で出力が変わるなら書く) |
| `cache: false` / `persistent: true` | dev など |
- 各パッケージの `package.json` の `scripts` に、同じ名前のタスク(`build`・`test`)があるものだけ実行される

## 実行
```bash
turbo run build                    # 全部(依存順・並列)
turbo run dev --filter=@acme/web   # web と、その依存の dev
turbo run test --affected          # main から変更があったパッケージと、それを使うものだけ
turbo run build --dry=json         # 何が実行されるか確認
turbo run build --graph            # 依存のグラフを出力
```
- 2回目に変更なしで実行すると `FULL TURBO`(全部キャッシュ)になる
- **環境変数**: キャッシュのキーに含めていない環境変数でビルドの結果が変わると、古いキャッシュが使われて事故になる。`env` に書く(Strict Mode では書いていない環境変数はタスクから見えない)

## リモートキャッシュ
```bash
turbo login     # Vercel のリモートキャッシュ
turbo link
```
- CI と開発者で同じキャッシュを共有。**誰かが一度ビルドしたものは、他の人・CI では再ビルドしない**
- 自分で用意したキャッシュサーバーも使える(自前ホストの実装がある)
- CI では `TURBO_TOKEN` と `TURBO_TEAM` を環境変数で渡す

## CI の例(GitHub Actions)
```yaml
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }             # --affected のために履歴が必要
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 24, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo run lint typecheck test build --affected
        env:
          TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
          TURBO_TEAM: ${{ vars.TURBO_TEAM }}
```
- 変更されたものだけ + キャッシュで、モノレポでも CI が速い → [[Cicdパイプライン]]

## Docker で必要な部分だけ
```bash
turbo prune @acme/api --docker
# out/json/ … 必要な package.json だけ(依存のインストール用)
# out/full/ … 必要なソースだけ
```
- api のイメージを作るのに、web や ui のコードを含めない。依存のインストールのレイヤーがキャッシュされやすい → [[Docker_02_Dockerfile(マルチステージ・キャッシュ・安全)]]

## Nx との違い
| | Turborepo | Nx |
| --- | --- | --- |
| 考え方 | 既存の `package.json` の scripts を速く回す | プラグインでコード生成・依存解析まで |
| 設定 | `turbo.json` だけ | 多機能・設定も多い |
| 向く規模 | 小〜中規模 | 大規模・多言語 |

## 関連
- 前: [[モノレポ_02_pnpm workspace(workspace・catalog・filter)]] / 次: [[モノレポ_04_品質のツール(Biome・ESLint・TypeScript・Changesets)]]
- [[Cicdパイプライン]] / [[Docker]]
- 公式: https://turborepo.com/docs/crafting-your-repository/configuring-tasks , https://turborepo.com/docs/crafting-your-repository/caching , https://turborepo.com/docs/core-concepts/remote-caching , https://turborepo.com/docs/reference/run#--affected
