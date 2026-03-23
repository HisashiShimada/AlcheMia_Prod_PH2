# タスク計画書: エラーコード体系化対応（番号体系統一版）

## メタデータ
- **作成日時**: 2026-03-23 10:37
- **更新日時**: 2026-03-23 10:40
- **タスクID**: error-code-system
- **優先度**: 中
- **推定工数**: 3日
- **前提資料**: [調査レポート](../改善仕様調査/20260323_1025_エラー体系化調査/README.md) / [対応方針](../改善仕様調査/20260323_1025_エラー体系化調査/対応方針.md)

---

## 1. タスク概要

バックエンド・フロントエンド双方のエラーコードを **E1xxx〜E9xxx の番号体系に統一** する。  
現在バックエンドが返している `AUTH_INVALID_CREDENTIALS` のような文字列コードを `E5001` のような番号コードに移行し、  
フロントエンドと同一のエラーコード体系でやり取りできるようにする。

**⚠️ 破壊的変更（Breaking Change）**  
APIレスポンスの `error.code` フィールドの値が変わるため、フロントエンドの `errorMapper.ts` も同時に更新する。

---

## 2. 目的と期待される成果

### 目的
- バックエンドとフロントエンドで共通のエラーコードを使い、ログからの原因特定を一元化する
- `E5001` のようなコードを見れば「認証エラー」と即座に分かる体系にする

### 期待される成果
- [ ] バックエンド・フロントエンド共通のエラーコード定義ファイルが作成される
- [ ] バックエンドのAPIレスポンスが `E1001` 〜 `E9999` 形式のコードを返すようになる
- [ ] フロントエンドの `errorMapper.ts` が新コード体系に対応する
- [ ] フロントエンドのエラーユーティリティ関数（`errorHandler.ts`）が実装される
- [ ] ConsoleLogger（ブラウザログ収集・送信）が実装される

---

## 3. エラーコード体系（統一版）

### カテゴリ番号規則

| 番号範囲 | カテゴリ | 対応する旧プレフィックス |
|---------|---------|----------------------|
| **E1xxx** | CLIENT（クライアント操作・入力エラー） | VALIDATION_* / REQUIRED_FIELD |
| **E2xxx** | DATA（データ形式・パースエラー） | 旧来なし（フロントエンドのみ） |
| **E3xxx** | NETWORK（ネットワーク・通信エラー） | 旧来なし（フロントエンドのみ） |
| **E4xxx** | SERVER（サーバー・システム内部エラー） | SYSTEM_* / STORAGE_* |
| **E5xxx** | AUTH（認証・認可エラー） | AUTH_* / PERMISSION_* |
| **E6xxx** | RESOURCE（リソース不存在・競合） | RESOURCE_* / FILE_* / FOLDER_* |
| **E7xxx** | BUSINESS（業務ロジックエラー） | BUSINESS_* / PROJECT_* / TASK_* |
| **E9xxx** | UNKNOWN（不明なエラー） | なし |

---

### 全エラーコード対応表

#### E1xxx - CLIENT（クライアント操作・入力エラー）

| 新コード | 旧コード（バックエンド） | 説明 |
|---------|----------------------|------|
| E1001 | — | ファイルサイズ超過 |
| E1002 | — | ファイル形式エラー |
| E1003 | VALIDATION_ERROR | バリデーションエラー |
| E1004 | VALIDATION_REQUIRED_FIELD / REQUIRED_FIELD | 必須項目不足 |
| E1005 | VALIDATION_INVALID_FORMAT | 入力形式エラー |
| E1006 | INVALID_FOLDER_NAME / INVALID_FOLDER_NAME_LENGTH | フォルダ名エラー |
| E1007 | INVALID_SUBFOLDER_NAME / INVALID_SUBFOLDER_NAME_LENGTH | サブフォルダ名エラー |
| E1008 | INVALID_CONTENT | コンテンツ形式エラー |
| E1009 | FORMAT_NAME_REQUIRED | フォーマット名未指定 |

