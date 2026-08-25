# タスク計画書: 名前空間管理 編集・保存バグ修正

## メタデータ
- **作成日時**: 2026-08-21 08:43
- **タスクID**: 名前空間編集保存バグ修正
- **優先度**: 高
- **推定工数**: 2時間

## タスク概要

名前空間管理の「Prefix管理」と「用語管理」にある編集ボタン押下後の保存処理が、それぞれ以下の問題を抱えている。

- **Prefix管理**: 編集内容（prefix・description）が保存されない
- **用語管理**: 保存ボタンを押しても何も反応しない

## 原因調査結果

### Bug 1: Prefix管理 — 編集内容が保存されない

**根本原因**: `saveEdit` 関数が `uri` しか API に送信しないが、URI は `disabled`（編集不可）のため実質何も変化しない

**コード箇所**: `frontend/src/components/namespace/PrefixManagement.tsx` L255〜275

```typescript
// 現状の saveEdit
const saveEdit = async () => {
    ...
    await updateNamespace(editingId, { uri: editingValues.uri });
    // ↑ uri しか送っていない。prefix・description は送信されない
};
```

編集モードの各フィールド状態：

| フィールド | 編集可否 | saveEdit で送信 |
|---|---|---|
| prefix | ✅ 編集可（Input） | ❌ 送信されない |
| URI | ❌ disabled（編集不可） | ✅ 送信される（値が変わらないので無意味） |
| description | ✅ 編集可（Input） | ❌ 送信されない |

**影響範囲**: `prefix` テーブルの `prefix` カラムおよび `description` カラムが更新対象。`prefix` 変更時は FK 制約のため `namespace_term.prefix` を先に UPDATE してからトランザクション内で処理する。

---

### Bug 2: 用語管理 — 保存ボタン押下しても反応しない

**根本原因**: バックエンドが `Term.id` を返さないため `editingTermId` に `undefined` がセットされ、`saveEditTerm` の guard で即 `return` する

**コード箇所**: `frontend/src/components/namespace/NamespaceMain.tsx` L1044〜1083

```typescript
// startEditTerm
const startEditTerm = (record: Term) => {
    setEditingTermId(record.id);  // record.id = undefined（バックエンドが id を返さない）
    ...
};

// saveEditTerm
const saveEditTerm = async () => {
    if (!editingTermId) return;  // undefined は falsy → 常にここで return して終了
    ...
    // updateTerm は一切呼ばれない
};
```

バックエンドの `NamespaceTermRow` 型（`namespaceTermRepository.ts`）に `id` フィールドが存在しない：

```typescript
export interface NamespaceTermRow {
  qname: string;
  prefix: string;
  localName: string;
  displayName: string;
  description: string;
  type: string;
  unitHint: string;
  isActive: boolean;
  scopeKey?: string | null;
  // id フィールドなし！
}
```

---

## 修正方針

### Bug 1: Prefix管理 の修正方針

`description` と `prefix` の両方の保存を対応する。

**prefix 変更の FK 制約について:**
- `prefix` テーブルの主キーは `(organization_id, namespace_id, prefix)`
- `namespace_term` テーブルが `(organization_id, prefix)` → `namespace(organization_id, prefix)` を FK 参照（CASCADE UPDATE なし）
- prefix 変更時はトランザクション内で以下の順序で UPDATE が必要:
  1. `namespace_term.prefix` を新しい prefix に UPDATE
  2. `prefix.prefix` を新しい prefix に UPDATE

**URI 送信について（現状の問題）:**
- 現在の `saveEdit` は `uri` のみ送信しているが、URI は自動生成で `disabled` のため送信不要
- 修正後は `prefix` と `description` のみ送信する（`uri` は送信しない）

#### 修正ファイル一覧

| ファイル | 修正内容 |
|---|---|
| `frontend/src/components/namespace/PrefixManagement.tsx` | saveEdit で `prefix` と `description` を送信（`uri` は送信しない） |
| `frontend/src/services/namespaceApiService.ts` | updateNamespace の body を `{ prefix, description }` に変更 |
| `backend/src/controllers/namespaceController.ts` | `prefix`（新しい値）と `description` を受け取れるよう修正 |
| `backend/src/services/namespaceService.ts` | `prefix` と `description` を Repository に渡すよう修正 |
| `backend/src/repositories/namespaceTermRepository.ts` | updateNamespace 関数に `newPrefix` と `description` を追加、トランザクション内で namespace_term → prefix の順に UPDATE |
| `backend/src/sql/queries/namespace_terms/updateNamespace.sql` | `prefix.description` と `prefix.prefix` を UPDATE するよう修正（uri 更新は削除） |

---

