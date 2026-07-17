# 調査レポート: TemplateEditorDialog — attribute選択肢が表示されない

## メタデータ

- **作成日時**: 2026-07-14 11:34
- **タスクID**: TemplateEditorDialog_attribute選択肢不表示調査
- **関連タスク**: `docs/20260710_1142_department廃止_organization_group移行/`（PLAN_01〜06）

---

## 1. 問題の概要

Maiml編集画面（`TemplateEditorDialog.tsx`）でプロパティ追加後に属性名を選択した際、
attributeテーブル由来の選択肢（属性値ドロップダウン）が表示されない。

---

## 2. 調査スコープ

調査対象のコードフロー：

```
TemplateEditorDialog.tsx
  └─ useAttributeMasters (hooks/useAttributeMasters.ts)
      └─ fetchAttributeMasters(true) (services/masterApiService.ts)
          └─ GET /api/v1/master/attributes?apply_department_filter=true
              └─ masterController.getAttributes
                  └─ masterService.getAttributeMastersWithFilters
                      └─ attributeRepository.findAllWithFilters
```

`NestedPropertyEditor.tsx` は親から `attributeRecords` を受け取り、
選択した属性名に対応するレコードを `masterAttributeValues` として表示する。

---

## 3. 特定した問題点

### 🔴 問題1（バグ）: `masterController.ts` のフィルタキー名誤設定

**ファイル**: `backend/src/controllers/masterController.ts`  
**行**: 1093〜1095

```typescript
// 現在（バグあり）
if (apply_department_filter === 'true') {
  const organizationGroupCd = req.user?.organizationGroupCds?.[0];
  if (organizationGroupCd) {
    filters.departmentCd = organizationGroupCd;   // ❌ 誤ったキー名
  }
}
```

**正しい実装**:
```typescript
if (apply_department_filter === 'true') {
  const organizationGroupCd = req.user?.organizationGroupCds?.[0];
  if (organizationGroupCd) {
    filters.organizationGroupCd = organizationGroupCd;  // ✅ 正しいキー名
  }
}
```

**影響**: `attributeRepository.findAllWithFilters` が受け取るフィルタ型は
`{ search?; isActive?; organizationGroupCd?: string }` で、
`departmentCd` というキーは型に存在しない。  
TypeScriptでは暗黙にundefined扱いになるため、フィルタ条件が一切適用されない。

**期待される動作への影響**:  
- フィルタ不適用の場合、全件返却（＝選択肢が増える方向）  
- ただし「選択肢が0件になる」の直接原因ではない場合も考えられる  
  → 実データの状況によって実際の影響が異なる（後述）

**PLAN_03 Phase5に記載があったが実装漏れ**:
```
backend/src/controllers/masterController.ts
- [ ] filters.departmentCd → filters.organizationGroupCd に変更
```

---

### 🟡 問題2（型不整合）: `AttributeRecord` 型定義が旧フィールド名のまま

**ファイル**: `frontend/src/types/masterDataTypes.ts`  
**行**: 91〜96

```typescript
export interface AttributeRecord extends BaseMasterRecord {
  attributeName: string;
  attributeValue: string;
  attributeRemark: string;
  departmentCd: string;       // ❌ 旧フィールド名（バックエンドは organizationGroupCd を返す）
  isActive: boolean;
}
```

**バックエンドが返すレスポンスキー**（`masterController.ts` 1279行）:
```typescript
'organization_group_cd': a.organizationGroupCd,
```

**影響**: `AttributeRecord.departmentCd` は常に `undefined` になる。  
属性名・属性値の表示ロジック自体（`NestedPropertyEditor` の `masterAttributeValues`）は
`attributeName`・`attributeValue` しか使っていないため、**選択肢の表示には直接影響しない**。  
ただし将来グループフィルタ条件と照合する箇所が実装された場合に問題になる。

**PLAN_04 Phase1に記載があったが未実施**:
```
frontend/src/types/masterDataTypes.ts
- [ ] departmentCd: string → organizationGroupCd: string に変更
- [ ] departmentName: string → organizationGroupName: string に変更
```

---

### 🟡 問題3（クエリパラメータ名）: フロントエンドが旧パラメータ名で送信

**ファイル**: `frontend/src/services/masterApiService.ts`  
**行**: 310

```typescript
params.apply_department_filter = 'true';   // 旧名称
```

バックエンド `masterController.ts` 1085行も同名で受け取っている:
```typescript
const { search, is_active, apply_department_filter } = req.query;
```

