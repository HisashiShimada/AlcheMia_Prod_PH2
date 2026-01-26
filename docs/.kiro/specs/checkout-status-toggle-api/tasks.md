# 実装タスク: checkout-status-toggle-api

## メタデータ
- **機能名**: checkout-status-toggle-api
- **作成日時**: 2026-01-16T11:35:00+09:00
- **ステータス**: タスク生成済み
- **言語**: ja

---

## タスク概要

本実装では、既存のプロジェクト管理APIを拡張し、MAIMLファイルのチェックイン/チェックアウト機能を追加します。Routes → Controller → Serviceの既存パターンに従い、3つのエンドポイントを実装します。

**主要な実装範囲**:
- チェックアウトAPI（排他制御、前提条件チェック）
- チェックインAPI（タスク実行状態確認）
- チェックアウト状態照会API

**技術スタック**:
- Node.js 18+ / Express.js / TypeScript
- PostgreSQL 18+（既存のprojectテーブル使用）
- 新規依存なし

---

## 実装タスク

### 1. Routes層の実装

- [x] 1.1 (P) チェックアウトエンドポイントの追加
  - `projectRoutes.ts`にPOST `/projects/:projectId/checkout`を追加
  - authMiddlewareをルートに適用
  - projectIdパラメータのUUID形式バリデーション
  - projectController.checkoutハンドラを呼び出し
  - _Requirements: FR-1.1_

- [x] 1.2 (P) チェックインエンドポイントの追加
  - `projectRoutes.ts`にPOST `/projects/:projectId/checkin`を追加
  - authMiddlewareをルートに適用
  - projectIdパラメータのUUID形式バリデーション
  - projectController.checkinハンドラを呼び出し
  - _Requirements: FR-2.1_

- [x] 1.3 (P) チェックアウト状態照会エンドポイントの追加
  - `projectRoutes.ts`にGET `/projects/:projectId/checkout-status`を追加
  - authMiddlewareをルートに適用
  - projectIdパラメータのUUID形式バリデーション
  - projectController.getCheckoutStatusハンドラを呼び出し
  - _Requirements: FR-3.1_

### 2. Controller層の実装

- [x] 2.1 (P) チェックアウトハンドラの実装
  - `projectController.ts`にcheckout関数を追加
  - req.userからorganizationId、userId、projectIdを抽出
  - ProjectService.checkout()を呼び出し
  - 統一されたレスポンス形式（success, data, meta）で返却
  - エラーハンドリング（400, 401, 403, 409, 500）とステータスコードマッピング
  - requestIdによるトレーシング
  - _Requirements: FR-1.1, FR-1.2, NFR-2_

- [x] 2.2 (P) チェックインハンドラの実装
  - `projectController.ts`にcheckin関数を追加
  - req.userからorganizationId、userId、projectIdを抽出
  - ProjectService.checkin()を呼び出し
  - 統一されたレスポンス形式で返却
  - エラーハンドリング（400, 401, 403, 500）とステータスコードマッピング
  - requestIdによるトレーシング
  - _Requirements: FR-2.1, NFR-2_

- [x] 2.3 (P) チェックアウト状態照会ハンドラの実装
  - `projectController.ts`にgetCheckoutStatus関数を追加
  - req.userからorganizationId、projectIdを抽出
  - ProjectService.getCheckoutStatus()を呼び出し
  - 統一されたレスポンス形式で返却
  - エラーハンドリング（400, 401, 403, 404, 500）とステータスコードマッピング
  - _Requirements: FR-3.1, NFR-2_

### 3. Service層の実装

- [x] 3.1 チェックアウトビジネスロジックの実装
  - `projectService.ts`のProjectServiceクラスにcheckoutメソッドを追加
  - トランザクション管理（BEGIN/COMMIT/ROLLBACK）
  - SELECT ... FOR UPDATEで排他ロック取得
  - project_status != 0の前提条件チェック（AC-1.1.5）
  - project_instructionレコード存在確認（AC-1.1.6）
  - 既存チェックアウト状態確認と競合検出（AC-1.2.1）
  - 同一ユーザーによる重複チェックアウトは冪等性を保つ（AC-1.2.3）
  - checkout_status = 1に更新（AC-1.1.2）
  - organization_idフィルタによるマルチテナント分離（AC-1.1.4, AC-NFR-2.2）
  - ServiceResult<ProjectCheckoutInfo>型で結果を返却
  - _Requirements: FR-1.1, FR-1.2, NFR-1, NFR-2_

