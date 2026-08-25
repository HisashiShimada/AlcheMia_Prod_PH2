# タスク計画書: Prefix新規追加時のnamespace登録廃止

## メタデータ
- **作成日時**: 2026-08-21 16:40
- **タスクID**: Prefix新規追加namespace登録廃止
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

Prefix 管理画面（PrefixManagement）からの Prefix 新規追加時に、namespace テーブルへの INSERT を廃止する。
現在は `createNamespace`（repository）が namespace + prefix の2テーブルに INSERT しているが、
ユーザー作成・チーム作成時に namespace は自動登録済みのため、Prefix 追加時は prefix テーブルのみに INSERT する形に変更する。

## 目的と期待される成果
- [ ] Prefix 新規追加時に namespace テーブルへの重複 INSERT が発生しなくなる
- [ ] scopeKey に namespace が存在しない場合は 404 エラーを返す（旧データ・例外ケースの明示化）
- [ ] `createNamespace`（repository）関数・`createNamespace.sql` を廃止する

## 実装ステップ

### Phase 1: SQL ファイル作成・削除
- [ ] `findNamespaceIdByScopeKey.sql` 新規作成（scope_key で namespace_id を取得）
- [ ] `createNamespace.sql` 削除（namespace テーブルへの INSERT SQL。不要になる）

### Phase 2: Repository 修正
- [ ] `namespaceTermRepository.ts` に `findNamespaceIdByScopeKey()` 関数を追加
- [ ] `namespaceTermRepository.ts` から `createNamespace()` 関数を削除

### Phase 3: Service 修正
- [ ] `namespaceService.ts` の `createNamespace()` を以下の処理に変更:
  1. scopeKey で namespace テーブルを検索（namespace_id を取得）
  2. 存在しない場合 → 404 エラー（E6001）を throw
  3. 存在する場合 → prefix テーブルのみ INSERT（createPrefix.sql 使用）

## 変更ファイル

### 新規作成
1. `backend/src/sql/queries/namespace_terms/findNamespaceIdByScopeKey.sql`

### 修正
1. `backend/src/repositories/namespaceTermRepository.ts` - findNamespaceIdByScopeKey 追加・createNamespace 削除
2. `backend/src/services/namespaceService.ts` - createNamespace を prefix のみ INSERT に変更

### 削除
1. `backend/src/sql/queries/namespace_terms/createNamespace.sql`

## 影響範囲

- `namespaceTermRepository.createNamespace` の呼び出し元は `namespaceService.createNamespace` のみ → 削除可能
- フロントエンドは変更不要（API インターフェース変わらず）

## 承認記録
- **計画書提示日時**: 2026-08-21 16:40
- **承認日時**: 2026-08-21 16:40
- **承認者コメント**: 承認済み（Act モード切り替え済み）
