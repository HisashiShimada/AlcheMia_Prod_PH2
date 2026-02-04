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
- [ ] マイグレーションファイル `20260204_create_issues_table.sql` を作成する
- [ ] テーブル定義：
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
- [ ] インデックス作成：
  - organization_id + project_id 複合インデックス
  - reporter_id インデックス
  - status インデックス
  - created_at インデックス
- [ ] 外部キー制約設定
- [ ] CHECK制約追加（issue_type, severity, status）

#### 1.2 マイグレーション実行確認
- [ ] ローカル環境でマイグレーション実行を確認する
- [ ] テーブル作成とインデックス作成が正常に完了することを確認する
- [ ] 外部キー制約が正しく機能することを確認する

---

### 2. バックエンドAPI実装 - リポジトリ層

**推定工数**: 2-3時間  
**依存**: タスク1（データベース定義）  
**カバーする要件**: REQ-001, REQ-002, REQ-003, REQ-005, REQ-006, REQ-007, REQ-008

#### 2.1 IssueRepositoryインターフェース定義
- [ ] `backend/src/types/issue.ts` を作成する
- [ ] Issue型定義（すべてのフィールドを含む）
- [ ] NewIssue型定義（作成時のフィールド）
- [ ] IssueUpdateData型定義（更新可能フィールド）
- [ ] IssueQueryParams型定義（検索パラメータ）

#### 2.2 IssueRepository実装
- [ ] `backend/src/repositories/issueRepository.ts` を作成する
- [ ] `create()` メソッド実装（問題報告作成）
- [ ] `findById()` メソッド実装（ID検索）
- [ ] `findByOrganization()` メソッド実装（組織別一覧取得、フィルタ・ソート対応）
- [ ] `findByProject()` メソッド実装（プロジェクト別一覧取得）
- [ ] `update()` メソッド実装（問題情報更新）
- [ ] `updateStatus()` メソッド実装（ステータス更新）
- [ ] `updateAssignee()` メソッド実装（担当者割当）
- [ ] `delete()` メソッド実装（論理削除または物理削除）
- [ ] すべてのクエリに organization_id フィルタを含める

---

### 3. バックエンドAPI実装 - サービス層

**推定工数**: 2-3時間  
**依存**: タスク2（リポジトリ層）  
**カバーする要件**: REQ-004, REQ-005, REQ-006, REQ-007, REQ-008, REQ-010, REQ-011

#### 3.1 IssueService基本機能実装
- [ ] `backend/src/services/issueService.ts` を作成する
- [ ] `createIssue()` メソッド実装：
  - バリデーション（必須項目、文字数制限）
  - プロジェクト存在確認
  - タスク詳細存在確認（指定時）
  - 問題報告作成
- [ ] `getIssueById()` メソッド実装：
  - 問題取得
  - 権限確認（同一組織）
- [ ] `listIssues()` メソッド実装：
  - フィルタリング（プロジェクト、ステータス、重要度、タイプ、担当者）
  - ソート（作成日時、更新日時、重要度）
  - ページネーション
- [ ] エラーハンドリング（NotFoundError, ValidationError）

#### 3.2 IssueService更新・削除機能実装
- [ ] `updateIssue()` メソッド実装：
  - 更新権限確認（報告者または管理者）
  - バリデーション
  - 問題情報更新
- [ ] `updateIssueStatus()` メソッド実装：
  - ステータス遷移バリデーション
  - ステータス更新
- [ ] `assignIssue()` メソッド実装：
  - 担当者存在確認
  - 担当者更新
- [ ] `deleteIssue()` メソッド実装：
  - 削除権限確認（報告者または管理者）
  - 問題削除

---

### 4. バックエンドAPI実装 - コントローラ・ルート層 (P)

**推定工数**: 1-2時間  
**依存**: タスク3（サービス層）  
**カバーする要件**: REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007, REQ-008

#### 4.1 IssueController実装
- [ ] `backend/src/controllers/issueController.ts` を作成する
- [ ] `create()` ハンドラ実装（POST /api/v1/issues）
- [ ] `getById()` ハンドラ実装（GET /api/v1/issues/:id）
- [ ] `list()` ハンドラ実装（GET /api/v1/issues）
- [ ] `update()` ハンドラ実装（PATCH /api/v1/issues/:id）
- [ ] `updateStatus()` ハンドラ実装（PATCH /api/v1/issues/:id/status）
- [ ] `assign()` ハンドラ実装（PATCH /api/v1/issues/:id/assign）
- [ ] `delete()` ハンドラ実装（DELETE /api/v1/issues/:id）
- [ ] 統一されたレスポンス形式で返却

#### 4.2 ルート定義 (P)
- [ ] `backend/src/routes/issueRoutes.ts` を作成する
- [ ] 問題報告エンドポイント定義
- [ ] ミドルウェアチェーン設定（auth, tenantIsolation, permissionCheck）
- [ ] `server.ts` にルート登録

