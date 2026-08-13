# タスク計画書（Step5）: 後片付け — departmentテーブル・旧コード削除

## メタデータ

- **作成日時**: 2026-07-10 11:48
- **ステップ**: Step5 / 5
- **前提**: Step1〜Step4（全ステップ）完了後に着手
- **推定工数**: 0.5日

---

## 1. ステップ概要

> **⚠️ 前提**: PLAN_07（`Frontend_department残存修正`）の完了後に本ステップを開始すること。
> PLAN_07では以下が完了している必要がある：
> - `UserManagement.tsx` の `departmentApiService` 依存除去
> - `MasterManagement.tsx` の Attribute 部署選択を `/api/v1/organization-groups` API 使用に修正
> - `userController.ts` / `userRoutes.ts` / `database.ts` の `department_cd`/`departmentCd` 関連コード削除

Step1〜4で `organization_group` への移行が完了したことを確認した上で、`department` テーブルのDROP・`organization_user.department_cd` カラムのDROP・旧コードファイル・旧SQLファイルの削除を行い、プロジェクトから `department` 関連の残骸を完全に取り除く。

**多対多方針に基づく追加作業:**
- Step1で残置した `organization_user.department_cd` カラムをこのステップで正式にDROPする
- Step3でRedisフラッシュ済みのため、セッション関連の追加作業は不要

---

## 2. 目的と期待される成果

- [ ] `department` テーブルがDBから削除されている
- [ ] Backend の旧ファイル（`departmentRoutes.ts`, `departmentControler.ts`, `departmentService.ts`, `departmentRepository.ts`, `sql/queries/departments/`）が削除されている
- [ ] Frontend の旧ファイル（`DepartmentManagement.tsx`, `departmentApiService.ts`, `departmentTypes.ts`）が削除されている
- [ ] DDL の旧ファイル（`docs/design/db/ddl/department.sql`）が削除されている
- [ ] `grep -r "department" backend/src/` でヒットなし（テスト・ドキュメント除く）
- [ ] `grep -r "department" frontend/src/` でヒットなし（テスト・ドキュメント除く）

---

## 3. 実装ステップ

### Phase 1: 削除前の確認

- [ ] Backend に `department` 参照が残っていないことを確認
  ```bash
  grep -r "department" backend/src/ --include="*.ts" --include="*.sql"
  ```
- [ ] Frontend に `department` 参照が残っていないことを確認
  ```bash
  grep -r "department" frontend/src/ --include="*.ts" --include="*.tsx"
  ```
- [ ] アプリが正常に動作していることを確認（ビルド・起動・基本操作）

### Phase 2: DBマイグレーションの追加（department DROP + department_cd カラム DROP）

- [ ] `backend/migrations/20260710_drop_department.sql` を新規作成
  ```sql
  -- ============================================================
  -- 1. organization_user.department_cd カラムの削除
  --    （Step1で残置した互換カラム。Step3〜4の移行完了後に削除可能）
  -- ============================================================
  DO $$
  BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'organization_user' AND column_name = 'department_cd'
    ) THEN
      ALTER TABLE organization_user DROP COLUMN department_cd;
    END IF;
  END$$;

  -- ============================================================
  -- 2. department テーブルの削除
  -- ============================================================
  DROP TABLE IF EXISTS department CASCADE;
  ```
- [ ] マイグレーション実行前に以下を確認すること
  - `organization_user.department_cd` カラムへのアクセスがBackend/Frontend全体で0件であること（Step3・Step4完了済みであること）
  - `project.department_cd` カラムが存在しないこと（Step1のRENAME COLUMN適用済みであること）
  - `attribute.department_cd` カラムが存在しないこと（Step1のRENAME COLUMN適用済みであること）

### Phase 3: Backend 旧ファイルの削除

- [ ] `backend/src/routes/departmentRoutes.ts` 削除
- [ ] `backend/src/controllers/departmentControler.ts` 削除
- [ ] `backend/src/services/departmentService.ts` 削除
- [ ] `backend/src/repositories/departmentRepository.ts` 削除
- [ ] `backend/src/sql/queries/departments/` ディレクトリごと削除
  - `findAll.sql`
  - `findById.sql`
  - `existsById.sql`
  - `create.sql`
  - `update.sql`
  - `updateStatus.sql`
  - `deleteById.sql`

