# タスク計画書: 実験指示タブ編集ダイアログデータ未表示修正

## メタデータ
- **作成日時**: 2026-07-24 09:48
- **タスクID**: 実験指示タブ編集ダイアログデータ未表示修正
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

プロジェクト管理タブ内の実験指示タブにて「実験指示を編集」ボタンを押下すると「実験計画詳細指示」ダイアログが展開されるが、データ（トランジション一覧・テンプレート等）が表示されない問題を修正する。

## 原因

### 原因1（最重要）: `dialogDataLoading` がUIスピナーに接続されていない

`ExperimentPlanDialog.tsx` では API 取得中フラグ `dialogDataLoading` が存在するが、左パネル（トランジション一覧）のスピナーに接続されていない。そのため API レスポンス待ち中も `transitions = []` として Empty コンポーネントが表示され続ける。

### 原因2（重要）: 初回マウント時に2つの `useEffect` が二重実行される

- **Effect 1** (`open/projectId/methodId/message` 依存): 全状態リセット → `getPlanDialogData` + `getExperimentPlans` の両方を実行
- **Effect 2** (`methodId` 依存): `methodId` 変更専用だが、マウント時も実行されてしまう → `getPlanDialogData` のみ実行（`getExperimentPlans` は呼ばれない）

Effect 2 が Effect 1 の後で完了した場合、`tabDataMap`（既存の実験計画データ）が正しく復元されない競合状態が発生する。

### 原因3（補助的）: API エラー時の無言の空表示

`getPlanDialogData` や `getExperimentPlans` がエラーになった場合でも `dialogData = null` → `transitions = []` → Empty 表示のまま。

## 実装ステップ

- [x] タスク計画書作成
- [ ] `ExperimentPlanDialog.tsx` 修正
  - [ ] 対応1: トランジション一覧カードに `dialogDataLoading` スピナーを追加
  - [ ] 対応2: Effect 2 に `isFirstMountRef` を追加して初回マウント時の二重実行を防止
- [ ] 動作確認

## 変更ファイル

1. `frontend/src/components/project/ExperimentPlanDialog.tsx` - 上記2点の修正

## 承認記録
- **承認日時**: 2026-07-24 09:48（計画書作成と同時に実装着手）
