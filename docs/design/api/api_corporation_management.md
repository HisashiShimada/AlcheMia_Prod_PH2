# 会社管理API設計書

## メタデータ
- **作成日**: 2026-02-13
- **バージョン**: 1.0.0
- **最終更新**: 2026-02-13
- **担当**: Development Team
- **実装状況**: ✅ 実装済み（100%）

---

## 概要

このドキュメントは、会社マスタを管理するためのAPI仕様を定義します。

### 主な機能
- 会社一覧の取得（検索・フィルタリング・ソート対応）
- 会社詳細の取得
- 会社の新規作成
- 会社情報の更新
- 会社のアクティブ状態変更
- CSVによる一括ダウンロード
- CSVによる一括アップロード（バッチ処理）

### 対象ユーザー
- プロバイダー（Provider）: 全機能へのアクセス

---

## 📋 API一覧

| No | HTTPメソッド | エンドポイント | 説明 | 実装状態 | 権限 |
|----|-------------|---------------|------|---------|------|
| 1 | GET | /api/v1/provider/corporation | 会社一覧取得 | ✅ 実装済み | Provider |
| 2 | GET | /api/v1/provider/corporation/download-csv | 会社CSVダウンロード | ✅ 実装済み | Provider |
| 3 | POST | /api/v1/provider/corporation/upload-csv | 会社CSVアップロード | ✅ 実装済み | Provider |
| 4 | GET | /api/v1/provider/corporation/:corporationId | 会社詳細取得 | ✅ 実装済み | Provider |
| 5 | POST | /api/v1/provider/corporation | 会社新規作成 | ✅ 実装済み | Provider |
| 6 | PUT | /api/v1/provider/corporation/:corporationId | 会社更新 | ✅ 実装済み | Provider |
| 7 | PATCH | /api/v1/provider/corporation/:corporationId/status | 会社アクティブ状態更新 | ✅ 実装済み | Provider |

---

## 1. 会社一覧取得API

### 概要
会社一覧を取得します。検索、フィルタリング、ソート機能に対応します。

### エンドポイント
```
GET /api/v1/provider/corporation
```

### HTTPメソッド
GET

### 認証要件
- JWT認証必須
- ロール: Provider

### ミドルウェアチェーン
```typescript
router.get('/corporation',
  authMiddleware,              // JWT認証
  handleValidationErrors,      // バリデーションエラーハンドリング
  corporationController.getCorporation
);
```

### リクエスト

#### クエリパラメータ
| パラメータ | 型 | 必須 | デフォルト | 説明 |
|-----------|----|----|-----------|------|
| search | string | × | - | 会社名で検索 |
| is_active | boolean | × | - | アクティブ状態でフィルタ（true/false） |
| sort_by | string | × | - | ソート項目（corporation_name, update_at） |
| sort_order | string | × | asc | ソート順（asc/desc） |

#### リクエスト例
```
GET /api/v1/provider/corporation?search=研究所&is_active=true&sort_by=corporation_name&sort_order=asc
```

### レスポンス

#### 成功時（200 OK）
```json
{
  "success": true,
  "data": [
    {
      "corporationId": "corp-uuid-001",
      "corporationName": "研究所A",
      "isActive": true,
      "createdAt": "2026-01-01T00:00:00Z",
      "updatedAt": "2026-02-13T10:00:00Z"
    },
    {
      "corporationId": "corp-uuid-002",
      "corporationName": "研究所B",
      "isActive": true,
      "createdAt": "2026-01-01T00:00:00Z",
      "updatedAt": "2026-02-13T10:00:00Z"
    }
  ],
  "meta": {
    "timestamp": "2026-02-13T15:00:00Z",
    "requestId": "req_abc123"
  }
}
```

### ビジネスロジック

1. **認証チェック**
   - JWT認証でuserIdを取得
   - Providerの権限を確認

2. **フィルタリング**
   - searchパラメータ: 会社名に対して部分一致検索
   - is_activeパラメータ: アクティブ状態でフィルタリング

3. **ソート**
   - sort_byで指定されたフィールドでソート
   - sort_orderで昇順/降順を制御

### バリデーション

#### 値チェック
- [ ] searchは文字列（指定時）
- [ ] is_activeはboolean（指定時）
- [ ] sort_byは許可された値（corporation_name, update_at）
- [ ] sort_orderは"asc"または"desc"

### データベーステーブル

#### 使用テーブル
1. **corporation**（主テーブル）
   - corporation_id, corporation_name, is_active
   - create_user_id, create_at, update_user_id, update_at

