# タスク計画書（Step4）: Frontend移行 — 型/API/コンポーネント/i18nの置き換え

## メタデータ

- **作成日時**: 2026-07-10 11:47
- **ステップ**: Step4 / 5
- **前提**: Step2（Backend管理CRUD機能）・Step3（他機能参照置換）完了後に着手
- **推定工数**: 1〜1.5日

---

## 1. ステップ概要

Frontend の型定義・API サービス・コンポーネント・i18nを `department` → `organization_group` に移行する。

**管理画面の方針変更:**
- 組織グループ管理（CRUD）は**実験管理者メニューの「チーム管理」から操作**する
- **`OrganizationGroupManagement.tsx` の新規作成は不要**
- システム管理者メニュー（`SystemAdminMenu.tsx`）の「部署管理」タブは**廃止**（削除）するだけ

ユーザー管理・プロジェクト管理・進捗監視・フォーマット管理など各画面の `departmentCd` / `department` 参照を `organizationGroupCd(s)` / `organizationGroup` に更新する。

**多対多方針に基づく重要な変更:**
- ユーザーは複数グループに所属できるため、`departmentCd: string`（単値）は **`organizationGroupCds: string[]`（配列）** に変更する
- ユーザー管理のグループ選択UIは **複数選択**（マルチセレクト）対応が必要
- Backend JWTペイロードが `organizationGroupCds: string[]` を返すため、フロントエンドも配列として扱う

---

## 2. 目的と期待される成果

- [x] システム管理メニュー（`SystemAdminMenu.tsx`）の「部署管理」タブが**廃止**されている（削除）
- [x] ユーザー管理画面の所属グループ選択が `organization_group` を参照している
- [x] プロジェクト管理・進捗監視画面の部署フィルタが組織グループフィルタに置き換えられている
- [x] フォーマット管理（フォルダ作成・アップロード）が `organizationGroupCd` を使用している
- [x] Frontend全体で `department` 参照が残っていない

---

## 3. 実装ステップ

### Phase 1: 型定義の更新

#### `frontend/src/types/auth.ts`
- [ ] `departmentCd: string`（単値）→ **`organizationGroupCds: string[]`（配列）** に変更
- [ ] JWTペイロード型・セッション型を配列型に合わせて更新

#### `frontend/src/types/api.ts`
- [ ] `departmentCd: string` → `organizationGroupCd: string` に変更
- [ ] `department_cd: string` → `organization_group_cd: string` に変更

#### `frontend/src/types/user.ts`
- [ ] `departmentCd?: string`（単値）→ **`organizationGroupCds?: string[]`（配列）** に変更
- [ ] `departmentName?: string` → `organizationGroupNames?: string[]` に変更（配列対応）
- [ ] `department_cd?: string` → `organization_group_cd?: string` に変更（APIフィルタパラメータ用）

#### `frontend/src/types/project.ts`
- [ ] `department: string` → `organizationGroup: string` に変更（複数箇所）
- [ ] `departmentName?: string` → `organizationGroupName?: string` に変更
- [ ] `departmentFilter?: string` → `organizationGroupFilter?: string` に変更
- [ ] `departmentId: string` → `organizationGroupId: string` に変更

#### `frontend/src/types/progress.ts`
- [ ] `department: string` → `organizationGroup: string` に変更（複数箇所）
- [ ] `department?: string` → `organizationGroup?: string` に変更

#### `frontend/src/types/format.ts`
- [ ] `department: string` → `organizationGroup: string` に変更
- [ ] `FormatDepartment` → `FormatOrganizationGroup` に改名
  - `departmentCd: string` → `organizationGroupCd: string` に変更
- [ ] `ListFormatsResponse.departments` → `organizationGroups` に変更

#### `frontend/src/types/masterDataTypes.ts`
- [ ] `departmentCd: string` → `organizationGroupCd: string` に変更
- [ ] `departmentName: string` → `organizationGroupName: string` に変更

