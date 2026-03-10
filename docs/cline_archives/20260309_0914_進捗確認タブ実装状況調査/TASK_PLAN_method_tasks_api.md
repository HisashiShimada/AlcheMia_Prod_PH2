# タスク計画書: メソッド別タスク一覧＋進捗情報取得API実装

## メタデータ
- **作成日時**: 2026-03-09 09:57
- **タスクID**: method-tasks-api-impl
- **優先度**: 中
- **推定工数**: 2〜3時間

## タスク概要

`docs/design/api/api_progress_monitoring.md` API #1 として定義されている  
**`GET /api/v1/projects/:projectId/methods/:methodId/tasks`** を実装する。

実験管理者が特定プロジェクト・特定メソッドのタスク一覧を進捗情報付きで取得するためのAPI。

---

## 目的と期待される成果

### 目的
進捗確認タブの画面仕様（`ui_progress_monitoring.md` セクション5.2）に記載されている未実装APIを実装し、  
将来のフロントエンド統合（ProgressMonitoring.tsx → WorkProgressDetailDialog.tsx）で利用できるようにする。

### 期待される成果
- [ ] `GET /api/v1/projects/:projectId/methods/:methodId/tasks` が実装され、動作すること
- [ ] レスポンスにタスク一覧・各タスクの進捗統計・統計サマリーが含まれること
- [ ] マルチテナント分離（organization_id フィルタ）が維持されること
- [ ] 権限チェック（040000: 実験管理者メニュー、読取専用）が適用されること

---

## 現状調査結果

### 実装済み（再利用可能）
| ファイル | 内容 |
|---------|------|
| `backend/src/sql/queries/tasks/listMethodsAndTasksByProject.sql` | project_task × project_task_detail × transition_data の結合クエリ（実験作業者用）|
| `backend/src/sql/queries/projects/findByName.sql` | プロジェクト名→IDの変換SQL |
| `backend/src/routes/projectRoutes.ts` | 追加先のルートファイル |
| `backend/src/controllers/projectController.ts` | 追加先のコントローラー |
| `backend/src/repositories/projectTaskRepository.ts` | `findMethodsAndTasksByProject()` 実装済み |

### 未実装（今回新規作成）
| ファイル | 内容 |
|---------|------|
| `backend/src/sql/queries/projects/findByIdWithStatus.sql` | project_id指定版のプロジェクト取得SQL |
| `backend/src/sql/queries/tasks/findByProjectMethod.sql` | メソッド指定版タスク一覧＋進捗集計SQL |
| `backend/src/types/api.ts` への追記 | `MethodTasksResponse` 型定義 |
| `backend/src/controllers/projectController.ts` への追記 | `getMethodTasks()` 関数 |
| `backend/src/routes/projectRoutes.ts` への追記 | 新エンドポイント定義 |

### DBスキーマ確認
```
project_task   : (organization_id, project_id, method_id, experiment_order) - PK
project_task_detail : (organization_id, project_id, method_id, experiment_order, task_no) - PK
transition_data : (organization_id, project_id, method_id, experiment_order, task_no, transition_id) - PK
```

**重要**: `project_task` の主キーに `experiment_order` が含まれるため、同一 `method_id` に対して  
複数の `experiment_order` レコードが存在する場合がある（試行回数分）。

---

## 実装ステップ

### Phase 1: SQLファイル作成
- [ ] `backend/src/sql/queries/tasks/findByProjectMethod.sql` 作成
  - project_task × project_task_detail × transition_data × organization_user をJOIN
  - methodId でフィルタリング
  - experiment_order・task_no 単位で進捗集計（AVG progress_rate、ステータスカウント）
  - organization_id フィルタ必須

### Phase 2: 型定義追加
- [ ] `backend/src/types/api.ts` に以下を追加
  - `MethodTasksResponse` 型（APIレスポンス全体）
  - `MethodTaskItem` 型（tasks の各要素）
  - `TaskProgressStats` 型（progress統計情報）
  - `MethodTasksStatistics` 型（statisticsサマリー）

