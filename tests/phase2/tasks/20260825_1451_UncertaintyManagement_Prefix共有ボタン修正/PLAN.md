# タスク計画書: UncertaintyManagement Prefix共有ボタン修正

## メタデータ
- **作成日時**: 2026-08-25 14:51
- **タスクID**: uncertainty-prefix-share-fix
- **優先度**: 高
- **推定工数**: 3時間

## タスク概要

`UncertaintyManagement.tsx` の Prefix管理タブに表示されている「共有」ボタンを押しても何も起きない。

根本原因: `PrefixManagement` コンポーネントに `showShareButton={true}` は渡されているが、
`onShareSelected` コールバックが渡されていないため、Optional chaining（`?.`）で静かにスルーされている。

修正内容:
1. `UncertaintyManagement.tsx` に `ShareScopeModal` の開閉ステート・選択キー保持ステートを追加し、`onShareSelected` コールバックを実装
2. バックエンドに「選択した Prefix を別スコープへコピーする」APIを新規実装
3. フロントエンドから API を呼び出す `sharePrefixes()` 関数を `namespaceApiService.ts` に追加

## 目的と期待される成果

- [ ] 共有ボタンを押すと `ShareScopeModal` が開く
- [ ] モーダルで共有先スコープを選択して「共有する」を押すと、選択した Prefix が対象スコープにコピーされる（重複は `DO NOTHING` でスキップ）
- [ ] コピー成功時に成功メッセージが表示される

## 実装ステップ

### Phase 1: タスク計画書作成（本ファイル）

- [x] タスク計画書作成

### Phase 2: バックエンド実装

- [ ] `backend/src/sql/queries/namespace_terms/copyPrefixesToScope.sql` 新規作成
- [ ] `backend/src/repositories/namespaceTermRepository.ts` に `copyPrefixesToScope()` 追加
- [ ] `backend/src/services/namespaceService.ts` に `sharePrefixesToScope()` 追加
- [ ] `backend/src/types/api.ts` に `SharePrefixesBody` 型追加
- [ ] `backend/src/controllers/namespaceController.ts` に `sharePrefixes()` ハンドラー追加
- [ ] `backend/src/routes/namespaceRoutes.ts` に `POST /api/v1/namespaces/prefixes/share` 追加

### Phase 3: フロントエンド実装

- [ ] `frontend/src/services/namespaceApiService.ts` に `sharePrefixes()` 追加
- [ ] `frontend/src/components/uncertainty/UncertaintyManagement.tsx` 修正
  - `shareScopeOpen` / `selectedPrefixKeys` ステート追加
  - `handleShareSelected` コールバック追加
  - `shareSourceRole` / `shareScopeNodes` useMemo 追加
  - `handleShareToTarget`（APIコール）追加
  - `ShareScopeModal` import・マウント追加
  - `PrefixManagement` に `onShareSelected` prop を渡す

## 変更ファイル

### 新規作成
1. `backend/src/sql/queries/namespace_terms/copyPrefixesToScope.sql`

### 修正
1. `backend/src/repositories/namespaceTermRepository.ts` - `copyPrefixesToScope()` 追加
2. `backend/src/services/namespaceService.ts` - `sharePrefixesToScope()` 追加
3. `backend/src/types/api.ts` - `SharePrefixesBody` 型追加
4. `backend/src/controllers/namespaceController.ts` - `sharePrefixes()` ハンドラー追加
5. `backend/src/routes/namespaceRoutes.ts` - ルート登録追加
6. `frontend/src/services/namespaceApiService.ts` - `sharePrefixes()` 追加
7. `frontend/src/components/uncertainty/UncertaintyManagement.tsx` - 共有ロジック追加

## 技術的詳細

### コピー SQL の設計

`prefix` テーブルの主キーは `(organization_id, namespace_id, prefix)`。
`namespace_id` は `scope_key` から `namespace` テーブルを経由して引く必要がある。

```sql
-- copyPrefixesToScope.sql
-- 選択した prefix 行を対象スコープへコピーする
-- 同一スコープに既に同じ prefix が存在する場合は DO NOTHING でスキップ
INSERT INTO prefix (organization_id, namespace_id, prefix, description, is_active, create_user_id, create_at, update_at)
SELECT
  $1 AS organization_id,
  (SELECT namespace_id FROM namespace WHERE organization_id = $1 AND scope_key = $2 LIMIT 1) AS namespace_id,
  p.prefix,
  p.description,
  p.is_active,
  $3 AS create_user_id,
  NOW() AS create_at,
  NOW() AS update_at
FROM prefix p
WHERE p.organization_id = $1
  AND p.prefix = ANY($4::varchar[])
ON CONFLICT (organization_id, namespace_id, prefix) DO NOTHING
RETURNING prefix
```

### APIエンドポイント設計

**POST /api/v1/namespaces/prefixes/share**

Request:
```json
{
  "prefixKeys": ["CorpA", "LabA"],
  "targetScopeKey": "rd-analysis"
}
```

Response:
```json
{
  "copiedCount": 2,
  "skippedCount": 0
}
```

### UncertaintyManagement の追加ステート・関数

```tsx
// ステート
const [shareScopeOpen, setShareScopeOpen] = useState(false);
const [selectedPrefixKeys, setSelectedPrefixKeys] = useState<React.Key[]>([]);

// コールバック（PrefixManagement → onShareSelected）
const handleShareSelected = useCallback((keys: React.Key[]) => {
  setSelectedPrefixKeys(keys);
  setShareScopeOpen(true);
}, []);

// shareSourceRole（NamespaceMain.tsx の deriveUserNsRoleFromStorage() を流用）
const shareSourceRole: ShareSourceRole = useMemo(() => {
  // UncertaintyManagement でも同様のロール導出ロジックを実装
  ...
}, []);

// shareScopeNodes（組織ツリーを ScopeNode[] 形式に変換）
const shareScopeNodes: ScopeNode[] = useMemo(() => {
  ...
}, [namespaceTree]);

// 共有実行ハンドラー
const handleShareToTarget = useCallback(async (target: ShareTarget) => {
  await sharePrefixes(selectedPrefixKeys as string[], target.key);
  setShareScopeOpen(false);
  message.success(`${selectedPrefixKeys.length}件のPrefixを「${target.label}」へ共有しました`);
}, [selectedPrefixKeys]);
```

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 対象スコープに namespace が存在しない（INSERT時 namespace_id が NULL） | 高 | 中 | Service層でチェックし、E6001 を返す |
| ShareScopeModal の `termCount` prop のラベル（「件の用語」が誤表示） | 低 | 高 | 今回は既存モーダル流用のままとし、別タスクで「件の項目」等に変更 |

## 承認記録
- **計画書提示日時**: 2026-08-25 14:51
- **承認日時**: （承認時に記入）