**現時点では両者が一致しているため動作上の問題はない。**  
ただしPLAN_04 Phase10で「`apply_department_filter` → `apply_organization_group_filter` に変更」が
予定されており、バックエンドが先に変更された場合にフロント側も追随する必要がある。

---

## 4. 「選択肢が0件になる」の根本原因の仮説

### 仮説A（最有力）: `organizationGroupCds` が空配列

ログインユーザーの `organization_group_user` にレコードが存在しない場合、
`req.user?.organizationGroupCds` が `[]`（空配列）になる。

```typescript
const organizationGroupCd = req.user?.organizationGroupCds?.[0];
// ↑ organizationGroupCds = [] の場合、[0] は undefined
if (organizationGroupCd) {   // ← undefined なのでfalse → フィルタ条件なし
```

この場合、`apply_department_filter=true` でも条件が何も追加されず**全件返却**となる。  
→ 選択肢は表示されるはずなので0件の原因にはならない。

**ただし**、前段のAPIコール自体がエラーになった場合は以下の通り：

```typescript
// useAttributeMasters.ts
} catch (err) {
  setError(message);
  setAttributeRecords([]);   // ← エラー時は空配列
}
```

**SQLエラー・認証エラー等でAPIが500を返した場合、attributeRecordsが空になり選択肢も0件になる。**

---

### 仮説B: マイグレーション未適用

`20260710_add_organization_group.sql` が開発環境DBに未適用の場合、
`attribute.organization_group_cd` カラムが存在せず、
`findAllWithFilters.sql` の `a.organization_group_cd` 参照でSQLエラーが発生する。

現在DBコンテナ（`mmdpf-postgres`）が停止中のため、適用状況は未確認。

---

## 5. 確認が必要な項目

| 確認内容 | 確認方法 | 状態 |
|--------|--------|------|
| `attribute` テーブルに `organization_group_cd` カラムが存在するか | DBコンテナ起動後 `\d attribute` | ❓ 未確認 |
| `attribute` テーブルにレコードが存在するか | `SELECT count(*) FROM attribute;` | ❓ 未確認 |
| ログインユーザーが `organization_group_user` に紐づいているか | `SELECT * FROM organization_group_user LIMIT 10;` | ❓ 未確認 |
| ブラウザのネットワークタブでAPIレスポンスを確認 | DevTools → Network → `/api/v1/master/attributes` | ❓ 未確認 |

---

## 6. 修正内容（検討案）

### 修正1（必須）: `masterController.ts` のフィルタキー修正

```typescript
// backend/src/controllers/masterController.ts  行1095
// Before:
filters.departmentCd = organizationGroupCd;
// After:
filters.organizationGroupCd = organizationGroupCd;
```

### 修正2（推奨）: `AttributeRecord` 型定義の更新

```typescript
// frontend/src/types/masterDataTypes.ts  行95
// Before:
departmentCd: string;
// After:
organizationGroupCd: string;
```

---

## 7. 影響範囲

| ファイル | 種類 | 対応優先度 |
|--------|------|-----------|
| `backend/src/controllers/masterController.ts` | 🔴 バグ（フィルタキー誤設定） | 高（即時修正推奨） |
| `frontend/src/types/masterDataTypes.ts` | 🟡 型不整合（`departmentCd`残存） | 中 |
| `frontend/src/services/masterApiService.ts` | 🟡 旧パラメータ名（動作には現時点で問題なし） | 低（PLAN_04 Phase10対応時） |

---

## 8. 関連ファイル

| ファイル | 説明 |
|--------|------|
| `docs/20260710_1142_department廃止_organization_group移行/PLAN_03_Backend_他機能参照置換.md` | Phase5で本バグの修正が予定されていた |
| `docs/20260710_1142_department廃止_organization_group移行/PLAN_04_Frontend移行.md` | Phase1で `AttributeRecord` 型修正が予定 |
| `backend/src/controllers/masterController.ts` | バグ箇所（修正済み） |
| `backend/src/repositories/attributeRepository.ts` | `organizationGroupCds` フィルタ適用ロジック（修正済み） |
| `frontend/src/types/masterDataTypes.ts` | `AttributeRecord` 型定義 |
| `frontend/src/hooks/useAttributeMasters.ts` | `fetchAttributeMasters(true)` 呼び出し（修正済み） |
| `frontend/src/components/editorv2/NestedPropertyEditor.tsx` | `masterAttributeValues` 表示ロジック |

---

## 9. 追加調査で判明した根本原因（2026-07-14 修正実施）

### 🔴 真の根本原因: SQLコメントによる `String.replace()` 誤爆

