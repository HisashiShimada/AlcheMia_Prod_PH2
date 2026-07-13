# タスク計画書（全体）: department廃止 → organization_group移行

## メタデータ

- **作成日時**: 2026-07-10 11:43
- **タスクID**: department_to_org_group
- **優先度**: 高
- **推定工数**: 4〜6日（全ステップ合計）

---

## 1. タスク概要

`department`テーブルを廃止し、`organization_group`テーブル（`docs/design/db/ddl/organization_group.sql`）に置き換える対応を行う。

`department`テーブルはシステム全体に広く参照されているため、DBレイヤーから始めてBackend（管理CRUD機能 → 他機能参照）→ Frontend の順に段階的に移行する。

---

## 2. 目的と期待される成果

### 目的

- `department`テーブル（部署マスタ）を廃止し、組織階層グループ（`organization_group`）に一本化する
- 階層構造（`parent_group_cd` / `layer`）を持つより柔軟なグループ管理へ移行する

### 最終的な完了条件

- [ ] `department`テーブルがDB上から削除されている
- [ ] `organization_user.department_cd`、`project.department_cd`、`attribute.department_cd` 等の参照カラムが`organization_group_cd`（または同等のカラム）に置き換えられている
- [ ] Backend の全コードに`department`参照が残っていない
- [ ] Frontend の全コードに`department`参照が残っていない（組織グループとして再実装されている）
- [ ] 関連するDDLファイル・SQLクエリファイル・サービス/リポジトリ等の旧ファイルが削除されている

---

## 3. 移行対象の全体スコープ

### DB層

| 対象 | 変更内容 |
|------|---------|
| `docs/design/db/ddl/department.sql` | 廃止・削除 |
| `docs/design/db/ddl/organization_group.sql` | 新テーブル定義（確定済み） |
| `docs/design/db/ddl/migrations/create_all_tables.sql` | department削除・organization_group追加 |
| `organization_user.department_cd` | `organization_group_cd`に改名（ALTER TABLE） |
| `project.department_cd` | `organization_group_cd`に改名（ALTER TABLE） |
| `attribute.department_cd` | `organization_group_cd`に改名（ALTER TABLE） |
| マイグレーションSQL | `backend/migrations/` に追加 |

> **備考**: `organization_group.sql` のテーブル名・カラム名に typo（`organization_gourp`）が存在する。  
> 正式名称は `organization_group` / `organization_group_cd` とし、SQLファイルのtypoを修正して採用する。

### Backend（部署管理CRUD機能）

| 対象ファイル | 変更内容 |
|------------|---------|
| `backend/src/routes/departmentRoutes.ts` | `organizationGroupRoutes.ts` に置き換え |
| `backend/src/controllers/departmentControler.ts` | `organizationGroupController.ts` に置き換え |
| `backend/src/services/departmentService.ts` | `organizationGroupService.ts` に置き換え |
| `backend/src/repositories/departmentRepository.ts` | `organizationGroupRepository.ts` に置き換え |
| `backend/src/sql/queries/departments/*.sql` | `backend/src/sql/queries/organization_groups/*.sql` に置き換え |
| `backend/src/server.ts` | `departmentRoutes` → `organizationGroupRoutes` に差し替え |

### Backend（他機能からの参照）

