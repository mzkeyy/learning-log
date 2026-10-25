# Learning Log

Web 開発まわりの技術ノート。https://mzkeyy.github.io/learning-log/

Obsidian の「学習」フォルダを元に、[Quartz](https://quartz.jzhao.xyz/) v4.5.2 で GitHub Pages に公開している。

## 構成

| パス | 内容 |
| --- | --- |
| `content/` | 公開するノート(`scripts/sync.py` が生成。直接編集しない) |
| `pages/index.md` | トップページ |
| `scripts/sync.py` | Obsidian から公開用ノートをコピーし、除外ノートへの参照などを取り除く |
| `quartz.config.ts` / `quartz.layout.ts` | Quartz の設定 |
| `.github/workflows/deploy.yml` | push 時に Quartz を取得してビルドし、GitHub Pages に公開 |

## 更新手順

```sh
cd ~/Projects/learning-log
python3 scripts/sync.py   # 削除した行が表示される。公開してはいけない文字列が残っていればエラーで止まる
git diff --stat
git add -A && git commit -m "Update notes" && git push
```

公開しないノートを増やすときは `scripts/sync.py` の `EXCLUDE` に追加する。
