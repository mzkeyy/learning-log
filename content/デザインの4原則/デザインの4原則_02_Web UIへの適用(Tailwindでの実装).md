---
title: "デザインの4原則 02 Web UI への適用(Tailwind での実装)"
modified: 2026-09-29
---

Tailwind のクラスで4原則をどう表現するかの具体例。

## 商品カード(近接・対比)
```tsx
// ✗ NG: 全部同じ間隔・同じ強さ
<div className="space-y-4 p-4 border">
  <img src={img} alt={name} />
  <p>{name}</p>
  <p>{catchCopy}</p>
  <p>{price}</p>
  <button>カートに入れる</button>
</div>

// ○ OK: 関連するものは近く(gap-1)、グループ間は離す(gap-4)、価格とボタンを強く
<div className="flex flex-col gap-4 rounded-lg border p-4">
  <img src={img} alt={name} className="aspect-square rounded-md object-cover" />
  <div className="flex flex-col gap-1">                           {/* 近接: 名前とコピーは一体 */}
    <h3 className="text-base font-semibold">{name}</h3>
    <p className="text-sm text-muted-foreground">{catchCopy}</p>  {/* 対比: 補足は控えめ */}
  </div>
  <div className="flex items-center justify-between">
    <p className="text-xl font-bold">{price}</p>                  {/* 対比: 価格は大きく太く */}
    <Button>カートに入れる</Button>                                {/* 主要アクション */}
  </div>
</div>
```

## フォーム(近接・整列)
```tsx
<form className="flex max-w-md flex-col gap-6">          {/* 項目と項目の間: 広め */}
  <div className="flex flex-col gap-2">                  {/* ラベルと入力: 近く */}
    <Label htmlFor="email">メールアドレス</Label>
    <Input id="email" type="email" />
    <p className="text-sm text-muted-foreground">ログインに使います</p>
  </div>
  <div className="flex flex-col gap-2">
    <Label htmlFor="password">パスワード</Label>
    <Input id="password" type="password" />
  </div>
  <div className="flex justify-end gap-2">               {/* 整列: ボタンは右端に揃える */}
    <Button variant="outline">キャンセル</Button>
    <Button type="submit">登録</Button>                   {/* 対比: 主要は1つだけ塗り */}
  </div>
</form>
```
- ラベルは入力欄の**上・左揃え**(スマホで読みやすく、視線が縦に流れる)
- 補足・エラーは入力欄の直下(近接)

## 一覧(整列・反復)
```tsx
<ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">   {/* グリッドで整列 */}
  {items.map((item) => <ProductCard key={item.id} {...item} />)}        {/* 同じ部品を反復 */}
</ul>
```
- 同じ種類の情報は**同じ部品**で表示(カードの作りを揃える)
- 表の数値は `text-right tabular-nums`(桁を揃える)

## ページ全体(近接・対比)
```tsx
<main className="mx-auto max-w-5xl px-4 py-16">                  {/* ページの上下は大きく */}
  <section className="flex flex-col gap-4">
    <h1 className="text-4xl font-bold tracking-tight">見出し</h1>   {/* 対比: 最大・最太 */}
    <p className="text-lg text-muted-foreground">リード文</p>
  </section>
  <section className="mt-16 flex flex-col gap-6">...</section>    {/* セクション間は広く */}
</main>
```

## 余白の目安(8px グリッド)
| 関係 | Tailwind | px |
| --- | --- | --- |
| 一体に見せる(タイトルと補足) | `gap-1` / `gap-1.5` | 4〜6 |
| 同じグループ内(ラベルと入力) | `gap-2` | 8 |
| 部品の内側 | `p-4` / `p-6` | 16〜24 |
| 項目と項目の間 | `gap-4` 〜 `gap-6` | 16〜24 |
| セクション間 | `py-16` / `mt-16` | 64 |

## ランディングページ(LP)のヒーロー
- 見出し(最大)→ サブコピー(控えめ)→ 主要ボタン(1つ、目立つ色)→ 補助リンク(控えめ)
- 中央揃えが許されるのはここ(短い要素だけ)

## 関連
- 前: [[デザインの4原則_01_近接・整列・反復・対比(詳細)]] / 次: [[デザインの4原則_03_支える基礎(余白・文字・配色・視線)]]
- [[Tailwind CSS]] / [[shadcn-ui_04_コンポーネント地図と使い方]]