#### E2xxx - DATA（データ形式・パースエラー）

| 新コード | 旧コード（バックエンド） | 説明 |
|---------|----------------------|------|
| E2001 | — | XMLパース失敗 |
| E2002 | — | データ形式エラー |
| E2003 | — | データ読み込みエラー |
| E2004 | — | データ保存エラー |

#### E3xxx - NETWORK（ネットワーク・通信エラー）

| 新コード | 旧コード（バックエンド） | 説明 |
|---------|----------------------|------|
| E3001 | — | サーバー接続失敗 |
| E3002 | — | タイムアウトエラー |
| E3003 | — | ネットワークエラー |

#### E4xxx - SERVER（サーバー・システム内部エラー）

| 新コード | 旧コード（バックエンド） | 説明 |
|---------|----------------------|------|
| E4001 | SYSTEM_ERROR / SYSTEM_INTERNAL_ERROR | サーバー内部エラー |
| E4002 | SYSTEM_DATABASE_ERROR | データベースエラー |
| E4003 | SYSTEM_EMAIL_SEND_FAILED | メール送信失敗 |
| E4004 | SYSTEM_JWT_GENERATION_FAILED | JWTトークン生成失敗 |
| E4005 | SYSTEM_REDIS_ERROR | Redisエラー |
| E4006 | STORAGE_ERROR | ストレージエラー |

#### E5xxx - AUTH（認証・認可エラー）

| 新コード | 旧コード（バックエンド） | 説明 |
|---------|----------------------|------|
| E5001 | AUTH_INVALID_CREDENTIALS | ログイン認証失敗 |
| E5002 | AUTH_TOKEN_EXPIRED / AUTH_TOKEN_INVALID | トークン無効・期限切れ |
| E5003 | AUTH_PIN_INVALID | PINコード不正 |
| E5004 | AUTH_PIN_EXPIRED | PINコード期限切れ |
| E5005 | AUTH_PIN_MAX_ATTEMPTS | PINコード試行回数超過 |
| E5006 | AUTH_ACCOUNT_DISABLED | アカウント無効 |
| E5007 | AUTH_RATE_LIMIT_EXCEEDED | ログイン試行回数超過 |
| E5008 | AUTH_RESEND_LIMIT_EXCEEDED | PIN再送信回数超過 |
| E5009 | AUTH_RESET_TOKEN_INVALID | リセットトークン不正 |
| E5010 | AUTH_RESET_TOKEN_EXPIRED | リセットトークン期限切れ |
| E5011 | AUTH_RESET_TOKEN_USED | リセットトークン使用済み |
| E5012 | AUTH_FORBIDDEN / ACCESS_DENIED | アクセス拒否 |
| E5013 | AUTH_UNAUTHORIZED / AUTH_REQUIRED | 認証必須 |
| E5014 | AUTH_SESSION_EXPIRED | セッション期限切れ |
| E5015 | PERMISSION_INSUFFICIENT | 権限不足 |

#### E6xxx - RESOURCE（リソース不存在・競合）

| 新コード | 旧コード（バックエンド） | 説明 |
|---------|----------------------|------|
| E6001 | RESOURCE_NOT_FOUND | リソース不存在 |
| E6002 | FILE_NOT_FOUND | ファイル不存在 |
| E6003 | FOLDER_NOT_FOUND | フォルダ不存在 |
| E6004 | PARENT_FOLDER_NOT_FOUND | 親フォルダ不存在 |
| E6005 | FILE_ALREADY_EXISTS | ファイル重複 |
| E6006 | FOLDER_ALREADY_EXISTS | フォルダ重複 |

#### E7xxx - BUSINESS（業務ロジックエラー）

