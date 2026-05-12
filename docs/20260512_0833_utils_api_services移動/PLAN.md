# タスク計画書: utils/authApi.ts と utils/formatApi.ts を services へ統合

## メタデータ
- **作成日時**: 2026-05-12 08:33（最終改訂: 08:53）
- **タスクID**: utils_api_services統合
- **優先度**: 中
- **推定工数**: 2時間

---

## 1. タスク概要

`frontend/src/utils/authApi.ts` と `frontend/src/utils/formatApi.ts` は services 層のコードであるため、それぞれ `services/authService.ts`、`services/formatApiService.ts` へ統合する。統合後は utils の旧ファイルを削除し、参照箇所のimportパスを更新する。

---

## 2. 確定した統合方針

### auth 系

**`authApi.ts` → `authService.ts` に統合**

- `authService.ts` の方が新しく充実した実装（`createApiClient()` + インターセプター自動処理、PIN免除対応の拡張型）
- `authApi.ts` の呼び出し元（`components/auth/` 配下の4コンポーネント + テスト2ファイル）を `authService` のシグネチャに切り替える
- `authService.ts` 自体は変更しない

| 変更前（authApi.ts の呼び出し） | 変更後（authService の呼び出し） |
|---|---|
| `login(username, password, orgId)` | `authService.login({ userId: username, password }, orgId)` |
| `verifyPin(pinCode, sessionToken, orgId)` | `authService.verifyPin(pinCode, sessionToken, orgId)` |
| `resendPin(sessionToken, orgId)` | `authService.resendPin(sessionToken, orgId)` |
| `resetPasswordRequest(username, orgId)` | `authService.resetPasswordRequest(username, orgId)` |
| `resetPassword(resetToken, newPassword)` | `authService.resetPassword(resetToken, newPassword)` |

戻り値の型も変更する:
- `LoginResponse` (types/auth) → `LoginResponseData` (types/api)
- `VerifyPINResponse` (types/auth) → `VerifyPinResponseData` (types/api)
- `ResendPINResponse` (types/auth) → `ResendPinResponseData` (types/api)

---

### format 系

**`formatApi.ts` の全関数 → `formatApiService.ts` に移植。不要コードは削除**

現状の `formatApiService.ts` には以下の不要コードが含まれる → **削除する**:
- `getFormats(fileType?)` ← 呼び出し元なし・別エンドポイント設計の古い実装
- `getFormatFiles(formatId, subfolderId?)` ← 呼び出し元なし・別エンドポイント設計の古い実装
- `getFormatsMock()` ← モック。不要
- `getFormatFilesMock()` ← モック。不要
- 型定義（`Format`, `FormatFile`, `FormatFolder`, `FormatListResponse`, `FormatFileListResponse`）← formatApiService.ts 独自の未使用型。削除。ただし `ApiResponse<T>` はそのまま維持

`formatApi.ts` から以下の全関数・型・エイリアスを移植する:
- `getFormats()` ← 現役（FormatManagement.tsx が使用中・エンドポイント: `GET /formats`）
- `getFormatFiles(folderName, subPath?)` ← 現役
- `createFormatSubfolder(formatName, subfolderName, parentPath?)` ← 現役
- `createFormatFile(folderName, data)` ← 現役
- `createFormatFolder(folderName)` ← 現役
- `updateFormatFileContent(filePath, content)` ← 現役
- `export const fetchFormats = getFormats` エイリアス
- `export const fetchFormatFiles = getFormatFiles` エイリアス
- import している型（`FormatListResponse`, `CreateFormatFileRequest`, `CreateFormatFileResponse` from `@/types/format`）もそのまま移植

`FormatManagement.tsx` の import パスのみ変更（`@/utils/formatApi` → `@/services/formatApiService`）。関数呼び出しの変更は不要。

---

## 3. 実装ステップ

### Phase 1: authService.ts への統合（authApi.ts の削除）

- [ ] `components/auth/LoginForm.tsx` を書き換え
  - import: `login` from `../../utils/authApi` → `authService` from `@/services/authService`
  - 呼び出し: `login(username, password, orgId)` → `authService.login({ userId: username, password }, orgId)`
  - 型: `LoginResponse` → `LoginResponseData` (types/api)
- [ ] `components/auth/PINCodeForm.tsx` を書き換え
  - import: `verifyPin, resendPin` from `../../utils/authApi` → `authService` from `@/services/authService`
  - 呼び出し: `verifyPin(pinCode, sessionToken, orgId)` → `authService.verifyPin(pinCode, sessionToken, orgId)`
  - 呼び出し: `resendPin(sessionToken, orgId)` → `authService.resendPin(sessionToken, orgId)`
  - 型: `VerifyPINResponse` → `VerifyPinResponseData` (types/api)、`ResendPINResponse` → `ResendPinResponseData` (types/api)
- [ ] `components/auth/PasswordResetRequest.tsx` を書き換え
  - import変更 + `resetPasswordRequest(username, orgId)` → `authService.resetPasswordRequest(username, orgId)`
- [ ] `components/auth/PasswordResetExecute.tsx` を書き換え
  - import変更 + `resetPassword(resetToken, newPassword)` → `authService.resetPassword(resetToken, newPassword)`
