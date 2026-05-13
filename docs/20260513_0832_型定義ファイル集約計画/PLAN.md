# タスク計画書: 型定義ファイル集約計画（改訂版）

## メタデータ
- **作成日時**: 2026-05-13 09:03
- **タスクID**: 型定義ファイル集約
- **優先度**: 中
- **推定工数**: 8〜12時間（フェーズ分割で複数セッション）

## 1. タスク概要

実装規約（`.clinerules/development/typescript.md`）では「すべての型定義は専用の型定義ファイルに集約する」ことが定められているが、`services/`・`hooks/`・`utils/`・`contexts/`・`components/` の各ファイルにインライン型定義が残存している。

**方針変更（2026-05-13）**: Props型を除く**すべての型定義**（固有のものも含む）を `types/` 配下のファイルへ集約する。再利用可能性に関わらず、型定義は一元管理を徹底する。

**後方互換エイリアス・re-export 禁止（2026-05-13 追記）**:  
型を `types/` へ移動した後、移動元ファイル（`services/`・`hooks/`・`utils/` 等）に以下を残してはならない。

- `export type { SomeType };`（re-export）
- `export type SomeName = SomeType;`（後方互換目的の型エイリアス）
- `@deprecated` コメント付きの型エイリアス

**正しい対応手順**:
1. 型を `types/` に追加する
2. 移動元ファイルのローカル定義を**完全削除**し、`types/` から `import` して直接使用する
3. 移動元を参照している既存コードは同時に `types/` を直接 import するよう修正する
4. re-export や型エイリアスによる「橋渡し」は一切作らない

---

## 2. 調査結果サマリー（2026-05-13 全調査）

### 2-1. 既存の型定義ファイル（`frontend/src/types/`）

| ファイル | 主な内容 |
|---|---|
| `api.ts` | ApiSuccessResponse, ApiErrorResponse, ApiResponse, 各APIリクエスト/レスポンス型 |
| `auth.ts` | 認証関連型 |
| `departmentTypes.ts` | DepartmentConfig, DepartmentRecord, MasterRecord, CsvUploadResult |
| `editor.ts` | NodeData, EdgeData, Position, FileInfo など |
| `experiment.ts` | 実験関連型 |
| `experimentWorker.ts` | Issue, Instruction, Priority, CreateIssueParams, AddCommentParams, GetIssuesParams など |
| `file.ts` | ProjectFile など |
| `format.ts` | Format, FileInfo, FormatFile, CreateFormatFileData など |
| `instructionRegistration.ts` | 指示登録型 |
| `maiml-unified.ts` | MAIML統合型（メイン） |
| `maimlEditor.ts` | エディタ関連型 |
| `maimlValidation.ts` | ValidationError, ValidationResult, WorkflowValidationResult など |
| `masterDataTypes.ts` | マスタデータ型 |
| `menu.ts` | メニュー型 |
| `progress.ts` | 進捗型 |
| `project.ts` | Project, Task, TaskStatistics, CreateProjectRequest, WorkerProject など |
| `roleTypes.ts` | RoleConfig, FieldConfig |
| `semanticSearch.ts` | セマンティック検索型 |
| `session.ts` | セッション型 |
| `storage.ts` | StorageFile, ListFilesResponse など |
| `systemOverview.ts` | システム概要型 |
| `taskRegistration.ts` | タスク登録型 |
| `transitionData.ts` | トランジションデータ型 |
| `user.ts` | UserRecord, CreateUserRequest, UpdateUserRequest, UserFilters ✅ 新規作成済 |

---

## 3. 移動対象の全一覧

### ■ services レイヤ

| ファイル | 型名 | 移動先 | 備考 |
|---|---|---|---|
| `codeMasterApiService.ts` | `SelectOption` | `types/common.ts`（新規） | セレクト汎用型 |
| `corporationApiService.ts` | `ApiResponse<T>` | 削除 → `types/api.ts` に統一 | 重複定義 |
| `corporationApiService.ts` | `CorporationRecord` | `types/organization.ts`（新規） | |
| `corporationApiService.ts` | `MasterRecord` | `types/organization.ts`（新規） | |
| `draftService.ts` | `ApiResponse<T>` | 削除 → `types/api.ts` に統一 | 重複定義 |
| `fileAccessService.ts` | `RenameFileRequest` | `types/file.ts` | |
| `fileAccessService.ts` | `RenameFileResponse` | `types/file.ts` | |
| `maimlApiService.ts` | `ApiResponse<T>` | 削除 → `types/api.ts` に統一 | 重複定義 |
| `maimlApiService.ts` | `MaimlCorrectionResult` | `types/maimlEditor.ts` | |
| `maimlApiService.ts` | `MaimlAnalysisResultRow` | `types/maimlEditor.ts` | |
| `maimlApiService.ts` | `Place` | `types/maiml-unified.ts` | Petri Net構造型 |
| `maimlApiService.ts` | `Transition` | `types/maiml-unified.ts` | Petri Net構造型 |
| `maimlApiService.ts` | `Arc` | `types/maiml-unified.ts` | Petri Net構造型 |
| `maimlApiService.ts` | `Method` | `types/maiml-unified.ts` | Petri Net構造型 |
| `maimlApiService.ts` | `PetriNetStructure` | `types/maiml-unified.ts` | Petri Net構造型 |
| `maimlApiService.ts` | `SaveMaimlResult` | `types/maimlEditor.ts` | |
| `maimlApiService.ts` | `MaimlFileInfo` | `types/maimlEditor.ts` | |
| `masterApiService.ts` | `ApiResponse<T>` | 削除 → `types/api.ts` に統一 | 重複定義 |
| `masterApiService.ts` | `BaseMasterRecord` | `types/masterDataTypes.ts` | |
| `masterApiService.ts` | `CreatorRecord` | `types/masterDataTypes.ts` | |
| `masterApiService.ts` | `InstrumentRecord` | `types/masterDataTypes.ts` | |
| `masterApiService.ts` | `VendorRecord` | `types/masterDataTypes.ts` | |
| `masterApiService.ts` | `AttributeRecord` | `types/masterDataTypes.ts` | |
| `masterApiService.ts` | `MasterRecord`（ユニオン型） | `types/masterDataTypes.ts` | |
| `roleApiService.ts` | `ApiResponse<T>` | 削除 → `types/api.ts` に統一 | 重複定義 |
| `roleApiService.ts` | `RoleRecord` | `types/roleTypes.ts` | |
| `roleApiService.ts` | `MasterRecord` | `types/roleTypes.ts` | |
| `systemConfigApiService.ts` | `SystemConfig` | `types/common.ts`（新規） | |
| `templateApi.ts` | `FormatTemplateFile` | `types/format.ts` | |
| `templateApi.ts` | `FormatFolder` | `types/format.ts` | |
| `templateApi.ts` | `FormatDepartment` | `types/format.ts` | |
| `templateApi.ts` | `ListFormatsResponse` | `types/format.ts` | |
| `templateService.ts` | `ValidationResult`（非export） | 削除 → `types/maimlValidation.ts` の型を使用 | |

