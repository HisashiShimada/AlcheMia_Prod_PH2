# タスク計画書: 用語追加時に表示名がDBに登録されないバグ修正

## メタデータ
- **作成日時**: 2026-09-03 08:28
- **タスクID**: 用語追加時表示名未登録バグ修正
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

新規用語追加時に表示名（displayName）を入力して保存ボタンを押下しても、表示名だけがDBに登録されないバグを修正する。

## 原因

フロントエンドとバックエンドのフィールド名の不一致。

| 層 | フィールド名 | 備考 |
|---|---|---|
| フロントエンド NamespaceMain.tsx（handleAddSave） | `displayNameJa` | `createTermRequest` に `displayNameJa: row.displayName` として設定 |
| フロントエンド TermUpsertRequest 型 | `displayNameJa?: string` | 正しく定義済み |
| バックエンド namespaceController.ts（createTerm） | `displayName` | `req.body` から `displayName` で取り出している |
| バックエンド CreateTermInput 型 | `displayName?: string` | `displayName` を期待している |

フロントエンドは `displayNameJa` フィールドで送信しているが、バックエンドは `displayName` フィールドで取り出しているため、常に `undefined` となりDBに保存されない。

## 目的と期待される成果

- [ ] 用語新規登録時に表示名がDBに正しく保存される
- [ ] 既存の更新処理（updateTerm）には影響しない

## 実装ステップ

### Phase 1: 型定義修正
- [x] `backend/src/types/api.ts` の `CreateTermBody` に `displayNameJa?: string` フィールドを追加

### Phase 2: Controller修正
- [x] `backend/src/controllers/namespaceController.ts` の `createTerm` 関数で `displayNameJa` も取り出し、`displayName` として扱う（後方互換性を維持）

## 変更ファイル

1. `backend/src/types/api.ts` - `CreateTermBody` に `displayNameJa?: string` を追加
2. `backend/src/controllers/namespaceController.ts` - `createTerm` で `displayNameJa ?? displayName` を使用

## リスク

| リスク | 対策 |
|---|---|
| 後方互換性の破壊 | `displayNameJa ?? displayName` という形でフォールバックを設け、どちらのフィールドでも受け付けるようにする |

## テスト計画

- [ ] 用語追加画面で表示名を入力して保存し、DBに登録されることを確認
- [ ] 表示名を空のまま保存した場合、DB に null が入ることを確認

## 承認記録
- **計画書提示日時**: 2026-09-03 08:28
- **承認日時**: 
