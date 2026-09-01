# タスク計画書: NamespaceMain 単語追加の不具合修正

## メタデータ
- **作成日時**: 2026-08-25 14:00
- **タスクID**: 20260825_1400
- **優先度**: 高
- **推定工数**: 3〜4時間

---

## 1. タスク概要

`NamespaceMain` からの単語追加（指示用語同時登録機能含む）に以下の4つの不具合が発見された。本タスクでこれらをすべて修正する。

| # | 不具合 | 重要度 |
|---|--------|--------|
| ① | 指示用語チェックボックスのデフォルトがチェックなし | 中 |
| ② | 指示用語の登録値がベースになった単語に合っていない | 高 |
| ③ | 指示用語（SupervisorDirective...）が登録後に一覧に表示されない | 中 |
| ④ | NamespaceIDが左ツリーで選択中のスコープではなく誤った namespace_id に紐付く | 高 |

---

## 2. 各不具合の根本原因

### 不具合①: チェックボックスのデフォルトがチェックなし

**場所**: `frontend/src/components/namespace/NamespaceMain.tsx` 行 568〜572

`makeEmptyRow()` 関数内で `createDirectiveTerm` プロパティが未設定（`undefined` = `false` 扱い）のため、新規行追加時にチェックボックスが常にオフになる。

---

### 不具合②: 指示用語の登録値がベース用語に合っていない

**場所**: `backend/src/services/namespaceService.ts` 行 407〜413

トランザクション内で指示用語（`SupervisorDirective{localName}`）を INSERT する際、元の用語の `displayName`・`description`・`typeHint`・`unitHint` が渡されていない。

---

### 不具合③: 指示用語が一覧に表示されない

**場所**: `frontend/src/components/namespace/NamespaceMain.tsx` 行 1038〜1048

保存成功後に `setTerms((prev) => [...added, ...prev])` で状態更新しているが、`added` には `createTerm` API が返す元の用語1件しか含まれない。バックエンドのトランザクション内で登録された指示用語はAPIレスポンスに含まれないため、一覧に反映されない。

---

### 不具合④: NamespaceIDが左ツリーのスコープと異なる

**DB 構造上の問題**:
- `namespace` テーブル: PK = `(organization_id, namespace_id)`、UNIQUE = `(organization_id, scope_key)`
- `prefix` テーブル: PK = `(organization_id, namespace_id, prefix)`

同一 `(organization_id, prefix)` に対して `namespace_id` が異なる複数レコードが存在できる。（例：`prefix = "MyCompany"` が `ns-001`（部署A）と `ns-002`（部署B）の両方に登録されている場合）

**問題のSQL** `findPrefixNamespaceId.sql`:
```sql
SELECT namespace_id FROM prefix
WHERE organization_id = $1 AND prefix = $2
LIMIT 1  -- scope_key で絞り込まれていないため最初の1件が返る
```

左ツリーで選択したノードのスコープキー（`effectiveNsKey`）を考慮せずに namespace_id を引くため、意図しない namespace に用語が登録される。

**修正方針**:
- `createTerm` API に `scopeKey` を追加
- バックエンドで namespace テーブルの `scope_key` を通じて正しい `namespace_id` を特定する
- 新 SQL ファイル `findNamespaceIdByScopeKeyAndPrefix.sql` を追加
- `scopeKey` が省略された場合は従来の `findPrefixNamespaceId.sql` にフォールバック（後方互換）

---

## 3. 実装ステップ

- [ ] タスク計画書作成（本ファイル）
- [ ] Phase 1: フロントエンド - makeEmptyRow のデフォルト修正（①）
- [ ] Phase 2: バックエンド - 指示用語の登録値引き継ぎ（②）
- [ ] Phase 3: フロントエンド - 保存後に fetchTerms 再取得（③）
- [ ] Phase 4: バックエンド - 新 SQL ファイル追加（④）
- [ ] Phase 5: バックエンド - Repository 層修正（④）
- [ ] Phase 6: バックエンド - Service 層修正（④）
- [ ] Phase 7: バックエンド - Controller 層修正（④）
- [ ] Phase 8: バックエンド - API 型定義修正（④）
- [ ] Phase 9: フロントエンド - API Service 修正（④）
- [ ] Phase 10: フロントエンド - NamespaceMain.tsx の createTerm 呼び出し修正（④）
- [ ] 動作確認・検証