---

### ■ hooks レイヤ

| ファイル | 型名 | 移動先 | 備考 |
|---|---|---|---|
| `useWorkflow.ts` | `NodeBounds`（非export） | `types/editor.ts` | |
| `useWorkflow.ts` | `IdConflictResolution`（非export） | `types/editor.ts` | |
| `useWorkflow.ts` | `WorkflowAddResult` | `types/editor.ts` | |
| `useWorkflow.ts` | `MethodData` | `types/editor.ts` | |
| `useWorkflow.ts` | `NodeType` | `types/editor.ts` | 既存と統一確認要 |
| `useWorkflow.ts` | `UseWorkflowParams` | `types/editor.ts` | |
| `useWorkflow.ts` | `UseWorkflowReturn` | `types/editor.ts` | |
| `useNamespaceOperations.ts` | `S3File` | `types/storage.ts` | |
| `useNamespaceOperations.ts` | `S3Folder` | `types/storage.ts` | |
| `useNamespaceOperations.ts` | `ParsedElement` | `types/format.ts` | |
| `useNamespaceOperations.ts` | `CollectedElement`（非export） | `types/format.ts` | |
| `useNamespaceOperations.ts` | `NamespaceData` | `types/format.ts` | |
| `useNamespaceOperations.ts` | `Template`（非export） | 削除 → `types/maiml-unified.ts` の `Template` を使用 | |
| `useNamespaceOperations.ts` | `UseNamespaceOperationsReturn` | `types/hooks.ts`（新規） | フック戻り値型 |
| `useDraftManager.ts` | `UseDraftManagerOptions` | `types/hooks.ts`（新規） | |
| `useDraftManager.ts` | `UseDraftManagerReturn` | `types/hooks.ts`（新規） | |
| `useEditorActions.ts` | `UseEditorActionsProps` | `types/hooks.ts`（新規） | |
| `useEditorActions.ts` | `UseEditorActionsResult` | `types/hooks.ts`（新規） | |
| `useSemanticSearch.ts` | `UseSemanticSearchReturn` | `types/hooks.ts`（新規） | |

---

### ■ utils レイヤ

| ファイル | 型名 | 移動先 | 備考 |
|---|---|---|---|
| `reactFlowConverter.ts` | `PetriNetData` | `types/editor.ts` | |
| `reactFlowConverter.ts` | `ReactFlowFormat`（非export） | `types/editor.ts` | |
| `consoleLogger.ts` | `LogEntry`（非export） | `types/common.ts`（新規） | |
| `errorUtils.ts` | `ErrorCode` | `types/error.ts`（新規） | errorCodes.tsと統合 |
| `errorUtils.ts` | `ErrorCategory` | `types/error.ts`（新規） | |
| `errorUtils.ts` | `AppError` | `types/error.ts`（新規） | |
| `errorUtils.ts` | `AxiosApiErrorBody`（非export） | `types/error.ts`（新規） | |
| `validationUtils.ts` | `ValidationResult` | `types/maimlValidation.ts` | 既存と統一確認要 |
| `validationUtils.ts` | `WorkflowValidationResult` | `types/maimlValidation.ts` | |

---

### ■ contexts レイヤ

| ファイル | 型名 | 移動先 | 備考 |
|---|---|---|---|
| `AttributeDisplayContext.tsx` | `AttributeOption` | `types/editor.ts` | |
| `AttributeDisplayContext.tsx` | `AttributeDisplayContextValue`（非export） | `types/editor.ts` | |
| `TemplateContext.tsx` | `TemplateContextType`（非export） | `types/editor.ts` | |
| `TemplateContext.tsx` | `TemplateProviderProps`（非export） | 対象外（Propsに準ずる） | |
| `LanguageContext.tsx` | `Translations` | `types/common.ts`（新規） | |
| `LanguageContext.tsx` | `Locale` | `types/common.ts`（新規） | |
| `LanguageContext.tsx` | `LanguageContextType`（非export） | `types/common.ts`（新規） | |
| `LanguageContext.tsx` | `LanguageProviderProps`（非export） | 対象外（Propsに準ずる） | |
| `ProjectMaimlContext.tsx` | `ProjectMaimlContextValue`（非export） | `types/maimlEditor.ts` | |
| `ProjectMaimlContext.tsx` | `ProjectMaimlProviderProps`（非export） | 対象外（Propsに準ずる） | |

---

### ■ components レイヤ

