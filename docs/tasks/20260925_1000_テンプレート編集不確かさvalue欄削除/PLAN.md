# タスク計画書: テンプレート編集画面 不確かさ value 欄削除

## メタデータ
- **作成日時**: 2026-09-25 10:00
- **タスクID**: 20260925_1000
- **優先度**: 低
- **推定工数**: 0.5時間

---

## タスク概要

実験管理者メニュー > プロジェクト管理タブ > 編集ボタン > テンプレート編集画面内で、
プロパティに「不確かさ選択」から不確かさを付与した際に表示される不確かさカード内の **value 欄を削除** する。

---

## 目的と期待される成果

- [ ] テンプレート編集画面の不確かさ表示から `value:` 行が消える
- [ ] それ以外の UI（key / xsi:type / units / description）は変化しない

---

## 調査結果・原因

### 関連コンポーネント

| 役割 | ファイル |
|------|---------|
| 不確かさセクション描画 | `frontend/src/components/editorv2/NestedPropertyEditor.tsx` |

### 問題箇所（修正前）

`NestedPropertyEditor.tsx` L400〜504 に **不確かさセクション** の描画コードがある。  
その中の L475〜L485 が `value:` 行を **無条件で** 描画しており、これが削除対象。

```
L413: const ucValue = uncertaintyChild.elements?.['value'] ?? '';   ← 削除
...
L475-485:
  {/* value 行 */}
  <div ...>
    <Text>value:</Text>
    <Input value={ucValue} onChange={...} />
  </div>                                                              ← 削除
```

### 構造図（修正前 → 修正後）

```
修正前（不確かさカード内）:        修正後（不確かさカード内）:
  ├── key:          [readOnly]       ├── key:          [readOnly]
  ├── xsi:type:     [readOnly]       ├── xsi:type:     [readOnly]
  ├── units:        [readOnly]       ├── units:        [readOnly]
  ├── value:        [Input] ← 削除   └── description:  [条件付き]
  └── description:  [条件付き]
```

---

## 修正・追加が必要なファイル一覧

| # | ファイルパス | 変更内容 |
|---|------------|---------|
| 1 | `frontend/src/components/editorv2/NestedPropertyEditor.tsx` | 不確かさ `value` 行（L475-485）と `ucValue` 変数（L413）を削除 |

---

## 実装ステップ

- [ ] `NestedPropertyEditor.tsx` L413 の `const ucValue` 行を削除
- [ ] `NestedPropertyEditor.tsx` L475-485 の `{/* value 行 */}` ブロック全体を削除
- [ ] `tsc --noEmit` でビルドエラーなし確認

---

## 実装内容の機能フロー図

### 修正前フロー
```
TemplateEditorDialog
  └─ NestedPropertyEditor（各property）
        └─ 不確かさセクション（uncertainty子ノード）
              ├─ 見出し行（不確かさ N + 編集ボタン + 削除ボタン）
              ├─ key行
              ├─ xsi:type行
              ├─ units行
              ├─ value行 ★表示される★
              └─ description行（条件付き）
```

### 修正後フロー
```
TemplateEditorDialog
  └─ NestedPropertyEditor（各property）
        └─ 不確かさセクション（uncertainty子ノード）
              ├─ 見出し行（不確かさ N + 編集ボタン + 削除ボタン）
              ├─ key行
              ├─ xsi:type行
              ├─ units行
              └─ description行（条件付き）
```

---

## 影響範囲分析

- フロントエンドのみ（1ファイル）
- バックエンド変更なし
- API変更なし
- 翻訳キー変更なし（value行で翻訳キーは未使用）

---

## リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| `ucValue` が他箇所で参照されている可能性 | 低 | 削除後に `tsc --noEmit` で確認 |

---

## テスト計画

- [ ] テンプレート編集画面を開き、プロパティに不確かさを付与して value 欄が表示されないことを確認
- [ ] key / xsi:type / units / description は引き続き表示されることを確認

---

## 承認記録

- **計画書提示日時**: 2026-09-25 10:00
- **承認日時**: 2026-09-25 10:00
- **承認者コメント**: ユーザー承認済み

---

## 実施記録

### 実施日時
開始: 2026-09-25 10:00
完了: 2026-09-25 10:10

### 最終的な成果物
- [x] `frontend/src/components/editorv2/NestedPropertyEditor.tsx` 修正完了（ucValue変数削除・value行削除）
- [x] TypeScript ビルドエラーなし確認済み
