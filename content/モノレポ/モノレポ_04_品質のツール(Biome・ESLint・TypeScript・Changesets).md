---
title: "モノレポ 04 品質のツール(Biome・ESLint・TypeScript・Changesets)"
modified: 2026-10-26
---

## lint と format
| 役割 | 意味 | 道具 |
| --- | --- | --- |
| **format** | 見た目(インデント・改行・クォート)を自動で揃える | Biome / Prettier |
| **lint** | バグになりやすい書き方を見つける(未使用の変数、`await` 忘れ、フックのルール違反) | Biome / ESLint |
- 見た目の議論をレビューでしない。**保存時・コミット前・CI で自動で揃える**

## Biome
lint と format を**1つの道具で**。Rust 製でとても速い。設定ファイルも1つ。2026年10月時点で 2.6。
```bash
pnpm add -D -w @biomejs/biome
pnpm biome init                      # biome.json を作る
pnpm biome check --write .           # lint + format + import の並べ替えをまとめて修正
pnpm biome ci .                      # CI 用(修正せず、問題があれば失敗)
```
```jsonc
// biome.json
{
  "$schema": "https://biomejs.dev/schemas/2.6.3/schema.json",
  "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true },   // .gitignore を尊重
  "formatter": { "indentStyle": "space", "indentWidth": 2, "lineWidth": 100 },
  "javascript": { "formatter": { "quoteStyle": "single", "semicolons": "asNeeded" } },
  "linter": {
    "rules": {
      "recommended": true,
      "suspicious": { "noExplicitAny": "warn" }
    }
  },
  "assist": { "actions": { "source": { "organizeImports": "on" } } }
}
```
- モノレポでは**ルートに1つ**置けば全体に効く。パッケージごとの上書きもできる
- v2 から、型情報を使ったルール(Promise の待ち忘れなど)・GritQL のプラグインにも対応
- ESLint・Prettier から移る: `biome migrate eslint --write` / `biome migrate prettier --write`
- エディタの拡張(VS Code など)で保存時に整形

### ESLint を使う場面
- Biome にないルール・プラグインが必要なとき(例: 一部のフレームワーク専用のルール、細かいアクセシビリティのルール)
- ESLint 10 は**フラット設定(`eslint.config.js`)のみ**。TypeScript は `typescript-eslint`
- 併用するなら「format は Biome、lint の一部だけ ESLint」のように**役割を分けて重複させない**

## TypeScript の設定を共有する
```jsonc
// packages/config/tsconfig.base.json
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true
  }
}
```
```jsonc
// apps/web/tsconfig.json
{
  "extends": "@acme/config/tsconfig.base.json",
  "compilerOptions": { "jsx": "react-jsx" },
  "include": ["src"]
}
```
- 型チェックは各パッケージで `tsc --noEmit` を Turborepo のタスク(`typecheck`)として回す
- **TypeScript 7**(2026年7月)は Go で書き直されて**約10倍速い**。大きなモノレポほど効く → [[TypeScript_10_tsconfig・strict・実行環境・バージョン]]
- パッケージの間で型の参照が重いときは、プロジェクト参照(`references`)や、ビルドした型定義を使う

## コミット前のチェック
```bash
pnpm add -D -w lefthook     # Git のフックを管理(husky + lint-staged でも可)
```
```yaml
# lefthook.yml
pre-commit:
  commands:
    biome:
      glob: "*.{js,ts,jsx,tsx,json}"
      run: pnpm biome check --write --no-errors-on-unmatched {staged_files}
      stage_fixed: true
```
- 変更したファイルだけ速くチェック。**最終的な保証は CI**(フックは飛ばせるので)

## バージョンと変更履歴(Changesets)
npm に公開するパッケージがある、またはパッケージごとにバージョンを管理したいときに使う。
```bash
pnpm add -D -w @changesets/cli && pnpm changeset init
pnpm changeset            # 変更の説明と、どのパッケージを major / minor / patch 上げるか記録
pnpm changeset version    # バージョンを上げて CHANGELOG を更新
pnpm changeset publish    # npm に公開
```
- PR ごとに「何が変わったか」のファイルを追加し、リリースのときにまとめて反映
- アプリだけのモノレポ(公開しない)なら不要なことも多い

## AI と一緒に使うとき
- ルートの CLAUDE.md / AGENTS.md に、**構成(apps と packages の役割)、使うコマンド(`pnpm -F`・`turbo run`)、依存の方向のルール**を書く。パッケージごとに追加の説明を置くこともできる → [[04_CLAUDE.mdとメモリ]] / [[Codex_03_AGENTS.mdとconfig.toml]]
- AI が `npm install` を使ったり、ルートに依存を足したりしないよう「pnpm を使う」「依存は該当パッケージに」と明記する
- Biome・型チェック・テストを AI に回させて、通るまで直させる

## チェックリスト
- [ ] `pnpm-workspace.yaml` と catalog で主要な依存のバージョンを揃えている
- [ ] 内部パッケージは `workspace:*`、依存の方向は一方向
- [ ] `allowBuilds` で許可したもの以外の依存のスクリプトは動かない
- [ ] `turbo.json` の `outputs` と `env` が正しい(キャッシュの事故がない)
- [ ] CI は `--affected` とリモートキャッシュで速い
- [ ] lint / format / 型チェック / テストが CI で回る
- [ ] tsconfig・lint の設定が共有されている

## 関連
- 前: [[モノレポ_03_Turborepo(タスク・キャッシュ・CI)]] / 目次: [[モノレポ]]
- [[TypeScript]] / [[テスト]] / [[Cicdパイプライン]]
- 公式: https://biomejs.dev/guides/getting-started/ , https://biomejs.dev/reference/configuration/ , https://eslint.org/docs/latest/use/configure/ , https://typescript-eslint.io/ , https://github.com/changesets/changesets , https://lefthook.dev/
