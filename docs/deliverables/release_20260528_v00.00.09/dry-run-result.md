# ドライラン結果

- **実行日時**: 2026-05-28 09:39:57
- **リリースタグ**: `release_20260526_v00.00.09`
- **FROM_COMMIT**: `219d2f97`
- **TO_COMMIT**: `ab8e5760`
- **SRC_REPO**: `/home/ssv/projects/mmdpf`

---

## 差分ファイル一覧

### 追加 (21 件)
- `backend/migrations/20260525_convert_code_master_to_i18n.sql`
- `docs/20260525_0946_フロントエンドハードコードメッセージi18n化/PLAN.md`
- `docs/20260525_1600_code_master多言語化/PLAN.md`
- `docs/20260525_1600_code_master多言語化/PLAN_code_remark_fix.md`
- `docs/infrastructure/aws-infrastructure/guides/staging-production-like/ALB_MTLS_SETUP_GUIDE.md`
- `docs/infrastructure/aws-infrastructure/research/ERROR_INVESTIGATION.md`
- `docs/infrastructure/aws-infrastructure/research/SERVER_CERT_REINSTALL_GUIDE.md`
- `docs/infrastructure/aws-infrastructure/research/STEP8_LISTENER_RULE_VERIFICATION.md`
- `docs/infrastructure/aws-infrastructure/research/TROUBLESHOOTING.md`
- `docs/命名規則違反検討/ESLint命名規則違反洗い出し手順.md`
- `docs/命名規則違反検討/backend.eslintrc.json`
- `docs/命名規則違反検討/eslint-plugin-mmdpf/index.js`
- `docs/命名規則違反検討/eslint-plugin-mmdpf/package.json`
- `docs/命名規則違反検討/eslint-plugin-mmdpf/rules/const-naming.js`
- `docs/命名規則違反検討/eslint.config.js`
- `docs/命名規則違反検討/frontend.eslint.config.mjs`
- `docs/命名規則違反検討/naming-convention.md`
- `scripts/check-error-codes.js`
- `scripts/grep-commands.md`
- `scripts/result/error-codes-check-report.txt`
- `scripts/result/i18n-check-report.txt`

### 更新 (23 件)
- `backend/package-lock.json`
- `backend/package.json`
- `backend/src/controllers/fileAccessController.ts`
- `backend/src/repositories/eventLogRepository.ts`
- `backend/src/services/codeMasterService.ts`
- `backend/src/services/projectService.ts`
- `backend/src/sql/queries/codeMaster/insertInitialData.sql`
- `backend/src/utils/maimlParser.ts`
- `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx`
- `frontend/src/components/format/CreateFormatFolderModal.tsx`
- `frontend/src/components/format/FormatUploadDialog.tsx`
- `frontend/src/components/project/BulkUploadDialog.tsx`
- `frontend/src/components/project/InstructionEditDialog.tsx`
- `frontend/src/components/project/TaskRegistrationTab.tsx`
- `frontend/src/components/viewer/ViewRenderer.tsx`
- `frontend/src/components/viewer/ViewRendererDialog.tsx`
- `frontend/src/hooks/useCodeMaster.ts`
- `frontend/src/hooks/usePublishStatusPoller.ts`
- `frontend/src/locales/en.json`
- `frontend/src/locales/ja.json`
- `frontend/src/utils/errorUtils.ts`
- `scripts/alchemia-staging/deploy.prod-verification.sh`
- `scripts/check-i18n-keys.js`

### 削除 (0 件)
なし

