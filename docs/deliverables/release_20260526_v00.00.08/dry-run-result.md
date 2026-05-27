# ドライラン結果

- **実行日時**: 2026-05-26 09:18:22
- **リリースタグ**: `release_20260519_v00.00.08`
- **FROM_COMMIT**: `ff018f64`
- **TO_COMMIT**: `a1d40779`
- **SRC_REPO**: `/home/ssv/projects/mmdpf`

---

## 差分ファイル一覧

### 追加 (99 件)
- `backend/migrations/20260519_remove_unused_columns_from_file_metadata.sql`
- `backend/migrations/20260520_drop_password_expires_at.sql`
- `backend/src/sql/queries/attributes/existsByPk.sql`
- `backend/src/sql/queries/codeMaster/findByDivision.sql`
- `backend/src/sql/queries/codeMaster/findByValue.sql`
- `backend/src/sql/queries/creators/count.sql`
- `backend/src/sql/queries/creators/create.sql`
- `backend/src/sql/queries/creators/findAll.sql`
- `backend/src/sql/queries/creators/findAllWithFilters.sql`
- `backend/src/sql/queries/creators/findByIdByCorporation.sql`
- `backend/src/sql/queries/creators/findByIdByOrganization.sql`
- `backend/src/sql/queries/creators/findInstrumentUuidByCorporation.sql`
- `backend/src/sql/queries/creators/findInstrumentUuidByCorporationNoId.sql`
- `backend/src/sql/queries/creators/findInstrumentUuidByOrganization.sql`
- `backend/src/sql/queries/creators/findInstrumentUuidByOrganizationNoId.sql`
- `backend/src/sql/queries/creators/findVendorUuidByCorporation.sql`
- `backend/src/sql/queries/creators/findVendorUuidByCorporationNoId.sql`
- `backend/src/sql/queries/creators/findVendorUuidByOrganization.sql`
- `backend/src/sql/queries/creators/findVendorUuidByOrganizationNoId.sql`
- `backend/src/sql/queries/creators/updateStatusByCorporation.sql`
- `backend/src/sql/queries/creators/updateStatusByOrganization.sql`
- `backend/src/sql/queries/event_log/findAllByProject.sql`
- `backend/src/sql/queries/event_log/getNextSequenceNo.sql`
- `backend/src/sql/queries/event_log/insertEventLog.sql`
- `backend/src/sql/queries/file_metadata/deleteFileMetadata.sql`
- `backend/src/sql/queries/file_metadata/findByBatchId.sql`
- `backend/src/sql/queries/file_metadata/findMaimlByProjectName.sql`
- `backend/src/sql/queries/file_metadata/findProjectUuidsByFileKeys.sql`
- `backend/src/sql/queries/file_metadata/getByProject.sql`
- `backend/src/sql/queries/file_metadata/getFileMetadata.sql`
- `backend/src/sql/queries/file_metadata/getFileMetadataByFileKey.sql`
- `backend/src/sql/queries/file_metadata/listProjectFiles.sql`
- `backend/src/sql/queries/file_metadata/listProjectFilesCount.sql`
- `backend/src/sql/queries/file_metadata/softDeleteBatch.sql`
- `backend/src/sql/queries/file_metadata/softDeleteByFileKey.sql`
- `backend/src/sql/queries/maiml_analysis_results/deleteByFileKey.sql`
- `backend/src/sql/queries/maiml_analysis_results/getByFileKey.sql`
- `backend/src/sql/queries/maiml_drafts/delete.sql`
- `backend/src/sql/queries/maiml_drafts/findAll.sql`
- `backend/src/sql/queries/maiml_drafts/findByKey.sql`
- `backend/src/sql/queries/maiml_drafts/save.sql`
- `backend/src/sql/queries/maiml_validation_history/create.sql`
- `backend/src/sql/queries/maiml_validation_history/deleteOldRecords.sql`
- `backend/src/sql/queries/maiml_validation_history/findById.sql`
- `backend/src/sql/queries/maiml_validation_history/getProjectStatistics.sql`
- `backend/src/sql/queries/organization_users/findByEmail.sql`
- `backend/src/sql/queries/organization_users/findBySessionToken.sql`
- `backend/src/sql/queries/organization_users/findByUserId.sql`
- `backend/src/sql/queries/organization_users/findByUserIdWithRole.sql`
- `backend/src/sql/queries/organizations/findByIdSimple.sql`
- `backend/src/sql/queries/organizations/getIsEntry.sql`
- `backend/src/sql/queries/organizations/getUseDeemedProgress.sql`
- `backend/src/sql/queries/password_reset_tokens/deleteByToken.sql`
- `backend/src/sql/queries/password_reset_tokens/findByToken.sql`
- `backend/src/sql/queries/project_instructions/bulkUpdateStatus.sql`
- `backend/src/sql/queries/project_instructions/deleteById_delete.sql`
- `backend/src/sql/queries/project_instructions/deleteById_findProjectName.sql`
- `backend/src/sql/queries/project_instructions/deleteById_findSubsequent.sql`
- `backend/src/sql/queries/project_instructions/deleteById_findTarget.sql`
- `backend/src/sql/queries/project_instructions/deleteById_renumber.sql`
- `backend/src/sql/queries/project_instructions/findById.sql`
- `backend/src/sql/queries/project_instructions/findByProject.sql`
- `backend/src/sql/queries/project_instructions/hasUnsentInstructions.sql`
- `backend/src/sql/queries/project_tasks/countByProject.sql`
- `backend/src/sql/queries/project_tasks/findByPrimaryKey.sql`
- `backend/src/sql/queries/project_tasks/findByProject.sql`
- `backend/src/sql/queries/projects/delete.sql`
- `backend/src/sql/queries/projects/deleteRelatedData_eventLog.sql`
- `backend/src/sql/queries/projects/deleteRelatedData_instructionHistory.sql`
- `backend/src/sql/queries/projects/deleteRelatedData_issue.sql`
- `backend/src/sql/queries/projects/deleteRelatedData_issueComment.sql`
- `backend/src/sql/queries/projects/deleteRelatedData_projectInstruction.sql`
- `backend/src/sql/queries/projects/deleteRelatedData_projectTask.sql`
- `backend/src/sql/queries/projects/deleteRelatedData_taskDetail.sql`
- `backend/src/sql/queries/projects/deleteRelatedData_templateData.sql`
- `backend/src/sql/queries/projects/deleteRelatedData_transitionData.sql`
- `backend/src/sql/queries/projects/findCheckedOutUserName.sql`
- `backend/src/sql/queries/projects/getById.sql`
- `backend/src/sql/queries/role_permissions/getPermissionsByRoleId.sql`
- `backend/src/sql/queries/role_permissions/hasPermission.sql`
- `backend/src/sql/queries/system_overview/getOrganizationContractInfo.sql`
- `backend/src/sql/queries/upload_batches/countByOrganization.sql`
- `backend/src/sql/queries/upload_batches/create.sql`
- `backend/src/sql/queries/upload_batches/delete.sql`
- `backend/src/sql/queries/upload_batches/findById.sql`
- `backend/src/sql/queries/upload_batches/findInProgress.sql`
- `backend/src/sql/queries/upload_batches/getProgress.sql`
- `backend/src/sql/queries/user_authentication/getPasswordStatus.sql`
- `backend/src/sql/queries/user_authentication/updateAsTemporary.sql`
- `backend/src/sql/queries/user_authentication/updatePasswordAfterChange.sql`
- `backend/src/sql/queries/user_authentication/updatePasswordWithExpiry.sql`
- `docs/deliverables/release_20260519_v00.00.07/checklist.md`
- `docs/deliverables/release_20260519_v00.00.07/dry-run-result.md`
- `docs/deliverables/release_20260519_v00.00.07/release_info.md`
- `docs/deliverables/release_20260519_v00.00.07/release_notes_20260519.md`
- `frontend/public/icons/icon_alchemia.png`
- `frontend/public/icons/logo_alchemia.png`
- `frontend/src/utils/maimlParentInjector.ts`
- `frontend/src/utils/maimlUuidExtractor.ts`

