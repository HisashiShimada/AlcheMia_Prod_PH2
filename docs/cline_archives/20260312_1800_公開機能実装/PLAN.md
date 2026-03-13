# タスク計画書: MaiML OpenData Pipeline 公開機能実装

## メタデータ
- **作成日時**: 2026-03-12 18:00
- **タスクID**: maiml-opendata-publish
- **優先度**: 高
- **推定工数**: 16〜20時間

## 1. タスク概要

`docs/MaiML_OpenData_Pipeline/` の確定仕様（`spec.md` / `db.md`）に基づき、MaiML OpenData Pipeline の**公開（Publish）・非公開（Unpublish）機能**をバックエンドに実装する。

現状はコントローラー・キュー・Worker がスタブ状態で、実際の DB 操作・bullmq ジョブ処理が未実装。本タスクでこれらを完成させる。

## 2. 目的と期待される成果

### 目的
- 実験管理者（experiment_admin）が「公開」ボタンを押すと、MaiML ファイルを解析して DB に保存できるようにする
- 「非公開」ボタンで公開データを削除できるようにする
- ポーリング API でジョブ進捗を取得できるようにする

### 期待される成果
- [ ] POST `/api/v1/projects/:projectName/publish` → bullmq ジョブ投入・202 返却
- [ ] POST `/api/v1/projects/:projectName/unpublish` → bullmq ジョブ投入・202 返却
- [ ] GET `/api/v1/projects/:projectName/publish-status` → 現在の公開状態を返却
- [ ] 公開 Worker: MaiML 解析 → 組織スキーマへ DB 一括挿入
- [ ] 非公開 Worker: maiml_asset CASCADE 削除
- [ ] Scanner Worker: 毎日0時に期限切れアセットを一括非公開（E案）
- [ ] 組織作成時に PostgreSQL スキーマを自動作成

## 3. 現状の実装状況まとめ

### 実装済み（流用可能）
| ファイル | 状態 |
|---------|------|
| `routes/projectRoutes.ts` | ✅ publish / unpublish / publish-status ルート定義済み |
| `queues/maimlPublishQueue.ts` | ✅ bullmq Queue 定義済み |
| `queues/maimlUnpublishQueue.ts` | ✅ bullmq Queue 定義済み |
| `workers/maimlUnpublishWorker.ts` | ⚠️ スタブのみ（要本実装） |
| `config/redis.ts` | ✅ bullmq 用 IORedis 接続実装済み |
| `utils/maimlParserTyped.ts` | ✅ DOM パーサー実装済み（流用可） |
| `services/storageService.ts` | ✅ Swift/S3 ファイル操作実装済み |
| `migrations/20260311_create_maiml_publish_job.sql` | ⚠️ 旧スキーマ定義（要差し替え） |

### 未実装（新規作成が必要）
| ファイル | 内容 |
|---------|------|
| `workers/maimlIngestWorker.ts` | 公開 Worker（新規） |
| `workers/maimlScannerWorker.ts` | Scanner Worker（新規） |
| `services/maimlIngestService.ts` | requestPublish / requestUnpublish（既存ファイルは別用途・要確認） |
| `repositories/maimlPublishJobRepository.ts` | publish_job テーブル CRUD（新規） |
| `repositories/maimlAssetRepository.ts` | 組織スキーマ内 maiml_asset 操作（新規） |
| 組織スキーマ作成処理 | 組織作成時のスキーマ自動作成 |

### 廃止対象（旧設計・使わない）
| 内容 | 理由 |
|-----|------|
| `migrations/20260310_create_maiml_opendata_tables.sql` の KV・registry テーブル群 | 新設計（maiml2Excel方式）に置き換え |
| `types/maimlOpenData.ts` の旧型定義 | 新設計に合わせて刷新が必要 |
| `routes/projectRoutes.ts` の publish バリデーション（template_only 等） | spec.md 確定仕様では不要なパラメータ |

---

## 4. 実装ステップ

### Phase 0: 前提整理・型定義・マイグレーション