| 新コード | 旧コード（バックエンド） | 説明 |
|---------|----------------------|------|
| E7001 | BUSINESS_DUPLICATE_PROJECT_NAME | プロジェクト名重複 |
| E7002 | BUSINESS_PROJECT_CHECKED_OUT / PROJECT_ALREADY_CHECKED_OUT | プロジェクトチェックアウト中 |
| E7003 | BUSINESS_MAIML_NOT_REGISTERED | MAIMLファイル未登録 |
| E7004 | BUSINESS_ALREADY_ACKNOWLEDGED | 既に確認済み |
| E7005 | PROJECT_STATUS_INVALID | プロジェクト状態不正 |
| E7006 | PROJECT_INSTRUCTION_NOT_FOUND | プロジェクト指示不存在 |
| E7007 | TASK_IN_PROGRESS | タスク作業中 |
| E7008 | TASK_NOT_FOUND / METHOD_NOT_FOUND | タスク・メソッド不存在 |

#### E9xxx - UNKNOWN（不明なエラー）

| 新コード | 旧コード（バックエンド） | 説明 |
|---------|----------------------|------|
| E9999 | — | 予期しないエラー |

---

## 3.5 現状の問題：フロントエンドAPIレスポンス処理の二重化・三重化

### 問題1: `response.data.data` 二重アクセス問題

Axiosが HTTP レスポンスボディを `response.data` に格納し、さらにバックエンドの ApiResponse が `data` フィールドを持つため、**実データに到達するには `.data.data` の二重アクセスが必要**になっている。

```
Axios レスポンス
  response               ← Axiosのラッパー
    .data                ← HTTP レスポンスボディ（= バックエンドの ApiResponse<T>）
      .success: true
      .data: T           ← 実際のデータ ← ここを取りたい
      .meta: { ... }

→ 結果: response.data.data で実データを取得（全164箇所で発生）
```

`templateApi.ts` では**三重構造**まで発生：
```typescript
// Axios → ApiResponse → ネストされた data オブジェクト
response.data.data?.data?.content  // 三重アクセス
```

#### 解決方針: `createApiClient` にレスポンスインターセプターを追加

Axiosの `response` インターセプターで `ApiResponse<T>` をアンラップし、  
サービス層では `response.data` だけで実データが取れるようにする。

```typescript
// 修正後のイメージ
// authUtils.ts の createApiClient() にインターセプターを追加
client.interceptors.response.use((response) => {
  // ApiResponse<T> 形式なら data フィールドをアンラップ
  if (response.data && typeof response.data.success === 'boolean') {
    if (response.data.success) {
      // response.data を ApiResponse.data（実データ）に置き換え
      response.data = response.data.data;
    } else {
      // エラーレスポンスは throw してエラーハンドリングへ
      const err = new Error(response.data.error?.message || 'API Error');
      (err as any).code = response.data.error?.code;
      throw err;
    }
  }
  return response;
});

// 変更後のサービス層
// 変更前: return response.data.data;
// 変更後: return response.data;  ← シンプルになる
```

#### 影響範囲

- `frontend/src/utils/authUtils.ts` の `createApiClient()` にインターセプター追加
- 全サービスファイル（164箇所の `response.data.data` を `response.data` に修正）
  - `projectApiService.ts`（最多）
  - `authService.ts`
  - `userApiService.ts`
  - `roleApiService.ts`
  - `departmentApiService.ts`
  - その他全サービスファイル

---

### 問題の全体像

現在、エラーメッセージの変換処理が **3箇所に重複** しており、コードが消えてしまっている。

```
【現状の問題フロー】

バックエンドレスポンス
  { error: { code: 'AUTH_INVALID_CREDENTIALS', message: '...' } }
          ↓
① authService.ts の translateErrorMessage()
    AUTH_INVALID_CREDENTIALS → '「ユーザー名またはパスワードが...」'
    → AuthServiceError(翻訳済みメッセージ, errorCode) をthrow
    → ❌ エラーコードは残るが、メッセージは既に翻訳済み
          ↓
② errorMapper.ts の ERROR_MESSAGE_MAP
    → 同じエラーコードの翻訳が二重定義されている
          ↓
③ errorUtils.ts の extractErrorMessage()
    → HTTPステータスコードベースの日本語メッセージが独立して定義
```

### 問題点の整理

