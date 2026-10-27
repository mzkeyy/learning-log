---
title: "コンポーネント設計 04 API の設計(props・variants・合成・アクセシビリティ)"
modified: 2026-10-27
---

コンポーネントの **API = props とその使い方**。一度たくさんの画面で使われると変えにくいので、関数の引数と同じく丁寧に設計する。

## props の基本
| ルール | 例 |
| --- | --- |
| **HTML の属性を受け継ぐ** | `ButtonProps = React.ComponentProps<'button'> & {...}` で `type`・`disabled`・`aria-*`・`onClick` がそのまま使える |
| 名前は HTML・業界の慣習に合わせる | `disabled`(`isDisabled` ではなく)、`onChange`、`value` |
| **見た目の種類は1つの props に** | `variant="primary" \| "secondary" \| "danger"` |
| `className` を受け取って最後に混ぜる | 使う側が少しだけ調整できる |
| 必須は少なく、デフォルト値を用意 | `size = 'md'` |
| イベントは `on〜` | `onSelect`、`onOpenChange` |

```tsx
type ButtonProps = React.ComponentProps<'button'> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

export function Button({ variant = 'primary', size = 'md', className, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
}
```

### boolean の props を増やし続けない
```tsx
// ❌ 組み合わせが爆発する(primary かつ danger? small かつ large?)
<Button primary danger small rounded outline />

// ✅ 種類を1つの props に
<Button variant="danger" size="sm" />
```

## バリエーションの管理(cva / tailwind-variants)
```ts
import { cva, type VariantProps } from 'class-variance-authority'

export const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-medium focus-visible:ring-2 disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground',
        danger: 'bg-destructive text-white',
        ghost: 'hover:bg-accent',
      },
      size: { sm: 'h-8 px-3 text-sm', md: 'h-10 px-4', lg: 'h-12 px-6 text-lg' },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)
export type ButtonVariants = VariantProps<typeof buttonVariants>   // props の型を自動で作る
```
- 見た目の組み合わせを**1か所の表**にまとめられる。色の値は直接書かず、**トークン**(`bg-primary`)を使う → [[デザイントークン_04_実装(CSS変数・Tailwind・shadcn・Style Dictionary)]]
- shadcn/ui はこの形 → [[shadcn-ui]]
- tailwind-variants はスロット(部品の中の複数の要素)の見た目もまとめて扱える

## 合成(composition)で柔軟にする
### children で中身を任せる
```tsx
// ❌ 何でも props で受け取る: 「アイコンを左に」「バッジを付けたい」のたびに props が増える
<Card title="注文" subtitle="3件" icon="cart" badge="new" footerButtonLabel="すべて見る" />

// ✅ 部品を組み合わせる(Compound Components)
<Card>
  <CardHeader>
    <CardTitle>注文</CardTitle>
    <CardDescription>3件</CardDescription>
  </CardHeader>
  <CardContent>{/* 何でも入れられる */}</CardContent>
  <CardFooter><Button variant="ghost">すべて見る</Button></CardFooter>
</Card>
```
- **Compound Components**: 親と子が組で働く部品(`Tabs` + `TabsList` + `TabsTrigger` + `TabsContent`)。内部の状態は Context で共有する
- 使う側が**並べ方・中身を自由に決められ**、部品側の props は増えない
- 「設定の props を増やす」より「**部品を差し込める形**」にするのが長持ちするコツ

### asChild(Slot)
```tsx
// Button の見た目のまま、中身をリンクにする
<Button asChild>
  <a href="/orders">注文一覧へ</a>
</Button>
```
- 見た目は Button、要素は `<a>`。**正しい HTML 要素**を保ったまま見た目を使い回せる → [[shadcn-ui_04_コンポーネント地図と使い方]]

## 制御・非制御
| | 非制御(uncontrolled) | 制御(controlled) |
| --- | --- | --- |
| 状態の持ち主 | 部品の中 | 使う側 |
| 書き方 | `<Dialog defaultOpen>` | `<Dialog open={open} onOpenChange={setOpen}>` |
| 向く場面 | 中の状態を外から触らない | 外から開閉したい、他と同期したい |
- 良い部品は**両方に対応**する(`defaultValue` と `value` + `onChange`)。ヘッドレス部品の多くはこの形

## ref と DOM
- React 19 では `ref` が普通の props として渡せる。共通の部品は `ref` を内側の要素に渡す(フォーカス移動・フォームのライブラリ・計測で必要)→ [[React_03_React 19の機能(Actions・use・Activity・Compiler)]]
- 残りの props(`...props`)を内側の要素に渡すと、`aria-*`・`data-*`・イベントが使える

## アクセシビリティを部品に組み込む
| 部品 | 組み込むこと |
| --- | --- |
| Button | `<button>` を使う。アイコンだけなら `aria-label` を必須にする(型で強制も可) |
| Input / Field | ラベル・説明・エラーを `id` で結ぶ(`aria-describedby`・`aria-invalid`) |
| Dialog | フォーカスを中へ移す・閉じたら戻す・Esc で閉じる・背景を操作させない |
| Menu / Tabs / Combobox | 矢印キーの移動、ARIA の役割と状態 → ヘッドレス部品に任せる |
| すべて | `:focus-visible` のスタイル、十分なコントラスト、押しやすい大きさ |
- **部品が正しければ、使う側は気にしなくても正しくなる**。ここがデザインシステムの最大の効果の1つ
→ [[Webパフォーマンスとアクセシビリティ_04_アクセシビリティの実装とチェック]]

## 変更と互換性
- 多くの画面で使われる部品の props を変えると、全部が壊れる。**追加は OK、削除・意味の変更は慎重に**
- 非推奨にする場合は、警告(`@deprecated` の JSDoc・開発時の console.warn)→ 移行期間 → 削除
- 型(TypeScript)で使い方を縛ると、間違った使い方がコンパイル時にわかる → [[TypeScript]]

## 関連
- 前: [[コンポーネント設計_03_分け方(責務・層・置き場所)]] / 次: [[コンポーネント設計_05_デザインシステムの実装と運用(Storybook・ドキュメント・AI)]]
- [[shadcn-ui]] / [[Tailwind CSS]] / [[React]]
- 参考: https://cva.style/docs , https://www.tailwind-variants.org/ , https://www.radix-ui.com/primitives/docs/guides/composition , https://www.w3.org/WAI/ARIA/apg/
