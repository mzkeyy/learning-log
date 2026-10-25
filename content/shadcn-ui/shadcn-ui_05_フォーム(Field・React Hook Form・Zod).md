---
title: "shadcn/ui 05 フォーム(Field・React Hook Form・Zod)"
modified: 2026-09-29
---

実務で最も作るのがフォーム。shadcn/ui では **Field 部品 + React Hook Form(状態管理)+ Zod(検証)** が公式の定番。
(公式には他に TanStack Form 版、Formisch 版、**Next.js の Server Actions で作る版**のガイドもある)

## 構成要素
| 部品 | 役割 |
| --- | --- |
| `Field` | 1項目の入れ物。`data-invalid` でエラー表示の状態 |
| `FieldLabel` | ラベル(`htmlFor` で入力と紐づけ) |
| `FieldDescription` | 補足説明 |
| `FieldError` | エラーメッセージ |
| `FieldGroup` / `FieldSet` / `FieldLegend` | 項目のまとまり |
| `Input` / `Textarea` / `Select` / `Checkbox` など | 入力部品 |
| `InputGroup` | 入力欄+アイコン・文字数などの付属品 |

## 導入
```bash
npx shadcn@latest add field input textarea button card sonner input-group
npm install react-hook-form @hookform/resolvers zod
```

## 実装例(公式デモを簡略化)
```tsx
'use client'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import * as z from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

// ① スキーマ(ルールとエラーメッセージ)
const formSchema = z.object({
  title: z.string().min(5, 'タイトルは5文字以上').max(32, 'タイトルは32文字以内'),
  description: z.string().min(20, '説明は20文字以上').max(100, '説明は100文字以内'),
})
type FormValues = z.infer<typeof formSchema>   // 型もスキーマから自動生成

export function BugReportForm() {
  // ② フォームの状態
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: '', description: '' },
  })

  // ③ 送信(検証が通った時だけ呼ばれる)
  async function onSubmit(data: FormValues) {
    // Server Action / Server Function / API を呼ぶ
    toast.success('送信しました')
    form.reset()
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup>
        <Controller
          name="title"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="title">タイトル</FieldLabel>
              <Input {...field} id="title" aria-invalid={fieldState.invalid} autoComplete="off" />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="description"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="description">説明</FieldLabel>
              <Textarea {...field} id="description" rows={6} aria-invalid={fieldState.invalid} />
              <FieldDescription>再現手順・期待する動作・実際の動作</FieldDescription>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>
      <Button type="submit" disabled={form.formState.isSubmitting}>送信</Button>
    </form>
  )
}
```

## ポイント
- **`Controller`** で React Hook Form と入力部品をつなぐ(`field` に value・onChange などが入っている)
- `data-invalid` と `aria-invalid` でエラー時の見た目とアクセシビリティを両立
- 同じ Zod スキーマを**サーバー側の検証にも使う**(`schemas.ts` に置いて共有)→ クライアント検証は UX のため、**本当の検証はサーバー**
- 送信中はボタンを無効化(二重送信防止)
- 成功・失敗は Sonner で通知
- ブラウザ標準の検証(`required`、`type="email"`)も併用すると良い(公式注記)

## フレームワーク別のつなぎ方
| フレームワーク | 送信先 |
| --- | --- |
| Next.js | Server Action(`onSubmit` 内で呼ぶ、または `<form action>` + `useActionState`)→ [[Next.js_05_データ更新(Server Actions・フォーム)]] |
| TanStack Start | `createServerFn({ method: 'POST' }).validator(formSchema)` + `useMutation` → [[TanStack Start_03_実行モデルとServer Functions]] |
| Vite SPA | API(Cloudflare Worker など)へ fetch |

## よくある項目の部品
| 項目 | 部品 |
| --- | --- |
| メール・パスワード | `Input type="email"` / `type="password"` |
| 認証コード | `Input OTP` |
| 生年月日・予約日 | `Date Picker`(Calendar + Popover) |
| 都道府県 | `Select` または `Native Select`(スマホで使いやすい) |
| 同意 | `Checkbox` |
| ON/OFF 設定 | `Switch` |
| 検索して選ぶ | `Combobox` |

## 関連
- 前: [[shadcn-ui_04_コンポーネント地図と使い方]] / 次: [[shadcn-ui_06_レジストリ・MCP・AI開発・実務の注意]]
- 公式: https://ui.shadcn.com/docs/forms/react-hook-form , https://ui.shadcn.com/docs/components/field
