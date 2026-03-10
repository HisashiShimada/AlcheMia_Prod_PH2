# タスク計画書: タスク詳細取得API実装

## メタデータ
- **作成日時**: 2026-03-09 10:21
- **タスクID**: task_detail_api
- **優先度**: 低（PLAN.md記載通り ⭐ 低）
- **推定工数**: 2時間

---

## 1. タスク概要

`GET /api/v1/tasks/:taskId` エンドポイントを新規実装する。

このAPIは `api_progress_monitoring.md` API #2 として定義されており、指定タスクの詳細情報（基本情報 + トランジション進捗）を返す。

### taskId の設計方針

DBには独立した `task_id` カラムが存在せず、タスクは複合主キー  
`(organization_id, project_id, method_id, experiment_order, task_no)` で識別される。

→ URLパスの `:taskId` は **`{projectId}__{methodId}__{taskNo}`** 形式（ダブルアンダースコア区切り）を採用し、コントローラー側でパースする。

例: `GET /api/v1/tasks/proj-uuid__method1__3`

この形式は既存の `WorkDetailItem.workId` （`"{methodId}_{taskNo}"` 形式）との整合性も考慮したうえで、projectId も含める形とする。

---

## 2. 目的と期待される成果

### 目的
- PetriNetVisualization / WorkProgressDetailDialog がタスク詳細を取得できるAPIを提供する
- `api_progress_monitoring.md` API #2 の仕様を実装する

### 期待される成果
- [ ] `GET /api/v1/tasks/:taskId` エンドポイントが動作する
- [ ] taskId（複合キー文字列）からタスク基本情報を取得できる
- [ ] タスクに紐づくトランジション進捗一覧を取得できる
- [ ] マルチテナント分離（organization_id）が正しく機能する
- [ ] 権限チェック（experiment_admin ロール）が機能する

---

## 3. 実装ステップ

### Phase 1: SQLファイル作成
- [ ] `backend/src/sql/queries/tasks/findDetailByTaskId.sql` を新規作成  
  （project_task + project_task_detail + transition_data + organization_user の JOIN クエリ）

### Phase 2: 型定義追加
- [ ] `backend/src/types/api.ts` に `TaskDetailResponse` 型を追加

### Phase 3: リポジトリ関数追加
- [ ] `backend/src/repositories/projectTaskDetailRepository.ts` に `findTaskDetail()` 関数を追加

### Phase 4: コントローラー関数追加
- [ ] `backend/src/controllers/projectController.ts` に `getTaskDetail()` 関数を追加

### Phase 5: ルート定義追加
- [ ] `backend/src/routes/projectRoutes.ts` に `GET /api/v1/tasks/:taskId` ルートを追加  
  ※ 既存ルートファイルに追加するか、新規 `tasksRoutes.ts` を作成するか検討  
  → 既存の `projectRoutes.ts` の末尾に追加する方針（関連エンティティのため）  
  ※ ただし `/tasks/:taskId` はプレフィックス `/api/v1/projects` ではなく `/api/v1/tasks` になるため、`server.ts` に新規ルート登録が必要

### Phase 6: server.ts へのルート登録
- [ ] `backend/src/server.ts` を確認し、新しいルートを登録

---

## 4. 影響範囲

### 新規作成するファイル
1. `backend/src/sql/queries/tasks/findDetailByTaskId.sql` - タスク詳細取得SQLクエリ
2. `backend/src/routes/tasksRoutes.ts` - `/api/v1/tasks` 用ルート定義

### 変更するファイル
1. `backend/src/types/api.ts` - `TaskDetailResponse` 型追加
2. `backend/src/repositories/projectTaskDetailRepository.ts` - `findTaskDetail()` 関数追加
3. `backend/src/controllers/projectController.ts` - `getTaskDetail()` 関数追加
4. `backend/src/server.ts` - 新ルートの登録

### 影響を受ける機能
- 新規エンドポイントのみ。既存エンドポイントへの影響なし

---

## 5. 技術的詳細

### エンドポイント

```
GET /api/v1/tasks/:taskId
```

### taskId フォーマット

```
{projectId}__{methodId}__{taskNo}
```

例: `550e8400-e29b-41d4-a716-446655440000__method1__3`

### レスポンス形式（概要）

