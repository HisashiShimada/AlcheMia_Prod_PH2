# エラー体系化対応 調査レポート

## メタデータ
- **調査日時**: 2026-03-23 10:25
- **調査対象**: `backend/reference/` および `frontend/src/reference/`
- **目的**: reference版におけるエラー体系化の実装内容を調査し、現行版との差分を明確化する

---

## 調査サマリー

reference版では**エラーコードによる体系的なエラー管理**が部分的に実装されている。  
フロントエンド側に最も充実した実装（`errorHandler.js`）が存在し、エラーカテゴリ・エラーコード定義・ユーティリティ関数が揃っている。  
バックエンド側は reference版ではまだシンプルな実装にとどまるが、**現行版（`backend/src/`）ではエラーコード体系が既に一部実装済み**である。

---

## 1. フロントエンド reference版の実装（`frontend/src/reference/utils/errorHandler.js`）

### 1-1. エラーカテゴリ定義

```javascript
export const ERROR_CATEGORIES = {
  CLIENT: 'CLIENT',   // クライアントエラー（入力不正、バリデーション）
  SERVER: 'SERVER',   // サーバーエラー（API障害、DB接続）
  NETWORK: 'NETWORK', // ネットワークエラー（タイムアウト、接続失敗）
  DATA: 'DATA',       // データエラー（パース失敗、形式不正）
  AUTH: 'AUTH',       // 認証・認可エラー
  UNKNOWN: 'UNKNOWN'  // 不明なエラー
};
```

### 1-2. エラーコード定義（番号体系）

| コード範囲 | カテゴリ | 具体例 |
|-----------|---------|--------|
| E1xxx | CLIENT（クライアント） | E1001: ファイルサイズ超過、E1002: ファイル形式エラー、E1003: バリデーション、E1004: 必須項目不足 |
| E2xxx | DATA（データ） | E2001: XMLパース失敗、E2002: データ形式エラー、E2003: 読み込みエラー、E2004: 保存エラー |
| E3xxx | NETWORK（ネットワーク） | E3001: サーバー接続失敗、E3002: タイムアウト、E3003: ネットワークエラー |
| E4xxx | SERVER（サーバー） | E4001: サーバーエラー、E4002: データベースエラー、E4003: API実行エラー |
| E5xxx | AUTH（認証・認可） | E5001: 認証エラー、E5002: 権限エラー、E5003: セッション期限切れ |
| E9xxx | UNKNOWN（不明） | E9999: 予期しないエラー |

### 1-3. 各エラーコードの情報構造

各エラーコードは以下の情報を持つ：
```javascript
{
  code: 'E1001',
  category: 'CLIENT',
  message: 'ファイルアップロード失敗',      // 表示用メッセージ
  detail: 'ファイルサイズが上限を超えています',  // 詳細説明
  solution: 'ファイルサイズを確認してください（上限: 50MB）'  // 解決方法
}
```

### 1-4. 提供されているユーティリティ関数

| 関数名 | 役割 |
|--------|------|
| `createError(errorCode, options)` | エラー情報オブジェクトの生成 |
| `getErrorCodeFromStatus(statusCode, errorMessage)` | HTTPステータスコードからエラーコードを判定 |
| `handleFetchError(error, response)` | Fetch APIエラーの処理 |
| `handleFileUploadError(file, error)` | ファイルアップロードエラーの処理 |
| `handleXMLParseError(error, xmlContent)` | XMLパースエラーの処理 |
| `logError(errorInfo)` | コンソールへのエラーログ出力（`[E1001] メッセージ` 形式） |
| `formatErrorMessage(errorInfo, includeCode)` | 画面表示用メッセージのフォーマット |
| `normalizeError(error)` | 任意のエラーオブジェクトを統一形式に変換 |

### 1-5. ログ出力フォーマット

```javascript
// logError() の出力例
[E1001] ファイルアップロード失敗 {
  category: 'CLIENT',
  detail: 'ファイルサイズ: 60.00MB（上限: 50MB）',
  solution: 'ファイルサイズを確認してください（上限: 50MB）',
  timestamp: '2026-03-23T10:25:00.000Z',
  originalError: Error(...)
}
```

