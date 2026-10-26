---
title: "React 05 実務(構成・性能・型・AI 開発)"
modified: 2026-10-26
---

## プロジェクトの始め方
| 目的 | コマンド |
| --- | --- |
| SPA(管理画面など) | `npm create vite@latest my-app -- --template react-ts` → [[Vite]] |
| フルスタック | `npx create-next-app@latest` → [[Next.js]] / [[TanStack Start]] |
| 部品 | `npx shadcn@latest init` → [[shadcn-ui]] |

## フォルダ構成の例(機能ごと)
```
src/
├── app/ or routes/        # 画面(ルーティング)
├── features/
│   ├── posts/
│   │   ├── components/    # この機能の部品
│   │   ├── api.ts         # データ取得(TanStack Query のフック)
│   │   ├── schema.ts      # Zod の型
│   │   └── PostList.test.tsx
│   └── auth/
├── components/ui/         # 共通の見た目の部品(Button・Dialog)
├── hooks/                 # 共通のカスタムフック
└── lib/                   # 汎用の関数
```
- 「components・hooks・utils」の種類別だけで分けると、機能が増えたときに探しにくい。**機能ごとにまとめる**と変更が1か所に収まる
- 見た目だけの部品(Button)と、データを扱う部品(PostList)を分ける

## TypeScript で書く
```tsx
type ButtonProps = React.ComponentProps<'button'> & {   // button の props を全部受け継ぐ
  variant?: 'primary' | 'secondary'
}

export function Button({ variant = 'primary', className, ...props }: ButtonProps) {
  return <button className={cn(styles[variant], className)} {...props} />
}
```
| よく使う型 | 用途 |
| --- | --- |
| `React.ReactNode` | `children` など、表示できるもの全般 |
| `React.ComponentProps<'input'>` | HTML 要素の props |
| `React.ComponentProps<typeof Button>` | 他のコンポーネントの props |
| `React.ChangeEvent<HTMLInputElement>` | イベント |
| `useState<User \| null>(null)` | 初期値から推論できないとき |
- props の型は `type` で書く。分割代入でデフォルト値を付ける → [[TypeScript]]

## 性能
**まず測る**。React DevTools の Profiler で、どのコンポーネントが何回・何ミリ秒描画されたか見る。
| 症状 | 対策 |
| --- | --- |
| 入力するたびに全体が重い | state を**使う場所の近く**に移す、コンポーネントを分ける |
| 長いリスト | 仮想スクロール(TanStack Virtual)、ページング |
| 重い計算 | React Compiler(自動)/ `useMemo` |
| 入力欄の反応が遅い | `useDeferredValue` / `useTransition` で重い更新を後回しに |
| 最初の表示が遅い | バンドルを小さく(`lazy` + `Suspense` で画面ごとに分割)、Server Components |
| Context で全体が再描画 | 値を分ける、頻繁に変わる値は Zustand に |
- 画面の表示速度の測り方(Core Web Vitals)→ Webパフォーマンスとアクセシビリティ

## エラーの扱い
- 描画中のエラーで画面全体が真っ白にならないよう、**Error Boundary**(`react-error-boundary` が手軽)で区切る
- データ取得のエラー・ローディング・空の状態を、それぞれ画面で用意する
- 本番のエラーは Sentry などで集める → [[オブザーバビリティ_05_道具と実装(Sentry・Cloudflare・AWS)]]

## アクセシビリティ
- ボタンは `<button>`、リンクは `<a>`。`<div onClick>` にしない(キーボードで操作できない)
- 入力欄に `<label>`、画像に `alt`
- モーダル・メニューなど複雑な部品は、アクセシビリティ対応済みの部品(Radix・React Aria、それを使う shadcn/ui)を使う
- 確認はテストでも → [[テスト_04_コンポーネントテスト(Testing Library・Browser Mode)]]

## よくあるバグ
| バグ | 原因 |
| --- | --- |
| 無限ループで再描画 | Effect の中で state を set → 依存配列にその state |
| 古い値を使ってしまう | クロージャーが古い state を持っている → 関数で更新 `setX((x) => ...)` |
| 画面が更新されない | 配列・オブジェクトを直接書き換えた |
| リストの入力内容がずれる | `key` に index を使った |
| `0` が表示される | `{count && <X />}` → `{count > 0 && <X />}` |
| ハイドレーションエラー | サーバーとブラウザで表示が違う(日時・乱数・`window` の参照) |

## AI に React を書かせるとき
- 古い書き方(クラスコンポーネント、`forwardRef`、何でも `useEffect`、`useMemo` だらけ)が出てきやすい。**React 19 と React Compiler を使う**と伝える
- CLAUDE.md / AGENTS.md に**使っているライブラリ**(TanStack Query・Zustand・shadcn/ui)と**フォルダ構成のルール**を書いておく → [[04_CLAUDE.mdとメモリ]]
- `useEffect` でのデータ取得、`dangerouslySetInnerHTML`、`key={index}` が混ざっていないか確認する
- 見た目は Storybook やスクリーンショットで確認し、操作はテストで確かめる

## チェックリスト
- [ ] state は必要最小限(計算できるものは state にしない)
- [ ] サーバーのデータは TanStack Query / フレームワークの仕組みで扱っている
- [ ] Effect は外部との同期だけに使っている
- [ ] リストの `key` は ID
- [ ] ローディング・エラー・空の状態がある
- [ ] ボタン・リンク・ラベルが正しい要素で、キーボードで操作できる
- [ ] 重い画面は Profiler で測ってから最適化した
- [ ] eslint-plugin-react-hooks を入れている

## 関連
- 前: [[React_04_状態管理とデータ取得(Context・Zustand・TanStack Query)]] / 目次: [[React]]
- [[Next.js]] / [[TypeScript]] / [[テスト]] / [[shadcn-ui]]
- 公式: https://react.dev/learn/thinking-in-react , https://react.dev/reference/react/Profiler , https://react.dev/learn/react-developer-tools