- [ ] **0-1. 型定義刷新** (`backend/src/types/maimlOpenData.ts`)
  - 旧型定義（`MaimlPublishRegistry` / `MaimlConditionKv` 等）を削除
  - 新設計に対応した型定義を追加
    - `MaimlPublishJob` (`public.maiml_publish_job` テーブル対応)
    - `MaimlAsset` (`{schema}.maiml_asset` テーブル対応、`retention_until` 含む)
    - `MaimlInstance` / `MaimlElement` / `MaimlElementValue` / `MaimlInsertion`
    - `MaimlTemplate` / `MaimlTemplateElement` / `MaimlTemplateElementValue` / `MaimlTemplateInsertion`
    - `PublishJobData`（bullmq Worker に渡すペイロード型）
    - `UnpublishJobData`（bullmq Worker に渡すペイロード型）

- [ ] **0-2. マイグレーション作成**
  - `backend/migrations/20260312_create_maiml_opendata_new_schema.sql`（新規）
    - `public.maiml_publish_job` テーブル作成（`spec.md` §10 DDL）
    - `organization` テーブルへ `default_retention_days INT` カラム追加（`db.md` §8.1）
  - `backend/migrations/20260312_create_org_schema_tables.sql`（新規）
    - 組織スキーマ内テーブル群の DDL（`maiml_asset` / `maiml_instance` / `maiml_element` 等）
    - ※ このファイルは「スキーマ作成ユーティリティ」から実行時に動的 `search_path` で適用する

- [ ] **0-3. `routes/projectRoutes.ts` のバリデーション修正**
  - publish ルートのバリデーション（`template_only` / `store_raw_series` / `retention` 等）を削除
  - spec.md §7.2 に合わせて空ボディのみ許可

### Phase 1: DB 操作層（Repository）

- [ ] **1-1. `repositories/maimlPublishJobRepository.ts`（新規）**
  - `insert(data)` : `public.maiml_publish_job` へ INSERT
  - `updateStatus(jobId, status, opts)` : status / started_at / finished_at / error_message / asset_id を更新
  - `findLatestByProject(organizationId, projectName)` : 最新ジョブを取得（publish-status API 用）
  - `findByJobId(jobId)` : job_id で単件取得

- [ ] **1-2. `repositories/maimlAssetRepository.ts`（新規）**
  - `createSchemaIfNotExists(organizationId)` : 組織スキーマが存在しない場合は作成 + COMMENT 設定
  - `createSchemaTables(organizationId)` : `maiml_asset` / `maiml_instance` 等のテーブルを組織スキーマ内に作成
  - `findByProject(schemaName, projectName)` : `maiml_asset.file_uri` でアセット存在確認（二重公開チェック）
  - `insertAsset(schemaName, data)` : `maiml_asset` INSERT
  - `insertInstance(schemaName, data)` : `maiml_instance` INSERT
  - `insertElement(schemaName, data)` : `maiml_element` INSERT（自己参照FK対応）
  - `insertElementValue(schemaName, data)` : `maiml_element_value` INSERT
  - `insertInsertion(schemaName, data)` : `maiml_insertion` INSERT
  - `insertTemplate(schemaName, data)` : `maiml_template` INSERT
  - `insertTemplateElement(schemaName, data)` : `maiml_template_element` INSERT
  - `insertTemplateElementValue(schemaName, data)` : `maiml_template_element_value` INSERT
  - `insertTemplateInsertion(schemaName, data)` : `maiml_template_insertion` INSERT
  - `deleteAsset(schemaName, assetId)` : `maiml_asset` DELETE（CASCADE で関連データ削除）

- [ ] **1-3. `repositories/organizationRepository.ts`（修正）**
  - `findById(organizationId)` : `default_retention_days` カラムを含めて取得するメソッドを追加

### Phase 1.5: MaimlParserTyped の拡張（新 Phase・重要）

> **役割の整理**
> - `MaimlParserTyped`（+ `maiml-unified.ts` 型定義 + `maimlTypeConverter.ts`）の責務：**XML → `MaimlRoot` 型オブジェクトへの解析のみ**
> - `maimlIngestParserService`（Phase 2-2）の責務：解析済み `MaimlRoot` から各 DB テーブル用データへのマッピング
>
> **本 Phase の目的**: 現状 `maiml/data` セクション（result/material/condition インスタンスと配下の property/content/uncertainty/insertion 要素）が `MaimlRoot` 型定義・変換ロジックで未対応または不足しているため、**正しく解析できるように型と処理を追加する**。