- [ ] `components/auth/__tests__/AuthContainer.integration.test.tsx` を書き換え
  - mock対象: `'../../../utils/authApi'` → `'@/services/authService'`
- [ ] `components/auth/__tests__/AuthContainer.accessibility.test.tsx` を書き換え
  - mock対象: `'../../../utils/authApi'` → `'@/services/authService'`
- [ ] `frontend/src/utils/authApi.ts` を削除

### Phase 2: formatApiService.ts への統合（formatApi.ts の削除）

- [ ] `services/formatApiService.ts` を書き直す
  - 削除: 古い `getFormats(fileType?)`, `getFormatFiles(formatId, subfolderId?)`, `getFormatsMock()`, `getFormatFilesMock()`, 未使用型定義（`Format`, `FormatFile`, `FormatFolder`, `FormatListResponse`, `FormatFileListResponse`）
  - 維持: `ApiResponse<T>` 型定義
  - 追加: `formatApi.ts` から全関数・エイリアス・必要な型を移植
- [ ] `components/format/FormatManagement.tsx` の import パスを変更
  - `from '@/utils/formatApi'` → `from '@/services/formatApiService'`
- [ ] `frontend/src/utils/formatApi.ts` を削除

### Phase 3: 動作確認

- [ ] TypeScript コンパイルエラーがないことを確認（`tsc --noEmit`）

---

## 4. 変更ファイル一覧

### 修正ファイル

| ファイル | 変更内容 |
|---|---|
| `frontend/src/services/formatApiService.ts` | 全面書き直し（旧関数削除 + formatApi.ts の全関数移植） |
| `frontend/src/components/auth/LoginForm.tsx` | import変更 + 呼び出し変更 + 型変更 |
| `frontend/src/components/auth/PINCodeForm.tsx` | import変更 + 呼び出し変更 + 型変更 |
| `frontend/src/components/auth/PasswordResetRequest.tsx` | import変更 + 呼び出し変更 |
| `frontend/src/components/auth/PasswordResetExecute.tsx` | import変更 + 呼び出し変更 |
| `frontend/src/components/auth/__tests__/AuthContainer.integration.test.tsx` | mock対象パス変更 |
| `frontend/src/components/auth/__tests__/AuthContainer.accessibility.test.tsx` | mock対象パス変更 |
| `frontend/src/components/format/FormatManagement.tsx` | importパスのみ変更 |

### 削除ファイル

| ファイル | 理由 |
|---|---|
| `frontend/src/utils/authApi.ts` | authService.ts に統合済み |
| `frontend/src/utils/formatApi.ts` | formatApiService.ts に統合済み |

---

## 5. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|---|---|---|---|
| 戻り値の型変更によるコンパイルエラー | 高 | 中 | Phase 3 の `tsc --noEmit` で検出・修正 |
| テストファイルのモック差異 | 中 | 中 | mock 対象パスを正確に更新する |
| `resendPin` の戻り値フィールド互換性 | 低 | 低 | `PINCodeForm.tsx` の `response.expiresIn` は `ResendPinResponseData` にも存在するため互換性あり |

---

## 6. 承認記録

- **計画書提示日時**: 2026-05-12 08:53
- **承認日時**: 2026-05-12 08:56
- **承認者コメント**: 承認済み、実施完了

---

## 7. 実施記録

### 実施日時
開始: 2026-05-12 08:56  
完了: 2026-05-12 09:01

### 実施内容

#### Phase 1: authApi.ts → authService.ts 統合

| 変更ファイル | 変更内容 |
|-------------|---------|
| `components/auth/LoginForm.tsx` | import を `authService.login` に変更、型を `LoginResponseData` に変更 |
| `components/auth/PINCodeForm.tsx` | import を `authService.verifyPin` / `authService.resendPin` に変更 |
| `components/auth/PasswordResetRequest.tsx` | import を `authService.resetPasswordRequest` に変更 |
| `components/auth/PasswordResetExecute.tsx` | import を `authService.resetPassword` に変更 |
| `components/auth/AuthContainer.tsx` | 型を `LoginResponseData` / `VerifyPinResponseData` に統一、undefined 対応 |
| `components/auth/__tests__/AuthContainer.integration.test.tsx` | モック対象を `authService` に変更 |
| `components/auth/__tests__/AuthContainer.accessibility.test.tsx` | モック対象を `authService` に変更 |
| `utils/__tests__/authApi.test.ts` | 削除（旧ファイルのテスト不要） |
| `utils/authApi.ts` | 削除（統合済み） |

#### Phase 2: formatApi.ts → formatApiService.ts 統合

| 変更ファイル | 変更内容 |
|-------------|---------|
| `services/formatApiService.ts` | `formatApi.ts` の全関数を取り込み、旧モック関数・未使用型を削除 |
| `components/format/FormatManagement.tsx` | import パスを `@/utils/formatApi` → `@/services/formatApiService` に変更 |
| `utils/formatApi.ts` | 削除 |

#### Phase 3: その他修正

| 変更ファイル | 変更内容 |
|-------------|---------|
| `utils/errorUtils.ts` | `ApiError` import（旧 `authApi.ts`）を `AuthServiceError`（`authService.ts`）に変更 |

### ビルド確認
`npx tsc --noEmit` → エラーなし ✓
