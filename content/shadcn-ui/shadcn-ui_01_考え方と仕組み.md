---
title: "shadcn/ui 01 考え方と仕組み"
modified: 2026-09-29
---

## 「これはコンポーネントライブラリではない」
公式の冒頭: **"This is not a component library. It is how you build your component library."**(部品集ではなく、自分の部品集を作る方法)

普通のライブラリ(MUI など)の問題: npm からインストール → import → デザインに合わせようとすると、ラップしたり上書きしたりの回避策だらけになる。
shadcn/ui の解決: **部品の実際のコードを手元に渡す**。変えたければファイルを直接編集する。

## 5つの原則
| 原則 | 意味 |
| --- | --- |
| **Open Code** | 部品の一番上の層(見た目・構成)は自分のコード。自由に修正できる |
| **Composition** | すべての部品が共通の組み立て方(`Card` + `CardHeader` + `CardTitle`...)。1つ覚えれば他も同じ |
| **Distribution** | 部品をファイルとして配布するスキーマ(registry)と CLI |
| **Beautiful Defaults** | 何もしなくても整った見た目、部品同士が調和 |
| **AI-Ready** | コードが手元にあり API が一貫しているので、AI が読んで・理解して・新しい部品を作れる |

## 3層構造(何が誰のものか)
```
[あなたのコード]  components/ui/button.tsx など ← 自由に編集(見た目・バリエーション)
        │ 使う
[土台ライブラリ]  Base UI / Radix UI / React Aria ← npm で更新(キーボード操作・フォーカス・ARIA)
        │
[スタイル]        Tailwind CSS + CSS 変数(デザイントークン)
```
- **アクセシビリティや複雑な挙動は土台ライブラリ**が担当 → バグ修正は依存を更新するだけで届く
- **見た目の層はあなたのもの** → 自動では更新されない(必要なら CLI の `diff` などで差分確認)
- 土台は `init` 時に選べる: `--base base`(Base UI) / `radix`(Radix UI) / `aria`(React Aria)

## 導入後に生成されるもの
```text
my-app/
├── components.json          # shadcn の設定(スタイル、パス、エイリアス、レジストリ)
├── components/
│   └── ui/
│       ├── button.tsx       # add したものが増えていく
│       └── card.tsx
├── lib/
│   └── utils.ts             # cn() 関数
└── app/globals.css          # テーマの CSS 変数(:root と .dark)
```

### cn() 関数
```ts
// lib/utils.ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```
- クラス名を条件付きで結合し、**Tailwind のクラスの衝突を後勝ちで解決**する
```tsx
<Button className={cn('w-full', isActive && 'bg-primary')} />
// 部品側の既定クラスと className が衝突しても、渡したほうが優先される
```

### バリエーション(cva)
Button などは `class-variance-authority` で見た目の種類を定義している:
```tsx
<Button>保存</Button>
<Button variant="secondary">キャンセル</Button>
<Button variant="outline" size="sm">詳細</Button>
<Button variant="destructive">削除</Button>
<Button variant="ghost" size="icon"><SettingsIcon /></Button>
<Button asChild><Link href="/login">ログイン</Link></Button>   {/* 見た目だけ Button、中身はリンク */}
```
新しい variant を足したい → `components/ui/button.tsx` の `variants` に追記するだけ。

## 他の選択肢との比較
| | shadcn/ui | MUI / Chakra など | Headless(Radix/Base UI 単体) |
| --- | --- | --- | --- |
| 導入 | コードをコピー | npm | npm |
| 見た目 | 既定あり・自由に編集 | 既定あり・上書きで調整 | 自分で全部 |
| 更新 | 自分で管理 | 自動 | 自動 |
| AI との相性 | ◎ | ○ | ○ |

## 関連
- 次: [[shadcn-ui_02_導入とCLI]]
- 公式: https://ui.shadcn.com/docs