```json
{
  "success": true,
  "data": {
    "taskId": "projectId__methodId__3",
    "projectId": "550e8400-...",
    "projectName": "材料実験A",
    "methodId": "method1",
    "experimentOrder": 1,
    "taskName": "材料準備実験",
    "taskNo": 3,
    "taskStatus": "in_progress",
    "experimentUserId": "user-uuid",
    "experimentUserName": "山田太郎",
    "experimentStartAt": "2026-01-21T10:30:00Z",
    "experimentEndAt": null,
    "transitionProgress": [
      {
        "transitionId": "t1",
        "status": 5,
        "progressRate": 100,
        "updatedAt": "2026-01-21T14:00:00Z"
      }
    ],
    "stats": {
      "totalTransitions": 5,
      "completed": 2,
      "inProgress": 1,
      "notStarted": 2,
      "progressPercentage": 40.0
    },
    "createdAt": "2026-01-21T10:00:00Z",
    "updatedAt": "2026-01-21T15:30:00Z"
  },
  "meta": { ... }
}
```

### 使用テーブル
- `project_task` - タスク基本情報（task_name, experiment_order 等）
- `project_task_detail` - タスク実行情報（task_no, task_status, 担当者 等）
- `transition_data` - トランジション進捗データ
- `organization_user` - 担当者名取得
- `project` - プロジェクト名取得

### ミドルウェアチェーン
```typescript
authMiddleware → checkPermission('040000', 0) → バリデーション → getTaskDetail
```

### タスクステータスマッピング（DB数値 → 文字列）
```
0 → 'pending'
1 → 'in_progress'
2 → 'failed'
3 → 'review_waiting'
4 → 'completed'
```

---

## 6. セキュリティ考慮事項
- [ ] `organization_id` による マルチテナント分離（全クエリに適用）
- [ ] `checkPermission('040000', 0)` による権限チェック（実験管理者メニュー・読取専用）
- [ ] `taskId` パースエラー時の 400 エラーハンドリング
- [ ] SQLインジェクション対策（Parameterized Queries）

---

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| project_task の主キーに experiment_order が含まれる（task_no ではない）ため、findByProjectMethodTaskNo.sql の JOIN ロジックを参考に正確に組む必要がある | 中 | 中 | 既存の findByProjectMethodTaskNo.sql を参考にJOIN条件を確認する |
| taskId のパース失敗 | 低 | 低 | `__` 区切りで3要素に分割できない場合は 400 を返す |
| transition_data が存在しない場合（0件） | 低 | 中 | LEFT JOIN で0件の場合は空配列を返す |

---

## 8. テスト計画

### 手動テスト
- [ ] 正常系: 有効な taskId でデータが返ること
- [ ] 異常系: 不正フォーマットの taskId で 400 が返ること
- [ ] 異常系: 存在しない taskId で 404 が返ること
- [ ] 異常系: 他組織のデータにアクセスしようとして 404 が返ること
- [ ] 異常系: 未認証リクエストで 401 が返ること

---

## 9. 関連ドキュメント

- [進捗確認API仕様書](../docs/design/api/api_progress_monitoring.md) - API #2
- [PLAN.md（調査レポート）](./PLAN.md) - バックエンド実装一覧の「⭐ 低: GET /api/v1/tasks/:taskId」
- DDL: `docs/design/db/ddl/project_task.sql`
- DDL: `docs/design/db/ddl/project_task_detail.sql`
- DDL: `docs/design/db/ddl/transition_data.sql`
- 参考実装: `backend/src/sql/queries/tasks/findByProjectMethodTaskNo.sql`
- 参考実装: `backend/src/sql/queries/tasks/findByProjectMethod.sql`

---

## 10. 承認記録

- **計画書提示日時**: 2026-03-09 10:21
- **承認日時**: 2026-03-09 10:25
- **承認者コメント**: 承認 - 実装を開始してください

---

## 11. 実施記録

### 実施日時
開始: 2026-03-09 10:25
完了: 2026-03-09 10:40

### 最終的な成果物
- [x] `backend/src/sql/queries/tasks/findDetailByTaskId.sql` - タスク詳細取得SQLクエリ（project_task + project_task_detail + transition_data JOIN）
- [x] `backend/src/sql/queries/tasks/findTransitionsByTaskId.sql` - トランジション進捗個別レコード取得SQLクエリ（追加作成）
- [x] `backend/src/types/api.ts` に `TaskDetailResponse` / `TaskDetailTransitionItem` / `TaskDetailStats` 型追加
- [x] `backend/src/repositories/projectTaskDetailRepository.ts` に `findTaskDetail()` 追加
- [x] `backend/src/controllers/projectController.ts` に `getTaskDetail()` 追加
- [x] `backend/src/routes/tasksRoutes.ts` 新規作成（`/api/v1/tasks/:taskId`）
- [x] `backend/src/server.ts` にルート登録追加（`app.use('/api/v1/tasks', tasksRoutes)`）

### TypeScript コンパイル結果
エラーなし（`tsc --noEmit` 実行確認済み）
