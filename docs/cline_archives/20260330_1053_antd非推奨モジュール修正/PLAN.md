# タスク計画書: antd非推奨モジュール修正（プロジェクト管理・MAIML編集画面）

## メタデータ
- **作成日時**: 2026-03-30 10:53
- **タスクID**: antd-deprecation-fix
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要
プロジェクト管理・MAIML編集画面周りでant-design v6の非推奨モジュールを使用している箇所を修正する。

## 修正方針
antd v6では `Space direction=` が**非推奨**で、`Space orientation=` が**正しい**プロパティ名。
過去のタスクで`direction`→`orientation`への修正が既に多数完了しているが、まだ残っているファイルを修正する。

## 非推奨箇所の一覧

### 1. `Space direction=` → `Space orientation=` に変更

**対象ファイル（project/）:**
- `frontend/src/components/project/MaimlPublishDialog.tsx`
- `frontend/src/components/project/MaimlUnpublishDialog.tsx`
- `frontend/src/components/project/BulkUploadDialog.tsx`

**対象ファイル（editorv2/）:**
- なし（修正済み）

**対象ファイル（ExperimentWorker/ - プロジェクト管理から呼び出されるもの）:**
- `frontend/src/components/ExperimentWorker/IssueManagementModal.tsx`
- `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx`
- `frontend/src/components/ExperimentWorker/UnifiedSelectionDialog.tsx`
- `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx`
- `frontend/src/components/ExperimentWorker/TaskSelectionDialog.tsx`

### 2. `Modal destroyOnClose` → `Modal destroyOnHidden` に変更
antd v6でModalの`destroyOnClose`プロパティが`destroyOnHidden`にrename。

**対象ファイル:**
- `frontend/src/components/project/MaimlPublishDialog.tsx`
- `frontend/src/components/project/MaimlUnpublishDialog.tsx`

### 3. `IssueManagementModal visible=` → `open=` に変更
コンポーネント独自のPropsを`visible`→`open`に統一（antd v6のModalがopenプロパティを使用するため合わせる）。

**対象ファイル:**
- `frontend/src/components/ExperimentWorker/IssueManagementModal.tsx`（Props定義）
- `frontend/src/components/project/ProjectManagement.tsx`（呼び出し元）
- `frontend/src/components/ExperimentWorker/ProgressCheckTab.tsx`（呼び出し元）
- `frontend/src/components/ExperimentWorker/TransitionList.tsx`（呼び出し元）
- `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx`（呼び出し元）

## 実装ステップ
- [ ] project/ の Space direction→orientation 修正（3ファイル）
- [ ] ExperimentWorker/ の Space direction→orientation 修正（5ファイル）
- [ ] MaimlPublishDialog/MaimlUnpublishDialog の destroyOnClose→destroyOnHidden 修正
- [ ] IssueManagementModal の visible→open Props修正＋呼び出し元修正（5ファイル）

## 承認記録
- **計画書提示日時**: 2026-03-30 10:57