| 問題 | 詳細 |
|------|------|
| **メッセージ変換の三重定義** | `authService.ts` / `errorMapper.ts` / `errorUtils.ts` に同じ変換が散在 |
| **エラーコードが消える** | `authService.ts` がメッセージを翻訳してthrowするため、コンポーネントがcodeを参照できない場合がある |
| **コンソールにコードが出ない** | `[E5001]` 形式のログが出ないため、ログからの原因特定が困難 |
| **各サービスが独立してエラーを吸収** | `projectApiService.ts` 等でも同様の問題が発生している可能性 |

### 修正後の理想アーキテクチャ

```
【修正後のフロー】

バックエンドレスポンス
  { error: { code: 'E5001', message: '...' } }
          ↓
authService.ts / 各APIサービス
  → エラーを翻訳せず、コードを保持したままthrow
  → throw new AuthServiceError(originalMessage, 'E5001')
          ↓
errorMapper.ts（唯一のメッセージ変換場所）
  → E5001 → 'ユーザー名またはパスワードが正しくありません'
          ↓
コンポーネント
  → mapErrorToMessage(error.code) で表示
  → logError('[E5001] 認証エラー') でコンソール出力
```

---

## 4. 実装ステップ

### Phase 1: 共通エラーコード定義の作成（0.5日）

- [ ] **`backend/src/enums/errorCodes.ts`** を新規作成
  - 全番号コード（E1001〜E9999）を定数定義
  - 旧コード（`AUTH_INVALID_CREDENTIALS` 等）から新コード（`E5001`）への変換マップも定義
  - `ErrorCode` 型を export する
- [ ] **`frontend/src/utils/errorCodes.ts`** を新規作成
  - `ERROR_CATEGORIES` 定義（CLIENT / DATA / NETWORK / SERVER / AUTH / RESOURCE / BUSINESS / UNKNOWN）
  - `ErrorDefinition` インターフェース定義
  - 全番号コードの詳細情報（message / detail / solution）を定義

### Phase 2: バックエンドの番号コード移行（1日）

- [ ] 各コントローラーのエラーコード文字列を新コードに置き換え
  - `authController.ts`：AUTH_INVALID_CREDENTIALS → E5001 等
  - `projectController.ts`：RESOURCE_NOT_FOUND → E6001、BUSINESS_* → E7xxx 等
  - `formatController.ts`：INVALID_FOLDER_NAME → E1006、FOLDER_ALREADY_EXISTS → E6006 等
  - `fileAccessController.ts`：STORAGE_ERROR → E4006、RESOURCE_NOT_FOUND → E6001 等
  - `issueController.ts`：RESOURCE_NOT_FOUND → E6001、VALIDATION_* → E1xxx 等
  - `progressController.ts`：TASK_NOT_FOUND → E7008、METHOD_NOT_FOUND → E7008 等
  - `taskRegistrationController.ts`：RESOURCE_NOT_FOUND → E6001、BUSINESS_* → E7xxx 等
- [ ] `rateLimitMiddleware.ts` のエラーコードも新コードに変更
  - AUTH_RATE_LIMIT_EXCEEDED → E5007
  - AUTH_PIN_MAX_ATTEMPTS → E5005
  - AUTH_RESEND_LIMIT_EXCEEDED → E5008
- [ ] `errorHandlerMiddleware.ts` のデフォルトコード変更
  - SYSTEM_INTERNAL_ERROR → E4001

### Phase 3: フロントエンドAPIレスポンス処理の整理（1日）

#### 3-1: `response.data.data` 二重アクセスの解消

- [ ] **`frontend/src/utils/authUtils.ts`** の `createApiClient()` にレスポンスインターセプターを追加
  - `ApiResponse<T>` 形式のレスポンスを自動アンラップ（`response.data.data` → `response.data`）
  - エラーレスポンス（`success: false`）を自動的に throw してエラーハンドリングへ転送