### Phase 3: Controller実装
- [ ] `backend/src/controllers/projectController.ts` に `getMethodTasks()` 関数を追加
  - projectId + methodId + organizationId でタスク一覧取得
  - 404: projectId が存在しない場合
  - 404: methodId に対応するタスクが0件かつプロジェクト存在確認済みの場合（空配列返却）
  - 統計サマリー（total/pending/in_progress/completed/failed/overall_progress）を計算

### Phase 4: Route実装
- [ ] `backend/src/routes/projectRoutes.ts` に以下を追加
  ```
  GET /api/v1/projects/:projectId/methods/:methodId/tasks
  ```
  - `authMiddleware`
  - `checkPermission('040000', 0)` （実験管理者メニュー、読取専用）
  - `validateParamString('projectId', 1, 255)`
  - `validateParamString('methodId', 1, 255)`
  - クエリパラメータバリデーション: `status`（optional）、`include_details`（optional）
  - `handleValidationErrors`
  - `projectController.getMethodTasks`

---

## 変更ファイル一覧

### 新規作成
1. `backend/src/sql/queries/tasks/findByProjectMethod.sql`

### 修正
1. `backend/src/types/api.ts` - 型定義追加
2. `backend/src/controllers/projectController.ts` - `getMethodTasks()` 追加
3. `backend/src/routes/projectRoutes.ts` - 新エンドポイント追加

---

## 技術的詳細

### APIエンドポイント仕様

```
GET /api/v1/projects/:projectId/methods/:methodId/tasks
```

**認証・権限:**
- JWT認証必須（`authMiddleware`）
- 機能CD: `040000`（実験管理者メニュー）
- 権限レベル: `0`（読取専用）

**パスパラメータ:**
| パラメータ | 型 | 説明 |
|-----------|-----|------|
| projectId | string | プロジェクトID（VARCHAR(20)） |
| methodId | string | メソッドID（MAIMLのmethod id） |

**クエリパラメータ:**
| パラメータ | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| status | string | × | all | タスクステータスフィルタ |
| include_details | boolean | × | false | （将来拡張用、現時点では無視） |

**レスポンス（200 OK）:**
```json
{
  "success": true,
  "data": {
    "project_id": "proj_001",
    "method_id": "method_001",
    "tasks": [
      {
        "experiment_order": 1,
        "task_no": 1,
        "task_name": "材料準備",
        "task_status": "in_progress",
        "task_status_num": 1,
        "experiment_user_id": "user-uuid",
        "experiment_user_name": "田中 太郎",
        "experiment_start_at": "2026-01-15T10:00:00Z",
        "experiment_end_at": null,
        "progress": {
          "total_transitions": 5,
          "completed": 2,
          "in_progress": 1,
          "not_started": 2,
          "progress_percentage": 40.0
        },
        "created_at": "2026-01-15T09:00:00Z",
        "updated_at": "2026-01-15T12:00:00Z"
      }
    ],
    "statistics": {
      "total": 3,
      "pending": 1,
      "in_progress": 1,
      "completed": 1,
      "failed": 0,
      "overall_progress": 33.3
    }
  },
  "meta": {
    "timestamp": "2026-03-09T00:57:00Z",
    "requestId": "req_abc123"
  }
}
```

### SQLファイル設計（findByProjectMethod.sql）

