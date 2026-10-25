---
title: "TanStack Start 06 認証・DB・デプロイ・本番チェック"
modified: 2026-09-29
---

## 認証
### 基本の分担(公式)
- **サーバー(安全)**: セッションの保存と検証、資格情報の確認、DB操作、トークン発行、保護された API
- **ブラウザ(公開)**: ログイン状態の表示、ルートのガード(`beforeLoad`)、ログイン画面、リダイレクト
- セッションは **HttpOnly Cookie が推奨**(JS から読めない、`sameSite` で CSRF 対策)

### 選択肢
- **サービス**: Clerk、WorkOS、Supabase Auth など(公式サンプルあり: `start-clerk-basic` `start-workos` `start-supabase-basic`)
- **ライブラリ**: Better Auth、Auth.js(`start-basic-authjs`)
- 自前実装の例: `start-basic-auth`

### 実装パターン
1. ログイン処理は Server Function(POST)で、Cookie にセッションを保存
2. `authMiddleware` で全ての非公開 Server Function を保護([[TanStack Start_04_ミドルウェア・Server Routes・環境変数]])
3. `_authenticated.tsx` の `beforeLoad` で画面をガード(**これは UI のためだけ**)
4. データを返す側で必ず所有者チェック

## データベース
- **どの DB でも使える**: Server Function か Server Route の中から DB クライアントを呼ぶだけ
```ts
// users.server.ts
import { db } from '~/db'
export async function findUserById(id: string) { return db.query.users.findFirst({ where: eq(users.id, id) }) }
```
- 公式推奨パートナー: **Neon**(サーバーレス PostgreSQL、ブランチ機能)、**Convex**(リアルタイムDB)。Prisma 等の ORM、Cloudflare D1 も可
- 接続文字列は環境変数から、handler の中で読む

## デプロイ
| 先 | ポイント |
| --- | --- |
| **Cloudflare Workers**(公式パートナー) | `@cloudflare/vite-plugin` を使う(下記) |
| **Netlify**(公式パートナー) | 公式プラグイン |
| **Railway**(公式パートナー) | Node サーバー |
| Vercel / Nitro | Nitro 経由など |
| Node.js / Docker / Bun | `npm run build` → サーバー起動 |

### Cloudflare Workers の手順(公式)
```bash
npm add -D @cloudflare/vite-plugin wrangler
```
```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import viteReact from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [cloudflare({ viteEnvironment: { name: 'ssr' } }), tanstackStart(), viteReact()],
})
```
```jsonc
// wrangler.jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "tanstack-start-app",
  "compatibility_date": "2025-09-02",
  "compatibility_flags": ["nodejs_compat"],
  "main": "@tanstack/react-start/server-entry"
}
```
```json
// package.json
"scripts": {
  "dev": "vite dev",
  "build": "vite build && tsc --noEmit",
  "preview": "vite preview",
  "deploy": "npm run build && wrangler deploy"
}
```
→ D1・R2・KV などのバインディングも使える([[Cloudflare]])

## 本番チェックリスト(公式 Production Checklist の要約)
開発サーバーで動いても本番の実行環境・CDN は保証されない。**本番ビルドと公開URLの両方で確認**。

### 秘密情報とサーバー境界
- [ ] 必須の環境変数を実行時にチェック(無ければ明確に失敗)
- [ ] ダミーの秘密値でビルドし、クライアントの出力・公開ソースマップ・レスポンスに含まれないか検索

### 認可と更新
- [ ] 非公開の読み書きを、ログアウト状態と別アカウントで**エンドポイントに直接**試し、拒否されるか(`beforeLoad` のリダイレクトは認可ではない)
- [ ] セッション期限切れ・ログアウト後に古いデータが残らないか、Cookie の HTTPS フラグ
- [ ] 不正な入力、別オリジンからの書き込みが拒否されるか

### キャッシュ分離と描画
- [ ] 同じ非公開 URL を2アカウントで同時に取得し、互いのデータが混ざらないか(CDN 経由でも)
- [ ] 個人向けレスポンスは `Cache-Control: no-store`(または確実な分離)
- [ ] 直接アクセスとページ遷移、戻る/進む、リロードで表示が一致するか

### HTTP と検索エンジン
- [ ] 404 は本当に 404、リダイレクトは意図通り、エラーが成功を装っていないか
- [ ] JS 実行前の HTML にタイトル・説明・canonical・OG
- [ ] robots.txt・サイトマップ、誤った `noindex` がないか

### アセット・ログ・デプロイ
- [ ] 遅い回線・狭い画面でネットワークを確認(画像サイズ、フォント、外部スクリプト)
- [ ] わざとエラーを起こし、ログ/エラー監視に届くか(秘密が含まれないか)
- [ ] 本番の起動方法でディープリンク・静的ファイル・Server Function・Server Route を確認、ロールバック手順を練習

## Next.js と TanStack Start、どちらを選ぶ?(公式比較より)
- **Next.js**: RSC を中心に作りたい、next/image・next/font・metadata を使いたい、情報量と AI の得意さを重視、既存の Next.js アプリがある
- **TanStack Start**: URL の状態(検索条件)を型安全に扱いたい、明示的な loader と RPC が好み、ホスティング先を自由に選びたい
- 公式の助言: **代表的な1ルートを作ってみて判断**(実データ取得・search params 検証・更新・未認可アクセス・デプロイまで)。ルーティングの好みだけで健全なアプリを書き直さない
- 初学者はまず [[Next.js]] で基礎を固め、型安全性に惹かれたら Start、が無難

## 関連
- 前: [[TanStack Start_05_レンダリング戦略・SEO・TanStack Query]] / 目次: [[TanStack Start]]
- 公式: https://tanstack.com/start/latest/docs/framework/react/guide/authentication-overview , https://tanstack.com/start/latest/docs/framework/react/guide/hosting , https://tanstack.com/start/latest/docs/framework/react/guide/production-checklist , https://tanstack.com/start/latest/docs/framework/react/start-vs-nextjs
