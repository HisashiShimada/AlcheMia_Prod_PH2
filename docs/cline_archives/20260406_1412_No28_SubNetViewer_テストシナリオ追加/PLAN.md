# タスク計画書: No.28 SubNetViewer テンプレート表示修正 テストシナリオ追加

## メタデータ
- **作成日時**: 2026-04-06 14:12
- **タスクID**: no28-subnetviewer-test-scenarios
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

No.28（SubNetViewerのtemplateMapsキー不一致修正）の対応内容に対するE2Eテストシナリオを `tests/e2e/test-scenarios/4_experiment_admin.md` に追加する。

## 対応内容の概要（docs/改善仕様調査/No.28/result.md より）

- Fix1: PetriNetViewer.tsx — placesForSubNet に uuid/description を追加
- Fix2: SubNetViewer.tsx / index.js — templateMap参照キーをplaceId優先に変更
- Fix3: SubNetViewer.tsx — extractTemplateInfo() 新規実装
- Fix4: PropertyViewer.tsx — テンプレートタブ専用カラム追加
- Fix5: PropertyViewerWithSelection.tsx — Object型値のフラット展開表示
- Fix6: PetriNetViewer.tsx — Placeノードクリックでテンプレート要素から直接プロパティ取得
- Fix7: PropertyViewerWithSelection.tsx — テンプレートタブ専用カラム対応
- Fix8: データタブにMAIML `<data><results>` の実験結果値を表示

## 変更ファイル
1. `tests/e2e/test-scenarios/4_experiment_admin.md` — 4-17 グループ追加

## 実装ステップ
- [ ] 4_experiment_admin.md の スコープ内テーブルに 4-17 行を追加
- [ ] 4-17 シナリオ詳細一覧を追記