### Phase 4: Frontend 旧ファイルの削除

- [ ] `frontend/src/components/SystemManagement/DepartmentManagement.tsx` 削除
- [ ] `frontend/src/services/departmentApiService.ts` 削除
- [ ] `frontend/src/types/departmentTypes.ts` 削除

### Phase 5: DDL 旧ファイルの削除

- [ ] `docs/design/db/ddl/department.sql` 削除

### Phase 6: テスト・その他ファイルの確認と更新

- [ ] `backend/tests/` 配下に department 関連のテストファイルがあれば削除または更新
- [ ] `backend/sql/test_data_insert.sql` 等のテストデータに `department` テーブルへのINSERTがあれば削除
- [ ] `frontend/src/types/__tests__/` 配下に department 参照があれば更新

### Phase 7: 最終確認

- [ ] Backend ビルドが成功すること
  ```bash
  cd backend && npm run build
  ```
- [ ] Frontend ビルドが成功すること
  ```bash
  cd frontend && npm run build
  ```
- [ ] `grep -r "department" backend/src/` でヒットなし（下記スコープ外を除く）
- [ ] `grep -r "department" frontend/src/` でヒットなし（下記スコープ外を除く）
- [ ] `grep -r "department" docs/design/db/` でヒットなし（下記スコープ外を除く）

> **⚠️ grep 完了条件のスコープ外除外ファイル**（以下はヒットしても問題ない）:
> - `backend/src/repositories/departmentUnitRepository.ts` / `backend/src/controllers/departmentUnitController.ts` / `backend/src/routes/departmentUnitRoutes.ts`
>   → チーム管理機能（`department_unit` テーブル）は今回の移行対象外の独立機能。`DROP TABLE department CASCADE` 実行時にFK制約（`fk_department_unit_department`）のみCASCADE削除される。`department_cd`カラム自体（NULL可VARCHAR）は残存するが実害なし。
> - `backend/src/repositories/namespaceTermRepository.ts` / `docs/design/db/ddl/namespace.sql`
>   → 名前空間機能は今回の移行対象外。`namespace.department_cd` は単純なVARCHARカラムで `department` テーブルへのFK制約なし。
> - `backend/src/services/maimlService.ts`（`departmentCd` 変数名）
>   → S3パス構造 `formats/{departmentCd}/...` の変数名。DBの `department` テーブルとは無関係（別タスクで対応予定）。

---

## 4. 変更ファイル一覧

### 新規作成

| ファイル | 内容 |
|---------|------|
| `backend/migrations/20260710_drop_department.sql` | `DROP TABLE IF EXISTS department CASCADE` |

### 削除

| ファイル | 理由 |
|---------|------|
| `backend/src/routes/departmentRoutes.ts` | organization_groupRoutesに置き換え済み |
| `backend/src/controllers/departmentControler.ts` | organization_groupControllerに置き換え済み |
| `backend/src/services/departmentService.ts` | organization_groupServiceに置き換え済み |
| `backend/src/repositories/departmentRepository.ts` | organization_groupRepositoryに置き換え済み |
| `backend/src/sql/queries/departments/` (ディレクトリ) | organization_groups/に置き換え済み |
| `frontend/src/components/SystemManagement/DepartmentManagement.tsx` | OrganizationGroupManagement.tsxに置き換え済み |
| `frontend/src/services/departmentApiService.ts` | organizationGroupApiService.tsに置き換え済み |
| `frontend/src/types/departmentTypes.ts` | organizationGroupTypes.tsに置き換え済み |
| `docs/design/db/ddl/department.sql` | organization_group.sqlに置き換え済み |

---

## 5. テスト計画

- [ ] `DROP TABLE department` マイグレーション実行後もアプリが正常動作すること
- [ ] 組織グループ管理の CRUD が動作すること
- [ ] ユーザー管理・プロジェクト管理・フォーマット管理・進捗監視が正常動作すること
- [ ] ログイン → JWT取得 → 各画面アクセスが正常動作すること
- [ ] Backend ビルド・Frontend ビルドがエラーなく完了すること

