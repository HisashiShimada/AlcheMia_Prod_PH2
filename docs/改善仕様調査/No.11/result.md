# No.11 エラー体系化対応 - 対応結果

## メタデータ
- **対応完了日時**: 2026-03-24
- **関連タスクフォルダ**: `docs/20260323_1037_エラーコード体系化対応/`, `docs/20260323_1157_画面エラーメッセージハンドリング整理/`
- **調査レポート**: [README.md](./README.md)

---

## 1. 対応概要

reference版で実装されていたエラーコード体系（E1xxx〜E9xxx の番号体系）を、  
バックエンド・フロントエンドの双方に導入し、エラーコードによるログ特定を可能にした。  
あわせて画面コンポーネントのエラーハンドリングを `extractErrorMessage()` 経由に統一し、  
関連ユニットテストを新体系に対応させた。

---

## 2. 対応内容

### 2-1. バックエンド: エラーコード定数ファイルの新規作成

**ファイル**: `backend/src/enums/errorCodes.ts`（新規作成）

エラーコードを全カテゴリ一元定義した。

| カテゴリ | 範囲 | 定義コード数 |
|---------|------|------------|
| CLIENT（入力・バリデーション） | E1001〜E1009 | 9件 |
| DATA（データ形式・パース） | E2001〜E2004 | 4件 |
| NETWORK（通信） | E3001〜E3003 | 3件 |
| SERVER（システム内部） | E4001〜E4006 | 6件 |
| AUTH（認証・認可） | E5001〜E5015 | 15件 |
| RESOURCE（リソース不存在） | E6001〜E6006 | 6件 |
| BUSINESS（業務ロジック） | E7001〜E7008 | 8件 |
| UNKNOWN | E9999 | 1件 |
| **合計** | | **52件** |

旧コード（`AUTH_INVALID_CREDENTIALS` 等の文字列）から新コードへの変換マップ（`LEGACY_CODE_MAP`）も定義した。

```typescript
// 使用例
import { E5001, E5002 } from '../enums/errorCodes';
throw { code: E5001, message: '...' };
```

---

### 2-2. バックエンド: 全コントローラー・ミドルウェアの旧コード置換

各コントローラー・ミドルウェアで文字列リテラルとして散在していた旧エラーコードを新コードに置換した。

**対象ファイル**（抜粋）:
- `backend/src/controllers/authController.ts`
- `backend/src/controllers/projectController.ts`
- `backend/src/controllers/formatController.ts`
- `backend/src/controllers/fileAccessController.ts`
- `backend/src/controllers/issueController.ts`
- `backend/src/controllers/progressController.ts`
- `backend/src/controllers/taskRegistrationController.ts`
- `backend/src/middleware/rateLimitMiddleware.ts`
- `backend/src/middleware/errorHandlerMiddleware.ts`

**旧コードの残存ゼロを確認済み**。

---

### 2-3. フロントエンド: エラーコード定数ファイルの新規作成

**ファイル**: `frontend/src/utils/errorCodes.ts`（新規作成）

バックエンドと同一のエラーコード体系を定義。追加機能として以下も実装:
- `ErrorCode` 型（TypeScript型安全）
- `ERROR_CATEGORIES` 定数
- `getErrorCategory(code)` 関数 — コードからカテゴリを判定
- `HTTP_STATUS_TO_ERROR_CODE` マップ — HTTPステータスからエラーコードへのフォールバック変換

---

### 2-4. フロントエンド: errorMapper.ts の新コード体系対応

**ファイル**: `frontend/src/utils/errorMapper.ts`（更新）

認証系エラーのみだったメッセージマッピングを全カテゴリ（E1xxx〜E9xxx）に拡充。  
`mapErrorToMessage(code)` が唯一のメッセージ変換場所となった。

---

### 2-5. フロントエンド: authService.ts のエラー変換処理削除

**ファイル**: `frontend/src/services/authService.ts`（更新）

`translateErrorMessage()` を削除し、エラーコードをそのまま保持して throw するよう変更。  
これによりエラーコードが消えずにコンポーネントまで伝播するようになった。

---

### 2-6. フロントエンド: errorUtils.ts の一元化

**ファイル**: `frontend/src/utils/errorUtils.ts`（更新）

`extractErrorMessage()` が `errorMapper.ts` 経由で変換するよう統一。  
HTTP ステータスコードベースの個別変換ロジックを削除。

---

### 2-7. フロントエンド: Axios インターセプター追加（401 自動リトライ）

