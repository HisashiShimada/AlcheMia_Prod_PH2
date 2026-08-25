# タスク計画書: 名前空間ダイアログUI修正

## メタデータ
- **作成日時**: 2026-07-03 16:10
- **タスクID**: 名前空間ダイアログUI修正
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要
`NamespaceMaimlEditor`（このMaiMLファイルに設定されている名前空間ダイアログ）に対して複数のUI修正を行う。

## 実装ステップ
- [x] タスク計画書作成
- [ ] `uncertainty-scope.json` のURI値変更（会社・研究開発部・材料グループ）
- [ ] `NamespaceMaimlEditor.tsx` グローバルセクション削除
- [ ] `NamespaceMaimlEditor.tsx` ダイアログ上部に検索欄追加
- [ ] `NamespaceMaimlEditor.tsx` 個人セクションをログインユーザーのみに絞り込み

## 変更ファイル
1. `frontend/mock/namespace/uncertainty-scope.json` — URI値変更
2. `frontend/src/components/namespace/NamespaceMaimlEditor.tsx` — UI変更