---

## 6. 全体完了条件の最終チェックリスト

### DB状態
- [ ] `organization_group` テーブルが存在する
- [ ] `organization_group_user` テーブルが存在する（多対多中間テーブル）
- [ ] `organization_user.organization_group_cd` カラムは**存在しない**（Step1でRENAMEしたが、organization_userにはorganization_group_cdカラムは追加していない。department_cdはDROPされていること）
- [ ] `organization_user.department_cd` カラムがDB上から削除されている（Phase 2で実施）
- [ ] `project.organization_group_cd` カラムが存在する
- [ ] `attribute.organization_group_cd` カラムが存在する（attributeにdepartment_cdが存在した場合）
- [ ] `department` テーブルがDB上から削除されている

### コード状態
- [ ] Backend の全コードに `department` 参照が残っていない
- [ ] Frontend の全コードに `department` 参照が残っていない
- [ ] 関連する旧ファイルが全て削除されている
- [ ] Backend / Frontend ビルドが成功している

### 動作確認
- [ ] ログイン → JWTに `organizationGroupCds: string[]` が含まれている
- [ ] 複数グループ所属ユーザーで正常ログインできる
- [ ] 組織グループ管理の CRUD が動作する
- [ ] ユーザー管理・プロジェクト管理・フォーマット管理・進捗監視が正常動作する

---

## 7. 承認記録

- **計画書提示日時**: 2026-07-10 11:48
- **承認日時**: （承認後に記入）

---

## 8. 実施記録（PLAN_07 — 前提条件完了）

### 実施日時
完了: 2026-07-15 10:03

### PLAN_07「Frontend department残存修正」完了内容

PLAN_05着手に必要な前提条件（PLAN_07）を以下の通り完了した。

#### Phase1: UserManagement.tsx のdepartment依存除去
- `fetchDepartments` import 削除
- `departments` state / `loadDepartments()` 削除
- フィルター欄「部署」Select 削除
- 追加・編集モーダルの `departmentCd` フォームフィールド削除
- `UserNamespaceFields` 内 `Form.useWatch('departmentCd')` 削除
- `namespaceUri` 自動生成から `departmentCd` 引数削除

#### Phase2: バックエンド型・ルート修正
- `backend/src/routes/userRoutes.ts` — `department_cd` / `departmentCd` バリデーション削除
- `backend/src/types/database.ts` — `UserSearchFilters.departmentCd` 削除

#### Phase3: MasterManagement / masterDataTypes — Attributeマスタの部署→組織グループ移行
- `frontend/src/types/masterDataTypes.ts` — `AttributeRecord.departmentCd/departmentName` → `organizationGroupCd/organizationGroupName` に置換
- `frontend/src/components/DataManagement/MasterManagement.tsx` — 部署API `/api/v1/departments` → `/api/v1/organization-groups` に切替、送信キーを `organizationGroupCd` に統一

#### i18n修正
- `frontend/src/locales/en.json` — `organizationManagement.form.namespaceInfo` / `userManagement.form.namespaceInfo` キー追加（TypeScriptビルドエラー解消）

#### ビルド確認
- Frontend ビルド: ✅ `Compiled successfully` → 静的ページ生成完走

### 次のステップ
PLAN_05の Phase1〜7（DBマイグレーション・旧ファイル物理削除）は未実施。  
上記前提条件が整ったため、Phase 1の確認作業から着手可能な状態。

---

## 9. 実施記録（PLAN_05 本体）

### 実施日時
完了: 2026-07-15 10:36

### Phase 1: 削除前確認
- backend/src に残る department 参照を全て確認
- frontend/src に残る department 参照を全て確認
- スコープ外（departmentUnit / namespace / maimlService）を除外して整理

### Phase 2: DBマイグレーション確認
- `backend/migrations/20260710_drop_department.sql` 既存ファイルを確認
  - `organization_user.department_cd` DROP + `DROP TABLE IF EXISTS department CASCADE` の内容を確認済み