- [ ] 全サービスファイルの `response.data.data` を `response.data` に修正（164箇所）
  - `projectApiService.ts`
  - `authService.ts`
  - `userApiService.ts` / `roleApiService.ts` / `departmentApiService.ts`
  - `issueApiService.ts` / `fileAccessService.ts` / `sessionApiService.ts`
  - `templateApi.ts`（三重構造 `response.data.data?.data?.content` も解消）
  - その他全サービスファイル
- [ ] `frontend/src/utils/authApi.ts` の `response.data.data` を `response.data` に修正

#### 3-2: エラーメッセージ変換の一元化

- [ ] **`frontend/src/services/authService.ts`** の `translateErrorMessage()` を削除
  - `handleApiError()` はエラーコードをそのまま保持してthrowするように変更（翻訳しない）
- [ ] **`frontend/src/utils/errorUtils.ts`** のHTTPステータスベース変換を削除
  - 変換処理を `errorMapper.ts` に集約
- [ ] **`frontend/src/utils/errorMapper.ts`** を更新
  - 既存の `AUTH_INVALID_CREDENTIALS` 等の旧コードを削除し、新コード（`E5001` 等）に置き換え
  - 全カテゴリのメッセージマッピングを追加（唯一のメッセージ変換場所にする）

### Phase 4: フロントエンドエラーユーティリティ関数の実装（0.5日）

- [ ] **`frontend/src/utils/errorHandler.ts`** を新規作成
  - `AppError` インターフェース定義
  - `createError(errorCode, options)` 実装
  - `getErrorCodeFromStatus(statusCode, errorMessage)` 実装
  - `handleFetchError(error, response)` 実装
  - `handleFileUploadError(file, error)` 実装
  - `handleXMLParseError(error, xmlContent)` 実装
  - `logError(errorInfo)` 実装（`[E5001] メッセージ` 形式）
  - `normalizeError(error)` 実装

### Phase 5: ConsoleLogger の移植（0.5日）

- [ ] `backend/src/routes/` 配下に `/api/logs/frontend` エンドポイントが存在するか確認
  - 存在しない場合はバックエンド側のルート・コントローラーを作成
- [ ] **`frontend/src/utils/consoleLogger.ts`** を新規作成
  - `ConsoleLogger` クラスを TypeScript 化
  - `startCapture()` / `stopCapture()` / `sendLogsToBackend()` を実装
- [ ] アプリケーション起動時にキャプチャを開始する処理を追加（`layout.tsx` 等）

---

## 5. 影響範囲

### 新規作成するファイル
1. `backend/src/enums/errorCodes.ts` - 統一エラーコード定数定義
2. `frontend/src/utils/errorCodes.ts` - フロントエンドエラーコード詳細定義
3. `frontend/src/utils/errorHandler.ts` - エラーユーティリティ関数
4. `frontend/src/utils/consoleLogger.ts` - ブラウザログ収集

### 変更するファイル

**バックエンド**
1. `backend/src/controllers/authController.ts`
2. `backend/src/controllers/projectController.ts`
3. `backend/src/controllers/formatController.ts`
4. `backend/src/controllers/fileAccessController.ts`
5. `backend/src/controllers/issueController.ts`
6. `backend/src/controllers/progressController.ts`
7. `backend/src/controllers/taskRegistrationController.ts`
8. `backend/src/middleware/rateLimitMiddleware.ts`
9. `backend/src/middleware/errorHandlerMiddleware.ts`

**フロントエンド（レスポンス処理整理）**
10. `frontend/src/utils/authUtils.ts` - レスポンスインターセプター追加
11. `frontend/src/services/projectApiService.ts` - `response.data.data` → `response.data`
12. `frontend/src/services/authService.ts` - `response.data.data` 修正 + `translateErrorMessage` 削除
13. `frontend/src/services/userApiService.ts` - `response.data.data` → `response.data`
14. `frontend/src/services/roleApiService.ts` - `response.data.data` → `response.data`
15. `frontend/src/services/departmentApiService.ts` - `response.data.data` → `response.data`
16. `frontend/src/services/issueApiService.ts` - `response.data.data` → `response.data`
17. `frontend/src/services/fileAccessService.ts` - `response.data.data` → `response.data`
18. `frontend/src/services/sessionApiService.ts` - `response.data.data` → `response.data`
19. `frontend/src/services/templateApi.ts` - 三重構造を解消
20. その他サービスファイル（codeMasterApiService.ts / corporationApiService.ts 等）

