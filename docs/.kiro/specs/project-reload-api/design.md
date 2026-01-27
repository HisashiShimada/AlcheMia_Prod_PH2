# Design Document: プロジェクトリロードAPI

## Overview

**Purpose**: プロジェクト管理画面において、実験管理者（Experiment Admin）が外部変更（S3への直接アップロード、他ユーザーによる更新等）を反映するため、プロジェクトデータをリロードできる機能を提供します。本APIは、S3ストレージ上のファイルリストとfile_metadataテーブルを同期し、キャッシュをクリアすることで、最新の状態を保証します。

**Users**: 
- **実験管理者（Experiment Admin）**: プロジェクトファイルの最新状態確認、外部変更の反映
- **データ管理者（Data Admin）**: 組織全体のプロジェクトデータ管理
- **System Admin**: 全組織のプロジェクト管理、システムメンテナンス

**Impact**: 既存のGET /api/v1/projects/:id（プロジェクト詳細取得、Section 2.2）に対応するリロード機能を追加します。file_metadataテーブル、プロジェクトキャッシュに変更を加えます。

### Goals

- S3ストレージ上のファイルリストとfile_metadataテーブルの同期
- プロジェクトレベルのキャッシュクリア（detail, files, tasks）
- ファイル追加・更新・削除の検出と適切な処理（論理削除）
- マルチテナント分離の維持（organization_id必須フィルタ）
- 統一されたエラーハンドリングとログ記録
- 目標レスポンスタイム: 通常プロジェクト（≤100ファイル）で3秒以内

### Non-Goals

- プロジェクトメタデータの変更（名前、説明等）
- ファイルコンテンツの検証・処理
- リアルタイム同期（WebSocket通知）
- 非同期ジョブ処理（v1では同期処理）
- 自動リロード機能（将来の拡張）

---

## Architecture

### Existing Architecture Analysis

本機能は既存のプロジェクト管理システムを拡張します。

**現在の構成**:
- **Controller-Service-Repository 3層アーキテクチャ**: 既に確立済み
- **ProjectController**: GET /api/v1/projects/:id（詳細取得）を実装済み
- **ProjectService**: getProjectDetail()メソッドでプロジェクト詳細取得を実装
- **ProjectRepository**: データアクセス層、Kysely使用
- **StorageService**: S3/Swift統合、listFilesメソッド実装済み

**既存パターンとの統合**:
- 同じProjectController、ProjectService、ProjectRepositoryを拡張
- 既存のミドルウェアチェーン（auth → tenantIsolation → permissionCheck）を適用
- storageService.listFilesを活用してファイルリストを取得
- 統一されたレスポンス形式を踏襲

---

## Testing Strategy

### Unit Tests

**ProjectController.reload**:
- ✅ projectId抽出と検証（UUID形式）
- ✅ organizationId、userId取得
- ✅ Service層呼び出しと結果処理
- ✅ エラーハンドリング（各エラーコード別）
- ✅ レスポンス生成（200 OK）
- ✅ ログ記録の検証

**ProjectService.reloadProject**:
- ✅ 並行リロードチェック（インメモリロック）
- ✅ プロジェクト存在確認（organization_idフィルタ）
- ✅ キャッシュクリア実行
- ✅ ファイル同期処理（Three-way merge）
- ✅ タスク更新処理
- ✅ Promise.all並列実行
- ✅ サマリー集計
- ✅ エラーハンドリング（S3エラー、DBエラー）

**FileMetadataRepository.executeBatch**:
- ✅ INSERT操作（新規ファイル）
- ✅ UPDATE操作（更新ファイル）
- ✅ DELETE操作（論理削除）
- ✅ バッチ処理（複数操作）
- ✅ トランザクション管理
- ✅ organization_idフィルタ

### Integration Tests

**POST /api/v1/projects/:id/reload エンドポイント**:
- ✅ 認証成功 → リロード成功（200）
- ✅ 認証失敗 → 401エラー
- ✅ Worker権限 → 403エラー
- ✅ プロジェクト不存在 → 404エラー
- ✅ 並行リロード → 409エラー
- ✅ バリデーションエラー → 400エラー
- ✅ ファイル同期とfile_metadata更新の確認
- ✅ キャッシュクリアの確認
- ✅ タスク情報取得の確認

### E2E Tests

**プロジェクトリロードフロー**:
- ✅ ログイン → プロジェクト詳細画面 → リロードボタン → リロード成功 → サマリー表示
- ✅ S3にファイル直接アップロード → リロード → file_metadata更新確認
- ✅ リロード後、プロジェクト詳細APIで最新データ取得確認

