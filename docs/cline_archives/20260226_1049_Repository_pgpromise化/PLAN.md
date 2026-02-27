# タスク計画書: Repository pg-promise + SQLファイル外部管理化

## メタデータ
- **作成日時**: 2026-02-26 10:49
- **タスクID**: repository-pgpromise
- **優先度**: 中
- **推定工数**: 2時間

## タスク概要

部署管理/ロール管理/マスタ管理/会社管理/組織管理画面のRepositoryファイルを、
`backend.md`のpg-promise + SQLファイル外部管理パターンに従って実装する。

## 目的と期待される成果
- [ ] JOINを含む複雑なクエリを外部SQLファイルに分離
- [ ] 全メソッドで`getPool()`から`getPgp()`に統一
- [ ] 保守性・可読性の向上

## 実装ステップ

### Phase 1: SQLファイル作成
- [ ] `departments/findById.sql`
- [ ] `roles/findAll.sql`
- [ ] `roles/findById.sql`
- [ ] `code_master/findByDivision.sql`
- [ ] `code_master/findByValue.sql`
- [ ] `corporations/findAll.sql`
- [ ] `corporations/findById.sql`
- [ ] `organizations/findAll.sql`
- [ ] `organizations/findById.sql`

### Phase 2: Repositoryファイル更新
- [ ] `departmentRepository.ts` 更新
- [ ] `roleRepository.ts` 更新
- [ ] `codeMasterRepository.ts` 更新
- [ ] `corporationRepository.ts` 更新
- [ ] `organizationManagementRepository.ts` 更新

## 変更ファイル
1. `backend/src/sql/queries/departments/findById.sql` - 新規
2. `backend/src/sql/queries/roles/findAll.sql` - 新規
3. `backend/src/sql/queries/roles/findById.sql` - 新規
4. `backend/src/sql/queries/code_master/findByDivision.sql` - 新規
5. `backend/src/sql/queries/code_master/findByValue.sql` - 新規
6. `backend/src/sql/queries/corporations/findAll.sql` - 新規
7. `backend/src/sql/queries/corporations/findById.sql` - 新規
8. `backend/src/sql/queries/organizations/findAll.sql` - 新規
9. `backend/src/sql/queries/organizations/findById.sql` - 新規
10. `backend/src/repositories/departmentRepository.ts` - 更新
11. `backend/src/repositories/roleRepository.ts` - 更新
12. `backend/src/repositories/codeMasterRepository.ts` - 更新
13. `backend/src/repositories/corporationRepository.ts` - 更新
14. `backend/src/repositories/organizationManagementRepository.ts` - 更新

## 承認記録
- **承認日時**: 2026-02-26 10:49
