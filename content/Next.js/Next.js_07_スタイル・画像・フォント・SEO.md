---
title: "Next.js 07 スタイル・画像・フォント・SEO"
modified: 2026-09-29
---

## CSS の選択肢
| 方法 | 使い方 | 用途 |
| --- | --- | --- |
| **Tailwind CSS**(既定・推奨) | `className="p-4 text-lg"` | ほぼ全部これで |
| グローバルCSS | `app/globals.css` をルート layout で import | リセット、CSS変数(デザイントークン) |
| CSS Modules | `button.module.css` → `styles.button` | 部品ごとに閉じたCSS |
| CSS-in-JS | styled-components など | Client Component 限定が多い。新規では非推奨寄り |
```tsx
// app/layout.tsx
import './globals.css'
```
→ Tailwind と [[shadcn-ui]] の組み合わせが実務の定番。

## 画像: `next/image`
```tsx
import Image from 'next/image'
<Image src="/profile.png" alt="プロフィール" width={400} height={400} />
// 外部画像は next.config.ts の images.remotePatterns で許可が必要
```
自動でやってくれること: 画面サイズに合わせたサイズ変換、WebP/AVIF 変換、遅延読み込み、レイアウトのガタつき防止(width/height 必須の理由)。
- ファーストビューの大きな画像には `priority`(読み込みを優先)
- 親要素いっぱいに広げる時は `fill` + 親に `position: relative`
- **`alt` は必ず書く**(アクセシビリティとSEO)

## フォント: `next/font`
```tsx
// app/layout.tsx
import { Noto_Sans_JP } from 'next/font/google'
const noto = Noto_Sans_JP({ subsets: ['latin'], weight: ['400', '700'] })
export default function RootLayout({ children }) {
  return (<html lang="ja" className={noto.className}><body>{children}</body></html>)
}
```
- ビルド時にフォントをダウンロードして自前配信(Google への通信なし、表示のガタつき防止)
- 自前フォントは `next/font/local`
- Tailwind と連携するなら `variable: '--font-sans'` で CSS 変数にする

## メタデータと SEO
```tsx
// 静的: layout.tsx / page.tsx から export
import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'My Blog',
  description: 'Next.js で作ったブログ',
  openGraph: { title: 'My Blog', images: ['/og.png'] },
}
```
```tsx
// 動的: データに応じて(記事タイトルなど)
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const post = await getPost(slug)          // React.cache で包めば page と取得を共有できる
  return { title: post.title, description: post.excerpt }
}
```
- **Server Component でのみ**使える
- `charset` と `viewport` は自動で付く
- タイトルの共通化: `title: { template: '%s | My Blog', default: 'My Blog' }`

### 特別なファイル(置くだけで効く)
| ファイル | 役割 |
| --- | --- |
| `app/favicon.ico` `icon.png` `apple-icon.png` | ファビコン |
| `opengraph-image.png` / `.tsx` | SNSシェア画像(tsx なら動的生成) |
| `sitemap.ts` | サイトマップ |
| `robots.ts` | クローラー設定 |

## パフォーマンスの基本
- Server Component を基本にして JS を減らす
- `<Link>` によるプリフェッチ
- 画像・フォントは必ず next/image・next/font
- Core Web Vitals(LCP・CLS・INP)を計測: `useReportWebVitals`、Vercel Analytics など

## 関連
- 前: [[Next.js_06_キャッシュと再検証]] / 次: [[Next.js_08_認証とセキュリティ]]
- [[Tailwind CSS]] / [[デザイントークン]]
- 公式: https://nextjs.org/docs/app/getting-started/css , https://nextjs.org/docs/app/getting-started/images , https://nextjs.org/docs/app/getting-started/fonts , https://nextjs.org/docs/app/getting-started/metadata-and-og-images