**フロントエンド（エラー処理整理）**
21. `frontend/src/utils/errorMapper.ts` - 新コード体系対応 + 唯一のメッセージ変換場所に
22. `frontend/src/utils/errorUtils.ts` - HTTPステータスベース変換を削除
23. `frontend/src/utils/authApi.ts` - `response.data.data` 修正・エラーコード更新

### ⚠️ 破壊的変更（APIレスポンス変更）
APIの `error.code` フィールドの値が変わる（例: `AUTH_INVALID_CREDENTIALS` → `E5001`）。  
バックエンドとフロントエンドを同時にリリースする必要がある。

---

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| バックエンド・フロントエンドのリリースタイミングがずれる | 高 | 中 | 同一PRでバックエンドとフロントエンドをまとめてリリースする |
| 既存テスト（errorMapper.test.ts）が旧コードを参照している | 中 | 高 | Phase 3でテストも同時に更新する |
| コントローラー変更時のエラーコード漏れ | 中 | 中 | 変更後に `grep -r "AUTH_\|SYSTEM_\|BUSINESS_\|RESOURCE_"` で旧コードが残っていないか確認する |
| `/api/logs/frontend` が現行版に未実装 | 中 | 中 | Phase 5 開始前にバックエンドルートを確認する |

---

## 7. テスト計画

### ユニットテスト
- [ ] `errorCodes.ts`（バックエンド）: 全エラーコードが E1xxx〜E9xxx 形式で定義されていることを確認
- [ ] `errorHandler.ts`（フロントエンド）: `createError` / `getErrorCodeFromStatus` / `normalizeError` の動作確認
- [ ] `errorMapper.test.ts`（フロントエンド）: 旧コードを新コードに更新し、全マッピングをテスト

### 手動テスト
- [ ] ログイン失敗時のレスポンスに `"code": "E5001"` が含まれることを確認
- [ ] 権限エラー時のレスポンスに `"code": "E5015"` が含まれることを確認
- [ ] 存在しないリソースアクセス時のレスポンスに `"code": "E6001"` が含まれることを確認
- [ ] フロントエンドのコンソールに `[E5001] 認証エラー` 形式でログが出力されることを確認

---

## 8. ロールバック計画

バックエンドのコントローラー変更が番号コードへの置き換えのみのため、  
問題が発生した場合は `errorCodes.ts` を旧コード体系に戻し、コントローラーのimportを元に戻す。  
フロントエンドの新規ファイルは削除、`errorMapper.ts` は git で差し戻す。

---

## 9. 関連ドキュメント

- [調査レポート（README.md）](../改善仕様調査/20260323_1025_エラー体系化調査/README.md)
- [対応方針（対応方針.md）](../改善仕様調査/20260323_1025_エラー体系化調査/対応方針.md)

---

## 10. 承認記録

- **計画書提示日時**: 2026-03-23 10:40
- **承認日時**: 2026-03-23 11:07
- **承認者コメント**: ApiResponse削除は取りやめ、インターセプターでアンラップ方式を採用。エラー握りつぶし（各サービスでコードを日本語に変換してthrow）も排除する。

---

## 11. 実施記録

### 実施日時
開始: 2026-03-23 11:07  
完了: 2026-03-23 11:45

### 計画からの変更点
- Phase 3-1（レスポンスインターセプター）は `authUtils.ts` の `createApiClient()` に追加済みだった（一部作業済み）
- `errorHandler.ts` は `errorCodes.ts` の export 形式が個別定数のみだったため、`errorMapper.ts` 経由のシンプルな実装に変更