**ファイル**: `frontend/src/utils/authUtils.ts`（更新）

`createApiClient()` にレスポンスインターセプターを追加。  
401 エラー検出時にリフレッシュトークンを使ってアクセストークンを自動更新し、  
元のリクエストをリトライする。レスポンスは加工せずそのまま返し、  
各サービス層が `response.data.success` / `response.data.data` を参照する既存の形式を維持する。

---

### 2-8. フロントエンド: errorHandler.ts の新規作成

**ファイル**: `frontend/src/utils/errorHandler.ts`（新規作成）

エラー情報オブジェクトの生成・ログ出力・正規化ユーティリティを実装。

| 関数 | 役割 |
|------|------|
| `createError(code, options)` | エラー情報オブジェクト（AppError）を生成 |
| `getErrorCodeFromStatus(status, msg)` | HTTP ステータスからエラーコードを判定 |
| `handleFileUploadError(file, error)` | ファイルアップロードエラー処理 |
| `handleXMLParseError(error)` | XML パースエラー処理 |
| `logError(errorInfo)` | `[E5001] メッセージ` 形式でコンソール出力 |
| `normalizeError(error)` | 任意のエラーを AppError に統一 |

**ログ出力フォーマット**:
```
[E5001] ユーザー名またはパスワードが正しくありません
  { detail: '...', timestamp: '2026-03-23T...', originalError: Error }
```

---

### 2-9. フロントエンド: consoleLogger.ts の新規作成

**ファイル**: `frontend/src/utils/consoleLogger.ts`（新規作成）

reference版の `consoleLogger.js` を TypeScript 化して実装。

**主な機能**:
- `console.log/info/warn/error` をオーバーライドしてログを自動収集
- セッション ID 付与（集計可能）
- 最大 500 件保存（超過分は古い順に破棄）
- `sendLogsToBackend(userId)` で `POST /api/v1/logs/frontend` に一括送信
- `getStats()` でログ集計情報を取得

---

### 2-10. フロントエンド: 画面コンポーネントのエラーハンドリング統一

**対象ファイル（14件）**:

| グループ | ファイル |
|---------|---------|
| 認証系 | `auth/LoginForm.tsx`, `auth/PINCodeForm.tsx`, `auth/PasswordResetRequest.tsx`, `auth/PasswordResetExecute.tsx` |
| 実験作業系 | `ExperimentWorker/ExperimentRecordTab.tsx`, `ExperimentWorker/TransitionList.tsx`, `ExperimentWorker/ProgressCheckTab.tsx`, `ExperimentWorker/IssueManagementModal.tsx`, `ExperimentWorker/DataRecordDialog.tsx`, `ExperimentWorker/InstructionFlowDialog.tsx`, `ExperimentWorker/InstructionConfirmationTab.tsx`, `menus/ExperimentWorkerMenu.tsx` |
| エディタ系 | `editorv2/hooks/useWorkflow.ts`, `editorv2/hooks/useNamespaceOperations.ts` |

`catch` ブロックのハードコード文字列・`err.message` 直接参照をすべて `extractErrorMessage(err)` 経由に統一した。

```typescript
// 修正後（共通パターン）
import { extractErrorMessage } from '@/utils/errorUtils';
} catch (err) {
  message.error(extractErrorMessage(err));
}
```

---

### 2-11. フロントエンド: ユニットテストの更新

**ファイル**:
- `frontend/src/utils/__tests__/errorMapper.test.ts`（全面書き直し）
- `frontend/src/utils/__tests__/errorUtils.test.ts`（全面書き直し）

旧コード体系（`AUTH_INVALID_CREDENTIALS` 等）を対象としていたテストを、  
新コード体系（E1xxx〜E9xxx）と現行実装（`extractErrorCode` + `mapErrorToMessage`）に対応した内容に更新した。  
テスト件数: **100件（全パス）**

| ファイル | テスト件数 | 内容 |
|---------|---------|------|
| `errorMapper.test.ts` | 51件 | 全カテゴリのコード→メッセージ変換、フォールバック、エッジケース |
| `errorUtils.test.ts` | 49件 | AxiosError のコード抽出、HTTPステータスフォールバック、null/undefined 等 |

---

## 3. 対応前後の比較

