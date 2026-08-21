# タスク計画書: チェックアウト時propertyValue書き込み修正

## メタデータ
- **作成日時**: 2026-08-05 13:13
- **タスクID**: checkout-property-value-fix
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

チェックアウト時に実験計画詳細指示ダイアログ内の画像のValueとなる値（例: "55"）が
チェックアウト時のMaiMLファイルのresults層に記載されない問題を修正する。

原因: 実験管理者画面メニュー内の「タスク情報の保存」時に、
`experiment_plan`テーブルの`planned_values`カラム内に
property値のValueが入っていない。

## 原因特定

### 根本原因1: `tabDataToTransitionValues` の null 値フィルタ漏れ

**ファイル**: `frontend/src/services/experimentPlanApiService.ts` (L140-144)

```typescript
// 現在（バグあり）
for (const [key, value] of Object.entries(tabData.templateValues)) {
  if (value !== undefined && value !== '') {
    values[key] = String(value);
  }
}
```

Ant Design の InputNumber は値をクリアすると `null` を返すことがある。
- `null !== undefined` → true（条件通過）
- `null !== ''` → true（条件通過）
- `String(null)` → `"null"` → DBに文字列 `"null"` が保存される可能性

### 根本原因2: `transitionValuesToTabData` の型チェックが文字列のみ

**ファイル**: `frontend/src/services/experimentPlanApiService.ts` (L95-99)

```typescript
// 現在（バグあり）
for (const [key, value] of Object.entries(transValues)) {
  if (!reservedKeys.has(key) && typeof value === 'string') {
    templateValues[key] = value;
  }
}
```

DBのJSONBカラムから返ってきた値が数値型 (`number`) または論理型 (`boolean`) の場合、
`typeof value === 'string'` 条件を満たさないためスキップされてしまう。
→ DBに `55`（数値）として格納されていると、`templateValues` に復元されない。

## 実装ステップ

- [x] 原因調査
- [ ] PLAN.md 作成
- [ ] `experimentPlanApiService.ts` 修正1: `tabDataToTransitionValues` の null チェック追加
- [ ] `experimentPlanApiService.ts` 修正2: `transitionValuesToTabData` の型チェック拡張
- [ ] 動作確認

## 変更ファイル

1. `frontend/src/services/experimentPlanApiService.ts` - 上記2箇所の修正

## 承認記録

- **承認日時**: 2026-08-05 15:32
