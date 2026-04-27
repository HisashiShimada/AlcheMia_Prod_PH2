# タスク計画書: ページネーション固定バグ修正

## メタデータ
- **作成日時**: 2026-04-24 11:10
- **タスクID**: pagination-fix
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

複数の管理画面において、ページネーションのページ数セレクター（10件/20件/50件/100件）を変更しても表示件数が切り替わらないバグを修正する。

また、別のページ番号を押下してもページが切り替わらないケースも同じ原因で発生していることを確認し、同時に修正する。

---

## 根本原因の分析

### 問題のパターン（修正対象9ファイル共通）

修正対象ファイルで以下の実装パターンが確認された：

```tsx
// ❌ 現状（バグあり）
const [currentPage, setCurrentPage] = useState(1);
// ← pageSize の state が存在しない

<Table
  pagination={{
    current: currentPage,
    pageSize: 20,            // ← ハードコードされている（変化しない）
    showSizeChanger: true,
    pageSizeOptions: ['10', '20', '50', '100'],
    onChange: (page) => setCurrentPage(page),
    onShowSizeChange: () => setCurrentPage(1),  // ← size を受け取っていない
  }}
/>
```

### バグの詳細

Ant Design の `onShowSizeChange` コールバックのシグネチャは `(current: number, size: number) => void` だが、現状の実装では **`size` を受け取らず、`pageSize` を state 管理していない**。

そのため：
1. ユーザーがページサイズセレクターで「50件」を選ぶ
2. `onShowSizeChange` が呼ばれるが `setCurrentPage(1)` しか実行されない
3. `pageSize` は定数 `20` のままなので見た目は変わらない（20件表示が継続）

### 修正方針

```tsx
// ✅ 修正後
const [currentPage, setCurrentPage] = useState(1);
const [pageSize, setPageSize] = useState(20);  // ← pageSize の state を追加

<Table
  pagination={{
    current: currentPage,
    pageSize: pageSize,              // ← state を参照
    showSizeChanger: true,
    pageSizeOptions: ['10', '20', '50', '100'],
    onChange: (page, size) => {      // ← size も受け取る
      setCurrentPage(page);
      setPageSize(size);
    },
    onShowSizeChange: (_, size) => { // ← size を state に反映
      setCurrentPage(1);
      setPageSize(size);
    },
  }}
/>
```

---

## 対象ファイル一覧

### 修正対象（9ファイル）

| # | ファイルパス | デフォルト pageSize | 備考 |
|---|-------------|-------------------|------|
| 1 | `frontend/src/components/Provider/OrganizationManagement.tsx` | 20 | |
| 2 | `frontend/src/components/Provider/CorporationManagement.tsx` | 20 | |
| 3 | `frontend/src/components/DataManagement/MasterManagement.tsx` | 20 | |
| 4 | `frontend/src/components/progress/ProgressMonitoring.tsx` | 10 | |
| 5 | `frontend/src/components/ExperimentWorker/TaskListTable.tsx` | 10 | |
| 6 | `frontend/src/components/ExperimentWorker/TransitionList.tsx` | 10 | |
| 7 | `frontend/src/components/ExperimentWorker/ProjectSelectionModal.tsx` | 10 | |
| 8 | `frontend/src/components/ExperimentWorker/MethodSelectionModal.tsx` | 10 | |
| 9 | `frontend/src/components/ExperimentWorker/MethodTaskSelectionModal.tsx` | 10 | |

### 修正不要（4ファイル）— 調査の結果、既に正しい実装になっていた

| # | ファイルパス | 備考 |
|---|-------------|------|
| - | `frontend/src/components/SystemManagement/UserManagement.tsx` | 修正不要 |
| - | `frontend/src/components/SystemManagement/DepartmentManagement.tsx` | 修正不要 |
| - | `frontend/src/components/SystemManagement/RoleManagement.tsx` | 修正不要 |
| - | `frontend/src/components/SystemManagement/SessionManagement.tsx` | 修正不要 |

---

## 実装ステップ

### Phase 1: SystemManagement 配下（4ファイル）— 調査の結果、修正不要

- [x] `UserManagement.tsx` — 調査済み、既に正しい実装のため修正不要
- [x] `DepartmentManagement.tsx` — 調査済み、既に正しい実装のため修正不要
- [x] `RoleManagement.tsx` — 調査済み、既に正しい実装のため修正不要
- [x] `SessionManagement.tsx` — 調査済み、既に正しい実装のため修正不要

### Phase 2: Provider 配下（2ファイル）