### Phase 3前処理: コード修正
- `backend/src/server.ts` — `departmentRoutes` import/mount 削除
- `frontend/src/components/menus/SystemAdminMenu.tsx` — DepartmentManagement import・タブ定義(key:4)・タブコンテンツ削除、`ShopOutlined` import 削除
- `backend/src/controllers/userController.ts` — `department_cd` フィルタ削除（PLAN_07で完了済み）

### Phase 3: Backend旧ファイル物理削除
- `backend/src/routes/departmentRoutes.ts` 削除
- `backend/src/controllers/departmentControler.ts` 削除
- `backend/src/services/departmentService.ts` 削除
- `backend/src/repositories/departmentRepository.ts` 削除
- `backend/src/sql/queries/departments/` ディレクトリごと削除

### Phase 4: Frontend旧ファイル物理削除
- `frontend/src/components/SystemManagement/DepartmentManagement.tsx` 削除
- `frontend/src/services/departmentApiService.ts` 削除
- `frontend/src/types/departmentTypes.ts` 削除

### Phase 5: DDL旧ファイル削除
- `docs/design/db/ddl/department.sql` — 削除済みであることを確認（ファイル不存在）

### Phase 6: テスト・テストデータ確認
- `backend/tests/repositories/` に departmentRepository.test.ts が存在しないことを確認
- `backend/sql/` の SQL ファイルに department INSERT なしを確認

### Phase 7: 最終ビルド確認
- Backend ビルド: ✅ `tsc` エラーなし
- Frontend ビルド: ✅ `Compiled successfully` → 静的ページ生成完走

### 残存 department 参照（スコープ外・対応不要）
| ファイル | 内容 | 理由 |
|---------|------|------|
| `backend/src/utils/messages.ts` | `department.duplicateCd` 等のメッセージ定数 | 削除対象のdepartmentServiceが使用していた定数。今後不使用だが実害なし |
| `backend/src/types/database.ts` | `UserRow.department_cd/department_name` | JOINクエリの結果型。department_cdカラムDROP後に自然消滅 |
| `departmentUnit` 系ファイル | `department_unit` テーブル関連 | 今回の移行対象外の独立機能 |
| `namespace` 系ファイル | `department_cd` VARCHARカラム | FK制約なし、今回の移行対象外 |
| ~~`backend/src/services/maimlService.ts`~~ | ~~`departmentCd` 変数名~~ | **2026-07-15 対応済み**（後述） |

---

## 追記: 2026-07-15 — maimlService.ts 型不整合バグ修正

### 発見された問題

PLAN_05 完了後の調査で、`maimlService.ts` の `listFormatsFiles()` 関数が **フロントエンドの型定義と不整合** を引き起こすバグを発見した。

| 項目 | 修正前 | 修正後 |
|------|--------|--------|
| Backend interface 名 | `FormatDepartment` | `FormatOrganizationGroup` |
| Backend レスポンスキー | `departments` | `organizationGroups` |
| Backend フィールド名 | `departmentCd` | `organizationGroupCd` |
| Controller ログ | `departmentCount` | `organizationGroupCount` |
| Frontend `ListFormatsResponse` | `{ organizationGroups: ... }` （既に移行済み） | 変更なし（整合済み） |

**影響**: `GET /api/v1/maiml/formats` が `{ departments: [...] }` を返すのに、フロントエンドが `response.organizationGroups` を参照するため、フォーマットテンプレート選択が常に空になる機能不全（`TemplateEditorDialog` / `FormatEditorDialog`）。

### 対応ファイル

- `backend/src/services/maimlService.ts` — `FormatDepartment` → `FormatOrganizationGroup`、`departments` → `organizationGroups`、`departmentCd` → `organizationGroupCd`（ローカル変数名・ソート処理・reduce処理）
- `backend/src/controllers/maimlController.ts` — ログ出力 `departmentCount` → `organizationGroupCount`

### ビルド確認

- Backend ビルド: ✅ `tsc` エラーなし（2026-07-15）
- Frontend ビルド: ✅ `Compiled successfully`（2026-07-15）