### Bug 2: 用語管理 の修正方針

`id` の代わりに `prefix:localName` の複合キーを `editingTermId` として使用する。バックエンド変更は不要。

#### 修正ファイル一覧

| ファイル | 修正内容 |
|---|---|
| `frontend/src/components/namespace/NamespaceMain.tsx` | startEditTerm・saveEditTerm・テーブル列定義内の editingTermId 判定を prefix:localName 方式に統一 |

---

## 実装ステップ

### Phase 1: 用語管理バグ修正（フロントエンドのみ）
- [ ] `NamespaceMain.tsx` の `startEditTerm` を `setEditingTermId(\`${record.prefix}:${record.localName}\`)` に変更
- [ ] `NamespaceMain.tsx` の `saveEditTerm` 内の state 更新を `\`${t.prefix}:${t.localName}\` === editingTermId` に変更
- [ ] `NamespaceMain.tsx` のテーブル列定義内の編集中判定を `\`${r.prefix}:${r.localName}\` === editingTermId` に統一

### Phase 2: Prefix管理バグ修正（フロント + バックエンド）
- [ ] `PrefixManagement.tsx` の `saveEdit` を `{ prefix: editingValues.prefix, description: editingValues.description }` を送信するよう修正（`uri` は送信しない）
- [ ] `namespaceApiService.ts` の `updateNamespace` の body を `{ newPrefix?, description? }` に変更
- [ ] バックエンド `namespaceController.ts` で `newPrefix` と `description` を受け取れるよう修正
- [ ] バックエンド `namespaceService.ts` で `newPrefix` と `description` を Repository に渡すよう修正
- [ ] バックエンド `namespaceTermRepository.ts` の `updateNamespace` 関数を拡張:
  - `newPrefix` と `description` を引数に追加
  - トランザクション内で ①`namespace_term.prefix` を UPDATE → ② `prefix.prefix` と `prefix.description` を UPDATE の順で実行
- [ ] `updateNamespace.sql` を廃止または名称変更し、新たに `prefix.prefix` / `prefix.description` を更新する SQL を作成

### Phase 3: 動作確認
- [ ] Prefix管理: 編集ボタン → prefix 変更 → 保存 → prefix と関連 namespace_term の prefix が更新されること
- [ ] Prefix管理: 編集ボタン → description 変更 → 保存 → description が反映されること
- [ ] 用語管理: 編集ボタン → 各フィールド変更 → 保存 → 変更が反映されること

---

## 変更ファイル詳細

### 新規作成
- `backend/src/sql/queries/namespace_terms/updatePrefix.sql` - prefix テーブルの prefix と description を UPDATE する SQL
- `backend/src/sql/queries/namespace_terms/updateTermPrefix.sql` - namespace_term テーブルの prefix を一括 UPDATE する SQL（FK 制約のため prefix 変更前に実行）

### 修正ファイル
1. `frontend/src/components/namespace/NamespaceMain.tsx` - 用語管理 editingTermId を composite key（`prefix:localName`）に変更
2. `frontend/src/components/namespace/PrefixManagement.tsx` - saveEdit を `{ prefix, description }` 送信に変更（`uri` 送信を削除）
3. `frontend/src/services/namespaceApiService.ts` - updateNamespace の body 型を `{ newPrefix?, description? }` に変更
4. `backend/src/controllers/namespaceController.ts` - `newPrefix` と `description` を受け取れるよう修正
5. `backend/src/services/namespaceService.ts` - `newPrefix` と `description` を Repository に渡すよう修正
6. `backend/src/repositories/namespaceTermRepository.ts` - updateNamespace 関数にトランザクション処理（namespace_term → prefix の順）を追加
7. `backend/src/sql/queries/namespace_terms/updateNamespace.sql` - namespace テーブルの uri UPDATE を削除（uri は自動生成のため更新不要）→ ファイルの用途が変わるため内容を刷新

---

## リスク

| リスク | 影響度 | 対策 |
|---|---|---|
| prefix 変更時の FK 制約違反 | 高 | `namespace_term.prefix` を先に UPDATE してから `prefix.prefix` を UPDATE する（トランザクション内） |
| prefix 変更時に namespace_term が存在しない場合（0件 UPDATE）でも正常動作する必要あり | 低 | 0件 UPDATE はエラーにせず処理継続 |
| updateNamespace.sql の変更が他の呼び出し箇所に影響する可能性 | 中 | `namespaceTermRepository.ts` の `updateNamespace` 関数のみで使用されるため影響範囲は限定的 |

---

## 承認記録
- **計画書提示日時**: 2026-08-21 08:50
- **承認日時**: 
- **承認者コメント**: 