### 更新 (71 件)
- `aws/ecs-task-definition-alchemia-backend.json`
- `backend/.env`
- `backend/src/controllers/authController.ts`
- `backend/src/controllers/authHelpers.ts`
- `backend/src/controllers/fileAccessController.ts`
- `backend/src/repositories/UploadBatchRepository.ts`
- `backend/src/repositories/attributeRepository.ts`
- `backend/src/repositories/codeMasterRepository.ts`
- `backend/src/repositories/creatorRepository.ts`
- `backend/src/repositories/eventLogRepository.ts`
- `backend/src/repositories/fileMetadataRepository.ts`
- `backend/src/repositories/maimlAnalysisResultRepository.ts`
- `backend/src/repositories/maimlDraftsRepository.ts`
- `backend/src/repositories/organizationRepository.ts`
- `backend/src/repositories/organizationUserRepository.ts`
- `backend/src/repositories/passwordResetTokenRepository.ts`
- `backend/src/repositories/projectInstructionRepository.ts`
- `backend/src/repositories/projectRepository.ts`
- `backend/src/repositories/projectTaskRepository.ts`
- `backend/src/repositories/rolePermissionRepository.ts`
- `backend/src/repositories/systemOverviewRepository.ts`
- `backend/src/repositories/userAuthenticationRepository.ts`
- `backend/src/repositories/validationHistoryRepository.ts`
- `backend/src/services/authService.ts`
- `backend/src/services/fileAccessService.ts`
- `backend/src/services/maimlService.ts`
- `backend/src/services/maimlWriterService.ts`
- `backend/src/services/organizationService.ts`
- `backend/src/services/projectInstructionService.ts`
- `backend/src/services/projectService.ts`
- `backend/src/services/storageService.ts`
- `backend/src/sql/queries/organizations/createUserAuthentication.sql`
- `backend/src/sql/queries/users/createUserAuth.sql`
- `backend/src/utils/maimlDataWriter.ts`
- `backend/src/utils/maimlParentInjector.ts`
- `backend/src/utils/maimlParser.ts`
- `docs/deploy-guide/alchemia-staging/staging-deploy-checklist.md`
- `docs/deploy-guide/mmdpf-config-data.sql`
- `docs/deploy-guide/mmdpf-schema.sql`
- `docs/design/db/db_table_list.md`
- `docs/design/db/ddl/file_metadata.sql`
- `docs/design/db/ddl/migrations/create_all_tables.sql`
- `docs/design/db/ddl/user_authentication.sql`
- `docs/design/ui/ui_login.md`
- `frontend/.env.local`
- `frontend/src/app/page.tsx`
- `frontend/src/components/ChangePasswordModal.tsx`
- `frontend/src/components/DataManagement/MasterManagement.tsx`
- `frontend/src/components/LoginPage.tsx`
- `frontend/src/components/SystemManagement/FunctionPermissionDialog.tsx`
- `frontend/src/components/SystemManagement/RoleManagement.tsx`
- `frontend/src/components/common/Header.tsx`
- `frontend/src/components/editorv2/DocumentEditDialog.tsx`
- `frontend/src/components/editorv2/PetriNetEditorInner.tsx`
- `frontend/src/components/editorv2/TemplateEditorDialog.tsx`
- `frontend/src/components/menus/ExperimentAdminMenu.tsx`
- `frontend/src/components/progress/ProgressMonitoring.tsx`
- `frontend/src/components/project/ProjectManagement.tsx`
- `frontend/src/locales/en.json`
- `frontend/src/locales/ja.json`
- `frontend/src/services/authService.ts`
- `frontend/src/services/fileAccessService.ts`
- `frontend/src/types/editor.ts`
- `frontend/src/types/file.ts`
- `frontend/src/utils/documentInitializer.ts`
- `frontend/src/utils/errorUtils.ts`
- `frontend/src/utils/maimlParserTyped.ts`
- `frontend/src/utils/maimlTypeConverter.ts`
- `frontend/src/utils/multiMethodConverter.ts`
- `frontend/src/utils/reactFlowConverter.ts`
- `frontend/src/utils/reactFlowToMaiml.ts`