#### 確認・修正対象ファイル

| ファイル | 確認ポイント |
|---------|------------|
| `types/maiml-unified.ts` | `MaimlRoot.data` / `DataInstance` / `Insertion`（uri/hash/uuid/format 子要素）等の型定義有無 |
| `utils/maimlTypeConverter.ts` | `data` セクションの変換ロジック（`convertData()` 等）の有無 |
| `utils/maimlParserTyped.ts` | `getDataInstances()` / `getDocumentName()` メソッドの有無 |

- [ ] **1.5-1. `types/maiml-unified.ts` の型定義を確認・追加（不足がある場合）**
  - `MaimlRoot.data` が未定義であれば `Data` 型を追加
  - `DataInstance` 型：`instance_type` / `instance_key` / `template_ref` / `properties` / `contents` / `insertions` 等
  - `Insertion` 型：`uri` / `hash` / `uuid` / `format` 子要素を含む構造
  - `Property.value` の型：文字列・数値どちらも受け取れる形になっているか確認

- [ ] **1.5-2. `utils/maimlTypeConverter.ts` の変換ロジックを確認・追加（不足がある場合）**
  - `convertXmlJsToMaimlRoot()` 内で `data` セクションの変換が未実装であれば追加
  - `convertDataInstance()` : result/material/condition インスタンスを `DataInstance` 型に変換
  - `convertInsertion()` : `<insertion>` 配下の uri/hash/uuid/format を正しく `Insertion` 型に変換

- [ ] **1.5-3. `utils/maimlParserTyped.ts` にゲッターメソッドを追加**
  - `getDocumentName()` : `maiml/document/name` テキストを取得（`maiml_asset.doc_name` 用）
  - `getDataInstances()` : `MaimlRoot.data` から全インスタンスを配列で返す

> **注意**: `maiml/eventLog` 配下は `pending.md #9` の保留事項のため、今回の拡張対象外。

### Phase 2: MaiML 解析・DB 登録サービス

- [ ] **2-1. `services/maimlPublishService.ts`（新規）**
  - `requestPublish(organizationId, projectName, userId)` : 公開ジョブ登録・bullmq 投入
    1. 組織スキーマに `maiml_asset` が既存かチェック → 存在すれば `409 Conflict` エラーを返す
    2. `public.maiml_publish_job` INSERT（`status='pending'`, `job_type='publish'`）
    3. `maimlPublishQueue.add('publish', { jobId, organizationId, projectName, fileUri, userId })`
    4. `job_id` を返す
  - `requestUnpublish(organizationId, projectName, userId)` : 非公開ジョブ登録・bullmq 投入
    1. 組織スキーマから `asset_id` を取得
    2. `public.maiml_publish_job` INSERT（`status='pending'`, `job_type='unpublish'`, `asset_id`）
    3. `maimlUnpublishQueue.add('unpublish', { jobId, organizationId, assetId, projectName, userId })`
    4. `job_id` を返す
  - `getPublishStatus(organizationId, projectName)` : 現在の公開状態とジョブ状態を返す

- [ ] **2-2. `services/maimlIngestParserService.ts`（新規）**
  - `MaimlParserTyped` で解析済みの `MaimlRoot` 型オブジェクトから、各 DB テーブル挿入用データへマッピングするサービス
  - `parseForIngest(maimlContent: string): ParsedMaimlData`
    1. `new MaimlParserTyped(maimlContent)` で XML を解析（`MaimlRoot` を取得）
    2. `parser.getDocumentName()` → `maiml_asset.doc_name` 用
    3. `parser.getDataInstances()` → `maiml_instance` 用レコード群を取得
    4. 各インスタンスの `properties` / `contents` / `uncertainty` / `insertions` を再帰走査し、`maiml_element` / `maiml_element_value` / `maiml_insertion` 用レコードに**マッピング**する
       - `hierarchy` : 親パスを引き継ぎ `"property/content/..."` 形式で生成
       - `element_type` : XML タグ名から判定（`property` / `content` / `uncertainty` / `insertion` 等）
       - `<value>` テキストのスペース区切り分割: 2要素以上 → `value_array`、1要素 → `value`
       - `parent_element_id` : INSERT 前に仮 ID を割り当て、INSERT 完了後に実 ID へ置き換え
       - `<insertion>` : uri/hash/uuid/format を `maiml_insertion` 1 レコードに集約
    5. `parser.getTemplates()` → `maiml_template` 用レコード群を取得
    6. 各テンプレートの要素を同様に再帰走査し `maiml_template_element` / `maiml_template_element_value` / `maiml_template_insertion` 用レコードにマッピング
    - 返り値: `ParsedMaimlData { docName, instances, elements, elementValues, insertions, templates, templateElements, templateElementValues, templateInsertions }`
  - `resolveRetentionUntil(organizationId: string): Promise<Date>`
    - `organization.default_retention_days` を取得して `now() + N日` を返す

