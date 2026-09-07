# タスク計画書: 用語管理タブ 編集→保存→再編集でラベルのままになるバグ修正

## メタデータ
- **作成日時**: 2026-09-07 00:00
- **タスクID**: 20260907_0000_用語管理編集再編集バグ修正
- **優先度**: 高
- **推定工数**: 0.5時間

---

## タスク概要

`NamespaceMain` の用語管理タブで「編集 → 保存 → 再度編集」を行うと、
各データ列（Prefix・ローカル名・表示名・説明・型・単位）が入力フォームに切り替わらず、
ラベル表示のままになり編集できなくなる。

---

## 根本原因

### 構造

| # | 箇所 | 内容 |
|---|------|------|
| 1 | `findAllByOrganization.sql` / `findAllByScopeKey.sql` | `t.prefix \|\| ':' \|\| t.localname AS "id"` → `term.id` は `"prefix:localName"` 形式の文字列 |
| 2 | `startEditTerm`（NamespaceMain.tsx L1255） | `setEditingTermId(`${record.prefix}:${record.localName}`)` → `editingTermId` も同じ形式 |
| 3 | 各列 render（L1981, 2014, 2030, 2046, 2102, 2123） | `term.id === editingTermId` で判定 → 初回は ① ② が一致するため正常に動作する |
| 4 | `saveEditTerm`（L1284） | `setTerms((prev) => prev.map((t) => ... ? (updated as Term) : t))` → `updated` で完全置換 |
| 5 | `findTermByKey.sql`（UPDATE後の SELECT） | `"id"` 列が定義されていない → `updated.id === undefined` |

### バグ発生フロー

```
1. 初回「編集」ボタン押下
   → startEditTerm: editingTermId = "mst:temperature"
   → render: term.id("mst:temperature") === editingTermId("mst:temperature") → true
   → Input フォームが表示される ✅

2. 「保存」ボタン押下
   → saveEditTerm: updateTerm() API コール
   → updated = findTermByKey.sql の結果 → id フィールドなし（undefined）
   → setTerms: terms 配列の該当行を updated で完全置換
   → 置換後のオブジェクト: { id: undefined, prefix: "mst", localName: "temperature", ... }

3. 再度「編集」ボタン押下
   → startEditTerm: editingTermId = "mst:temperature"（正しい）
   → render: term.id(undefined) === editingTermId("mst:temperature") → false ❌
   → Input が表示されずラベルのまま
```

### アクションボタン列（1917行目）が正常な理由

```ts
if (`${record.prefix}:${record.localName}` === editingTermId) { ... }
```

アクション列のみ `prefix:localName` で比較しているため、
「保存/キャンセル」ボタンは正しく表示される。
しかし各データ列は `term.id` 比較のため、Input が表示されない。

---

## 修正方針

**案C（採用）: `saveEditTerm` 保存成功後に `fetchTermsForCurrentNsKey(effectiveNsKey)` で一覧を再取得する**

```ts
// 修正前（L1279〜L1286）
const updated = await updateTerm(
  editingValues.prefix,
  editingValues.localName,
  updateTermRequest
);
setTerms((prev) => prev.map((t) => `${t.prefix}:${t.localName}` === editingTermId ? (updated as Term) : t));
setEditingTermId(null);
message.success(t('namespaceMain.updateSuccess'));

// 修正後
await updateTerm(
  editingValues.prefix,
  editingValues.localName,
  updateTermRequest
);
setEditingTermId(null);
fetchTermsForCurrentNsKey(effectiveNsKey);  // APIから最新一覧を再取得
message.success(t('namespaceMain.updateSuccess'));
```

保存後にAPIから最新データを再取得することで、`id` 欠損問題を根本的に回避しつつ、
データの整合性も担保する。新規追加保存（`handleAddSave`）・共有後（`handleShareConfirm`）
と同じパターンに統一される。

**他操作との比較:**

| 操作 | 保存後の処理 |
|---|---|
| 新規用語追加（`handleAddSave`） | `fetchTermsForCurrentNsKey(effectiveNsKey)` ✅ |
| 共有後（`handleShareConfirm`） | `fetchTermsForCurrentNsKey(effectiveNsKey)` ✅ |
| **既存用語編集（`saveEditTerm`）修正前** | `setTerms` ローカル置換のみ ❌ |
| **既存用語編集（`saveEditTerm`）修正後** | `fetchTermsForCurrentNsKey(effectiveNsKey)` ✅ |

---

## 目的と期待される成果

- [x] 「編集 → 保存 → 再度編集」の操作で各データ列が入力フォームに切り替わること
- [x] 初回の編集操作が引き続き正常に動作すること
- [x] 保存後のデータが正しく反映されること

---

## 実装ステップ

- [x] `docs/tasks/20260907_0000_用語管理編集再編集バグ修正/PLAN.md` 作成（本ファイル）
- [x] `frontend/src/components/namespace/NamespaceMain.tsx` `saveEditTerm` を再取得方式に変更
- [ ] 動作確認（手動テスト）

---

## 変更ファイル

1. `frontend/src/components/namespace/NamespaceMain.tsx` — `saveEditTerm` 内を変更（`setTerms` ローカル置換 → `fetchTermsForCurrentNsKey` 再取得）

---

## 影響範囲

- `NamespaceMain` コンポーネントの `saveEditTerm` 関数のみ
- 他コンポーネント・バックエンドへの影響なし
- `fetchTermsForCurrentNsKey` は既存の共通関数であり、新規追加・共有後と同じ動作をする

---

## リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| 保存後に余分なAPIリクエストが1回増える | 低 | 単一行の更新後取得であり、現行の新規追加保存と同等の負荷 |

---

## テスト計画

### 手動テスト
- [ ] 用語管理タブで任意の用語の「編集」ボタンを押す → 各列が入力フォームに切り替わること
- [ ] 値を変更して「✔ 保存」ボタンを押す → 保存成功メッセージが表示されること
- [ ] 再度同じ用語の「編集」ボタンを押す → 各列が入力フォームに切り替わること（**バグが修正されていることを確認**）
- [ ] 「キャンセル」ボタンで編集を中断できること
- [ ] 別の用語も連続して編集・保存できること

---

## 承認記録
- **計画書提示日時**: 2026-09-07 00:00
- **承認日時**: 2026-09-07（案C採用で承認）
- **承認者コメント**: 再取得が正しいので案C採用