### セキュリティ

#### 認証・認可
- [ ] JWT認証必須
- [ ] Providerの権限が必要

#### 入力検証
- [ ] SQLインジェクション対策（Parameterized Queries）

---

## 2. 会社CSVダウンロードAPI

### 概要
会社一覧をCSV形式でダウンロードします。フィルタ条件を適用できます。

### エンドポイント
```
GET /api/v1/provider/corporation/download-csv
```

### HTTPメソッド
GET

### 認証要件
- JWT認証必須
- ロール: Provider

### リクエスト

#### クエリパラメータ
| パラメータ | 型 | 必須 | デフォルト | 説明 |
|-----------|----|----|-----------|------|
| search | string | × | - | 会社名で検索 |
| is_active | boolean | × | - | アクティブ状態でフィルタ |

### レスポンス

#### 成功時（200 OK）
**Content-Type**: `text/csv; charset=utf-8`

**ファイル名**: `corporations_YYYYMMDDhhmmss.csv`

**CSV形式** (UTF-8 BOM付き):
```csv
corporation_name,update_at,is_active
研究所A,2026-02-13T10:00:00Z,true
研究所B,2026-02-13T10:00:00Z,true
研究所C,2026-02-13T10:00:00Z,false
```

---

## 3. 会社CSVアップロードAPI

### 概要
CSV形式で会社データを一括登録・更新します。

### エンドポイント
```
POST /api/v1/provider/corporation/upload-csv
```

### HTTPメソッド
POST

### 認証要件
- JWT認証必須
- ロール: Provider

### リクエスト

#### マルチパートフォームデータ
**Content-Type**: `multipart/form-data`

| フィールド | 型 | 必須 | 説明 |
|-----------|----|----|------|
| file | File | ○ | CSVファイル |

#### CSV形式
```csv
corporation_name,is_active
研究所A,true
研究所B,true
研究所C,false
```

### レスポンス

#### 成功時（200 OK）
```json
{
  "success": true,
  "data": {
    "created": 2,
    "updated": 1,
    "errors": []
  },
  "meta": {
    "timestamp": "2026-02-13T15:00:00Z",
    "requestId": "req_abc123"
  }
}
```

---

## 4. 会社詳細取得API

### 概要
会社IDを指定して、会社の詳細情報を取得します。

### エンドポイント
```
GET /api/v1/provider/corporation/:corporationId
```

### HTTPメソッド
GET

### 認証要件
- JWT認証必須
- ロール: Provider

### リクエスト

#### パスパラメータ
| パラメータ | 型 | 必須 | 説明 |
|-----------|----|----|------|
| corporationId | UUID | ○ | 会社ID |

### レスポンス

#### 成功時（200 OK）
```json
{
  "success": true,
  "data": {
    "corporationId": "corp-uuid-001",
    "corporationName": "研究所A",
    "isActive": true,
    "createdAt": "2026-01-01T00:00:00Z",
    "updatedAt": "2026-02-13T10:00:00Z"
  },
  "meta": {
    "timestamp": "2026-02-13T15:00:00Z",
    "requestId": "req_abc123"
  }
}
```

#### エラー時（404 Not Found）
```json
{
  "success": false,
  "error": {
    "code": "CORPORATION_NOT_FOUND",
    "message": "Corporation not found"
  },
  "meta": {
    "timestamp": "2026-02-13T15:00:00Z",
    "requestId": "req_abc123"
  }
}
```

---

## 5. 会社新規作成API

### 概要
新しい会社を作成します。

### エンドポイント
```
POST /api/v1/provider/corporation
```

### HTTPメソッド
POST

### 認証要件
- JWT認証必須
- ロール: Provider

### リクエスト

#### リクエストボディ
```json
{
  "corporationName": "研究所C",
  "isActive": true
}
```

| パラメータ | 型 | 必須 | デフォルト | 説明 |
|-----------|----|----|-----------|------|
| corporationName | string | ○ | - | 会社名（200文字以内） |
| isActive | boolean | × | true | アクティブ状態 |

### レスポンス

#### 成功時（201 Created）
```json
{
  "success": true,
  "data": {
    "corporationId": "corp-uuid-003",
    "corporationName": "研究所C",
    "isActive": true,
    "createdAt": "2026-02-13T15:00:00Z",
    "updatedAt": "2026-02-13T15:00:00Z"
  },
  "meta": {
    "timestamp": "2026-02-13T15:00:00Z",
    "requestId": "req_abc123"
  }
}
```

