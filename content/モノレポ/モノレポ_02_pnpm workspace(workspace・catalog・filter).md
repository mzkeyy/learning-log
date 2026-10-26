---
title: "モノレポ 02 pnpm workspace(workspace・catalog・filter)"
modified: 2026-10-26
---

## pnpm とは
- npm と同じ使い方ができるパッケージマネージャー
- パッケージを**1か所の保存場所(ストア)に置いてリンクする**ので、インストールが速く、ディスクを節約できる
- `node_modules` が厳密(`package.json` に書いていないパッケージは使えない)なので、**依存の書き忘れ**に気づける
- **2026年10月時点**: pnpm 12 が最新(Rust で書き直された版。コマンド・設定・lockfile は 11 と同じ)。Node.js 22 以上が必要

```bash
corepack enable && corepack use pnpm@latest   # または npm i -g pnpm
pnpm install
pnpm add zod                # 依存を追加
pnpm add -D vitest          # 開発用(pnpm 11 から -d でも可)
pnpm run build
pnpm dlx create-vite        # npx の代わり
```
| npm | pnpm |
| --- | --- |
| `npm install` | `pnpm install` |
| `npm install zod` | `pnpm add zod` |
| `npm run dev` | `pnpm dev`(run を省略できる) |
| `npx` | `pnpm dlx` / `pnpm exec` |
| `npm ci` | `pnpm install --frozen-lockfile` |

## workspace の設定
```yaml
# pnpm-workspace.yaml
packages:
  - apps/*
  - packages/*

catalog:                         # 依存のバージョンを1か所で決める
  react: ^19.3.0
  react-dom: ^19.3.0
  zod: ^4.6.0
  typescript: ^7.0.0
  hono: ^4.13.0

allowBuilds:                     # インストール時にスクリプトを実行してよいパッケージだけ
  esbuild: true
  sharp: true

minimumReleaseAge: 1440          # 公開から1日経っていない版は入れない(既定)
```
```jsonc
// apps/web/package.json
{
  "name": "@acme/web",
  "private": true,
  "dependencies": {
    "@acme/ui": "workspace:*",     // ★ 同じリポジトリの内部パッケージ
    "@acme/shared": "workspace:*",
    "react": "catalog:",           // ★ catalog のバージョンを使う
    "zod": "catalog:"
  }
}
```
- `workspace:*` で、npm からではなく**リポジトリ内のフォルダ**をリンクする
- **catalog** で、全パッケージの React・Zod・Hono などのバージョンを揃える(RPC で型を共有するときに大事 → [[Hono_04_バリデーションとRPC(Zod・hc)]])
- pnpm 固有の設定は `pnpm-workspace.yaml` に書く(pnpm 11 から `.npmrc` はレジストリと認証だけ)

## 供給網(サプライチェーン)攻撃への備え
| 設定 | 内容 |
| --- | --- |
| 依存のスクリプトを既定で実行しない | 乗っ取られたパッケージの `postinstall` で悪意のあるコードが動くのを防ぐ。必要なものだけ `allowBuilds` で許可(`pnpm approve-builds` で対話的に) |
| `minimumReleaseAge` | 公開されたばかりの版を入れない(既定 1日)。悪意のある版は多くの場合すぐ見つかって消される |
| `blockExoticSubdeps` | 依存の依存が Git や URL を直接指すのを禁止(既定で有効) |
| lockfile をコミット | 全員・CI で同じ版を入れる |
| `pnpm audit` | 既知の脆弱性を確認 |
→ [[Webセキュリティ対策]]

## filter: 一部のパッケージだけで実行
```bash
pnpm --filter @acme/web dev          # web だけ起動(-F でも可)
pnpm -F @acme/api add drizzle-orm    # api に依存を追加
pnpm -F "./packages/**" test         # packages の下だけ
pnpm -F "@acme/web..." build         # web と、web が依存しているもの全部
pnpm -F "...@acme/shared" test       # shared と、shared を使っているもの全部
pnpm -F "[origin/main]" test         # main から変更があったパッケージだけ
pnpm -r run lint                     # 全パッケージで(recursive)
```

## pnpm だけでタスクの順番を決める
小さなモノレポなら Turborepo なしでも、pnpm の機能で依存順に実行できる。
```yaml
# pnpm-workspace.yaml
tasks:
  build:
    dependsOn: ["^build"]     # 依存しているパッケージの build を先に
  test:
    dependsOn: ["build"]      # 同じパッケージの build の後
```
```bash
pnpm -r run test
```
- キャッシュ(変更がなければ飛ばす)や、リモートでのキャッシュ共有が要るなら Turborepo → [[モノレポ_03_Turborepo(タスク・キャッシュ・CI)]]

## ルートの package.json
```jsonc
{
  "name": "my-product",
  "private": true,
  "devEngines": {                        // 使う pnpm のバージョンを固定(packageManager フィールドでも可)
    "packageManager": { "name": "pnpm", "version": "^12.15.0" }
  },
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "check": "biome check ."
  },
  "devDependencies": {
    "turbo": "^2.11.0",
    "@biomejs/biome": "^2.6.0",
    "typescript": "catalog:"
  }
}
```
- ルートには**全体で使う道具だけ**を入れる。アプリの依存は各アプリの `package.json` に
- `devEngines.packageManager`(または `packageManager`)で、全員が同じ pnpm を使うようにする。pnpm 11 からは `pnpm init` も `devEngines` で書く

## Docker・CI での注意
- `pnpm install --frozen-lockfile` で lockfile と違えば失敗させる
- Docker では `pnpm fetch` で依存だけ先に取得するとキャッシュが効く。`turbo prune` で必要なパッケージだけを取り出す方法も → [[Docker_02_Dockerfile(マルチステージ・キャッシュ・安全)]]
- CI では pnpm のストアをキャッシュする(`actions/setup-node` の `cache: pnpm`)

## 関連
- 前: [[モノレポ_01_考え方(向き不向き・構成例)]] / 次: [[モノレポ_03_Turborepo(タスク・キャッシュ・CI)]]
- [[Docker]] / [[Webセキュリティ対策]]
- 公式: https://pnpm.io/workspaces , https://pnpm.io/catalogs , https://pnpm.io/filtering , https://pnpm.io/supply-chain-security , https://pnpm.io/workspace-task-orchestration
