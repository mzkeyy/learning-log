---
title: "shadcn/ui 04 コンポーネント地図と使い方"
modified: 2026-09-29
---

## 全コンポーネント(2026年9月時点・約60種)
| 分類 | コンポーネント |
| --- | --- |
| **フォーム・入力** | Field, Button, Button Group, Input, Input Group, Input OTP, Textarea, Checkbox, Radio Group, Select, Native Select, Switch, Slider, Calendar, Date Picker, Combobox, Label |
| **レイアウト・ナビ** | Accordion, Breadcrumb, Navigation Menu, Sidebar, Tabs, Separator, Scroll Area, Resizable |
| **オーバーレイ** | Dialog, Alert Dialog, Sheet, Drawer, Popover, Tooltip, Hover Card, Context Menu, Dropdown Menu, Menubar, Command |
| **フィードバック** | Alert, Toast, Sonner, Progress, Spinner, Skeleton, Badge, Empty |
| **表示・メディア** | Avatar, Card, Table, Data Table, Chart, Carousel, Aspect Ratio, Typography, Item, Kbd |
| **その他** | Collapsible, Toggle, Toggle Group, Pagination, Direction |
```bash
npx shadcn@latest add button card dialog sheet dropdown-menu sonner field input
```

## どれを使う?(迷いやすいもの)
| やりたいこと | 使う部品 |
| --- | --- |
| 画面中央のモーダル(フォーム・詳細) | **Dialog** |
| 「本当に削除しますか?」 | **Alert Dialog**(キャンセルしやすい確認) |
| 横からスライドするパネル(スマホのメニュー、フィルター) | **Sheet** |
| 下から出るパネル(スマホ向け) | **Drawer** |
| ボタンを押すと出るメニュー | **Dropdown Menu** |
| 右クリックメニュー | **Context Menu** |
| 小さな吹き出しで説明 | **Tooltip**(ホバー)/ **Popover**(クリック、中に操作を入れられる) |
| 検索付きの選択 | **Combobox**、コマンドパレットなら **Command** |
| 保存完了などの一時的な通知 | **Sonner**(トースト) |
| 画面内に常に出す注意 | **Alert** |
| 読み込み中 | **Skeleton**(形のあるプレースホルダ)/ **Spinner** |
| データがない時 | **Empty** |
| 並べ替え・絞り込み・ページングのある表 | **Data Table**(Table + TanStack Table) |
| 管理画面の左メニュー | **Sidebar** |
| 選択肢が少ない | Radio Group / 多い → Select / さらに多い・検索 → Combobox |

## 基本の書き方(Composition)
部品は「親 + 子パーツ」の組み立て式。
```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

<Card className="max-w-sm">
  <CardHeader>
    <CardTitle>プロジェクト概要</CardTitle>
    <CardDescription>最近のアクティビティ</CardDescription>
  </CardHeader>
  <CardContent>本文</CardContent>
  <CardFooter><Button>詳細を見る</Button></CardFooter>
</Card>
```

### Dialog
```tsx
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
<Dialog>
  <DialogTrigger asChild><Button>プロフィール編集</Button></DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>プロフィール編集</DialogTitle>
      <DialogDescription>変更して保存してください</DialogDescription>
    </DialogHeader>
    {/* フォーム */}
    <DialogFooter><Button type="submit">保存</Button></DialogFooter>
  </DialogContent>
</Dialog>
```
- `DialogTitle` は必須(スクリーンリーダー用。見せたくなければ視覚的に隠す)
- 開閉を自分で制御: `<Dialog open={open} onOpenChange={setOpen}>`

### Dropdown Menu
```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal /></Button></DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuLabel>操作</DropdownMenuLabel>
    <DropdownMenuItem onClick={onEdit}>編集</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem className="text-destructive" onClick={onDelete}>削除</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### Sonner(トースト通知)
```tsx
// layout で1回だけ
import { Toaster } from '@/components/ui/sonner'
<body>{children}<Toaster /></body>
// どこからでも
import { toast } from 'sonner'
toast.success('保存しました')
toast.error('保存に失敗しました')
```

### Data Table
- Table(見た目)+ **TanStack Table**(並べ替え・絞り込み・ページング・行選択のロジック)の組み合わせ
- 公式ガイドは「列定義 `columns.tsx` → `data-table.tsx` → ページ」の順に段階的に機能を足す構成
- データ件数が多い場合はサーバー側でページングする

## `asChild` パターン
Trigger や Button に `asChild` を付けると、**見た目・振る舞いを子要素に移す**(余計な `<button>` を増やさない)。
```tsx
<Button asChild><Link href="/login">ログイン</Link></Button>
```

## アイコン
既定は **lucide-react**(`import { Settings } from 'lucide-react'`)。

## ブロック(Blocks)
ログイン画面・ダッシュボード・サイドバーなど**画面単位の組み合わせ**が公式サイトの Blocks ページ(ui.shadcn.com/blocks)で公開されている。ゼロから組むより速い。

## アクセシビリティで気をつけること
- 土台ライブラリがキーボード操作・フォーカス管理・ARIA を担当してくれるが、**ラベル・alt・タイトル**は自分で書く
- アイコンだけのボタンには `aria-label` または `<span className="sr-only">設定</span>`
- 色だけで状態を伝えない(アイコン・文言も)

## 関連
- 前: [[shadcn-ui_03_テーマ・デザイントークン・ダークモード]] / 次: [[shadcn-ui_05_フォーム(Field・React Hook Form・Zod)]]
- [[デザインの4原則]] / [[UXデザイン]]
- 公式: https://ui.shadcn.com/docs/components
