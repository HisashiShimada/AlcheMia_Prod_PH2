# 実装タスク: 問題報告機能

## メタデータ
- **作成日**: 2026-02-04
- **仕様ID**: issue-report
- **言語**: 日本語
- **生成モード**: 並列実行対応
- **推定総工数**: 約12-15時間

---

## 要件カバレッジ

### カバーする要件ID
- REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007, REQ-008, REQ-009, REQ-010, REQ-011, REQ-012, REQ-013, REQ-014

すべての要件が実装タスクにマッピングされています。

---

## タスク一覧

### 1. データベース定義と初期セットアップ (P)

**推定工数**: 2-3時間  
**並列実行**: 可能（他タスクと独立）  
**カバーする要件**: REQ-001, REQ-002, REQ-003

#### 1.1 issuesテーブル作成 (P)
- [x] マイグレーションファイル `20260204_create_issues_table.sql` を作成する
- [x] テーブル定義：
  - id (UUID, 主キー)
  - organization_id (UUID, 外部キー, NOT NULL)
  - project_id (UUID, 外部キー, NOT NULL)
  - task_detail_id (UUID, 外部キー, NULL)
  - reporter_id (UUID, 外部キー, NOT NULL)
  - title (VARCHAR(200), NOT NULL)
  - description (TEXT, NOT NULL)
  - issue_type (VARCHAR(50), NOT NULL)
  - severity (VARCHAR(20), NOT NULL)
  - status (VARCHAR(20), NOT NULL, DEFAULT 'open')
  - assignee_id (UUID, 外部キー, NULL)
  - created_at (TIMESTAMP, NOT NULL, DEFAULT CURRENT_TIMESTAMP)
  - updated_at (TIMESTAMP, NOT NULL, DEFAULT CURRENT_TIMESTAMP)
- [x] インデックス作成：
  - organization_id + project_id 複合インデックス
  - reporter_id インデックス
  - status インデックス
  - created_at インデックス
- [x] 外部キー制約設定
- [x] CHECK制約追加（issue_type, severity, status）

#### 1.2 マイグレーション実行確認
- [x] ローカル環境でマイグレーション実行を確認する
- [x] テーブル作成とインデックス作成が正常に完了することを確認する
- [x] 外部キー制約が正しく機能することを確認する
- [x] マイグレーションテストファイルを作成（TDD: RED）
- [x] マイグレーション実行手順ドキュメントを作成

---

### 2. バックエンドAPI実装 - リポジトリ層

**推定工数**: 2-3時間  
**依存**: タスク1（データベース定義）  
**カバーする要件**: REQ-001, REQ-002, REQ-003, REQ-005, REQ-006, REQ-007, REQ-008

#### 2.1 IssueRepositoryインターフェース定義
- [x] `backend/src/types/issue.ts` を作成する
- [x] Issue型定義（すべてのフィールドを含む）
- [x] NewIssue型定義（作成時のフィールド）
- [x] IssueUpdateData型定義（更新可能フィールド）
- [x] IssueQueryParams型定義（検索パラメータ）

#### 2.2 IssueRepository実装
- [x] `backend/src/repositories/issueRepository.ts` を作成する
- [x] `create()` メソッド実装（問題報告作成）
- [x] `findById()` メソッド実装（ID検索）
- [x] `findByOrganization()` メソッド実装（組織別一覧取得、フィルタ・ソート対応）
- [x] `findByProject()` メソッド実装（プロジェクト別一覧取得）
- [x] `update()` メソッド実装（問題情報更新）
- [x] `updateStatus()` メソッド実装（ステータス更新）
- [x] `updateAssignee()` メソッド実装（担当者割当）
- [x] `delete()` メソッド実装（論理削除または物理削除）
- [x] すべてのクエリに organization_id フィルタを含める

---

### 3. バックエンドAPI実装 - サービス層

**推定工数**: 2-3時間  
**依存**: タスク2（リポジトリ層）  
**カバーする要件**: REQ-004, REQ-005, REQ-006, REQ-007, REQ-008, REQ-010, REQ-011

#### 3.1 IssueService基本機能実装
- [x] `backend/src/services/issueService.ts` を作成する
- [x] `createIssue()` メソッド実装：
  - バリデーション（必須項目、文字数制限）
  - プロジェクト存在確認
  - タスク詳細存在確認（指定時）
  - 問題報告作成
- [x] `getIssueById()` メソッド実装：
  - 問題取得
  - 権限確認（同一組織）
- [x] `listIssues()` メソッド実装：
  - フィルタリング（プロジェクト、ステータス、重要度、タイプ、担当者）
  - ソート（作成日時、更新日時、重要度）
  - ページネーション
- [x] エラーハンドリング（NotFoundError, ValidationError）

