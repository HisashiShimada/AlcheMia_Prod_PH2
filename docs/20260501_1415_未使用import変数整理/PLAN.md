# タスク計画書: 未使用import・変数の整理

## メタデータ
- **作成日時**: 2026-05-01 14:15
- **最終更新**: 2026-05-01 16:05（全ファイル修正完了）
- **タスクID**: unused-imports-cleanup
- **優先度**: 中
- **推定工数**: 3時間

## タスク概要

バックエンド・フロントエンド全体のソースコードに存在する、使用されていないimport文・変数・定数を検出し、削除で整理する。

ESLintの `@typescript-eslint/no-unused-vars` / `no-unused-vars` ルールで検出した問題を修正対象とする。

## 目的と期待される成果

- [x] コードの可読性向上（不要なimportが取り除かれ意図が明確になる）
- [x] バンドルサイズの削減（未使用importが減ることで不要なモジュール参照が解消）
- [x] ESLintエラー/警告ゼロの状態に近づける
- [x] 保守性の向上

## 修正方針

| 種別 | 方針 |
|------|------|
| 未使用import | 削除 |
| `error` 変数（catch節など） | **対象外**（変更しない） |
| 未使用のローカル変数・定数 | 削除 |
| 未使用の引数/Props | 削除（Props型定義からも削除、呼び出し元も確認） |

## 対象外

- `src/reference/` 配下（旧コード）
- テストファイル（`__tests__/`, `*.test.ts`, `*.test.tsx`）
- `error` 変数（catch節など）のみが問題のファイル

---

## バックエンド対象ファイル（24ファイル → error除外後）

| ファイル | 修正対象 |
|---------|---------|
| `src/controllers/fileAccessController.ts` | `ProjectService` import削除、`_parseError` 変数削除 |
| `src/controllers/maimlController.ts` | `authUser` 変数削除 |
| `src/controllers/masterController.ts` | `lang` 変数3箇所削除 |
| `src/controllers/projectController.ts` | `MaimlPublishResponse`・`projectRepository` import削除、`projectService`・`body` 変数削除 |
| `src/repositories/projectTaskDetailRepository.ts` | `getPgp` import削除 |
| `src/repositories/projectTaskRepository.ts` | `getPgp` import削除 |
| `src/services/authService.ts` | `req` 変数削除 |
| `src/services/batchIngestService.ts` | `forceReprocess` 変数削除 |
| `src/services/fileAccessService.ts` | `truncateField`・`FILE_METADATA_MAX_LENGTHS` import削除 |
| `src/services/formatService.ts` | `E6003` import削除 |
| `src/services/maimlIngestParserService.ts` | `Event` import削除 |
| `src/services/maimlWriterService.ts` | `_listErr` 変数削除 |
| `src/services/projectInstructionService.ts` | `Project` import削除 |
| `src/services/redisConnectionService.ts` | `disconnectError` 変数削除 |
| `src/services/taskRegistrationService.ts` | `FileMetadataRepository` import削除 |
| `src/services/taskService.ts` | `CheckoutStatusEnum` import削除 |
| `src/services/userService.ts` | `E1003`・`E6001` import削除 |
| `src/utils/maimlParser.ts` | `mode` 引数削除 |

---

## フロントエンド対象ファイル（81ファイル → error除外後）

### services / types / utils（8ファイル）

| ファイル | 修正対象 |
|---------|---------|
| `src/services/corporationApiService.ts` | `MasterDataConfig` import削除 |
| `src/services/departmentApiService.ts` | `AxiosError` import削除 |
| `src/services/fileAccessService.ts` | `UploadProgress`・`UploadMetadata` import削除、`filePath` 変数削除 |
| `src/services/formatApiService.ts` | `AxiosError` import削除、`API_BASE_URL` 変数削除 |
| `src/services/masterApiService.ts` | `MasterDataConfig` import削除 |
| `src/services/roleApiService.ts` | `AxiosError` import削除 |
| `src/services/userApiService.ts` | `AxiosError` import削除 |
| `src/types/maiml-unified.ts` | `Dayjs` import削除 |
| `src/utils/converters/reactFlowToMaiml.ts` | `buildCommonTemplateXML` 関数削除 |
| `src/utils/maimlParserTyped.ts` | `PlaceRef`・`Reference` import削除、`methodIndex`・`totalTransitions` 変数削除 |
| `src/utils/petriNetExtractor.ts` | `ElementCompact` import削除、`parseNamespaceXml` 変数削除 |
| `src/utils/reactFlowConverter.ts` | `sourceTransId` 変数削除 |