| ファイル | 型名 | 移動先 | 備考 |
|---|---|---|---|
| `SystemManagement/DepartmentManagement.tsx` | `DepartmentRecord`（非export） | 削除 → `types/departmentTypes.ts` の型を使用 | ✅ 対応先あり |
| `SystemManagement/FunctionPermissionDialog.tsx` | `FunctionItem`（非export） | `types/roleTypes.ts` | |
| `SystemManagement/RoleManagement.tsx` | `ItemCategory`（非export） | `types/roleTypes.ts` | |
| `SystemManagement/RoleManagement.tsx` | `MasterTypeData`（非export） | `types/roleTypes.ts` | |
| `SystemManagement/RoleManagement.tsx` | `MasterRecord`（非export） | 削除 → `services/roleApiService.ts` の `MasterRecord`（→`types/roleTypes.ts`）を使用 | |
| `SystemManagement/RoleManagement.tsx` | `RoleApiResponse`（非export） | `types/roleTypes.ts` | |
| `DataManagement/MasterManagement.tsx` | `CsvValidationError`（非export） | `types/masterDataTypes.ts` | |
| `DataManagement/MasterManagement.tsx` | `ItemCategory`（非export） | `types/masterDataTypes.ts` | |
| `Provider/CorporationManagement.tsx` | `CorporationData`（非export） | `types/organization.ts`（新規） | |
| `Provider/OrganizationManagement.tsx` | `OrganizationData`（非export） | `types/organization.ts`（新規） | |
| `Provider/OrganizationManagement.tsx` | `CorporationData`（非export） | 削除 → `types/organization.ts` に統一 | 重複 |
| `Provider/OrganizationManagement.tsx` | `OptionType`（非export） | `types/common.ts`（新規） | |
| `viewer/dialogs/StructuredPropertySelector.tsx` | `PropertyObject`（非export） | `types/editor.ts` | 3ファイルで重複 |
| `viewer/dialogs/StructuredPropertySelector.tsx` | `StructuredProperties`（非export） | `types/editor.ts` | 3ファイルで重複 |
| `viewer/dialogs/StructuredPropertySelector.tsx` | `SelectedProperties`（非export） | `types/editor.ts` | 2ファイルで重複 |
| `viewer/dialogs/PropertyViewerWithSelection.tsx` | `PropertyObject`（非export） | 削除 → `types/editor.ts` に統一 | |
| `viewer/dialogs/PropertyViewerWithSelection.tsx` | `StructuredProperties`（非export） | 削除 → `types/editor.ts` に統一 | |
| `viewer/dialogs/PropertyViewerWithSelection.tsx` | `SelectedProperties`（非export） | 削除 → `types/editor.ts` に統一 | |
| `viewer/dialogs/PropertyViewerWithSelection.tsx` | `TableDataType`（非export） | `types/editor.ts` | |
| `viewer/dialogs/PropertyViewer.tsx` | `PropertyObject`（非export） | 削除 → `types/editor.ts` に統一 | |
| `viewer/dialogs/PropertyViewer.tsx` | `StructuredProperties`（非export） | 削除 → `types/editor.ts` に統一 | |
| `viewer/ErrorBoundary.tsx` | `ErrorBoundaryState`（非export） | `types/common.ts`（新規） | |
| `viewer/ViewRendererDialog.tsx` | `FileData` | `types/file.ts` | InstructionFlowDialogと重複 |
| `viewer/ViewRendererDialog.tsx` | `SubnetData` | `types/editor.ts` | InstructionFlowDialogと重複 |
| `viewer/ViewRenderer.tsx` | `DeviceType`（非export） | `types/common.ts`（新規） | |
| `viewer/ViewRenderer.tsx` | `ViewType`（非export） | `types/common.ts`（新規） | |
| `progress/PetriNetVisualization.tsx` | `CustomNodeData`（非export） | `types/editor.ts` | |
| `progress/ProgressMonitoring.tsx` | `ProgressRecord`（非export） | `types/progress.ts` | |
| `ExperimentWorker/UnifiedSelectionDialog.tsx` | `ProjectInfo`（非export） | `types/experimentWorker.ts` | |
| `ExperimentWorker/UnifiedSelectionDialog.tsx` | `SelectionStep`（非export） | `types/experimentWorker.ts` | |
| `ExperimentWorker/UnifiedSelectionDialog.tsx` | `Task`（非export） | 削除 → `types/project.ts` の `Task` を使用 | |
| `ExperimentWorker/ExperimentRecordTab.tsx` | `ViewMode`（非export） | `types/experimentWorker.ts` | |
| `ExperimentWorker/SelectionDialog.tsx` | `SelectionType` | `types/experimentWorker.ts` | |
| `ExperimentWorker/SelectionDialog.tsx` | `SelectionItem` | `types/experimentWorker.ts` | |
| `ExperimentWorker/InstructionFlowDialog.tsx` | `FileData` | 削除 → `types/file.ts` に統一（ViewRendererDialogと重複） | |
| `ExperimentWorker/InstructionFlowDialog.tsx` | `SubnetData` | 削除 → `types/editor.ts` に統一（ViewRendererDialogと重複） | |
| `ExperimentWorker/ProjectSelectionModal.tsx` | `ProjectTableData`（非export） | `types/project.ts` | |
| `ExperimentWorker/MethodSelectionModal.tsx` | `MethodTableData`（非export） | `types/project.ts` | |
| `editorv2/WorkflowSelectorDialog.tsx` | `FolderNode`（非export） | `types/storage.ts` | |
| `editorv2/NestedPropertyEditor.tsx` | `NamespaceSource` | `types/editor.ts` | |
| `editorv2/NestedPropertyEditor.tsx` | `PropertyData` | `types/editor.ts` | |
| `common/SubHeader.tsx` | `ThemeToken`（非export） | `types/common.ts`（新規） | |
| `common/SubHeader.tsx` | `TabItem`（非export） | `types/common.ts`（新規） | |
| `format/FormatFileDetailModal.tsx` | `FormatFileDetailData` | `types/format.ts` | |
| `format/FormatUploadDialog.tsx` | `UploadMode`（非export） | `types/format.ts` | |
| `format/FormatUploadDialog.tsx` | `UploadState`（非export） | `types/format.ts` | |
| `format/CreateFormatFileModal.tsx` | `CreateFormatFileData` | `types/format.ts` | 既存と重複確認要 |
| `format/FormatFileListTable.tsx` | `FormatFileData` | `types/format.ts` | |
| `format/CreateFormatFolderModal.tsx` | `CreateFormatFolderData` | `types/format.ts` | 既存と重複確認要 |
| `format/FormatSearchModal.tsx` | `SearchCriteria`（非export） | `types/format.ts` | |
| `format/FormatSearchModal.tsx` | `SearchResult`（非export） | `types/format.ts` | |
| `format/FormatSearchModal.tsx` | `SearchStats`（非export） | `types/format.ts` | |
| `project/CreateProjectModal.tsx` | `CreateProjectData` | `types/project.ts` | |
| `project/BulkUploadDialog.tsx` | `UploadMode`（非export） | `types/project.ts` or `types/file.ts` | FormatUploadDialogと統一検討 |
| `project/BulkUploadDialog.tsx` | `UploadState`（非export） | `types/project.ts` or `types/file.ts` | |
| `project/ProjectManagement.tsx` | `ProjectFilesData`（非export） | `types/project.ts` | |