### Phase 3: bullmq Worker 本実装

- [ ] **3-1. `workers/maimlIngestWorker.ts`（新規）**
  - `startMaimlIngestWorker()` : bullmq Worker 起動
  - プロセッサー本体：
    1. `maimlPublishJobRepository.updateStatus(jobId, 'running', { started_at: now() })`
    2. `storageService.downloadFile(organizationId, fileUri)` でファイル取得
    3. `maimlIngestParserService.parseForIngest(content, assetId)` で解析
    4. トランザクション内で以下を一括 INSERT：
       - `maiml_asset` (1件)
       - `maiml_instance` (N件)
       - `maiml_element` (N件、parent_element_id の自己参照を後処理)
       - `maiml_element_value` (N件)
       - `maiml_insertion` (N件)
       - `maiml_template` (N件)
       - `maiml_template_element` (N件)
       - `maiml_template_element_value` (N件)
       - `maiml_template_insertion` (N件)
    5. `maimlPublishJobRepository.updateStatus(jobId, 'done', { finished_at: now(), asset_id })`
    6. 公開完了後、`maimlUnpublishQueue.add('unpublish', { asset_id }, { delay: retention_until - now(), jobId: unpublish-${asset_id} })` で delayed Job を登録
    7. エラー時: `maimlPublishJobRepository.updateStatus(jobId, 'error', { error_message })` を更新して throw

- [ ] **3-2. `workers/maimlUnpublishWorker.ts`（スタブ → 本実装）**
  - スタブ実装を削除して本実装に置き換え
  - プロセッサー本体：
    1. `maimlPublishJobRepository.updateStatus(jobId, 'running', { started_at: now() })`
    2. 組織スキーマから `maiml_asset.asset_id` で CASCADE DELETE
    3. `maimlPublishJobRepository.updateStatus(jobId, 'done', { finished_at: now() })`
    4. エラー時: `updateStatus(jobId, 'error', { error_message })` して throw

- [ ] **3-3. `workers/maimlScannerWorker.ts`（新規）** ← E案 Scanner Worker
  - `startMaimlScannerWorker()` : bullmq Repeat Job（毎日0時）を登録して Worker 起動
  - プロセッサー本体（E案 D部分・リカバリ）：
    1. `public.organization` テーブルから全 `organization_id` を取得
    2. 各組織スキーマで `retention_until IS NOT NULL` の `maiml_asset` を取得
    3. 各アセットに対して bullmq の Job 存在確認（`maimlUnpublishQueue.getJob('unpublish-{asset_id}')`）
    4. `retention_until <= now()` かつ Job なし → 即座に unpublish ジョブを投入
    5. `retention_until > now()` かつ Job なし → delayed Job を再登録（引き直しなし）

### Phase 4: コントローラー修正

- [ ] **4-1. `controllers/projectController.ts` の `publish` 関数修正**
  - TODO コメントを削除し `maimlPublishService.requestPublish()` を呼び出す
  - 409 Conflict（二重公開禁止）のエラーハンドリングを追加
  - レスポンスを spec.md §7.2 に合わせて修正（`job_id` / `status: 'pending'` / `message`）

- [ ] **4-2. `controllers/projectController.ts` の `unpublish` 関数修正**
  - TODO コメントを削除し `maimlPublishService.requestUnpublish()` を呼び出す
  - 公開済みアセットが存在しない場合の 404 エラーハンドリングを追加
  - レスポンスを spec.md §4.1 に合わせて修正

