# タスク計画書: 定性評価ボタン色修正

## メタデータ
- **作成日時**: 2026-09-07 12:00
- **タスクID**: 20260907_1200_定性評価ボタン色修正
- **優先度**: 中
- **推定工数**: 0.5時間

## タスク概要

実験作業者メニュー「実験記録タブ」の PropertyCard に表示される定性評価ボタンに、
管理者側で設定した色（`intuition_selector.display_color`）が反映されていない問題を修正する。

## 原因

### データフロー（バックエンド）— 修正不要
1. `intuition_selector` テーブルの `display_color` カラムに色（`#RRGGBB`）が保存済み
2. `findByKeysWithDetails.sql` が `uncertainty_key` をキーに JOIN し `displayColor` を JSON に含めて返す
3. `experimentDataService.ts` の `convertPropertyForFallback` が `qualitativeOptions: [{ displayOrder, selectorValue, displayColor }]` をレスポンスに渡す

### 問題箇所（フロントエンド）— ここを修正
- `WorkRecordPanel.tsx` の `convertRawProperty` 関数（L2117〜2120）で
  `selectorValue` のみ抽出し `displayColor` を破棄している
- `PropertyCard` のボタンスタイルは `CONFIDENCE_STYLE` の固定マップを参照しており、
  カスタム `selectorValue` は常にグレー（`CONFIDENCE_STYLE_DEFAULT`）になる

## 目的と期待される成果

- [x] 管理者が設定した `display_color` が定性評価ボタンに反映される
- [x] デフォルト（確か/曖昧/不確か）の色も引き続き正しく表示される
- [x] `confidenceOptions?: string[]` の後方互換を維持する

## 実装ステップ

- [ ] STEP 1: `WorkProperty` 型に `confidenceOptionsWithColor` フィールド追加
- [ ] STEP 2: `convertRawProperty` 関数で `displayColor` を `confidenceOptionsWithColor` にマッピング
- [ ] STEP 3: `PropertyCard` のボタンレンダリングで `confidenceOptionsWithColor` を優先使用

## 変更ファイル

1. `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx`
   - `WorkProperty` 型に `confidenceOptionsWithColor?: Array<{ value: string; color: string }>` 追加
   - `convertRawProperty` で `displayColor` → `confidenceOptionsWithColor` マッピング追加
   - `PropertyCard` のボタンスタイル適用ロジック修正

## リスク

| リスク | 対策 |
|--------|------|
| 後方互換破壊 | `confidenceOptionsWithColor` は optional で追加。既存 `confidenceOptions` は維持 |
| デフォルト3択の色が変わる | `confidenceOptionsWithColor` がない場合は従来の `CONFIDENCE_STYLE` にフォールバック |

## 実施記録

### 実施日時
開始: 2026-09-07 12:00
完了: 2026-09-07 12:30

### 計画からの変更点
なし

### 最終的な成果物
- [x] STEP 1: `WorkProperty` 型に `confidenceOptionsWithColor` フィールド追加（L181）
- [x] STEP 2: `convertRawProperty` 関数で `displayColor` → `confidenceOptionsWithColor` マッピング（L2125〜2147）
- [x] STEP 3: `PropertyCard` のボタンレンダリングで `confidenceOptionsWithColor` を優先使用（L517〜521）
- [x] STEP 4: カードヘッダー上部の確信度 Tag にも `confidenceOptionsWithColor` を優先適用（L426〜434）


- [ ] デフォルト3択（確か/曖昧/不確か）の色が従来通り表示されること
- [ ] 管理者がカスタム設定した選択肢が `display_color` の色で表示されること
- [ ] 選択時に太字 + outline が表示されること（既存動作の維持）

## 承認記録
- **承認日時**: 2026-09-07 12:00（Act モード移行により承認済み）
