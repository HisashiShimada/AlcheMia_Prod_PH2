# タスク計画書：タブ切替時再フェッチ対応

## タスクID
20260930_1000_タブ切替時再フェッチ対応

## 目的
ExperimentAdminMenu と ExperimentWorkerMenu において、`display:none` 常時マウント方式 / Ant Design Tabs `children` 方式によりタブ切り替え時にデータ再取得が行われない問題を修正する。
各タブを選択した際に最新データが取得されるよう `tabActivatedAt` パターン（`Date.now()` タイムスタンプ渡し）を全タブに統一的に適用する。

## 方針
- `display:none` 常時マウントの目的（フィルタ・選択状態などユーザー入力 state の保持）は維持する
- データ取得のみをタブ切替時に再実行する
- タブ4（UncertaintyManagement）で実績のある `tabActivatedAt` パターンを他タブにも展開し実装の一貫性を高める

## 修正ファイル一覧

| # | ファイル | 変更内容 |
|---|---|---|
| 1 | `frontend/src/components/menus/ExperimentAdminMenu.tsx` | タブ別 `*TabActivatedAt` state 追加、`handleTabChange` 拡張、各コンポーネントへ prop 追加 |
| 2 | `frontend/src/components/project/ProjectManagement.tsx` | `tabActivatedAt` prop を透過（ラッパー） |
| 3 | `frontend/src/components/project/ProjectManagementInner.tsx` | `tabActivatedAt` prop 追加・`refetchProjects` 呼出 `useEffect` 追加 |
| 4 | `frontend/src/components/format/FormatManagement.tsx` | `tabActivatedAt` prop 追加・`refetchFormats` 呼出 `useEffect` 追加 |
| 5 | `frontend/src/components/progress/ProgressMonitoring.tsx` | `tabActivatedAt` prop 追加・`refetchProjects` 呼出 `useEffect` 追加 |
| 6 | `frontend/src/components/uncertainty/UncertaintyManagement.tsx` | `tabActivatedAt` の `useEffect` 拡張（内部タブも再フェッチ） |
| 7 | `frontend/src/components/group/GroupManagementPanel.tsx` | `tabActivatedAt` prop 追加・`loadGroups` 呼出 `useEffect` 追加 |
| 8 | `frontend/src/components/menus/ExperimentWorkerMenu.tsx` | `handleTabChange` にタブ3切替時の `reloadProgressRows` 追加 |

## 実装チェックリスト

- [x] Step 1: ExperimentAdminMenu.tsx 修正
- [x] Step 2: ProjectManagement.tsx 修正（prop 透過）
- [x] Step 3: ProjectManagementInner.tsx 修正
- [x] Step 4: FormatManagement.tsx 修正
- [x] Step 5: ProgressMonitoring.tsx 修正
- [x] Step 6: UncertaintyManagement.tsx 修正
- [x] Step 7: GroupManagementPanel.tsx 修正
- [x] Step 8: ExperimentWorkerMenu.tsx 修正
- [x] Step 9: TypeScript 型チェック（`tsc --noEmit`）確認 → エラーなし
