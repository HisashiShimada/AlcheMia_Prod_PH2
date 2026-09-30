# タスク計画書: Prefix管理・用語管理の編集時フィールド非活性化

## メタデータ
- **作成日時**: 2026-09-30 10:00
- **タスクID**: 20260930_1000_prefix_localname_edit_disabled
- **優先度**: 中
- **推定工数**: 0.5時間

---

## タスク概要

実験管理者メニュー > 名前空間管理 において、以下2点の編集制限を実装する。

1. **Prefix管理タブ** > 編集ボタン押下時：`prefix` フィールドを非活性（disabled）にして編集不可にする
2. **用語管理タブ** > 編集ボタン押下時：`ローカル名（localName）` フィールドを非活性（disabled）にして編集不可にする

---

## 目的と期待される成果

- [ ] Prefix管理の編集モードで prefix が変更できないようにする
- [ ] 用語管理の編集モードで localName が変更できないようにする

---

## 原因分析

### 問題1：Prefix管理 - prefix が編集可能

**ファイル：** `frontend/src/components/namespace/PrefixManagement.tsx`（行700〜709）

```
// 現状：editingId 行の prefix 列 → 編集可能な Input
return r.id === editingId ? (
  <Input
    size="small"
    value={editingValues.prefix}
    onChange={(e) => setEditingValues((prev) => ({ ...prev, prefix: e.target.value }))}
    // ↑ disabled がなく onChange が設定されているため編集可能
  />
) : (...)
```

### 問題2：用語管理 - localName が編集可能

**ファイル：** `frontend/src/components/namespace/NamespaceMain.tsx`（行2205〜2207）

```
// 現状：editingTermId 行の localName 列 → 編集可能な Input
return term.id === editingTermId
  ? <Input size="small" value={editingValues.localName}
      onChange={(e) => setEditingValues((p) => ({ ...p, localName: e.target.value }))} />
  : term.localName;
```

---

## 機能フロー図

### 修正前

```
[編集ボタン押下]
      ↓
[prefix / localName が編集可能な Input として表示]
      ↓
[ユーザーが値を変更可能]
      ↓
[保存ボタン押下 → 変更後の値でAPIへ送信]
```

### 修正後

```
[編集ボタン押下]
      ↓
[prefix / localName が disabled（非活性・グレーアウト）の Input として表示]
      ↓
[ユーザーは値を変更できない]
      ↓
[保存ボタン押下 → 元の値のままAPIへ送信（挙動変わらず）]
```

---

## 実装ステップ

- [x] 調査・原因特定
- [ ] `PrefixManagement.tsx` の prefix Input に `disabled` 属性を追加
- [ ] `NamespaceMain.tsx` の localName Input に `disabled` 属性を追加
- [ ] フロントエンド build エラー・TS エラーがないことを確認

---

## 変更ファイル

| # | ファイルパス | 変更内容 |
|---|------------|----------|
| 1 | `frontend/src/components/namespace/PrefixManagement.tsx` | 編集中 prefix の Input に `disabled` 属性を追加 |
| 2 | `frontend/src/components/namespace/NamespaceMain.tsx` | 編集中 localName の Input に `disabled` 属性を追加 |

**バックエンド変更：なし**

---

## 実装補足

- `PrefixManagement.tsx` の `saveEdit` では `newPrefix: editingValues.prefix !== editingOriginalPrefix ? editingValues.prefix : undefined` というロジックがある。`disabled` により値が変わらないため `undefined` が渡り、APIへの影響なし。
- `NamespaceMain.tsx` の `saveEditTerm` では `localName: editingValues.localName` がリクエストに含まれるが、disabled により元の値がそのまま使用されるため挙動変わらず。

---

## リスク

| リスク | 対策 |
|--------|------|
| build エラー発生 | 修正後に `npm run build` で確認 |

---

## テスト計画

- [ ] Prefix管理タブで編集ボタン押下 → prefix フィールドがグレーアウトで変更不可であることを確認
- [ ] 用語管理タブで編集ボタン押下 → ローカル名フィールドがグレーアウトで変更不可であることを確認
- [ ] 各編集モードで他フィールド（description / displayName 等）は引き続き編集可能であることを確認
- [ ] フロントエンド build エラー・TS エラーなし

---

## 承認記録

- **計画書提示日時**: 2026-09-30 10:00
- **承認日時**: 2026-09-30 10:12
- **承認者コメント**: Actモードへ切り替えにより承認

---

## 実施記録

### 実施日時
開始: 2026-09-30 10:12
完了: 2026-09-30 10:30

### 最終的な成果物
- [x] `PrefixManagement.tsx` 修正完了（prefix Input に `disabled` 追加・`onChange` 削除）
- [x] `NamespaceMain.tsx` 修正完了（localName Input に `disabled` 追加・`onChange` 削除）
- [x] TypeScript型チェック（`tsc --noEmit`）：exit code 0（エラーなし）確認済み
