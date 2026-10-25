# Learning Log

Web 開発まわりの技術ノート。https://mzkeyy.github.io/learning-log/

Obsidian の「学習」フォルダを元に、Next.js(静的出力)と shadcn/ui で作り、GitHub Pages に公開している。

## 構成

| パス | 内容 |
| --- | --- |
| `content/` | 公開するノート(`scripts/sync.py` が生成。直接編集しない) |
| `pages/index.md` | トップページ兼サイトの目次。`## 分野` と表の行がサイドバーとトップのカードになる(`{{total}}` と `{{n:トピック}}` は sync 時にノート数へ置き換わる) |
| `scripts/sync.py` | Obsidian から公開用ノートをコピーし、除外ノートへの参照などを取り除く |
| `scripts/check.py` | 公開してはいけない文字列(非公開の語句・メールアドレス・電話番号・ホームフォルダのパス・API キーなど)を探す |
| `private/publish-rules.json` | 公開しないノート・語句の一覧。**git に入れない**(`.gitignore`)。形は `scripts/publish-rules.example.json` |
| `.githooks/pre-push` | push 前に、push されるコミットの追加行を `check.py` で調べ、見つかれば push を止める |
| `web/` | Next.js アプリ |
| `web/src/lib/notes.ts` | `content/` の読み込み、URL の決定、バックリンク |
| `web/src/lib/markdown.ts` | Markdown → HTML(wikilink・callout・改行・コードの色分け・目次) |
| `web/src/lib/site.ts` | `index.md` を分野・トピックの構造に変換 |
| `web/src/app/` | ページ(トップ・ノート・404)と全体の外枠 |
| `web/src/components/` | ヘッダー・サイドバー・検索・目次など。`ui/` は shadcn/ui の部品 |
| `.github/workflows/deploy.yml` | push 時に `web/` をビルドして GitHub Pages に公開 |

## 更新手順

```sh
cd ~/Projects/learning-log
python3 scripts/sync.py   # 削除した行と、前回から追加・変更・削除されたノートが表示される
git diff content/         # 変更されたノートの中身を確認する
git add -A && git commit -m "Update notes" && git push   # push 前に check.py が自動で走る
```

- `sync.py` は公開してはいけない文字列が残っていればエラーで止まる
- 公開しないノートや語句を増やすときは `private/publish-rules.json` に追加する
- 誤検出で止まったときだけ `git push --no-verify` で飛ばせる

### 別の場所に clone したとき

`private/` は git に入っていないので、`private/publish-rules.json` を作り直す(無いと sync も push もエラーで止まる)。pre-push フックも clone ごとに有効にする。

```sh
git config core.hooksPath .githooks
```

## 手元で確認する

```sh
cd web
npm install
npm run dev     # http://localhost:3000/learning-log/ (検索はビルド後のみ)
npm run build   # out/ に公開用のファイル一式と、検索用データ(out/pagefind)ができる
```
