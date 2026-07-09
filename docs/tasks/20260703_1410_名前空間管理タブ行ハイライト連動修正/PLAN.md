# タスク計画書: 名前空間管理タブ 行ハイライト・データ連動修正

## メタデータ
- **作成日時**: 2026-07-03 14:10
- **タスクID**: 名前空間管理タブ行ハイライト連動修正
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要
実験管理者メニューの名前空間管理タブで、左ペインのツリーでグローバル・個人を選択したとき：
1. 選択した行がハイライトされるように修正
2. 選択した行（グローバル・個人）に登録されているデータが右ペインに表示されるよう修正

## 実装ステップ
- [ ] UncertaintyManagement.tsx: selectedKeys 条件を修正（常にハイライト）
- [ ] UncertaintyManagement.tsx: PrefixManagement に selectedNsKey を渡す
- [ ] PrefixManagement.tsx: selectedNsKey props 追加 + データフィルタリング実装

## 変更ファイル
1. `frontend/src/components/uncertainty/UncertaintyManagement.tsx`
2. `frontend/src/components/namespace/PrefixManagement.tsx`

## 承認記録
- **承認日時**: 2026-07-03 14:10