---

## 4. 変更ファイル一覧

| # | ファイル | 変更種別 | 対応不具合 |
|---|---------|---------|-----------|
| 1 | `frontend/src/components/namespace/NamespaceMain.tsx` | 修正 | ①③④ |
| 2 | `frontend/src/services/namespaceApiService.ts` | 修正 | ④ |
| 3 | `backend/src/types/api.ts` | 修正 | ④ |
| 4 | `backend/src/services/namespaceService.ts` | 修正 | ②④ |
| 5 | `backend/src/repositories/namespaceTermRepository.ts` | 修正 | ④ |
| 6 | `backend/src/sql/queries/namespace_terms/findNamespaceIdByScopeKeyAndPrefix.sql` | **新規** | ④ |

---

## 5. 詳細な変更内容

### Phase 1: `NamespaceMain.tsx` — makeEmptyRow のデフォルト修正（①）

```ts
// 修正後
const makeEmptyRow = (): NewTermRow => ({
  _rowId: `__new__${Date.now()}_${Math.random()}`,
  prefix: '',
  localName: '', displayName: '',
  description: '', type: '', unitHint: '',
  createDirectiveTerm: true,  // ← デフォルトをチェックあり（true）に変更
});
```

---

### Phase 2: `namespaceService.ts` — 指示用語の登録値引き継ぎ（②）

```ts
// 修正後
await namespaceTermRepository.createInTx(t, {
  organizationId: input.organizationId,
  prefix: input.prefix,
  localName: directiveLocalName,
  displayName: input.displayName,    // ← 追加
  description: input.description,    // ← 追加
  typeHint: input.typeHint,          // ← 追加
  unitHint: input.unitHint,          // ← 追加
  hasDirectiveTerm: false,
});
```

---

### Phase 3: `NamespaceMain.tsx` — 保存後に fetchTerms 再取得（③）

保存成功後の `setTerms((prev) => [...added, ...prev])` を廃止し、`fetchTerms()` で最新データを再取得する。
`effectiveNsKey` に基づいて適切なオプションで再フェッチし、指示用語も一覧に反映させる。

---

### Phase 4: 新 SQL ファイル追加（④）

**新規**: `backend/src/sql/queries/namespace_terms/findNamespaceIdByScopeKeyAndPrefix.sql`

```sql
-- scope_key と prefix の両方に対応する namespace_id を取得
-- $1: organization_id
-- $2: scope_key（organization_group_cd または user_id）
-- $3: prefix
SELECT p.namespace_id
FROM prefix p
JOIN namespace n
  ON n.organization_id = p.organization_id
  AND n.namespace_id = p.namespace_id
WHERE p.organization_id = $1
  AND n.scope_key = $2
  AND p.prefix = $3
LIMIT 1
```

---

### Phase 5: `namespaceTermRepository.ts` — Repository 層修正（④）

`create()` と `createInTx()` の引数に `scopeKey?: string` を追加。
namespace_id 取得ロジックを以下のように変更:
- `scopeKey` が指定されている場合 → `findNamespaceIdByScopeKeyAndPrefix.sql` を使用
- `scopeKey` が省略されている場合 → 従来の `findPrefixNamespaceId.sql` を使用（後方互換）

---

### Phase 6: `namespaceService.ts` — Service 層修正（④）

`CreateTermInput` に `scopeKey?: string` を追加。
`createTerm()` で `scopeKey` を `create()` / `createInTx()` に伝播させる。

---

### Phase 7: `namespaceController.ts` — Controller 層修正（④）