| 対象ファイル | 変更内容 |
|------------|---------|
| `backend/src/controllers/authHelpers.ts` | `department_cd` → `organization_group_cd` |
| `backend/src/services/authService.ts` | `departmentCd` → `organizationGroupCd` |
| `backend/src/services/pinCodeService.ts` | `department_cd` → `organization_group_cd` |
| `backend/src/controllers/userController.ts` | `department_cd` フィルタ参照を置き換え |
| `backend/src/repositories/userRepository.ts` | `department_cd` JOINを置き換え |
| `backend/src/controllers/projectController.ts` | `departmentCd` 参照を置き換え |
| `backend/src/repositories/projectRepository.ts` | `department_cd` 参照を置き換え |
| `backend/src/controllers/formatController.ts` | `departmentCd` → `organizationGroupCd` |
| `backend/src/services/maimlService.ts` | `departmentCd` / `departmentMap` 参照を置き換え |
| `backend/src/controllers/masterController.ts` | `departmentCd` フィルタ参照を置き換え |
| `backend/src/repositories/attributeRepository.ts` | `department_cd` JOINを置き換え |
| `backend/src/types/database.ts` | 型定義を更新 |
| `backend/src/types/auth.ts` | `departmentCd` → `organizationGroupCd` |
| `backend/src/types/api.ts` | 型定義を更新 |
| `backend/src/types/project.ts` | `department` 参照を更新 |
| `backend/src/types/format.ts` | `department_cd` 参照を更新 |
| `backend/src/utils/messages.ts` | `department` 関連メッセージを更新 |
| SQL: `users/findAll.sql`, `findById.sql` | `LEFT JOIN department d` を置き換え |
| SQL: `projects/findAllWithDetails.sql`, `findWithOwnerAndDept.sql` | `LEFT JOIN department d` を置き換え |
| SQL: `organization_users/findByEmail.sql`, `findByUserId.sql`, `findByUserIdWithRole.sql` | `department_cd` 参照を更新 |
| SQL: `attributes/findById.sql` | `department_cd` JOINを置き換え |
| SQL: `organizations/createOrganizationUser.sql` | `department_cd` カラム参照を更新 |

### Frontend

| 対象ファイル | 変更内容 |
|------------|---------|
| `frontend/src/types/departmentTypes.ts` | `organizationGroupTypes.ts` に置き換え |
| `frontend/src/services/departmentApiService.ts` | `organizationGroupApiService.ts` に置き換え |
| `frontend/src/components/SystemManagement/DepartmentManagement.tsx` | `OrganizationGroupManagement.tsx` に置き換え |
| `frontend/src/components/SystemManagement/UserManagement.tsx` | department参照を organizationGroup に更新 |
| `frontend/src/components/project/ProjectManagement.tsx` | `departmentFilter` → `organizationGroupFilter` |
| `frontend/src/components/progress/ProgressMonitoring.tsx` | `department` 参照を更新 |
| `frontend/src/components/format/CreateFormatModal.tsx` | `departmentName` 参照を更新 |
| `frontend/src/components/format/FormatUploadDialog.tsx` | `departmentCd` 参照を更新 |
| `frontend/src/components/format/FormatManagement.tsx` | `departmentCd` 参照を更新 |
| `frontend/src/components/editorv2/TemplateEditorDialog.tsx` | `departments` 参照を更新 |
| `frontend/src/components/DataManagement/MasterManagement.tsx` | department API参照を更新 |
| `frontend/src/types/auth.ts` | `departmentCd` → `organizationGroupCd` |
| `frontend/src/types/api.ts` | 型定義を更新 |
| `frontend/src/types/project.ts` | `department` 参照を更新 |
| `frontend/src/types/format.ts` | `department_cd` 参照を更新 |
| `frontend/src/types/user.ts` | `departmentCd` 参照を更新 |
| `frontend/src/types/masterDataTypes.ts` | `departmentCd` 参照を更新 |
| `frontend/src/types/progress.ts` | `department` 参照を更新 |
| `frontend/src/services/userApiService.ts` | `department_cd` パラメータを更新 |
| `frontend/src/services/formatApiService.ts` | `department_cd` 参照を更新 |
| `frontend/src/services/authService.ts` | `departmentCd` 参照を更新 |
| `frontend/src/locales/ja.json` / `en.json` | `departmentManagement` キー群を更新 |
| `frontend/src/components/menus/SystemAdminMenu.tsx` | `departmentManagement` タブ参照を更新 |
| `frontend/src/components/project/ProjectFolderTree.tsx` | `department` 表示参照を更新 |

---

## 4. 実施ステップと各計画書