- [x] `OrganizationManagement.tsx` — `pageSize` state 追加、`onChange`/`onShowSizeChange` を修正
- [x] `CorporationManagement.tsx` — 同上

### Phase 3: DataManagement 配下（1ファイル）

- [x] `MasterManagement.tsx` — 同上

### Phase 4: ExperimentWorker / progress 配下（6ファイル）

- [x] `ProgressMonitoring.tsx` — `pageSize` state 追加、`onChange`/`onShowSizeChange` を修正
- [x] `TaskListTable.tsx` — 同上
- [x] `TransitionList.tsx` — 同上
- [x] `ProjectSelectionModal.tsx` — 同上
- [x] `MethodSelectionModal.tsx` — 同上
- [x] `MethodTaskSelectionModal.tsx` — 同上

---

## 変更内容（各ファイル共通）

### 追加する state

```tsx
const [pageSize, setPageSize] = useState(20); // デフォルト値はファイルごとに合わせる
```

### 変更する pagination プロパティ

```tsx
pagination={{
  current: currentPage,
  pageSize: pageSize,                        // 変更: ハードコード → state 参照
  showSizeChanger: true,
  pageSizeOptions: ['10', '20', '50', '100'],
  showTotal: (total) => `...`,
  onChange: (page, size) => {                // 変更: size も受け取り state に反映
    setCurrentPage(page);
    setPageSize(size);
  },
  onShowSizeChange: (_, size) => {           // 変更: size を state に反映
    setCurrentPage(1);
    setPageSize(size);
  },
}}
```

---

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| フィルタリセット時に pageSize も 20 にリセットされてしまう | 低 | 低 | フィルタ変化時の `setCurrentPage(1)` は pageSize には影響しないため問題なし |
| ExperimentWorker 系ファイルで pagination が別の実装になっている | 中 | 中 | 実装時に個別確認して対応 |

---

## テスト計画

各ファイルの修正後に以下を手動確認する：

- [ ] ページサイズセレクターで「10件」に変更 → 表示件数が 10 件になること
- [ ] ページサイズセレクターで「50件」に変更 → 表示件数が 50 件になること
- [ ] ページを 2 ページ目に移動してからページサイズを変更 → 1 ページ目に戻ること
- [ ] フィルター条件を変更 → 1 ページ目に戻ること（pageSize は維持されること）

---

## 承認記録

- **計画書提示日時**: 2026-04-24 11:10
- **承認日時**: 
- **承認者コメント**: 承認済み

## 実施記録

### 実施日時
開始: 2026-04-24 10:30
完了: 2026-04-24 11:30

### 調査結果
- `SystemManagement` 配下の4ファイルは既に `pageSize` state を保持する正しい実装になっていたため修正不要と判断
- 残り9ファイルに対してバグ修正を実施

### 修正したファイル（9ファイル）
- [x] `frontend/src/components/progress/ProgressMonitoring.tsx`
- [x] `frontend/src/components/Provider/OrganizationManagement.tsx`
- [x] `frontend/src/components/Provider/CorporationManagement.tsx`
- [x] `frontend/src/components/DataManagement/MasterManagement.tsx`
- [x] `frontend/src/components/ExperimentWorker/TaskListTable.tsx`
- [x] `frontend/src/components/ExperimentWorker/TransitionList.tsx`
- [x] `frontend/src/components/ExperimentWorker/ProjectSelectionModal.tsx`
- [x] `frontend/src/components/ExperimentWorker/MethodSelectionModal.tsx`
- [x] `frontend/src/components/ExperimentWorker/MethodTaskSelectionModal.tsx`

### 修正不要ファイル（4ファイル）
- [x] `frontend/src/components/SystemManagement/UserManagement.tsx` — 既に正しい実装
- [x] `frontend/src/components/SystemManagement/DepartmentManagement.tsx` — 既に正しい実装
- [x] `frontend/src/components/SystemManagement/RoleManagement.tsx` — 既に正しい実装
- [x] `frontend/src/components/SystemManagement/SessionManagement.tsx` — 既に正しい実装

### 変更内容サマリ
各修正対象ファイルで以下を実施：
1. `const [pageSize, setPageSize] = useState(初期値)` を追加
2. `pagination.pageSize` をハードコード値 → `pageSize` state 参照に変更
3. `onChange: (page, size) => { setCurrentPage(page); setPageSize(size); }` に修正（`size` も受け取るよう変更）
4. `onShowSizeChange: (_, newSize) => { setPageSize(newSize); setCurrentPage(1); }` に修正（`size` を state に反映）
