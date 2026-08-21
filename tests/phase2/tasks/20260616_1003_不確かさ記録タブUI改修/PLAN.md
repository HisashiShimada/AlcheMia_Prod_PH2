# タスク計画書: 不確かさ記録タブ UI 改修

## メタデータ
- **作成日時**: 2026-06-16 10:03
- **タスクID**: 不確かさ記録タブUI改修
- **優先度**: 中
- **推定工数**: 1.5時間

## タスク概要
実験作業者メニューの「不確かさ記録」タブ内を左右2カラムのレイアウトに変更する。
- 左パネル：実験記録タブで保存された property/content 値の一覧（上から順に選択可能）
- 右パネル：左パネルで選択中の property/content を対象として `UncertaintyCriteriaSelectorModal` の内容をダイアログではなくインラインでそのまま表示

## 目的と期待される成果
- [ ] 左パネルに実験記録の property/content 値の一覧が表示される
- [ ] 左パネルで行を選択すると右パネルの不確かさ基準セレクタが更新される
- [ ] `UncertaintyCriteriaSelectorModal` の中身がダイアログなしで右パネルにそのまま表示される

## 実装ステップ
- [ ] タスク計画書作成
- [ ] `UncertaintyCriteriaSelectorPanel.tsx` 新規作成（Modal なしインライン版）
- [ ] `UncertaintyRecordTab.tsx` 新規作成（左右パネルレイアウト）
- [ ] `ExperimentWorkerMenu.tsx` 修正（タブ key='5' に UncertaintyRecordTab を設定）

## 変更ファイル
1. `frontend/src/components/uncertainty/UncertaintyCriteriaSelectorPanel.tsx` - 新規作成
2. `frontend/src/components/ExperimentWorker/UncertaintyRecordTab.tsx` - 新規作成
3. `frontend/src/components/menus/ExperimentWorkerMenu.tsx` - タブ key='5' を修正

## 承認記録
- **計画書提示日時**: 2026-06-16 10:03
- **承認日時**: 2026-06-16 10:08