```sql
-- メソッド別タスク一覧＋進捗集計クエリ
-- パラメータ: $1=projectId, $2=methodId, $3=organizationId

SELECT
  pt.experiment_order,
  pt.task_name,
  ptd.task_no,
  ptd.task_status,
  ptd.experiment_user_id,
  ou.user_name AS experiment_user_name,
  ptd.experiment_start_at,
  ptd.experiment_end_at,
  ptd.create_at,
  ptd.update_at,
  -- トランジション進捗集計
  COUNT(td.transition_id) AS total_transitions,
  COUNT(CASE WHEN td.status = 5 THEN 1 END) AS completed_transitions,
  COUNT(CASE WHEN td.status BETWEEN 1 AND 4 THEN 1 END) AS inprogress_transitions,
  COUNT(CASE WHEN td.status = 0 OR td.status IS NULL THEN 1 END) AS notstarted_transitions,
  COALESCE(AVG(td.progress_rate), 0) AS avg_progress_rate
FROM project_task pt
LEFT JOIN project_task_detail ptd
  ON ptd.project_id = pt.project_id
  AND ptd.method_id = pt.method_id
  AND ptd.experiment_order = pt.experiment_order
  AND ptd.organization_id = pt.organization_id
LEFT JOIN transition_data td
  ON td.project_id = ptd.project_id
  AND td.method_id = ptd.method_id
  AND td.experiment_order = ptd.experiment_order
  AND td.task_no = ptd.task_no
  AND td.organization_id = ptd.organization_id
LEFT JOIN organization_user ou
  ON ou.user_id = ptd.experiment_user_id
  AND ou.organization_id = ptd.organization_id
WHERE pt.project_id = $1
  AND pt.method_id = $2
  AND pt.organization_id = $3
GROUP BY
  pt.experiment_order,
  pt.task_name,
  ptd.task_no,
  ptd.task_status,
  ptd.experiment_user_id,
  ou.user_name,
  ptd.experiment_start_at,
  ptd.experiment_end_at,
  ptd.create_at,
  ptd.update_at
ORDER BY
  pt.experiment_order ASC,
  ptd.task_no ASC
```

### タスクステータスマッピング（task_status 数値 → 文字列）

| 数値 | 文字列 |
|-----|--------|
| 0 | pending |
| 1 | in_progress |
| 2 | failed |
| 3 | review_waiting |
| 4 | completed |
| NULL | pending |

### 統計サマリー計算ロジック

```typescript
const statistics = {
  total: tasks.length,
  pending: tasks.filter(t => t.task_status === 'pending').length,
  in_progress: tasks.filter(t => t.task_status === 'in_progress').length,
  completed: tasks.filter(t => t.task_status === 'completed').length,
  failed: tasks.filter(t => t.task_status === 'failed').length,
  overall_progress: tasks.length > 0
    ? parseFloat((tasks.reduce((sum, t) => sum + t.progress.progress_percentage, 0) / tasks.length).toFixed(1))
    : 0
};
```

### statusフィルタのマッピング（クエリパラメータ → DB数値）

| クエリパラメータ値 | DB数値 |
|----------------|--------|
| pending | 0 |
| in_progress | 1 |
| failed | 2 |
| review_waiting | 3 |
| completed | 4 |

---

## セキュリティ考慮事項
- [ ] 全DBクエリに organization_id フィルタを含める（マルチテナント分離）
- [ ] Parameterized Query 使用（SQLインジェクション対策）
- [ ] JWT認証ミドルウェアの適用
- [ ] 権限チェックミドルウェアの適用（040000, 読取専用）

---

## リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| project_task_detail が0件（タスク未作成）| 低 | 空の tasks[] を返す（200 OK） |
| transition_data が0件（進捗未記録）| 低 | LEFT JOIN + COALESCE で 0 を返す |
| statusフィルタ適用時に対応するタスクが0件 | 低 | 空配列返却（404ではなく200） |

---

## テスト計画
- [ ] `projectId` + `methodId` が存在する場合に正常取得できること
- [ ] `projectId` が存在しない場合に 404 が返ること
- [ ] タスク未登録の場合も 200 で空配列が返ること
- [ ] `status` クエリパラメータによるフィルタリングが機能すること
- [ ] 別テナントのプロジェクトにアクセスできないこと（404）

---

## 承認記録
- **計画書提示日時**: 2026-03-09 09:57
- **承認日時**: 
- **承認者コメント**: 
