# タスク計画書: チーム作成時 namespace（URI）自動生成

## メタデータ
- **作成日時**: 2026-07-31 13:25
- **タスクID**: team-namespace-auto-create
- **優先度**: 中
- **推定工数**: 4時間

## 1. タスク概要

`organization_group`（チーム）を新規作成した際に、そのチームスコープの
namespace（URI）を `namespace` テーブルに自動登録する処理が欠落している。

`namespaceTermRepository.findDeclarationsByProjectScope()` は
`scope_key = organization_group_cd` の namespace を参照する仕組みが既に存在するが、
チーム作成時にそのレコードが生成されないため、プロジェクトとチームを紐付けても
チーム専用の名前空間宣言が使えない状態になっている。

本タスクでは以下を実装する。
1. チーム作成時に namespace URI を自動生成してDBに登録する
2. 既存チームへの backfill スクリプトを用意する

## 2. 目的と期待される成果

### 目的
チーム作成時に namespace レコードが自動登録され、
プロジェクトに所属チームを設定した際に正しく名前空間宣言が取得できるようにする。

### 期待される成果
- [ ] チームを作成すると `namespace` テーブルに `scope_key = organization_group_cd` のレコードが登録される
- [ ] URI は階層構造を考慮して `https://{org_cd}.Alchemia.co.jp/{parent_cd}/.../{group_cd}` 形式で生成される
- [ ] グループ作成と namespace 登録が同一トランザクション内で実行される
- [ ] チーム削除時は namespace を削除しない（既存動作を変更しない）
- [ ] 既存チームへの backfill スクリプトが実行可能

## 3. 仕様詳細

### URI 生成ルール

```
ルートグループ（親なし）:
  https://{org_cd}.Alchemia.co.jp/{group_cd}
  例: https://ORG001.Alchemia.co.jp/RD

子グループ（parent_group_cd あり）:
  https://{org_cd}.Alchemia.co.jp/{祖先CD1}/{祖先CD2}/.../{group_cd}
  例: https://ORG001.Alchemia.co.jp/RD/RD-ANALYSIS
```

- 祖先CDは `parent_group_cd` を再帰的に遡り、**ルート→直近親** の順に並べる
- URI 重複時は末尾に連番を付与（既存の `resolveUriConflict()` を流用）

### namespace テーブルへの登録内容

| カラム | 値 |
|--------|-----|
| `organization_id` | チームの `organization_id` |
| `namespace_id` | 自動採番（NS0001 形式） |
| `uri` | 上記のルールで生成した URI |
| `global_flg` | `FALSE` |
| `scope_key` | `organization_group_cd` |
| `create_user_id` | 作成者ユーザーID |

### チーム更新・削除時の扱い

- **更新時（名称変更・親グループ変更）**: namespace URI は**再生成しない**（URI は作成時の状態で固定）
- **削除時**: namespace は削除しない

## 4. 実装ステップ

### Phase 1: SQL ファイル追加

- [x] `backend/src/sql/queries/organization_groups/findAncestorChain.sql`
  - `WITH RECURSIVE` で `parent_group_cd` を root まで遡り、ルート→直近親の順で CD 配列を返す
- [x] `backend/src/sql/queries/namespace_terms/existsByScopeKey.sql`
  - `scope_key` に対応する namespace が存在するか確認する SQL（backfill の冪等性チェック用）

### Phase 2: Repository 層改修

- [x] `backend/src/repositories/organizationGroupRepository.ts`
  - `findAncestorChain(organizationId, parentGroupCd)` 関数を追加
    - 引数の `parentGroupCd` が null の場合は空配列を返す
    - 戻り値: `string[]`（祖先の organization_group_cd 配列、ルート→直近親の順）
  - `create()` 関数にオプション引数 `t?: ITask<unknown>` を追加
    - pg-promise のトランザクションオブジェクトを受け取れるよう改修（後方互換あり）

