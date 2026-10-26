---
title: "Webパフォーマンスとアクセシビリティ 01 Core Web Vitals と測り方"
modified: 2026-10-26
---

## なぜ速さが大事か
- 表示が遅いと**離脱が増え、コンバージョン(購入・登録)が下がる**
- Google の検索順位の要素の1つ(ページエクスペリエンス)
- スマホ・遅い回線・古い端末の利用者ほど影響が大きい

## Core Web Vitals
| 指標 | 何を測る | 良い | 改善が必要 | 悪い |
| --- | --- | --- | --- | --- |
| **LCP**(Largest Contentful Paint) | 一番大きな要素(メイン画像・見出し)が表示されるまで | ≤ 2.5秒 | 〜4秒 | > 4秒 |
| **INP**(Interaction to Next Paint) | クリック・タップ・キー入力から画面が反応するまで(ページ滞在中の最悪に近い値) | ≤ 200ms | 〜500ms | > 500ms |
| **CLS**(Cumulative Layout Shift) | 表示中のレイアウトのずれ(読んでいたらずれた、押そうとしたらずれた) | ≤ 0.1 | 〜0.25 | > 0.25 |
- 判定は**利用者の75パーセンタイル**(4人に3人がこの値以下)。モバイルとデスクトップは別に見る
- INP は 2024年3月に FID(最初の操作の遅れだけを見ていた)と置き換わった

### 補助の指標
| 指標 | 意味 | 目安 |
| --- | --- | --- |
| **TTFB** | サーバーが最初の1バイトを返すまで | ≤ 0.8秒 |
| FCP | 何かが最初に表示されるまで | ≤ 1.8秒 |
| TBT | ラボでの「メインスレッドが塞がっていた時間」(INP の代わりの目安) | |
- LCP が遅いとき、まず TTFB(サーバー)が遅いのか、その後(画像・CSS・JS)が遅いのかを分けて考える

## ラボデータとフィールドデータ
| | ラボ(Lab) | フィールド(Field / RUM) |
| --- | --- | --- |
| 何か | 決まった条件で1回測る | **実際の利用者のブラウザ**で集めた値 |
| 道具 | Lighthouse、Chrome DevTools、WebPageTest | **CrUX**(Chrome の利用統計)、`web-vitals` ライブラリ、Vercel Speed Insights など |
| 長所 | 原因を調べやすい、変更前後を比べやすい | 本当の体験がわかる。Google の評価もこちら |
| 短所 | 実際の利用者と条件が違う | 原因まではわかりにくい、集まるまで時間がかかる |
- **フィールドで問題を見つけ、ラボで原因を調べて直し、フィールドで確かめる**
- INP は操作が必要なので、ラボでは測りにくい(TBT や DevTools の Performance パネルで代わりに見る)

## 道具
| 道具 | 使い方 |
| --- | --- |
| **PageSpeed Insights** | URL を入れるだけ。CrUX(フィールド)と Lighthouse(ラボ)を両方表示 |
| **Chrome DevTools の Performance パネル** | 読み込みと操作を記録して、何に時間がかかったかを見る。Core Web Vitals も表示 |
| Lighthouse | DevTools の中、または CLI・CI(`lighthouse-ci`)で。性能・アクセシビリティ・SEO を採点 |
| Search Console | サイト全体の Core Web Vitals の状況(Google 検索の利用者のデータ) |
| WebPageTest | 地域・回線・端末を指定して測る、フィルムストリーム表示 |
- 計測するときは**スマホの設定・遅い回線(CPU と回線の制限)**で。手元の高性能 PC では速く見えてしまう
- シークレットウィンドウで(拡張機能の影響を除く)

## 自分のサイトで集める(RUM)
```ts
import { onLCP, onINP, onCLS } from 'web-vitals'

function send(metric: { name: string; value: number; rating: string; id: string }) {
  navigator.sendBeacon('/api/vitals', JSON.stringify(metric))   // ページを閉じても送れる
}

onLCP(send)
onINP(send)
onCLS(send)
```
- `web-vitals/attribution` を使うと、**どの要素・どの操作が原因か**の情報も付く
- 集めたデータはページの種類・端末別に p75 で見る → [[オブザーバビリティ_03_メトリクスとアラート]]
- Next.js・Vercel・Cloudflare などは組み込みの計測機能もある

## 予算(パフォーマンスバジェット)
- 「JS は 1ページ 200KB(圧縮後)まで」「LCP 2.5秒以内」などの**上限を決めて CI でチェック**する
- 機能追加のたびに少しずつ遅くなるのを防ぐ

## 関連
- 次: [[Webパフォーマンスとアクセシビリティ_02_速くする方法(画像・フォント・JS・キャッシュ)]]
- [[Webパフォーマンスとアクセシビリティ]] / [[オブザーバビリティ]]
- 参考: https://web.dev/articles/vitals , https://web.dev/articles/lcp , https://web.dev/articles/inp , https://web.dev/articles/cls , https://github.com/GoogleChrome/web-vitals
