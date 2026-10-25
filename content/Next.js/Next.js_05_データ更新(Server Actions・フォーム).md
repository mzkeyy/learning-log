---
title: "Next.js 05 データ更新(Server Actions・フォーム)"
modified: 2026-09-29
---

## Server Functions / Server Actions とは
- **サーバーで動く async 関数**。ブラウザから(裏で POST リクエストとして)呼べる
- 更新処理に使うものを特に **Server Action** と呼ぶ
- API(route.ts)を自分で作らなくても、フォーム送信や DB 更新ができる
- ⚠️ **誰でも直接 POST で呼べる**。画面から隠しても意味がない → **関数の中で必ず認証・認可・入力チェック**

## 作り方
```ts
// app/actions.ts(ファイル先頭に 'use server' → 中の関数は全部 Server Action)
'use server'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createPost(formData: FormData) {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')   // ① 認証

  const title = formData.get('title')                    // ② 入力取得
  const content = formData.get('content')
  // ③ バリデーション → ④ DB保存
  revalidatePath('/posts')                               // ⑤ キャッシュ更新
  redirect('/posts')                                     // ⑥ 遷移(これ以降のコードは実行されない)
}
```
- Server Component 内に関数ごと書く(関数の先頭に `'use server'`)こともできる
- Client Component の中では**定義できない**が、import して使える

## 呼び出し方
### フォーム(最も基本)
```tsx
import { createPost } from '@/app/actions'
export function Form() {
  return (
    <form action={createPost}>
      <input name="title" />
      <textarea name="content" />
      <button type="submit">投稿</button>
    </form>
  )
}
```
- `FormData` が自動で渡される(`name` 属性がキー)
- **JS が読み込まれる前でも送信できる**(プログレッシブエンハンスメント)
- ボタンごとに別の処理: `<button formAction={deletePost}>`

### イベントハンドラ(Client Component)
```tsx
'use client'
import { incrementLike } from './actions'
<button onClick={async () => setLikes(await incrementLike())}>Like</button>
```

## バリデーション(サーバー側で必須)
クライアントの `required` などは補助。**本当のチェックはサーバーで**。Zod などのスキーマライブラリが定番。
```ts
'use server'
import { z } from 'zod'
const schema = z.object({
  email: z.string().email('メールアドレスの形式が不正です'),
  title: z.string().min(1, '必須です').max(100),
})
export async function createUser(prevState: unknown, formData: FormData) {
  const parsed = schema.safeParse({
    email: formData.get('email'),
    title: formData.get('title'),
  })
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }   // エラーを「返す」
  }
  // 保存処理
  return { message: '保存しました' }
}
```

## エラー表示・送信中表示(useActionState)
**想定内のエラー(入力ミス、API失敗)は throw せず「戻り値」で返す**のが公式の方針。
```tsx
'use client'
import { useActionState } from 'react'
import { createUser } from '@/app/actions'

export function SignupForm() {
  const [state, formAction, pending] = useActionState(createUser, { errors: {} })
  return (
    <form action={formAction}>
      <input name="email" required />
      {state?.errors?.email && <p aria-live="polite">{state.errors.email}</p>}
      <button disabled={pending}>{pending ? '送信中...' : '登録'}</button>
    </form>
  )
}
```
- 予期しない例外は `error.tsx` が受け止める([[Next.js_02_ルーティング]])
- 楽観的更新(押した瞬間に画面を先に変える): `useOptimistic`

## 更新後にやること
| 目的 | 関数 |
| --- | --- |
| そのページの表示を最新に | `refresh()`(next/cache) |
| パス単位でキャッシュを破棄 | `revalidatePath('/posts')` |
| タグ単位で破棄(裏で更新) | `revalidateTag('posts', 'max')` |
| タグを即時失効(自分の変更をすぐ見せる) | `updateTag('posts')`(Server Action のみ) |
| 別ページへ移動 | `redirect('/posts')` |
| Cookie 操作 | `(await cookies()).set('name', 'value')` |

## Route Handler との使い分け
| | Server Actions | Route Handlers(route.ts) |
| --- | --- | --- |
| 呼ぶ人 | 自分の Next.js の画面 | 外部(Webhook、モバイルアプリ、他サービス) |
| 書きやすさ | 関数を書くだけ | HTTP を意識 |
| HTTPメソッド | POST のみ | 自由 |

## 実務チェックリスト
- [ ] 全ての Server Action で認証・認可(**そのリソースの所有者か**まで)を確認
- [ ] 入力を Zod 等で検証
- [ ] 返す値は必要最小限(DBの行を丸ごと返さない)
- [ ] 更新後に revalidate / redirect
- [ ] 連打対策: `pending` 中はボタン無効化、必要ならレート制限

## 関連
- 前: [[Next.js_04_データ取得とストリーミング]] / 次: [[Next.js_06_キャッシュと再検証]]
- 公式: https://nextjs.org/docs/app/getting-started/mutating-data , https://nextjs.org/docs/app/guides/forms , https://nextjs.org/docs/app/getting-started/error-handling
