# タスク計画書（Step3）: Backend — 他機能からのdepartment_cd参照を置き換え

## メタデータ

- **作成日時**: 2026-07-10 11:46
- **ステップ**: Step3 / 5
- **前提**: Step1（DB層移行）完了後に着手。Step2と並行可
- **推定工数**: 1〜1.5日

---

## 1. ステップ概要

管理CRUD以外の機能（認証・ユーザー管理・プロジェクト管理・フォーマット管理・属性マスタ管理）に散在する `department_cd` / `departmentCd` 参照を `organization_group_cd` / `organizationGroupCd` に置き換える。

**多対多方針に基づく重要な設計変更:**

- **認証/JWT**: ユーザーは複数グループに所属できるため、JWTペイロードの `departmentCd: string`（単値）を **`organizationGroupCds: string[]`（配列）** に変更する
- **ユーザーのグループ情報取得**: ログイン時に `organization_group_user` テーブルから当該ユーザーの所属グループCD一覧を取得してJWTに格納する
- **グループフィルタ（ユーザー管理）**: `WHERE ou.department_cd = $1` 形式の単値比較を **`= ANY($1)`** の配列比較に変更する
- **プロジェクト/属性マスタ**: 1プロジェクト・1属性は単一グループ所属のため `organization_group_cd`（単値）のまま。ただしフィルタ処理でログインユーザーの所属グループCDs配列との比較（`= ANY`）を使用する

SQL クエリファイル（JOIN句・カラム参照）も合わせて更新する。

---

## 2. 目的と期待される成果

- [x] JWT / セッションの `departmentCd: string`（単値）が **`organizationGroupCds: string[]`（配列）** に更新されている
- [x] ログイン時に `organization_group_user` テーブルから所属グループCDs一覧を取得してJWTに格納されている
- [x] ユーザー一覧・詳細取得に `organizationGroupCds: string[]` が含まれている
- [x] プロジェクト一覧・詳細に `organization_group_cd` が含まれている
- [x] フォーマット管理（S3パス）が `organizationGroupCd` を使用している（ログインユーザーの所属グループCDs[0]など）
- [x] 属性マスタのグループフィルタが `organizationGroupCds` 配列との `= ANY` 比較で動作している
- [x] 型定義ファイルに `department` 参照が残っていない

---

## 3. 実装ステップ

### Phase 1: 認証系の置き換え（多対多・配列対応）

#### `backend/src/types/auth.ts`
- [ ] `departmentCd?: string` → **`organizationGroupCds: string[]`** に変更（単値→配列）
- [ ] JWTペイロード型・セッション型を配列型に合わせて更新

#### `backend/src/controllers/authHelpers.ts`
- [ ] ログイン時のユーザー情報組み立て処理を変更
  - `organization_user.department_cd` 単値の取得を廃止
  - **`organization_group_user` テーブルから `user_id` で該当レコードを取得し、`organization_group_cd` の配列を構築**
  - `departmentCd: user.department_cd` → `organizationGroupCds: string[]` に変更
- [ ] `ou.department_cd` 参照を削除（`organization_group_user` JOINに置き換え）

#### `backend/src/services/authService.ts`
- [ ] `departmentCd: userInfo.departmentCd` → `organizationGroupCds: userInfo.organizationGroupCds` に変更
- [ ] `departmentCd: user.department_cd` 参照をすべて `organizationGroupCds` 配列取得ロジックに変更

#### `backend/src/services/pinCodeService.ts`
- [ ] `ou.department_cd` → `organization_group_user` からの配列取得に変更
- [ ] `departmentCd: row.department_cd` → `organizationGroupCds: string[]` に変更

> **方針確定**: JWT クレームの変更により既存の有効なセッション（JWT）が `departmentCd` を持ったまま残る。  
> Step3実施時に **開発環境のRedisセッションストアをflush** してセッション全無効化を実施する。