エラーコードがログに含まれるため、ログ検索で `[E1001]` のようにフィルタリングが可能。

---

## 2. フロントエンド reference版の実装（`frontend/src/reference/utils/consoleLogger.js`）

### 2-1. ConsoleLoggerクラス

ブラウザコンソールログをキャプチャしてバックエンドに送信する仕組み。

**主な機能：**
- `console.log / info / warn / error` をオーバーライドしてログを自動収集
- セッションIDを付与して集計可能
- 最大500件保存（超過分は古い順に破棄）
- エラー時はスタックトレースも記録
- `POST /api/logs/frontend` でバックエンドに一括送信

**ログエントリの構造：**
```javascript
{
  timestamp: '2026-03-23T10:25:00.000Z',
  level: 'error',         // log / info / warn / error
  message: '[E1001] ファイルアップロード失敗 - ...',
  url: 'https://example.com/page',
  userAgent: 'Mozilla/...',
  stackTrace: 'Error: ...' // errorレベルのみ
}
```

---

## 3. バックエンド reference版の実装

### 3-1. `backend/reference/middleware/errorHandler.js`（シンプルな旧実装）

```javascript
// シンプルなエラーハンドラー（エラーコード体系なし）
const errorHandler = (err, req, res, next) => {
  console.error('エラーが発生しました:', err);
  if (req.path.startsWith('/api/')) {
    return res.status(statusCode).json({
      message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};
```

→ reference版のバックエンドミドルウェア自体はまだシンプルで、エラーコード体系は持っていない。

### 3-2. `backend/reference/config/logger.js`（シンプルなロガー）

```javascript
// ログレベル付きシンプルロガー（構造化なし）
const logger = {
  debug: (message, meta) => console.log(`[DEBUG] ${message}`, meta),
  info:  (message, meta) => console.log(`[INFO] ${message}`, meta),
  warn:  (message, meta) => console.warn(`[WARN] ${message}`, meta),
  error: (message, meta) => console.error(`[ERROR] ${message}`, meta),
};
```

### 3-3. `backend/reference/middleware/auth.js`（エラーコードの使用例）

認証ミドルウェアでは一部エラーコードが定義されている：

| エラーコード | 説明 |
|-------------|------|
| `AUTH_REQUIRED` | 認証セッションなし |
| `SESSION_EXPIRED` | セッション期限切れ |
| `ACCOUNT_INACTIVE` | アカウント無効 |
| `INSUFFICIENT_ROLE` | ロール権限不足 |
| `INSUFFICIENT_ROLE_LEVEL` | 階層権限不足 |
| `INSUFFICIENT_PERMISSION` | 権限不足 |
| `ACCESS_DENIED` | アクセス拒否 |
| `SERVER_ERROR` | サーバーエラー |
| `RATE_LIMIT_EXCEEDED` | レート制限超過 |
| `LOGIN_RATE_LIMIT_EXCEEDED` | ログイン試行制限 |
| `ENDPOINT_NOT_FOUND` | 未定義エンドポイント |

### 3-4. `backend/reference/routes/logsRoutes.js`

フロントエンドから送信されたログを PostgreSQL の `frontend_logs` テーブルに保存するAPIが実装されている。

```
POST /api/logs/frontend  → フロントエンドログ保存
GET  /api/logs/frontend  → フロントエンドログ取得（管理者用）
```

---

## 4. 現行版（`backend/src/`）の実装状況

現行TypeScript版では、**バックエンドのエラーコード体系がより進んだ形で実装済み**。

### 4-1. `backend/src/middleware/errorHandlerMiddleware.ts`

統一エラーレスポンス形式が実装済み：
```typescript
{
  success: false,
  error: {
    code: 'SYSTEM_INTERNAL_ERROR',  // エラーコード
    message: 'システムエラーが発生しました',
    details: [...]                   // バリデーション詳細（任意）
  },
  meta: {
    timestamp: '2026-03-23T...',
    requestId: 'req_xxxxxxxx'
  }
}
```

### 4-2. `backend/src/utils/logger.ts`

構造化ログ（JSON形式）が実装済み：
- `logLevel`, `timestamp`, `userId`, `organizationId`, `requestId` などを含む
- APIリクエスト/レスポンスログ（`logApiRequest`, `logApiResponse`）
- `errorCode` フィールドがレスポンスログに含まれる

