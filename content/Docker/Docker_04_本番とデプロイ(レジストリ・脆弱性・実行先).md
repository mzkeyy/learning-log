---
title: "Docker 04 本番とデプロイ(レジストリ・脆弱性・実行先)"
modified: 2026-10-26
---

## 本番までの流れ
```
git push ─▶ CI: テスト ─▶ docker build ─▶ 脆弱性スキャン ─▶ レジストリへ push(タグ = コミットの SHA)
                                                              │
                                                              ▼
                                        実行先(ECS / Cloud Run など)が新しいイメージで入れ替え
```
→ [[Cicdパイプライン]]

## レジストリ
| レジストリ | 向く場面 |
| --- | --- |
| **Amazon ECR** | AWS(ECS・Lambda・EKS)にデプロイ |
| Google Artifact Registry | Cloud Run・GKE |
| **GitHub Container Registry(GHCR)** | GitHub Actions からそのまま push |
| Docker Hub | 公開イメージ。無料枠は pull の回数制限あり |

### タグの付け方
- **コミットの SHA**(`my-app:3f2a1c9`)を付けると、どのコードのイメージかがわかり、戻すのも簡単
- `latest` だけで運用しない(どれが動いているかわからなくなる)
- ECR はタグの上書きを禁止(イミュータブル)にできる

### GitHub Actions でビルドして push
```yaml
- uses: docker/setup-buildx-action@v3
- uses: docker/login-action@v3
  with:
    registry: ghcr.io
    username: ${{ github.actor }}
    password: ${{ secrets.GITHUB_TOKEN }}
- uses: docker/build-push-action@v6
  with:
    push: true
    tags: ghcr.io/${{ github.repository }}:${{ github.sha }}
    cache-from: type=gha
    cache-to: type=gha,mode=max
```
- AWS へは OIDC で一時的な認証情報を取得する(長期のアクセスキーを GitHub に置かない)→ [[SAA_02_IAMとセキュリティ(IAM・KMS・Organizations・WAF)]]

## 脆弱性とイメージの中身
| 道具 | 内容 |
| --- | --- |
| **Docker Scout** | `docker scout cves my-app` でイメージ内のパッケージの脆弱性を確認 |
| Trivy | オープンソースのスキャナー。CI に入れやすい |
| ECR のスキャン | push 時に自動でスキャン |
| SBOM | イメージに入っているソフトウェアの一覧(`docker buildx build --sbom=true`) |
- ベースイメージを**定期的に更新**して作り直す(Dependabot・Renovate で Dockerfile の `FROM` も更新できる)
- 重大な脆弱性があればビルドを失敗させる設定にする

## どこで動かすか
| 実行先 | 特徴 | 向く場面 |
| --- | --- | --- |
| **AWS ECS on Fargate** | サーバー管理なしでコンテナを常駐。ALB と組み合わせ | AWS で Web アプリ・API |
| AWS Lambda(コンテナイメージ) | リクエスト時だけ動く。最大 10GB のイメージ | 処理が短い・アクセスがまばら |
| **Google Cloud Run** | リクエストに応じて 0 台から自動で増減。設定が簡単 | 手軽にコンテナを公開したい |
| Fly.io / Railway / Render | PaaS。Git 連携で簡単 | 個人開発・小規模 |
| Cloudflare Containers | Workers から呼び出すコンテナ | Workers では動かない処理(重いライブラリ・他言語) |
| Kubernetes(EKS・GKE) | 大規模・細かい制御。運用が重い | 多数のサービス・専任チーム |
| VM(EC2)+ Docker | 自分で全部管理 | 特殊な要件 |
- **まずはマネージドなもの**(Fargate・Cloud Run)から。Kubernetes は必要になってから
- AWS のコンテナの選び方 → [[SAA_04_コンピューティング(EC2・Auto Scaling・Lambda・コンテナ)]]

## 本番で守ること(The Twelve-Factor App の考え方)
| 原則 | 実践 |
| --- | --- |
| 設定は環境変数 | DB の接続先・API キーは実行時に渡す(Secrets Manager・Parameter Store から注入) |
| 使い捨て | いつ止められても大丈夫に。SIGTERM を受けたら処理中のリクエストを終えて終了 |
| 状態を持たない | セッション・アップロードファイルはコンテナの外(DB・Redis・S3)へ |
| ログは標準出力 | 収集は実行環境に任せる → [[オブザーバビリティ_06_AWSのログ設計(アカウント構成・保存期間・コスト)]] |
| ビルドと実行を分ける | 同じイメージをステージング → 本番へ。環境ごとに作り直さない |

### 終了処理の例(Node.js)
```ts
const server = app.listen(3000)
process.on('SIGTERM', () => {
  server.close(() => {          // 新しい接続を受けず、処理中のものを終えてから
    pool.end().then(() => process.exit(0))
  })
})
```

## マイグレーションはどこで
- アプリのコンテナとは別に、**デプロイ前に1回だけ**実行するタスクにする(ECS の単発タスク、Cloud Run Jobs、CI のジョブ)→ [[PostgreSQLとDrizzle_03_マイグレーション(drizzle-kit・安全な変更)]]

## AI とコンテナ
- AI のコーディングエージェントや、AI が生成したコードを**コンテナの中で実行**すると、手元の PC を守れる(Dev Containers・サンドボックス)
- Dockerfile も AI に書かせやすいが、**root 実行・秘密情報の焼き込み・`latest` の使用・`.dockerignore` の漏れ**を確認する

## チェックリスト
- [ ] マルチステージで、本番イメージにソース・devDependencies・ビルド道具が入っていない
- [ ] root 以外のユーザーで動く
- [ ] `.env`・秘密情報がイメージに入っていない(`.dockerignore`・実行時に注入)
- [ ] ベースイメージのバージョンを固定し、定期的に更新している
- [ ] 脆弱性スキャンを CI で回している
- [ ] タグはコミットの SHA。前のバージョンにすぐ戻せる
- [ ] SIGTERM で正しく終了する。ヘルスチェックがある
- [ ] ログは標準出力、データはコンテナの外

## 関連
- 前: [[Docker_03_Docker Compose(開発環境・DB・watch)]] / 目次: [[Docker]]
- [[AWS SAA]] / [[Cicdパイプライン]] / [[オブザーバビリティ]]
- 公式: https://docs.docker.com/scout/ , https://docs.docker.com/build/ci/github-actions/ , https://12factor.net/ , https://docs.aws.amazon.com/AmazonECS/latest/developerguide/AWS_Fargate.html , https://cloud.google.com/run/docs