### 最終的な成果物
- [x] `backend/src/enums/errorCodes.ts` — 全エラーコード定数定義（E1001〜E9999）
- [x] `frontend/src/utils/errorCodes.ts` — フロントエンド用エラーコード定数 + HTTPステータスマッピング
- [x] `frontend/src/utils/errorHandler.ts` — createError / logError / normalizeError 等
- [x] `frontend/src/utils/consoleLogger.ts` — ブラウザログキャプチャ・バックエンド送信
- [x] 各コントローラー・サービス・ミドルウェアの番号コード移行（旧コード残存ゼロ確認済み）
- [x] `errorMapper.ts` の新コード体系対応（E1xxx〜E9xxx 全カテゴリ）
- [x] `errorUtils.ts` を `errorMapper.ts` 経由に変更
- [x] `page.tsx` の旧コード比較修正（`AUTH_TOKEN_EXPIRED` → `E5002`）

---

## 12. 未対応の残課題（次タスクで対応推奨）

### 画面コンポーネントのエラーハンドリング未対応

今回の対応範囲はサービス層・ユーティリティ層の整備に留まり、  
**画面コンポーネント（components/ 配下）のエラーハンドリングは未対応**。  
以下の2パターンが多数存在しており、APIのエラーコードがUIに反映されていない。

#### パターン1: ハードコード文字列（APIエラーコードを完全無視）

```typescript
// ❌ 現状: APIが E7008 を返しても無視して固定文字列を表示
} catch {
  message.error('タスク一覧の取得中にエラーが発生しました');
}

// ✅ 理想: extractErrorMessage() 経由でエラーコードに対応したメッセージを表示
} catch (err) {
  message.error(extractErrorMessage(err));
}
```

#### パターン2: `err.message` 直接参照（`extractErrorMessage()` を経由していない）

```typescript
// ❌ 現状: err.message をそのまま使用（エラーコードによるマッピング未適用）
const errorMessage = err instanceof Error ? err.message : '予期しないエラーが発生しました';
setError(errorMessage);

// ✅ 理想: extractErrorMessage() 経由でエラーコードに対応したメッセージを表示
const errorMessage = extractErrorMessage(err);
setError(errorMessage);
```

#### 対象ファイル（調査結果）

| ファイル | パターン | 件数 |
|---------|---------|------|
| `ExperimentWorker/ExperimentRecordTab.tsx` | パターン1 | 4件 |
| `ExperimentWorker/InstructionConfirmationTab.tsx` | パターン1 | 3件 |
| `ExperimentWorker/TransitionList.tsx` | パターン1 | 4件 |
| `ExperimentWorker/ProgressCheckTab.tsx` | パターン1+2 | 複数件 |
| `ExperimentWorker/IssueManagementModal.tsx` | パターン1 | 3件 |
| `ExperimentWorker/DataRecordDialog.tsx` | パターン1 | 1件 |
| `ExperimentWorker/InstructionFlowDialog.tsx` | パターン2 | 1件 |
| `auth/LoginForm.tsx` | パターン2 | 1件 |
| `auth/PINCodeForm.tsx` | パターン2 | 2件 |
| `auth/PasswordResetRequest.tsx` | パターン2 | 1件 |
| `auth/PasswordResetExecute.tsx` | パターン2 | 1件 |
| `editorv2/hooks/useWorkflow.ts` | パターン2 | 1件 |
| `editorv2/hooks/useNamespaceOperations.ts` | パターン2 | 5件 |
| `menus/ExperimentWorkerMenu.tsx` | パターン1 | 1件 |

#### 対応方針（次タスク）

1. `extractErrorMessage()` を import して `catch` ブロックのエラー処理を統一する
2. ハードコード文字列は削除し、APIから返ってくるエラーコードに対応したメッセージを使用する
3. 重要度の高い画面（認証系・実験作業系）から優先対応する

> **注意**: `extractErrorMessage(err)` は内部で `extractErrorCode(err)` → `mapErrorToMessage(code)` を呼ぶため、
> 既存のインフラ（`errorUtils.ts` + `errorMapper.ts`）をそのまま使用できる。追加実装は不要。
