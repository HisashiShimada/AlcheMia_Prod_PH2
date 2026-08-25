# タスク計画書: バックエンド多言語対応リファクタリング

## メタデータ
- **作成日時**: 2026-08-20 15:53
- **タスクID**: backend-i18n-refactoring
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

バックエンドの `i18n.ts` がフロントエンドの `ja.json` / `en.json` を直接読み込んでいるという
構造的な問題を解消する。バックエンド専用の `messages.ts` に多言語メッセージを集約し、
フロントエンドへの不正な依存を完全に排除する。

## 目的と期待される成果

### 目的
- バックエンドとフロントエンドの不正な結合（`backend → frontend/src/locales/`）を排除
- バックエンドの多言語対応を `messages.ts` の `getMessage()` に統一

### 期待される成果
- [x] `backend/src/utils/i18n.ts` を削除（フロントエンドlocaleへの依存完全排除）
- [x] `messages.ts` に `projectRoutes.validation` セクションを追加
- [x] `messages.ts` に `getLang()` ヘルパー関数を追加
- [x] `projectRoutes.ts` の `t()` 使用箇所を `getMessage()` に置き換え

## 変更ファイル

1. `backend/src/utils/messages.ts` - `projectRoutes.validation` セクション追加 + `getLang()` 関数追加
2. `backend/src/routes/projectRoutes.ts` - `i18n.ts` の `t()` を `messages.ts` の `getMessage()` に置き換え（5箇所）
3. `backend/src/utils/i18n.ts` - **削除**

## 実装ステップ

- [x] タスク計画書作成
- [ ] `messages.ts` に `projectRoutes` セクション追加
- [ ] `messages.ts` に `getLang()` ヘルパー追加
- [ ] `projectRoutes.ts` の import を修正
- [ ] `projectRoutes.ts` の `t()` 5箇所を `getMessage()` に変換
- [ ] `i18n.ts` を削除

## スコープ外

`projectRoutes.ts` の残りの `withMessage('日本語ハードコード文字列')` 約77箇所は今回対応しない。
それらは段階的な多言語対応タスクとして別途対応する。

## 承認記録
- **計画書提示日時**: 2026-08-20 15:53
- **承認日時**: 2026-08-20 15:53