### components/ExperimentWorker（10ファイル）

| ファイル | 修正対象 |
|---------|---------|
| `src/components/ExperimentWorker/DataRecordDialog.tsx` | `Collapse`・`Card` import削除、`formData`・`isClient`・`templatesExpanded`・`setTemplatesExpanded`・`propertyFormExpanded`・`setPropertyFormExpanded`・`LIST_TYPES`・`renderDataGrid` 削除 |
| `src/components/ExperimentWorker/ExperimentRecordTab.tsx` | `onProjectChange` Props削除、`issues`・`issueLoading`・`_data`・`handleSubmitIssue`・`handleSubmitComment` 変数削除 |
| `src/components/ExperimentWorker/InstructionCard.tsx` | `projectStatus` Props削除 |
| `src/components/ExperimentWorker/InstructionConfirmationTab.tsx` | `isEditableStatus` import削除、`onProjectChange` Props削除、`stats`・`projectId` 変数削除 |
| `src/components/ExperimentWorker/InstructionGroup.tsx` | `BranchesOutlined`・`CheckSquareOutlined` import削除、`Text`・`getIcon` 変数削除 |
| `src/components/ExperimentWorker/MethodSelectionModal.tsx` | `selectedProject` 変数削除 |
| `src/components/ExperimentWorker/ProgressCheckTab.tsx` | `onProjectChange` Props削除 |
| `src/components/ExperimentWorker/ProgressCheckTable.tsx` | `_task` 変数削除 |
| `src/components/ExperimentWorker/SelectionDialog.tsx` | `Title` 変数削除 |
| `src/components/ExperimentWorker/TaskListTable.tsx` | `selectedMethodId` Props削除 |
| `src/components/ExperimentWorker/TaskSelectionDialog.tsx` | `Button` import削除 |
| `src/components/ExperimentWorker/TransitionFlowDiagram.tsx` | `useCallback` import削除 |
| `src/components/ExperimentWorker/TransitionList.tsx` | `Progress`・`Button`・`InstructionConfirmationModal` import削除、`instructionModalOpen`・`setInstructionModalOpen`・`issues`・`issueLoading`・`_data`・`handleSubmitIssue`・`handleSubmitComment`・`handleUpdateStatus` 削除 |
| `src/components/ExperimentWorker/UnifiedSelectionDialog.tsx` | `MinusOutlined` import削除 |

### components/menus（5ファイル）

| ファイル | 修正対象 |
|---------|---------|
| `src/components/menus/DataAdminMenu.tsx` | `Card`・`EditOutlined`・`SearchOutlined`・`ExperimentOutlined`・`DownloadOutlined`・`BarChartOutlined` import削除、`Title`・`Text`・`onNavigate`・`currentTabLabel` 削除 |
| `src/components/menus/ExperimentAdminMenu.tsx` | `onNavigate` Props削除 |
| `src/components/menus/ExperimentWorkerMenu.tsx` | `Card`・`ToolOutlined` import削除、`Title`・`ResponsiveContainer`・`onNavigate` 削除 |
| `src/components/menus/ProviderMenu.tsx` | `Card`・`TeamOutlined`・`SettingOutlined`・`BarChartOutlined` import削除、`Title`・`Text`・`onNavigate`・`currentTabLabel` 削除 |
| `src/components/menus/SystemAdminMenu.tsx` | `Card`・`FolderOutlined`・`MasterManagement` import削除、`Title`・`Text`・`onNavigate`・`currentTabLabel` 削除 |

### components/editorv2（10ファイル）