- [ ] **4-3. `controllers/projectController.ts` の `getPublishStatus` 関数修正**
  - TODO コメントを削除し `maimlPublishService.getPublishStatus()` を呼び出す
  - spec.md §7.3 のレスポンス形式に合わせて実装

### Phase 5: 組織作成時のスキーマ自動作成

- [ ] **5-1. 組織作成処理に組織スキーマ作成を追加**
  - `services/organizationService.ts` または組織作成コントローラーを調査
  - 組織作成完了後に `maimlAssetRepository.createSchemaIfNotExists(organizationId)` を呼び出す
  - `maimlAssetRepository.createSchemaTables(organizationId)` でテーブルを作成する
  - エラー時はログに記録するが組織作成自体は続行する（証明書生成と同様の方針）

### Phase 6: server.ts への Worker 登録

- [ ] **6-1. `server.ts` 修正**
  - `startMaimlIngestWorker()` のインポートと起動を追加
  - `startMaimlScannerWorker()` のインポートと起動を追加
  - `stopMaimlIngestWorker()` / `stopMaimlScannerWorker()` を gracefulShutdown に追加

### Phase 7: テスト・確認

- [ ] **7-1. 手動テスト**
  - `POST /publish` → 202 確認 → `GET /publish-status` でポーリング → `done` 確認
  - DB の組織スキーマに `maiml_asset` / `maiml_instance` 等が挿入されていることを確認
  - `POST /unpublish` → 202 確認 → `GET /publish-status` でポーリング → `done` 確認
  - DB のレコードが CASCADE 削除されていることを確認
  - 二重公開 → 409 Conflict が返ることを確認

---

## 5. 影響範囲

### 新規作成するファイル
1. `backend/migrations/20260312_create_maiml_opendata_new_schema.sql`
2. `backend/migrations/20260312_create_org_schema_tables.sql`
3. `backend/src/repositories/maimlPublishJobRepository.ts`
4. `backend/src/repositories/maimlAssetRepository.ts`
5. `backend/src/services/maimlPublishService.ts`
6. `backend/src/services/maimlIngestParserService.ts`
7. `backend/src/workers/maimlIngestWorker.ts`
8. `backend/src/workers/maimlScannerWorker.ts`

### 変更するファイル
1. `backend/src/types/maimlOpenData.ts` — 型定義刷新
2. `backend/src/controllers/projectController.ts` — publish / unpublish / getPublishStatus の TODO 実装
3. `backend/src/routes/projectRoutes.ts` — publish バリデーション修正
4. `backend/src/workers/maimlUnpublishWorker.ts` — スタブ → 本実装
5. `backend/src/repositories/organizationRepository.ts` — findById メソッド追加
6. `backend/src/server.ts` — Worker 起動・停止追加
7. 組織作成処理（`organizationService.ts` or `organizationController.ts`） — スキーマ自動作成

---

## 6. 技術的詳細

### DB スキーマ戦略
- `public.maiml_publish_job` : 全組織共通、`public` スキーマに配置
- `{org_schema}.maiml_asset` 等 : 組織ごとのスキーマ（`organization_id` の `-` を `_` に変換）
- `asset_id` は FK なし（クロススキーマ FK 不可のため）→ アプリ側で整合性管理

### XML 解析方針
- `MaimlParserTyped`（既存 DOM パーサー）を流用
- `maiml/data` 配下 → `maiml_instance` / `maiml_element` / `maiml_element_value` / `maiml_insertion`
- `maiml/protocol` 配下 → `maiml_template` / `maiml_template_element` 等
- `<value>` テキストのスペース区切り分割ルール：
  - 2要素以上 → `value_array TEXT[]` に格納、`value` は NULL
  - 1要素 → `value TEXT` に格納、`value_array` は NULL

### bullmq E案（スケジュール非公開）
- 公開 Worker 完了時: `jobId='unpublish-{asset_id}'` で delayed Job を登録（重複防止）
- Scanner Worker（毎日0時 Repeat Job）: Job 消失リカバリのみ担当
- `retention_until` が唯一の真実（Single Source of Truth）— Job 消失しても引き直しなし

