# タスク計画書: 用語共有 API 新規実装

## メタデータ
- **作成日時**: 2026-09-17
- **タスクID**: 用語共有API新規実装
- **優先度**: 高
- **推定工数**: 3時間

---

## 1. タスク概要

`NamespaceMain` の用語共有機能（`handleShareToTarget`）が現在 `POST /api/v1/namespaces/terms`（`createTerm`）を繰り返し呼んでいるが、これはただの新規登録であり用語共有に必要な以下の処理が含まれていない。

**不足している処理：**
1. 共有先グループの `namespace_id` に対象用語レコードをコピー（INSERT）
2. 共有元の用語レコードを削除（DELETE）
3. 共有先グループの `prefix` テーブルに対象 prefix が存在しない場合、先に prefix レコードを作成

これらをトランザクション内でアトミックに処理する専用 API を新規実装する。

---

## 2. DB 構造の整理

```
namespace (organization_id, namespace_id, scope_key, uri)
  └─ prefix (organization_id, namespace_id, prefix, description, is_active)
       └─ namespace_term (organization_id, namespace_id, prefix, localname, ...)
```

- `namespace_id` がスコープ（グループ・ユーザー）を識別するキー
- `scope_key` = `organization_group_cd` または `userId`
- 用語共有 = 共有先 `scope_key` の `namespace_id` に用語をコピー → 共有元を DELETE

---

## 3. 新規 API 仕様

### エンドポイント
```
POST /api/v1/namespaces/terms/share
```

### リクエストボディ
```json
{
  "targetScopeKey": "grp-001",
  "termIds": ["prefix:localName1", "prefix:localName2"]
}
```

> `termIds` は `qname`（`prefix:localName`）形式。フロントエンドの `term.id` を渡す。

### 処理フロー（トランザクション内で各 term を処理）
1. 共有先の `namespace_id` を `scope_key` から取得（存在しない → 404）
2. 共有先に対象 `prefix` が `prefix` テーブルに存在しない場合 → prefix をコピー（`copyPrefixesToScope.sql` と同等）
3. 共有先に同名用語が存在する場合 → スキップ（`skippedCount` 増加）
4. 共有先に用語を INSERT（共有元のデータをそのまま引き継ぎ、`namespace_id` のみ差し替え）
5. INSERT 成功した場合のみ共有元レコードを DELETE

### レスポンス
```json
{ "success": true, "copiedCount": 2, "skippedCount": 0 }
```

---

## 4. 実装ステップ

### Step 1: SQL ファイル新規作成
`backend/src/sql/queries/namespace_terms/shareTermsToScope.sql`
- 共有先への INSERT（`ON CONFLICT DO NOTHING`）+ `RETURNING localname`
- 共有元の DELETE は Repository 側で個別実行

### Step 2: `namespaceTermRepository.ts` にメソッド追加
`shareTermsToScope(organizationId, targetScopeKey, userId, termIdentifiers)` を追加
- pg-promise トランザクション内で各 term を処理
- prefix 存在確認 → 必要に応じて `createPrefixOnly` → INSERT → DELETE

### Step 3: `namespaceService.ts` に関数追加
`shareTermsToScopeService(organizationId, targetScopeKey, userId, termIds)` を追加
- `termIds`（`prefix:localName` 形式）を `{ prefix, localName }` に分解して Repository に渡す

### Step 4: `api.ts` に型追加
```typescript
export interface ShareTermsBody {
  targetScopeKey: string;
  termIds: string[];
}
```

### Step 5: `namespaceController.ts` にハンドラー追加
`shareTerms(req, res, next)` を追加

### Step 6: `namespaceRoutes.ts` にルート追加
```
POST /terms/share  →  authMiddleware, tenantIsolation, shareTerms
```

### Step 7: `namespaceApiService.ts` に関数追加（フロントエンド）
```typescript
export const shareTerms = async (
  termIds: string[],
  targetScopeKey: string
): Promise<{ copiedCount: number; skippedCount: number }>
```

### Step 8: `NamespaceMain.tsx` の `handleShareToTarget` を修正
`createTerm` ループ → `shareTerms` API 1回の呼び出しに置き換え

