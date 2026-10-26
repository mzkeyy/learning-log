---
title: "Webパフォーマンスとアクセシビリティ 02 速くする方法(画像・フォント・JS・キャッシュ)"
modified: 2026-10-26
---

## LCP を速くする
LCP は「サーバーの応答 → リソースの発見 → ダウンロード → 描画」の合計。
| 段階 | 遅い原因 | 対策 |
| --- | --- | --- |
| サーバーの応答(TTFB) | 毎回サーバーで重い処理、遠いサーバー | **CDN・キャッシュ**、静的生成、DB のクエリの改善 |
| 発見の遅れ | LCP の画像を JS や CSS の背景で読み込んでいる | `<img>` で HTML に書く、`<link rel="preload">` |
| 優先度 | 他の画像と同じ優先度 | **`fetchpriority="high"`**、`loading="lazy"` を付けない |
| ダウンロード | 画像が大きい | **AVIF / WebP**、適切なサイズ(`srcset`)、圧縮 |
| 描画の妨げ | 大きな CSS・同期の JS | CSS を小さく、JS は `defer` / `type="module"` |

### 画像
```html
<!-- メインの画像(LCP になりそうなもの) -->
<img src="/hero-1200.avif"
     srcset="/hero-600.avif 600w, /hero-1200.avif 1200w"
     sizes="(max-width: 600px) 100vw, 1200px"
     width="1200" height="600"
     alt="新商品のスニーカー"
     fetchpriority="high">

<!-- 画面の下のほうの画像 -->
<img src="/thumb.webp" width="300" height="200" alt="..." loading="lazy" decoding="async">
```
- **`width` と `height` を必ず書く**(場所が先に確保され、CLS を防ぐ)
- 最初に見えない画像は `loading="lazy"`。**最初に見える画像には付けない**(LCP が遅くなる)
- Next.js の `<Image>` などはこれらを自動でやってくれる → [[Next.js_07_スタイル・画像・フォント・SEO]]
- 画像の変換は CDN(Cloudflare Images など)に任せるのも手

## CLS を防ぐ
| 原因 | 対策 |
| --- | --- |
| サイズのない画像・動画・iframe | `width` / `height`、`aspect-ratio` |
| 後から差し込まれる広告・バナー・埋め込み | **場所を先に確保**(min-height) |
| Web フォントの切り替えで文字の幅が変わる | `font-display`、似たサイズの代替フォント(`size-adjust`)、フォントの事前読み込み |
| 上に要素を追加する | 操作に応じてだけ追加、下に追加する |
| `top` / `left` のアニメーション | `transform` で動かす |

## INP を速くする(反応の速さ)
操作のあと、メインスレッドが**長い処理(50ms 以上のタスク)**で塞がっていると反応が遅れる。
| 対策 | 内容 |
| --- | --- |
| **JS を減らす** | 使っていないライブラリを消す、画面ごとに分割、サーバーで描画する(Server Components) |
| 長い処理を分ける | `await scheduler.yield()` などで途中でブラウザに処理を返す |
| 見た目の反応を先に | クリックしたらまず画面を変え、重い処理は後で(React の `useTransition`) |
| サードパーティのスクリプト | タグ・チャット・解析ツールを見直す、遅延読み込み |
| 大きな DOM | 長いリストは仮想スクロール、要素を減らす |
- DevTools の Performance パネルで「操作 → 長いタスク → どの関数か」を見る
- React の場合 → [[React_05_実務(構成・性能・型・AI開発)]]

## JavaScript を減らす
- バンドルの中身を見る(`vite-bundle-visualizer`、`@next/bundle-analyzer`)
- 大きなライブラリの代わりを探す(日付: `date-fns` / `Temporal`、全部入りのアイコン集を部分 import に)
- **画面ごとにコードを分割**(動的 import・`React.lazy`)
- サーバーで済む処理はサーバーで(Server Components・Astro のアイランドなど)

## フォント
- 日本語フォントはとても大きい。**サブセット化**(使う文字だけ)、`woff2`
- `font-display: swap`(または `optional`)で、読み込み中も文字を表示
- 自分のサイトから配信する(外部のフォントサービスへの接続を減らす)。Next.js の `next/font` は自動
- システムフォントで十分ならそれが最速

## キャッシュと配信
| 対象 | 設定 |
| --- | --- |
| ファイル名にハッシュが付いた JS・CSS・画像 | `Cache-Control: public, max-age=31536000, immutable`(1年) |
| HTML | 短め、または `no-cache`(毎回確認)。静的なら CDN にキャッシュ |
| API | 内容に応じて。個人のデータは `private` |
- **CDN** で利用者の近くから配信 → [[Cloudflare]] / [[SAA_03_ネットワーク(VPC・ELB・Route 53・CloudFront)]]
- 圧縮(Brotli / gzip)、HTTP/2・HTTP/3 → [[HTTP・HTTPS・TLS]]
- `<link rel="preconnect">` で、使う外部ドメインへの接続を先に始める
- 次に開きそうなページを先に読み込む(Speculation Rules API、フレームワークのリンクの先読み)
- 戻る・進むを一瞬にする **bfcache** を妨げない(`unload` イベントを使わない)

## 描画方式の選び方
| 方式 | 速さ | 向く場面 |
| --- | --- | --- |
| 静的生成(SSG) | 最速(CDN から HTML) | ブログ・ドキュメント・LP |
| SSR + ストリーミング | 速い | ログイン後・個人ごとの内容 |
| SPA(クライアントで描画) | 最初の表示が遅くなりがち | 管理画面など、検索に出さない画面 |
→ [[Next.js_06_キャッシュと再検証]] / [[TanStack Start_05_レンダリング戦略・SEO・TanStack Query]]

## 関連
- 前: [[Webパフォーマンスとアクセシビリティ_01_Core Web Vitalsと測り方]] / 次: [[Webパフォーマンスとアクセシビリティ_03_アクセシビリティの基本(WCAG・法律・設計)]]
- [[Next.js]] / [[Vite_05_実務構成・テスト・性能・トラブル]] / [[Cloudflare]]
- 参考: https://web.dev/articles/optimize-lcp , https://web.dev/articles/optimize-inp , https://web.dev/articles/optimize-cls , https://web.dev/articles/fetch-priority , https://web.dev/articles/bfcache
