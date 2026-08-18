# タスク計画書: テンプレート編集 不確かさ複数付与対応

## メタデータ
- **作成日時**: 2026-07-22 13:58
- **タスクID**: テンプレート編集不確かさ複数付与対応
- **優先度**: 高
- **推定工数**: 2時間

## タスク概要

画像テンプレート編集（TemplateEditorDialog）にて、各 property / content の「不確かさ選択」で
複数の不確かさを付与できるようにする。
参考実装：実験計画詳細指示ダイアログ（TemplateInputPanel.tsx）の不確かさ選択。

## 目的と期待される成果

- [ ] 1つの property/content に複数の uncertainty ノードを付与できる
- [ ] 付与済み不確かさを一覧表示し、各行で「編集」「削除」操作が可能
- [ ] 「＋ 不確かさ選択」ボタンで新規追加、「不確かさ編集」ボタンで既存を編集

## 実装ステップ

### Phase 1: タスク計画書作成
- [x] 計画書作成

### Phase 2: NestedPropertyEditor.tsx 変更
- [ ] Props に `onDeleteUncertainty` 追加（インデックス指定削除）
- [ ] `onEditUncertainty` の型を `(key, node, index) => void` に変更
- [ ] 不確かさ表示部を `find` → `filter` で全件取得・複数表示に変更
- [ ] 各 uncertainty 行に「編集」「×」ボタン配置（index渡し）

### Phase 3: TemplateEditorDialog.tsx 変更
- [ ] `criteriaEditUncertaintyIndex` State 追加（null=新規追加、number=編集中インデックス）
- [ ] `handleEditUncertainty` に `index` 引数追加
- [ ] `handleCriteriaAssign` を複数対応に変更（index=null→追加、index=number→上書き）
- [ ] `handleDeleteUncertainty` ハンドラ実装（propertyKey + index で1件削除）
- [ ] NestedPropertyEditor に新 Props を渡す

## 変更ファイル

1. `frontend/src/components/editorv2/NestedPropertyEditor.tsx` - Props変更・複数表示UI
2. `frontend/src/components/editorv2/TemplateEditorDialog.tsx` - 複数付与ロジック

## 承認記録
- **承認日時**: 2026-07-22 13:58
