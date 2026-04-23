# タスク計画書: 二段階認証PIN試行上限エラーメッセージ未表示バグ修正

## メタデータ
- **作成日時**: 2026-04-23 10:57
- **タスクID**: 二段階認証バグ修正
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

二段階認証でPINコードを3回失敗した場合、HTTPエラーは発生するが「入力試行回数が上限に達しました」というメッセージが画面に表示されない問題を修正する。

## 目的と期待される成果

### 目的
PINコード3回失敗時に `E5005` エラーコードがフロントエンドまで正しく伝達され、適切なエラーメッセージを表示する。

### 期待される成果
- [ ] PINコード3回失敗で「入力試行回数が上限に達しました。最初からやり直してください」が表示される
- [ ] エラーコードが `AUTH_PIN_MAX_ATTEMPTS`（旧コード）から `E5005`（新コード）に統一される
- [ ] フロントエンドのエラーハンドリングでコードが保持される
- [ ] 日英両言語でメッセージが表示される

## 根本原因分析

### バグ①：バックエンド `pinCodeService.ts`
- 試行回数超過時に旧コード `AUTH_PIN_MAX_ATTEMPTS` を返している
- `authController.ts` は `E5005` のみ 429 として認識するため、旧コードは処理されない

### バグ②：フロントエンド `authApi.ts`
- `handleApiError()` がエラーコードを文字列メッセージに変換して `throw new Error(message)` している
- コード情報が失われるため、`PINCodeForm` で `extractErrorCode()` を呼んでも `E9999` しか返らない
- `errorCode === 'E5005'` の判定が常に false になり `onMaxAttemptsExceeded()` が呼ばれない

### エラーフロー（修正前）
```
PIN 3回失敗
  ↓
pinCodeService: code='AUTH_PIN_MAX_ATTEMPTS' ← 旧コード
  ↓
authController: E5005のみ 429 対応 → AUTH_PIN_MAX_ATTEMPTSは 401 で返却
  ↓
authApi.handleApiError: throw new Error(message) ← コード情報を捨てる
  ↓
extractErrorCode(err): 通常のError → 'E9999' を返す
  ↓
errorCode === 'E5005' が false → onMaxAttemptsExceeded() 未呼び出し ❌
```

### エラーフロー（修正後）
```
PIN 3回失敗
  ↓
pinCodeService: code='E5005' ✅
  ↓
authController: E5005 → HTTP 429 ✅
  ↓
authApi.handleApiError: throw new ApiError(message, 'E5005') ✅
  ↓
extractErrorCode(err): ApiError → 'E5005' を返す ✅
  ↓
errorCode === 'E5005' → onMaxAttemptsExceeded() 呼び出し ✅
  ↓
「入力試行回数が上限に達しました」が表示される ✅
```

## 実装ステップ

### Phase 1: タスク計画書作成
- [x] PLAN.md 作成

### Phase 2: バックエンド修正
- [ ] `backend/src/services/pinCodeService.ts` の `AUTH_PIN_MAX_ATTEMPTS` を `E5005` に変更

### Phase 3: フロントエンド修正
- [ ] `frontend/src/utils/authApi.ts` に `ApiError` クラスを追加し `handleApiError` を修正
- [ ] `frontend/src/utils/errorUtils.ts` で `ApiError` からコード抽出対応

### Phase 4: 多言語対応
- [ ] `frontend/src/locales/ja.json` に `auth.pin` セクション追加
- [ ] `frontend/src/locales/en.json` に `auth.pin` セクション追加

## 変更ファイル

| # | ファイル | 変更種別 | 変更内容 |
|---|---------|---------|---------|
| 1 | `backend/src/services/pinCodeService.ts` | 修正 | `AUTH_PIN_MAX_ATTEMPTS` → `E5005` |
| 2 | `frontend/src/utils/authApi.ts` | 修正 | `ApiError` クラス追加・`handleApiError` でコード保持 |
| 3 | `frontend/src/utils/errorUtils.ts` | 修正 | `ApiError` からコード抽出対応 |
| 4 | `frontend/src/locales/ja.json` | 修正 | `auth.pin` セクション追加 |
| 5 | `frontend/src/locales/en.json` | 修正 | `auth.pin` セクション追加 |

## リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| `ApiError` の追加が既存のエラーハンドリングに影響 | 低 | `instanceof Error` チェックを最初に行い後方互換を維持 |
| `extractErrorCode` の変更が他のエラーに影響 | 低 | `ApiError` 判定を先行させ、既存ロジックは後続で実行 |

## 承認記録
- **計画書提示日時**: 2026-04-23 10:57
- **承認日時**: 2026-04-23 10:57
- **承認者コメント**: タスク計画書の作成と上記の修正をお願いします

## 実施記録

### 実施日時
開始: 2026-04-23 10:57
完了: （作業完了後に記入）

### 最終的な成果物
- [ ] backend/src/services/pinCodeService.ts 修正完了
- [ ] frontend/src/utils/authApi.ts 修正完了
- [ ] frontend/src/utils/errorUtils.ts 修正完了
- [ ] frontend/src/locales/ja.json 修正完了
- [ ] frontend/src/locales/en.json 修正完了
