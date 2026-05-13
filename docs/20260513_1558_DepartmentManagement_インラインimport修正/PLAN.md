# タスク計画書: DepartmentManagement インライン import 修正

## メタデータ
- **作成日時**: 2026-05-13 15:58
- **タスクID**: DepartmentManagement_インラインimport修正
- **優先度**: 中
- **推定工数**: 0.5時間

## 1. タスク概要

`frontend/src/services/departmentApiService.ts` の16〜20行目に `CreateDepartmentRequest` のインライン型定義が残存していた。

型定義集約計画（`.clinerules/development/typescript.md` および `docs/20260513_0832_型定義ファイル集約計画/PLAN.md`）の方針「`services/` に型定義を残してはならない」に従い、`types/departmentTypes.ts` へ移動し、参照元の import を修正した。

## 2. 目的と期待される成果

- [ ] `services/departmentApiService.ts` からインライン型定義 `CreateDepartmentRequest` を削除
- [ ] `types/departmentTypes.ts` に `CreateDepartmentRequest` を追加
- [ ] `DepartmentManagement.tsx` の import 元を `@/types/departmentTypes` に変更

## 3. 実装ステップ

- [x] `types/departmentTypes.ts` に `CreateDepartmentRequest` を追加
- [x] `services/departmentApiService.ts` の16〜20行目のローカル定義を削除し、`@/types/departmentTypes` から import に変更
- [x] `components/SystemManagement/DepartmentManagement.tsx` の `CreateDepartmentRequest` import 元を `@/services/departmentApiService` → `@/types/departmentTypes` に変更（`services/` 側の重複 import も削除）

## 4. 変更ファイル

| ファイル | 変更内容 |
|---|---|
| `frontend/src/types/departmentTypes.ts` | `CreateDepartmentRequest` を追加 |
| `frontend/src/services/departmentApiService.ts` | 16〜20行目のローカル型定義を削除 → `@/types/departmentTypes` から import |
| `frontend/src/components/SystemManagement/DepartmentManagement.tsx` | `CreateDepartmentRequest` の import 元を `@/types/departmentTypes` に変更 |

## 5. 関連ドキュメント

- [型定義ファイル集約計画](../20260513_0832_型定義ファイル集約計画/PLAN.md)
- [TypeScript型定義規約](../../.clinerules/development/typescript.md)

## 6. 承認記録

- **計画書提示日時**: 2026-05-13 15:58
- **承認日時**: 2026-05-13 15:58（実施後記録）

## 7. 実施記録

### 実施日時
開始: 2026-05-13 15:58
完了: 2026-05-13 17:06

### 最終的な成果物
- [x] `types/departmentTypes.ts` に `CreateDepartmentRequest` を追加
- [x] `services/departmentApiService.ts` のインライン型定義を削除・import に変更
- [x] `DepartmentManagement.tsx` の import 元を `@/types/departmentTypes` に統一
- [x] TypeScript エラーなし（重複 import エラー解消済み）
