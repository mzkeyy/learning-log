---
title: "React 06 props の受け取り方(分割代入する・しない・型・既定値)"
modified: 2026-11-01
---

## 3つの書き方
```tsx
type Props = { title: string; count: number };

// ① 引数で分割代入する(いちばんよく見る)
function Badge({ title, count }: Props) {
  return <span>{title}: {count}</span>;
}

// ② 分割代入しない(props オブジェクトのまま)
function Badge(props: Props) {
  return <span>{props.title}: {props.count}</span>;
}

// ③ 本体の最初で分割代入する
function Badge(props: Props) {
  const { title, count } = props;
  return <span>{title}: {count}</span>;
}
```
- 3つとも**動きも性能も同じ**。React は props をいつも1つのオブジェクトで渡していて、分割代入はただの JavaScript の書き方
- React Compiler や `memo` の効き方も変わらない(どれも props の値で比べる)

## 比べると
| | ① 引数で分割代入 | ② props のまま | ③ 本体で分割代入 |
| --- | --- | --- | --- |
| 何を受け取るか | **関数の頭で一目で分かる** | 本体を読まないと分からない | 1行目を見れば分かる |
| 既定値 | `{ size = "md" }` と書ける | `props.size ?? "md"` を毎回 | `const { size = "md" } = props` |
| 外から来た値か、中で作った値か | 区別しにくい | `props.` が付くので**一目で分かる** | 区別しにくい |
| 残りをまとめて渡す | `{ a, ...rest }` | `{...props}` | `const { a, ...rest } = props` |
| **ユニオン型の props** | 片方にしかない項目は取り出せない | **絞り込める** | 共通の項目なら絞り込める |
| props 全体も使いたい | 使えない(名前がない) | 使える | 使える |
| 名前がぶつかる | 別名にする(`{ user: userRef }`) | ぶつからない | 別名にする |
- **ふだんは①**(公式ドキュメント・shadcn/ui・ほとんどのコードがこれ)。次の場面では②にする: ユニオン型の props、props 全体を別の関数に渡す、中の変数と名前がぶつかる

## 既定値
```tsx
// ✅ 分割代入の既定値
function Button({ size = "md", variant = "primary", children }: ButtonProps) { /* ... */ }

// ❌ defaultProps は関数コンポーネントでは使えない
Button.defaultProps = { size: "md" };   // React 19 の JSX では無視される(undefined のまま)
```
- 既定値が使われるのは**値が `undefined` のときだけ**。`null` や `""` を渡すと既定値にならない
- 既定値にオブジェクト・配列を書くと、描画のたびに新しいものが作られる(`{ items = [] }`)。`useEffect` の依存配列に入れると毎回動くので、外に定数で置く
```tsx
const EMPTY: Item[] = [];
function List({ items = EMPTY }: { items?: Item[] }) { /* ... */ }
```

## 残りをまとめて渡す(rest と spread)
```tsx
type ButtonProps = React.ComponentProps<"button"> & { variant?: "primary" | "ghost" };

// 自分で使うものだけ取り出し、残り(onClick・disabled・aria-* など)は button にそのまま
export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return <button className={cn(styles[variant], className)} {...props} />;
}
```
- `{...props}` は**最後**に書くと呼ぶ側が上書きでき、**最初**に書くと自分の値が勝つ。`className` のように混ぜたいものは取り出して合成する
- React 19 からは `ref` もふつうの props(`forwardRef` は要らない)。`...props` に入れて渡せば届く
- 何でも素通しにすると、どの props が使えるのか分かりにくくなる。HTML 要素を包む部品(ボタン・入力欄)にだけ使う → [[コンポーネント設計_04_APIの設計(props・variants・合成・アクセシビリティ)]]

## 型の書き方
```tsx
// 型に名前を付ける(おすすめ。ほかのファイルからも使える)
type CardProps = { title: string; children: React.ReactNode };
export function Card({ title, children }: CardProps) { /* ... */ }

// その場で書く(小さい部品なら)
function Dot({ color }: { color: string }) { /* ... */ }
```
| 型 | 中身 |
| --- | --- |
| `React.ReactNode` | `children` に入るもの全部(文字・数値・要素・配列・`null`) |
| `React.ComponentProps<"input">` | HTML 要素の props 全部 |
| `React.ComponentProps<typeof Card>` | ほかのコンポーネントの props |
| `React.PropsWithChildren<Props>` | `Props` に `children?: ReactNode` を足したもの |
| `() => void` / `(id: string) => void` | イベントを親に伝える関数(名前は `onXxx`) |
- `React.FC<Props>` は使わなくてよい(昔は `children` が勝手に入るなどの癖があった。今は普通の関数で書くのが主流)

