---
title: "TanStack Start 05 レンダリング戦略・SEO・TanStack Query"
modified: 2026-09-29
---

## レンダリング方式の選択肢
| 方式 | 内容 | 向いている |
| --- | --- | --- |
| **SSR(既定)** | 初回アクセスでサーバーが beforeLoad・loader を実行し HTML を返す → ハイドレーション | 公開サイト、SEO |
| **Selective SSR** | ルートごとに `ssr: true / false / 'data-only'` | 一部だけブラウザ専用 API を使う |
| **SPA モード** | サーバーでの描画をやめ、アプリの「殻」HTML だけ配信 | 管理画面、SEO 不要、安く簡単にデプロイ |
| **静的プリレンダー** | ビルド時に HTML を生成 | ブログ、ドキュメント、LP |
| **ストリーミング** | 準備できた部分から送る | 遅いデータがあるページ |

### Selective SSR
```tsx
export const Route = createFileRoute('/editor')({
  ssr: false,          // このルートはサーバーで loader も描画もしない(canvas や localStorage を使う画面)
})
// ssr: 'data-only' → サーバーで beforeLoad・loader は実行するが、描画はブラウザで
```
全体の既定は `src/start.ts` の `defaultSsr` で変更。

### SPA モード
- ビルド時にルートだけプリレンダーした `/_shell.html` を作り、全ての 404 をそこへ書き換え
- **サーバー機能(Server Functions・Server Routes)は引き続き使える**(初回 HTML をサーバーで作らないだけ)
- メリット: CDN だけで配信でき安い・シンプル / デメリット: 最初の表示が遅い、SEO に弱い

### 静的プリレンダー
- Start プラグインの `prerender` オプションで有効化
- 静的パスは自動で発見、`crawlLinks`(既定 true)でリンクを辿って動的ページも生成
- パラメータ付きルート・レイアウトルート・API ルートは自動対象外

## SEO(head 管理)
```tsx
// 固定のメタ
export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'My Site' },
      { name: 'description', content: 'サイトの説明' },
      { property: 'og:title', content: 'My Site' },
      { property: 'og:image', content: 'https://example.com/og.png' },
    ],
    links: [{ rel: 'canonical', href: 'https://example.com/' }],
  }),
})
// loader のデータから動的に
export const Route = createFileRoute('/posts/$postId')({
  loader: ({ params }) => getPost({ data: { id: params.postId } }),
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData.title }, { name: 'description', content: loaderData.excerpt }],
  }),
})
```
- 構造化データ(JSON-LD)は `scripts` で埋め込む
- SSR が既定なのでクローラーは完成した HTML を受け取る
- `robots.txt` やサイトマップは Server Route や public で用意
- 公式には AI 検索向けの GEO(Generative Engine Optimization)ガイドもある

## TanStack Query との連携
Router の loader は「遷移の調整役」、Query は「データの持ち主(キャッシュ・鮮度・更新)」。一覧と詳細をまたぐキャッシュ、バックグラウンド更新、楽観的更新が必要なら併用する。
```bash
npm i @tanstack/react-query @tanstack/react-router-ssr-query
```
要点(公式):
- **QueryClient は `getRouter` の中で作る**(モジュールのトップで作ると、SSR で他ユーザーのデータが混ざる危険)
- root で `createRootRouteWithContext<{ queryClient: QueryClient }>()` にして子ルートから使う
- **query の key と関数を1か所にまとめ(queryOptions)、loader と component で共有**
```tsx
const postQuery = (id: string) => queryOptions({
  queryKey: ['post', id],
  queryFn: () => getPost({ data: { id } }),   // 秘密が必要な取得は Server Function 経由
})
export const Route = createFileRoute('/posts/$postId')({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(postQuery(params.postId)),
  component: () => {
    const { postId } = Route.useParams()
    const { data } = useSuspenseQuery(postQuery(postId))
    return <h1>{data.title}</h1>
  },
})
```
- ページの主要コンテンツ・タイトル・認可に関わるデータは **await**、副次的なものは Suspense でストリーミング
- 更新後: `queryClient.invalidateQueries(...)`(Query のデータ)/ `router.invalidate()`(loader のデータ)。持ち主に合わせて
- ログアウト時などはブラウザ側のキャッシュをクリア

## スタイル
- Tailwind CSS 統合ガイドあり(`@tailwindcss/vite`)
- [[shadcn-ui]] も TanStack Start に対応

## 関連
- 前: [[TanStack Start_04_ミドルウェア・Server Routes・環境変数]] / 次: [[TanStack Start_06_認証・DB・デプロイ・本番チェック]]
- 公式: https://tanstack.com/start/latest/docs/framework/react/guide/selective-ssr , https://tanstack.com/start/latest/docs/framework/react/guide/spa-mode , https://tanstack.com/start/latest/docs/framework/react/guide/seo , https://tanstack.com/start/latest/docs/framework/react/guide/tanstack-query