#### 3.2 IssueService更新・削除機能実装
- [x] `updateIssue()` メソッド実装：
  - 更新権限確認（報告者または管理者）
  - バリデーション
  - 問題情報更新
- [x] `updateIssueStatus()` メソッド実装：
  - ステータス遷移バリデーション
  - ステータス更新
- [x] `assignIssue()` メソッド実装：
  - 担当者存在確認
  - 担当者更新
- [x] `deleteIssue()` メソッド実装：
  - 削除権限確認（報告者または管理者）
  - 問題削除

---

### 4. バックエンドAPI実装 - コントローラ・ルート層 (P)

**推定工数**: 1-2時間  
**依存**: タスク3（サービス層）  
**カバーする要件**: REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007, REQ-008

#### 4.1 IssueController実装
- [x] `backend/src/controllers/issueController.ts` を作成する
- [x] `create()` ハンドラ実装（POST /api/v1/issues）
- [x] `getById()` ハンドラ実装（GET /api/v1/issues/:id）
- [x] `list()` ハンドラ実装（GET /api/v1/issues）
- [x] `updateStatus()` ハンドラ実装（PATCH /api/v1/issues/:id/status）
- [x] `addComment()` ハンドラ実装（POST /api/v1/issues/:id/comments）
- [x] 統一されたレスポンス形式で返却
- [x] TDDで12個のテストを実装し、全テスト成功

#### 4.2 ルート定義 (P)
- [x] `backend/src/routes/issueRoutes.ts` を作成する
- [x] 問題報告エンドポイント定義
- [x] ミドルウェアチェーン設定（auth, tenantIsolation, permissionCheck）
- [x] `server.ts` にルート登録

---

### 5. バックエンド統合テスト

**推定工数**: 2-3時間  
**依存**: タスク4（コントローラ・ルート層）  
**カバーする要件**: All

#### 5.1 統合テスト実装
- [x] `backend/tests/integration/issueApi.integration.test.ts` を作成する
- [x] POST /api/v1/issues の統合テスト
  - 正常系: Worker権限で問題報告成功
  - 異常系: 認証なしで401エラー
  - 異常系: 不正なprojectIdで404エラー
  - 異常系: バリデーションエラー
- [x] POST /api/v1/issues/:issueId/comments の統合テスト
  - 正常系: Worker権限でコメント投稿成功
  - 異常系: 存在しないissueIdで404エラー
  - 異常系: 他組織のissueIdで404エラー
- [x] GET /api/v1/issues の統合テスト
  - 正常系: フィルタなしで一覧取得
  - 正常系: フィルタリング動作確認
  - 正常系: ページネーション動作確認
- [x] GET /api/v1/issues/:issueId の統合テスト
  - 正常系: 問題詳細取得
  - 異常系: 存在しないissueIdで404エラー
- [x] PATCH /api/v1/issues/:issueId/status の統合テスト
  - 正常系: Manager権限でステータス変更成功
  - 異常系: Worker権限で403エラー
  - 異常系: 無効なstatusで400エラー

#### 5.2 マルチテナント分離検証
- [x] 異なる組織のデータにアクセスできないことを確認
- [x] organization_idフィルタが全てのクエリに適用されていることを確認
- [x] クロステナントアクセスが403エラーになることを確認
- [x] `backend/tests/integration/issueApi.multiTenant.test.ts` を作成

#### 5.3 パフォーマンステスト
- [x] POST /api/v1/issues のレスポンスタイム測定（目標: < 200ms）
- [x] GET /api/v1/issues のレスポンスタイム測定（目標: < 500ms）
- [x] N+1問題が発生していないことを確認
- [x] インデックスが適切に使用されていることを確認
- [x] `backend/tests/integration/issueApi.performance.test.ts` を作成

#### 5.4 エラーハンドリング検証
- [x] すべてのエラーケースで統一レスポンス形式が返却されることを確認
- [x] エラーメッセージに機密情報が含まれていないことを確認
- [x] 適切なHTTPステータスコードが返却されることを確認
- [x] `backend/tests/integration/issueApi.errorHandling.test.ts` を作成

---

## 完了条件

- [ ] すべてのバックエンドタスクが完了している
- [ ] 全ユニットテストが成功している（カバレッジ80%以上）
- [ ] 全統合テストが成功している
- [ ] APIドキュメント（api_issue_management.md）が更新されている
- [ ] セキュリティチェックリストを満たしている
- [ ] マルチテナント分離が正しく機能している
- [ ] パフォーマンス目標を達成している

---

## 備考

- 並列実行可能なタスクには (P) マークを付与
- 依存関係に注意してタスクを実行すること
- 各タスク完了時にレビューを実施すること
- **フロントエンド実装は別タスクで実施する**