`createTerm()` で `req.body.scopeKey` を受け取り、`CreateTermInput.scopeKey` にセット。

---

### Phase 8: `backend/src/types/api.ts` — API 型定義修正（④）

`CreateTermBody` に `scopeKey?: string` を追加。

---

### Phase 9: `namespaceApiService.ts` — フロントエンド API Service 修正（④）

`TermUpsertRequest` に `scopeKey?: string` を追加。

---

### Phase 10: `NamespaceMain.tsx` — createTerm 呼び出し修正（④）

`handleAddSave()` の `createTerm()` 呼び出しに `scopeKey: effectiveNsKey ?? undefined` を追加。

---

## 6. 影響範囲

| 区分 | 詳細 |
|------|------|
| DB スキーマ | 変更なし |
| 既存 API | `POST /api/v1/namespaces/terms`：`scopeKey` 追加（省略可・後方互換あり） |
| CSV インポート・用語共有 | `createTerm` の呼び出しで `scopeKey` 省略のまま → フォールバック（`findPrefixNamespaceId.sql`）で後方互換 |
| TemplateEditorDialog | 影響なし |

---

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `scopeKey` が null/undefined で渡される場合 | 低 | 低 | フォールバック（`findPrefixNamespaceId.sql`）で従来動作を維持 |
| `findNamespaceIdByScopeKeyAndPrefix.sql` が0件を返す場合 | 中 | 低 | 既存の「namespace_id が見つかりません」エラーとして処理（変更なし） |
| ③ の fetchTerms 再取得でページネーション位置がリセットされる | 低 | 高 | 許容範囲（保存直後はページ先頭に戻っても問題なし） |

---

## 8. テスト計画

- [ ] チェックボックスのデフォルトがチェックあり（true）になっていること（①）
- [ ] 指示用語登録時、SupervisorDirective... の displayName/description/typeHint/unitHint が元の用語と同じ値で登録されること（②）
- [ ] 保存後に一覧がリロードされ、指示用語（SupervisorDirective...）が一覧に表示されること（③）
- [ ] 左ツリーで特定のスコープを選択した状態で用語を登録し、正しい namespace_id が使われること（④）
- [ ] `scopeKey` を省略した場合（CSV インポートなど）は従来通り動作すること（後方互換）

---

## 9. 承認記録

- **計画書提示日時**: 2026-08-25 14:00
- **承認日時**: 2026-08-25 14:00
- **承認者コメント**: 承認

## 10. 実施記録

### 実施日時
開始: 2026-08-25 14:00
完了: 2026-08-25 14:20

### 最終的な成果物
- [x] Phase 1: `NamespaceMain.tsx` の `makeEmptyRow()` に `createDirectiveTerm: true` 追加（①）
- [x] Phase 2: `namespaceService.ts` の指示用語 INSERT に `displayName`/`description`/`typeHint`/`unitHint` 引き継ぎ（②）
- [x] Phase 3: `NamespaceMain.tsx` の `handleAddSave` 保存後に `fetchTerms()` 再取得に変更（③）
- [x] Phase 4: `findNamespaceIdByScopeKeyAndPrefix.sql` 新規作成（④）
- [x] Phase 5: `namespaceTermRepository.ts` の `create()` / `createInTx()` に `scopeKey` 対応追加（④）
- [x] Phase 6: `namespaceService.ts` の `CreateTermInput` / `createTerm()` に `scopeKey` 伝播（④）
- [x] Phase 7: `namespaceController.ts` の `createTerm()` に `scopeKey` 受け取り追加（④）
- [x] Phase 8: `backend/src/types/api.ts` の `CreateTermBody` に `scopeKey` 追加（④）
- [x] Phase 9: `namespaceApiService.ts` の `TermUpsertRequest` に `scopeKey` 追加（④）
- [x] Phase 10: `NamespaceMain.tsx` の `createTerm()` 呼び出しに `scopeKey: effectiveNsKey ?? undefined` 追加（④）