```typescript
const handleShareToTarget = async (target: ShareTarget) => {
  setShareScopeOpen(false);
  const result = await shareTermsApi(selectedTermIds, target.key);
  message.success(t('namespaceMain.shareSuccess', {
    count: String(result.copiedCount),
    target: target.label,
  }));
  setSelectedTermIds([]);
  fetchTermsForCurrentNsKey(effectiveNsKey);
};
```

---

## 5. 変更ファイル一覧

| # | ファイル | 変更内容 |
|---|---|---|
| 1 | `backend/src/sql/queries/namespace_terms/shareTermsToScope.sql` | 新規作成 |
| 2 | `backend/src/repositories/namespaceTermRepository.ts` | `shareTermsToScope()` 追加 |
| 3 | `backend/src/services/namespaceService.ts` | `shareTermsToScopeService()` 追加 |
| 4 | `backend/src/types/api.ts` | `ShareTermsBody` 型追加 |
| 5 | `backend/src/controllers/namespaceController.ts` | `shareTerms()` ハンドラー追加 |
| 6 | `backend/src/routes/namespaceRoutes.ts` | `POST /terms/share` ルート追加 |
| 7 | `frontend/src/services/namespaceApiService.ts` | `shareTerms()` 関数追加 |
| 8 | `frontend/src/components/namespace/NamespaceMain.tsx` | `handleShareToTarget` 修正 |

---

## 6. リスクと対策

| リスク | 影響度 | 対策 |
|---|---|---|
| `term.id` が `qname`（`prefix:localName`）形式かを確認 | 高 | `NamespaceTermRow.qname` の実装を確認してから実装する |
| `has_directive_term=true` の場合、指示用語（`SupervisorDirective{localName}`）も同時移動が必要か | 中 | 指示用語も同じ prefix:localName パターンで識別できるため、termIds に含めてもらう方針で対応 |
| 共有先に prefix が存在しない場合の prefix の URI をどう設定するか | 中 | 共有元の prefix テーブルの URI をそのまま引き継ぐ（`copyPrefixesToScope.sql` と同じ方式） |
| トランザクション内で INSERT 後に DELETE が失敗した場合 | 低 | pg-promise トランザクションで全体ロールバック |

---

## 7. テスト計画

- [ ] グループAの用語を選択 → 上位グループBへ共有実行 → グループBに用語が追加・グループAから削除されること
- [ ] 共有先グループBに対象 prefix が存在しない場合、prefix も自動コピーされること
- [ ] 共有先に同名用語が既に存在する場合はスキップされてエラーにならないこと
- [ ] 複数選択一括共有が正常動作すること
- [ ] 途中エラー時にトランザクションがロールバックされること（共有元も削除されていないこと）

---

## 8. 承認記録

- **計画書提示日時**: 2026-09-17
- **承認日時**: 2026-09-17
- **承認者コメント**: 実装依頼あり（PLAN.md を指定して実行依頼）

---

## 9. 実施記録

### 実施日時
開始: 2026-09-17
完了: 2026-09-17

### 計画からの変更点
- PLAN の `ShareTermsBody` に `sourceScopeKey` を追加（共有元スコープの特定に必要）
- 共有元スコープ削除のために `removeTermInScope.sql` を新規追加（`removeTerm.sql` は `namespace_id` なしのため）
- 翻訳キー `shareSuccess` は既存の `{copied}` / `{skipped}` パラメータ形式を踏襲

### 最終的な成果物
- [x] `backend/src/sql/queries/namespace_terms/shareTermsToScope.sql` 新規作成
- [x] `backend/src/sql/queries/namespace_terms/removeTermInScope.sql` 新規作成
- [x] `backend/src/repositories/namespaceTermRepository.ts` — `shareTermsToScope()` 追加
- [x] `backend/src/services/namespaceService.ts` — `shareTermsToScopeService()` 追加
- [x] `backend/src/types/api.ts` — `ShareTermsBody` 型追加
- [x] `backend/src/controllers/namespaceController.ts` — `shareTerms()` ハンドラー追加
- [x] `backend/src/middleware/namespaceValidation.ts` — `validateShareTerms` 追加
- [x] `backend/src/routes/namespaceRoutes.ts` — `POST /terms/share` ルート追加
- [x] `frontend/src/services/namespaceApiService.ts` — `shareTerms()` 関数追加
- [x] `frontend/src/components/namespace/NamespaceMain.tsx` — `handleShareToTarget` 修正
- [x] TypeScript コンパイルエラー 0 件（バックエンド・フロントエンド両方）