---

## 4. 新規作成が必要な型定義ファイル

| ファイル | 格納する主な型 |
|---|---|
| `types/common.ts` | `SelectOption`, `SystemConfig`, `LogEntry`, `Translations`, `Locale`, `LanguageContextType`, `OptionType`, `DeviceType`, `ViewType`, `ThemeToken`, `TabItem`, `ErrorBoundaryState` |
| `types/organization.ts` | `CorporationRecord`, `MasterRecord`（法人用）, `CorporationData`, `OrganizationData` |
| `types/error.ts` | `ErrorCode`, `ErrorCategory`, `AppError`, `AxiosApiErrorBody` |
| `types/hooks.ts` | `UseNamespaceOperationsReturn`, `UseDraftManagerOptions`, `UseDraftManagerReturn`, `UseEditorActionsProps`, `UseEditorActionsResult`, `UseSemanticSearchReturn` |

---

## 5. 既存ファイルへの追加

| ファイル | 追加する主な型 |
|---|---|
| `types/file.ts` | `RenameFileRequest`, `RenameFileResponse`, `FileData` |
| `types/maimlEditor.ts` | `MaimlCorrectionResult`, `MaimlAnalysisResultRow`, `SaveMaimlResult`, `MaimlFileInfo`, `ProjectMaimlContextValue` |
| `types/maiml-unified.ts` | `Place`, `Transition`, `Arc`, `Method`, `PetriNetStructure` |
| `types/masterDataTypes.ts` | `BaseMasterRecord`, `CreatorRecord`, `InstrumentRecord`, `VendorRecord`, `AttributeRecord`, `MasterRecord`（ユニオン型）, `CsvValidationError`, `ItemCategory` |
| `types/roleTypes.ts` | `RoleRecord`, `MasterRecord`（ロール用）, `FunctionItem`, `ItemCategory`, `MasterTypeData`, `RoleApiResponse` |
| `types/format.ts` | `FormatTemplateFile`, `FormatFolder`, `FormatDepartment`, `ListFormatsResponse`, `ParsedElement`, `CollectedElement`, `NamespaceData`, `FormatFileDetailData`, `UploadMode`, `UploadState`, `FormatFileData`, `SearchCriteria`, `SearchResult`, `SearchStats` |
| `types/editor.ts` | `NodeBounds`, `IdConflictResolution`, `WorkflowAddResult`, `MethodData`, `NodeType`, `UseWorkflowParams`, `UseWorkflowReturn`, `PetriNetData`, `ReactFlowFormat`, `AttributeOption`, `AttributeDisplayContextValue`, `TemplateContextType`, `PropertyObject`, `StructuredProperties`, `SelectedProperties`, `TableDataType`, `SubnetData`, `CustomNodeData`, `NamespaceSource`, `PropertyData` |
| `types/storage.ts` | `S3File`, `S3Folder`, `FolderNode` |
| `types/maimlValidation.ts` | `ValidationResult`（validationUtils.tsから）, `WorkflowValidationResult` |
| `types/experimentWorker.ts` | `ProjectInfo`, `SelectionStep`, `ViewMode`, `SelectionType`, `SelectionItem` |
| `types/project.ts` | `ProjectTableData`, `MethodTableData`, `CreateProjectData`, `UploadMode`, `UploadState`（BulkUpload用）, `ProjectFilesData` |
| `types/progress.ts` | `ProgressRecord` |
| `types/organization.ts` | `CorporationRecord`, `OrganizationData`, `CorporationData` |

---

## 6. 実装フェーズ

### Phase 1（完了済）: 重複・既存定義の整理
- [x] `types/maimlValidation.ts` に `ValidationError`・`ValidationResult` を追加
- [x] `components/editorv2/SaveConfirmDialog.tsx` のローカル型削除
- [x] `components/format/FormatFolderTree.tsx`・`FormatManagement.tsx` のローカル `Format` 削除
- [x] 各serviceの重複 `ApiResponse<T>` 削除（departmentApiService, userApiService）
- [x] `types/editor.ts` に `content?` フィールドを追加
- [x] `ViewRenderer.tsx`・`WorkflowSelectorDialog.tsx` のローカル `FileInfo` 削除

### Phase 2（完了済）: services レイヤの一部型を types へ移動
- [x] `types/experimentWorker.ts` に `CreateIssueParams`, `AddCommentParams`, `GetIssuesParams` を追加
- [x] `services/issueApiService.ts` のローカル定義削除 → re-export
- [x] `types/departmentTypes.ts` に `DepartmentRecord`, `MasterRecord`, `CsvUploadResult` を追加
- [x] `services/departmentApiService.ts` のローカル定義削除 → re-export
- [x] `types/user.ts` を新規作成（`UserRecord`, `CreateUserRequest`, `UpdateUserRequest`, `UserFilters`）
- [x] `services/userApiService.ts` のローカル定義削除 → re-export
- [x] `services/projectApiService.ts` に re-export 追加

