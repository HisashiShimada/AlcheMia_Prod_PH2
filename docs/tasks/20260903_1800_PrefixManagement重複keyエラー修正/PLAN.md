# タスク計画書: PrefixManagement 重複 key エラー修正

## メタデータ

- **作成日時**: 2026-09-03 18:00
- **タスクID**: 20260903_1800_PrefixManagement重複keyエラー修正
- **優先度**: 高
- **推定工数**: 1〜1.5 時間

---

## 1. タスク概要

PrefixManagement コンポーネントにて以下の React 警告が大量発生している。

```
Encountered two children with the same key, `test_prx2`.
Keys should be unique so that components maintain their identity across updates.
```

**原因**: `rowKey` として `id: ns.prefix`（prefix 単体）を使用しているが、
複数スコープを同時表示するケース（company ノード選択・組織グループ選択など）では
**異なる `namespace_id`（scope_key）に同じ prefix 文字列が登録可能**なため、
同一 prefix 値を持つ複数行が返却され `rowKey` が重複する。

---

## 2. 根本原因の詳細

### DB スキーマ

```sql
-- prefix テーブルの主キー
PRIMARY KEY (organization_id, namespace_id, prefix)
--                             ^^^^^^^^^^^
--                    namespace_id は scope_key ごとに異なる
```

`prefix` 値は `(organization_id, namespace_id)` の組み合わせが異なれば重複登録できる。
例: `TeamA` スコープと `TeamB` スコープの両方に `test_prx2` が登録可能。

### フロントエンドの問題箇所

| 行番号 | 問題 |
|--------|------|
| 130 | `id: ns.prefix` → prefix 単体を id に使用 |
| 880–883 | `rowKey` で `(record as PrefixRow).id` を使用 |
| 338 | `setEditingId(record.id)` → 編集開始時に id をセット |
| 359 | `editingValues.prefix !== editingId` → id（prefix単体）と新prefix を比較して API 呼び出し |
| 362 | `await updateNamespace(editingId, ...)` → id を prefix としてそのまま API に渡している |
| 432–434 | `for (const prefix of keys)` → selectedRowKeys（id 値）を prefix として API に渡している |
| 441 | `keys.includes(r.id)` → id での一致判定 |
| 535 | CSV インポート: `id: created.prefix` → prefix 単体 |

### 重複が起きる具体的なシナリオ

| ノード選択 | 呼ばれる SQL | 問題 |
|---|---|---|
| `company` ノード | `findNamespacesByScopeKeys.sql` | 複数グループで同名 prefix が存在すると重複行が返る |
| 組織グループ + `orgGroupCds` あり | 同上 | 子孫グループも含むため重複 |
| 組織グループ + `withAncestors=true` | `findNamespacesByScopeKeyWithAncestors.sql` | 祖先グループとの間で同名 prefix が重複 |

### `PrefixRowLocal` 型定義の問題

現状の `PrefixRowLocal` に `scopePath` / `scopeKey` フィールドが未定義にもかかわらず、
実装内で `as any` を使って強引に `scopePath` をセット・参照している。

---

## 3. 修正方針

**`rowKey` を `prefix + scopeKey` の複合キーに変更する。**

- `id` フィールドを `` `${prefix}__${scopeKey ?? ''}` `` 形式の複合キーに変更する
- `PrefixRowLocal` 型定義に `scopePath` / `scopeKey` を正式追加して `as any` を廃止する
- `editingId` が複合キーになるため、API には `record.prefix` を別 state で保持して渡す形に修正する
- `selectedRowKeys`（一括操作）も複合キーになるため `rows` から id→prefix マップ経由で prefix を取得する

---

## 4. 変更ファイルと変更内容

### ファイル 1: `frontend/src/types/namespace.ts`

`PrefixRowLocal` インターフェースに `scopePath?` / `scopeKey?` フィールドを追加する。

### ファイル 2: `frontend/src/components/namespace/PrefixManagement.tsx`

#### 変更① `fetchNamespaces` 内の `setRows`（128〜139行目）

`id` を複合キー `` `${ns.prefix}__${scopeKey ?? ''}` `` に変更し、`scopeKey` を型安全にセット。

#### 変更② `editingOriginalPrefix` state を追加し `saveEdit` / `startEdit` / `cancelEdit` を修正

`editingId` が複合キーになるため、API 呼び出し用に元の prefix 文字列を `editingOriginalPrefix: string | null` という新 state で保持する。
- `startEdit(record)` → `setEditingOriginalPrefix(record.prefix)` を追加
- `cancelEdit` → `setEditingOriginalPrefix(null)` を追加
- `saveEdit` → `editingId` の代わりに `editingOriginalPrefix` を使って `updateNamespace` を呼ぶ

#### 変更③ `handleBulkDeactivate` の API 呼び出し（430〜441行目）

