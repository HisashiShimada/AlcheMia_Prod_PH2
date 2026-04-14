# 修正結果レポート: projectId/projectName 混同バグ修正

## 実施日時
2026-04-13 15:36 〜 15:48

## 背景
コミット `78be5413` でバックエンドAPIルートが `/:projectName` → `/:projectId`（UUID）に移行済みだが、フロントエンドコンポーネントの呼び出し側に修正漏れが複数存在していた。

`projectApiService.ts` の全API関数は `projectId`（UUID）を第1引数に期待しているが、一部のコンポーネントでは `project.name`（プロジェクト名文字列）を渡しており、APIエラーまたはS3パス不正が発生していた。

---

## 修正方針

| 用途 | 渡す値 |
|---|---|
| API呼び出し | UUID（projectId） |
| S3パス構築・UI表示 | プロジェクト名（projectName） |

---

## Phase 1: 即時修正（APIエラーになる箇所）

### 1. `frontend/src/components/project/ProjectManagement.tsx`（9箇所）

`getProjectFiles` / `getProjectTasks` の引数を `.name` → `.id` に変更。

| 行 | 変更前 | 変更後 |
|---|---|---|
| L471 | `getProjectFiles(selectedProject.name, true)` | `getProjectFiles(selectedProject.id, true)` |
| L1175付近（ファイル削除後再取得） | `getProjectFiles(selectedProject.name, true)` | `getProjectFiles(selectedProject.id, true)` |
| L1297 | `getProjectFiles(currentProjectName, true)` | `getProjectFiles(currentProjectId, true)` |
| L1311 | `getProjectTasks(currentProjectName, 'all')` | `getProjectTasks(currentProjectId, 'all')` |
| L1354 | `getProjectFiles(newName, true)` | `getProjectFiles(selectedProjectId, true)` |
| L1745 | `getProjectFiles(selectedProject.name, true)` | `getProjectFiles(selectedProject.id, true)` |
| L1756 | `getProjectTasks(selectedProject.name, 'all')` | `getProjectTasks(selectedProject.id, 'all')` |
| L1787 | `getProjectFiles(selectedProject.name, true)` | `getProjectFiles(selectedProject.id, true)` |
| L1851 | `getProjectTasks(selectedProject.name, 'all')` | `getProjectTasks(selectedProject.id, 'all')` |

### 2. `frontend/src/components/project/TaskRegistrationTab.tsx`（3箇所）

| 変更前 | 変更後 |
|---|---|
| `getInstructions(projectName)` | `getInstructions(projectId)` |
| `getTaskRegistration(projectName)` | `getTaskRegistration(projectId)` |
| `saveTaskRegistration(projectName, ...)` | `saveTaskRegistration(projectId, ...)` |

### 3. `frontend/src/components/project/InstructionRegistrationTab.tsx`（2箇所）

| 変更前 | 変更後 |
|---|---|
| `getTaskRegistration(projectName)` | `getTaskRegistration(projectId)` |
| `getInstructions(projectName)` | `getInstructions(projectId)` |

### 4. `frontend/src/components/progress/ProgressMonitoring.tsx`（1箇所）

| 変更前 | 変更後 |
|---|---|
| `getProjectFiles(record.projectName, false)` | `getProjectFiles(record.projectId, false)` |

---

## Phase 2: S3パス不正の修正

### 5. `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx`

**問題**: `selectedProject`（UUID）が `DataRecordDialog` と `TransitionList` の `projectName` prop にそのまま渡されており、S3パス `projects/${projectName}/attachments` に UUID が入っていた。

**修正内容**:
- Props に `selectedProjectName?: string` を追加
- `DataRecordDialog` の `projectName` prop: `selectedProject` → `selectedProjectName || selectedProject`
- `TransitionList` の `projectName` prop: `selectedProject` → `selectedProjectName || selectedProject`

```tsx
// 変更前
projectName={selectedProject || undefined}

// 変更後
projectName={selectedProjectName || selectedProject || undefined}
```

### 6. `frontend/src/components/ExperimentWorker/ProgressCheckTab.tsx`

**修正内容**:
- Props に `selectedProjectName?: string` を追加（将来的なUI表示用・IssueManagementModal への正しいプロジェクト名渡し対応）
- 関数シグネチャのデストラクチャリングに `selectedProjectName` を追加

### 7. `frontend/src/components/menus/ExperimentWorkerMenu.tsx`