---

### 5. フロントエンド実装 - 共通コンポーネント (P)

**推定工数**: 2-3時間  
**並列実行**: 可能（バックエンドと独立）  
**カバーする要件**: REQ-009, REQ-012

#### 5.1 IssueSeverityBadge コンポーネント (P)
- [ ] `frontend/src/components/common/IssueSeverityBadge.tsx` を作成する
- [ ] 重要度に応じたバッジ表示（critical: 赤、high: オレンジ、medium: 青、low: グレー）
- [ ] アイコン表示対応

#### 5.2 IssueStatusTag コンポーネント (P)
- [ ] `frontend/src/components/common/IssueStatusTag.tsx` を作成する
- [ ] ステータスに応じたタグ表示（open: 青、in_progress: オレンジ、resolved: 緑、closed: グレー）
- [ ] アイコン表示対応

#### 5.3 IssueTypeIcon コンポーネント (P)
- [ ] `frontend/src/components/common/IssueTypeIcon.tsx` を作成する
- [ ] 問題タイプに応じたアイコン表示（bug、feature_request、question、improvement）

---

### 6. フロントエンド実装 - 問題報告モーダル

**推定工数**: 3-4時間  
**依存**: タスク5（共通コンポーネント）  
**カバーする要件**: REQ-001, REQ-002, REQ-003, REQ-009

#### 6.1 IssueReportModal 基本実装
- [ ] `frontend/src/components/common/IssueReportModal.tsx` を作成する
- [ ] モーダル基本構造（Ant Design Modal使用）
- [ ] フォーム定義（Form.Item構成）
- [ ] 必須項目：タイトル、説明、問題タイプ、重要度
- [ ] オプション項目：タスク詳細ID
- [ ] フォームバリデーション

#### 6.2 フォーム機能実装
- [ ] 問題タイプ選択（Select）
- [ ] 重要度選択（Radio.Group with IssueSeverityBadge）
- [ ] タイトル入力（Input、最大200文字）
- [ ] 説明入力（TextArea、最大2000文字）
- [ ] タスク詳細選択（オプショナル、Select）
- [ ] リアルタイムバリデーション

#### 6.3 API連携と送信処理
- [ ] issueService.create() 呼び出し
- [ ] 送信中ローディング表示
- [ ] 成功時メッセージ表示
- [ ] エラーハンドリング
- [ ] モーダルクローズ時のフォームリセット

---

### 7. フロントエンド実装 - 問題一覧画面 (P)

**推定工数**: 3-4時間  
**依存**: タスク5（共通コンポーネント）  
**カバーする要件**: REQ-004, REQ-005, REQ-009, REQ-012

#### 7.1 IssueList コンポーネント基本実装 (P)
- [ ] `frontend/src/components/common/IssueList.tsx` を作成する
- [ ] Tableコンポーネント構成
- [ ] カラム定義：
  - ID（短縮表示）
  - タイトル
  - タイプ（IssueTypeIcon）
  - 重要度（IssueSeverityBadge）
  - ステータス（IssueStatusTag）
  - 報告者
  - 担当者
  - 作成日時
  - アクション
- [ ] データ取得（issueService.list()）

#### 7.2 フィルタリング機能実装
- [ ] ツールバー構成（検索、フィルタ）
- [ ] 全文検索（タイトル・説明）
- [ ] ステータスフィルタ（複数選択）
- [ ] 重要度フィルタ（複数選択）
- [ ] タイプフィルタ（複数選択）
- [ ] 担当者フィルタ
- [ ] フィルタクリア機能

#### 7.3 ソート・ページネーション実装
- [ ] 各カラムのソート機能
- [ ] ページネーション（デフォルト20件）
- [ ] ページサイズ変更（10/20/50/100）
- [ ] 総件数表示

---

### 8. フロントエンド実装 - 問題詳細画面

**推定工数**: 1-2時間  
**依存**: タスク5（共通コンポーネント）、タスク7（問題一覧）  
**カバーする要件**: REQ-006, REQ-007, REQ-008, REQ-009

#### 8.1 IssueDetail コンポーネント基本実装
- [ ] `frontend/src/components/common/IssueDetail.tsx` を作成する
- [ ] 問題詳細表示レイアウト
- [ ] 基本情報表示（タイトル、説明、タイプ、重要度、ステータス）
- [ ] メタ情報表示（報告者、担当者、作成日時、更新日時）
- [ ] データ取得（issueService.getById()）

#### 8.2 問題更新機能実装
- [ ] ステータス更新ドロップダウン
- [ ] 担当者割当ドロップダウン
- [ ] 編集ボタン（報告者または管理者のみ表示）
- [ ] 編集モーダル（IssueReportModalを再利用）
- [ ] 更新処理（issueService.update()）
- [ ] 楽観的UI更新