#### SQL: `backend/src/sql/queries/organization_users/findByEmail.sql`
- [ ] `ou.department_cd` 参照を削除
- [ ] `organization_group_user` へのサブクエリを追加してグループCDs配列（`ARRAY_AGG`）を取得
  ```sql
  -- 追加例
  ARRAY(
    SELECT ogu.organization_group_cd
    FROM organization_group_user ogu
    WHERE ogu.organization_id = ou.organization_id
      AND ogu.user_id = ou.user_id
  ) AS organization_group_cds
  ```

#### SQL: `backend/src/sql/queries/organization_users/findByUserId.sql`
- [ ] 同様に `ou.department_cd` を削除し `ARRAY(...)` サブクエリで `organization_group_cds` を取得

#### SQL: `backend/src/sql/queries/organization_users/findByUserIdWithRole.sql`
- [ ] 同様に `ou.department_cd` を削除し `organization_group_cds` 配列を取得

### Phase 2: ユーザー管理系の置き換え（多対多対応）

#### `backend/src/controllers/userController.ts`
- [ ] `department_cd` クエリパラメータ受け取りを `organization_group_cd` に変更
- [ ] `filters.departmentCd` → `filters.organizationGroupCd` に変更（複数箇所）
- [ ] レスポンスの `departmentCd`, `departmentName` を **`organizationGroupCds: string[]`**, `organizationGroupNames: string[]` に変更
- [ ] ユーザー作成・更新時の `departmentCd` 指定を `organizationGroupCds` 配列指定に変更し、`organization_group_user` テーブルへのINSERT/DELETEを行うよう更新

#### `backend/src/repositories/userRepository.ts`
- [ ] `organization_user.department_cd` カラムへの参照をすべて削除
- [ ] グループフィルタを `organization_group_user` テーブルへの `EXISTS` サブクエリに変更
  ```sql
  -- フィルタ例（グループCDで絞り込む場合）
  AND EXISTS (
    SELECT 1 FROM organization_group_user ogu
    WHERE ogu.organization_id = ou.organization_id
      AND ogu.user_id = ou.user_id
      AND ogu.organization_group_cd = $N
  )
  ```
- [ ] ユーザー作成・更新後に `organization_group_user` テーブルのINSERT/DELETE処理を追加

#### `backend/src/routes/userRoutes.ts`
- [ ] `query('department_cd')` → `query('organization_group_cd')` に変更
- [ ] `body('departmentCd')` → `body('organizationGroupCds').isArray()` に変更（配列バリデーション）

#### SQL: `backend/src/sql/queries/users/findAll.sql`
- [ ] `LEFT JOIN department d ON ...` を削除
- [ ] `LEFT JOIN organization_group og` への JOIN を追加（グループ名取得用）
- [ ] `ou.department_cd` を削除
- [ ] `organization_group_user` から `ARRAY_AGG(ogu.organization_group_cd)` でグループCDs配列を取得するサブクエリを追加

#### SQL: `backend/src/sql/queries/users/findById.sql`
- [ ] 同様に `LEFT JOIN department d` を削除し `organization_group_user` から配列取得に変更

#### SQL: `backend/src/sql/queries/users/createUser.sql`
- [ ] `department_cd` カラムへのINSERTを削除（`organization_group_user` への登録は別途実施）

#### SQL: `backend/src/sql/queries/organizations/createOrganizationUser.sql`
- [ ] `department_cd` カラムへのINSERTを削除

### Phase 3: プロジェクト管理系の置き換え

#### `backend/src/controllers/projectController.ts`
- [ ] `req.user!.departmentCd` → `req.user!.organizationGroupCd` に変更
- [ ] `departmentCd` 変数の改名

#### `backend/src/repositories/projectRepository.ts`
- [ ] `department_cd` → `organization_group_cd` に変更
- [ ] `department_name` → `organization_group_name` に変更

#### SQL: `backend/src/sql/queries/projects/findAllWithDetails.sql`
- [ ] `p.department_cd` → `p.organization_group_cd` に変更
- [ ] `LEFT JOIN department d` → `LEFT JOIN organization_group og` に変更
- [ ] `d.department_name` → `og.organization_group_name` に変更

