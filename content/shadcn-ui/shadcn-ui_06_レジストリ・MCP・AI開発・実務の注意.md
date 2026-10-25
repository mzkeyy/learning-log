---
title: "shadcn/ui 06 レジストリ・MCP・AI 開発・実務の注意"
modified: 2026-09-29
---

## レジストリ(自分の部品を配布する仕組み)
shadcn の CLI は公式部品だけでなく、**誰でも作れる「レジストリ」**から部品を追加できる。
- 社内デザインシステムを配布(例: [[デザインシステム|ジョブアンテナUI]] はこの仕組みで配布)
- コミュニティのレジストリ(Directory に登録されたもの)は CLI から直接使える

### 使う側
```json
// components.json
{ "registries": { "@acme": "https://acme.com/r/{name}.json" } }
```
```bash
npx shadcn@latest add @acme/hero
npx shadcn@latest search @acme
npx shadcn@latest view @acme/auth
```
- 認証付きの非公開レジストリも設定可能(トークンは環境変数で)

### 作る側
1. `registry.json` に部品(`registry-item`)を定義(ファイル、依存、CSS 変数など)
2. `npx shadcn@latest build` で JSON を生成
3. 静的ホスティング(Cloudflare など)に置く
- 部品だけでなく、hooks・ページ・テーマ・ブロックも配布できる
- 「Open in v0」連携も可能

## AI との連携(ここが今の shadcn の強み)
### MCP サーバー
AI アシスタントがレジストリを**閲覧・検索・インストール**できる。
```bash
npx shadcn@latest mcp init --client claude    # Claude Code
npx shadcn@latest mcp init --client cursor
npx shadcn@latest mcp init --client vscode
# Codex は ~/.codex/config.toml に手動で追記
```
プロンプト例:
- 「shadcn レジストリの全コンポーネントを見せて」
- 「button・dialog・card を追加して」
- 「shadcn の部品で問い合わせフォームを作って」
- 「acme レジストリの部品でランディングページを作って」

### Skills(Claude Code 等向けの知識パック)
```bash
npx skills add shadcn/ui
```
- 毎回 `shadcn info --json` でプロジェクト設定(フレームワーク、Tailwind のバージョン、エイリアス、土台ライブラリ、アイコン、導入済み部品)を読み取り、**正しい API で最初から書かせる**
- CLI・テーマ・レジストリ作成の知識を含む
- 例: 「メールとパスワードのログインフォームを追加して」「サイドバー・統計カード・データテーブルのダッシュボードを作って」

### v0(Vercel)
v0 で生成した UI を shadcn の部品として取り込める。

## 実務の注意
### 部品の編集ルール
- 見た目の全体変更は**トークン(CSS 変数)で**。部品ファイルを直接いじるのは「このプロジェクト固有のバリエーションを足す時」
- 部品を大きく改造したら、その意図をコメントや DESIGN.md に残す(AI が勝手に戻さないように)
- 同じような部品を増やさない(`Button` の variant を足す方が良い)

### 更新との付き合い方
- 自動更新されないのが前提。セキュリティや挙動の修正は**土台ライブラリ(Base UI / Radix / React Aria)の更新**で入る
- 見た目の最新版を取り込みたい時は `diff` / `view` で差分を見てから手で反映

### AI に指示する時(CLAUDE.md / AGENTS.md に書く例)
```markdown
## UI
- UI 部品は shadcn/ui(components/ui/)を使う。無ければ `npx shadcn@latest add` で追加。自作しない
- 色は globals.css のトークン(bg-primary, text-muted-foreground 等)のみ。カラーコード直書き禁止
- アイコンは lucide-react
- フォームは Field + React Hook Form + Zod。スキーマは lib/schemas.ts に置きサーバーと共有
- 主要ボタン(variant 既定)は1画面1つまで
```

### チェックリスト
- [ ] `components.json` と `globals.css` をコミット
- [ ] トークンでブランドカラー・角丸を設定済み、ダークモードで読めるか確認
- [ ] フォームはラベル・エラー表示・送信中表示・サーバー検証あり
- [ ] アイコンボタンに `aria-label`、Dialog に Title
- [ ] モバイルで Sheet / Drawer / Native Select が使いやすいか

## 関連
- 前: [[shadcn-ui_05_フォーム(Field・React Hook Form・Zod)]] / 目次: [[shadcn-ui]]
- [[Claude Code]] / [[MCP]]
- 公式: https://ui.shadcn.com/docs/registry , https://ui.shadcn.com/docs/mcp , https://ui.shadcn.com/docs/skills