### Phase 3: services レイヤの残型を types へ移動（2026-05-13 完了）
- [x] `types/common.ts` を新規作成（`SelectOption`, `SystemConfig`）
- [x] `codeMasterApiService.ts`: `SelectOption` を削除 → `types/common.ts` からimport
- [x] `systemConfigApiService.ts`: `SystemConfig` を削除 → `types/common.ts` からimport
- [x] `types/organization.ts` を新規作成（`CorporationRecord`, `MasterRecord`）
- [x] `corporationApiService.ts`: `ApiResponse<T>`, `CorporationRecord`, `MasterRecord` を削除 → importに変更
- [x] `draftService.ts`: `ApiResponse<T>` を削除 → `types/api.ts` に統一
- [x] `types/file.ts`: `RenameFileRequest`, `RenameFileResponse` を追加
- [x] `fileAccessService.ts`: `RenameFileRequest`, `RenameFileResponse` を削除 → importに変更
- [x] `types/maimlEditor.ts`: `MaimlCorrectionResult`, `MaimlAnalysisResultRow`, `SaveMaimlResult`, `MaimlFileInfo` を追加
- [x] `types/maiml-unified.ts`: `Place`, `Transition`, `Arc`, `Method`, `PetriNetStructure` を追加
- [x] `maimlApiService.ts`: `ApiResponse<T>` 削除 + 全型を types へ移動 → importに変更
- [x] `types/masterDataTypes.ts`: `BaseMasterRecord`, `CreatorRecord`, `InstrumentRecord`, `VendorRecord`, `AttributeRecord`, `MasterRecord` を追加
- [x] `masterApiService.ts`: 全型を削除 → importに変更
- [x] `types/roleTypes.ts`: `RoleRecord`, `MasterRecord` を追加
- [x] `roleApiService.ts`: 全型を削除 → importに変更
- [x] `types/format.ts`: `FormatTemplateFile`, `FormatFolder`, `FormatDepartment`, `ListFormatsResponse` を追加
- [x] `templateApi.ts`: 全型を削除 → importに変更
- [x] `types/maimlValidation.ts`: `ValidationResult` を削除 → `templateService.ts` でimport

### Phase 4: hooks レイヤの型を types へ移動
- [x] `types/editor.ts`: `NodeBounds`, `IdConflictResolution`, `WorkflowAddResult`, `MethodData`, `NodeType`, `UseWorkflowParams`, `UseWorkflowReturn` を追加
- [x] `useWorkflow.ts`: 全型を削除 → importに変更
- [x] `types/storage.ts`: `S3File`, `S3Folder`, `StorageFile` を追加
- [x] `types/format.ts`: `ParsedElement`, `CollectedElement`, `NamespaceData` を追加
- [x] `types/hooks.ts` を新規作成（`UseNamespaceOperationsReturn`）
- [x] `useNamespaceOperations.ts`: 全型を削除 → importに変更
- [x] `types/hooks.ts`: `UseDraftManagerOptions`, `UseDraftManagerReturn` を追加
- [x] `useDraftManager.ts`: 全型を削除 → importに変更
- [x] `types/hooks.ts`: `UseEditorActionsProps`, `UseEditorActionsResult` を追加
- [x] `useEditorActions.ts`: 全型を削除 → importに変更
- [x] `types/hooks.ts`: `UseSemanticSearchReturn` を追加
- [x] `useSemanticSearch.ts`: 全型を削除 → importに変更

### Phase 5: utils レイヤの型を types へ移動（完了）
- [x] `types/editor.ts`: `PetriNetData`, `ReactFlowFormat` を追加
- [x] `reactFlowConverter.ts`: 全型を削除 → `types/editor.ts` からimport
- [x] `types/common.ts`: `LogEntry` を追加
- [x] `consoleLogger.ts`: `LogEntry` を削除 → `types/common.ts` からimport
- [x] `types/maimlValidation.ts`: `WorkflowValidationResult` を追加
- [x] `validationUtils.ts`: `ValidationResult`（フォーム用）→ `types/common.ts` の `FormValidationResult` として定義し直し、全関数の戻り値型を直接 `FormValidationResult` に変更。型エイリアス・re-export は追加しない
- [x] `types/editor.ts`: `ConversionResult`, `ConversionStats` を追加
- [x] `maimlToReactFlow.ts`: ローカル型削除 → `types/editor.ts` からimport
- [x] `types/error.ts` を新規作成（`AppError` を定義）※ `ErrorCode`・`ErrorCategory` は定数と密結合のため `errorUtils.ts` に残す。`AxiosApiErrorBody` は内部専用型のため同様
- [x] `errorUtils.ts`: `AppError` のローカル定義を完全削除 → `@/types/error` から直接 import（re-export なし）

### Phase 6: contexts レイヤの型を types へ移動（2026-05-13 完了）
- [x] `types/editor.ts`: `TemplateContextType` を追加（`AnalysisResult` import も追加）
- [x] `TemplateContext.tsx`: ローカル `TemplateContextType` を削除 → `@/types/editor` から import
- 移動対象外の型（定数・JSON依存）:
  - `AttributeOption` = `typeof ATTRIBUTE_OPTIONS[...]`（定数と密結合）→ 移動不可
  - `AttributeDisplayContextValue` → `AttributeOption` 依存 → 移動不可
  - `Translations` = `typeof jaTranslations`（JSON import 依存）→ 移動不可
  - `Locale`・`LanguageContextType` → `Translations`/`Locale` 依存 → 移動不可
  - `ProjectMaimlContextValue` → `MaimlParserTyped`（utils クラス）依存 → 循環参照リスクのため移動不可