#### `frontend/src/types/experiment.ts`
- [ ] `departmentFilter?: string` → `organizationGroupFilter?: string` に変更

### Phase 2: 型定義ファイルの更新（organizationGroupTypes）

> **方針**: `departmentTypes.ts` と同等の型定義は実験管理者メニューの「チーム管理」実装時に作成済みまたは別途作成する。
> このフェーズでは `departmentTypes.ts` で定義されている型を **他のファイルが依存している場合**のみ、`organizationGroupTypes.ts` に移行する。

- [ ] `departmentTypes.ts` の型が他ファイルから import されている箇所を確認
  - import されている場合 → `frontend/src/types/organizationGroupTypes.ts` を新規作成して移行
  - import されていない場合 → このフェーズはスキップ可能（Step5でファイル削除のみ）

### Phase 3: API サービスの更新

#### `frontend/src/services/userApiService.ts`
- [ ] `department_cd` パラメータを `organization_group_cd` に変更

#### `frontend/src/services/formatApiService.ts`
- [x] `department_cd` 参照を `organization_group_cd` に変更（organizationGroupCd パラメータ追加・OrganizationGroupSelector新規作成）

#### `frontend/src/services/authService.ts`
- [ ] `departmentCd` 参照を `organizationGroupCd` に変更（セッション情報のマッピング）

> **注**: `departmentApiService.ts` ・ `organizationGroupApiService.ts` は「チーム管理」機能実装で別途対応済みのため、このフェーズでの新規作成は不要。

### Phase 4: システム管理者メニューから「部署管理」タブを廃止

#### `frontend/src/components/menus/SystemAdminMenu.tsx`
- [ ] 「部署管理」タブ（`DepartmentManagement` のimportおよびタブ定義）を**削除**する
  - `import DepartmentManagement from ...` を削除
  - 部署管理タブの JSX（`<TabPane key="department" ...>`相当）を削除
  - ※ `OrganizationGroupManagement` への置き換えは**不要**（「チーム管理」メニューで管理するため）

### Phase 5: ユーザー管理コンポーネントの更新

#### `frontend/src/components/SystemManagement/UserManagement.tsx`
- [ ] `import { fetchMasters as fetchDepartments } from '@/services/departmentApiService'` → `organizationGroupApiService` に変更
- [ ] `departments` state の型を `OrganizationGroupUIRecord` ベースに変更
- [ ] `selectedDepartment` → `selectedOrganizationGroup` に変更
- [ ] テーブルカラム: `departmentName` → `organizationGroupName` に変更
- [ ] フォームフィールド: `departmentCd` → `organizationGroupCd` に変更
- [ ] フィルタ: `department_cd` → `organization_group_cd` に変更

### Phase 6: プロジェクト管理・進捗監視コンポーネントの更新

#### `frontend/src/components/project/ProjectManagement.tsx`
- [ ] `departmentFilter` → `organizationGroupFilter` に変更（state・sessionStorage key）
- [ ] `project.department` → `project.organizationGroup` に変更
- [ ] `p.departmentName || p.department` → `p.organizationGroupName || p.organizationGroup` に変更
- [ ] フィルタ選択肢のラベル: `t('projectManagement.filter_labels.department')` → `organizationGroup` に変更

#### `frontend/src/components/progress/ProgressMonitoring.tsx`
- [ ] `departmentFilter` → `organizationGroupFilter` に変更
- [ ] `item.department` → `item.organizationGroup` に変更
- [ ] テーブルカラム: `department` → `organizationGroup` に変更

#### `frontend/src/components/progress/WorkProgressDetailDialog.tsx`
- [ ] `fileDetails.projectInfo.department` → `fileDetails.projectInfo.organizationGroup` に変更

#### `frontend/src/components/project/ProjectFolderTree.tsx`
- [ ] `project.departmentName || project.department` → `project.organizationGroupName || project.organizationGroup` に変更

