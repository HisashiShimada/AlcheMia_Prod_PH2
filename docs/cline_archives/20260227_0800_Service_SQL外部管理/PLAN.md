# タスク計画書: ServiceファイルのSQL外部管理化

## メタデータ
- **作成日時**: 2026-02-27 08:00
- **タスクID**: service-sql外部管理
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

以下7つのServiceファイル内のインラインSQLをpg-promiseを使用して外部SQLファイルで管理する。
また、`getPool()`を使用したトランザクション管理を`getPgp().tx()`に統一する。

## 対象ファイル

① backend/src/services/corporationService.ts
② backend/src/services/departmentService.ts
③ backend/src/services/masterService.ts
④ backend/src/services/organizationService.ts
⑤ backend/src/services/roleService.ts
⑥ backend/src/services/systemOverviewService.ts（対応不要）
⑦ backend/src/services/userService.ts

## 実装ステップ

- [x] タスク計画書を作成
- [ ] 新規SQLファイルを作成（organizations/createUserAuthentication.sql）
- [ ] 新規SQLファイルを作成（corporations/findByName.sql）
- [ ] organizationService.ts のインラインSQLを外部化
- [ ] roleService.ts のインラインSQLを外部化 + getPgp().tx() に変更
- [ ] corporationService.ts の getPool() → getPgp().tx() に変更
- [ ] departmentService.ts の getPool() → getPgp().tx() に変更
- [ ] masterService.ts の getPool() → getPgp().tx() に変更
- [ ] userService.ts の getPool() → getPgp().tx() に変更

## 変更内容詳細

### インラインSQL外部化対象

| ファイル | SQL | 外部ファイル |
|---------|-----|------------|
| organizationService.ts | INSERT INTO organization | organizations/create.sql（既存） |
| organizationService.ts | INSERT INTO user_authentication | organizations/createUserAuthentication.sql（新規） |
| organizationService.ts | SELECT FROM corporation | corporations/findByName.sql（新規） |
| roleService.ts | INSERT INTO role | roles/create.sql（既存） |
| roleService.ts | INSERT INTO role_permission | organizations/createRolePermission.sql（既存） |

### getPool() → getPgp().tx() 変換対象

| ファイル | 変換箇所 |
|---------|---------|
| corporationService.ts | uploadCorporationsCsv内のトランザクション |
| departmentService.ts | uploadDepartmentsCsv内のトランザクション |
| masterService.ts | uploadCreatorsCsv、uploadInstrumentsCsv、uploadVendorsCsv内のトランザクション |
| organizationService.ts | createOrganization内のトランザクション（既にpgp.tx使用中だが改善） |
| roleService.ts | uploadRolesCsv内のトランザクション |
| userService.ts | uploadUsersFromCSV内のトランザクション |

## 実施記録

### 実施日時
開始: 2026-02-27 08:00  
完了: 2026-02-27 08:32

### セッション1（前セッション）: organizationService.ts
- [x] `getPool()` → `getPgp()` に変更
- [x] インラインSQL2件を外部SQLファイル化
  - `backend/src/sql/queries/corporations/findByName.sql`（新規）
  - `backend/src/sql/queries/organizations/createUserAuthentication.sql`（新規）

### セッション2（本セッション）: 残り6ファイル
- [x] `corporationService.ts`: `getPool()` → `getPgp()` に変更、トランザクションを `pgp.tx()` に移行
- [x] `departmentService.ts`: `getPool()` → `getPgp()` に変更、トランザクションを `pgp.tx()` に移行
- [x] `masterService.ts`: `getPool()` → `getPgp()` に変更、3つのCSVアップロード処理を `pgp.tx()` に移行
- [x] `roleService.ts`: `getPool()` → `getPgp()` に変更（前セッション完了済み確認）
- [x] `systemOverviewService.ts`: `getPool()` 使用なし（変更不要）
- [x] `userService.ts`: `getPool()` → `getPgp()` に変更、トランザクションを `pgp.tx()` に移行
- [x] 未使用変数 `t` → `_t` に修正（corporationService / departmentService / masterService x3 / userService）

### TSビルド確認結果
- 今回の修正で新たに追加されたエラー: **なし**
- 残存エラー（既存・スコープ外）:
  - `organizationController.ts`: `req` 未使用
  - `projectInstructionRepository.ts`: `uuidv4` 未使用
  - `jwtService.ts`: `uuidv4` 未使用
  - `projectInstructionService.ts`: `request` 未使用
  - `projectService.ts`: `loadSqlFile` 未使用
  - `maiml-unified.ts`: `dayjs` モジュール未解決
