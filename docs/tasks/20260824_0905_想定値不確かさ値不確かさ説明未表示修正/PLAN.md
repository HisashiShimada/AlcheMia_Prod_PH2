# タスク計画書: 想定値・不確かさ値・不確かさ説明未表示修正

## メタデータ
- **作成日時**: 2026-08-24 09:05
- **タスクID**: 想定値不確かさ値不確かさ説明未表示修正
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

実験作業者メニューの実験記録タブに表示されるトランジションカードで、
「想定値」「不確かさ値」「不確かさ説明」の欄が空（「未設定」「—」「—」）のまま
表示されている問題を修正する。

## 根本原因

`WorkRecordPanel.tsx` の `buildTransitions()` 内で `__uncertainty__` マップから
不確かさ情報を取り出す処理に **2つのバグ** がある。

### バグ①：Array.isArray 条件が常に false になりブロック全体がスキップ

```typescript
// 現状（バグあり）
const uncEntry = uncertaintyMap[propKey];
if (uncEntry && typeof uncEntry === 'object' && !Array.isArray(uncEntry)) {
  // ← AssignPayload[] (配列) で格納されているため !Array.isArray が常に false
  // → このブロックには絶対に入らない
}
```

`experimentPlan.ts` の `assignedUncertainty` は `Record<string, AssignPayload[]>` 型（配列）で
格納されているため、`!Array.isArray(uncEntry)` が常に `false` になり、
不確かさ情報が一切 `p` にマージされない。

### バグ②：フィールド名が AssignPayload の実際のキーと不一致

| WorkRecordPanel で参照 | AssignPayload の実際のキー |
|---|---|
| `unc.uncertaintyKey` / `unc.key` | `unc.criteriaKey` |
| `unc.value` | `unc.ucValue` |
| `unc.description` | `unc.comment` |
| （uncertaintyName 未参照） | `unc.criteriaName` |

## 修正内容

### 変更ファイル
1. `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` - バグ修正

### 修正箇所（buildTransitions内 約1906〜1916行）

```typescript
// 修正後
const uncEntry = uncertaintyMap[propKey];
// AssignPayload[] 形式（配列）で格納されているため、先頭要素を使用
const uncArr = Array.isArray(uncEntry) ? uncEntry : (uncEntry ? [uncEntry] : []);
if (uncArr.length > 0) {
  const unc = uncArr[0] as Record<string, unknown>;
  p = {
    ...p,
    uncertaintyKey:  (unc.criteriaKey ?? unc.uncertaintyKey ?? unc.key) as string | undefined,
    uncertaintyName: (unc.criteriaName) as string | undefined,
    toleranceValue:  (unc.ucValue ?? unc.value) as string | number | undefined,
    uncertaintyNote: (unc.comment ?? unc.description) as string | undefined,
  };
}
```

## 承認記録
- **計画書提示日時**: 2026-08-24 09:05
- **承認日時**: 2026-08-24 09:05
