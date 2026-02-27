# タスク計画書: Repository SQL外部管理対応

## メタデータ
- **作成日時**: 2026-02-26 17:38
- **タスクID**: Repository_SQL外部管理
- **優先度**: 高
- **推定工数**: 1.5時間

## タスク概要

会社管理・組織管理・部署管理・ロール管理・マスタ管理のRepositoryファイルに対して、pg-promiseライブラリ + SQLファイル外部管理パターンを徹底する。

## 目的と期待される成果
- [ ] 複雑なSQLクエリをSQLファイルとして外部管理する
- [ ] `vendorRepository.ts` を旧来の `getPool()` パターンからpg-promiseパターンへ移行する
- [ ] `.clinerules/development/database.md` の規約に準拠した実装にする

## 実装対象と方針

### 規約の再確認
`.clinerules/development/database.md` より：
- **複雑なクエリ（JOIN、サブクエリ等）** → SQLファイル外部管理 **必須**
- **単純なクエリ（EXISTS、単純INSERT/UPDATE/DELETE）** → インラインSQL **許容**

### 対象ファイルと対応内容

#### 優先度：高
1. **`vendorRepository.ts`** - 全体がpg-promise未対応（`getPool()` 使用中）
   - `getPool()` → `getPgp()` へ変換
   - 複雑なクエリ（`findAll`, `findById`, `findAllWithFilters`）をSQLファイル化

2. **`organizationManagementRepository.ts`** - 複雑なクエリが残存
   - `findAllWithStats()` → `organizations/findAllWithStats.sql`
   - `findSystemAdminsByOrganizationId()` → `organizations/findSystemAdmins.sql`

#### 優先度：中
3. **`roleRepository.ts`** - 権限管理クエリが残存
   - `createRole()` の重複チェック → `roles/checkExists.sql`
   - `updateRolePermissions()` の DELETE → `roles/deletePermissions.sql`
   - `updateRolePermissions()` の INSERT → `roles/insertPermission.sql`
   - `getInitialScreenFunctionCd()` → `roles/findInitialScreenFunctionCd.sql`

#### 優先度：低（対応不要）
4. **`departmentRepository.ts`** - 残存SQLはシンプルなINSERT/UPDATE/DELETE/EXISTSのみ → 規約上許容
5. **`corporationRepository.ts`** - 残存SQLはシンプルなINSERT/UPDATE/DELETE/EXISTSのみ → 規約上許容

## 変更ファイル

### 修正するファイル
1. `backend/src/repositories/vendorRepository.ts` - pg-promise化 + SQLファイル参照
2. `backend/src/repositories/organizationManagementRepository.ts` - 複雑クエリをSQLファイル参照
3. `backend/src/repositories/roleRepository.ts` - 権限管理クエリをSQLファイル参照

### 新規作成するSQLファイル
1. `backend/src/sql/queries/vendors/findAll.sql`
2. `backend/src/sql/queries/vendors/findById.sql`
3. `backend/src/sql/queries/vendors/findAllWithFilters.sql`
4. `backend/src/sql/queries/organizations/findAllWithStats.sql`
5. `backend/src/sql/queries/organizations/findSystemAdmins.sql`
6. `backend/src/sql/queries/roles/checkExists.sql`
7. `backend/src/sql/queries/roles/deletePermissions.sql`
8. `backend/src/sql/queries/roles/insertPermission.sql`
9. `backend/src/sql/queries/roles/findInitialScreenFunctionCd.sql`

## 承認記録
- **計画書提示日時**: 2026-02-26 17:38
- **承認日時**: 2026-02-26 17:38
- **承認者コメント**: Act Modeへ切り替えにより承認