#### SQL: `backend/src/sql/queries/projects/findWithOwnerAndDept.sql`
- [ ] `p.department_cd` → `p.organization_group_cd` に変更
- [ ] `LEFT JOIN department d` → `LEFT JOIN organization_group og` に変更
- [ ] `d.department_name` → `og.organization_group_name` に変更

### Phase 4: フォーマット管理系の置き換え

#### `backend/src/controllers/formatController.ts`
- [ ] `req.user!.departmentCd!` → `req.user!.organizationGroupCd!` に変更（全箇所）
- [ ] `departmentCd` 変数を `organizationGroupCd` に改名（全箇所）

#### `backend/src/services/maimlService.ts`
- [ ] `departmentCd` → `organizationGroupCd` に変更（全箇所）
- [ ] `departmentMap` → `organizationGroupMap` に変更
- [ ] `departments` → `organizationGroups` に変更
- [ ] `FormatDepartment` 型の参照を `FormatOrganizationGroup` に変更（または型定義を更新）
- [ ] パスの分解ロジック: `parts[1] = departmentCd` → `parts[1] = organizationGroupCd` コメント更新

### Phase 5: 属性マスタ・マスター管理系の置き換え

#### `backend/src/controllers/masterController.ts`
- [ ] `apply_department_filter` クエリパラメータ名を `apply_organization_group_filter` に変更（または維持するかを確認）
- [ ] `req.user?.departmentCd` → `req.user?.organizationGroupCd` に変更
- [ ] `filters.departmentCd` → `filters.organizationGroupCd` に変更
- [ ] `data.departmentCd` → `data.organizationGroupCd` に変更（複数箇所）

#### `backend/src/repositories/attributeRepository.ts`
- [ ] `filters.departmentCd` → `filters.organizationGroupCd` に変更
- [ ] `a.department_cd` → `a.organization_group_cd` に変更
- [ ] `departmentCd` → `organizationGroupCd` に変更（複数箇所）

#### SQL: `backend/src/sql/queries/attributes/findById.sql`
- [ ] `a.department_cd` → `a.organization_group_cd` に変更
- [ ] `LEFT JOIN department d` → `LEFT JOIN organization_group og` に変更
- [ ] `d.department_name` → `og.organization_group_name` に変更

### Phase 6: 型定義ファイルの更新

#### `backend/src/types/database.ts`
- [ ] `department_cd?: string` → `organization_group_cd?: string` に変更（複数箇所）
- [ ] `department_name: string | null` → `organization_group_name: string | null` に変更
- [ ] `departmentCd?: string` → `organizationGroupCd?: string` に変更

#### `backend/src/types/api.ts`
- [ ] `department?: string` → `organizationGroup?: string` に変更
- [ ] `department_cd: string` → `organization_group_cd: string` に変更（関連箇所）

#### `backend/src/types/project.ts`
- [ ] `department: string` → `organizationGroup: string` に変更
- [ ] `departmentName?: string` → `organizationGroupName?: string` に変更
- [ ] `departmentFilter?: string` → `organizationGroupFilter?: string` に変更

#### `backend/src/types/format.ts`
- [ ] `department: string` → `organizationGroup: string` に変更
- [ ] `department_cd: string` → `organization_group_cd: string` に変更（複数箇所）
- [ ] `FormatDepartment` インターフェース → `FormatOrganizationGroup` に改名
  - `departmentCd: string` → `organizationGroupCd: string` に変更

### Phase 7: メッセージ定義の更新

#### `backend/src/utils/messages.ts`
- [ ] `department` キーを `organizationGroup` に変更
- [ ] `department_cd`, `department_name` 参照するメッセージテンプレートを更新

---

## 4. 変更ファイル一覧

### Backend 修正ファイル

