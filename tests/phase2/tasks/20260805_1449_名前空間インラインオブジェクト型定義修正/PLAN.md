# タスク計画書: 名前空間インラインオブジェクト型定義修正

## メタデータ
- **作成日時**: 2026-08-05 14:49
- **タスクID**: 名前空間インラインオブジェクト型定義修正
- **優先度**: 中

## タスク概要
名前空間関連コンポーネントでインラインオブジェクトとして作成されている箇所を、`namespace.ts` の型定義インスタンスを使う形に修正する。

## 修正対象

### PrefixManagement.tsx
- ローカル `interface PrefixRow` → `namespace.ts` へ移動（`PrefixRowLocal` として追加）
- ローカル `interface NewPrefixRow` → `namespace.ts` へ移動（`NewPrefixRowLocal` として追加）
- `useState<{ prefix: string; uri: string; description: string }>` のインライン型 → `PrefixEditValuesWithUri` として `namespace.ts` へ追加

### TermManagement.tsx
- ローカル `interface TermManagementProps` → `namespace.ts` へ移動
- ローカル `interface NewTermRow` → `namespace.ts` へ移動（`NewTermRowLocal` として追加）
- ローカル `interface EditValues` → `namespace.ts` へ移動（`TermEditValuesLocal` として追加）

### DepartmentTreeManagement.tsx
- ローカル `interface DepartmentTreeManagementProps` → `namespace.ts` へ移動

## 変更ファイル
1. `frontend/src/types/namespace.ts` - 型定義を追加
2. `frontend/src/components/namespace/PrefixManagement.tsx` - ローカル型をimportに変更
3. `frontend/src/components/namespace/TermManagement.tsx` - ローカル型をimportに変更
4. `frontend/src/components/namespace/DepartmentTreeManagement.tsx` - ローカル型をimportに変更