- [x] `backend/src/repositories/namespaceTermRepository.ts`
  - 既存の `createNamespaceUri(data, t?)` 関数にオプション引数 `scopeKey?: string` を追加
    - `scopeKey` が指定された場合は `scope_key = scopeKey` でINSERT
    - `scopeKey` が省略された場合は従来通り `scope_key = NULL` でINSERT（後方互換を維持）
    - SQL側（`createNamespaceUri.sql`）も `scope_key` を `$5` パラメータ化
  - `existsByScopeKey(organizationId, scopeKey, t?)` 関数を追加

### Phase 3: Service 層改修

- [x] `backend/src/services/organizationGroupService.ts`
  - `createOrganizationGroup()` を `pgp.tx()` でトランザクション化
  - 内部で以下を実行:
    1. 重複チェック（変更なし）
    2. `organizationGroupRepository.create(data, t)` でグループ INSERT
    3. `organizationManagementRepository.findById()` で組織 CD 取得
    4. 祖先チェーンと新グループ CD から URI を組み立て
    5. `findUrisByOrganization()` で既存 URI 取得 → `resolveUriConflict()` で重複解消
    6. `createNamespaceUri({ scopeKey })` で namespace INSERT
  - namespace 登録処理を共通関数 `ensureGroupNamespace(t, params)` に切り出し、export

### Phase 4: backfill スクリプト追加

- [x] `backend/scripts/backfill-organization-group-namespace.ts`
  - 全組織を取得
  - 各組織の全 `organization_group` を `layer` 昇順（親→子の順）で取得
  - 各グループについて `existsByScopeKey()` で namespace の有無を確認
  - 存在しなければ `ensureGroupNamespace()` を呼び出して namespace を登録
  - 実行コマンド: `npx ts-node backend/scripts/backfill-organization-group-namespace.ts`

## 5. 影響範囲

### 変更するファイル
1. `backend/src/repositories/organizationGroupRepository.ts` - `create()` 引数追加、`findAncestorChain()` 追加
2. `backend/src/repositories/namespaceTermRepository.ts` - `createNamespaceUriWithScope()`, `existsByScopeKey()` 追加
3. `backend/src/services/organizationGroupService.ts` - `createOrganizationGroup()` 改修

### 新規作成するファイル
1. `backend/src/sql/queries/organization_groups/findAncestorChain.sql`
2. `backend/src/sql/queries/namespace_terms/existsByScopeKey.sql`
3. `backend/scripts/backfill-organization-group-namespace.ts`

### 修正するファイル（追記）
4. `backend/src/sql/queries/namespace_terms/createNamespaceUri.sql` - `scope_key` をパラメータ化（`NULL` から `$5` に変更）

### 削除するファイル
なし

### 影響を受ける機能
- **チーム作成 API** (`POST /api/v1/organization-groups`): namespace 自動登録が追加される
- **プロジェクトの名前空間宣言取得** (`findDeclarationsByProjectScope`): チームに namespace が登録されることで正しく機能するようになる
- **既存のチーム作成処理**: トランザクション化により、namespace 登録に失敗した場合はグループ作成もロールバックされる

## 6. 技術的詳細

### ライブラリ統一

`organizationGroupRepository` は現在 `pg`（`getPool()`）を使用しているが、
`namespaceTermRepository` は `pg-promise`（`getPgp()`）を使用している。
トランザクションを共有するために、`organizationGroupRepository.create()` を
`pg-promise` のトランザクションオブジェクト（`ITask<unknown>`）を受け取れるよう改修する。

既存のメソッド (`findAll`, `findById`, `existsById` 等) は `pg` のまま変更しない（影響範囲最小化）。

### 祖先チェーン取得 SQL（イメージ）

```sql
-- findAncestorChain.sql
-- parentGroupCd から root まで再帰的に遡り、ルート→直近親の順で CD を返す
WITH RECURSIVE ancestors AS (
  SELECT organization_group_cd, parent_group_cd, 0 AS depth
  FROM organization_group
  WHERE organization_id = $1 AND organization_group_cd = $2
  UNION ALL
  SELECT g.organization_group_cd, g.parent_group_cd, a.depth + 1
  FROM organization_group g
  INNER JOIN ancestors a ON g.organization_group_cd = a.parent_group_cd
    AND g.organization_id = $1
)
SELECT organization_group_cd
FROM ancestors
ORDER BY depth DESC
```

