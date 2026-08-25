# タスク計画書: 名前空間プロジェクト公開範囲設定実装

## メタデータ
- **作成日時**: 2026-07-23 15:04
- **タスクID**: 名前空間プロジェクト公開範囲設定実装
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

名前空間の「プロジェクト公開範囲設定」機能を実装する。  
`PrefixManagement.tsx` は既に作成済みだが NamespaceMain.tsx に組み込まれておらず、
`scope_key` も DB に保存されていない状態のため、フロントエンド 3 ファイルを修正する。

## 目的と期待される成果

- [ ] `PrefixManagement` が `NamespaceMain.tsx` の右ペインサブタブとして表示される
- [ ] Prefix 新規追加時に `scopeKey`（選択中ツリーノードキー）が DB に保存される
- [ ] バックエンド・DB は対応済みのため追加変更不要

## 実装ステップ

### Phase 1: 型定義追加
- [ ] `frontend/src/types/namespace.ts` の `PrefixManagementProps` に `scopeKey?: string | null` を追加

### Phase 2: PrefixManagement 修正
- [ ] `frontend/src/components/namespace/PrefixManagement.tsx` の `executeSave()` 内で `createNamespace()` に `scopeKey: scopeKey ?? undefined` を渡す

### Phase 3: NamespaceMain 統合
- [ ] `frontend/src/components/namespace/NamespaceMain.tsx` に `PrefixManagement` を import
- [ ] 右ペインのサブタブに「Prefix管理」タブを追加し `selectedKey` を `scopeKey` として渡す

## 変更ファイル
1. `frontend/src/types/namespace.ts` - PrefixManagementProps に scopeKey 追加
2. `frontend/src/components/namespace/PrefixManagement.tsx` - createNamespace に scopeKey を渡す
3. `frontend/src/components/namespace/NamespaceMain.tsx` - PrefixManagement サブタブ追加

## 承認記録
- **承認日時**: 2026-07-23 15:04
