# タスク計画書: みなし進捗チェックボックス表示制御

## メタデータ
- **作成日時**: 2026-03-02 20:28
- **タスクID**: deemed-progress-checkbox-visibility
- **優先度**: 中
- **推定工数**: 2時間

## 1. タスク概要

`DataRecordDialog`（実験データ記録ダイアログ）の「みなし進捗更新」チェックボックスの表示を、
`organization` テーブルの `use_deemed_progress` カラムの値で制御する。

| `use_deemed_progress` | チェックボックス | ステータス更新コントロール |
|---|---|---|
| `true`（デフォルト） | **表示**（初期値ON） | みなし進捗OFFの時のみ表示（現行動作） |
| `false` | **非表示** | **常に表示**（固定） |

---

## 2. 現状分析

### 2.1 バックエンド

| ファイル | 状態 | 内容 |
|---|---|---|
| `migrations/20260302_add_use_deemed_progress_to_organization.sql` | ✅ 完了 | organizationテーブルにカラム追加済み |
| `src/repositories/organizationRepository.ts` | ✅ 完了 | `getUseDeemedProgress()` 実装済み |
| `src/sql/queries/projects/findWorkerAccessible.sql` | ❌ 未対応 | `use_deemed_progress` を返していない |
| `src/types/workerProject.ts` | ❌ 未対応 | `WorkerAccessibleProject` に `useDeemedProgress` なし |
| `src/services/workerProjectService.ts` | ❌ 未対応 | マッピングに `useDeemedProgress` なし |

### 2.2 フロントエンド

| ファイル | 状態 | 内容 |
|---|---|---|
| `src/services/projectApiService.ts` | ❌ 未対応 | `WorkerProject` 型に `useDeemedProgress` なし |
| `src/components/menus/ExperimentWorkerMenu.tsx` | ❌ 未対応 | `useDeemedProgress` を取得・連携していない |
| `src/components/ExperimentWorker/ExperimentRecordTab.tsx` | ❌ 未対応 | Props に `useDeemedProgress` なし |
| `src/components/ExperimentWorker/DataRecordDialog.tsx` | ❌ 未対応 | `useState(true)` ハードコード、表示制御なし |

---

## 3. データフロー

```
organization.use_deemed_progress (DB)
  ↓ SQL JOIN
findWorkerAccessible.sql（organization.use_deemed_progress を SELECT に追加）
  ↓
WorkerAccessibleProject.useDeemedProgress（バックエンド型に追加）
  ↓
workerProjectService.ts（items マッピングに追加）
  ↓
worker-accessible API レスポンス
  ↓
WorkerProject.useDeemedProgress（フロントエンド型に追加）
  ↓
ExperimentWorkerMenu（selectedProject の useDeemedProgress を取得）
  ↓ props
ExperimentRecordTab（useDeemedProgress prop を追加）
  ↓ props
DataRecordDialog（チェックボックス表示制御）
```

---

## 4. 実装ステップ

### Phase 1: バックエンド - SQLファイル修正
- [ ] `backend/src/sql/queries/projects/findWorkerAccessible.sql`
  - `organization` テーブルを JOIN して `use_deemed_progress` を SELECT に追加

### Phase 2: バックエンド - 型定義修正
- [ ] `backend/src/types/workerProject.ts`
  - `WorkerAccessibleProject` インターフェースに `useDeemedProgress: boolean` を追加

### Phase 3: バックエンド - サービス修正
- [ ] `backend/src/services/workerProjectService.ts`
  - `items` マッピングに `useDeemedProgress: project.use_deemed_progress ?? true` を追加

### Phase 4: フロントエンド - API型定義修正
- [ ] `frontend/src/services/projectApiService.ts`
  - `WorkerProject` 型に `useDeemedProgress?: boolean` を追加

### Phase 5: フロントエンド - メニューコンポーネント修正
- [ ] `frontend/src/components/menus/ExperimentWorkerMenu.tsx`
  - `useDeemedProgress` を projects から取得して `ExperimentRecordTab` の props に渡す

### Phase 6: フロントエンド - ExperimentRecordTab 修正
- [ ] `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx`
  - Props に `useDeemedProgress?: boolean` を追加
  - `DataRecordDialog` に `useDeemedProgress` を渡す

