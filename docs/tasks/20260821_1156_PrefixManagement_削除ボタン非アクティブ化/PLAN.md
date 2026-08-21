# タスク計画書: PrefixManagement 削除ボタン → 非アクティブボタン変更

## メタデータ
- **作成日時**: 2026-08-21 11:56
- **タスクID**: PrefixManagement_削除ボタン非アクティブ化
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要
Prefix管理画面の「削除」ボタンを「非アクティブ」ボタンに変更する。
削除（物理削除）ではなく、`prefix.is_active = FALSE` に更新することでデータを保持しつつ一覧から非表示にする。

## 目的と期待される成果
- [ ] 削除ボタンが非アクティブボタンに変わる
- [ ] クリック時に確認ダイアログが表示される
- [ ] 確認後に `PATCH /api/v1/namespaces/:prefix/active` が呼ばれ `is_active=false` に更新される
- [ ] 非アクティブ化後、一覧からその行が消える（SQLで `is_active=TRUE` フィルタ済み）

## 変更ファイル一覧

### バックエンド（新規作成）
1. `backend/src/sql/queries/namespace_terms/toggleActivePrefix.sql`

### バックエンド（修正）
2. `backend/src/repositories/namespaceTermRepository.ts` — `toggleActivePrefix` 追加
3. `backend/src/services/namespaceService.ts` — `toggleNamespaceActive` 追加
4. `backend/src/controllers/namespaceController.ts` — `toggleNamespaceActive` ハンドラ追加
5. `backend/src/middleware/namespaceValidation.ts` — `validateToggleNamespaceActive` 追加
6. `backend/src/routes/namespaceRoutes.ts` — `PATCH /:prefix/active` ルート追加

### フロントエンド（修正）
7. `frontend/src/services/namespaceApiService.ts` — `toggleNamespaceActive` 追加
8. `frontend/src/components/namespace/PrefixManagement.tsx` — 削除→非アクティブに変更
9. `frontend/src/locales/ja.json` — i18nキー追加
10. `frontend/src/locales/en.json` — i18nキー追加