---

## 6. 会社更新API

### 概要
既存の会社情報を更新します。

### エンドポイント
```
PUT /api/v1/provider/corporation/:corporationId
```

### HTTPメソッド
PUT

### 認証要件
- JWT認証必須
- ロール: Provider

### リクエスト

#### パスパラメータ
| パラメータ | 型 | 必須 | 説明 |
|-----------|----|----|------|
| corporationId | UUID | ○ | 会社ID |

#### リクエストボディ
```json
{
  "corporationName": "研究所A（更新）",
  "isActive": true
}
```

### レスポンス

#### 成功時（200 OK）
```json
{
  "success": true,
  "data": {
    "corporationId": "corp-uuid-001",
    "corporationName": "研究所A（更新）",
    "isActive": true,
    "createdAt": "2026-01-01T00:00:00Z",
    "updatedAt": "2026-02-13T15:00:00Z"
  },
  "meta": {
    "timestamp": "2026-02-13T15:00:00Z",
    "requestId": "req_abc123"
  }
}
```

---

## 7. 会社アクティブ状態更新API

### 概要
会社のアクティブ状態のみを更新します。

### エンドポイント
```
PATCH /api/v1/provider/corporation/:corporationId/status
```

### HTTPメソッド
PATCH

### 認証要件
- JWT認証必須
- ロール: Provider

### リクエスト

#### パスパラメータ
| パラメータ | 型 | 必須 | 説明 |
|-----------|----|----|------|
| corporationId | UUID | ○ | 会社ID |

#### リクエストボディ
```json
{
  "isActive": false
}
```

### レスポンス

#### 成功時（200 OK）
```json
{
  "success": true,
  "data": {
    "corporationId": "corp-uuid-001",
    "corporationName": "研究所A",
    "isActive": false,
    "createdAt": "2026-01-01T00:00:00Z",
    "updatedAt": "2026-02-13T15:00:00Z"
  },
  "meta": {
    "timestamp": "2026-02-13T15:00:00Z",
    "requestId": "req_abc123"
  }
}
```

---

## 🔗 関連ドキュメント

### API設計書
- [api_list.md](./api_list.md) - API一覧対応表
- [api_department_management.md](./api_department_management.md) - 部署管理API
- [api_master_management.md](./api_master_management.md) - マスタ管理API
- [api_role_management.md](./api_role_management.md) - ロール管理API

### 規約・ガイドライン
- [API設計ポリシー](../../.clinerules/development/api.md) - API設計の統一ルール
- [バックエンド規約](../../.clinerules/development/backend.md) - 実装規約
- [セキュリティ規約](../../.clinerules/development/security.md) - セキュリティ要件

---

## 📊 実装ファイルパス

### ルートファイル
```
backend/src/routes/corporationRoutes.ts
```

### コントローラーファイル
```
backend/src/controllers/corporationController.ts
```

### サービスファイル
```
backend/src/services/corporationService.ts
```

### フロントエンドサービス
```
frontend/src/services/corporationApiService.ts
```

### フロントエンドコンポーネント
```
frontend/src/components/Provider/CorporationManagement.tsx
```

---

## ✅ セキュリティチェックリスト

実装時に以下を確認してください：

### 認証・認可
- [ ] すべてのエンドポイントでJWT認証が必須
- [ ] authMiddlewareが適用されている
- [ ] Providerの権限が必要

### 入力検証
- [ ] すべてのパラメータがバリデーションされている
- [ ] Parameterized Queriesを使用（SQLインジェクション対策）
- [ ] XSS対策（入力サニタイゼーション）
- [ ] 文字列長制限が強制されている

### CSVアップロード対策
- [ ] ファイルサイズ制限（10MB）
- [ ] 許可されたMIMEタイプのみ（text/csv）
- [ ] ファイル内容のバリデーション
- [ ] CSVインジェクション対策

### エラーハンドリング
- [ ] 統一されたエラーレスポンス形式
- [ ] エラーメッセージに機密情報が含まれない
- [ ] 適切なHTTPステータスコードを返す

---

## 📝 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2026-02-13 | 初版作成 | Cline |
| | | - 会社管理API 7エンドポイントの設計書作成 | |
| | | - 実装済み（100%） | |

---

**注意**: この設計書は実装済みAPIの仕様を文書化したものです。実装の詳細については、実際のソースコード（backend/src/routes/corporationRoutes.ts等）を参照してください。
