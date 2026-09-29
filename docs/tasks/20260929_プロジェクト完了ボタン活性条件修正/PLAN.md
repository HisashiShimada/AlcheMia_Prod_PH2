# タスク計画書: プロジェクト完了ボタン活性条件修正

## メタデータ
- **作成日時**: 2026-09-29
- **タスクID**: 20260929_プロジェクト完了ボタン活性条件修正
- **優先度**: 高
- **推定工数**: 2〜3時間

---

## 1. タスク概要

「実験管理者メニュー > プロジェクト管理タブ > プロジェクト完了ボタン」の活性/非活性条件が仕様と乖離している。以下の **4条件すべてを満たす場合のみ活性** にする必要があるが、現状は**条件②の一部**のみチェックされており、①のフロントチェックなし、③・④は完全に未実装。

---

## 2. 調査結果（現状と問題）

### 2-1. 指定された活性条件

| No | 条件 | 詳細 |
|----|------|------|
| ① | プロジェクトステータス = 3 | タスク結果レビュー待ち（REVIEW_WAITING） |
| ② | 全タスクが完了またはNG | `task_status IN (3:COMPLETED, 5:REVIEW_NG)` かつ1件以上 |
| ③ | 全トランジションが終状態 | `status = 6:COMPLETED` かつ1件以上 |
| ④ | プロジェクト評価が完了済み | `project_overall_evaluations` に `evaluation_scope='MAIML_PROJECT'` のレコード存在 |

### 2-2. 現状の実装（問題箇所）

**`frontend/src/components/project/ProjectManagementInner.tsx`**

```tsx
// state定義 (L67)
const [allTasksCompleted, setAllTasksCompleted] = useState(false);

// 選択プロジェクト変更時の判定 (L141-152)
useEffect(() => {
  if (!selectedProject) { setAllTasksCompleted(false); return; }
  getProjectTasks(selectedProject.id)
    .then((result) => {
      const tasks = result.tasks;
      const allCompleted =
        tasks.length > 0 &&
        tasks.every((task) => task.workStatus === TaskStatus.COMPLETED); // COMPLETED(3)のみ
      setAllTasksCompleted(allCompleted);
    })
    .catch(() => setAllTasksCompleted(false));
}, [selectedProject]);

// 完了ボタンのdisabled条件 (L338)
<Button disabled={!allTasksCompleted || selectedProject?.isEditable === false} ...>
```

### 2-3. 問題点の一覧

| No | 条件 | 問題 |
|----|------|------|
| ❌① | プロジェクトステータス=3チェック | フロントで**未使用**（バックエンドの completeProject 実行時のみチェック） |
| ❌② | タスク `REVIEW_NG(5)` が許可条件に含まれていない | NGタスクが混在すると永遠に非活性 |
| ❌③ | トランジション終状態チェック | **チェック自体が存在しない** |
| ❌④ | プロジェクト評価完了チェック | **チェック自体が存在しない** |

---

## 3. 修正前フロー図

```
選択プロジェクト変更
    ↓
getProjectTasks(projectId)
    ↓
全タスクが COMPLETED(3) のみ確認
    ↓
allTasksCompleted → disabled={!allTasksCompleted}
```

## 4. 修正後フロー図

```
選択プロジェクト変更
    ↓
GET /api/v1/projects/:projectId/completion-eligibility
    ↓  （バックエンドで4条件を1クエリでチェック）
    ├─ ① project_status = 3 (REVIEW_WAITING)
    ├─ ② 全タスク status IN (3:COMPLETED, 5:REVIEW_NG) かつ1件以上
    ├─ ③ 全トランジション status = 6 (COMPLETED) かつ1件以上
    └─ ④ project_overall_evaluations に evaluation_scope='MAIML_PROJECT' 存在
    ↓
{ eligible: boolean, reasons: {...} } を返す
    ↓
isCompletionEligible → disabled={!isCompletionEligible}
```

---

## 5. 変更ファイル一覧

| ファイル | 変更種別 | 変更概要 |
|---------|---------|---------|
| `backend/src/sql/queries/project/getCompletionEligibility.sql` | **新規作成** | 4条件を1クエリで確認するSQL |
| `backend/src/services/projectService.ts` | **修正** | `getCompletionEligibility()` メソッド追加 |
| `backend/src/controllers/projectController.ts` | **修正** | `getCompletionEligibility()` アクション追加 |
| `backend/src/routes/projectRoutes.ts` | **修正** | `GET /:projectId/completion-eligibility` 追加 |
| `frontend/src/services/projectApiService.ts` | **修正** | `getCompletionEligibility()` 関数追加 |
| `frontend/src/components/project/ProjectManagementInner.tsx` | **修正** | state・useEffect・disabled条件の修正 |

---

## 6. 影響範囲

- **プロジェクト完了ボタン**: 活性条件が正しく4条件すべてを満たす場合のみ活性になる
- **他のボタン**: 変更なし
- **completeProject API**: 変更なし（サーバー側の前提条件チェックは既存のまま）
- **評価登録タブ / 全体評価タブ**: 変更なし

---

## 7. リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| SQLのLEFT JOINで行が複数になる | 中 | GROUP BY で1行に集約 |
| トランジションが1件もないプロジェクト | 中 | `COUNT > 0` で明示的に1件以上必須 |
| 既存コードへの副作用 | 低 | 新規APIのため既存コードを変更しない |

---

## 8. 承認記録
- **計画書提示日時**: 2026-09-29
- **承認日時**: 2026-09-29（Act mode移行により承認済み）

---

## 9. 実施記録

### 実施日時
開始: 2026-09-29
完了: 2026-09-29

### 最終的な成果物
- [x] `backend/src/sql/queries/project/getCompletionEligibility.sql` — 新規作成
- [x] `backend/src/services/projectService.ts` — `getCompletionEligibility()` 追加
- [x] `backend/src/controllers/projectController.ts` — `getCompletionEligibility()` 追加
- [x] `backend/src/routes/projectRoutes.ts` — エンドポイント追加
- [x] `frontend/src/services/projectApiService.ts` — API関数追加
- [x] `frontend/src/components/project/ProjectManagementInner.tsx` — 判定ロジック修正

### TypeScript コンパイルチェック
- バックエンド: エラーなし ✅ (exit code 0)
- フロントエンド: エラーなし ✅ (exit code 0)