### 4-3. `backend/src/middleware/rateLimitMiddleware.ts`

レート制限エラーコードが体系化済み：
- `AUTH_RATE_LIMIT_EXCEEDED`
- `AUTH_PIN_MAX_ATTEMPTS`
- `AUTH_RESEND_LIMIT_EXCEEDED`

### 4-4. 各コントローラーのエラーコード（現行版）

コントローラーごとにエラーコードを文字列で定義しているが、**一元定義ではなくコントローラー内にインラインで記述**されている状態。

使用されているエラーコード一覧（抜粋）：

| 分類 | エラーコード |
|------|-------------|
| システム共通 | `SYSTEM_ERROR`, `SYSTEM_INTERNAL_ERROR`, `SYSTEM_DATABASE_ERROR`, `SYSTEM_EMAIL_SEND_FAILED`, `SYSTEM_JWT_GENERATION_FAILED`, `SYSTEM_REDIS_ERROR` |
| 認証 | `AUTH_INVALID_CREDENTIALS`, `AUTH_TOKEN_EXPIRED`, `AUTH_TOKEN_INVALID`, `AUTH_PIN_INVALID`, `AUTH_PIN_EXPIRED`, `AUTH_PIN_MAX_ATTEMPTS`, `AUTH_ACCOUNT_DISABLED`, `AUTH_RATE_LIMIT_EXCEEDED`, `AUTH_RESEND_LIMIT_EXCEEDED`, `AUTH_RESET_TOKEN_INVALID`, `AUTH_RESET_TOKEN_EXPIRED`, `AUTH_RESET_TOKEN_USED`, `AUTH_FORBIDDEN`, `AUTH_UNAUTHORIZED` |
| バリデーション | `VALIDATION_ERROR`, `REQUIRED_FIELD`, `INVALID_FOLDER_NAME`, `INVALID_FOLDER_NAME_LENGTH`, `INVALID_SUBFOLDER_NAME`, `INVALID_CONTENT` |
| リソース | `RESOURCE_NOT_FOUND`, `FILE_NOT_FOUND`, `FOLDER_NOT_FOUND`, `PARENT_FOLDER_NOT_FOUND` |
| ビジネスロジック | `BUSINESS_DUPLICATE_PROJECT_NAME`, `BUSINESS_PROJECT_CHECKED_OUT`, `BUSINESS_MAIML_NOT_REGISTERED`, `BUSINESS_ALREADY_ACKNOWLEDGED`, `PROJECT_ALREADY_CHECKED_OUT`, `PROJECT_STATUS_INVALID`, `TASK_IN_PROGRESS`, `TASK_NOT_FOUND`, `METHOD_NOT_FOUND` |
| 権限 | `PERMISSION_INSUFFICIENT` |
| ストレージ | `STORAGE_ERROR`, `FILE_ALREADY_EXISTS`, `FOLDER_ALREADY_EXISTS` |

### 4-5. `frontend/src/utils/errorMapper.ts`（現行版）

現行フロントエンドでも `ERROR_MESSAGE_MAP` でエラーコードとユーザー表示メッセージのマッピングが実装済み。ただし**認証系のみ**で、フロントエンド内部エラー（ファイル操作、XMLパースなど）は未対応。

---

## 5. reference版と現行版の差分まとめ

| 項目 | reference版 | 現行版（backend/src） | 現行版（frontend/src） |
|------|-------------|----------------------|----------------------|
| バックエンドエラーコード定義 | authミドルウェアのみ | コントローラーにインライン実装済み（一元定義なし） | — |
| バックエンドエラーレスポンス統一形式 | なし | `errorHandlerMiddleware.ts` で実装済み ✅ | — |
| バックエンド構造化ログ | シンプルな文字列ログ | JSON構造化ログ（logger.ts）実装済み ✅ | — |
| フロントエンドエラーコード体系 | 充実（E1xxx〜E9xxx番号体系）| — | authエラーのみ（mapErrorToMessage）部分実装 |
| フロントエンドコンソールログ収集・送信 | `ConsoleLogger`実装済み | DBテーブル（frontend_logs）への保存API実装済み | 未実装 |
| フロントエンドエラーユーティリティ関数 | `createError`, `handleFetchError`, `handleXMLParseError` など充実 | — | `mapErrorToMessage` のみ |

