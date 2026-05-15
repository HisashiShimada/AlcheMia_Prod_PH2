# タスク計画書: 英語ハードコードメッセージの多言語化対応

## メタデータ
- **作成日時**: 2026-05-14 14:14
- **タスクID**: i18n-hardcoded-messages
- **優先度**: 高
- **推定工数**: 3〜4時間

---

## タスク概要

ログイン画面でバックエンドに接続できなかった場合に表示される `Unable to connect to server` が日本語に変換されず英語のまま表示される問題を発端に、フロントエンド全体の英語ハードコードメッセージを調査・修正する。

---

## 調査結果サマリー

### 根本原因

`frontend/src/services/authService.ts` の `handleApiError` 関数（43行目）が原因。

```typescript
// ネットワークエラー（レスポンスなし）
if (!axiosError.response) {
  return new AuthServiceError('Unable to connect to server', 'E3001');
  // ↑ 英語をハードコード。エラーコード E3001 は正しいが、
  //   メッセージを mapErrorToMessage() に通していないため翻訳されない
}
```

`LoginForm.tsx` のエラー表示では `err instanceof AuthServiceError ? err.message : ...` とあり、
`AuthServiceError` の場合は `.message` をそのまま使うため、翻訳を通らない。

翻訳データ自体は既に存在している：
- `ja.json`: `"E3001": "サーバーに接続できません。ネットワークを確認してください"`
- `en.json`: `"E3001": "Cannot connect to server. Please check your network connection."`
- `errorUtils.ts`: `ERROR_CODE_TO_KEY` に `E3001: 'errors.E3001'` が定義済み

---

## 発見した問題の全件一覧

### 🔴 カテゴリA：認証フロー（最優先修正）

**ファイル**: `frontend/src/services/authService.ts`

#### A-1: `handleApiError` 関数内（翻訳キーあり → `mapErrorToMessage` を通すだけで解決）

| 行番号 | 英語メッセージ | エラーコード | 翻訳キー状況 |
|--------|----------------|-------------|--------------|
| 38 | `'Request timed out'` | E3002 | ✅ `errors.E3002` あり |
| 43 | `'Unable to connect to server'` | E3001 | ✅ `errors.E3001` あり（今回の主問題） |
| 61 | `'Authentication required'` | E5013 | ✅ `errors.E5013` あり |
| 63 | `'Access denied'` | E5012 | ✅ `errors.E5012` あり |
| 65 | `'Resource not found'` | E6001 | ✅ `errors.E6001` あり |
| 67 | `'A server error occurred'` | E4001 | ✅ `errors.E4001` あり |
| 70,74 | `'An error occurred'` | E9999 | ✅ `errors.E9999` あり |

**修正方法**: メッセージを `mapErrorToMessage(code)` に置き換える。

```typescript
// 修正前
return new AuthServiceError('Unable to connect to server', 'E3001');

// 修正後
return new AuthServiceError(mapErrorToMessage('E3001'), 'E3001');
```

#### A-2: 各APIメソッド内（翻訳キー未登録 → キー追加も必要）

| 行番号 | 英語メッセージ | コード | 翻訳キー状況 |
|--------|----------------|--------|--------------|
| 106 | `'Login failed'` | E9999 | ✅ `errors.E9999` あり（汎用） |
| 141 | `'PIN verification failed'` | PIN_VERIFY_FAILED | ❌ 未登録 |
| 169 | `'PIN resend failed'` | PIN_RESEND_FAILED | ❌ 未登録 |
| 289 | `'Refresh token is invalid'` | AUTH_TOKEN_INVALID | ❌ 未登録 |
| 319 | `'Logout failed'` | LOGOUT_FAILED | ❌ 未登録 |
| 346 | `'Password reset request failed'` | RESET_REQUEST_FAILED | ❌ 未登録 |
| 369 | `'Password reset failed'` | RESET_FAILED | ❌ 未登録 |
| 393 | `'Password change failed'` | CHANGE_PASSWORD_FAILED | ❌ 未登録 |

**修正方法**: 
- `ja.json` / `en.json` に翻訳キーを追加
- `errorUtils.ts` の `ERROR_CODE_TO_KEY` にマッピングを追加
- `authService.ts` で `mapErrorToMessage(code)` に置き換え

---

### 🟡 カテゴリB：実験作業ダイアログ（中優先）

**ファイル**: `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx`

| 英語メッセージ | 発生条件 |
|----------------|----------|
| `'No template selected'` | テンプレート未選択時 |
| `'Missing project information required for saving'` | 保存時プロジェクト情報不足 |
| `'File processing failed'` | ファイル処理エラー時 |
| `'Missing project information required for update'` | ステータス更新時プロジェクト情報不足 |

**修正方法**: `t()` 翻訳関数に置き換え、`ja.json`/`en.json` にキー追加。

---

### 🟠 カテゴリC：ビューアコンポーネント（低優先・UI全体が英語）

以下のコンポーネントはUIテキスト全体が英語で、多言語化対応が未実施。

