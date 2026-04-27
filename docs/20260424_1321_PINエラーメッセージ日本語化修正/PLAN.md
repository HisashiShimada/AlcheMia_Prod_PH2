# タスク計画書: PINエラーメッセージ日本語化修正

## メタデータ
- **作成日時**: 2026-04-24 13:21
- **タスクID**: pin-error-message-i18n-fix
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

PINコード入力画面でPINコードが不正な場合に、`errorMapper.ts` に定義された日本語メッセージではなく、バックエンドが返す英語メッセージ（例: `"Invalid PIN code"`）がそのまま表示されるバグを修正する。

## 目的と期待される成果

### 目的
エラーメッセージの日本語化が正しく機能するように修正する。

### 期待される成果
- [x] PINコード不正時に「PINコードが正しくありません」と日本語で表示される

## 根本原因

3つの問題が重なっていた。

### 問題1: `authApi.ts` のエラーメッセージ優先順位が逆

`frontend/src/utils/authApi.ts` の `handleApiError` 関数（60行目）で、バックエンドの英語メッセージが `errorMapper.ts` の日本語マッピングより優先されていた。

```typescript
// 修正前: バックエンドの英語メッセージが優先される
const errorMessage = data.error.message || mapErrorToMessage(errorCode);

// 修正後: errorMapper.ts の日本語マッピングが優先される
const errorMessage = mapErrorToMessage(errorCode, data.error.message);
```

### 問題2: `errorMapper.ts` にレガシーコードのマッピングが不在

バックエンド（`pinCodeService.ts`）が返すエラーコードが **`AUTH_PIN_INVALID`** のレガシーコードであり、`ERROR_MESSAGE_MAP` にこのエントリが存在しなかった。そのため、問題1の修正後もフォールバックの英語メッセージが使われ続けていた。

### 問題3: `authService.ts` の `handleApiError` が `mapErrorToMessage` を使っていない（根本原因）

`PinCodeInputPage` は `authApi.ts` ではなく `authService.verifyPin()` を経由してAPIを呼び出す。`authService.ts` は独自の `handleApiError` 関数を持っており、そこではバックエンドの英語メッセージを `mapErrorToMessage` を通さずそのまま `AuthServiceError.message` に格納していた（69行目）。

```typescript
// 修正前: mapErrorToMessage を通さず英語メッセージをそのまま使用
return new AuthServiceError(
  response.error.message || 'エラーが発生しました',
  response.error.code || 'E9999',
);

// 修正後: mapErrorToMessage を経由して日本語に変換
const code = response.error.code || 'E9999';
return new AuthServiceError(
  mapErrorToMessage(code, response.error.message || 'エラーが発生しました'),
  code,
);
```

## 実装ステップ

- [x] `frontend/src/utils/authApi.ts` 60行目を修正（`mapErrorToMessage` 優先順位修正）
- [x] `frontend/src/utils/errorMapper.ts` に `AUTH_PIN_INVALID` のレガシーコードマッピングを追加
- [x] `frontend/src/services/authService.ts` の `handleApiError`（69行目）に `mapErrorToMessage` を適用

## 変更ファイル

1. `frontend/src/utils/authApi.ts` - 60行目の `errorMessage` の算出ロジックを修正
2. `frontend/src/utils/errorMapper.ts` - `AUTH_PIN_INVALID` のレガシーコードマッピングを追加
3. `frontend/src/services/authService.ts` - `handleApiError`（69行目）で `mapErrorToMessage` を使用するよう修正

   追加したマッピング（`errorMapper.ts`）：
   ```typescript
   AUTH_PIN_INVALID: 'PINコードが正しくありません',
   ```

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 未知エラーコードでメッセージが消える | 低 | 低 | `mapErrorToMessage` の第2引数にバックエンドメッセージを渡すためフォールバック確保済み |

## テスト計画

- [x] PINコードを意図的に間違えて「PINコードが正しくありません」と表示されることを確認

## 承認記録

- **計画書提示日時**: 2026-04-24 13:21
- **承認日時**: 2026-04-24 13:25
- **承認者コメント**: 承認

## 実施記録

### 実施日時
開始: 2026-04-24 13:25
完了: 2026-04-24 13:59

### 最終的な成果物
- [x] `frontend/src/utils/authApi.ts` 修正完了
- [x] `frontend/src/utils/errorMapper.ts` `AUTH_PIN_INVALID` マッピング追加完了
- [x] `frontend/src/services/authService.ts` `handleApiError` 修正完了
