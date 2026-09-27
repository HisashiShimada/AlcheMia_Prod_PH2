# タスク計画書: テンプレートプロパティテキスト編集不可化

## メタデータ
- **作成日時**: 2026-09-25 16:00
- **タスクID**: 20260925_1600
- **優先度**: 中
- **推定工数**: 0.5時間

---

## タスク概要

実験管理者メニュー > プロジェクト管理タブ > 編集ボタン > テンプレート編集画面内で、
プロパティに属性や不確かさなどを追加した後に表示されるテキスト入力欄を
すべて `readOnly`（編集不可）にする。

---

## 目的と期待される成果

- [ ] テンプレートプロパティの「属性セクション」の Input がすべて読み取り専用になる
- [ ] テンプレートプロパティの「要素セクション」の Input がすべて読み取り専用になる
- [ ] テンプレートプロパティの「不確かさセクション」の description Input が読み取り専用になる
- [ ] その他のUI（削除ボタン、編集ボタン、追加ボタン）は変更しない

---

## 調査結果・原因分析

### 関連コンポーネント

| 役割 | ファイル |
|------|---------|
| プロパティ描画（属性・要素・不確かさセクション） | `frontend/src/components/editorv2/NestedPropertyEditor.tsx` |

### 問題箇所（修正前）

```
NestedPropertyEditor.tsx の以下の Input が編集可能になっている:

① 属性セクション（L356-361）:
   <Input value={attrValue || ''} onChange={(e) => onUpdateNestedAttribute(...)} />

② 要素セクション（L382-386）:
   <Input value={elemValue || ''} onChange={(e) => onUpdateNestedElement(...)} />

③ 不確かさの description（L478-484）:
   <Input value={ucDesc} onChange={(e) => onUpdateNestedElement(...)} />
```

### 修正前後フロー

**修正前フロー：**
```
TemplateEditorDialog
  └─ NestedPropertyEditor（各 property）
        ├─ 属性セクション
        │     └─ Input[onChange=onUpdateNestedAttribute]  ← 編集可能
        ├─ 要素セクション
        │     └─ Input[onChange=onUpdateNestedElement]    ← 編集可能
        └─ 不確かさセクション（uncertainty ノード）
              ├─ key:          Input[readOnly]  ✅
              ├─ xsi:type:     Input[readOnly]  ✅
              ├─ units:        Input[readOnly]  ✅
              └─ description:  Input[onChange=...]        ← 編集可能
```

**修正後フロー：**
```
TemplateEditorDialog
  └─ NestedPropertyEditor（各 property）
        ├─ 属性セクション
        │     └─ Input[readOnly]                         ← 編集不可
        ├─ 要素セクション
        │     └─ Input[readOnly]                         ← 編集不可
        └─ 不確かさセクション（uncertainty ノード）
              ├─ key:          Input[readOnly]  ✅
              ├─ xsi:type:     Input[readOnly]  ✅
              ├─ units:        Input[readOnly]  ✅
              └─ description:  Input[readOnly]            ← 編集不可（統一）
```

---

## 修正・追加が必要なファイル一覧

| # | ファイルパス | 変更内容 |
|---|------------|---------|
| 1 | `frontend/src/components/editorv2/NestedPropertyEditor.tsx` | 属性・要素・不確かさ description の Input に `readOnly` を追加し `onChange` を削除 |

---

## 実装ステップ

- [ ] `NestedPropertyEditor.tsx` L356-361 の属性セクション Input を `readOnly` に変更
- [ ] `NestedPropertyEditor.tsx` L382-386 の要素セクション Input を `readOnly` に変更
- [ ] `NestedPropertyEditor.tsx` L478-484 の不確かさ description Input を `readOnly` に変更
- [ ] `tsc --noEmit` でビルドエラーなし確認

---

## 影響範囲分析

- フロントエンドのみ（1ファイル）
- バックエンド変更なし
- API変更なし
- 翻訳キー変更なし
- 削除ボタン・追加ボタン・不確かさ編集ボタンはそのまま維持

---

## リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| `ucDesc` 変数が他所でも使用されている可能性 | 低 | 削除せず onChange のみ削除して readOnly にする |

---

## テスト計画

- [ ] テンプレート編集画面を開き、プロパティに属性を追加後 → 値が編集不可であること
- [ ] テンプレート編集画面を開き、プロパティに要素を追加後 → 値が編集不可であること
- [ ] テンプレート編集画面を開き、プロパティに不確かさを追加後 → description が編集不可であること
- [ ] 削除ボタン（✕）は引き続き動作すること

---

## 承認記録

- **計画書提示日時**: 2026-09-25 16:00
- **承認日時**: 2026-09-25 16:00
- **承認者コメント**: ユーザー承認済み