| ファイル | 主な英語テキスト |
|----------|-----------------|
| `ViewRenderer.tsx` | `'Please select a file'`, `'Checking method info...'`, `'Failed to initialize editor'`, UIテキスト全般 |
| `ViewRendererDialog.tsx` | `'Failed to load file: ...'`, ボタンラベル |
| `TiffViewer.tsx` | `'TIFF File Selected'`, `'Browser support...'`, ボタンラベル全般 |
| `ImageViewer.tsx` | `'Failed to load image.'`, `'Failed to fetch image URL: ...'`, `'Loading image...'`, ボタンラベル全般 |

**修正方法**: 各コンポーネントに `useLanguage` を導入し、`t()` 関数で翻訳キーを参照。対応する翻訳キーを `ja.json`/`en.json` に追加。

---

## 実装ステップ

### Phase 1: カテゴリA-1の修正（handleApiError関数）【最優先】

- [x] `authService.ts` の `handleApiError` 関数内の英語メッセージを `mapErrorToMessage(code)` に置き換え済み
- [x] `authService.ts` line 106 `'Login failed'` を `mapErrorToMessage()` に置き換え済み
- [ ] **手動確認必須**: バックエンド停止状態でログインを試みてエラーメッセージが日本語になるか確認

### Phase 2: カテゴリA-2の修正（各APIメソッド内）

- [x] `ja.json` に翻訳キーを追加済み（`errors.PIN_VERIFY_FAILED` 等 7件）
- [x] `en.json` に翻訳キーを追加済み（同上 7件）
- [x] `errorUtils.ts` の `ERROR_CODE_TO_KEY` にマッピングを追加済み（7件追加）
- [x] `authService.ts` の各メソッドで `mapErrorToMessage(code)` に置き換え済み

### Phase 3: カテゴリBの修正（DataRecordDialog）

- [x] `ja.json` に翻訳キーを追加済み
- [x] `en.json` に翻訳キーを追加済み
- [x] `DataRecordDialog.tsx` で `t()` 関数に置き換え済み（キーパス修正含む）

### Phase 4: カテゴリCの修正（ビューアコンポーネント）

- [ ] `ja.json` にビューア関連翻訳キーを追加
- [ ] `en.json` にビューア関連翻訳キーを追加
- [ ] `ViewRenderer.tsx` を `t()` 関数対応に修正
- [ ] `ViewRendererDialog.tsx` を `t()` 関数対応に修正
- [ ] `TiffViewer.tsx` を `t()` 関数対応に修正
- [ ] `ImageViewer.tsx` を `t()` 関数対応に修正

---

## 変更ファイル

### Phase 1
1. `frontend/src/services/authService.ts` — `handleApiError` 内メッセージを `mapErrorToMessage()` に変更

### Phase 2
1. `frontend/src/services/authService.ts` — 各メソッド内のハードコードメッセージを `mapErrorToMessage()` に変更
2. `frontend/src/utils/errorUtils.ts` — `ERROR_CODE_TO_KEY` にレガシーコードのマッピング追加
3. `frontend/src/locales/ja.json` — 翻訳キー追加
4. `frontend/src/locales/en.json` — 翻訳キー追加

### Phase 3
1. `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` — `t()` 関数対応
2. `frontend/src/locales/ja.json` — 翻訳キー追加
3. `frontend/src/locales/en.json` — 翻訳キー追加

### Phase 4
1. `frontend/src/components/viewer/ViewRenderer.tsx`
2. `frontend/src/components/viewer/ViewRendererDialog.tsx`
3. `frontend/src/components/viewer/TiffViewer.tsx`
4. `frontend/src/components/viewer/ImageViewer.tsx`
5. `frontend/src/locales/ja.json` — 翻訳キー追加
6. `frontend/src/locales/en.json` — 翻訳キー追加

---

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `ERROR_CODE_TO_KEY` に未知コードを追加した際の動作 | 低 | 低 | テストコードで検証済みの仕組みのため安全 |
| Phase 4のビューアUIが英語前提で設計されている場合 | 中 | 中 | 英語キーをそのままen.jsonに登録し、ja.jsonのみ日本語化 |
| DataRecordDialogのコード量が多く修正漏れが出る | 中 | 中 | ファイル全体をsearch_filesで検索して網羅的に対応 |

---

## テスト計画

- [ ] バックエンド停止状態でログイン → 「サーバーに接続できません。ネットワークを確認してください」が表示されること
- [ ] 言語設定を英語にして同様の操作 → 英語メッセージが表示されること
- [ ] PIN入力エラー → 日本語メッセージが表示されること
- [ ] パスワードリセット操作中のエラー → 日本語メッセージが表示されること
- [ ] DataRecordDialog でテンプレート未選択時 → 日本語メッセージが表示されること

---

## 承認記録

- **計画書提示日時**: 2026-05-14 14:14
- **承認日時**: （承認後に記入）
- **承認者コメント**: 
