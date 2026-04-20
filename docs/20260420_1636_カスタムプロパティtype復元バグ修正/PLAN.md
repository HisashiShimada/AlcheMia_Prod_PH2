# タスク計画書: カスタムプロパティ type 復元バグ修正

## メタデータ
- **作成日時**: 2026-04-20 16:36
- **タスクID**: custom-property-type-restore-fix
- **優先度**: 高
- **推定工数**: 0.5時間

## 1. タスク概要

実験作業者メニューでカスタムプロパティを登録する際、`type` を設定して保存した後、再度カスタムプロパティを確認すると `stringType` になってしまうバグを修正する。

## 2. 目的と期待される成果

### 目的
カスタムプロパティのデータ復元処理において、`validTypes` リストが不完全なため、リストに含まれない型が `stringType` にフォールバックしてしまう問題を解消する。

### 期待される成果
- [ ] 任意の `CustomPropertyType`（property 系28種）を設定して保存後、再表示しても型が保持されること
- [ ] 既存の動作（`stringType` / `floatType` / `intType` / `booleanType` / `dateType` / `dateTimeType`）に影響がないこと

## 3. 原因詳細

`DataRecordDialog.tsx` の779〜781行目（カスタムプロパティ復元処理）において、`validTypes` に6種類しか含まれていない。

```typescript
// 修正前（6種類のみ）
const validTypes: CustomPropertyType[] = [
  'stringType', 'floatType', 'intType', 'booleanType', 'dateType', 'dateTimeType',
];
```

UI のセレクトボックスでは property 系28種類の型が選択可能（`experimentWorker.ts` の `CustomPropertyType` 参照）だが、復元時のバリデーションが6種類しかカバーしていないため、それ以外の型（`doubleType`、`tokenType`、`longType` 等）を選択して保存すると、復元時に `stringType` にフォールバックしてしまう。

## 4. 実装ステップ

- [ ] `DataRecordDialog.tsx` の `validTypes` を全 property 系型（28種）に拡充

## 5. 変更ファイル

### 修正ファイル
1. `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx`
   - 779〜781行目の `validTypes` 配列を6種類から28種類に拡充（1箇所のみ）

### 修正内容
```typescript
// 修正後（全 property 系 28種類）
const validTypes: CustomPropertyType[] = [
  'stringType', 'tokenType', 'stringEnumType',
  'intType', 'longType', 'shortType', 'byteType',
  'unsignedIntType', 'unsignedLongType', 'unsignedShortType', 'unsignedByteType',
  'floatType', 'doubleType', 'decimalType',
  'booleanType',
  'dateType', 'dateTimeType',
  'stringListType', 'intListType', 'longListType', 'shortListType', 'byteListType',
  'unsignedIntListType', 'floatListType', 'doubleListType', 'decimalListType',
  'booleanListType', 'dateTimeListType',
];
```

## 6. リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 既存の復元処理への影響 | 低 | 低 | `validTypes` の拡充のみであり、既存の6種は引き続き含まれるため影響なし |

## 7. テスト計画

### 手動テスト
- [ ] `doubleType` / `tokenType` / `longType` 等（旧 validTypes に含まれなかった型）を選択して保存 → 再表示で型が保持されること
- [ ] 既存の `stringType` / `floatType` / `intType` / `booleanType` / `dateType` / `dateTimeType` を設定して保存 → 再表示で型が保持されること（デグレなし確認）

## 8. 承認記録

- **計画書提示日時**: 2026-04-20 16:36
- **承認日時**: 