### URI 組み立てロジック（サービス層）

```typescript
// ancestorCds = findAncestorChain() の戻り値（ルート→直近親の順）
// newGroupCd = 新規作成するグループの CD
// organizationCd = 組織 CD

const basePath = `https://${organizationCd}.Alchemia.co.jp`;
const groupPath = [...ancestorCds, newGroupCd].join('/');
const candidateUri = `${basePath}/${groupPath}`;
const uri = resolveUriConflict(candidateUri, existingUris);
```

## 7. アーキテクチャ上の考慮事項

- `organizationGroupRepository.create()` の引数型変更は後方互換あり（オプション引数）
- 既存テスト (`backend/tests/repositories/`) への影響なし（引数追加のみ）
- backfill スクリプトは冪等（既に namespace がある場合はスキップ）なので複数回実行しても安全

## 8. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| pg vs pg-promise のトランザクション互換性 | 高 | 中 | `organizationGroupRepository.create()` を pg-promise 対応に改修する（既存パターン準拠） |
| 祖先チェーン取得の循環参照 | 中 | 低 | `WITH RECURSIVE` に `CYCLE` 検出を追加、または最大深度制限を設ける |
| backfill 実行時の URI 重複 | 低 | 低 | `resolveUriConflict()` で連番サフィックスを付与するため問題なし |

## 9. テスト計画

### 手動テスト
- [ ] チームを新規作成し、`namespace` テーブルに期待通りのレコードが登録されることを確認
- [ ] 子チームを新規作成し、URI に親チームの CD が含まれることを確認
- [ ] backfill スクリプトを実行し、既存チームに namespace が登録されることを確認
- [ ] backfill スクリプトを再実行し、重複登録がないことを確認
- [ ] チーム作成 API でエラーが発生した場合（例: 重複CD）、namespace も登録されないことを確認

## 10. 関連ドキュメント

- [チーム管理タブ organization_group 接続 PLAN.md](../20260731_0831_チーム管理タブorganization_group接続/PLAN.md)
- [名前空間URI自動採番 PLAN.md](../../20260629_1537_名前空間URI自動採番/PLAN.md)
- DDL: `docs/design/db/ddl/namespace.sql`
- DDL: `docs/design/db/ddl/organization_group.sql`

## 11. 承認記録

- **計画書提示日時**: 2026-07-31 13:25
- **承認日時**: 2026-07-31 13:34
- **承認者コメント**: 実装を開始してください

## 12. 実施記録

### 実施日時
開始: 2026-07-31 13:34
完了: 2026-07-31 13:38

### 計画からの変更点
- `createNamespaceUriWithScope()` という新関数を作る案を取りやめ、既存の `createNamespaceUri()` に `scopeKey?: string` オプション引数を追加する形に変更（後方互換を維持しつつコードを簡潔化）

### 発生した問題と解決方法
特になし。TypeScript ビルド（`tsc --noEmit`）は exit:0 で通過。

### 最終的な成果物
- [x] SQL ファイル 3件
  - `backend/src/sql/queries/organization_groups/findAncestorChain.sql`（新規）
  - `backend/src/sql/queries/namespace_terms/existsByScopeKey.sql`（新規）
  - `backend/src/sql/queries/namespace_terms/createNamespaceUri.sql`（修正: `$5` パラメータ化）
- [x] Repository 改修 2件
  - `backend/src/repositories/organizationGroupRepository.ts`（`create()` pg-promise 対応、`findAncestorChain()` 追加）
  - `backend/src/repositories/namespaceTermRepository.ts`（`createNamespaceUri()` `scopeKey` 追加、`existsByScopeKey()` 追加）
- [x] Service 改修 1件
  - `backend/src/services/organizationGroupService.ts`（`createOrganizationGroup()` トランザクション化、`ensureGroupNamespace()` 追加・export）
- [x] backfill スクリプト 1件
  - `backend/scripts/backfill-organization-group-namespace.ts`（冪等・layer 昇順処理）
