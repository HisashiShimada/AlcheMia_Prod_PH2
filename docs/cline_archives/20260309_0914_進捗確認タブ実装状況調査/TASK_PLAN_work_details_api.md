# タスク計画書: WorkProgressDetailDialog用API実装

## メタデータ
- **作成日時**: 2026-03-09 09:37
- **タスクID**: work-details-api-impl
- **優先度**: 高
- **推定工数**: 3〜4時間

## タスク概要

`WorkProgressDetailDialog` が必要とする以下の情報を一括返却するバックエンドAPIを設計・実装する。

- `projectInfo`（プロジェクト名・ステータス・オーナー名・部門・メソッド一覧・作成日時・更新日時）
- `fileInfo`（maimlFileKey・ファイル名・チェックアウト状態）
- `workDetails[]`（タスク一覧・各タスクのトランジション進捗・統計情報）

---

## 目的と期待される成果

### 目的
現在 `WorkProgressDetailDialog.tsx` がモックデータ（`mockProjects.json`）から取得している全データを、実際のバックエンドAPIから取得できるようにする。

### 期待される成果
- [ ] `GET /api/v1/progress/projects/:projectName/work-details` が実装され、動作すること
- [ ] レスポンスに `projectInfo` / `fileInfo` / `workDetails` / 各 `workDetail` の `transitionProgress` が含まれること
- [ ] マルチテナント分離（organization_id フィルタ）が維持されること
- [ ] 権限チェック（040000: 実験管理者メニュー、読取専用）が適用されること

---

## 実装ステップ

### Phase 1: SQLファイル作成
- [ ] `backend/src/sql/queries/projects/findWithOwnerAndDept.sql` 作成
  - project + organization_user（owner）+ department をJOINしてプロジェクト詳細を取得
- [ ] `backend/src/sql/queries/transition_data/findByTask.sql` 作成
  - 指定タスク（project_id, method_id, task_no）に紐づく全トランジション進捗を取得

### Phase 2: 型定義追加
- [ ] `backend/src/types/api.ts`（または適切な型定義ファイル）に以下を追加
  - `WorkProgressDetailResponse` 型（APIレスポンス全体）
  - `WorkDetailItem` 型（workDetails の各要素）
  - `TransitionProgressItem` 型（transitionProgress の各要素）
  - `ProjectInfoDetail` 型（projectInfo の内容）
  - `FileInfoDetail` 型（fileInfo の内容）

### Phase 3: Service層実装
- [ ] `backend/src/services/progressService.ts` に `getWorkDetails()` メソッドを追加
  - プロジェクト情報・ファイル情報取得
  - 全タスク（project_task × project_task_detail）取得
  - MAIMLパース（既存 `downloadAndParseMAIML` を再利用）
  - 各タスクのトランジション進捗取得（既存 `getTransitionsProgress` を再利用）
  - レスポンス形式への変換・集計

### Phase 4: Controller実装
- [ ] `backend/src/controllers/progressController.ts` に `getWorkDetails()` 関数を追加
  - リクエスト受信・パラメータ取得
  - `ProgressService.getWorkDetails()` 呼び出し
  - 統一レスポンス形式（success/data/meta）で返却

### Phase 5: Route実装
- [ ] `backend/src/routes/progressRoutes.ts` に以下を追加
  ```
  GET /api/v1/progress/projects/:projectName/work-details
  ```
  - `authMiddleware`
  - `checkPermission('040000', 0)` （実験管理者メニュー、読取専用）
  - `validateParamString('projectName', 1, 255)`
  - `handleValidationErrors`
  - `progressController.getWorkDetails`

---

## 変更ファイル一覧

### 新規作成
1. `backend/src/sql/queries/projects/findWithOwnerAndDept.sql` - プロジェクト詳細取得SQL
2. `backend/src/sql/queries/transition_data/findByTask.sql` - タスク別トランジション進捗取得SQL

### 修正
1. `backend/src/services/progressService.ts` - `getWorkDetails()` メソッド追加
2. `backend/src/controllers/progressController.ts` - `getWorkDetails()` 関数追加
3. `backend/src/routes/progressRoutes.ts` - 新エンドポイント追加

---

## 技術的詳細

### APIエンドポイント仕様

```
GET /api/v1/progress/projects/:projectName/work-details
```

**認証・権限:**
- JWT認証必須（`authMiddleware`）
- 機能CD: `040000`（実験管理者メニュー）
- 権限レベル: `0`（読取専用）

**パスパラメータ:**
| パラメータ | 型 | 説明 |
|-----------|-----|------|
| projectName | string | プロジェクト名（1〜255文字） |

