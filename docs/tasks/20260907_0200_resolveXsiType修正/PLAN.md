# タスク計画書: resolveXsiType 修正

## メタデータ

- **作成日時**: 2026-09-07 02:00
- **タスクID**: 20260907_0200_resolveXsiType修正
- **優先度**: 中
- **推定工数**: 30分

---

## 1. タスク概要

`WorkRecordPanel.tsx` 内の `resolveXsiType` 関数が、一部の数値型（`longType` / `shortType` / `byteType` / `decimalType` および各 ListType）を `StringValue` に誤変換している。これを修正し、すべての数値型を適切に `FloatValue` または `IntegerValue` に変換する。

---

## 2. 現状の問題

```ts
function resolveXsiType(xsiType: string | undefined): WorkProperty['xsiType'] {
  if (!xsiType) return 'StringValue';
  const lower = xsiType.toLowerCase();
  if (lower.includes('double') || lower.includes('float')) return 'FloatValue';
  if (lower.includes('int'))    return 'IntegerValue';
  return 'StringValue';  // ← long / short / byte / decimal がここに落ちる
}
```

### 誤変換される型

| xsi:type | 期待 | 現状 |
|---|---|---|
| `longType` / `longListType` | `IntegerValue` | `StringValue` ❌ |
| `shortType` / `shortListType` | `IntegerValue` | `StringValue` ❌ |
| `byteType` / `byteListType` | `IntegerValue` | `StringValue` ❌ |
| `unsignedLongType` / `unsignedLongListType` | `IntegerValue` | `StringValue` ❌ |
| `unsignedShortType` / `unsignedShortListType` | `IntegerValue` | `StringValue` ❌ |
| `unsignedByteType` / `unsignedByteListType` | `IntegerValue` | `StringValue` ❌ |
| `decimalType` / `decimalListType` | `FloatValue` | `StringValue` ❌ |

### 影響

- `StringValue` になると実績値入力が `InputNumber` ではなく `Input`（テキスト）になる
- 不確かさ判定自体は壊れないが、UX として InputNumber が表示されるべき型でテキスト入力になる

---

## 3. 修正方針

`xsiTypeAttributes.ts` の `MAIML_PROPERTY_TYPES` / `isUnitAllowed` / `isNumericXsiType` / `isIntegerXsiType` が既に整備されているので、`xsiTypeValidator.ts` の既存ユーティリティを活用する。

`xsiTypeValidator.ts` に既に以下が定義されている:
- `isNumericXsiType(xsiType)` → 整数型・実数型どちらも true
- `isIntegerXsiType(xsiType)` → 整数型のみ true

これを使って `resolveXsiType` を以下のように修正する:

```ts
import { isNumericXsiType, isIntegerXsiType } from '@/utils/xsiTypeValidator';

function resolveXsiType(xsiType: string | undefined): WorkProperty['xsiType'] {
  if (!xsiType) return 'StringValue';
  // リスト型は末尾の "ListType" を除いて基底型で判定
  const base = xsiType.replace(/ListType$/i, 'Type');
  if (isIntegerXsiType(base)) return 'IntegerValue';
  if (isNumericXsiType(base)) return 'FloatValue';
  return 'StringValue';
}
```

---

## 4. 実装ステップ

- [ ] `WorkRecordPanel.tsx` に `isNumericXsiType` / `isIntegerXsiType` を import 追加
- [ ] `resolveXsiType` 関数を修正
- [ ] TypeScript コンパイルエラーなし確認（`tsc --noEmit`）

---

## 5. 影響範囲

| ファイル | 変更内容 | 影響度 |
|---------|---------|--------|
| `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` | `resolveXsiType` 修正 + import 追加 | 低（数値型のUIが InputNumber になる方向の修正） |

---

## 6. 承認記録

- **計画書提示日時**: 2026-09-07 02:00
- **承認日時**: 2026-09-07 02:00
- **承認者コメント**: 承認済み

---

## 7. 実施記録

### 実施日時
開始: 2026-09-07 02:00
完了: 2026-09-07 02:00

### 最終的な成果物
- [x] `WorkRecordPanel.tsx` に `isNumericXsiType` / `isIntegerXsiType` を import 追加
- [x] `resolveXsiType` を `replace(/ListType$/i, 'Type')` で基底型正規化 + `isIntegerXsiType`/`isNumericXsiType` による判定に置き換え
- [x] `tsc --noEmit` によるコンパイルエラーゼロを確認