| # | ステップ | 計画書 | 依存 | 状態 |
|---|---------|--------|------|------|
| 1 | DB層：organization_groupテーブル作成・参照カラム移行のDDL整備 | [PLAN_01_DB移行.md](./PLAN_01_DB移行.md) | なし | ✅ 完了 |
| 2 | Backend：organization_group管理CRUD機能の実装（routes/controller/service/repository/SQLファイル） | [PLAN_02_Backend_組織グループ管理機能.md](./PLAN_02_Backend_組織グループ管理機能.md) | Step1完了後 | ✅ 完了（2026-07-10） |
| 3 | Backend：他機能からのdepartment_cd参照を置き換え（user/project/format/attribute/auth等） | [PLAN_03_Backend_他機能参照置換.md](./PLAN_03_Backend_他機能参照置換.md) | Step1完了後（Step2と並行可） | ✅ 完了（2026-07-10） |
| 4 | Frontend：型/API service/コンポーネント/i18nを移行 | [PLAN_04_Frontend移行.md](./PLAN_04_Frontend移行.md) | Step2・3完了後 | ✅ 完了（2026-07-13） |
| 5 | 後片付け：departmentテーブル・旧コードファイルを削除 | [PLAN_05_後片付け.md](./PLAN_05_後片付け.md) | Step6完了後 | ⏳ 未着手 |
| 6 | SQL残存department参照修正：`project`/`attribute`参照SQLとTS側を修正、createOrganizationUser対応 | [PLAN_06_SQL残存department参照修正.md](./PLAN_06_SQL残存department参照修正.md) | Step1〜4完了後（Step5実施前） | ⏳ 未着手 |

---

## 5. リスクと対策（全体）

| リスク | 影響度 | 対策 |
|--------|--------|------|
| `organization_group.sql` のtypo（`organization_gourp`）をコード全体に反映してしまう | 高 | Step1 DDL作成時に正しいテーブル名 `organization_group` / `organization_group_cd` を使用し、SQLファイルのtypoを修正してから着手 |
| `chief_user_id NOT NULL` 制約により既存データ移行時にエラー | 高 | データ移行SQL作成時に要相談（移行方針未確定）。開発環境ではdepartmentレコードを捨てて再登録で対応するか確認 |
| S3パス（`formats/{department_cd}/...`）の変更による既存ファイル参照不能 | 高 | Step1計画書で移行方針（S3リネーム or 既存パスを維持して新規のみ新CDを使用）を別途相談 |
| JWT クレームの `departmentCd` → `organizationGroupCd` 変更により既存セッションが失効 | 中 | Step3実施時にセッション全無効化を合わせて実施するか確認 |
| 変更ファイルが多く一部の参照漏れが発生する | 中 | 各ステップ完了後に `grep -r "department" backend/src` 等で残存参照を確認 |

---

## 6. 関連ドキュメント

- [organization_group.sql（新テーブル定義）](../../docs/design/db/ddl/organization_group.sql)
- [department.sql（廃止予定）](../../docs/design/db/ddl/department.sql)

---

## 7. 承認記録

- **計画書提示日時**: 2026-07-10 11:43
- **承認日時**: （承認後に記入）

---

## 8. 進捗記録

| 日時 | ステップ | 内容 |
|------|---------|------|
| 2026-07-10 | Step1 完了 | DB移行DDL・マイグレーションSQL作成済み（`backend/migrations/20260710_add_organization_group.sql`） |
| 2026-07-10 16:14 | Step2 完了 | Backend organization_group管理CRUD API実装完了（`tsc --noEmit` エラーなし） |
| 2026-07-10 16:50 | Step3 完了 | Backend 他機能department_cd参照を全置換（auth/user/project/format/attribute/master）、`tsc --noEmit` エラー0件 |
| 2026-07-13 08:22 | Step4 完了 | Frontend 型/サービス/コンポーネント/i18n を全置換（auth/user/project/progress/format/editor/menu）、`tsc --noEmit` 追加エラーなし |