| ファイル | 修正対象 |
|---------|---------|
| `src/components/editorv2/PetriNetEditorInner.tsx` | `isLoadingFiles`・`selectedTemplate`・`setAutoSaveEnabled` 削除 |
| `src/components/editorv2/PetriNetEditorScreen.tsx` | `message` import削除 |
| `src/components/editorv2/components/DocumentEditDialog.tsx` | `_` 変数2箇所削除 |
| `src/components/editorv2/components/DraftManager.tsx` | `Title` 変数削除 |
| `src/components/editorv2/components/MultiObjectEditor.tsx` | `objectKey`・`_` 変数削除 |
| `src/components/editorv2/components/NestedPropertyEditor.tsx` | `useCallback`・`Tooltip` import削除、`isMasterAttribute` 変数削除 |
| `src/components/editorv2/components/PropertyPanel.tsx` | `edges` 変数削除 |
| `src/components/editorv2/components/TemplateEditorDialog.tsx` | `CloseOutlined`・`DownOutlined`・`RightOutlined`・`CopyOutlined`・`FolderOutlined`・`FileOutlined` import削除、`hasChanges`・`importedNamespaces`・`validationErrors`・`setValidationErrors` 削除 |
| `src/components/editorv2/components/WorkflowSelectorDialog.tsx` | `Spin` import削除、`Title` 変数削除 |
| `src/components/editorv2/hooks/useDraftManager.ts` | `AUTO_SAVE_PREFIX` import削除、`userId` 変数削除 |
| `src/components/editorv2/hooks/useEditorActions.ts` | `nodes`・`setEdges`・`setSelectedEdge` 変数削除 |
| `src/components/editorv2/hooks/useKeyboardShortcuts.ts` | `useCallback`・`EdgeData` import削除 |
| `src/components/editorv2/nodes/EditablePlaceNode.tsx` | `description` 変数削除 |
| `src/components/editorv2/nodes/EditableTransitionNode.tsx` | `description` 変数削除 |
| `src/components/editorv2/utils/converters/multiMethodConverter.ts` | `Reference` import削除 |
| `src/components/editorv2/utils/converters/reactFlowToMaiml.ts` | `buildCommonTemplateXML`・`allNodes` 削除 |

### components/progress（3ファイル）

| ファイル | 修正対象 |
|---------|---------|
| `src/components/progress/PetriNetVisualization.tsx` | `progressData`・`sourceTransId`・`orderedTransitions`・`n` 削除 |
| `src/components/progress/ProgressMonitoring.tsx` | `lastUpdated`・`page`・`setPage`・`rowsPerPage`・`setRowsPerPage`・`setOrder`・`setOrderBy`・`selectedProject`・`isLoadingProjects`・`projectsError`・`sortedData`・`getProjectStatusColor` 削除 |
| `src/components/progress/WorkProgressDetailDialog.tsx` | `Divider`・`CheckCircleOutlined` import削除、`managerId` 変数削除 |

### components/project（11ファイル）

| ファイル | 修正対象 |
|---------|---------|
| `src/components/project/FileListTable.tsx` | `extractFolderDisplayName`・`projectId` 削除 |
| `src/components/project/FormatEditorDialog.tsx` | `ThunderboltOutlined`〜`FileOutlined` import多数削除、`ListFormatsResponse` import削除、`TextArea`・`hasChanges`・`uuid`・`placeRefs`・`insertion`・`showPlaceRefAddDialog`・`setShowPlaceRefAddDialog`・`importedNamespaces`・`namespaceImportMode`・`validationErrors`・`setValidationErrors`・`handleGenerateUuid` 削除 |
| `src/components/project/FormatFolderTree.tsx` | `getCategoryTagColor`・`getCategoryLabel` 削除 |
| `src/components/project/FormatManagement.tsx` | `MaimlEditorParams`・`ProjectFile`・`FormatFile` import削除、`maimlFileContent`・`isLoadingFormats`・`formatsError`・`handleFormatSelect`・`handleFileDetail`・`handleBreadcrumbClick` 削除 |
| `src/components/project/FormatSearchModal.tsx` | `t` 変数削除 |
| `src/components/project/FormatUploadDialog.tsx` | `currentFolderPath` 変数削除 |
| `src/components/project/InstructionEditDialog.tsx` | `INSTRUCTION_TYPES`・`INSTRUCTION_PRIORITIES`・`TARGET_TYPES` import削除、`availableTransitions`・`saveMode`・`selectedTaskNumber`・`handleMethodChange` 削除 |
| `src/components/project/InstructionRegistrationTab.tsx` | `Card`・`PlusOutlined`・`InstructionRegistrationData`・`getTaskRegistrationStatus`・`TaskInput` import削除、`handleOpenCreateDialog`・`getTargetLabel` 削除 |
| `src/components/project/MaimlValidationModal.tsx` | `parseRowToAnalysisResult` import削除 |
| `src/components/project/ProjectFolderTree.tsx` | `useState` import削除、`expandedFolders`・`onToggleFolder`・`getSortLabel` 削除 |
| `src/components/project/ProjectManagement.tsx` | `publishProject`・`unpublishProject`・`AnalysisResult` import削除、`maimlRoot`・`isMaimlLoading`・`isLoadingTabData`・`isOrderChangeLocked`・`_jobId`×2・`currentProjectName` 削除 |
| `src/components/project/TaskRegistrationTab.tsx` | `TaskRegistrationData`・`saveInstruction` import削除、`isMaimlRegistered`・`setAvailableTransitions`・`loadingCodeMaster`・`orderSelectOptions` 削除 |