### Phase 7: フロントエンド - DataRecordDialog 修正
- [ ] `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx`
  - Props に `useDeemedProgress?: boolean`（デフォルト `true`）を追加
  - チェックボックスの表示を `useDeemedProgress` props で制御
  - `useDeemedProgress` props が `false` の場合は `useDeemedProgressState` を強制 `false` に設定

---

## 5. 変更ファイル一覧

### 新規作成
なし

### 修正
1. `backend/src/sql/queries/projects/findWorkerAccessible.sql` - organization JOIN と use_deemed_progress 追加
2. `backend/src/types/workerProject.ts` - WorkerAccessibleProject 型に useDeemedProgress 追加
3. `backend/src/services/workerProjectService.ts` - items マッピングに useDeemedProgress 追加
4. `frontend/src/services/projectApiService.ts` - WorkerProject 型に useDeemedProgress 追加
5. `frontend/src/components/menus/ExperimentWorkerMenu.tsx` - useDeemedProgress の取得と連携
6. `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx` - props 追加と DataRecordDialog への連携
7. `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` - チェックボックス表示制御

---

## 6. 技術的詳細

### findWorkerAccessible.sql の変更

```sql
-- 変更前
SELECT DISTINCT
  project.project_id,
  project.project_name,
  project.description,
  project.project_status,
  project.create_at,
  project.update_at
FROM project
INNER JOIN project_task_detail 
  ON project.project_id = project_task_detail.project_id
WHERE 
  project.organization_id = $1
  AND project_task_detail.organization_id = $2
  {STATUS_FILTER}
ORDER BY {SORT_COLUMN} {SORT_ORDER}
LIMIT {LIMIT} OFFSET {OFFSET}

-- 変更後
SELECT DISTINCT
  project.project_id,
  project.project_name,
  project.description,
  project.project_status,
  project.create_at,
  project.update_at,
  organization.use_deemed_progress  -- 追加
FROM project
INNER JOIN project_task_detail 
  ON project.project_id = project_task_detail.project_id
INNER JOIN organization  -- 追加
  ON project.organization_id = organization.organization_id
WHERE 
  project.organization_id = $1
  AND project_task_detail.organization_id = $2
  {STATUS_FILTER}
ORDER BY {SORT_COLUMN} {SORT_ORDER}
LIMIT {LIMIT} OFFSET {OFFSET}
```

### DataRecordDialog の変更

```tsx
// Props に追加
interface DataRecordDialogProps {
  // ... 既存 props
  useDeemedProgress?: boolean;  // 追加（デフォルト true）
}

// コンポーネント内
const {
  // ... 既存 props
  useDeemedProgress: useDeemedProgressFromOrg = true,  // 追加
} = props;

// useDeemedProgress state: org設定が false なら強制的に false 固定
const [useDeemedProgressState, setUseDeemedProgressState] = useState(useDeemedProgressFromOrg);

// チェックボックスの表示制御
{useDeemedProgressFromOrg && (
  <Checkbox
    checked={useDeemedProgressState}
    onChange={(e) => setUseDeemedProgressState(e.target.checked)}
  >
    みなし進捗更新
  </Checkbox>
)}

// ステータス更新セクション（org設定がfalseなら常に表示）
{!useDeemedProgressState && ( ... )}
```

---

## 7. リスク

| リスク | 影響度 | 対策 |
|---|---|---|
| SQLの DISTINCT + JOIN で重複排除が正しく動作するか | 中 | 組織1つに対して use_deemed_progress は1値のため問題なし |
| 既存の `use_deemed_progress` が NULL の組織 | 低 | `?? true` でデフォルト true にフォールバック |
| DataRecordDialog の open 時の state 初期化 | 低 | useEffect で open 時に useDeemedProgressFromOrg を再設定 |

---

## 8. テスト計画

- [ ] `use_deemed_progress = true` の組織でチェックボックスが表示されること
- [ ] `use_deemed_progress = false` の組織でチェックボックスが非表示になること
- [ ] `use_deemed_progress = false` の場合、ステータス更新コントロールが常に表示されること
- [ ] `use_deemed_progress = true` の場合、チェックOFFでステータス更新コントロールが表示されること

---

## 9. 承認記録
- **計画書提示日時**: 2026-03-02 20:28
- **承認日時**: 2026-03-02 20:28