---

## 6. 未対応の課題（現行版に取り込めていない内容）

### 課題1: バックエンドエラーコードの一元定義ファイルがない

現行版では各コントローラーにエラーコードが文字列リテラルとして散在しており、**一元管理されていない**。  
reference版フロントエンドの `ERROR_CODES` 定義のように、`backend/src/enums/errorCodes.ts` 等に集約すべき。

```typescript
// 理想形（現在未実装）
export const ERROR_CODES = {
  SYSTEM_INTERNAL_ERROR: 'SYSTEM_INTERNAL_ERROR',
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  // ...
} as const;
```

### 課題2: フロントエンドのエラーコード体系が認証系のみ

現行フロントエンドの `errorMapper.ts` は認証エラーのみ対応。  
reference版の E1xxx（ファイル操作）、E2xxx（データ）、E3xxx（ネットワーク）等のコードが未実装。

### 課題3: フロントエンドのコンソールログ収集機能が未実装

reference版にある `ConsoleLogger`（ブラウザログを自動収集しバックエンドに送信する仕組み）が現行版フロントエンドに存在しない。  
バックエンド側には受け取るAPIが実装済みなので、フロントエンド側の実装が必要。

### 課題4: ログからエラーコードで検索できる仕組みが不完全

reference版フロントエンドでは `[E1001] メッセージ` 形式でログに出力するため、エラーコードでの絞り込みが可能。  
現行版ではエラーコードをログに含める実装が一部のみで統一されていない。

---

## 7. 推奨対応方針

### 優先度高
1. **バックエンドエラーコード定数ファイルの作成**  
   `backend/src/enums/errorCodes.ts` または `backend/src/types/errors.ts` に全エラーコードを集約し、各コントローラーからimportして使用する。

2. **フロントエンドエラーコード体系の拡充**  
   `frontend/src/utils/errorMapper.ts` に reference版の E1xxx〜E9xxx 相当のコードとメッセージマッピングを追加する。

### 優先度中
3. **フロントエンドエラーユーティリティ関数の移植**  
   reference版の `createError`, `handleFetchError`, `handleFileUploadError`, `handleXMLParseError` 等を TypeScript化して `frontend/src/utils/errorHandler.ts` として実装する。

4. **ConsoleLogger の移植**  
   reference版 `consoleLogger.js` を TypeScript化し、フロントエンドに組み込む（バックエンドAPIは実装済み）。

### 優先度低
5. **エラーログ出力フォーマットの統一**  
   フロントエンド・バックエンド双方でエラーコードを含む統一フォーマットでログ出力するよう標準化する。

---

## 8. 関連ファイル一覧

| ファイルパス | 役割 | 状態 |
|-------------|------|------|
| `frontend/src/reference/utils/errorHandler.js` | エラーコード体系定義・ユーティリティ | reference版のみ（現行未実装） |
| `frontend/src/reference/utils/consoleLogger.js` | ブラウザログ収集・送信 | reference版のみ（現行未実装） |
| `backend/reference/middleware/errorHandler.js` | シンプルエラーハンドラー | 旧実装（現行版に置き換え済み） |
| `backend/reference/config/logger.js` | シンプルロガー | 旧実装（現行版に置き換え済み） |
| `backend/reference/middleware/auth.js` | 認証エラーコード定義 | 部分的に現行版に引き継ぎ済み |
| `backend/reference/routes/logsRoutes.js` | フロントエンドログ保存API | 現行版に実装済みか要確認 |
| `backend/src/middleware/errorHandlerMiddleware.ts` | 統一エラーレスポンス形式 | 現行版で実装済み ✅ |
| `backend/src/utils/logger.ts` | 構造化ログ | 現行版で実装済み ✅ |
| `backend/src/middleware/rateLimitMiddleware.ts` | レート制限エラーコード | 現行版で実装済み ✅ |
| `frontend/src/utils/errorMapper.ts` | エラーコード→メッセージマッピング | 現行版で部分実装（auth系のみ） |
