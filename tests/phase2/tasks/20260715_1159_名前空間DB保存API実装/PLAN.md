# タスク計画書: 名前空間DB保存API実装（Prefix + 用語 バックエンド/フロントエンド）

## メタデータ
- **作成日時**: 2026-07-15 11:59
- **タスクID**: namespace-db-save-api
- **優先度**: 高
- **推定工数**: 3時間

## タスク概要

名前空間管理のPrefix追加・用語追加がモックデータのみで動作しており、DBへの保存が行われていない。
バックエンドAPIエンドポイントの追加と、フロントエンドのモックデータをAPI呼び出しに切り替える。

## 目的と期待される成果
- [ ] Prefix新規登録がDBに保存される
- [ ] 用語一覧がDBから取得される
- [ ] 用語追加・更新・削除がDBに反映される
- [ ] 名前空間管理UIの全CRUD操作がDB連動で動作する

## 実装ステップ

### Phase 1: バックエンド — Prefixエンドポイント追加
- [ ] `namespaceController.ts` に `createNamespace` / `getNamespaces` / `deleteNamespace` 関数を追加
- [ ] `namespaceRoutes.ts` に `POST /namespaces` / `GET /namespaces` / `DELETE /namespaces/:prefix` を追加

### Phase 2: フロントエンド — API関数追加
- [ ] `namespaceApiService.ts` に以下のAPI関数を追加:
  - `createNamespace(data)` — `POST /namespaces`
  - `getNamespaceList()` — `GET /namespaces`
  - `deleteNamespace(prefix)` — `DELETE /namespaces/:prefix`
  - `getTerms()` — `GET /namespaces/terms`
  - `createTerm(data)` — `POST /namespaces/terms`
  - `updateTerm(prefix, localName, data)` — `PUT /namespaces/terms/:prefix/:localName`
  - `deleteTerm(prefix, localName)` — `DELETE /namespaces/terms/:prefix/:localName`

### Phase 3: フロントエンド — モック切り替え
- [ ] `NamespaceMain.tsx` の `termsMockRaw` インポートをAPI呼び出しに切り替え（用語一覧取得・追加・更新・削除）
- [ ] `NamespaceMain.tsx` の `namespaceTreeRaw` を使ったPrefix一覧をAPI呼び出しに切り替え
- [ ] `NamespaceAddDialog.tsx` の `onRegistered` コールバックでPrefixをDB保存するよう切り替え

## 変更ファイル
1. `backend/src/controllers/namespaceController.ts` — Prefix CRUD 関数追加
2. `backend/src/routes/namespaceRoutes.ts` — Prefix CRUD ルート追加
3. `frontend/src/services/namespaceApiService.ts` — Prefix/用語 CRUD API関数追加
4. `frontend/src/components/namespace/NamespaceMain.tsx` — モックからAPI呼び出しに切り替え
5. `frontend/src/components/namespace/NamespaceAddDialog.tsx` — onRegistered でAPI呼び出し

## 注意事項

### is_active カラムについて
- `namespaceTermRepository.findDeclarationsByOrganization()` が `is_active = true` でフィルタしているが、
  DDLの `namespace` テーブルには `is_active` カラムが存在しない
- Repository の SQL を修正して `is_active` 条件を除去する

### NamespaceMain.tsx の規模
- 1661行の大型ファイル。モック置き換え対象は以下の2箇所のみに絞る:
  1. `termsMockRaw` インポート → `useEffect` でAPI取得に変更
  2. Prefixツリーをモック(uncertainty-scope.json)から一覧API(`GET /namespaces`)に変更

## 承認記録
- **計画書提示日時**: 2026-07-15 11:59
- **承認日時**: 2026-07-15 12:09
- **承認者コメント**: 承認済み・実装完了

## 実施記録

### 実施日時
開始: 2026-07-15 11:59  
完了: 2026-07-15 12:09

### 最終的な成果物
- [x] `backend/src/routes/namespaceRoutes.ts` — GET/POST/DELETE /namespaces、GET/POST/PUT/DELETE /namespaces/terms エンドポイント追加
- [x] `frontend/src/services/namespaceApiService.ts` — getNamespaceList / createNamespace / deleteNamespace / getTerms / createTerm / updateTerm / deleteTerm 追加
- [x] `frontend/src/components/namespace/NamespaceMain.tsx` — termsMockRaw モック削除、getTerms API取得に切り替え、onRegistered ハンドラを createNamespace API呼び出しに切り替え
