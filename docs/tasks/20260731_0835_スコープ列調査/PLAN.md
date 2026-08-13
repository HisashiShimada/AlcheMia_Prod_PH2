# タスク計画書: 用語管理タブ スコープ列 調査・修正計画

## メタデータ
- **作成日時**: 2026-07-31 08:35
- **タスクID**: スコープ列調査・修正
- **優先度**: 高
- **推定工数**: 1時間

---

## 調査内容

1. スコープの値は入力しない設計のため、DBに格納する値はどこから取得しているか
2. どのテーブルに格納しようとしているか
3. 保存ボタン押下後、スコープ列に表示する値はどこから取得しているか

---

## ① DBに格納するスコープ値の取得元

**スコープ値はユーザーが直接入力するのではなく、左ツリーで選択中のノードのキーが自動的に使われる。**

### データフロー

```
NamespaceMain.tsx
  └─ effectiveNsKey（左ツリーで選択中のノードキー）
        └─ PrefixManagement コンポーネントへ props として渡す
              ↓
        PrefixManagement.tsx（L123-129）
              ↓
        createNamespace({ scopeKey: scopeKey ?? undefined })
              ↓
        POST /api/v1/namespaces  ← req.body.scopeKey
              ↓
        namespaceController.createNamespace()
              ↓
        namespaceService.createNamespace({ scopeKey })
              ↓
        namespaceTermRepository.createNamespace({ scopeKey })
              ↓
        createNamespace.sql  ← $4 = scopeKey
```

### PrefixManagement.tsx の該当コード（L123-129）

```typescript
const created = await createNamespace({
  prefix: row.prefix,
  uri: row.uri,
  description: row.description || undefined,
  isGlobal: globalOnly,
  scopeKey: scopeKey ?? undefined,   // ← props から受け取った scopeKey を送信
});
```

### scopeKey の値

| 選択ノード | scopeKey の値 |
|------------|--------------|
| 組織ノード（チーム/部署） | `organization_group_cd`（例: `rd`, `analysis`） |
| Personal ノード（個人） | ユーザーID（UUID） |
| 選択なし | `undefined`（NULL として格納） |

---

## ② 格納先テーブル

**`namespace` テーブルの `scope_key` カラムに格納する。**

### createNamespace.sql

```sql
INSERT INTO namespace (
  organization_id
  , namespace_id
  , uri
  , global_flg
  , scope_key           -- ← $4 = scopeKey（organization_group_cd またはユーザーID）
  , create_user_id
  , create_at
  , update_user_id
  , update_at
) VALUES (
  $1, $2, $3, FALSE, $4, $5, CURRENT_TIMESTAMP, $5, CURRENT_TIMESTAMP
)
ON CONFLICT (organization_id, namespace_id) DO NOTHING
```

### namespace テーブルの scope_key カラム

| カラム | 型 | 用途 |
|--------|----|------|
| `scope_key` | VARCHAR(100) | 所有者を示すキー。`organization_group_cd` またはユーザーID |

---

## ③ 保存後のスコープ列表示値の取得元

**`GET /api/v1/namespaces` → `findNamespacesByOrganization.sql` で `organization_group.organization_group_name` を JOIN して取得する。**

### findNamespacesByOrganization.sql（抜粋）

```sql
SELECT
  p.prefix
  , n.uri
  , n.scope_key                                    AS "scopeKey"
  , COALESCE(og.organization_group_name, '')       AS "scopeName"
FROM prefix p
JOIN namespace n ON ...
LEFT JOIN organization_group og
  ON og.organization_group_cd = n.scope_key        -- scope_key で JOIN してグループ名を取得
```

### フロントエンド側での処理

```
GET /api/v1/namespaces
  ↓
PrefixManagement.tsx
  ↓
fetchNamespaces() で rows を更新
  ↓
NamespaceMain.tsx
  ↓
prefixScopeMap.set(n.prefix, n.scopeName)   -- prefix → scopeName のマップ作成
  ↓
スコープ列の render: prefixScopeMap.get(record.prefix)  -- 表示
```

---

## 現状の問題点

`namespace.scope_key` が **NULL** のまま（または `organization_group_cd` に合致しない値）の場合：

1. `LEFT JOIN organization_group og ON og.organization_group_cd = n.scope_key` が成立しない
2. `scopeName` = `''`（空文字）
3. `prefixScopeMap` に有効な値が入らない
4. **スコープ列が空のまま表示される**

### 根本原因

`findNamespacesByOrganization.sql` の LEFT JOIN が `organization_group` テーブルのみを対象としており、
`scope_key` にユーザーID（UUID）が入っている場合に JOIN が成立せず `scopeName = ''` になっていた。

### NULL になる原因の候補

- `namespaceTermRepository.createNamespace()` で `$4`（scopeKey）に `undefined` が渡されている
- ツリーのノード選択状態が `PrefixManagement` に正しく props 伝達されていない
- `organization_group_cd` ではなく他の値（UUID等）が `scope_key` に入っている

---

## 目的と期待される成果

- [ ] `scope_key` が `organization_group_cd` の場合 → グループ名が表示される
- [ ] `scope_key` がユーザーID（UUID）の場合 → ユーザー名が表示される
- [ ] `scope_key` が NULL の場合 → 空文字（仕様通り）

---

## 実装ステップ

- [ ] `findNamespacesByOrganization.sql` に `organization_user` LEFT JOIN を追加
- [ ] `NamespaceMain.tsx` の `PrefixManagement` への `scopeKey` 渡しを確認・修正

---

## 変更ファイル

1. `backend/src/sql/queries/namespace_terms/findNamespacesByOrganization.sql` - `organization_user` LEFT JOIN 追加
2. `frontend/src/components/namespace/NamespaceMain.tsx` - `PrefixManagement` props 確認・修正（必要な場合）

---

## 残課題

| # | 内容 | 優先度 |
|---|------|--------|
| 1 | `namespaceTermRepository.createNamespace()` の実装で `$4` に `scopeKey` が正しくバインドされているか確認 | 高 |
| 2 | Personal ノード選択時（scopeKey = userId）のスコープ列表示方法を決定（ユーザー名を表示するか、`organization_group` 以外のJOINが必要） | 中 |
| 3 | 既存の `namespace` レコードで `scope_key = NULL` のデータに対する対応方針を決定 | 低 |

---

## 関連ファイル

| ファイル | 役割 |
|---------|------|
| `frontend/src/components/namespace/PrefixManagement.tsx` | createNamespace への scopeKey 受け渡し |
| `frontend/src/services/namespaceApiService.ts` | POST /api/v1/namespaces の呼び出し |
| `backend/src/controllers/namespaceController.ts` | req.body.scopeKey を Service へ渡す |
| `backend/src/services/namespaceService.ts` | createNamespace ビジネスロジック |
| `backend/src/repositories/namespaceTermRepository.ts` | DB INSERT 実行 |
| `backend/src/sql/queries/namespace_terms/createNamespace.sql` | namespace テーブルへの INSERT SQL |
| `backend/src/sql/queries/namespace_terms/findNamespacesByOrganization.sql` | 保存後の一覧取得・scopeName の JOIN |
| `docs/design/db/ddl/namespace.sql` | namespace テーブルの DDL |

---

## 承認記録

- **承認日時**: 2026-07-31 09:28
