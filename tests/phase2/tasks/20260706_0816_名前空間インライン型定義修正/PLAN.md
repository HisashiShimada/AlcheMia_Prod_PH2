# タスク計画書: 名前空間インライン型定義修正

## メタデータ
- **作成日時**: 2026-07-06 08:16
- **タスクID**: namespace-inline-type-fix
- **優先度**: 中
- **推定工数**: 0.5時間

## タスク概要
名前空間関連のコンポーネントファイルに記載されているインライン型定義・ローカル型定義を、
TypeScript型定義規約（`.clinerules/development/typescript.md`）に従い `frontend/src/types/namespace.ts` に集約する。

## 目的と期待される成果
- [ ] 型定義の重複・散在を解消し、再利用性を向上させる
- [ ] インライン型定義を廃止し、専用型定義ファイルから import する形に統一する

## 違反箇所と修正方針

| # | ファイル | 行 | 違反内容 | 修正方針 |
|---|---------|-----|---------|---------|
| 1 | `PrefixManagement.tsx` | L414 | `type ParsedRow = { prefix, description }` | `PrefixCsvParsedRow`（既存）を import して使用 |
| 2 | `TeamAddDialog.tsx` | L93 | `res.json() as { departmentUnitId, unitName }` | 新規型 `CreateTeamResponse` を追加して使用 |
| 3 | `NamespaceMain.tsx` | L454–460 | `useState<{ visible, x, y, node, parentLabel }>` | 新規型 `ContextMenuState` を追加して使用 |
| 4 | `NamespaceMain.tsx` | L473 | `useState<{ prefix, localName, displayName, description, type, unitHint }>` | 新規型 `TermEditValues` を追加して使用 |
| 5 | `NamespaceMain.tsx` | L1010–1013 | `type ParsedRow = { prefix, localName, ... }` | 新規型 `TermCsvParsedRow` を追加して使用 |

## 実装ステップ
- [ ] namespace.ts に 4つの新規型を追加
- [ ] PrefixManagement.tsx の `type ParsedRow` を削除し `PrefixCsvParsedRow` に置き換え
- [ ] TeamAddDialog.tsx のインライン型アサーションを `CreateTeamResponse` に置き換え
- [ ] NamespaceMain.tsx の ctxMenu 型を `ContextMenuState` に置き換え
- [ ] NamespaceMain.tsx の editingValues 型を `TermEditValues` に置き換え
- [ ] NamespaceMain.tsx の `type ParsedRow` を削除し `TermCsvParsedRow` に置き換え

## 変更ファイル
1. `frontend/src/types/namespace.ts` — 4型を末尾に追加
2. `frontend/src/components/namespace/PrefixManagement.tsx` — import 追加・型置き換え
3. `frontend/src/components/namespace/TeamAddDialog.tsx` — import 追加・型置き換え
4. `frontend/src/components/namespace/NamespaceMain.tsx` — import 追加・3箇所型置き換え

## 承認記録
- **計画書提示日時**: 2026-07-06 08:16
- **承認日時**: 2026-07-06 08:21