### 削除 (17 件)
- `docs/20260513_1031_重複エラーメッセージ改善/PLAN.md`
- `docs/20260513_1629_ページネーション表記統一/PLAN.md`
- `docs/20260514_0910_実験開始後ボタン非活性バグ修正/PLAN.md`
- `docs/20260514_1020_MAIMLアップロードUUID重複エラー対応/PLAN.md`
- `docs/20260514_1313_実験管理者タブ遷移時の状態保持修正/PLAN.md`
- `docs/20260514_1414_英語ハードコードメッセージ修正/PLAN.md`
- `docs/20260514_1520_ロール管理リロードメッセージ修正/PLAN.md`
- `docs/20260514_1530_ユーザー管理部署プルダウン非アクティブ除外/PLAN.md`
- `docs/20260514_1601_ProjectManagement_タブデータ再取得修正/PLAN.md`
- `docs/20260515_0818_プロジェクト初期登録漏れ修正/PLAN.md`
- `docs/20260515_0928_ProjectManagement検索フィルタ修正/PLAN.md`
- `docs/20260515_0929_プロジェクト一覧フィルタ状態リセットバグ修正/PLAN.md`
- `docs/20260515_0952_Project型Task型整理/PLAN.md`
- `docs/20260515_1130_言語ファイル整理/PLAN.md`
- `docs/20260515_1130_言語ファイル整理/i18n_key_check_report.md`
- `docs/20260515_1132_プロジェクト名重複エラーメッセージ修正/PLAN.md`
- `frontend/src/utils/documentParser.ts`

### リネーム (0 件)
なし

---

## サマリー

| 種別 | 件数 |
|------|------|
| 追加 | 99 |
| 更新 | 71 |
| 削除 | 17 |
| リネーム | 0 |
| **合計** | **187** |