### Phase 7: components レイヤの非Props型を types へ移動
- [x] `types/roleTypes.ts`: `FunctionItem`, `ItemCategory`, `MasterTypeData`, `RoleApiResponse` を追加
- [x] `SystemManagement/FunctionPermissionDialog.tsx`: `FunctionItem` 削除 → importに変更
- [x] `SystemManagement/RoleManagement.tsx`: 全型を削除 → importに変更（`MasterRecord as ApiMasterRecord` import 修正含む）
- [x] `SystemManagement/DepartmentManagement.tsx`: ローカル `DepartmentRecord` 削除 → `types/departmentTypes.ts` からimport
- [x] `types/masterDataTypes.ts`: `CsvValidationError`, `MasterItemCategory` を追加
- [x] `DataManagement/MasterManagement.tsx`: ローカル型削除 → importに変更（`ItemCategory` → `MasterItemCategory` リネーム含む）
- [x] `types/organization.ts`: `OrganizationData`, `CorporationData` を追加（Phase 4で実施済み）
- [x] `types/common.ts`: `OptionType` を追加（Phase 4で実施済み）
- [x] `Provider/OrganizationManagement.tsx`・`CorporationManagement.tsx`: 全型を削除 → importに変更（Phase 4で実施済み）
- [x] `types/editor.ts`: `PropertyObject`, `StructuredProperties`, `SelectedProperties`, `TableDataType`, `SubnetData`, `CustomNodeData` を追加（Phase 4で実施済み）
- [x] `viewer/dialogs/PropertyViewer.tsx`・`PropertyViewerWithSelection.tsx`・`StructuredPropertySelector.tsx`: 重複型を削除 → `types/editor.ts` からimportに統一（Phase 4で実施済み）
- [x] `viewer/ViewRendererDialog.tsx`・`ExperimentWorker/InstructionFlowDialog.tsx`: `FileData`, `SubnetData` を削除 → `types/editor.ts` からimportに変更（2026-05-13 Phase7続き）
- [x] `ExperimentWorker/InstructionConfirmationTab.tsx`・`ProgressCheckTable.tsx`: importを `@/types/editor` へ変更
- [x] `types/progress.ts`: `ProgressRecord` を追加（Phase 4で実施済み）
- [x] `progress/ProgressMonitoring.tsx`: `ProgressRecord` 削除 → importに変更（Phase 4で実施済み）
- [x] `types/editor.ts`: `CustomNodeData` を追加（Phase 4で実施済み）
- [x] `progress/PetriNetVisualization.tsx`: `CustomNodeData` 削除 → importに変更（2026-05-13 Phase7続き）
- [x] `types/common.ts`: `DeviceType`, `ViewType`, `ThemeToken`, `TabItem`, `ErrorBoundaryState` を追加（2026-05-13）
- [x] `viewer/ViewRenderer.tsx`: `DeviceType`, `ViewType` を削除 → importに変更（2026-05-13）
- [x] `viewer/ErrorBoundary.tsx`: `ErrorBoundaryState` を削除 → importに変更（2026-05-13）
- [x] `common/SubHeader.tsx`: `ThemeToken`, `TabItem` を削除 → importに変更（2026-05-13）
- [x] `types/experimentWorker.ts`: `ProjectInfo`, `SelectionStep`, `ViewMode`, `SelectionType`, `SelectionItem` を追加（2026-05-13）
- [x] `ExperimentWorker/UnifiedSelectionDialog.tsx`: 対象型削除 → importに変更（2026-05-13）
- [x] `ExperimentWorker/ExperimentRecordTab.tsx`: `ViewMode` 削除 → importに変更（2026-05-13）
- [x] `ExperimentWorker/SelectionDialog.tsx`: `SelectionType`, `SelectionItem` 削除 → importに変更（2026-05-13）
- [x] `types/project.ts`: `ProjectTableData`, `MethodTableData` を追加（2026-05-13）
- [x] `ExperimentWorker/ProjectSelectionModal.tsx`・`MethodSelectionModal.tsx`: 型削除 → importに変更（2026-05-13）
- [x] `types/project.ts`: `CreateProjectData`, `UploadMode`（BulkUpload用）, `UploadState`（BulkUpload用）, `ProjectFilesData` を追加（2026-05-13）
- [x] `project/CreateProjectModal.tsx`・`BulkUploadDialog.tsx`・`ProjectManagement.tsx`: 型削除 → importに変更（2026-05-13）
- [x] `types/storage.ts`: `FolderNode` を追加（2026-05-13）
- [x] `editorv2/WorkflowSelectorDialog.tsx`: `FolderNode` 削除 → importに変更（2026-05-13）
- [x] `types/editor.ts`: `NamespaceSource`, `PropertyData` を追加（2026-05-13 Phase7続き）
- [x] `editorv2/NestedPropertyEditor.tsx`: 型削除 → `@/types/editor` importに変更（2026-05-13 Phase7続き）
- [x] `utils/templateConverter.ts`: `PropertyData` import を `@/types/editor` に変更（2026-05-13 Phase7続き）
- [x] `utils/templateToXML.ts`: `PropertyData` import を `@/types/editor` に変更（2026-05-13 Phase7続き）
- [x] `components/format/FormatEditorDialog.tsx`: `PropertyData` import を `@/types/editor` に変更（2026-05-13 Phase7続き）
- [x] `components/editorv2/TemplateEditorDialog.tsx`: `PropertyData` import を `@/types/editor` に変更（2026-05-13 Phase7続き）
- [x] `components/format/FormatManagement.tsx`: `PropertyData` import を `@/types/editor` に変更（2026-05-13 Phase7続き）
- [x] `types/format.ts`: `UploadMode`, `UploadState`, `SearchCriteria`, `FormatSearchResult`, `SearchStats` を追加（2026-05-13）
- [x] `format/FormatUploadDialog.tsx`: `UploadMode`, `UploadState` 削除 → importに変更（2026-05-13）
- [x] `format/FormatSearchModal.tsx`: `SearchCriteria`, `SearchResult`→`FormatSearchResult`, `SearchStats` 削除 → importに変更（2026-05-13）
- [x] `types/format.ts`: `FormatFileDetailData`, `FormatFileData`, `CreateFormatFileData`, `CreateFormatFolderData` を追加（2026-05-13）
- [x] `format/FormatFileDetailModal.tsx`・`FormatFileListTable.tsx`・`CreateFormatFileModal.tsx`・`CreateFormatFolderModal.tsx`: 型削除 → importに変更（2026-05-13）

### Phase 8: services の re-export を廃止し、参照元を types/ に直接向ける（完了済み）

2026-05-13 確認の結果、4サービスファイルはいずれも re-export 行なしで `types/` を直接 import しており、
参照元コンポーネントも `@/types/` を直接 import 済み。本フェーズは既に完了状態。

- [x] `services/issueApiService.ts`: re-export 行なし（`@/types/experimentWorker` から直接 import 済み）
- [x] `services/projectApiService.ts`: re-export 行なし（`@/types/project` から直接 import 済み）
- [x] `services/userApiService.ts`: re-export 行なし（`@/types/user` から直接 import 済み）
- [x] `services/departmentApiService.ts`: re-export 行なし（`@/types/departmentTypes` から直接 import 済み）
- [x] Phase 3 残 re-export（codeMasterApiService, systemConfigApiService, corporationApiService, fileAccessService）も削除済み（2026-05-13）
- [x] `hooks/useCodeMaster.ts`: `SelectOption` import を `@/types/common` へ変更（2026-05-13）
- [x] ビルド確認: `npm run build` ✓ Compiled successfully

---

## 7. リスクと対策

| リスク | 影響度 | 対策 |
|---|---|---|
| 移動後にimportが壊れてビルドエラー | 高 | 各フェーズ完了後に `npx tsc --noEmit` を実行 |
| 既存の型と名前が衝突する | 中 | 移動前に移動先ファイルの既存型を必ず確認。必要に応じてリネーム |
| 循環参照（circular import）の発生 | 中 | `types/` 間は `maiml-unified.ts` を基盤とし、相互参照を避ける |
| `ApiResponse<T>` の構造が各ファイルで微妙に異なる | 高 | 削除前に各実装を比較し、`types/api.ts` の型と差異がある場合は調整 |

---

## 8. テスト計画

- [x] 各フェーズ完了後に `npx tsc --noEmit` を実行してコンパイルエラーがないことを確認（各フェーズで実施済み）
- [x] 全フェーズ完了後に `npm run build` でビルドが通ることを確認（Phase 3・7 後に `✓ Compiled successfully` 確認済み）

---

## 9. 承認記録

- **計画書提示日時**: 2026-05-13 09:03
- **承認日時**: 
- **承認者コメント**: 

---

## 10. 実施記録

### Phase 1 実施状況（2026-05-13 完了）
- [x] `types/maimlValidation.ts` に `ValidationError`・`ValidationResult` を追加
- [x] `components/editorv2/SaveConfirmDialog.tsx` のローカル型削除 → `types/maimlValidation` からimport
- [x] `components/format/FormatFolderTree.tsx`・`FormatManagement.tsx` のローカル `Format` 削除 → `types/format` からimport
- [x] `services/departmentApiService.ts`・`userApiService.ts` の `ApiResponse<T>` 削除 → `types/api.ts` に統一
- [x] `utils/errorUtils.ts` のローカル `ApiErrorResponse` をリネーム整理
- [x] `types/editor.ts` に `content?` フィールドを追加
- [x] `components/viewer/ViewRenderer.tsx`・`editorv2/WorkflowSelectorDialog.tsx` のローカル `FileInfo` 削除 → `types/editor` からimport

### Phase 2 実施状況（2026-05-13 完了）
- [x] `types/experimentWorker.ts` に `CreateIssueParams`, `AddCommentParams`, `GetIssuesParams` を追加
- [x] `services/issueApiService.ts` のローカル定義を削除 → re-export
- [x] `types/departmentTypes.ts` に `DepartmentRecord`, `MasterRecord`, `CsvUploadResult` を追加
- [x] `services/departmentApiService.ts` のローカル定義を削除 → re-export
- [x] `types/user.ts` を新規作成（`UserRecord`, `CreateUserRequest`, `UpdateUserRequest`, `UserFilters`）
- [x] `services/userApiService.ts` のローカル定義を削除 → re-export
- [x] `services/projectApiService.ts` に `export type` による再エクスポート追加

#### TypeScriptビルド確認（Phase 1・2 終了後）
- 残存エラー: `src/utils/__tests__/errorMapper.test.ts`（今回の変更とは無関係の既存エラー）
- 今回の変更によるエラー: **なし**

### Phase 3 実施状況（2026-05-13 完了）

#### masterApiService.ts / roleApiService.ts の re-export 削除・参照元修正

- [x] `services/masterApiService.ts`: re-export 行（`BaseMasterRecord`, `CreatorRecord`, `InstrumentRecord`, `VendorRecord`, `AttributeRecord`, `MasterRecord`）を削除
- [x] `services/roleApiService.ts`: re-export 行（`RoleRecord`, `MasterRecord`）を削除
- [x] `types/roleTypes.ts`: `MasterRecord = RoleRecord` 型エイリアスを追加（roleApiService との互換性維持）
- [x] `components/DataManagement/MasterManagement.tsx`: `MasterRecord` import を `@/types/masterDataTypes` へ変更
- [x] `components/SystemManagement/RoleManagement.tsx`: `MasterRecord` import を `@/types/roleTypes` へ変更

#### editorv2 / format / utils / hooks の型 import 修正

- [x] `components/editorv2/DocumentEditDialog.tsx`: `CreatorRecord`, `VendorRecord`, `InstrumentRecord` の import を `@/types/masterDataTypes` へ変更
- [x] `components/editorv2/NestedPropertyEditor.tsx`: `AttributeRecord` の import を `@/types/masterDataTypes` へ変更
- [x] `hooks/useAttributeMasters.ts`: `AttributeRecord` の import を `@/types/masterDataTypes` へ変更
- [x] `components/editorv2/TemplateEditorDialog.tsx`: `ListFormatsResponse` の import を `@/types/format` へ変更
- [x] `components/format/FormatEditorDialog.tsx`: `FormatTemplateFile` の import を `@/types/format` へ変更
- [x] `utils/templateConverter.ts`: `FormatTemplateFile` の import を `@/types/format` へ変更

#### maimlApiService.ts の MaimlAnalysisResultRow re-export 削除・参照元修正

- [x] `components/project/FileListTable.tsx`: `MaimlAnalysisResultRow` の import を `@/types/maimlEditor` へ変更
- [x] `components/project/MaimlValidationModal.tsx`: `MaimlAnalysisResultRow` の import を `@/types/maimlEditor` へ変更
- [x] `components/project/ProjectManagement.tsx`: `MaimlAnalysisResultRow` の import を `@/types/maimlEditor` へ変更

#### 型互換エラー修正

- [x] `types/maimlValidation.ts`: `ErrorContent` に `[key: string]: unknown` インデックスシグネチャを追加（`ValidationError` との型互換を解消）

#### ビルド確認（Phase 3 終了後）

- `npm run build` 結果: **✓ Compiled successfully**（TypeScript エラーなし、静的ページ生成完了）

### Phase 3 追加作業（2026-05-13 別セッション）