## ユニオン型の props では分割代入に注意
「種類によって必要な props が違う」部品。
```tsx
type LinkOrButtonProps =
  | { variant: "link"; href: string }
  | { variant: "button"; onClick: () => void };

// ❌ 引数で分割代入: href は button のほうにないので取り出せない
function Action({ variant, href }: LinkOrButtonProps) {}
//                         ~~~~ Property 'href' does not exist

// ❌ ...rest にしても、variant との結びつきが切れて絞り込めない
function Action({ variant, ...rest }: LinkOrButtonProps) {
  if (variant === "link") return <a href={rest.href} />;
  //                                      ~~~~ エラー
}

// ✅ props のまま絞り込む
function Action(props: LinkOrButtonProps) {
  if (props.variant === "link") return <a href={props.href}>開く</a>;   // href: string
  return <button onClick={props.onClick}>押す</button>;                 // onClick がある
}
```
- **全部の種類にある項目だけ**なら、`const { kind, value } = props` と分割代入しても TypeScript が絞り込んでくれる
- 「こういうときは props のまま」の一番大事な理由がこれ → [[TypeScript_03_型の組み立て(ユニオン・リテラル・interface・type)]]

## 名前がぶつかるとき(Fragment Colocation)
GraphQL の Fragment Colocation では、親から**フラグメントの参照**(中身は見えない)を受け取り、子の中で開封して使う。受け取る名前と開封した後の名前が同じになりがち。
```tsx
// PostCard.tsx — この部品が使う項目を、部品と同じファイルに書く
export const PostCard_post = graphql(`
  fragment PostCard_post on Post {
    title
    excerpt
    author { ...AuthorBadge_user }
  }
`);

// ❌ 分割代入すると、開封した値に同じ名前を付けられない
export function PostCard({ post }: { post: FragmentType<typeof PostCard_post> }) {
  const post = useFragment(PostCard_post, post);   // エラー: post がもう宣言されている
}

// ✅ props のまま(GraphQL Codegen の例はこの形)
export function PostCard(props: { post: FragmentType<typeof PostCard_post> }) {
  const post = useFragment(PostCard_post, props.post);
  return (
    <article>
      <h2>{post.title}</h2>
      <p>{post.excerpt}</p>
      <AuthorBadge user={post.author} />   {/* 子には子のフラグメントの参照を渡すだけ */}
    </article>
  );
}

// ✅ または別名を付けて分割代入
export function PostCard({ post: postRef }: { post: FragmentType<typeof PostCard_post> }) {
  const post = useFragment(PostCard_post, postRef);
}
```
- props の名前はフラグメント名の後ろ半分にそろえる(`PostCard_post` なら `post`)のが Relay の決まり
- 部品が使う項目と props の型が1か所にまとまるので、部品を直すときにそのファイルだけ見ればよい
- 詳しく → [[GraphQL_03_Fragment Colocation(設計パターン)]] / [[GraphQL_04_Fragment Masking(データマスキング)]] / [[GraphQL_05_実装ガイド(Codegen・Apollo・Relay・gql.tada)]]

## useEffect と props
```tsx
// ❌ props ごと依存配列に入れると、どの props が変わっても動く
function Chat(props: { roomId: string; theme: string }) {
  useEffect(() => {
    const conn = connect(props.roomId);
    return () => conn.close();
  }, [props]);              // theme が変わっただけでもつなぎ直す
}

// ✅ 使う値だけを依存配列に(分割代入しておくと書きやすい)
function Chat({ roomId, theme }: { roomId: string; theme: string }) {
  useEffect(() => {
    const conn = connect(roomId);
    return () => conn.close();
  }, [roomId]);
}
```
- `props.roomId` のまま `[props.roomId]` と書いても正しく動く。ただ ESLint(react-hooks)が「`props` ごと入れるより分割代入を」と勧めてくることがある → [[React_02_フック(useState・useEffect・カスタムフック)]]

## ほかのフレームワークとの違い(混ぜないように)
| フレームワーク | props を分割代入すると |
| --- | --- |
| **React** | 何も起きない(毎回コンポーネントが呼び直されるので、いつも最新の値) |
| Solid | **更新が届かなくなる**(`props.x` のまま使うか `splitProps`) |
| Vue 3.5 以降 | `defineProps` の分割代入は更新が届く(それより前は届かなかった) |
- 「分割代入すると壊れる」という話は Solid や昔の Vue の話。React では気にしなくてよい

## まとめ
- **基本は引数で分割代入**(何を受け取るか一目で分かり、既定値も書ける)
- **ユニオン型・名前がぶつかる・props 全体を使う**ときは `props` のまま
- 既定値は分割代入で書く(`defaultProps` は関数コンポーネントでは無視される)
- チームで決めて揃えるのが一番。どちらでも動きは同じ

## 関連
- 前: [[React_05_実務(構成・性能・型・AI開発)]] / 目次: [[React]]
- [[React_01_基本(コンポーネント・JSX・props・state)]] / [[コンポーネント設計]] / [[TypeScript]] / [[GraphQL]]
- 公式: https://react.dev/learn/passing-props-to-a-component , https://react.dev/reference/react/Component#static-defaultprops , https://react.dev/blog/2024/12/05/react-19
