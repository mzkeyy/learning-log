---
title: "Docker 01 仕組み(イメージ・コンテナ・基本コマンド)"
modified: 2026-10-26
---

## 仮想マシン(VM)との違い
```
仮想マシン                         コンテナ
┌──────┐┌──────┐                 ┌──────┐┌──────┐
│ アプリ ││ アプリ │                 │ アプリ ││ アプリ │
│ ライブラリ││ライブラリ│             │ライブラリ││ライブラリ│
│ ゲストOS ││ゲストOS │  ← OS ごと    └──────┘└──────┘
└──────┘└──────┘                 コンテナの実行環境(Docker Engine)
  ハイパーバイザー                     ホストの OS(Linux カーネルを共有)
  ホストの OS / ハードウェア            ハードウェア
```
| | VM | コンテナ |
| --- | --- | --- |
| 中身 | OS まるごと | アプリと必要なライブラリだけ |
| 起動 | 数十秒〜分 | 数秒以下 |
| サイズ | GB 単位 | 数十〜数百 MB |
| 分離の強さ | 強い | VM より弱い(カーネルを共有) |
- コンテナは Linux の機能(名前空間・cgroups)で、**プロセスを隔離**しているだけ。軽い代わりに、ホストの Linux カーネルを使う
- Mac・Windows では、裏で小さな Linux の VM が動いている(Docker Desktop、OrbStack、Colima など)

## イメージのレイヤー
- イメージは**レイヤー(差分)の積み重ね**。Dockerfile の1命令が1レイヤー
- 変わっていないレイヤーは**キャッシュ**が使われ、ビルドが速い
- 同じベースイメージを使うコンテナはレイヤーを共有するので、容量も節約できる
- 命令の順番が速さに効く → [[Docker_02_Dockerfile(マルチステージ・キャッシュ・安全)]]

## タグ
```
node:24-slim
 │    └ タグ(バージョン・種類)
 └ リポジトリ名
```
| タグの例 | 意味 |
| --- | --- |
| `node:24` | Debian ベース(大きめ・道具がそろう) |
| `node:24-slim` | 必要最小限の Debian(**おすすめ**) |
| `node:24-alpine` | Alpine Linux(とても小さいが、一部のネイティブモジュールで問題が出ることがある) |
| `postgres:18` | PostgreSQL 18 |
| `latest` | 最新(**本番では使わない**。いつの間にか中身が変わる) |
- 本番はバージョンを固定する(`node:24.11-slim` や、さらに厳密にはダイジェスト `@sha256:...`)

## よく使うコマンド
| コマンド | 意味 |
| --- | --- |
| `docker run -d -p 8080:80 --name web nginx` | イメージからコンテナを起動(`-d` 裏で、`-p` ホストの 8080 → コンテナの 80) |
| `docker ps` / `docker ps -a` | 動いているコンテナ / 止まったものも |
| `docker logs -f web` | ログを見る(`-f` 流し続ける) |
| `docker exec -it web sh` | 動いているコンテナに入ってシェルを開く |
| `docker stop web` / `docker rm web` | 止める / 消す |
| `docker build -t my-app .` | Dockerfile からイメージを作る |
| `docker images` | 手元のイメージ一覧 |
| `docker pull` / `docker push` | レジストリから取得 / へ送る |
| `docker system df` / `docker system prune` | 容量の確認 / 使っていないものを掃除 |
| `docker compose up -d` | Compose で一式を起動 → 03 |

### よく使うオプション
| オプション | 意味 |
| --- | --- |
| `-e KEY=value` / `--env-file .env` | 環境変数 |
| `-v data:/var/lib/postgresql/data` | ボリュームをつなぐ(データを残す) |
| `-v $(pwd):/app` | 手元のフォルダをつなぐ(バインドマウント。開発用) |
| `--rm` | 止めたら自動で消す |
| `-it` | 対話的に(シェルなど) |

### 例: PostgreSQL を手元で動かす
```bash
docker run -d --name pg \
  -e POSTGRES_PASSWORD=pass -e POSTGRES_DB=app \
  -p 5432:5432 \
  -v pgdata:/var/lib/postgresql \
  postgres:18
```
- `pgdata` ボリュームがあるので、コンテナを消してもデータは残る
- 複数のコンテナをまとめるなら Compose のほうが楽 → [[Docker_03_Docker Compose(開発環境・DB・watch)]]

## データの置き方
| 方法 | 使う場面 |
| --- | --- |
| **ボリューム**(Docker が管理) | DB のデータなど、残したいもの |
| バインドマウント(手元のフォルダ) | 開発中のソースコードの共有 |
| tmpfs(メモリ) | 一時ファイル |
- コンテナの中に書いたファイルは、**コンテナを消すと消える**

## ネットワーク
- Compose では、サービス名がそのままホスト名になる(アプリから `postgres://db:5432/...` でつながる)
- コンテナの中の `localhost` は**そのコンテナ自身**。ホストの PC ではない(Mac・Windows からホストを指すなら `host.docker.internal`)
- `-p` で公開したポートだけが外から見える

## Docker Desktop と代わりのツール
| ツール | メモ |
| --- | --- |
| Docker Desktop | 公式。GUI つき。大きな会社での利用は有料プランが必要 |
| OrbStack(Mac) | 軽くて速い。個人利用は無料 |
| Colima(Mac / Linux) | オープンソース、CLI だけ |
| Podman | Docker 互換。デーモンなし・root なしで動かせる |
| Linux | Docker Engine を直接入れる |

## 関連
- 次: [[Docker_02_Dockerfile(マルチステージ・キャッシュ・安全)]]
- [[Docker]] / [[PostgreSQLとDrizzle_01_PostgreSQLの基本(型・制約・どこで動かすか)]]
- 公式: https://docs.docker.com/get-started/docker-concepts/the-basics/what-is-a-container/ , https://docs.docker.com/reference/cli/docker/ , https://hub.docker.com/_/node
