# タスク計画書: 用語管理機能 アクティブ/非アクティブ切替 API 実装

## メタデータ
- **作成日時**: 2026-07-29 15:12
- **タスクID**: term-active-toggle
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

用語管理（TermManagement）のアクティブ/非アクティブ切替機能が、現在ローカル状態のみの更新でありページリロードで元に戻る問題を修正する。バックエンドAPIを実装し、フロントエンドと接続する。

## 目的と期待される成果

- [ ] `NamespaceTermRow` 型に `isActive` フィールドを追加し、型キャストを解消する
- [ ] `PATCH /api/v1/namespaces/terms/:prefix/:localName/active` エンドポイントを実装する
- [ ] フロントエンドの `handleToggleActive` をAPIに接続し、永続化できるようにする
- [ ] 非アクティブ用語も一覧に表示できるようにする（フィルター対応）

## 実装ステップ

### Phase 1: 型定義・クエリ修正（基盤整備）
- [ ] `backend/src/repositories/namespaceTermRepository.ts`
  - `NamespaceTermRow` に `isActive: boolean` を追加
  - `findAllByOrganization()` の SELECT に `t.is_active AS "isActive"` を追加
  - `findAllByOrganization()` の WHERE から `AND t.is_active = TRUE` を削除（全件返す）
  - `toggleActive()` 関数を追加
- [ ] `frontend/src/services/namespaceApiService.ts`
  - `NamespaceTermRow` に `isActive: boolean` を追加
  - `toggleTermActive()` 関数を追加

### Phase 2: バックエンド API 実装
- [ ] `backend/src/controllers/namespaceController.ts`
  - `toggleTermActive` ハンドラを追加
- [ ] `backend/src/routes/namespaceRoutes.ts`
  - `PATCH /terms/:prefix/:localName/active` ルートを追加

### Phase 3: フロントエンド修正
- [ ] `frontend/src/components/namespace/TermManagement.tsx`
  - 型キャスト箇所を修正
  - `handleToggleActive` を API 呼び出しに変更
  - 非アクティブ用語の表示切替トグルを追加

## 変更ファイル

1. `backend/src/repositories/namespaceTermRepository.ts` - 型定義追加・クエリ修正・toggleActive()追加
2. `backend/src/controllers/namespaceController.ts` - toggleTermActive ハンドラ追加
3. `backend/src/routes/namespaceRoutes.ts` - PATCH ルート追加
4. `frontend/src/services/namespaceApiService.ts` - 型定義追加・toggleTermActive()追加
5. `frontend/src/components/namespace/TermManagement.tsx` - API接続・非アクティブ表示対応

## 承認記録
- **計画書提示日時**: 2026-07-29 15:12
