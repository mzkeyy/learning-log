---
title: "Next.js 08 認証とセキュリティ"
modified: 2026-09-29
---

## 環境変数
```bash
# .env.local(git に入れない)
DATABASE_URL=postgres://...
API_SECRET=xxxx
NEXT_PUBLIC_ANALYTICS_ID=abc123   # ← ブラウザにも埋め込まれる
```
| ファイル | 用途 |
| --- | --- |
| `.env` | 全環境の既定 |
| `.env.local` | 自分のPCだけ(最優先・git除外) |
| `.env.development` / `.env.production` | 環境別 |
- **`NEXT_PUBLIC_` が付いた変数はビルド時に JS に埋め込まれ、誰でも見られる** → 秘密情報に絶対付けない
- 付いていない変数はサーバーでだけ読める(`process.env.API_SECRET`)
- `$VAR` で他の変数を参照可能
- 本番の値はデプロイ先の管理画面で設定([[Cloudflare]] なら `wrangler secret`)

## 認証の3要素
1. **認証(Authentication)**: 本人確認(ログイン)
2. **セッション管理**: ログイン状態をリクエストをまたいで保持
3. **認可(Authorization)**: その人が何にアクセスしてよいか

### 実務の結論: 自作しない
パスワードのハッシュ化・セッション・OAuth は落とし穴だらけ。**認証ライブラリ/サービスを使う**。公式が挙げる例: Auth0 / Better Auth / Clerk / Descope / Kinde / Logto / NextAuth.js(Auth.js) / Ory / Stack Auth / Supabase / Stytch / WorkOS。セッション管理だけなら Iron Session / Jose。

### セッション Cookie の推奨設定(自作する場合も理解しておく)
- `HttpOnly`(JSから読めない)、`Secure`(HTTPSのみ)、`SameSite`(他サイトからの送信制限)、有効期限、`Path`
- ステートレス(暗号化した情報を Cookie に)か、DB セッション(Cookie には ID だけ)

## 認可は「データアクセス層(DAL)」に集約する ★公式推奨
画面ごとにバラバラにチェックすると漏れる → **データを取る関数の中で必ずチェック**。
```ts
// app/lib/dal.ts
import 'server-only'
import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { decrypt } from '@/app/lib/session'

export const verifySession = cache(async () => {
  const cookie = (await cookies()).get('session')?.value
  const session = await decrypt(cookie)
  if (!session?.userId) redirect('/login')
  return { isAuth: true, userId: session.userId }
})

export const getUser = cache(async () => {
  const session = await verifySession()
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
    columns: { id: true, name: true, email: true },   // ★ 必要な列だけ(DTO)
  })
  return user
})
```
- **DTO(Data Transfer Object)**: DB の行を丸ごと返さず、画面に必要な項目だけ返す(パスワードハッシュ等の流出防止)
- **Proxy での判定は「楽観的チェック」**(Cookie があるか見てリダイレクトする程度)。本当の認可は DAL で
- レイアウトだけでチェックしない(レイアウトは遷移時に再実行されないことがある)→ ページやデータ取得側でも確認
- Server Actions・Route Handlers でも毎回 `verifySession()` + 所有者チェック

## Server Actions のセキュリティ
組み込みの保護: 推測できない暗号化ID、未使用アクションの除去、POST のみ、Origin チェック。
それでも自分でやること:
- 入力のバリデーション(Zod)
- 認証・認可(リソースの所有者か)
- 戻り値を最小限に
- レート制限(ログイン・問い合わせフォームなど)

## クライアントへの漏洩を防ぐ
- `import 'server-only'` を DB・秘密情報を扱うファイルに
- Client Component の props に秘密データを渡さない(型を広くしすぎない)
- Taint API(実験的): 特定のオブジェクト・値がクライアントに渡るのをブロック
- `.env` を Client で使っていないか確認

## セキュリティ監査チェックリスト(公式 Auditing より)
- [ ] **DAL**: DB パッケージや環境変数を DAL 以外で import していないか
- [ ] **`"use client"` ファイル**: props に秘密データを期待していないか、型が広すぎないか
- [ ] **`"use server"` ファイル**: 引数を検証しているか、アクション内で再認可しているか、リソースの所有権を確認しているか
- [ ] **`[param]` フォルダ**: URL パラメータはユーザー入力。検証しているか
- [ ] **`proxy.ts` と `route.ts`**: 強力なので重点的に監査。定期的に脆弱性診断
- [ ] Content Security Policy(CSP)ヘッダーの設定
- [ ] Next.js を最新に保つ(2026年も重大な脆弱性修正が複数出ている)

## 関連
- 前: [[Next.js_07_スタイル・画像・フォント・SEO]] / 次: [[Next.js_09_デプロイ・テスト・AI開発・実務チェックリスト]]
- [[APIキー・シークレット管理]]
- 公式: https://nextjs.org/docs/app/guides/authentication , https://nextjs.org/docs/app/guides/data-security , https://nextjs.org/docs/app/guides/environment-variables