### components/その他（11ファイル）

| ファイル | 修正対象 |
|---------|---------|
| `src/components/DataManagement/MasterManagement.tsx` | `_` 変数5箇所削除 |
| `src/components/PasswordResetRequest.tsx` | `organizationId` 変数削除 |
| `src/components/PinCodeInputPage.tsx` | `sessionToken`・`organizationId` 変数削除 |
| `src/components/Provider/OrganizationManagement.tsx` | `token`・`_error`・`chiefUserEmail` 削除 |
| `src/components/SystemManagement/DepartmentManagement.tsx` | `config` 変数削除 |
| `src/components/SystemManagement/FunctionPermissionDialog.tsx` | `initialFunctionName`・`initialWritePermissions`・`modal`・`message`・`someChildrenChecked`・`funcIndex`・`childIndex` 削除 |
| `src/components/SystemManagement/RoleManagement.tsx` | `Checkbox`・`Papa`・`RoleConfig`・`FieldConfig`・`createMaster`・`updateMaster`・`MasterTypeData`・`RoleApiResponse` import削除、`_` 変数削除 |
| `src/components/TransitionSetSearch/TransitionSetBatchProcessingPanel.tsx` | `Divider` import削除 |
| `src/components/TransitionSetSearch/TransitionSetSearchModal.tsx` | `initialProjectName` 変数削除 |
| `src/components/viewer/PetriNetViewer.tsx` | `Panel`・`ZoomInOutlined`・`ZoomOutOutlined`・`ReloadOutlined`・`FullscreenOutlined` import削除、`propertyDisplayMode`・`setMultiMethodMode`・`setMethodName` 削除 |
| `src/components/viewer/ViewRenderer.tsx` | `onExitEdit` Props削除 |
| `src/components/viewer/dialogs/PropertyViewer.tsx` | `templateProps` 変数削除 |
| `src/components/viewer/dialogs/PropertyViewerWithSelection.tsx` | `templateProps` 変数削除 |
| `src/components/viewer/dialogs/StructuredPropertySelector.tsx` | `CheckCircleOutlined`・`CloseCircleOutlined` import削除 |
| `src/components/viewer/dialogs/SubNetViewer.tsx` | `Title` 変数削除、`onClose` Props削除、`selectedNodeId` 変数削除 |
| `src/contexts/LanguageContext.tsx` | `effectiveLocale` 変数削除 |
| `src/hooks/useDraftManager.ts` | `AUTO_SAVE_PREFIX` import削除 |

---

## 実装ステップ

### Phase 1: バックエンド整理
- [ ] controllers配下 (4ファイル)
- [ ] repositories配下 (2ファイル)
- [ ] services配下 (11ファイル)
- [ ] utils配下 (1ファイル)

### Phase 2: フロントエンド整理（services/types/utils）
- [ ] services配下 (7ファイル)
- [ ] types配下 (1ファイル)
- [ ] utils配下 (4ファイル)

### Phase 3: フロントエンド整理（components）
- [ ] components/ExperimentWorker配下 (14ファイル)
- [ ] components/menus配下 (5ファイル)
- [ ] components/editorv2配下 (16ファイル)
- [ ] components/progress配下 (3ファイル)
- [ ] components/project配下 (11ファイル)
- [ ] components/その他 (17ファイル)

### Phase 4: 最終確認
- [ ] バックエンドESLint再実行で対象未使用vars 0確認
- [ ] フロントエンドESLint再実行で対象未使用vars 0確認

## リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| importを削除したが別の場所で型として使用されていた | 中 | TypeScriptビルドで確認 |
| Props削除で呼び出し元が壊れる | 中 | 事前に呼び出し元を検索して確認 |
| 引数削除で関数シグネチャが変わり呼び出し元が壊れる | 中 | 事前に呼び出し元を検索して確認 |

## 承認記録
- **計画書提示日時**: 2026-05-01 15:21
- **承認日時**: 
- **承認者コメント**:
