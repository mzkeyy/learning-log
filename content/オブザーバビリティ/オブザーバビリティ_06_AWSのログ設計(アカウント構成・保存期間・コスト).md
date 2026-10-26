---
title: "オブザーバビリティ 06 AWS のログ設計(アカウント構成・保存期間・コスト)"
modified: 2026-10-26
---

ログの種類・保存先・分析ツールの一覧は [[SAA_補足_ログのまとめ(種類・保存先・分析)]] にまとめてある。このノートは、それを使って**実際のシステムで「何を・どこに・どれだけ・誰が見られるように」残すかを決める手順**。

## ログ設計で決めること
| 項目 | 問い |
| --- | --- |
| **目的** | 障害調査? セキュリティ監査? 法令対応? 利用分析? |
| **対象** | どの層のログを取るか(操作・ネットワーク・入口・アプリ・DB) |
| **形式** | アプリのログの項目と形(JSON・共通の項目) |
| **保存先** | CloudWatch Logs(すぐ見る)/ S3(長く安く) |
| **保存期間** | 種類ごとに何日・何年 |
| **アクセス権** | 誰が読めるか、誰も消せないようにするか |
| **保護** | 暗号化、改ざん防止、個人情報の扱い |
| **通知** | どのログからアラートを出すか |
| **費用** | 取り込み量・保存量の見積もりと上限 |
- 「念のため全部、無期限に」は費用が膨らみ、個人情報のリスクも増える。**目的から逆算**する

## 1. 目的ごとに必要なログ
| 目的 | 主なログ | 見る人 |
| --- | --- | --- |
| 障害調査(なぜ落ちた・遅い) | アプリのログ、ALB / API Gateway のアクセスログ、RDS のエラー・スロークエリ | 開発・運用 |
| セキュリティ監査(誰が何をした) | **CloudTrail**、Session Manager のログ、IAM Identity Center のサインイン | セキュリティ担当 |
| 攻撃・不正の検知 | WAF ログ、VPC フローログ、Route 53 Resolver クエリログ、GuardDuty の検出結果 | セキュリティ担当 |
| 法令・契約(一定期間の保存義務) | CloudTrail、アクセスログ、業務の操作履歴 | 監査対応 |
| 利用分析 | CloudFront / ALB のアクセスログ、業務イベントのログ | 企画・分析 |

## 2. アカウント構成: ログ専用アカウントに集める
```
Organizations
├─ 管理アカウント
├─ Log Archive アカウント ← ログの S3 だけを置く。普段は誰も入らない
│     └ S3(CloudTrail 組織の証跡・Config・VPC フローログ・ALB ログ…)
│        暗号化(KMS)・Object Lock・ライフサイクル
├─ Security(Audit)アカウント ← GuardDuty・Security Hub・Security Lake を集約、調査用の読み取り権限
├─ 本番アカウント     ─┐ アプリのログは各アカウントの CloudWatch Logs
├─ ステージング       │  → 長期保存分は Log Archive の S3 へ
└─ 開発               ─┘
```
- **本番アカウントが乗っ取られても、証拠のログを消されない**ようにするのが目的
- Control Tower を使うと、Log Archive と Audit のアカウント、組織の CloudTrail がはじめから用意される
- 複数アカウントの CloudWatch のログ・メトリクス・トレースを1つのアカウントから見るには **CloudWatch のクロスアカウントオブザーバビリティ**
- 個人開発・1アカウントなら、まずは「CloudTrail を S3 に + 保存期間の設定」だけでよい → [[SAA_02_IAMとセキュリティ(IAM・KMS・Organizations・WAF)]]

## 3. 層ごとに有効にするログ(典型的な Web アプリ)
```
ユーザー → CloudFront → WAF → ALB / API Gateway → ECS / Lambda → RDS
              │           │         │                    │             │
          標準ログ     WAF ログ  アクセスログ        アプリのログ   エラー・スロー
                                                     (JSON)        クエリログ
       + 全体: CloudTrail(操作)、VPC フローログ(通信)、Config(設定の変更)
```
| 層 | ログ | 有効化の目安 |
| --- | --- | --- |
| 操作 | CloudTrail(組織の証跡・全リージョン・管理イベント) | **必須** |
| 操作 | CloudTrail データイベント(S3 のオブジェクト操作・Lambda 実行) | 機密データのバケットだけ(料金がかかる) |
| 設定 | Config | 本番は推奨 |
| 入口 | CloudFront 標準ログ / ALB アクセスログ / API Gateway アクセスログ | 推奨 |
| 防御 | WAF ログ | WAF を使うなら推奨(ブロックしたものだけ残す設定も可) |
| 通信 | VPC フローログ | 推奨(S3 + Parquet で安く) |
| アプリ | Lambda / ECS の標準出力 → CloudWatch Logs | **必須** |
| DB | RDS のエラーログ・スロークエリログ(→ CloudWatch Logs) | 推奨 |
| サーバー操作 | Session Manager のセッションログ | EC2 を使うなら推奨 |

## 4. アプリのログの形を決める
全サービスで**共通の項目**を決めておくと、横断して検索できる。
```json
{
  "timestamp": "2026-10-26T12:00:00.123Z",
  "level": "INFO",
  "service": "order-api",
  "env": "prod",
  "version": "a1b2c3d",
  "requestId": "req_8f2c…",
  "traceId": "1-6541…",
  "event": "order_created",
  "userId": "u_123",
  "orderId": "o_456",
  "durationMs": 42
}
```
- 書き方の基本(レベル・残してはいけないもの)→ [[オブザーバビリティ_02_ログ(構造化ログ・レベル・個人情報)]]
- API Gateway・ALB のリクエスト ID や X-Ray のトレース ID を入れて、**入口のログとアプリのログをつなげる**

### Lambda
```ts
import { Logger } from '@aws-lambda-powertools/logger'

const logger = new Logger({ serviceName: 'order-api' })   // JSON で出る。requestId なども自動で付く

export const handler = async (event: unknown) => {
  logger.info('order created', { orderId: 'o_456' })
}
```
- **Powertools for AWS Lambda** の Logger が定番(JSON、Lambda の requestId、コールドスタートの印、サンプリング)
- Lambda 自体にも**ログの形式(JSON)とログレベル**の設定がある(`LoggingConfig`)。レベルを設定で切り替えられ、DEBUG を本番で止められる
- ロググループを自分で作って Lambda に指定すると、保存期間や暗号化を管理しやすい(自動作成だと無期限)

### ECS(Fargate)
- `awslogs` ログドライバーで標準出力を CloudWatch Logs へ(シンプル)
- 複数の送り先(CloudWatch と S3、外部の監視サービス)に分けたいなら **FireLens**(Fluent Bit)

## 5. 保存先と保存期間
| 種類 | CloudWatch Logs(すぐ検索) | S3(長期) |
| --- | --- | --- |
| アプリのログ | 14〜90日 | 必要なら1年(エクスポート / Firehose) |
| アクセスログ(ALB・CloudFront) | — | 90日〜1年 → Glacier 系へ |
| CloudTrail | 調査用に一部(90日など) | **1年以上**(要件しだいで数年)、Object Lock |
| VPC フローログ | 短期(調査時のみ) | 30〜90日 |
| WAF ログ | 短期 | 90日〜1年 |
| DEBUG ログ | 出さない or 数日 | — |
- **CloudWatch Logs の保存期間は既定で無期限**。ロググループを作ったら必ず期間を設定する
- S3 は**ライフサイクル**で Standard → Standard-IA → Glacier 系 → 削除、と自動で動かす → [[SAA_05_ストレージ(S3・EBS・EFS・FSx)]]
- 法令・社内規程の保存期間がある場合は**それを最優先**(例: アクセス記録の保存、監査証跡)

### CDK で保存期間と暗号化を決めておく
```ts
import * as logs from 'aws-cdk-lib/aws-logs'

const appLogs = new logs.LogGroup(this, 'OrderApiLogs', {
  logGroupName: '/app/prod/order-api',
  retention: logs.RetentionDays.ONE_MONTH,   // ★ 無期限にしない
  encryptionKey: logKey,                     // KMS
  removalPolicy: RemovalPolicy.RETAIN,
})
```
- ロググループの名前に**規則**を決める(`/app/<環境>/<サービス>` など)。権限やサブスクリプションをまとめて設定しやすい
- インフラをコードで管理して、ログの設定漏れを防ぐ(Config ルールで「保存期間が未設定のロググループ」を検出することもできる)

## 6. 守る(アクセス権・改ざん防止・個人情報)
| 対策 | 方法 |
| --- | --- |
| 暗号化 | CloudWatch Logs・S3 とも KMS で暗号化。鍵の利用権限で読める人を絞る |
| 読める人を絞る | IAM ポリシーをロググループ単位で。ログ専用アカウントは読み取りロールだけ |
| 消させない | S3 の **Object Lock**、バケットポリシーで削除を拒否、MFA Delete |
| 改ざんの検出 | CloudTrail の**ログファイルの整合性検証** |
| 個人情報 | アプリで出さないのが基本。CloudWatch Logs の**データ保護ポリシー**でメールアドレス・カード番号などを自動でマスク |
| 証跡の停止を検知 | CloudTrail の停止・削除を EventBridge で検知して通知 |
→ [[SAA_補足_監視と監査(CloudTrail・CloudWatch・Config)]]

## 7. ログからの通知
| やりたいこと | 方法 |
| --- | --- |
| エラーの急増 | **メトリクスフィルター**(`level = "ERROR"` を数える)→ アラーム → SNS / Chatbot |
| 普段と違う傾向 | CloudWatch Logs の異常検知、メトリクスの異常検知アラーム |
| セキュリティ上の出来事(root のログイン・証跡の停止・SG の全開放) | CloudTrail → **EventBridge** ルール → 通知 |
| 脅威の検知 | GuardDuty(ログを自分で読まなくても自動で分析)→ Security Hub |
| 別システムへリアルタイムに流す | サブスクリプションフィルター → Lambda / Firehose |
- アラートの設計(症状に対して鳴らす・鳴りすぎない)→ [[オブザーバビリティ_03_メトリクスとアラート]]

## 8. 費用を抑える
| 原因 | 対策 |
| --- | --- |
| 保存期間が無期限 | ロググループごとに設定、古いものは S3 へ |
| 取り込み量が多い | DEBUG を本番で出さない、ヘルスチェックのログを出さない、同じ内容を何重にも出さない |
| すぐ検索しないログ | CloudWatch Logs の**低頻度アクセス(Infrequent Access)クラス**(取り込みが安い代わりに一部機能が使えない)、または最初から S3 に |
| VPC フローログ | CloudWatch ではなく **S3 + Parquet** に出して Athena で分析 |
| CloudTrail データイベント | 対象のバケット・関数を絞る |
| Logs Insights・Athena の検索費用 | 時間範囲を絞る、S3 はパーティション分割・Parquet |
- 料金は主に**取り込み量(GB)+ 保存量 + 検索量**。最初に1日あたりのログ量を見積もり、Cost Explorer と予算アラートで監視する → [[SAA_09_コスト最適化(料金モデル・コスト管理)]]

## ログ設計書のひな形
| ログ | 目的 | 有効化 | 形式 | 保存先 | 保存期間 | 読める人 | 通知 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CloudTrail(組織) | 監査 | 全アカウント・全リージョン | JSON | Log Archive の S3 | 3年(Object Lock) | セキュリティ担当 | 証跡停止・root ログイン |
| ALB アクセスログ | 障害調査・分析 | 本番 | 標準 | S3 | 1年 | 開発・運用 | — |
| order-api | 障害調査 | 全環境 | JSON(共通項目) | CloudWatch Logs | 30日 | 開発・運用 | ERROR 急増 |
| VPC フローログ | 不正通信の調査 | 本番 VPC | Parquet | S3 | 90日 | セキュリティ担当 | — |
- 表にしておくと、レビューと新しいサービスを足すときの抜け漏れチェックに使える

## チェックリスト
- [ ] CloudTrail(組織の証跡・全リージョン)がログ専用アカウントの S3 に入っている
- [ ] すべてのロググループに保存期間が設定されている
- [ ] アプリのログは JSON で、共通項目(service・env・version・requestId・traceId)がある
- [ ] パスワード・トークン・個人情報がログに出ていない(データ保護ポリシーも検討)
- [ ] ログは暗号化され、削除・改ざんから守られている
- [ ] エラー急増と、重要なセキュリティ上の出来事で通知が来る
- [ ] 1日あたりのログ量と月の費用を把握している
- [ ] 障害時に「入口のログ → アプリのログ → DB のログ」を ID でたどれる

## 関連
- 前: [[オブザーバビリティ_05_道具と実装(Sentry・Cloudflare・AWS)]] / 目次: [[オブザーバビリティ]]
- [[SAA_補足_ログのまとめ(種類・保存先・分析)]] / [[SAA_補足_監視と監査(CloudTrail・CloudWatch・Config)]] / [[AWS SAA]]
- 参考: https://docs.aws.amazon.com/prescriptive-guidance/latest/logging-monitoring-for-application-owners/introduction.html , https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/WhatIsCloudWatchLogs.html , https://docs.aws.amazon.com/lambda/latest/dg/monitoring-cloudwatchlogs-advanced.html , https://docs.powertools.aws.dev/lambda/typescript/latest/core/logger/ , https://docs.aws.amazon.com/controltower/latest/userguide/what-is-control-tower.html
