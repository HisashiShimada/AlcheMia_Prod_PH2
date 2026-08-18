# タスク計画書: 名前空間型定義ファイル集約

## メタデータ
- **作成日時**: 2026-07-03 10:48
- **タスクID**: namespace-type-consolidation
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

`frontend/src/components/namespace/` 配下の各コンポーネントファイルに個別定義されている型定義を、`frontend/src/types/namespace.ts`（新規作成）に集約する。Clineルール（TypeScript型定義規約）に従った修正。

## 目的と期待される成果
- [x] 型定義を専用ファイルに集約（DRY原則・typescript.md規約準拠）
- [x] 重複型定義（`RawNode`等）を統合
- [x] 各コンポーネントが `namespace.ts` からimportするように変更

## 実装ステップ

### Phase 1: 型定義ファイル新規作成
- [x] `frontend/src/types/namespace.ts` を作成し全データ型を集約

### Phase 2: 各コンポーネントの修正
- [x] `ShareScopeModal.tsx` の型定義を削除 → importに変更（re-export維持）
- [x] `DetailModal.tsx` の型定義を削除 → importに変更（re-export維持）
- [x] `NamespaceMain.tsx` の型定義（UserNsRole）を削除 → importに変更
- [x] `PrefixManagement.tsx` の型定義を削除 → importに変更
- [x] `TeamManagementPanel.tsx` の型定義（Team/TeamMember）を削除 → importに変更
- [x] `TeamAddDialog.tsx` の型定義（OrgUser）を削除 → importに変更
- [x] `NamespaceMaimlEditor.tsx` の型定義（SectionKey/NsItem/ScopeNode）を削除 → importに変更（ScopeNodeはMaimlScopeNodeとしてnamespace.tsに追加）
- [x] `NamespaceAddDialog.tsx` / `DepartmentTreeManagement.tsx` はローカル型定義なし（対応不要）

## 変更ファイル
1. `frontend/src/types/namespace.ts` - 新規作成（型定義集約先）
2. `frontend/src/components/namespace/ShareScopeModal.tsx` - 型定義削除→import
3. `frontend/src/components/namespace/DetailModal.tsx` - 型定義削除→import
4. `frontend/src/components/namespace/NamespaceMain.tsx` - 型定義削除→import
5. `frontend/src/components/namespace/PrefixManagement.tsx` - 型定義削除→import
6. `frontend/src/components/namespace/TeamManagementPanel.tsx` - 型定義削除→import
7. `frontend/src/components/namespace/NamespaceAddDialog.tsx` - 型定義削除→import
8. `frontend/src/components/namespace/TeamAddDialog.tsx` - 型定義削除→import
9. `frontend/src/components/namespace/DepartmentTreeManagement.tsx` - 型定義削除→import

## 承認記録
- **承認日時**: 2026-07-03 10:48