### Performance Tests

**負荷テスト**:
- ✅ 通常プロジェクト（≤100ファイル）: レスポンスタイム<3秒
- ✅ 大規模プロジェクト（≤1000ファイル）: レスポンスタイム<10秒
- ✅ 並行リクエスト（10リクエスト）: エラー率<1%

**ストレステスト**:
- ✅ 100並行リクエスト時のエラー率<1%
- ✅ データベース接続プール枯渇の検証（最大20接続）
- ✅ S3 API制限の確認（ListObjects呼び出し頻度）

---

## Performance & Scalability

### Target Metrics

| Metric | Target | Acceptable | Measurement |
|--------|--------|-----------|-------------|
| Response Time (P50) | < 2秒 | < 3秒 | CloudWatch Logs Insights |
| Response Time (P95) | < 5秒 | < 7秒 | CloudWatch Logs Insights |
| Response Time (P99) | < 10秒 | < 15秒 | CloudWatch Logs Insights |
| Error Rate | < 1% | < 3% | CloudWatch Metrics |
| S3 List Duration | < 1秒 | < 2秒 | Application Logs |
| DB Sync Duration | < 1秒 | < 2秒 | Application Logs |

### Scaling Approach

**Horizontal Scaling**:
- ECSタスク数の自動スケーリング（CPU使用率 > 70%）
- ターゲット: 10〜50タスク
- インメモリロックは各インスタンス独立（将来Redis検討）

**Vertical Scaling**:
- 現時点では不要（CPU: 0.5vCPU、Memory: 1GBで十分）

### Caching Strategy

**現在のキャッシュ**:
- プロジェクト詳細: `project:{orgId}:{projectId}:detail`
- ファイルリスト: `project:{orgId}:{projectId}:files`
- タスクリスト: `project:{orgId}:{projectId}:tasks`

**リロード時の動作**:
- リロード前に上記3つのキャッシュをクリア
- 組織レベルキャッシュ（`project:{orgId}:list`）は保持

**将来の拡張**:
- Redisによる分散キャッシュ（複数インスタンス対応）
- organization情報のキャッシング

### Optimization Techniques

**Database**:
- Parameterized Queries（SQLインジェクション対策、クエリキャッシュ）
- バッチ処理（UNNEST使用）
- インデックス活用（organization_id、object_key、deleted_at）
- 接続プール管理（最大20接続）

**S3**:
- storageService経由の統一アクセス
- listFiles一度の呼び出しで全ファイル取得
- タイムアウト設定（5秒）

**Application**:
- Promise.allによる並列処理（ファイル同期とタスク更新）
- Three-way mergeで差分のみ更新（全削除・全挿入を回避）
- インメモリロックで不要な重複処理を防止

---

## 実装ファイル一覧

### 新規作成ファイル
なし（すべて既存ファイルへの追加）

### 変更ファイル

**Router層**:
- `backend/src/routes/projectRoutes.ts`
  - POST /api/v1/projects/:projectId/reloadエンドポイント追加
  - ミドルウェアチェーン適用

**Controller層**:
- `backend/src/controllers/projectController.ts`
  - reloadメソッド追加
  - レスポンス生成

**Service層**:
- `backend/src/services/projectService.ts`
  - reloadProjectメソッド追加
  - ファイル同期ロジック（Three-way merge）
  - 並行リロード制御（インメモリロック）

**Repository層**:
- `backend/src/repositories/fileMetadataRepository.ts`（新規作成の可能性）
  - getByProjectメソッド
  - executeBatchメソッド（INSERT/UPDATE/DELETE）

**Infrastructure層**:
- `backend/src/services/storageService.ts`
  - 変更なし（既存listFilesメソッドを使用）

---

## 参考資料

### 内部ドキュメント
- [API仕様書](../../../design/api/api_project_management.md) - セクション2.9
- [要件書](./requirements.md) - 全7要件
- [調査ログ](./research.md) - 設計決定の詳細

### 技術資料
- [PostgreSQL Transactions](https://www.postgresql.org/docs/current/tutorial-transactions.html)
- [AWS SDK for JavaScript v3 - S3 ListObjects](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/classes/listobjectsv2command.html)
- [Kysely Documentation - Transactions](https://kysely.dev/docs/examples/transactions)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)

---

## 変更履歴

| Version | Date | Description | Author |
|---------|------|-------------|--------|
| 1.0.0 | 2026-01-19 | 初版作成 | Cline (AI) |