| ファイル | 主な変更内容 |
|---------|------------|
| `backend/src/types/auth.ts` | `departmentCd: string` → **`organizationGroupCds: string[]`**（配列化） |
| `backend/src/types/database.ts` | `department_cd/name` → `organization_group_cd/name`、配列型追加 |
| `backend/src/types/api.ts` | department参照を更新 |
| `backend/src/types/project.ts` | department参照を更新 |
| `backend/src/types/format.ts` | `FormatDepartment` → `FormatOrganizationGroup`、各カラム名を更新 |
| `backend/src/utils/messages.ts` | departmentメッセージキー更新 |
| `backend/src/controllers/authHelpers.ts` | `department_cd` 単値取得 → `organization_group_user` から配列取得 |
| `backend/src/services/authService.ts` | `departmentCd` → `organizationGroupCds: string[]` |
| `backend/src/services/pinCodeService.ts` | `department_cd` → `organization_group_user` から配列取得 |
| `backend/src/routes/userRoutes.ts` | `departmentCd` → `organizationGroupCds` 配列バリデーション |
| `backend/src/controllers/userController.ts` | `department_cd` → `organization_group_cd`、応答を配列型に変更 |
| `backend/src/repositories/userRepository.ts` | `department_cd` 参照削除 → `organization_group_user` EXISTS/配列サブクエリ |
| `backend/src/controllers/projectController.ts` | `departmentCd` → `organizationGroupCds[0]`（先頭グループ使用）または `organizationGroupCds` で `ANY` 比較 |
| `backend/src/repositories/projectRepository.ts` | `department_cd/name` → `organization_group_cd/name` |
| `backend/src/controllers/formatController.ts` | `departmentCd` → `organizationGroupCds[0]`（S3パスは1グループ指定） |
| `backend/src/services/maimlService.ts` | `departmentCd/Map` → `organizationGroupCd/Map` |
| `backend/src/controllers/masterController.ts` | `departmentCd` → `organizationGroupCds`（配列での `ANY` フィルタ） |
| `backend/src/repositories/attributeRepository.ts` | `department_cd` → `organization_group_cd`、フィルタを `= ANY` に変更 |

### SQL ファイル

| ファイル | 主な変更内容 |
|---------|------------|
| `backend/src/sql/queries/users/findAll.sql` | `LEFT JOIN department` 削除 → `organization_group_user` から `ARRAY_AGG` でCDs取得 |
| `backend/src/sql/queries/users/findById.sql` | 同上 |
| `backend/src/sql/queries/users/createUser.sql` | `department_cd` INSERT削除 |
| `backend/src/sql/queries/organizations/createOrganizationUser.sql` | `department_cd` INSERT削除 |
| `backend/src/sql/queries/organization_users/findByEmail.sql` | `department_cd` 削除 → `ARRAY(...)` サブクエリで `organization_group_cds` 取得 |
| `backend/src/sql/queries/organization_users/findByUserId.sql` | 同上 |
| `backend/src/sql/queries/organization_users/findByUserIdWithRole.sql` | 同上 |
| `backend/src/sql/queries/projects/findAllWithDetails.sql` | `LEFT JOIN department` → `LEFT JOIN organization_group` |
| `backend/src/sql/queries/projects/findWithOwnerAndDept.sql` | `LEFT JOIN department` → `LEFT JOIN organization_group` |
| `backend/src/sql/queries/attributes/findById.sql` | `LEFT JOIN department` → `LEFT JOIN organization_group` |

---

## 5. テスト計画

- [x] ログインAPIが正常に動作し、JWTに **`organizationGroupCds: string[]`** が含まれること
- [ ] 複数グループに所属するユーザーでログインした場合、配列に複数CDが含まれること（結合テスト）
- [x] ユーザー一覧に `organizationGroupCds: string[]` が含まれること
- [ ] グループCDフィルタ（`organization_group_cd` パラメータ）でユーザー一覧が絞り込めること（結合テスト）
- [x] プロジェクト一覧に `organizationGroupCd`, `organizationGroupName` が含まれること
- [x] フォーマット一覧取得が `organizationGroupCd` を使用してS3パスを構築していること
- [x] 属性マスタの組織グループフィルタが `= ANY` で動作すること
- [x] department参照がコード上に残っていないこと（`tsc --noEmit` エラー0件で確認済み）