### リネーム (53 件)
- `docs/deliverables/release_20260519_v00.00.08/checklist.md` → `docs/deliverables/release_20260526_v00.00.08/checklist.md`
- `docs/deliverables/release_20260519_v00.00.08/dry-run-result.md` → `docs/deliverables/release_20260526_v00.00.08/dry-run-result.md`
- `docs/deliverables/release_20260519_v00.00.08/env_diff_20260526_092115.md` → `docs/deliverables/release_20260526_v00.00.08/env_diff_20260526_092115.md`
- `docs/deliverables/release_20260519_v00.00.08/release_info.md` → `docs/deliverables/release_20260526_v00.00.08/release_info.md`
- `docs/deliverables/release_20260519_v00.00.08/release_notes_20260526.md` → `docs/deliverables/release_20260526_v00.00.08/release_notes_20260526.md`
- `docs/deploy-guide/mmdpf-config-data.sql` → `docs/deploy-guide/data/mmdpf-config-data.sql`
- `docs/deploy-guide/mmdpf-schema.sql` → `docs/deploy-guide/data/mmdpf-schema.sql`
- `docs/deploy-guide/deploy-guide-dev.md` → `docs/deploy-guide/onprem/deploy-guide-dev.md`
- `docs/deploy-guide/deploy-guide-server.md` → `docs/deploy-guide/onprem/deploy-guide-server.md`
- `docs/deploy-guide/alchemia-staging/chrome-access-guide.md` → `docs/deploy-guide/saas-staging/chrome-access-guide.md`
- `docs/deploy-guide/alchemia-staging/deploy-guide-aws.md` → `docs/deploy-guide/saas-staging/deploy-guide-aws.md`
- `docs/deploy-guide/alchemia-staging/locale-change-deploy-procedure.md` → `docs/deploy-guide/saas-staging/locale-change-deploy-procedure.md`
- `docs/deploy-guide/alchemia-staging/staging-deploy-checklist.md` → `docs/deploy-guide/saas-staging/staging-deploy-checklist.md`
- `docs/deploy-guide/aws-infrastructure/README.md` → `docs/infrastructure/aws-infrastructure/README.md`
- `docs/deploy-guide/aws-infrastructure/research/alb-mtls-backend-code-changes.md` → `docs/infrastructure/aws-infrastructure/design/alb-mtls-backend-code-changes.md`
- `docs/deploy-guide/aws-infrastructure/design/backend-alb-integration-design.md` → `docs/infrastructure/aws-infrastructure/design/backend-alb-integration-design.md`
- `docs/deploy-guide/aws-infrastructure/design/dual-alb-architecture-investigation.md` → `docs/infrastructure/aws-infrastructure/design/dual-alb-architecture-investigation.md`
- `docs/deploy-guide/aws-infrastructure/design/production-architecture-review.md` → `docs/infrastructure/aws-infrastructure/design/production-architecture-review.md`
- `docs/deploy-guide/aws-infrastructure/design/subnet-az-redundancy-design.md` → `docs/infrastructure/aws-infrastructure/design/subnet-az-redundancy-design.md`
- `docs/deploy-guide/aws-infrastructure/production/.gitkeep` → `docs/infrastructure/aws-infrastructure/guides/production/.gitkeep`
- `docs/deploy-guide/aws-infrastructure/staging-production-like/PLAN_ACM_SELF_SIGNED.md` → `docs/infrastructure/aws-infrastructure/guides/staging-production-like/PLAN_ACM_SELF_SIGNED.md`
- `docs/deploy-guide/aws-infrastructure/staging-production-like/BUILD_GUIDE.md` → `docs/infrastructure/aws-infrastructure/guides/staging-production-like/prod-verification-alb-build-guide.md`
- `docs/deploy-guide/aws-infrastructure/staging/aurora-setup-guide.md` → `docs/infrastructure/aws-infrastructure/guides/staging/aurora-setup-guide.md`
- `docs/deploy-guide/aws-infrastructure/staging/backfill-client-certificate.md` → `docs/infrastructure/aws-infrastructure/guides/staging/backfill-client-certificate.md`
- `docs/deploy-guide/aws-infrastructure/staging/bedrock-iam-setup.md` → `docs/infrastructure/aws-infrastructure/guides/staging/bedrock-iam-setup.md`
- `docs/deploy-guide/aws-infrastructure/staging/elasticache-setup-guide.md` → `docs/infrastructure/aws-infrastructure/guides/staging/elasticache-setup-guide.md`
- `docs/deploy-guide/aws-infrastructure/staging/memo_deploy_staging_sasa.md` → `docs/infrastructure/aws-infrastructure/guides/staging/memo_deploy_staging_sasa.md`
- `docs/deploy-guide/aws-infrastructure/staging/nlb-migration-guide.md` → `docs/infrastructure/aws-infrastructure/guides/staging/nlb-migration-guide.md`
- `docs/deploy-guide/aws-infrastructure/staging/nlb-migration-memo.md` → `docs/infrastructure/aws-infrastructure/guides/staging/nlb-migration-memo.md`
- `docs/deploy-guide/aws-infrastructure/staging/server-cert-regenerate-guide.md` → `docs/infrastructure/aws-infrastructure/guides/staging/server-cert-regenerate-guide.md`
- `docs/deploy-guide/aws-infrastructure/staging/ssl-ssm-setup-guide.md` → `docs/infrastructure/aws-infrastructure/guides/staging/ssl-ssm-setup-guide.md`
- `docs/deploy-guide/aws-infrastructure/staging/ssl-ssm-setup-memo.md` → `docs/infrastructure/aws-infrastructure/guides/staging/ssl-ssm-setup-memo.md`
- `docs/deploy-guide/aws-infrastructure/research/acm-trust-store.md` → `docs/infrastructure/aws-infrastructure/research/acm-trust-store.md`
- `docs/deploy-guide/aws-infrastructure/research/alb-organization-id-extraction.md` → `docs/infrastructure/aws-infrastructure/research/alb-organization-id-extraction.md`
- `docs/deploy-guide/aws-infrastructure/research/alb-target-group.md` → `docs/infrastructure/aws-infrastructure/research/alb-target-group.md`
- `docs/deploy-guide/aws-infrastructure/research/alb-vs-nlb-comparison.md` → `docs/infrastructure/aws-infrastructure/research/alb-vs-nlb-comparison.md`
- `docs/deploy-guide/aws-infrastructure/research/availability-zone.md` → `docs/infrastructure/aws-infrastructure/research/availability-zone.md`
- `docs/deploy-guide/aws-infrastructure/research/aws-service-placement-review.md` → `docs/infrastructure/aws-infrastructure/research/aws-service-placement-review.md`
- `docs/deploy-guide/aws-infrastructure/research/ecs-ecr-bedrock-access-method.md` → `docs/infrastructure/aws-infrastructure/research/ecs-ecr-bedrock-access-method.md`
- `docs/deploy-guide/aws-infrastructure/research/ecs-nginx-frontend-separation.md` → `docs/infrastructure/aws-infrastructure/research/ecs-nginx-frontend-separation.md`
- `docs/deploy-guide/aws-infrastructure/research/ecs-scaling.md` → `docs/infrastructure/aws-infrastructure/research/ecs-scaling.md`
- `docs/deploy-guide/aws-infrastructure/research/internet-gateway.md` → `docs/infrastructure/aws-infrastructure/research/internet-gateway.md`
- `docs/deploy-guide/aws-infrastructure/research/network_concepts_qa.md` → `docs/infrastructure/aws-infrastructure/research/network_concepts_qa.md`
- `docs/deploy-guide/aws-infrastructure/research/openssl_command_explanation.md` → `docs/infrastructure/aws-infrastructure/research/openssl_command_explanation.md`
- `docs/deploy-guide/aws-infrastructure/research/route53-waf.md` → `docs/infrastructure/aws-infrastructure/research/route53-waf.md`
- `docs/deploy-guide/aws-infrastructure/research/s3_endpoint_explanation.md` → `docs/infrastructure/aws-infrastructure/research/s3_endpoint_explanation.md`
- `docs/deploy-guide/aws-infrastructure/research/security_group_overview.md` → `docs/infrastructure/aws-infrastructure/research/security_group_overview.md`
- `docs/deploy-guide/aws-infrastructure/research/staging-production-like-alb-frontend-design.md` → `docs/infrastructure/aws-infrastructure/research/staging-production-like-alb-frontend-design.md`
- `docs/deploy-guide/aws-infrastructure/research/staging-production-like-feasibility.md` → `docs/infrastructure/aws-infrastructure/research/staging-production-like-feasibility.md`
- `docs/deploy-guide/aws-infrastructure/research/subnet-public-private-security.md` → `docs/infrastructure/aws-infrastructure/research/subnet-public-private-security.md`
- `docs/deploy-guide/バックエンドログ確認方法.md` → `docs/operations/バックエンドログ確認方法.md`
- `docs/deploy-guide/動作確認用データ.md` → `docs/operations/動作確認用データ.md`
- `scripts/setup-ssm-ssl.sh` → `scripts/alchemia-staging/setup-ssm-ssl.sh`

---

## サマリー

| 種別 | 件数 |
|------|------|
| 追加 | 21 |
| 更新 | 23 |
| 削除 | 0 |
| リネーム | 53 |
| **合計** | **97** |