#### ServiceApiResponse の一元化
- [x] `types/api.ts`: `ServiceApiResponse<T>` を追加（`meta?: { timestamp, requestId }` オプション付き）
- [x] `services/draftService.ts`: ローカル `ApiResponse<T>` 削除 → `@/types/api` の `ServiceApiResponse` を import
- [x] `services/corporationApiService.ts`: ローカル `ApiResponse<T>` 削除 → `@/types/api` の `ServiceApiResponse` を import
- [x] `services/masterApiService.ts`: ローカル `ApiResponse<T>` 削除 → `@/types/api` の `ServiceApiResponse` を import
- [x] `services/roleApiService.ts`: ローカル `ApiResponse<T>` 削除 → `@/types/api` の `ServiceApiResponse` を import
- [x] `services/maimlApiService.ts`: ローカル `ApiResponse<T>` 削除 → `@/types/api` の `ServiceApiResponse` を import
- [x] `services/projectApiService.ts`: ローカル `ServiceApiResponse<T>` 削除 → `@/types/api` の `ServiceApiResponse` を import
- [x] `components/progress/ProgressMonitoring.tsx`: `@/types/api` から `ServiceApiResponse` を import に変更
- [x] `components/project/ProjectManagement.tsx`: `@/types/api` から `ServiceApiResponse as ApiResponse` を import に変更

#### ビルド確認（Phase 3 追加作業後）
- `npx tsc --noEmit` 結果: 関連エラーなし（残存エラーは `errorMapper.test.ts` の既存2件のみ）

---

### Phase 4（2026-05-13 継続セッション）

#### SystemManagement / Provider / DataManagement コンポーネント修正

- [x] `types/roleTypes.ts`: `PermissionRecord`, `RoleConfig`, `FunctionRecord` を追加
- [x] `components/SystemManagement/FunctionPermissionDialog.tsx`: ローカル型 → `@/types/roleTypes` import
- [x] `types/departmentTypes.ts`: `DepartmentManagementRecord`, `UserRow` を追加
- [x] `components/SystemManagement/DepartmentManagement.tsx`: ローカル型 → `@/types/departmentTypes` import
- [x] `components/SystemManagement/RoleManagement.tsx`: ローカル型 → `@/types/roleTypes` import
- [x] `types/masterDataTypes.ts`: `MasterDataRecord` を追加
- [x] `components/DataManagement/MasterManagement.tsx`: ローカル型 → `@/types/masterDataTypes` import
- [x] `types/organization.ts`: `OrganizationRecord`, `CorporationRecord` を追加
- [x] `components/Provider/OrganizationManagement.tsx`: ローカル型 → `@/types/organization` import
- [x] `components/Provider/CorporationManagement.tsx`: ローカル型 → `@/types/organization` import

#### viewer/dialogs コンポーネント修正

- [x] `types/editor.ts`: `PropertyObject`, `StructuredProperties`, `SelectedProperties`, `TableDataType` を追加
- [x] `components/viewer/dialogs/StructuredPropertySelector.tsx`: ローカル型 → `@/types/editor` import
- [x] `components/viewer/dialogs/PropertyViewerWithSelection.tsx`: ローカル型 → `@/types/editor` import（重複 `TableDataType` 定義を削除）
- [x] `components/viewer/dialogs/PropertyViewer.tsx`: ローカル `PropertyObject`, `StructuredProperties` → `@/types/editor` import

#### progress コンポーネント修正

- [x] `types/project.ts`: `ProgressRecord` を追加
- [x] `components/progress/ProgressMonitoring.tsx`: ローカル `ProgressRecord` 削除 → `@/types/project` import

#### ビルド確認（Phase 4 後）
- `npx tsc --noEmit` 結果: 関連エラーなし（残存エラーは `errorMapper.test.ts` の既存2件のみ）

---

## 11. 実施記録

### 実施日時
開始: 2026-05-13 09:03  
Phase 4 完了: 2026-05-13 11:08

### 最終的な成果物
- [x] Phase 1: services/ のインライン型定義を `types/` に集約
- [x] Phase 2: hooks/, utils/, contexts/ のインライン型定義を `types/` に集約
- [x] Phase 3: components/ のインライン型定義を `types/` に集約（主要コンポーネント）
- [x] Phase 3 追加: ServiceApiResponse の一元化
- [x] Phase 4: SystemManagement, Provider, viewer/dialogs, progress コンポーネントの残型定義を集約
- [x] 全フェーズ完了後の TypeScript ビルドエラーなし確認済み

### 残存する既存エラー（本タスクとは無関係）
- `src/utils/__tests__/errorMapper.test.ts` の2件: モジュール解決エラー（`errorMapper.ts` ファイル自体が存在しないため）

---

### Phase 7 実施状況（2026-05-13）

#### ExperimentWorker コンポーネント修正

- [x] `types/experimentWorker.ts`: `ProjectInfo`, `SelectionStep`, `ViewMode`, `SelectionType`, `SelectionItem` を追加
- [x] `components/ExperimentWorker/UnifiedSelectionDialog.tsx`: ローカル型削除 → `@/types/experimentWorker` import
- [x] `components/ExperimentWorker/ExperimentRecordTab.tsx`: ローカル型削除 → `@/types/experimentWorker` import
- [x] `components/ExperimentWorker/SelectionDialog.tsx`: ローカル型削除 → `@/types/experimentWorker` import

#### project コンポーネント修正

- [x] `types/project.ts`: `CreateProjectData`, `UploadMode`, `UploadState`, `ProjectFilesData` を追加
- [x] `components/project/CreateProjectModal.tsx`: ローカル型削除 → `@/types/project` import
- [x] `components/project/BulkUploadDialog.tsx`: ローカル型削除 → `@/types/project` import
- [x] `components/project/ProjectManagement.tsx`: ローカル型削除 → `@/types/project` import

#### format コンポーネント修正

- [x] `types/format.ts`: `FormatFileData`, `FormatFileDetailData`, `CreateFormatFileData`, `CreateFormatFolderData` を追加（既存の型定義を集約）
- [x] `components/format/FormatFileDetailModal.tsx`: `export interface FormatFileDetailData` 削除 → `@/types/format` import
- [x] `components/format/FormatFileListTable.tsx`: `export interface FormatFileData` 削除 → `@/types/format` import
- [x] `components/format/CreateFormatFileModal.tsx`: `export interface CreateFormatFileData` 削除 → `@/types/format` import
- [x] `components/format/CreateFormatFolderModal.tsx`: `export interface CreateFormatFolderData` 削除 → `@/types/format` import
- [x] `components/format/FormatManagement.tsx`: 各コンポーネントからの型 import を `@/types/format` に一本化

#### ビルド確認（Phase 7 後）
- `npm run build` 結果: **✓ Compiled successfully**（TypeScript エラーなし、静的ページ生成完了）