**問題**: `ExperimentRecordTab` と `ProgressCheckTab` に `selectedProjectName` prop を渡していなかった。`ExperimentWorkerMenu` には既に `selectedProjectName` state が存在しており、プロジェクト変更時に正しく更新されていた。

**修正内容**:
- `ProgressCheckTab` 呼び出しに `selectedProjectName={selectedProjectName}` を追加
- `ExperimentRecordTab` 呼び出しに `selectedProjectName={selectedProjectName}` を追加

```tsx
// ProgressCheckTab
<ProgressCheckTab
    selectedProject={selectedProject}
    selectedProjectName={selectedProjectName}  // 追加
    ...
/>

// ExperimentRecordTab
<ExperimentRecordTab
    selectedProject={selectedProject}
    selectedProjectName={selectedProjectName}  // 追加
    ...
/>
```

---

## Phase 3: バックエンドコントローラー・サービス修正

フロントエンド修正後、バックエンド側でもルートパラメータ名と DB 検索方法の不整合が残っていたため修正。

### 8. `backend/src/controllers/taskRegistrationController.ts`（2関数）

`getTaskRegistration` / `saveTaskRegistration` の両関数:

| 変更前 | 変更後 |
|---|---|
| `req.params.projectName` | `req.params.projectId` |
| サービス引数 `projectName` | サービス引数 `projectId` |
| エラーログキー `projectName` | エラーログキー `projectId` |

### 9. `backend/src/services/taskRegistrationService.ts`（2関数）

`getTaskRegistration` / `saveTaskRegistration` の両関数:

| 変更前 | 変更後 |
|---|---|
| 引数名 `projectName: string` | 引数名 `projectId: string` |
| `projectRepository.findByName(organizationId, projectName)` | `projectRepository.findByIdFull(organizationId, projectId)` |
| S3パス直接構築 | `const projectName = project.project_name` で取得後にパス構築（S3パスは変更なし） |

### 10. `backend/src/controllers/projectInstructionController.ts`（6関数）

`getInstructions` / `getTaskRegistrationStatus` / `saveInstruction` / `updateInstruction` / `deleteInstruction` / `sendInstructions` の全関数:

| 変更前 | 変更後 |
|---|---|
| `req.params.projectName` | `req.params.projectId` |
| `projectRepository.findByName(...)` | `projectRepository.findByIdFull(...)` |
| エラーログキー `projectName` | エラーログキー `projectId` |
| `sendInstructions` で `project.project_name` を渡す | `project.project_name!` を渡す（S3パス構築用） |

---

## 修正ファイル一覧

| ファイル | 修正箇所数 | 種別 |
|---|---|---|
| `frontend/src/components/project/ProjectManagement.tsx` | 9 | Phase 1 |
| `frontend/src/components/project/TaskRegistrationTab.tsx` | 3 | Phase 1 |
| `frontend/src/components/project/InstructionRegistrationTab.tsx` | 2 | Phase 1 |
| `frontend/src/components/progress/ProgressMonitoring.tsx` | 1 | Phase 1 |
| `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx` | 3 | Phase 2 |
| `frontend/src/components/ExperimentWorker/ProgressCheckTab.tsx` | 2 | Phase 2 |
| `frontend/src/components/menus/ExperimentWorkerMenu.tsx` | 2 | Phase 2 |
| `backend/src/controllers/taskRegistrationController.ts` | 2 | Phase 3 |
| `backend/src/services/taskRegistrationService.ts` | 2 | Phase 3 |
| `backend/src/controllers/projectInstructionController.ts` | 6 | Phase 3 |

**合計修正箇所: 32箇所**

---

## 動作確認

TypeScript ビルドチェック（`npx tsc --noEmit`）で修正対象ファイルすべてに型エラーなしを確認。  
（既存テストファイルの `role` プロパティに関する無関係なエラーのみ残存）

---

## 注意事項

- `DataRecordDialog` 内の `projectName` prop は S3パス構築（`projects/${projectName}/attachments`）とAPIコール（`saveBatchExperimentData`, `updateTransitionStatus`, `getTemplateData`）の両方に使われているため、引き続きプロジェクト名（UUID ではなく文字列名）を渡す必要がある。
- `selectedProjectName || selectedProject` のフォールバックは後方互換性のためであり、`selectedProjectName` が正しく渡されていれば UUID がS3パスに入ることはない。
