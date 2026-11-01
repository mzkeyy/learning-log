---
title: "React Router 05 レンダリング戦略(SSR・SPA・プリレンダー・ストリーミング)"
modified: 2026-11-01
---

## 3つの描き方
| 方式 | 設定 | HTML を作るタイミング | 向く場面 |
| --- | --- | --- | --- |
| **SSR**(既定) | `ssr: true` | リクエストのたびにサーバーで | ログイン後の画面、ユーザーごとに違うページ、SEO |
| **プリレンダー**(静的生成) | `prerender: [...]` | **ビルド時** | LP・ブログ・ドキュメントなど全員同じページ |
| **SPA** | `ssr: false` | 作らない(空の殻だけ) | 管理画面、SEO 不要、静的ホスティングだけで配りたい |
- どれでも**2回目以降の移動はブラウザ側で描く**(クライアント遷移)。違うのは最初の1回
- 混ぜられる: SSR のアプリで一部だけプリレンダー、SPA でも一部だけプリレンダー
- そもそも SSR とは何か、ハイドレーションの仕組み → [[SSR]]

```ts
// react-router.config.ts
import type { Config } from "@react-router/dev/config";

export default {
  ssr: true,
  async prerender() {
    const posts = await getAllPosts();
    return ["/", "/about", ...posts.map((p) => `/blog/${p.slug}`)];
  },
} satisfies Config;
```
- `prerender: true` なら、パラメータのない全ルートを生成
- プリレンダーするページの `loader` は**ビルド中に**動く(CSV や CMS から読んでよい)
- `ssr: true` のままなら、プリレンダーしていない URL はいつも通り SSR される

## SPA モード
```ts
export default { ssr: false } satisfies Config;
```
- `npm run build` すると `build/client/` だけができる。静的ホスティング(Cloudflare Pages・S3 など)に置くだけ
- **全部の URL を `index.html` に返す設定**がホスト側に要る(例: `_redirects` に `/*  /index.html  200`)→ [[Vite_04_ビルドとデプロイ]]
- データは `clientLoader` / `clientAction` で(ブラウザから API を呼ぶ)。root 以外のルートに `loader` は書けない(プリレンダーするページは別)
- `index.html` は **root ルートをビルド時に描いたもの**。読み込み中の画面を `HydrateFallback` で出せる
```tsx
// app/root.tsx
export function HydrateFallback() {
  return <p>読み込み中…</p>;   // JS が動くまで表示される
}
```
- あとから SSR に切り替えるときも、画面のコードはほぼそのまま(`ssr: true` にして、`clientLoader` を `loader` に寄せていく)
- 実験的: `ssr: "unstable_api-only"` で「HTML は SPA、loader / action はサーバー」という形もある

## ストリーミング(遅いデータを後から送る)
loader は**全部終わるまで画面を返さない**。遅い部分は `await` せずに Promise のまま返すと、先に画面を送れる。
```tsx
import { Suspense } from "react";
import { Await } from "react-router";

export async function loader({ params }: Route.LoaderArgs) {
  const product = await getProduct(params.id);   // すぐ必要 → 待つ
  const reviews = getReviews(params.id);         // 遅い・後でよい → 待たない(Promise のまま)
  return { product, reviews };                   // オブジェクトに入れて返す(Promise 単体は不可)
}

export default function Product({ loaderData }: Route.ComponentProps) {
  return (
    <>
      <h1>{loaderData.product.name}</h1>
      <Suspense fallback={<p>レビューを読み込み中…</p>}>
        <Await resolve={loaderData.reviews} errorElement={<p>読み込めませんでした</p>}>
          {(reviews) => <Reviews items={reviews} />}
        </Await>
      </Suspense>
    </>
  );
}
```
```tsx
// React 19 の use() で受けてもよい(Suspense の内側の子コンポーネントで)
import { use } from "react";
function Reviews({ promise }: { promise: Promise<Review[]> }) {
  const reviews = use(promise);
  return <ul>{reviews.map((r) => <li key={r.id}>{r.body}</li>)}</ul>;
}
```
- 既定では約 5 秒で打ち切り(`entry.server.tsx` の `streamTimeout` で変更)
- **検索エンジンのボット**には全部そろってから返す(既定の `entry.server.tsx` が `isbot` で判定している)
- 何を待って何を後回しにするかは「最初に見せたいもの」で決める。SEO に要る中身は待つ

