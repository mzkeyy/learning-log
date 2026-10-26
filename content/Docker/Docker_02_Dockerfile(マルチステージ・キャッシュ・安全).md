---
title: "Docker 02 Dockerfile(マルチステージ・キャッシュ・安全)"
modified: 2026-10-26
---

## 主な命令
| 命令 | 意味 |
| --- | --- |
| `FROM` | ベースのイメージ |
| `WORKDIR` | 作業フォルダ(なければ作る) |
| `COPY` | 手元のファイルをイメージにコピー |
| `RUN` | ビルド時にコマンドを実行(パッケージのインストールなど) |
| `ENV` | 環境変数(秘密情報は入れない) |
| `ARG` | ビルド時だけの変数 |
| `EXPOSE` | 使うポートの目印(実際の公開は `-p`) |
| `USER` | 実行するユーザー |
| `CMD` | コンテナ起動時のコマンド |
| `HEALTHCHECK` | 正常に動いているかの確認方法 |

## Node.js(TypeScript)アプリの Dockerfile
```dockerfile
# syntax=docker/dockerfile:1

# ---- 1. 依存パッケージ(ビルド用) ----
FROM node:24-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

# ---- 2. ビルド ----
FROM deps AS build
COPY . .
RUN npm run build            # TypeScript → dist/

# ---- 3. 本番用の依存だけ ----
FROM node:24-slim AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev

# ---- 4. 実行用(これが最終イメージ) ----
FROM node:24-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
USER node                    # root で動かさない
EXPOSE 3000
CMD ["node", "dist/server.js"]
```
- **マルチステージ**: ビルドに使った道具(TypeScript・devDependencies・ソース)は最終イメージに入らない → 小さく・安全に
- `CMD` は配列の形(exec 形式)で書く。`node` が直接 PID 1 になり、停止のシグナル(SIGTERM)を受け取れる → 終了処理(接続を閉じる)ができる

## キャッシュを効かせる順番
```dockerfile
# ❌ ソースを1行変えるだけで npm ci からやり直し
COPY . .
RUN npm ci

# ✅ package.json が変わらない限り npm ci はキャッシュ
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
```
- **変わりにくいものを先に、変わりやすいものを後に**
- `RUN --mount=type=cache` で npm のダウンロードのキャッシュをビルドをまたいで使える(BuildKit の機能)

## .dockerignore
```
node_modules
dist
.git
.env
.env.*
*.log
coverage
Dockerfile
docker-compose*.yml
```
- **`.env` を入れない**(秘密情報がイメージに入ってしまう)
- `node_modules` を入れない(手元の OS 用にビルドされたものが混ざる。中で `npm ci` する)
- ビルドが速くなる(送るファイルが減る)

## 安全のために
| やること | 理由 |
| --- | --- |
| `USER node` など **root 以外**で実行 | 乗っ取られたときの被害を小さく |
| 秘密情報を `ENV`・`ARG`・`COPY` で入れない | イメージの履歴から読める。実行時に環境変数で渡す |
| ビルド時に秘密が要るなら `RUN --mount=type=secret` | 最終イメージに残らない(プライベートパッケージのトークンなど) |
| ベースイメージのバージョンを固定、定期的に更新 | 脆弱性の修正を取り込む |
| 小さいベースイメージ(slim・distroless) | 攻撃に使える道具が少ない |
| 脆弱性スキャン | → [[Docker_04_本番とデプロイ(レジストリ・脆弱性・実行先)]] |
→ [[APIキー・シークレット管理]] / [[Webセキュリティ対策]]

## ヘルスチェック
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
```
- アプリに `/health` を用意しておく(DB につながるかも確認するか、軽い応答だけにするかを決める)
- ECS・Kubernetes では、それぞれのヘルスチェックの設定を使うことが多い

## Next.js の場合
- `next.config` で `output: 'standalone'` にすると、実行に必要なファイルだけが `.next/standalone` に集まり、イメージが小さくなる
- 公式の example に Dockerfile がある → [[Next.js_09_デプロイ・テスト・AI開発・実務チェックリスト]]

## ビルドのコツ
| コマンド・機能 | 内容 |
| --- | --- |
| `docker build -t my-app:1.0 .` | タグを付けてビルド |
| `docker build --target build .` | 途中のステージまで(テスト用など) |
| `docker buildx build --platform linux/amd64,linux/arm64` | 複数の CPU 向け(Apple Silicon で作って x86 のサーバーで動かすとき) |
| `docker init` | 言語を聞いて Dockerfile・Compose・.dockerignore のひな形を作る |
| `docker history my-app` | どのレイヤーが大きいか |
- **Apple Silicon(arm64)の Mac で作ったイメージは、x86 のサーバーではそのまま動かない**。`--platform linux/amd64` を指定するか、CI でビルドする

## 関連
- 前: [[Docker_01_仕組み(イメージ・コンテナ・基本コマンド)]] / 次: [[Docker_03_Docker Compose(開発環境・DB・watch)]]
- [[Next.js]] / [[Hono_05_ランタイム別の動かし方とデプロイ]]
- 公式: https://docs.docker.com/build/building/multi-stage/ , https://docs.docker.com/build/building/best-practices/ , https://docs.docker.com/build/cache/ , https://docs.docker.com/build/building/secrets/
