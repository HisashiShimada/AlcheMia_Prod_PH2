# タスク計画書: projectId/projectName 混同バグ 一括修正

## メタデータ
- **作成日時**: 2026-04-13 15:31
- **タスクID**: projectId_name_fix
- **優先度**: 高
- **推定工数**: 2〜3時間
- **参照レポート**: [REPORT.md](./REPORT.md)

---

## 1. タスク概要

コミット `78be5413` でバックエンドAPIルートが `/:projectName` → `/:projectId`（UUID）に移行したが、  
フロントエンドの呼び出し側コンポーネントの修正が漏れており、6ファイル・計17箇所でプロジェクト名をIDとして渡しているバグを修正する。

---

## 2. 目的と期待される成果

### 目的
- プロジェクト選択後のファイル一覧・タスク一覧取得エラーを解消する
- タスク登録・指示登録タブの動作を正常化する
- 進捗監視画面の詳細ボタンを正常動作させる
- S3添付ファイルの保存パスを正常化する

### 期待される成果
- [ ] `ProjectManagement.tsx` のファイル/タスク一覧取得が全て正常動作する
- [ ] `TaskRegistrationTab.tsx` のデータ取得・保存が正常動作する
- [ ] `InstructionRegistrationTab.tsx` のデータ取得が正常動作する
- [ ] `ProgressMonitoring.tsx` の詳細ボタンが正常動作する
- [ ] `ExperimentRecordTab.tsx` → `DataRecordDialog.tsx` のS3パスが正常化する

---

## 3. 実装ステップ

### Phase 1: 🔴 エラーになる箇所を修正（優先度: 最高）

#### Step 1-1: `ProjectManagement.tsx` の修正（9箇所）

**修正内容**: `getProjectFiles` / `getProjectTasks` の引数を `.name` → `.id` に変更

| 行番号 | 変更前 | 変更後 |
|-------|--------|--------|
| L471 | `getProjectFiles(selectedProject.name, true)` | `getProjectFiles(selectedProject.id, true)` |
| L1175付近 | `getProjectFiles(selectedProject.name, true)` | `getProjectFiles(selectedProject.id, true)` |
| L1297 | `getProjectFiles(currentProjectName, true)` | `getProjectFiles(currentProjectId, true)` |
| L1311 | `getProjectTasks(currentProjectName, 'all')` | `getProjectTasks(currentProjectId, 'all')` |
| L1354 | `getProjectFiles(newName, true)` | `getProjectFiles(selectedProjectId, true)` |
| L1745 | `getProjectFiles(selectedProject.name, true)` | `getProjectFiles(selectedProject.id, true)` |
| L1756 | `getProjectTasks(selectedProject.name, 'all')` | `getProjectTasks(selectedProject.id, 'all')` |
| L1787 | `getProjectFiles(selectedProject.name, true)` | `getProjectFiles(selectedProject.id, true)` |
| L1851 | `getProjectTasks(selectedProject.name, 'all')` | `getProjectTasks(selectedProject.id, 'all')` |

- [ ] L471 修正
- [ ] L1175付近 修正
- [ ] L1297 修正（`currentProjectName` → `currentProjectId`）
- [ ] L1311 修正（`currentProjectName` → `currentProjectId`）
- [ ] L1354 修正（`newName` → `selectedProjectId`）
- [ ] L1745 修正
- [ ] L1756 修正
- [ ] L1787 修正
- [ ] L1851 修正

#### Step 1-2: `TaskRegistrationTab.tsx` の修正（3箇所）

**修正内容**: データ取得・保存APIの引数を `projectName` → `projectId` に変更

- [ ] `getInstructions(projectName)` → `getInstructions(projectId)`
- [ ] `getTaskRegistration(projectName)` → `getTaskRegistration(projectId)`
- [ ] `saveTaskRegistration(projectName, ...)` → `saveTaskRegistration(projectId, ...)`

#### Step 1-3: `InstructionRegistrationTab.tsx` の修正（2箇所）

**修正内容**: データ取得APIの引数を `projectName` → `projectId` に変更

- [ ] `getTaskRegistration(projectName)` → `getTaskRegistration(projectId)`
- [ ] `getInstructions(projectName)` → `getInstructions(projectId)`

#### Step 1-4: `ProgressMonitoring.tsx` の修正（1箇所）

**修正内容**: `getProjectFiles` の引数を `record.projectName` → `record.projectId` に変更

- [ ] `getProjectFiles(record.projectName, false)` → `getProjectFiles(record.projectId, false)`

---

### Phase 2: 🟡 S3パス不正の修正（優先度: 高）

#### Step 2-1: `ExperimentRecordTab.tsx` → `DataRecordDialog.tsx` の修正

**問題の詳細**:
- `ExperimentRecordTab` は `selectedProject`（UUID）を `projectName` propとして `DataRecordDialog` に渡している
- `DataRecordDialog` 内で `projects/${projectName}/attachments` というS3パスを構築するためUUIDが入り込む

**調査が必要な点**:
- `getWorkerTasks` のレスポンスにプロジェクト名が含まれているか確認
- `WorkerProject` 型や `getWorkerAccessibleProjects` のレスポンスにプロジェクト名が含まれているか確認