## clientLoader(ブラウザ側で読む)
```tsx
// サーバーの loader の結果をブラウザでキャッシュする例
let cache: Awaited<ReturnType<typeof loader>> | undefined;

export async function loader({ params }: Route.LoaderArgs) {
  return { product: await getProduct(params.id) };
}

export async function clientLoader({ serverLoader }: Route.ClientLoaderArgs) {
  cache ??= await serverLoader();   // 2回目以降はサーバーに行かない
  return cache;
}
```
| 組み合わせ | 動き |
| --- | --- |
| `loader` だけ | 初回は SSR、移動時はサーバーに fetch |
| `clientLoader` だけ | いつもブラウザで(SSR 時は `HydrateFallback` を出してから) |
| 両方 | 初回は `loader`(SSR)、移動時は `clientLoader`(中で `serverLoader()` を呼べる) |
| 両方 + `clientLoader.hydrate = true as const` | 初回のハイドレーション時にも `clientLoader` を動かす |
- TanStack Query と組み合わせる手もある(`clientLoader` で `queryClient.ensureQueryData`)→ [[React_04_状態管理とデータ取得(Context・Zustand・TanStack Query)]]

## HTTP キャッシュ
```tsx
export function headers() {
  return { "Cache-Control": "public, max-age=60, s-maxage=3600" };   // CDN に1時間置く
}
```
- 全員に同じページなら CDN にキャッシュさせると速く安い。**ログインユーザーごとのページは `private`** にする(他人に見えないように)→ [[REST]]

## 入口ファイル(entry.server / entry.client)
既定のものが用意されていて、ふつうは書かなくてよい。`npx react-router reveal` で中身を出して変えられる。
```tsx
// entry.server.tsx(既定の要点)
const { pipe, abort } = renderToPipeableStream(
  <ServerRouter context={routerContext} url={request.url} />,
  {
    // ボットと SPA モードは全部待つ、人間にはシェルができたら送り始める
    [isbot(userAgent) || routerContext.isSpaMode ? "onAllReady" : "onShellReady"]() {
      responseHeaders.set("Content-Type", "text/html");
      pipe(body);
      resolve(new Response(stream, { headers: responseHeaders, status: responseStatusCode }));
    },
    onShellError: reject,
    onError(error) { responseStatusCode = 500; },
  },
);
```
```tsx
// entry.client.tsx(既定)
startTransition(() => {
  hydrateRoot(document, <StrictMode><HydratedRouter /></StrictMode>);
});
```
- 中で何が起きているか(`renderToPipeableStream`・`hydrateRoot`)は自分で SSR を作ると分かる → [[SSR_03_ストリーミングSSR(renderToPipeableStream・Suspense)]]
- CSP の nonce を付けるならここ(`<ServerRouter nonce>` と `renderToPipeableStream` の `nonce`)

## 選び方のまとめ
```
SEO が要る?
 ├─ いいえ(ログイン後の管理画面など)→ SPA(ssr: false)でも十分。ただし SSR の方が初回表示は速い
 └─ はい
     ├─ 全員に同じ・更新が少ない → プリレンダー
     └─ ユーザーごとに違う・頻繁に変わる → SSR(+ 遅い部分はストリーミング)
```

## 関連
- 前: [[React Router_04_ミドルウェア・認証・型安全]] / 次: [[React Router_06_実務(Zod検証・テスト・デプロイ・v8移行・AI開発)]]
- [[SSR]] / [[TanStack Start_05_レンダリング戦略・SEO・TanStack Query]] / [[Next.js_04_データ取得とストリーミング]] / [[Webパフォーマンスとアクセシビリティ]]
- 公式: https://reactrouter.com/start/framework/rendering , https://reactrouter.com/how-to/spa , https://reactrouter.com/how-to/pre-rendering , https://reactrouter.com/how-to/suspense
