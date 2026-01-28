# 調査と設計決定

---
**目的**: 技術設計に情報を提供する発見事項、アーキテクチャ調査、および根拠を記録する。
---

## 概要
- **機能**: `task-status-update-api`
- **調査範囲**: 拡張（既存プロジェクト管理APIへのエンドポイント追加）
- **主要な発見事項**:
  - 既存APIは一貫したパターンに従っている: Route → Controller → Service → Repository
  - ステータス遷移ルールには検証が必要（pending→in_progress, in_progress→completed/forced_terminated）
  - 同時ステータス更新には楽観的ロックが必要（update_atタイムスタンプチェックを使用）

## 調査ログ

### 既存APIアーキテクチャパターン

- **コンテキスト**: 一貫性のために現在の実装パターンを理解する必要がある
- **参照したソース**: 
  - `backend/src/routes/projectRoutes.ts`
  - `backend/src/controllers/projectController.ts`
  - `backend/src/services/projectService.ts`
- **発見事項**:
  - 一貫したミドルウェアチェーン: `authMiddleware` → `permissionCheck`（オプション）→ コントローラーハンドラー
  - コントローラーでの正規表現パターンを使用したUUID検証
  - サービス層は成功/エラー構造を持つ `ServiceResult<T>` を返す
  - サービス層での `pool.connect()` と `BEGIN/COMMIT/ROLLBACK` を使用したトランザクション管理
  - エラーコードは命名規則に従う: `CATEGORY_SPECIFIC_ERROR`
- **影響**: 新しいエンドポイントは一貫性のために同じパターンに従うべき

### データベーススキーマ分析

- **コンテキスト**: ステータス更新のためのproject_taskテーブル構造を理解する
- **参照したソース**: 
  - `docs/design/db/db_table_list.md`（要件で参照）
  - 既存のサービス実装（projectService.ts）
- **発見事項**:
  - `project_task` テーブルのカラム: task_id, task_status, assign_user_id, started_at, completed_at, update_at
  - ステータス値: 0=pending, 1=in_progress, 2=failed, 3=completed（getProjectTasks実装に基づく）
  - 追加が必要: 4=forced_terminated（要件のための新しいステータス）
  - `update_at` フィールドが存在し、タイムスタンプ追跡に使用されている
- **影響**: 
  - 新しい値4（forced_terminated）を持つ既存のステータスフィールドを使用
  - 楽観的ロックのためにupdate_atを活用
  - in_progressへの遷移時にstarted_atを更新（nullの場合）
  - completedまたはforced_terminatedへの遷移時にcompleted_atを更新

### ステータス遷移ルール

- **コンテキスト**: 要件は有効なステータス遷移を指定している
- **発見事項**:
  - 有効な遷移:
    - `pending` (0) → `in_progress` (1)
    - `in_progress` (1) → `completed` (3)
    - `in_progress` (1) → `forced_terminated` (4)
  - その他の遷移はすべて400 Bad Requestで拒否すべき
- **影響**: 更新前にサービス層で検証ロジックが必要

### 同時実行制御戦略

- **コンテキスト**: 要件は同時更新の処理を指定している（409 Conflict）
- **検討した代替案**:
  1. **update_atを使用した楽観的ロック**: 更新前にupdate_atが変更されていないことを確認
  2. **FOR UPDATEを使用した悲観的ロック**: トランザクション中に行をロック
  3. **バージョン番号**: 専用のバージョンカラムを追加
- **選択したアプローチ**: update_atタイムスタンプを使用した楽観的ロック
- **根拠**: 
  - 既存のカラムが利用可能（update_at）
  - 読み取り中心のワークロードでのパフォーマンスが優れている
  - 既存のチェックアウト/チェックイン実装パターンと一致
- **トレードオフ**: 
  - 利点: 追加のデータベースカラム不要、ロック競合が少ない
  - 妥協点: クライアントは409を処理してリトライする必要がある

## アーキテクチャパターン評価