### Phase 7: フォーマット管理コンポーネントの更新

#### `frontend/src/components/format/CreateFormatModal.tsx`
- [x] `departmentName?: string` → `organizationGroupName?: string` に変更
- [x] `t('createFormatModal.departmentNote')` → `organizationGroupNote` に変更

#### `frontend/src/components/format/FormatUploadDialog.tsx`
- [ ] `departmentCd?: string` → `organizationGroupCd?: string` に変更
- [ ] `formats/${baseFolder.departmentCd}/` → `formats/${baseFolder.organizationGroupCd}/` に変更

#### `frontend/src/components/format/FormatManagement.tsx`
- [x] `format.department` → `format.organizationGroup` に変更（OrganizationGroupSelector 組込み・selectedOrganizationGroupCd state 追加）
- [x] `user.departmentCd` → `user.organizationGroupCd` に変更

#### `frontend/src/components/editorv2/TemplateEditorDialog.tsx`
- [ ] `{ departments: [] }` → `{ organizationGroups: [] }` に変更
- [ ] `formatsResponse.departments` → `formatsResponse.organizationGroups` に変更
- [ ] `dept.departmentCd / dept.folders` → `group.organizationGroupCd / group.folders` に変更

### Phase 8: マスター管理コンポーネントの更新

#### `frontend/src/components/DataManagement/MasterManagement.tsx`
- [ ] `fetch(.../systemManagement/department` → `.../systemManagement/organization-group` に変更
- [ ] `departmentId`, `displayName` → `organizationGroupCd`, `organizationGroupName` にマッピング変更
- [ ] `departmentOptions` → `organizationGroupOptions` に変更
- [ ] `key === 'departmentName'` → `key === 'organizationGroupName'` に変更
- [ ] `name="departmentCd"` → `name="organizationGroupCd"` に変更

### Phase 9: i18n の更新

#### `frontend/src/locales/ja.json`
- [ ] `menu.system_admin.tabs.departmentManagement` → `organizationGroupManagement` に変更（値：「組織グループ管理」）
- [ ] `departmentManagement` キー群を `organizationGroupManagement` に移行・キー名・値を更新
  - `searchPlaceholder`: 「グループCD、グループ名で検索」
  - `columns.organizationGroupCd`: 「グループCD」
  - `columns.organizationGroupName`: 「グループ名」
  - `form.*`: フォームラベル更新
  - `messages.*`: メッセージ更新
- [ ] `userManagement.columns.departmentName` → `organizationGroupName`（「所属グループ」）
- [ ] `userManagement.form.department` → `organizationGroup`
- [ ] `userManagement.messages.departmentFetchError` → `organizationGroupFetchError`
- [ ] `projectManagement.filter_labels.department` → `organizationGroup`（「組織グループ」）
- [ ] `progress.filter.department` → `organizationGroup`
- [x] `createFormatModal.departmentNote` → `organizationGroupNote`（ノート文言更新）
- [ ] `department` 単体キー群を `organizationGroup` に更新

#### `frontend/src/locales/en.json`
- [ ] 同様に全 `department` / `departmentManagement` 参照を `organizationGroup` / `organizationGroupManagement` に更新

### Phase 10: カスタムフックの更新

#### `frontend/src/hooks/useAttributeMasters.ts`
- [ ] `apply_department_filter` → `apply_organization_group_filter` に変更（または維持するかはStep3の方針に合わせる）

#### `frontend/src/services/masterApiService.ts`
- [ ] `apply_department_filter` → `apply_organization_group_filter` に変更

---

## 4. 変更ファイル一覧

### 新規作成（条件付き）

| ファイル | 内容 | 条件 |
|---------|------|------|
| `frontend/src/types/organizationGroupTypes.ts` | OrganizationGroup型定義 | `departmentTypes.ts` の型を他ファイルが import している場合のみ |