- [x] 3.2 チェックインビジネスロジックの実装
  - `projectService.ts`のProjectServiceクラスにcheckinメソッドを追加
  - トランザクション管理（BEGIN/COMMIT/ROLLBACK）
  - SELECT ... FOR UPDATEで排他ロック取得
  - project_task_detailテーブルでtask_status = 1のレコード数確認（AC-2.1.5）
  - 実行中タスクが存在する場合は400エラー（AC-2.1.5）
  - 既にチェックイン済みの場合は冪等性を保つ（AC-2.1.4）
  - checkout_status = 0に更新（AC-2.1.2）
  - organization_idフィルタによるマルチテナント分離（AC-NFR-2.2）
  - ServiceResult<ProjectCheckoutInfo>型で結果を返却
  - _Requirements: FR-2.1, NFR-1, NFR-2_

- [x] 3.3 (P) チェックアウト状態照会ビジネスロジックの実装
  - `projectService.ts`のProjectServiceクラスにgetCheckoutStatusメソッドを追加
  - projectテーブルからcheckout_status、project_name、owner_user_idを取得
  - organization_idフィルタによるマルチテナント分離（AC-NFR-2.2）
  - プロジェクトが存在しない場合は404エラー
  - ProjectCheckoutInfo型にデータを変換（スネークケース→キャメルケース）
  - ServiceResult<ProjectCheckoutInfo>型で結果を返却
  - _Requirements: FR-3.1, NFR-2_

### 4. 単体テストの実装

- [x] 4.1 (P) チェックアウト機能の単体テスト
  - チェックアウト成功パターン（AC-1.1.1, AC-1.1.2）
  - project_status = 0でのチェックアウト失敗（AC-1.1.5）
  - project_instructionレコードなしでのチェックアウト失敗（AC-1.1.6）
  - 他ユーザーがチェックアウト中での409エラー（AC-1.2.1）
  - 同一ユーザーによる重複チェックアウトでの冪等性確認（AC-1.2.3）
  - マルチテナント分離の検証（AC-1.1.4）
  - SELECT FOR UPDATE排他ロックの確認
  - プロジェクト不存在での404エラー
  - データベースエラーハンドリング
  - **実装ファイル**: `backend/tests/services/projectService.checkout.test.ts`
  - **テスト数**: 9個（全成功）
  - _Requirements: FR-1.1, FR-1.2, NFR-2_

- [x] 4.2 (P) チェックイン機能の単体テスト
  - チェックイン成功パターン（AC-2.1.1, AC-2.1.2）
  - task_status = 1のタスク存在時のチェックイン失敗（AC-2.1.5）
  - 既にチェックイン済みでの冪等性確認（AC-2.1.4）
  - マルチテナント分離の検証
  - SELECT FOR UPDATE排他ロックの確認
  - プロジェクト不存在での404エラー
  - データベースエラーハンドリング
  - **実装ファイル**: `backend/tests/services/projectService.checkout.test.ts`
  - **テスト数**: 7個（全成功）
  - _Requirements: FR-2.1, NFR-2_

- [x] 4.3 (P) チェックアウト状態照会機能の単体テスト
  - チェックアウト状態取得成功パターン（AC-3.1.1, AC-3.1.2）
  - チェックイン状態でのnull値確認（AC-3.1.3）
  - プロジェクト不存在での404エラー
  - マルチテナント分離の検証
  - データベースエラーハンドリング
  - LEFT JOIN使用確認
  - **実装ファイル**: `backend/tests/services/projectService.checkout.test.ts`
  - **テスト数**: 6個（全成功）
  - _Requirements: FR-3.1, NFR-2_

### 5. 統合テストの実装