| 選択肢 | 説明 | 強み | リスク/制限 | 備考 |
|--------|-------------|-----------|---------------------|-------|
| レイヤードアーキテクチャ（現行） | Route → Controller → Service → Repository | 関心事の明確な分離、テスト可能 | この拡張においてなし | 既存のprojectRoutesパターンと整合 |
| 直接Controller → DB | 単純な更新のためサービス層をスキップ | 実装が速い | 既存パターンに違反、テストが困難 | 推奨しない |

## 設計決定

### 決定: 同時実行制御に楽観的ロックを使用

- **コンテキスト**: 複数のワーカー/管理者が同じタスクのステータスを同時に更新しようとする可能性がある
- **検討した代替案**:
  1. update_atチェックを使用した楽観的ロック
  2. 悲観的ロック（FOR UPDATE）
  3. 同時実行制御なし（最後の書き込みが優先）
- **選択したアプローチ**: 楽観的ロック - UPDATE文のWHERE句に現在のupdate_atを含める
- **根拠**: 
  - projectServiceの既存のチェックアウト/チェックインパターンと一致
  - 悲観的アプローチよりロック競合が少ない
  - タスクステータス更新は頻度が低いため競合はまれ
- **トレードオフ**: 
  - 利点: パフォーマンスが良い、デッドロックリスクがない
  - 妥協点: クライアントは409 Conflictを処理してリトライする必要がある
- **フォローアップ**: 本番環境ログで競合率を監視

### 決定: サービス層でステータス遷移を検証

- **コンテキスト**: 要件は厳格なステータス遷移ルールを指定している
- **選択したアプローチ**: サービス層は更新前にcurrent_status → new_statusの遷移を検証
- **根拠**: 
  - ビジネスロジックはサービス層に属する
  - データベースレベルで無効な状態遷移を防止
  - 無効な遷移に対して明確なエラーメッセージを提供
- **トレードオフ**: 
  - 利点: ビジネスルールを強制、明確なエラーハンドリング
  - 妥協点: 現在のステータスを確認するための追加のSELECTクエリ

### 決定: ステータス更新にPUTメソッドを使用

- **コンテキスト**: ステータス更新エンドポイントのAPI設計決定
- **検討した代替案**:
  1. PUT /api/v1/tasks/:taskId/status
  2. PATCH /api/v1/tasks/:taskId
  3. POST /api/v1/tasks/:taskId/status
- **選択したアプローチ**: PUT /api/v1/tasks/:taskId/status
- **根拠**: 
  - PUTは完全なリソース置換用（statusフィールド）
  - RESTful規約と一致
  - 意図が明確（特にステータスの更新）
- **トレードオフ**: PUTは冪等性があり、我々のユースケースに適合

### 決定: experiment_workerは自分のタスクのみ更新可能

- **コンテキスト**: 要件は異なるロールの権限ルールを指定している
- **選択したアプローチ**: 
  - experiment_worker: assign_user_id = userIdのタスクのみ更新可能
  - experiment_admin/system_admin: 組織内の任意のタスクを更新可能
- **根拠**: 最小権限のセキュリティ原則
- **実装**: 更新前にサービス層でassign_user_idをチェック

## リスクと軽減策

- **リスク1**: 同時ステータス更新によるデータ不整合
  - 軽減策: update_atタイムスタンプチェックを使用した楽観的ロック
- **リスク2**: 無効なステータス遷移によるワークフローの破損
  - 軽減策: 更新前にサービス層での厳格な検証
- **リスク3**: experiment_workerが他のワーカーのタスクを更新
  - 軽減策: experiment_workerロールのためのサービス層でのassign_user_idチェック

## 参考資料

- [API設計ポリシー](../../.clinerules/development/api.md) - RESTful API設計原則
- [バックエンド規約](../../.clinerules/development/backend.md) - サービス/コントローラーパターン
- [セキュリティポリシー](../../.clinerules/development/security.md) - マルチテナント分離ルール
- [プロジェクト管理API](../../docs/design/api/api_project_management.md) - 既存APIリファレンス
- [データベース構造](../../.clinerules/references/db_structure.md) - データベーススキーマリファレンス