---
title: "Docker 03 Docker Compose(開発環境・DB・watch)"
modified: 2026-10-26
---

## Compose とは
**複数のコンテナ(アプリ・DB・キャッシュなど)を1つのファイルで定義して、まとめて起動・停止する**道具。`docker compose up` だけで開発環境が揃う。
- ファイル名は `compose.yaml`(`docker-compose.yml` も読める)
- コマンドは `docker compose`(ハイフンなし。古い `docker-compose` は v1)
- 先頭の `version:` は不要(書いても無視される)

## 開発環境の例(アプリ + PostgreSQL + Redis)
```yaml
# compose.yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgres://postgres:pass@db:5432/app   # ★ ホスト名はサービス名 db
      REDIS_URL: redis://cache:6379
    depends_on:
      db:
        condition: service_healthy     # DB が準備できてから起動
    develop:
      watch:
        - action: sync                 # ソースを変えたらコンテナにコピー(ホットリロード)
          path: ./src
          target: /app/src
        - action: rebuild              # package.json が変わったら作り直し
          path: package.json

  db:
    image: postgres:18
    environment:
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: app
    ports:
      - "5432:5432"                    # 手元の GUI ツールから見たいとき
    volumes:
      - pgdata:/var/lib/postgresql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d app"]
      interval: 5s
      retries: 10

  cache:
    image: redis:8
    ports:
      - "6379:6379"

volumes:
  pgdata:
```
```bash
docker compose up -d            # 起動(裏で)
docker compose watch            # 起動 + ファイルの変更を監視して反映
docker compose logs -f app      # ログ
docker compose exec db psql -U postgres app   # DB に入る
docker compose down             # 止めて消す(ボリュームは残る)
docker compose down -v          # ボリュームも消す(データ初期化)
```

## よく使う設定
| 設定 | 意味 |
| --- | --- |
| `image` / `build` | 既存のイメージを使う / Dockerfile から作る |
| `ports` | `ホスト:コンテナ` でポートを公開 |
| `environment` / `env_file` | 環境変数 |
| `volumes` | ボリュームやフォルダをつなぐ |
| `depends_on` + `condition: service_healthy` | 起動順と、準備ができるまで待つ |
| `healthcheck` | 準備できたかの判定 |
| `profiles` | 普段は起動しないサービス(`--profile tools` のときだけ) |
| `develop.watch` | ファイルの変更を反映(sync / rebuild / sync+restart) |

## アプリは手元、DB だけ Docker でもよい
```yaml
services:
  db:
    image: postgres:18
    environment: { POSTGRES_PASSWORD: pass, POSTGRES_DB: app }
    ports: ["5432:5432"]
    volumes: [pgdata:/var/lib/postgresql]
volumes:
  pgdata:
```
- アプリは手元で `npm run dev`(速い・デバッグしやすい)、DB・Redis・メール受信テスト(Mailpit など)だけコンテナ、という形が**一番手軽**で多い
- この場合アプリからは `localhost:5432` でつながる

## 秘密情報と設定
- `compose.yaml` に書くパスワードは**開発用の値だけ**。本番の秘密は書かない
- `.env` ファイルの値は `${VAR}` で参照できる(`.env` は git に入れない) → [[APIキー・シークレット管理]]
- 環境ごとに上書きするなら `compose.override.yaml`(自動で読まれる)や `-f` で別ファイルを重ねる

## テスト・CI での利用
- CI で同じ `compose.yaml` を使って DB を起動し、テストを回せる
- GitHub Actions なら `services:` で DB コンテナを起動する方法もある
- テストの中からコンテナを起動・破棄するなら **Testcontainers** → [[テスト_03_APIとDBのテスト(Hono・MSW・Workers)]]

## Dev Containers
- 開発環境そのもの(Node.js のバージョン・ツール・拡張機能)をコンテナにして、VS Code などから中に入って開発する
- `.devcontainer/devcontainer.json` に定義。Compose と組み合わせられる
- 新しく入った人が**クローンして開くだけ**で同じ環境になる。GitHub Codespaces でも同じ設定が使える
- AI のコーディングエージェントを**隔離した環境で動かす**のにも使われる(手元の PC のファイルや鍵に触れさせない)→ [[05_権限とセキュリティ]]

## よくあるつまずき
| 症状 | 原因・対策 |
| --- | --- |
| アプリから DB につながらない | 接続先が `localhost` になっている → サービス名(`db`)に |
| DB の準備前にアプリが起動して落ちる | `depends_on` に `condition: service_healthy` |
| ポートが使用中 | 手元で同じポートの DB が動いている → ポートを変える(`"5433:5432"`) |
| `node_modules` がおかしい | 手元のフォルダをまるごとマウントして上書きしている → ソースだけ同期 |
| ファイルの変更が反映されない | `watch` の設定、または Mac でのファイル監視の問題 |
| データを初期化したい | `docker compose down -v` |

## 関連
- 前: [[Docker_02_Dockerfile(マルチステージ・キャッシュ・安全)]] / 次: [[Docker_04_本番とデプロイ(レジストリ・脆弱性・実行先)]]
- [[PostgreSQLとDrizzle]] / [[テスト]]
- 公式: https://docs.docker.com/compose/ , https://docs.docker.com/compose/how-tos/file-watch/ , https://docs.docker.com/compose/how-tos/startup-order/ , https://containers.dev/