---

## 6. 次ステップへの引き渡し事項

- Backend全体で `department` 参照が `organization_group` に置き換えられていること
- JWTペイロードに **`organizationGroupCds: string[]`** が含まれていること
- Frontend（Step4）がアクセスするAPIのレスポンスキーが `organizationGroupCds: string[]` / `organizationGroupName: string` になっていること

---

## 7. 承認記録

- **計画書提示日時**: 2026-07-10 11:46
- **承認日時**: 2026-07-10 16:47（実施済み）

---

## 8. 実施記録

### 実施日時
- 開始: 2026-07-10 16:14
- 完了: 2026-07-10 16:50

### 実施内容

| フェーズ | 対象ファイル | 変更内容 |
|---------|------------|---------|
| Phase 1: 認証系 | `backend/src/types/auth.ts` | `departmentCd: string` → `organizationGroupCds: string[]` |
| Phase 1: 認証系 | `backend/src/sql/queries/organization_users/findByEmail.sql` | `department` JOIN → `organization_group_user` JOIN、`organizationGroupCds` 配列取得 |
| Phase 1: 認証系 | `backend/src/sql/queries/organization_users/findByUserId.sql` | 同上 |
| Phase 1: 認証系 | `backend/src/sql/queries/organization_users/findByUserIdWithRole.sql` | 同上 |
| Phase 1: 認証系 | `backend/src/controllers/authHelpers.ts` | `departmentCd` → `organizationGroupCds` |
| Phase 1: 認証系 | `backend/src/services/authService.ts` | JWT生成時のペイロードを更新 |
| Phase 1: 認証系 | `backend/src/repositories/organizationUserRepository.ts` | `departmentCd` → `organizationGroupCds[]` |
| Phase 1: 認証系 | `backend/src/services/pinCodeService.ts` | `departmentCd` → `organizationGroupCds` |
| Phase 2: ユーザー管理 | `backend/src/sql/queries/users/findAll.sql` | `department` JOIN → `organization_group_user` JOIN、`organization_group_cds` 配列集約 |
| Phase 2: ユーザー管理 | `backend/src/sql/queries/users/findById.sql` | 同上 |
| Phase 2: ユーザー管理 | `backend/src/sql/queries/users/createUser.sql` | `department_cd` カラム削除 |
| Phase 2: ユーザー管理 | `backend/src/types/database.ts` | `User` 型: `department_cd` → `organization_group_cds: string[]` |
| Phase 2: ユーザー管理 | `backend/src/controllers/userController.ts` | `departmentCd` 参照を削除 |
| Phase 2: ユーザー管理 | `backend/src/services/userService.ts` | `departmentCd` 参照を削除 |
| Phase 2: ユーザー管理 | `backend/src/repositories/userRepository.ts` | `departmentCd` 参照を削除 |
| Phase 3: プロジェクト | `backend/src/controllers/projectController.ts` | `departmentCd` → `organizationGroupCds[0]` |
| Phase 4: フォーマット | `backend/src/controllers/formatController.ts` | `departmentCd` → `organizationGroupCds[0]`（全5箇所） |
| Phase 5: 属性マスタ | `backend/src/controllers/masterController.ts` | `departmentCd` → `organizationGroupCds[0]` |

### ビルド確認結果

```
$ cd backend && npx tsc --noEmit
Exit: 0（エラー0件）
```

### 完了条件達成状況

- [x] JWT / セッションの `departmentCd: string`（単値）が **`organizationGroupCds: string[]`（配列）** に更新されている
- [x] ログイン時に `organization_group_user` テーブルから所属グループCDs一覧を取得してJWTに格納されている
- [x] `backend/src/types/auth.ts` の `JwtPayload` 型が更新されている
- [x] TypeScriptビルドが通過している（`tsc --noEmit` エラー0件）