**レスポンス（200 OK）:**
```json
{
  "success": true,
  "data": {
    "projectInfo": {
      "projectId": "uuid",
      "projectName": "材料実験A",
      "projectDescription": "プロジェクトの説明",
      "owner": "佐藤太郎",
      "department": "研究部",
      "status": "in_progress",
      "methods": ["method_001", "method_002"],
      "createdAt": "2026-01-15T10:00:00Z",
      "updatedAt": "2026-01-20T15:30:00Z"
    },
    "fileInfo": {
      "fileName": "材料実験A.maiml",
      "maimlFileKey": "{organizationId}/projects/材料実験A/材料実験A.maiml",
      "organizationId": "uuid",
      "checkoutStatus": {
        "isCheckedOut": false,
        "checkoutBy": null
      }
    },
    "workDetails": [
      {
        "workId": "task_no_文字列",
        "taskName": "材料準備",
        "methodName": "method_001",
        "assignedWorkerId": "user-uuid",
        "workStatus": "in_progress",
        "progressPercentage": 50,
        "stats": {
          "totalTransitions": 10,
          "completed": 5,
          "working": 2,
          "notStarted": 3,
          "completionRate": 50
        },
        "transitionProgress": [
          {
            "transitionId": "t001",
            "transitionName": "Transition1",
            "progressStatus": "完了",
            "assignedWorker": "田中",
            "startDate": "2026-01-15T10:00:00Z",
            "endDate": "2026-01-16T17:00:00Z"
          }
        ]
      }
    ]
  },
  "meta": {
    "timestamp": "2026-01-21T16:00:00Z",
    "requestId": "req_abc123"
  }
}
```

**エラーレスポンス:**
| HTTPステータス | エラーコード | 説明 |
|--------------|-------------|------|
| 401 | AUTH_TOKEN_MISSING / AUTH_TOKEN_INVALID | 認証エラー |
| 403 | PERMISSION_DENIED | 権限不足 |
| 404 | RESOURCE_NOT_FOUND | プロジェクトが見つからない |
| 500 | SYSTEM_ERROR / DATABASE_ERROR | システムエラー |

### SQLファイル設計

#### `projects/findWithOwnerAndDept.sql`
```sql
SELECT
  p.organization_id,
  p.project_id,
  p.project_name,
  p.description,
  p.department_cd,
  d.department_name,
  p.owner_user_id,
  ou.user_name AS owner_name,
  p.project_status,
  p.checkout_status,
  p.create_at,
  p.update_at
FROM project p
LEFT JOIN department d
  ON p.department_cd = d.department_cd
  AND p.organization_id = d.organization_id
LEFT JOIN organization_user ou
  ON p.owner_user_id = ou.user_id
  AND p.organization_id = ou.organization_id
WHERE p.project_name = $1
  AND p.organization_id = $2
```

#### `transition_data/findByTask.sql`
```sql
SELECT
  td.transition_id,
  td.status,
  td.progress_rate,
  td.update_user_id,
  ou.user_name AS worker_name,
  td.create_at,
  td.update_at
FROM transition_data td
LEFT JOIN organization_user ou
  ON td.update_user_id = ou.user_id
  AND td.organization_id = ou.organization_id
WHERE td.organization_id = $1
  AND td.project_id = $2
  AND td.method_id = $3
  AND td.task_no = $4
ORDER BY td.transition_id ASC
```

### Service層設計 (`getWorkDetails`)

**処理フロー:**
1. プロジェクト名 → `findWithOwnerAndDept.sql` でプロジェクト詳細取得（project_id, owner_name, dept_name, status等）
2. プロジェクトが見つからない場合は404エラー返却
3. MAIMLファイルパスを構築: `projects/{projectName}/{projectName}.maiml`
4. MAIMLダウンロード・パース（既存の `downloadAndParseMAIML()` を再利用）
5. MAIMLからメソッド一覧を抽出（`methods.map(m => m.methodId)`）
6. `project_task` テーブルから全メソッドを取得（findByProject）
7. `project_task_detail` テーブルから全タスク詳細を取得（findProjectTasks）
8. 各タスク詳細に対して:
   a. `findByTask.sql` でトランジション進捗をDB取得
   b. MAIMLからトランジション名を解決（transitionId → label）
   c. トランジション統計を集計（completed/working/notStarted/completionRate）
   d. `transitionProgress[]` を構築
9. ステータス数値 → 文字列マッピング変換
10. レスポンス形式に変換して返却

**ステータスマッピング（project_status 数値 → 文字列）:**
| 数値 | 文字列 |
|-----|--------|
| 0 | planning |
| 1 | pending |
| 2 | in_progress |
| 3 | review_waiting |
| 4 | completed |
| 5 | error |

**ステータスマッピング（task_status 数値 → 文字列）:**
| 数値 | 文字列 |
|-----|--------|
| 0 | pending |
| 1 | in_progress |
| 2 | error |
| 3 | review_waiting |
| 4 | completed |

**ステータスマッピング（transition status 数値 → 日本語）:**
| 数値 | 日本語 |
|-----|--------|
| 0 | 未開始 |
| 1 | 準備中 |
| 2 | 準備完了（作業中扱い） |
| 3 | 作業中 |
| 4 | 休止中 |
| 5 | 完了 |
| 6 | 異常中 |

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
| MAIMLパースが重い（全タスク分）| 中 | 1プロジェクトに1つのMAIMLなので1回のみパース。トランジション名解決はメモリ内で行う |
| transition_dataレコードがない場合 | 低 | LEFT JOIN or NULL チェックで「未開始」として扱う |
| project_task_detailレコードがない場合 | 低 | 空の workDetails[] を返す |

---

## テスト計画
- [ ] `projectName` が存在しない場合に 404 が返ること
- [ ] 正常系: `projectInfo` / `fileInfo` / `workDetails` が返ること
- [ ] `workDetails` が空（タスク未登録）の場合も 200 で空配列が返ること
- [ ] 別テナントのプロジェクトにアクセスできないこと（403/404）

---

## 承認記録
- **計画書提示日時**: 2026-03-09 09:37
- **承認日時**: 
- **承認者コメント**: 