- [ ] 5.1 チェックアウト→チェックイン完全フローテスト
  - チェックアウト実行
  - 状態照会で確認
  - チェックイン実行
  - 状態照会で確認
  - _Requirements: FR-1.1, FR-2.1, FR-3.1_

- [ ] 5.2 同時チェックアウト競合テスト
  - 複数ユーザーが同時にチェックアウト試行
  - 1人のみ成功、他は409エラー
  - FOR UPDATEロックの動作確認
  - _Requirements: FR-1.2, NFR-1_

- [ ] 5.3 タスク実行中のチェックイン失敗テスト
  - プロジェクトをチェックアウト
  - タスクを実行中に設定（task_status = 1）
  - チェックイン試行
  - 400エラーとrunningTasksCountの確認
  - _Requirements: FR-2.1_

### 6. セキュリティテストの実装

- [ ] 6.1 (P) 認証・認可テスト
  - 未認証ユーザーのアクセス拒否（401）
  - 他組織のプロジェクトへのアクセス拒否（403または404）
  - マルチテナント分離の検証
  - _Requirements: NFR-2_

- [ ] 6.2 (P) SQLインジェクション対策テスト
  - Parameterized Queryの使用確認
  - 特殊文字を含むprojectIdでの動作確認
  - _Requirements: NFR-2_

### 7. パフォーマンステスト

- [ ] 7.1 レスポンス時間測定
  - チェックアウト/チェックイン操作のレスポンス時間計測
  - 目標値（2秒以内）の達成確認
  - _Requirements: NFR-1_

### 8. ドキュメント更新

- [ ] 8.1 (P) API仕様書の更新
  - `docs/design/api/api_project_management.md`に3つのエンドポイントを追加
  - リクエスト/レスポンス形式を記載
  - エラーコード一覧を更新
  - _Requirements: NFR-4_

---

## 要件カバレッジ

### 機能要件
- **FR-1.1** (チェックアウト実行): タスク1.1, 2.1, 3.1, 4.1, 5.1
- **FR-1.2** (チェックアウト競合検出): タスク2.1, 3.1, 4.1, 5.2
- **FR-2.1** (チェックイン実行): タスク1.2, 2.2, 3.2, 4.2, 5.1, 5.3
- **FR-3.1** (状態取得): タスク1.3, 2.3, 3.3, 4.3, 5.1

### 非機能要件
- **NFR-1** (パフォーマンス): タスク3.1, 3.2, 5.2, 7.1
- **NFR-2** (セキュリティ): タスク2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 6.1, 6.2
- **NFR-3** (可用性): タスク2.1, 2.2, 2.3（エラーハンドリング）
- **NFR-4** (保守性): タスク8.1

**カバレッジ**: すべての要件（FR-1.1, FR-1.2, FR-2.1, FR-3.1, NFR-1, NFR-2, NFR-3, NFR-4）がタスクにマッピングされています。

---

## 実装順序

### フェーズ1: コア実装（タスク1-3）
1. Routes層の実装（並列実行可能）
2. Controller層の実装（並列実行可能）
3. Service層の実装（3.1と3.2は順次、3.3は並列可能）

### フェーズ2: テスト（タスク4-7）
- 単体テスト（並列実行可能）
- 統合テスト（順次実行）
- セキュリティテスト（並列実行可能）
- パフォーマンステスト（独立実行）

### フェーズ3: ドキュメント（タスク8）
- API仕様書更新（並列実行可能）

---

## 完了基準

- [ ] すべてのタスク（1.1〜8.1）が完了
- [ ] 単体テストカバレッジが70%以上
- [ ] 統合テストがすべて成功
- [ ] セキュリティテストがすべて成功
- [ ] レスポンス時間が目標値（2秒以内）を達成
- [ ] API仕様書が更新済み

---

## 次のステップ

タスクをレビューし、承認後は以下のコマンドで実装を開始してください：

```bash
# 特定のタスクを実行（推奨）
/spec-impl checkout-status-toggle-api 1.1

# 複数タスクを実行
/spec-impl checkout-status-toggle-api 1.1,1.2,1.3
```

**重要**: 実装開始前に会話履歴をクリアし、コンテキストを解放してください。