### セキュリティ考慮事項
- すべての DB 操作で `organization_id` によるスキーマ分離
- 組織スキーマ名はアプリ側で生成（SQL インジェクション対策として `replace(/-/g, '_')` のみを使用）
- `experiment_admin` 権限のみ公開・非公開操作を許可（既存 `checkPermission('040000', 1)` で対応済み）

---

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `MaimlParserTyped` の出力が新 DB 設計と合わない | 高 | 中 | `sample/XRF.maiml` で事前動作確認、解析ロジックを別サービスに分離 |
| 組織スキーマ作成の失敗 | 中 | 低 | エラーをキャッチしてログ記録・公開操作時に再試行 |
| 大容量 MaiML ファイルでのメモリ不足 | 中 | 低 | bullmq Worker が非同期処理するためリクエストタイムアウトは発生しない。ファイルサイズの上限は運用ルールで定める |
| delayed Job の消失（Redis 再起動） | 低 | 中 | Scanner Worker（E案）が毎日0時にリカバリ。Redis 永続化（AOF/RDB）設定を推奨 |
| `parent_element_id` の自己参照 FK 解決 | 中 | 高 | INSERT 順序の工夫（親を先に INSERT して ID を取得してから子を INSERT）が必要 |

---

## 8. テスト計画

### 手動テスト
- [ ] 公開 → ステータスポーリング → done 確認
- [ ] DB 組織スキーマにデータが正しく挿入されているか確認
- [ ] 二重公開で 409 Conflict が返ることを確認
- [ ] 非公開 → ステータスポーリング → done 確認・DB から CASCADE 削除されているか確認
- [ ] Scanner Worker が期限切れアセットを削除するか確認

### 確認すべき境界値
- `<value>` テキストが空の場合
- `<value>` が複数タグある場合（`value_idx=0,1,...`）
- `<value>` テキストにスペース区切りの複数値がある場合（`value_array`）
- `<insertion>` が存在しない MaiML ファイル
- `maiml/eventLog` 配下（今回は取り込み対象外・pending.md #9 保留）

---

## 9. 承認記録

- **計画書提示日時**: 2026-03-12 18:00
- **承認日時**:
- **承認者コメント**:

---

## 10. 実施記録

### 実施日時
開始: 2026-03-12 18:00
完了: 2026-03-13 08:32

### 計画からの変更点

- Phase 1.5（MaimlParserTyped 拡張）を追加: 既存パーサーで data セクションが未対応だったため
- Phase 3 で `maimlPublishWorker` に delayed Unpublish Job 自動登録を実装
- `createSchemaIfNotExists` の引数が `(organizationId, organizationCd)` の 2 引数であったため organizationService 側で対応

### 発生した問題と解決方法

1. `maimlAssetRepository.createSchemaAndTables` が存在しない
   → 正しい関数名 `createSchemaIfNotExists` + `createSchemaTables` に修正

2. `createSchemaIfNotExists` が 2 引数（organizationCd も必要）
   → organizationService で `data.organizationCd` を渡すよう修正

### 最終的な成果物

- [x] `backend/src/types/maimlOpenData.ts` - 型定義刷新
- [x] `backend/migrations/20260313_create_maiml_opendata_new_schema.sql` - 公開スキーマ DDL
- [x] `backend/migrations/20260313_create_org_schema_tables.sql` - 組織スキーマ DDL
- [x] `backend/src/repositories/maimlPublishJobRepository.ts` - ジョブ Repository
- [x] `backend/src/repositories/maimlAssetRepository.ts` - アセット Repository
- [x] `backend/src/repositories/organizationRepository.ts` - 組織 Repository 拡張
- [x] `backend/src/services/maimlPublishService.ts` - 公開サービス
- [x] `backend/src/workers/maimlPublishWorker.ts` - 公開 Worker
- [x] `backend/src/services/maimlIngestParserService.ts` - MaiML パーサーサービス
- [x] `backend/src/workers/maimlUnpublishWorker.ts` - 非公開 Worker
- [x] `backend/src/controllers/projectController.ts` - publish/unpublish/getPublishStatus 実装
- [x] `backend/src/services/organizationService.ts` - 組織作成時スキーマ自動作成追加
- [x] `backend/src/server.ts` - Worker 起動・停止登録

