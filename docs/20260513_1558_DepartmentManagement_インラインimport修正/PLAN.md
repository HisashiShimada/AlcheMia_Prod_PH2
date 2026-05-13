# タスク計画書: DepartmentManagement インライン import 修正

## メタデータ
- **作成日時**: 2026-05-13 15:58
- **タスクID**: DepartmentManagement_インラインimport修正
- **優先度**: 低
- **推定工数**: 0.1時間

## タスク概要

`frontend/src/components/SystemManagement/DepartmentManagement.tsx` の366行目にて、
すでに import 済みの `MasterRecord` 型をインライン動的 import で参照していた問題を修正。

## 目的と期待される成果

- [ ] 366行目のTypeScriptエラーを解消する
- [ ] 型定義集約計画（Phase 8）の方針「`services/` の型エイリアスを廃止し `types/` を直接参照」と一致させる

## 実装ステップ

- [x] エラー箇所（366行目）を特定する
- [x] `departmentTypes.ts` の型定義を確認する
- [x] インライン import を既存 import 済みの型に置き換える

## 変更ファイル

1. `frontend/src/components/SystemManagement/DepartmentManagement.tsx` - 366行目のインライン import を修正

## 変更内容

### 修正前
```typescript
await createMaster(createRequest as unknown as import('@/services/departmentApiService').MasterRecord);
```

### 修正後
```typescript
await createMaster(createRequest as unknown as MasterRecord);
```

**理由**: `MasterRecord` はファイル上部（28行目）で既に `@/types/departmentTypes` から import 済みのため、
インライン動的 import は不要。また `services/` 経由の参照は型定義集約計画の方針に反する。

## リスク

| リスク | 対策 |
|--------|------|
| 型の不一致 | `departmentTypes.ts` の `MasterRecord = DepartmentRecord` を事前確認済み |

## テスト計画

- [x] TypeScript ビルドエラーがないことを確認

## 承認記録

- **承認日時**: 2026-05-13 15:58（実施後報告）

## 実施記録

### 実施日時
開始: 2026-05-13 15:56  
完了: 2026-05-13 15:58

### 最終的な成果物
- [x] `DepartmentManagement.tsx` 366行目のインライン import を `MasterRecord`（既存 import）に置き換え完了