---

### 9. 画面統合とナビゲーション

**推定工数**: 1-2時間  
**依存**: タスク7（問題一覧）、タスク8（問題詳細）  
**カバーする要件**: REQ-009, REQ-013

#### 9.1 実験作業者メニューへの統合
- [ ] ExperimentWorkerMenuに「問題管理」メニュー項目追加
- [ ] ルーティング設定（/experiment-worker/issues）
- [ ] 問題一覧画面表示確認

#### 9.2 実験管理者メニューへの統合
- [ ] ExperimentAdminMenuに「問題管理」メニュー項目追加
- [ ] ルーティング設定（/experiment-admin/issues）
- [ ] 全プロジェクト横断表示確認

#### 9.3 問題報告ボタン統合
- [ ] 実験記録タブに「問題報告」ボタン追加
- [ ] 進捗確認タブに「問題報告」ボタン追加
- [ ] 指示確認タブに「問題報告」ボタン追加
- [ ] コンテキスト情報自動設定（プロジェクトID、タスク詳細ID）
- [ ] IssueReportModal呼び出し確認

---

### 10. テストとドキュメント作成

**推定工数**: 2-3時間  
**依存**: 全タスク  
**カバーする要件**: REQ-014

#### 10.1 バックエンドテスト
- [ ] IssueRepositoryテスト作成（`backend/tests/repositories/issueRepository.test.ts`）
- [ ] IssueServiceテスト作成（`backend/tests/services/issueService.test.ts`）
- [ ] IssueControllerテスト作成（`backend/tests/controllers/issueController.test.ts`）
- [ ] 統合テスト作成（`backend/tests/integration/issue.test.ts`）
- [ ] テストカバレッジ70%以上確認

#### 10.2 フロントエンドテスト
- [ ] IssueReportModalテスト作成
- [ ] IssueListテスト作成
- [ ] IssueDetailテスト作成
- [ ] 共通コンポーネントテスト作成

#### 10.3 APIドキュメント作成
- [ ] `docs/design/api/api_issue_management.md` を更新する
- [ ] OpenAPI仕様追加（backend/docs/openapi/paths/issues.yaml）
- [ ] スキーマ定義追加（backend/docs/openapi/schemas/issue.yaml）

#### 10.4* E2Eテスト作成（オプショナル）
- [ ]* 問題報告→一覧表示→詳細表示→ステータス更新のフロー確認
- [ ]* 権限による表示・操作制限の確認

---

## 実装順序の推奨

### Phase 1: バックエンド基盤（並列実行可能）
1. タスク1.1-1.2（データベース定義）
2. タスク2（リポジトリ層）と タスク5（共通コンポーネント）を並列実行

### Phase 2: コア機能実装
3. タスク3（サービス層）
4. タスク4（コントローラ・ルート層）

### Phase 3: フロントエンド画面（並列実行可能）
5. タスク6（問題報告モーダル）と タスク7（問題一覧）を並列実行
6. タスク8（問題詳細画面）

### Phase 4: 統合とテスト
7. タスク9（画面統合）
8. タスク10（テスト・ドキュメント）

---

## 品質基準

### コード品質
- [ ] TypeScript型定義完備
- [ ] ESLint/Prettierルール準拠
- [ ] DRY原則遵守
- [ ] SOLID原則遵守

### セキュリティ
- [ ] すべてのクエリにorganization_idフィルタ
- [ ] Parameterized Queries使用
- [ ] XSS対策（入力サニタイゼーション）
- [ ] CSRF対策（トークン検証）
- [ ] 権限チェック実装

### パフォーマンス
- [ ] インデックス最適化
- [ ] N+1問題回避
- [ ] ページネーション実装
- [ ] 適切なキャッシング

---

## 注意事項

1. **マルチテナント分離**: すべてのDB操作でorganization_idフィルタを必須とする
2. **権限管理**: 問題の更新・削除は報告者または管理者のみ可能
3. **データ整合性**: 外部キー制約とトランザクション管理を適切に実施
4. **UI/UX**: Ant Design v6のデザイントークンを使用し、一貫性のあるUIを提供
5. **エラーハンドリング**: ユーザーフレンドリーなエラーメッセージを表示
6. **テスト**: 各層で適切なテストを実施し、カバレッジ目標を達成

---

## 完了基準

- [ ] すべてのREQ-001からREQ-014の要件を満たす
- [ ] バックエンドAPIが正常に動作する
- [ ] フロントエンド画面が要件通り実装されている
- [ ] テストカバレッジ70%以上を達成
- [ ] セキュリティチェックリストをクリア
- [ ] APIドキュメントが完備されている
- [ ] 実験作業者・実験管理者メニューに統合されている

---

**生成日時**: 2026-02-04 09:34
**生成ツール**: spec-tasks workflow