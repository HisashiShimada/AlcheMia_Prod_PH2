# タスク計画書: 不確かさ付与後にプロパティ配下へ表示

## メタデータ
- **作成日時**: 2026-07-07 09:50
- **タスクID**: uncertainty-assign-display
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要
テンプレート編集ダイアログで「不確かさ選択」ボタンから不確かさを付与した際、
対象プロパティの子要素として `uncertainty` ノード（value / description）が
NestedPropertyEditor 上に表示されるよう実装する。

## 目的と期待される成果
- [x] `handleCriteriaAssign` の TODO を実装する
- [x] 付与後、対象 property の children に `uncertainty` 子ノードが追加される
- [x] NestedPropertyEditor 上で value / description が表示される
- [x] 既存の uncertainty があれば上書き（1プロパティに1件のみ保持）

## 実装ステップ

### Phase 1: handleCriteriaAssign 実装
- [ ] `TemplateEditorDialog.tsx` の `handleCriteriaAssign` を実装
  - `criteriaTargetProperty.propertyKey` で対象 property を特定
  - `properties` state を再帰検索して対象ノードを見つける
  - children から既存 `uncertainty` ノードを除去（上書き用）
  - 新しい `uncertainty` PropertyData ノードを children に追加
  - `elements.value` = 定量値 or 定性レベル文字列
  - `elements.description` = コメント
  - `attributes.criteriaKey` = 不確かさ基準の key
  - `setCriteriaSelectorOpen(false)` でモーダルを閉じる

## 変更ファイル
1. `frontend/src/components/editorv2/TemplateEditorDialog.tsx` — `handleCriteriaAssign` 実装

## 承認記録
- **承認日時**: 2026-07-07 09:50
