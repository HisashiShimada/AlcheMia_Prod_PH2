# タスク計画書: データ記録プロパティカード形式UI実装

## メタデータ
- **作成日時**: 2026-08-06 10:44
- **タスクID**: データ記録プロパティカードUI
- **優先度**: 高
- **推定工数**: 4時間

## タスク概要

実験作業者メニュー「実験記録タブ」の DataRecordDialog において、プロパティ表示を現在の「単純なテキストエリア1つ」から、右画像のようなカード形式（指定値・許容誤差値・不確かさ説明・実績値・定性評価・定量評価を含む）に全面刷新する。

## 目的と期待される成果

- [ ] 各プロパティがカード形式（Card コンポーネント）で表示される
- [ ] カード上部に「指定値」「許容誤差値」「不確かさ説明」が読み取り専用で表示される（値がなければ空欄/ハイフン）
- [ ] カード中央に「実績値」入力フィールドが表示される（xsiType別入力UIを流用）
- [ ] カード下部に「定性評価」ボタン群が表示される（デフォルト: 不確か・曖昧・確か）
- [ ] カード下部に「定量評価」行が追加・削除できる（評価方法プルダウン＋閾値入力）
- [ ] プロパティが横3列（span=8）でグリッド表示される（propertyListType のみ全幅 span=24）
- [ ] 定性評価・定量評価の値が template_data.property_set に保存・復元される

## 実装ステップ

### Phase 1: 型定義追加
- [ ] `frontend/src/types/experimentWorker.ts` に `QuantitativeEval` インターフェースを追加
- [ ] `Property` インターフェースに `plannedValue`, `toleranceValue`, `uncertaintyNote`, `qualitativeEval`, `qualitativeOptions`, `quantitativeEvals` フィールドを追加

### Phase 2: State 管理追加
- [ ] `DataRecordDialog.tsx` に定性評価 State（`propertyQualitativeEvals`）を追加
  - 型: `Record<string, Record<string, string>>` （templateId → propertyKey → 選択値）
- [ ] `DataRecordDialog.tsx` に定量評価 State（`propertyQuantitativeEvals`）を追加
  - 型: `Record<string, Record<string, QuantitativeEval[]>>` （templateId → propertyKey → 評価行[]）

### Phase 3: カードUIコンポーネント実装
- [ ] `renderPropertyInput` を `renderPropertyCard` にリネーム・再実装
  - ヘッダー: プロパティ名・型・単位・定性評価バッジ（選択済みの場合のみ）
  - 上段: 「指定値」「許容誤差値」読み取り専用テキスト（2列）
  - 中段: 「不確かさ説明」読み取り専用テキスト（全幅）
  - 下段: 「実績値」入力フィールド（xsiType別、既存 renderPropertyInput の中身を流用）
  - 定性評価: `Button.Group`（不確か/曖昧/確か のトグルボタン）
  - 定量評価: 動的行リスト（評価方法プルダウン＋閾値入力＋削除ボタン＋追加ボタン）
- [ ] 定性評価の選択肢は `property.qualitativeOptions` があればそれを使用、なければ `['uncertain', 'ambiguous', 'certain']` をデフォルト表示

### Phase 4: 保存・復元処理の拡張
- [ ] `handleSaveTemplate` で定性評価・定量評価を `property_set.properties[i]` の追加フィールドとして保存
  - 各 property に `qualitativeEval` / `quantitativeEvals` フィールドを追記
- [ ] データ復元処理（useEffect 内）で `properties[i].qualitativeEval` / `properties[i].quantitativeEvals` を読み取り State に設定

### Phase 5: 多言語対応
- [ ] `frontend/src/locales/ja.json` に以下のキーを追加
  - `dataRecordDialog.plannedValue`（指定値）
  - `dataRecordDialog.toleranceValue`（許容誤差値）
  - `dataRecordDialog.uncertaintyNote`（不確かさ説明）
  - `dataRecordDialog.measuredValue`（実績値）
  - `dataRecordDialog.qualitativeEval`（定性評価）
  - `dataRecordDialog.quantitativeEval`（定量評価）
  - `dataRecordDialog.evalMethod`（評価方法）
  - `dataRecordDialog.threshold`（閾値）
  - `dataRecordDialog.certain`（確か）
  - `dataRecordDialog.ambiguous`（曖昧）
  - `dataRecordDialog.uncertain`（不確か）
  - `dataRecordDialog.addEval`（＋ 追加）
- [ ] `frontend/src/locales/en.json` に同キーの英語版を追加

## 変更ファイル

| ファイル | 変更種別 | 内容 |
|---|---|---|
| `frontend/src/types/experimentWorker.ts` | 修正 | `QuantitativeEval` 型追加・`Property` に評価フィールド追加 |
| `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` | 修正 | `renderPropertyInput` → カード形式 UI に全面刷新・State 追加・保存/復元処理拡張 |
| `frontend/src/locales/ja.json` | 修正 | 評価関連キー追加 |
| `frontend/src/locales/en.json` | 修正 | 評価関連キー追加（英語） |

## 技術仕様

### カードレイアウト詳細

```
┌──────────────────────────────────────────────────────┐
│ [プロパティ名] [xsiType] [単位]     [定性評価バッジ] │
├────────────────────────┬─────────────────────────────┤
│ 指定値                 │ 不確かさ説明                │
│ [値 or —]             │ [テキスト or —]             │
├────────────────────────┤                             │
│ 許容誤差値             │                             │
│ [値 or —]             │                             │
├────────────────────────┴─────────────────────────────┤
│ 実績値                                               │
│ [xsiType別入力フィールド]                [単位]      │
├──────────────────────────────────────────────────────┤
│ 定性評価 [不確か] [曖昧] [確か]                      │
├──────────────────────────────────────────────────────┤
│ 定量評価 [評価方法▼] [閾値入力] [🗑]               │
│          [＋ 追加]                                   │
└──────────────────────────────────────────────────────┘
```

### 定性評価の仕様
- デフォルト選択肢: 「不確か (uncertain)」「曖昧 (ambiguous)」「確か (certain)」
- `property.qualitativeOptions` が指定されている場合はその選択肢を優先
- 選択済みの場合はカードヘッダーにバッジ表示（確か=緑、曖昧=橙、不確か=赤）
- 未選択の場合はバッジなし

### 定量評価の仕様
- 評価方法: 不確かさ基準一覧の `definition_name` をプルダウン選択肢として表示
- 閾値: 数値入力フィールド
- 行の追加・削除が可能
- データは `quantitativeEvals: [{ id, method, threshold }]` 形式で保存

### 保存データ構造（property_set.properties[i] への追記）
```json
{
  "key": "temperature",
  "xsiType": "floatType",
  "value": "25.3",
  "units": "℃",
  "qualitativeEval": "certain",
  "quantitativeEvals": [
    { "id": "uuid", "method": "誤差値", "threshold": "5" }
  ]
}
```

## リスク

| リスク | 対策 |
|---|---|
| DataRecordDialog.tsx が3241行の大規模ファイルで修正箇所が広範囲 | replace_in_file で局所的に変更・各変更後にユーザー確認 |
| 定量評価の不確かさ基準一覧取得 | 現時点は API 呼び出しなしでモック選択肢（誤差値・標準偏差など）を使用 |
| 保存・復元処理が複雑 | 既存の properties 配列操作パターンを踏襲 |

## 承認記録
- **計画書提示日時**: 2026-08-06 10:44
- **承認日時**: （承認待ち）
