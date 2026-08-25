# タスク計画書: TemplateEditorDialog attribute選択肢不表示バグ修正

## メタデータ
- **作成日時**: 2026-07-14 14:20
- **タスクID**: 20260714_1134_TemplateEditorDialog_attribute選択肢不表示調査
- **優先度**: 高
- **推定工数**: 1.5時間

## 1. タスク概要

Maiml編集画面からTemplateEditorDialogを開き、プロパティ追加後に属性を選択した際に attributeテーブルの選択肢が表示されない問題の調査・修正。

部署→組織階層グループへの移行（migration: `20260710_add_organization_group.sql`）に伴い、関連コードが未追従となっていたことが原因。

## 2. 調査で判明した不具合

### 不具合A: SQLコメント誤爆による500エラー（最重要）

**ファイル**: `backend/src/sql/queries/attributes/findAllWithFilters.sql`

**原因**:
SQLファイルの2行目のコメントに `WHERE 1=1` と `ORDER BY` という文字列がそのまま含まれており、`attributeRepository.ts` の `String.replace()` が実際のクエリ本体より先にコメント行にマッチしてしまう。

```sql
-- Attributeマスタ フィルタ付き一覧取得
-- WHERE 1=1 および ORDER BY はリポジトリ側で動的に置換される  ← ここにマッチしてしまう
SELECT ...
WHERE 1=1      ← 本来マッチすべき箇所
ORDER BY ...   ← 本来マッチすべき箇所
```

`is_active`フィルタが付与されると2回目の `.replace('ORDER BY', ...)` で1行コメントが改行分断され、コメント外に生SQLとして
```
ORDER BY はリポジトリ側で動的に置換される
```
が出力されてPostgreSQLの `syntax error at or near "ORDER"` (code: 42601) が発生する。

**エラーログ**（確認済み）:
```
Get attributes error: error: syntax error at or near "ORDER"
  code: '42601'
```

### 不具合B: 組織グループ絞り込みが機能しない（フィルタキー不整合）

**ファイル**: `backend/src/controllers/masterController.ts`

**原因**:
`getAttributes`関数内でフィルタキーに誤った名前（`departmentCd`）を使っているため、`attributeRepository` 側の `filters.organizationGroupCd` が常に `undefined` となる。

```typescript
// 現在（バグあり）
filters.departmentCd = organizationGroupCd;  // ← 誤ったキー名

// 正しくは
filters.organizationGroupCd = organizationGroupCd;
```

### 不具合C: 複数グループ所属ユーザーへの非対応

**ファイル**: `backend/src/controllers/masterController.ts`

**原因**:
`req.user?.organizationGroupCds?.[0]` のように先頭1件のみを参照しており、複数グループに所属しているユーザーが全グループの属性を取得できない。

### 不具合D: クエリパラメータ名が実情と不一致（命名不整合）

`apply_department_filter`というパラメータ名は、部署概念が廃止されて組織階層グループに移行した現在、実態と合っていない。
- フロントエンド: `frontend/src/services/masterApiService.ts`
- バックエンド: `backend/src/controllers/masterController.ts`

## 3. 目的と期待される成果

### 目的
- attribute選択肢が表示されない問題を解消し、TemplateEditorDialogが正常に動作するようにする

### 期待される成果
- [ ] `GET /api/v1/master/attribute?apply_organization_group_filter=true` が正常に200を返す
- [ ] 自分が所属する組織グループ、またはグループ未指定のAttributeマスタが返る
- [ ] 複数グループ所属ユーザーで全所属グループの属性が返る
- [ ] マスタ管理画面（フィルタなし）で全件取得が継続して動作する
- [ ] TemplateEditorDialogの属性選択プルダウンに選択肢が表示される

## 4. 実装ステップ

### Phase 1: バックエンド修正

- [ ] **1-1. SQLファイル修正** `backend/src/sql/queries/attributes/findAllWithFilters.sql`
  - 2行目コメントから`WHERE 1=1`・`ORDER BY`という文字列を除去
  - 修正後コメント: `-- ※フィルタ条件はリポジトリ側（attributeRepository.ts）で動的に追加されます`

- [ ] **1-2. Repository修正** `backend/src/repositories/attributeRepository.ts`
  - `findAllWithFilters`のfilters型: `organizationGroupCd?: string` → `organizationGroupCds?: string[]`
  - SQL条件を`= ANY($n)`の配列比較に変更（複数グループ対応）

- [ ] **1-3. Service修正** `backend/src/services/masterService.ts`
  - `getAttributeMastersWithFilters`のfilters型: `organizationGroupCd?: string` → `organizationGroupCds?: string[]`

- [ ] **1-4. Controller修正** `backend/src/controllers/masterController.ts`
  - クエリパラメータ名: `apply_department_filter` → `apply_organization_group_filter`
  - 誤代入バグを修正: `filters.departmentCd` → `filters.organizationGroupCds`
  - 複数グループ対応: `organizationGroupCds?.[0]` → `organizationGroupCds`（配列全体）

### Phase 2: フロントエンド修正

- [ ] **2-1. API Service修正** `frontend/src/services/masterApiService.ts`
  - `fetchAttributeMasters`関数の引数名: `applyDepartmentFilter` → `applyOrganizationGroupFilter`
  - クエリパラメータ名: `apply_department_filter` → `apply_organization_group_filter`

- [ ] **2-2. Hook修正** `frontend/src/hooks/useAttributeMasters.ts`
  - コメント文言を「部署」→「組織階層グループ」に修正

### Phase 3: 動作確認

- [ ] 500エラーが解消されることを確認（`apply_organization_group_filter=true`付きAPIコール）
- [ ] 複数グループ所属ユーザーでの取得確認
- [ ] マスタ管理画面での全件取得確認（非破壊確認）
- [ ] TemplateEditorDialogの属性選択肢が表示されることを確認

### Phase 4: ドキュメント更新

- [ ] `REPORT.md`に最終原因・修正内容を追記

## 5. 変更ファイル一覧

| ファイル | 変更種別 | 変更内容 |
|---------|---------|---------|
| `backend/src/sql/queries/attributes/findAllWithFilters.sql` | 修正 | コメント文言修正（replace誤爆防止） |
| `backend/src/repositories/attributeRepository.ts` | 修正 | organizationGroupCds配列対応・ANY比較 |
| `backend/src/services/masterService.ts` | 修正 | 型定義変更（配列対応） |
| `backend/src/controllers/masterController.ts` | 修正 | パラメータ名変更・誤代入バグ修正・複数グループ対応 |
| `frontend/src/services/masterApiService.ts` | 修正 | パラメータ名変更 |
| `frontend/src/hooks/useAttributeMasters.ts` | 修正 | コメント文言修正 |
| `docs/tasks/20260714_1134_.../REPORT.md` | 追記 | 最終原因・修正内容 |

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| クエリパラメータ名変更でフロント/バックの呼び出し不一致 | 高 | 低 | フロントとバックを同一PRで同時修正する |
| pg-promiseでの配列型パラメータの渡し方（ANY構文） | 中 | 低 | pg-promiseはPostgreSQLの配列型をネイティブサポートするため問題なし |
| マスタ管理画面（フィルタなし呼び出し）の動作破壊 | 中 | 低 | `filters.organizationGroupCds`が`undefined`の場合はフィルタなし（既存動作維持）  |

## 7. 承認記録

- **計画書提示日時**: 2026-07-14 14:20
- **承認日時**: （承認時に記入）
- **承認者コメント**: （ユーザーからのフィードバック）
