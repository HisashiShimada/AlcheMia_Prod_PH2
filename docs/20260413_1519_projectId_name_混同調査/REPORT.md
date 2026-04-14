# 調査レポート: projectId / projectName 混同バグ調査

- **作成日時**: 2026-04-13 15:19
- **調査トリガー**: `ProjectManagement.tsx` でプロジェクト選択時にファイル一覧取得エラー
- **ベースコミット**: `78be5413`（2026-04-08「改善仕様書No.2:指摘取り込み」）

---

## 1. 背景・前提

コミット `78be5413` にて、バックエンドの全プロジェクト関連ルートを  
`/:projectName` → `/:projectId`（UUID）に移行した。  
`projectApiService.ts` の全API関数も引数を `projectId: string`（UUID）に変更済み。

しかし、**呼び出し側（コンポーネント）の修正が漏れた箇所**が複数残っている。

---

## 2. 確認済み：コミット78be5413で修正された箇所

| ファイル | 修正内容 |
|---------|---------|
| `InstructionRegistrationTab.tsx` | `saveInstruction/updateInstruction/deleteInstruction/sendInstructions` → `projectId`に修正 ✅ |
| `MaimlPublishDialog.tsx` | `publishProject(projectName)` → `publishProject(projectId)` ✅ |
| `MaimlUnpublishDialog.tsx` | `unpublishProject(projectName)` → `unpublishProject(projectId)` ✅ |
| `ProjectManagement.tsx` | `checkinProject/checkoutProject/getPublishStatus/deleteProject/completeReviewTasks` → `selectedProject.id`に修正 ✅ |
| `projectApiService.ts` | 全API関数の引数を `projectId`（UUID）に統一 ✅ |

---

## 3. 修正漏れ一覧（現在もバグが残っている箇所）

### 🔴 Bug-1: `ProjectManagement.tsx`

| 箇所 | 呼び出し | 渡している値 | 正しい値 |
|------|---------|------------|--------|
| L471（プロジェクト選択時の初期ファイルロード） | `getProjectFiles(selectedProject.name, true)` | `selectedProject.name` ❌ | `selectedProject.id` |
| L1175付近（ファイル削除後の再取得） | `getProjectFiles(selectedProject.name, true)` | `selectedProject.name` ❌ | `selectedProject.id` |
| L1297（handleProjectReload - ファイル一覧） | `getProjectFiles(currentProjectName, true)` | `currentProjectName`（name） ❌ | `currentProjectId` |
| L1311（handleProjectReload - タスク一覧） | `getProjectTasks(currentProjectName, 'all')` | `currentProjectName`（name） ❌ | `currentProjectId` |
| L1354（handleRenameSuccess - ファイル一覧） | `getProjectFiles(newName, true)` | `newName`（新しいプロジェクト名） ❌ | `selectedProjectId` |
| L1745（タブ切り替え - ファイル一覧） | `getProjectFiles(selectedProject.name, true)` | `selectedProject.name` ❌ | `selectedProject.id` |
| L1756（タブ切り替え - タスク一覧） | `getProjectTasks(selectedProject.name, 'all')` | `selectedProject.name` ❌ | `selectedProject.id` |
| L1787（ファイルリネーム後の再取得） | `getProjectFiles(selectedProject.name, true)` | `selectedProject.name` ❌ | `selectedProject.id` |
| L1851（タスク確認完了後の再取得） | `getProjectTasks(selectedProject.name, 'all')` | `selectedProject.name` ❌ | `selectedProject.id` |

**影響**: プロジェクト選択・タブ切り替え・リロード・リネーム・削除後のファイル/タスク一覧取得が全て失敗する。

---

### 🔴 Bug-2: `TaskRegistrationTab.tsx`

コンポーネントProps には `projectId` と `projectName` の両方があるが、データ取得系APIの呼び出しで全て `projectName` を使用している。

| 呼び出し | 渡している値 | 正しい値 |
|---------|------------|--------|
| `getInstructions(projectName)` | `projectName`（name） ❌ | `projectId` |
| `getTaskRegistration(projectName)` | `projectName`（name） ❌ | `projectId` |
| `saveTaskRegistration(projectName, ...)` | `projectName`（name） ❌ | `projectId` |

**影響**: タスク登録タブを開いた際のデータ取得・保存が全て失敗する。

---

### 🔴 Bug-3: `InstructionRegistrationTab.tsx`

コミット78be5413で書き込み系（`saveInstruction/updateInstruction/deleteInstruction/sendInstructions`）は修正済みだが、データ取得系が未修正。

| 呼び出し | 渡している値 | 正しい値 |
|---------|------------|--------|
| `getTaskRegistration(projectName)` | `projectName`（name） ❌ | `projectId` |
| `getInstructions(projectName)` | `projectName`（name） ❌ | `projectId` |

**影響**: 指示登録タブを開いた際のタスク登録状態・指示一覧の取得が失敗する。

---

### 🔴 Bug-4: `ProgressMonitoring.tsx`

| 呼び出し | 渡している値 | 正しい値 |
|---------|------------|--------|
| `getProjectFiles(record.projectName, false)` | `record.projectName`（name） ❌ | `record.projectId` |

