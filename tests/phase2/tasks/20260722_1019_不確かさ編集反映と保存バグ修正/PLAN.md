# タスク計画書: テンプレート編集の不確かさ MaiML 保存バグ修正

## メタデータ
- **作成日時**: 2026-07-22 13:05
- **タスクID**: uncertainty-save-fix
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

実験フロー編集のテンプレート編集で property/content に付与した不確かさが、MaiML 保存時にファイルに保存されないバグを修正する。

## 原因

### 原因① `convertPropertyDataToContentsArray`（templateConverter.ts）
Content の children に `tagName === 'uncertainty'` があっても `content.uncertainty` に変換されない。

### 原因② `buildContentXML`（reactFlowToMaiml.ts）
`content.uncertainty` があっても XML 出力処理が存在しない。

※ Property 側（`buildPropertyXML`、`convertPropertyDataToPropertiesArray`）は正常に実装済み。

## 実装ステップ

- [x] 原因調査完了
- [ ] `templateConverter.ts` の `convertPropertyDataToContentsArray` を修正
- [ ] `reactFlowToMaiml.ts` の `buildContentXML` を修正

## 変更ファイル

1. `frontend/src/utils/templateConverter.ts` - `convertPropertyDataToContentsArray` に uncertainty children 変換処理を追加
2. `frontend/src/utils/reactFlowToMaiml.ts` - `buildContentXML` に `content.uncertainty` の XML 出力処理を追加

## 承認記録
- **承認日時**: 2026-07-22 13:05
