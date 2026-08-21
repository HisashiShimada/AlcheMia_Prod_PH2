# タスク計画書: テンプレート不確かさ初期反映修正

## メタデータ
- **作成日時**: 2026-08-04 09:31
- **タスクID**: template-uncertainty-default
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要
テンプレート編集時に設定した不確かさ（uncertainty）の値が、実験計画詳細指示モーダルを初回開いた際に反映されない問題を修正する。

MAIMLテンプレートの `property.uncertainty[]` はバックエンドで `TemplateField.defaultUncertainties` に変換されているが、フロントエンドの型定義・ヘルパー関数・ダイアログ初期化処理に対応する実装がなく、初回表示時の `assignedUncertainty` が常に `{}` になっていた。

## 目的と期待される成果
- [x] テンプレート編集で設定した不確かさ値が、実験計画詳細指示モーダルの初回表示時に自動的に表示される
- [x] 保存済みデータがある場合は従来通りそちらが優先される（既存動作は変更しない）

## 実装ステップ

### Phase 1: 型定義追加
- [x] `frontend/src/types/experimentPlan.ts` の `TemplateField` に `defaultUncertainties` フィールドを追加

### Phase 2: ヘルパー関数追加
- [x] `frontend/src/utils/experimentPlanHelpers.ts` に `buildDefaultAssignedUncertainty()` 関数を追加

### Phase 3: ダイアログ初期化処理修正
- [x] `frontend/src/components/project/ExperimentPlanDialog.tsx` の初回初期化ブロックで `buildDefaultAssignedUncertainty()` を使用して `assignedUncertainty` を設定

## 変更ファイル
1. `frontend/src/types/experimentPlan.ts` - `TemplateField` に `defaultUncertainties` を追加
2. `frontend/src/utils/experimentPlanHelpers.ts` - `buildDefaultAssignedUncertainty()` 関数追加
3. `frontend/src/components/project/ExperimentPlanDialog.tsx` - 初期化処理修正

## 承認記録
- **承認日時**: 2026-08-04 09:31