調査を継続した結果、「選択肢が0件になる」の**最大の原因**はフィルタキー不整合ではなく、
**`findAllWithFilters.sql` の2行目コメントに含まれるキーワードが `String.replace()` に誤爆する構文エラー**であった。

**ファイル**: `backend/src/sql/queries/attributes/findAllWithFilters.sql`

```sql
-- Attributeマスタ フィルタ付き一覧取得
-- WHERE 1=1 および ORDER BY はリポジトリ側で動的に置換される  ← ここが誤爆
SELECT
  ...
WHERE 1=1        ← 本来マッチすべき箇所
ORDER BY ...     ← 本来マッチすべき箇所
```

`attributeRepository.ts` の `findAllWithFilters` が `is_active` フィルタを適用する際、
`.replace('ORDER BY', ...)` を実行すると、コメント行の `ORDER BY はリポジトリ側...` に先にマッチして
コメントが改行分断され、生SQL `ORDER BY はリポジトリ側で動的に置換される` がSQLとして解釈される。

**発生していたエラー**:
```
Get attributes error: error: syntax error at or near "ORDER"
  code: '42601'
```

`fetchAttributeMasters` はエラー時に空配列を返すため、ユーザーには「選択肢が空」として表示されていた。

---

## 10. 修正内容（2026-07-14 実施済み）

### 修正A（根本原因）: SQLコメント文言修正

**ファイル**: `backend/src/sql/queries/attributes/findAllWithFilters.sql`

```sql
-- Before（誤爆の原因）
-- WHERE 1=1 および ORDER BY はリポジトリ側で動的に置換される

-- After
-- ※フィルタ条件はリポジトリ側（attributeRepository.ts）で動的に追加されます
```

### 修正B: organizationGroupCds 配列対応（複数グループ対応）

**ファイル**: `backend/src/repositories/attributeRepository.ts`

- `organizationGroupCd?: string` → `organizationGroupCds?: string[]`
- SQLフィルタを `= $n` から `= ANY($n)` の配列比較に変更

### 修正C: Service層の型定義変更

**ファイル**: `backend/src/services/masterService.ts`

- `getAttributeMastersWithFilters` の filters 引数: `organizationGroupCd?: string` → `organizationGroupCds?: string[]`

### 修正D（フィルタキー誤設定 + クエリパラメータ名変更）

**ファイル**: `backend/src/controllers/masterController.ts`

```typescript
// Before（バグあり・旧パラメータ名）
const { search, is_active, apply_department_filter } = req.query;
if (apply_department_filter === 'true') {
  const organizationGroupCd = req.user?.organizationGroupCds?.[0];
  if (organizationGroupCd) {
    filters.departmentCd = organizationGroupCd;  // ❌ 誤ったキー名・1件のみ
  }
}

// After（修正済み）
const { search, is_active, apply_organization_group_filter } = req.query;
if (apply_organization_group_filter === 'true') {
  const organizationGroupCds = req.user?.organizationGroupCds;
  if (organizationGroupCds && organizationGroupCds.length > 0) {
    filters.organizationGroupCds = organizationGroupCds;  // ✅ 配列全体を渡す
  }
}
```

### 修正E: フロントエンドのクエリパラメータ名追随

**ファイル**: `frontend/src/services/masterApiService.ts`

```typescript
// Before
export async function fetchAttributeMasters(applyDepartmentFilter?: boolean)
params.apply_department_filter = 'true';

// After
export async function fetchAttributeMasters(applyOrganizationGroupFilter?: boolean)
params.apply_organization_group_filter = 'true';
```

### 修正F: コメント文言修正

**ファイル**: `frontend/src/hooks/useAttributeMasters.ts`

```typescript
// Before
// apply_department_filter=true でログインユーザーの部署 or 部署指定なしのデータのみ取得

// After
// apply_organization_group_filter=true でログインユーザーの組織階層グループ or グループ指定なしのデータのみ取得
```

---

## 11. 修正後の動作フロー

```
TemplateEditorDialog.tsx
  └─ useAttributeMasters (hooks/useAttributeMasters.ts)
      └─ fetchAttributeMasters(true) (services/masterApiService.ts)
          └─ GET /api/v1/master/attributes?apply_organization_group_filter=true  ← 変更
              └─ masterController.getAttributes
                  └─ filters.organizationGroupCds = req.user.organizationGroupCds  ← 修正
                      └─ masterService.getAttributeMastersWithFilters
                          └─ attributeRepository.findAllWithFilters
                              └─ AND (org_group_cd = ANY($n) OR ... IS NULL)  ← 修正
```