**影響**: 進捗監視画面で「詳細」ボタンを押した際のファイル一覧取得が失敗する。

---

### 🟡 Bug-5: `ExperimentRecordTab.tsx` → `DataRecordDialog.tsx`（実害有り）

`ExperimentRecordTab` は `ExperimentWorkerMenu` から `selectedProject`（UUID）を受け取り、  
`DataRecordDialog` に対して以下のように渡している：

```tsx
// ExperimentRecordTab.tsx
<DataRecordDialog
  projectId={selectedProject}       // UUID ✅（正しい）
  projectName={selectedProject}     // UUID を projectName として渡している ❌
  ...
/>
```

`DataRecordDialog` 内では `projectName` を以下に使用：

| 呼び出し | 使用方法 | 問題 |
|---------|---------|------|
| `updateTransitionStatus(projectName, ...)` | UUID渡しのためAPIは動作する（偶然一致）| ファイルパス構築が壊れる |
| `saveBatchExperimentData(projectName, ...)` | UUID渡しのためAPIは動作する（偶然一致）| - |
| `getTemplateData(projectName, ...)` | UUID渡しのためAPIは動作する（偶然一致）| - |
| `projects/${projectName}/attachments` | UUIDがパスに入る ❌ | S3パスが不正になる |

**現状**: `ExperimentWorkerMenu` が `selectedProject` にUUIDを使用しているため、API呼び出し自体は偶然動作している。  
ただし、**ファイルアップロードパス** `projects/${projectName}/attachments` にUUIDが入るため、S3の添付ファイル保存パスが壊れている。

---

### 🟡 Bug-6: `ProgressCheckTab.tsx`（表示用途のみ、実害は限定的）

`ExperimentWorkerMenu` から受け取った `selectedProject`（UUID）を  
`projectName` として子コンポーネントに渡している：

```tsx
// ProgressCheckTab.tsx
<ProgressCheckTable projectName={selectedProject || ''} />
<IssueManagementModal projectName={selectedProject || ''} ... />
```

`getWorkerTasks(selectedProject)` 等のAPI呼び出しは UUID を正しく使用しているが、  
`ProgressCheckTable` 内でファイルパス表示等に `projectName` を使う場合はUUIDが表示される恐れがある。

---

## 4. 影響まとめ

| ファイル | 影響するAPI / 機能 | 実害 |
|---------|-----------------|------|
| `ProjectManagement.tsx` | `getProjectFiles`, `getProjectTasks`（9箇所） | 🔴 エラー（画面が正常動作しない） |
| `TaskRegistrationTab.tsx` | `getTaskRegistration`, `saveTaskRegistration`, `getInstructions`（3箇所） | 🔴 エラー |
| `InstructionRegistrationTab.tsx` | `getTaskRegistration`, `getInstructions`（2箇所） | 🔴 エラー |
| `ProgressMonitoring.tsx` | `getProjectFiles`（1箇所） | 🔴 エラー |
| `ExperimentRecordTab.tsx` → `DataRecordDialog.tsx` | S3添付ファイルパス構築 | 🟡 S3パスが不正 |
| `ProgressCheckTab.tsx` | `projectName` prop の内容がUUID | 🟡 表示上の問題（限定的） |

---

## 5. 修正方針

### 基本方針
全ての `getProjectFiles`, `getProjectTasks`, `getTaskRegistration`, `saveTaskRegistration`, `getInstructions` 等のAPI呼び出しは **UUID（projectId）** を渡す。

### 各ファイルの修正方法

#### `ProjectManagement.tsx`
- `selectedProject.name` → `selectedProject.id`
- `currentProjectName` → `currentProjectId`
- `newName`（リネーム後） → `selectedProjectId`

#### `TaskRegistrationTab.tsx`
- `getInstructions(projectName)` → `getInstructions(projectId)`
- `getTaskRegistration(projectName)` → `getTaskRegistration(projectId)`
- `saveTaskRegistration(projectName, ...)` → `saveTaskRegistration(projectId, ...)`

#### `InstructionRegistrationTab.tsx`
- `getTaskRegistration(projectName)` → `getTaskRegistration(projectId)`
- `getInstructions(projectName)` → `getInstructions(projectId)`

#### `ProgressMonitoring.tsx`
- `getProjectFiles(record.projectName, false)` → `getProjectFiles(record.projectId, false)`

#### `ExperimentRecordTab.tsx`
- `<DataRecordDialog projectName={selectedProject} ...>` → `projectName` propsに実際のプロジェクト名を渡すよう修正  
  （またはS3パス構築にIDではなく名前が必要なため、APIレスポンスからプロジェクト名を取得して渡す）

---

## 6. 根本原因

コミット `78be5413` で `projectApiService.ts` の関数シグネチャを `projectName` → `projectId` に変更したが、  
TypeScriptの型は `string` → `string` のままで型エラーが発生せず、**呼び出し側のコンパイルエラーが出なかった**ため修正漏れが多数生じた。

### 再発防止策
- `projectId` と `projectName` をそれぞれ **Branded Type**（`type ProjectId = string & { __brand: 'ProjectId' }`）で定義することで、型レベルで混同を防ぐ
- または API関数のパラメータ名を `id` に統一し、型検査を強化する