`selectedRowKeys`（複合キー）から prefix を取り出して API を呼ぶため、
`const idToPrefixMap = new Map(rows.map((r) => [r.id, r.prefix]))` を作成し、
`for (const key of keys)` ループ内で `idToPrefixMap.get(key)` から prefix を取得する。

#### 変更④ CSV インポートの `added` 配列構築（534〜539行目）

`id: created.prefix` を `id: \`${created.prefix}__${createdScopeKey ?? ''}\`` に変更する。

#### 変更⑤ `colScope` 列の `sorter` 内 `as any` キャスト修正（668〜672行目）

`scopePath` が型定義に正式追加されるため `(a as PrefixRow & { scopePath?: string })` キャストを `(a as PrefixRow)` に変更する。

#### 変更⑥ `handleSave` の重複チェック内 `as any` キャスト修正（313行目）

`scopePath` が型定義に追加されるため `as (PrefixRow & { scopePath?: string }) | undefined` キャストを除去する。

---

## 5. 影響範囲の分析

| 機能 | 影響 | 対応 |
|------|------|------|
| テーブル行の rowKey（重複 key 警告） | 修正対象 | 複合キーへ変更 |
| インライン編集（編集開始・保存・キャンセル） | 修正対象 | `editingOriginalPrefix` state を追加 |
| 一括非アクティブ化 | 修正対象 | `idToPrefixMap` 経由で prefix を取得 |
| 単体非アクティブ化・アクティブ化・削除 | 変更不要 | `record.prefix` を直接使用しているため影響なし |
| CSV インポート | 修正対象 | `id` を複合キーに変更 |
| `scopePath` の `as any` キャスト | 修正対象 | 型定義に正式追加して廃止 |
| 認証・認可 | 影響なし | フロントエンドの表示ロジックのみ |
| マルチテナント分離 | 影響なし | organization_id はバックエンドで管理 |

---

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `editingOriginalPrefix` の追加による整合性崩れ | 中 | 低 | `startEdit` / `cancelEdit` / `saveEdit` の3箇所を同時に修正し確認 |
| CSV インポート後の `scopeKey` が空になる（APIレスポンスに scopeKey がない場合） | 低 | 中 | `id` を `` `${prefix}__` `` 形式にすることで prefix が異なれば一意が保たれる |
| `handleBulkDeactivate` の `idToPrefixMap` 変換漏れ | 中 | 低 | `rows` から変換するため表示されている行のみが対象になることを確認 |

---

## 7. テスト計画

### 手動テスト

- [ ] company ノード選択時、複数グループで同名 prefix が存在しても重複 key 警告が出ないこと
- [ ] 組織グループノード選択（子孫グループ含む）で同名 prefix が存在しても警告が出ないこと
- [ ] インライン編集（編集ボタン → 説明変更 → 保存）が正常に動作すること
- [ ] 非アクティブ化ボタンが正常に動作すること
- [ ] アクティブ化ボタンが正常に動作すること
- [ ] 一括非アクティブ化が正常に動作すること
- [ ] CSV インポートが正常に動作し、インポート後に重複 key 警告が出ないこと
- [ ] 単一スコープ選択時（個人・単一グループ）で従来通り動作すること

---

## 8. 変更ファイル一覧

1. `frontend/src/types/namespace.ts` — `PrefixRowLocal` に `scopePath?` / `scopeKey?` フィールドを追加
2. `frontend/src/components/namespace/PrefixManagement.tsx` — 上記「変更①〜⑥」を適用

---

## 9. 承認記録

- **計画書提示日時**: 2026-09-03 18:00
- **承認日時**: 2026-09-03 18:30
- **承認者コメント**: 承認します。修正を開始してください

## 10. 実施記録

### 実施日時
開始: 2026-09-04  
完了: 2026-09-04

### 変更した内容

- [x] `frontend/src/types/namespace.ts` — `PrefixRowLocal` に `scopePath?` / `scopeKey?` フィールドを追加
- [x] `frontend/src/components/namespace/PrefixManagement.tsx` — 変更①〜⑥ を適用
  - [x] 変更① `fetchNamespaces` 内の `setRows` で `id` を複合キー `"prefix__scopeKey"` に変更
  - [x] 変更② `editingOriginalPrefix` state を追加し `startEdit` / `saveEdit` / `cancelEdit` を修正
  - [x] 変更③ `handleBulkDeactivate` で `idToPrefixMap` 経由で prefix を取得するよう修正
  - [x] 変更④ CSV インポートの `added` 配列の `id` を複合キーに変更
  - [x] 変更⑤ `colScope` 列の `sorter` / `render` 内の不要な `as any` キャストを除去
  - [x] 変更⑥ `handleSave` の重複チェック内の不要な `as any` キャストを除去
- [x] TypeScript コンパイル（`tsc --noEmit`）エラーなし（exit: 0）