| 項目 | 対応前 | 対応後 |
|------|--------|--------|
| バックエンドエラーコード定義 | 各コントローラーに文字列リテラルが散在 | `errorCodes.ts` に一元定義 ✅ |
| バックエンドエラーコード形式 | `AUTH_INVALID_CREDENTIALS` 等の文字列 | `E5001` 等の番号体系 ✅ |
| フロントエンドのメッセージ変換箇所 | `authService.ts` / `errorMapper.ts` / `errorUtils.ts` の3箇所に重複 | `errorMapper.ts` のみ（一元化）✅ |
| フロントエンドエラーコード対応範囲 | 認証系のみ | E1xxx〜E9xxx 全カテゴリ ✅ |
| 画面コンポーネントのエラー表示 | ハードコード文字列・`err.message` 直参照が混在 | `extractErrorMessage()` 経由に統一 ✅ |
| ログからエラー特定 | エラーコードがログに含まれない | `[E5001]` 形式でコンソール出力 ✅ |
| コンソールログ収集 | 未実装 | `consoleLogger.ts` で実装 ✅ |
| ユニットテスト | 旧コード体系ベース（一部失敗） | 新コード体系対応・100件全パス ✅ |

---

## 4. 作成・変更ファイル一覧

### 新規作成
| ファイル | 内容 |
|---------|------|
| `backend/src/enums/errorCodes.ts` | 統一エラーコード定数（52件）+ 旧コード変換マップ |
| `frontend/src/utils/errorCodes.ts` | フロントエンド用エラーコード定数 + HTTPステータスマッピング |
| `frontend/src/utils/errorHandler.ts` | AppError 生成・logError・normalizeError 等 |
| `frontend/src/utils/consoleLogger.ts` | ブラウザログキャプチャ・バックエンド送信 |

### 更新
| ファイル | 変更内容 |
|---------|---------|
| `backend/src/controllers/*.ts`（7ファイル） | 旧コード → E番号コードへ置換 |
| `backend/src/middleware/rateLimitMiddleware.ts` | E5005/E5007/E5008 適用 |
| `backend/src/middleware/errorHandlerMiddleware.ts` | デフォルトコード → E4001 |
| `frontend/src/utils/errorMapper.ts` | 全カテゴリのメッセージマッピング追加（唯一の変換場所化） |
| `frontend/src/utils/errorUtils.ts` | `errorMapper.ts` 経由に統一、独自変換ロジック削除 |
| `frontend/src/services/authService.ts` | `translateErrorMessage()` 削除、コード保持して throw |
| `frontend/src/utils/authUtils.ts` | Axios 401自動リトライ インターセプター追加 |
| `frontend/src/app/page.tsx` | 旧コード比較を `E5002` に修正 |
| `frontend/src/components/auth/LoginForm.tsx` | catch を `extractErrorMessage()` 経由に統一 |
| `frontend/src/components/auth/PINCodeForm.tsx` | catch を `extractErrorMessage()` 経由に統一 |
| `frontend/src/components/auth/PasswordResetRequest.tsx` | catch を `extractErrorMessage()` 経由に統一 |
| `frontend/src/components/auth/PasswordResetExecute.tsx` | catch を `extractErrorMessage()` 経由に統一 |
| `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx` | catch を `extractErrorMessage()` 経由に統一 |
| `frontend/src/components/ExperimentWorker/TransitionList.tsx` | catch を `extractErrorMessage()` 経由に統一 |
| `frontend/src/components/ExperimentWorker/ProgressCheckTab.tsx` | catch を `extractErrorMessage()` 経由に統一 |
| `frontend/src/components/ExperimentWorker/IssueManagementModal.tsx` | catch を `extractErrorMessage()` 経由に統一 |
| `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` | catch を `extractErrorMessage()` 経由に統一 |
| `frontend/src/components/ExperimentWorker/InstructionFlowDialog.tsx` | catch を `extractErrorMessage()` 経由に統一 |
| `frontend/src/components/ExperimentWorker/InstructionConfirmationTab.tsx` | catch を `extractErrorMessage()` 経由に統一 |
| `frontend/src/components/menus/ExperimentWorkerMenu.tsx` | catch を `extractErrorMessage()` 経由に統一 |
| `frontend/src/components/editorv2/hooks/useWorkflow.ts` | catch を `extractErrorMessage()` 経由に統一 |
| `frontend/src/components/editorv2/hooks/useNamespaceOperations.ts` | catch を `extractErrorMessage()` 経由に統一 |
| `frontend/src/utils/__tests__/errorMapper.test.ts` | 新コード体系（E1xxx〜E9xxx）対応に全面書き直し |
| `frontend/src/utils/__tests__/errorUtils.test.ts` | 現行実装対応に全面書き直し |
