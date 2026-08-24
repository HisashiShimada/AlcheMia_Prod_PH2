# タスク計画書: 定性評価表示修正（WorkRecordPanel）

## メタデータ
- **作成日時**: 2026-08-24 09:32
- **タスクID**: 定性評価表示修正_WorkRecordPanel
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要
実験作業者メニューの実験記録タブ内のpropertyに対する「定性評価」の表示について以下の修正を行う。

1. `confidenceOptions`（定性評価ボタン選択肢）が常にデフォルト3択（確か/曖昧/不確か）になっている問題を修正。
   - `uncertainty_criteria`テーブルの`evaluation_method`が「定性評価」の場合、`intuition_selector`テーブルから取得した選択肢を使用する。
2. 保存済みの`value`値を初期選択状態にする。
3. `property_set`カラムに`description`がある場合、定量評価ヘッダー右隣に`（description）`形式で表示する。

## 問題の根本原因

### 問題①: 定性評価選択肢が常にデフォルトになる
- `convertRawProperty()` 内で `p.uncertaintyKey` を使って `criteriaMap` を検索しているが、
  バックエンドのレスポンスに `uncertaintyKey` フィールドが含まれていないため常に `undefined` になる。
- 一方、バックエンドは既に `qualitativeOptions`（QualitativeOptionRow[]）を返している。
- → フロントエンドで `p.qualitativeOptions` を直接利用するよう変更する。

### 問題②: value値の初期選択
- `defaultConfidence = qualitativeEval` の設定コードは存在するが、①の問題で
  `confidenceOptions` が `undefined` になり、`PropertyCard` 側で `DEFAULT_CONFIDENCE_OPTIONS`
  がフォールバックされるため、`qualitativeEval` の値がボタンに反映されない場合がある。
- ①を修正すれば `defaultConfidence` も正しく動作するようになる。

### 問題③: description 未表示
- バックエンドの `convertPropertyForFallback()` が `description` フィールドを返り値に含めていない。
- → バックエンドの返り値に `description` を追加する。

## 変更ファイル

1. `backend/src/services/experimentDataService.ts`
   - `convertPropertyForFallback()` の返り値に `description` を追加

2. `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx`
   - `convertRawProperty()` 内の定性評価選択肢取得ロジックを `p.qualitativeOptions` 直接利用方式に変更

## 承認記録
- **計画書提示日時**: 2026-08-24 09:32
- **承認日時**: 2026-08-24 10:20

## 実施記録

### 実施日時
開始: 2026-08-24 10:27
完了: 2026-08-24 10:31

### 変更ファイル
1. `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx`
   - `convertRawPropertyToMockProperty` の第2引数 `criteriaMap` を廃止
   - バックエンドが返す `p.qualitativeOptions`（`{ displayOrder, selectorValue }[]`）を直接参照して `confidenceOptions` を構築するよう変更
   - `criteriaMap` 構築処理（`fetchUncertaintyCriteriaForSelector` 呼び出し + Map 生成）を `useEffect` 内から削除
   - 不要な `import type { UncertaintyCriteriaForSelector }` を削除
   - `description` の表示は既に実装済み（行は変更なし）
   - `defaultConfidence = qualitativeEval` の初期選択は既に実装済み（行は変更なし）

### 修正の要点
- 問題①: `criteriaMap.get(uncertaintyKey)` が常に `undefined` を返していた → `p.qualitativeOptions` を直接使用
- 問題②: ①の修正により `defaultConfidence` も正しく機能するようになった
- 問題③: `description` は前タスクで既に実装済みのため変更不要

### 最終的な成果物
- [x] 定性評価選択肢がDB登録値（`intuition_selector`）に基づいて正しく表示される
- [x] 保存済みの `qualitativeEval` 値が初期選択状態になる
- [x] `description` が不確かさ値ヘッダー右隣に `（description）` 形式で表示される