**修正方針（案A）**:  
`ExperimentRecordTab` で `getWorkerTasks` のレスポンスからプロジェクト名を取得し、`projectName` propに渡す

**修正方針（案B）**:  
`DataRecordDialog` の `projectName` prop をなくし、S3パス構築は `projectId` → プロジェクト名の変換を別途行う

- [ ] `getWorkerTasks` レスポンスにプロジェクト名が含まれているか確認
- [ ] 修正方針を確定する
- [ ] `ExperimentRecordTab.tsx` を修正
- [ ] `DataRecordDialog.tsx` のS3パス構築を修正（必要に応じて）

#### Step 2-2: `ProgressCheckTab.tsx` の確認・修正

**問題の詳細**:
- `ProgressCheckTable` に `projectName={selectedProject || ''}` でUUIDを渡している
- `IssueManagementModal` に `projectName={selectedProject || ''}` でUUIDを渡している

**修正内容**:
- `ExperimentWorkerMenu` から `selectedProjectName` state が既に管理されているため、それを子コンポーネントへ渡す形に修正する

- [ ] `ExperimentWorkerMenu.tsx` で管理している `selectedProjectName` を `ProgressCheckTab` に渡す
- [ ] `ProgressCheckTab.tsx` の Props に `selectedProjectName` を追加し、子コンポーネントへ渡す

---

### Phase 3: 動作確認

- [ ] `ProjectManagement.tsx`: プロジェクト選択 → ファイル一覧・タスク一覧が正常表示されること
- [ ] `TaskRegistrationTab.tsx`: タスク登録タブを開いてデータ取得・保存が動作すること
- [ ] `InstructionRegistrationTab.tsx`: 指示登録タブを開いてデータ取得が動作すること
- [ ] `ProgressMonitoring.tsx`: 詳細ボタン押下でファイル一覧が取得できること
- [ ] `ExperimentRecordTab.tsx`: 添付ファイルアップロード時のS3パスにプロジェクト名が入ること

---

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/components/project/ProjectManagement.tsx` - 9箇所（getProjectFiles/getProjectTasks の引数修正）
2. `frontend/src/components/project/TaskRegistrationTab.tsx` - 3箇所（getInstructions/getTaskRegistration/saveTaskRegistration の引数修正）
3. `frontend/src/components/project/InstructionRegistrationTab.tsx` - 2箇所（getTaskRegistration/getInstructions の引数修正）
4. `frontend/src/components/progress/ProgressMonitoring.tsx` - 1箇所（getProjectFiles の引数修正）
5. `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx` - projectName prop修正
6. `frontend/src/components/ExperimentWorker/ProgressCheckTab.tsx` - projectName prop修正（必要に応じて）
7. `frontend/src/components/menus/ExperimentWorkerMenu.tsx` - selectedProjectName の受け渡し（必要に応じて）

### 新規作成するファイル
なし

### 影響を受ける機能
- プロジェクト管理画面: ファイル一覧・タスク一覧・タスク登録・指示登録タブ
- 進捗監視画面: 詳細ボタン
- 実験作業画面: 進捗確認タブ・データ記録ダイアログ

---

## 5. 技術的詳細

### 修正の基本ルール
- `getProjectFiles`, `getProjectTasks`, `getTaskRegistration`, `saveTaskRegistration`, `getInstructions` は全て **UUID（projectId）** を第1引数に渡す
- S3パス構築（`projects/${name}/...`）には **プロジェクト名** を使用する（UUIDではない）
- UI表示用には **プロジェクト名** を使用する

### 変数名の対応関係（ProjectManagement.tsx内）
| 変数名 | 内容 |
|--------|------|
| `selectedProjectId` | UUID（API呼び出しに使用） |
| `selectedProject.id` | UUID（API呼び出しに使用） |
| `selectedProject.name` | プロジェクト名（表示・S3パスに使用） |
| `currentProjectId` | handleProjectReload内のUUID |
| `currentProjectName` | handleProjectReload内の名前（S3パスに使用する場合のみ） |

---

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| handleRenameSuccess での `newName` の扱い | 高 | 高 | リネーム後は `selectedProjectId` を使用（IDは変わらない） |
| ExperimentRecordTab のプロジェクト名取得方法 | 中 | 中 | getWorkerTasks レスポンスにproject_nameが含まれているか先に確認する |
| ProgressCheckTab の修正による他コンポーネントへの影響 | 低 | 低 | Props追加のみなので後方互換性あり |

---

## 7. テスト計画

### 手動テスト
- [ ] プロジェクト管理画面でプロジェクトを選択 → ファイル一覧が表示される
- [ ] ファイル管理タブ → タスク結果タブへの切り替えでエラーが出ない
- [ ] リロードボタンでファイル/タスクが再取得される
- [ ] プロジェクト名変更後にファイル一覧が再取得される
- [ ] タスク登録タブでタスク一覧が取得される
- [ ] タスク登録タブでタスクが保存できる
- [ ] 指示登録タブで指示一覧が取得される
- [ ] 進捗監視画面で詳細ボタンを押してファイル一覧が表示される
- [ ] 実験記録タブで添付ファイルをアップロードし正常なS3パスに保存される

---

## 8. 承認記録

- **計画書提示日時**: 2026-04-13 15:31
- **承認日時**: （承認後に記入）
- **承認者コメント**: （承認後に記入）
