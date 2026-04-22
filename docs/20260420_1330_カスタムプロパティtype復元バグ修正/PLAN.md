# タスク計画書: カスタムプロパティ type 復元バグ修正

## メタデータ
- **作成日時**: 2026-04-20 13:30
- **タスクID**: custom-property-type-restore-fix
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

実験作業者メニューでカスタムプロパティを登録する際、`type` を設定して保存した後、再度カスタムプロパティを確認すると `stringType` になってしまうバグを修正する。

## 目的と期待される成果

### 目的
カスタムプロパティのデータ復元処理において、`validTypes` リストが不完全なため、リストに含まれない型が `stringType` にフォールバックしてしまう問題を解消する。

### 期待される成果
- [ ] 任意の `CustomPropertyType`（property 系 26種）を設定して保存後、再表示しても型が保持されること
- [ ] 既存の動作（`stringType` / `floatType` / `intType` / `booleanType` / `dateType` / `dateTimeType`）に影響がないこと

## 原因詳細

`DataRecordDialog.tsx` のカスタムプロパティ復元処理（774〜780行目付近）において、`validTypes` に property 系の一部の型しか含まれていない。

```typescript
// 修正前（6種類のみ）
const validTypes: CustomPropertyType[] = [
  'stringType', 'floatType', 'intType', 'booleanType', 'dateType', 'dateTimeType',
];
```

UI のセレクトボックスでは 26種類の property 系型が選択可能だが、復元時のバリデーションが 6種類しかカバーしていないため、それ以外の型（`doubleType`、`tokenType`、`longType` 等）を選択して保存すると、復元時に `stringType` にフォールバックしてしまう。

## 実装ステップ

- [x] バグ原因の調査・特定
- [ ] `DataRecordDialog.tsx` の `validTypes` を全 property 系型に拡充
- [ ] 動作確認

## 変更ファイル

1. `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` - `validTypes` 配列を修正（1箇所）

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 既存の復元処理への影響 | 低 | 低 | `validTypes` の拡充のみであり、既存の 6種は引き続き含まれるため影響なし |

## 承認記録

- **計画書提示日時**: 2026-04-20 13:30
- **承認日時**: 2026-04-20 13:30