> **注**: `OrganizationGroupManagement.tsx` ・ `organizationGroupApiService.ts` は「チーム管理」機能で別途作成済みのため新規作成不要

### 修正

| ファイル | 主な変更内容 |
|---------|------------|
| `frontend/src/types/auth.ts` | `departmentCd: string` → **`organizationGroupCds: string[]`**（配列化） |
| `frontend/src/types/api.ts` | department参照を更新 |
| `frontend/src/types/user.ts` | `departmentCd/Name` → **`organizationGroupCds/Names`**（配列化） |
| `frontend/src/types/project.ts` | `department` → `organizationGroup` |
| `frontend/src/types/progress.ts` | `department` → `organizationGroup` |
| `frontend/src/types/format.ts` | `FormatDepartment` → `FormatOrganizationGroup` |
| `frontend/src/types/masterDataTypes.ts` | `departmentCd/Name` → `organizationGroupCd/Name` |
| `frontend/src/types/experiment.ts` | `departmentFilter` → `organizationGroupFilter` |
| `frontend/src/services/userApiService.ts` | `department_cd` → `organization_group_cd` |
| `frontend/src/services/formatApiService.ts` | `department_cd` → `organization_group_cd` |
| `frontend/src/services/authService.ts` | `departmentCd` → `organizationGroupCds`（配列対応） |
| `frontend/src/services/masterApiService.ts` | `apply_department_filter` を更新 |
| `frontend/src/hooks/useAttributeMasters.ts` | フィルタパラメータ更新 |
| `frontend/src/components/menus/SystemAdminMenu.tsx` | 「部署管理」タブのimport・JSXを**削除**（置き換えなし） |
| `frontend/src/components/SystemManagement/UserManagement.tsx` | department参照を全て更新 |
| `frontend/src/components/project/ProjectManagement.tsx` | `departmentFilter` → `organizationGroupFilter` |
| `frontend/src/components/progress/ProgressMonitoring.tsx` | `department` → `organizationGroup` |
| `frontend/src/components/progress/WorkProgressDetailDialog.tsx` | `department` → `organizationGroup` |
| `frontend/src/components/project/ProjectFolderTree.tsx` | `department` → `organizationGroup` |
| `frontend/src/components/format/CreateFormatModal.tsx` | `departmentName` → `organizationGroupName` |
| `frontend/src/components/format/FormatUploadDialog.tsx` | `departmentCd` → `organizationGroupCd` |
| `frontend/src/components/format/FormatManagement.tsx` | `departmentCd` → `organizationGroupCd` |
| `frontend/src/components/editorv2/TemplateEditorDialog.tsx` | `departments` → `organizationGroups` |
| `frontend/src/components/DataManagement/MasterManagement.tsx` | department API参照を更新 |
| `frontend/src/locales/ja.json` | `departmentManagement` キー削除・`organizationGroup` 系キー追加 |
| `frontend/src/locales/en.json` | 同上 |

---

## 5. テスト計画

- [ ] システム管理者メニューに「部署管理」タブが**表示されない**こと
- [ ] ユーザー管理画面で所属グループのフィルタ・表示が動作すること（複数グループ対応）
- [ ] プロジェクト管理画面で組織グループフィルタが動作すること
- [ ] 進捗監視画面で組織グループフィルタ・カラム表示が動作すること
- [ ] フォーマット管理でフォルダ作成・アップロードのパスが `organization_group_cd` ベースになっていること
- [ ] i18nキーが全て正しく解決されていること（コンソールエラーなし）
- [ ] `grep -r "department" frontend/src/` でヒットしないこと（旧ファイル削除後）

---

## 6. 次ステップへの引き渡し事項

- Frontend全体で `department` 参照が `organization_group` に置き換えられていること
- Step5（後片付け）で旧ファイルを安全に削除できる状態になっていること

---

## 7. 承認記録

- **計画書提示日時**: 2026-07-10 11:47
- **承認日時**: （承認後に記入）
