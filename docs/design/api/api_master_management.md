# マスタ管理API設計書

## メタデータ
- **作成日**: 2026-02-13
- **バージョン**: 1.0.0
- **最終更新**: 2026-02-13
- **担当**: Development Team
- **実装状況**: ✅ 実装済み（100%）

---

## 概要

このドキュメントは、Creator（作成者）、Vendor（ベンダー）、Instrument（装置）、Attribute（属性）の4種類のマスタを管理するためのAPI仕様を定義します。

### 主な機能
- 各マスタ一覧の取得（検索・フィルタリング・表示切替対応）
- マスタ詳細の取得
- マスタの新規作成
- マスタ情報の更新
- マスタのアクティブ状態変更
- CSVによる一括ダウンロード
- CSVによる一括アップロード（バッチ処理）

### 対象ユーザー
- システム管理者（System Admin）: 全機能へのアクセス
- データ管理者（Data Admin）: 全機能へのアクセス

---

## 📋 API一覧

### MAIMLエディタ向けAttributeマスタ参照API（1エンドポイント）

| No | HTTPメソッド | エンドポイント | 説明 | 実装状態 | 権限 |
|----|-------------|---------------|------|---------|------|
| 0 | GET | /api/v1/masters/attributes | Attributeマスタ一覧取得（MAIMLエディタ向け） | ✅ 実装済み | 認証ユーザー全員 |

> **用途**: MAIMLエディタ（NestedPropertyEditor）の属性追加ダイアログにおいて、Attributeマスタの属性名・属性値候補を取得するために使用します。  
> **エンドポイントの違い**: `/api/v1/master/attribute`（管理画面向け）とは別に、エディタ向けの軽量な取得専用エンドポイントです。  
> **パス注意**: `masters`（複数形）を使用します。

---

### Creator（作成者）マスタ（7エンドポイント）

| No | HTTPメソッド | エンドポイント | 説明 | 実装状態 | 権限 |
|----|-------------|---------------|------|---------|------|
| 1 | GET | /api/v1/master/creator | Creator一覧取得 | ✅ 実装済み | System Admin, Data Admin |
| 2 | GET | /api/v1/master/creator/download-csv | CreatorCSVダウンロード | ✅ 実装済み | System Admin, Data Admin |
| 3 | POST | /api/v1/master/creator/upload-csv | CreatorCSVアップロード | ✅ 実装済み | System Admin, Data Admin |
| 4 | GET | /api/v1/master/creator/:creatorId | Creator詳細取得 | ✅ 実装済み | System Admin, Data Admin |
| 5 | POST | /api/v1/master/creator | Creator新規作成 | ✅ 実装済み | System Admin, Data Admin |
| 6 | PUT | /api/v1/master/creator/:creatorId | Creator更新 | ✅ 実装済み | System Admin, Data Admin |
| 7 | PATCH | /api/v1/master/creator/:creatorId/status | Creatorアクティブ状態更新 | ✅ 実装済み | System Admin, Data Admin |

### Vendor（ベンダー）マスタ（7エンドポイント）

| No | HTTPメソッド | エンドポイント | 説明 | 実装状態 | 権限 |
|----|-------------|---------------|------|---------|------|
| 8 | GET | /api/v1/master/vendor | Vendor一覧取得 | ✅ 実装済み | System Admin, Data Admin |
| 9 | GET | /api/v1/master/vendor/download-csv | VendorCSVダウンロード | ✅ 実装済み | System Admin, Data Admin |
| 10 | POST | /api/v1/master/vendor/upload-csv | VendorCSVアップロード | ✅ 実装済み | System Admin, Data Admin |
| 11 | GET | /api/v1/master/vendor/:vendorId | Vendor詳細取得 | ✅ 実装済み | System Admin, Data Admin |
| 12 | POST | /api/v1/master/vendor | Vendor新規作成 | ✅ 実装済み | System Admin, Data Admin |
| 13 | PUT | /api/v1/master/vendor/:vendorId | Vendor更新 | ✅ 実装済み | System Admin, Data Admin |
| 14 | PATCH | /api/v1/master/vendor/:vendorId/status | Vendorアクティブ状態更新 | ✅ 実装済み | System Admin, Data Admin |

### Instrument（装置）マスタ（7エンドポイント）

| No | HTTPメソッド | エンドポイント | 説明 | 実装状態 | 権限 |
|----|-------------|---------------|------|---------|------|
| 15 | GET | /api/v1/master/instrument | Instrument一覧取得 | ✅ 実装済み | System Admin, Data Admin |
| 16 | GET | /api/v1/master/instrument/download-csv | InstrumentCSVダウンロード | ✅ 実装済み | System Admin, Data Admin |
| 17 | POST | /api/v1/master/instrument/upload-csv | InstrumentCSVアップロード | ✅ 実装済み | System Admin, Data Admin |
| 18 | GET | /api/v1/master/instrument/:instrumentId | Instrument詳細取得 | ✅ 実装済み | System Admin, Data Admin |
| 19 | POST | /api/v1/master/instrument | Instrument新規作成 | ✅ 実装済み | System Admin, Data Admin |
| 20 | PUT | /api/v1/master/instrument/:instrumentId | Instrument更新 | ✅ 実装済み | System Admin, Data Admin |
| 21 | PATCH | /api/v1/master/instrument/:instrumentId/status | Instrumentアクティブ状態更新 | ✅ 実装済み | System Admin, Data Admin |

### Attribute（属性）マスタ（7エンドポイント）

| No | HTTPメソッド | エンドポイント | 説明 | 実装状態 | 権限 |
|----|-------------|---------------|------|---------|------|
| 22 | GET | /api/v1/master/attribute | Attribute一覧取得 | ✅ 実装済み | System Admin, Data Admin |
| 23 | GET | /api/v1/master/attribute/download-csv | AttributeCSVダウンロード | ✅ 実装済み | System Admin, Data Admin |
| 24 | POST | /api/v1/master/attribute/upload-csv | AttributeCSVアップロード | ✅ 実装済み | System Admin, Data Admin |
| 25 | GET | /api/v1/master/attribute/:attributeId | Attribute詳細取得 | ✅ 実装済み | System Admin, Data Admin |
| 26 | POST | /api/v1/master/attribute | Attribute新規作成 | ✅ 実装済み | System Admin, Data Admin |
| 27 | PUT | /api/v1/master/attribute/:attributeId | Attribute更新 | ✅ 実装済み | System Admin, Data Admin |
| 28 | PATCH | /api/v1/master/attribute/:attributeId/status | Attributeアクティブ状態更新 | ✅ 実装済み | System Admin, Data Admin |

> **注意**: `:attributeId` は `attributeName__attributeValue`（URLエンコード済み）の複合PK形式。例: `温度__高温` → `%E6%B8%A9%E5%BA%A6__%E9%AB%98%E6%B8%A9`

**合計**: 28エンドポイント

---

## 🔐 共通仕様

### 認証・認可

**認証方式**: JWT + Session Hybrid

**必須ヘッダー**:
```http
Authorization: Bearer maiml_session-{sessionId}_{timestamp}
```

**権限要件**:
- すべてのAPI: `system_admin` または `data_admin` ロール必須

**ミドルウェアチェーン**:
```typescript
router.METHOD('/path', 
  authMiddleware,           // 1. JWT認証（セッション検証、req.userに格納）
  handleValidationErrors,   // 2. バリデーションエラーハンドリング
  controller.handler        // 3. コントローラー処理
);
```

### マルチテナント分離

- すべてのDBクエリに `organization_id` フィルタ必須
- authMiddlewareで`req.user.organizationId`を取得

### 統一レスポンス形式

**成功レスポンス**:
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-02-13T15:00:00Z",
    "requestId": "req_abc123"
  }
}
```

**エラーレスポンス**:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "エラーメッセージ",
    "details": []
  },
  "meta": {
    "timestamp": "2026-02-13T15:00:00Z",
    "requestId": "req_abc123"
  }
}
```

---

## 📋 MAIMLエディタ向けAttributeマスタ参照API詳細

### GET /api/v1/masters/attributes

#### エンドポイント
```
GET /api/v1/masters/attributes
```

#### 概要
MAIMLエディタ（NestedPropertyEditor）の属性追加ダイアログで使用するAttributeマスタの一覧を取得します。  
管理画面向けの `/api/v1/master/attribute` と異なり、エディタ向けの軽量な取得専用エンドポイントです。  
アクティブ（`is_active = true`）なレコードのみを返します。

#### 認証
- **必須ヘッダー**: `Authorization: Bearer {sessionToken}`
- **権限**: 認証済みユーザー全員（実験管理者・実験作業者含む）
- **マルチテナント**: `organization_id` でフィルタリング（自組織のみ）

#### クエリパラメータ
| パラメータ | 型 | 必須 | 説明 |
|-----------|----|----|------|
| なし | - | - | パラメータなし |

#### リクエスト例
```http
GET /api/v1/masters/attributes
Authorization: Bearer maiml_session-abc123_1744000000000
```

#### レスポンス（200 OK）
```json
{
  "success": true,
  "data": [
    {
      "attributeName": "温度",
      "attributeValue": "高温"
    },
    {
      "attributeName": "温度",
      "attributeValue": "常温"
    },
    {
      "attributeName": "圧力",
      "attributeValue": "高圧"
    }
  ]
}
```

| フィールド | 型 | 説明 |
|-----------|----|----|
| attributeName | string | 属性名（XSD属性のname相当） |
| attributeValue | string | 属性値候補 |

#### エラーレスポンス

| HTTPステータス | エラーコード | 説明 |
|--------------|------------|------|
| 401 | E5013 | 未認証 |
| 500 | E4001 | サーバー内部エラー |

#### 実装ファイル
- **ルート**: `backend/src/routes/masterRoutes.ts`
- **コントローラー**: `backend/src/controllers/masterController.ts`（`getMastersAttributes`ハンドラー）
- **フロントエンドサービス**: `frontend/src/services/masterApiService.ts`（`fetchAttributeMasters`関数）

#### フロントエンドでの使用箇所
- `frontend/src/components/editorv2/components/NestedPropertyEditor.tsx`
  - 属性追加ダイアログ（`AttributeAddDialog`）内でAttributeマスタを取得・表示
  - ユーザーがマスタから属性名・属性値を選択してプロパティに追加できる

---

## 📋 Creator（作成者）マスタAPI詳細

### 1. Creator一覧取得API

#### エンドポイント
```
GET /api/v1/master/creator
```

#### 特有機能: display_scope（表示切替）

Creatorマスタのみ、**display_scope**パラメータによる表示切替機能を持ちます。

| 値 | 説明 |
|----|------|
| `all` | 全組織のCreatorマスタを表示（共通マスタ + 自組織マスタ） |
| `own` | 自組織で作成したCreatorマスタのみ表示 |

#### リクエスト

##### クエリパラメータ
| パラメータ | 型 | 必須 | デフォルト | 説明 |
|-----------|----|----|-----------|------|
| display_scope | string | × | all | 表示切替（all/own） |
| search | string | × | - | Creator IDまたはCreator名で検索 |
| is_active | boolean | × | - | アクティブ状態でフィルタ |

##### リクエスト例
```
GET /api/v1/master/creator?display_scope=own&search=研究者&is_active=true
```

#### レスポンス

##### 成功時（200 OK）
```json
{
  "success": true,
  "data": [
    {
      "creatorId": "CR001",
      "creatorName": "研究者A",
      "creatorDescription": "材料科学専門",
      "creatorAnnotation": "注釈テキスト",
      "vendorName": "ベンダーX",
      "instrumentName": "装置Y",
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

#### データベーステーブル

##### 使用テーブル
1. **creator**（主テーブル）
2. **vendor**（結合テーブル）
3. **instrument**（結合テーブル）

#### display_scopeの実装ロジック

```typescript
// display_scope = 'all' の場合
WHERE (creator.organization_id = $1 OR creator.organization_id IS NULL)

// display_scope = 'own' の場合
WHERE creator.organization_id = $1
```

**重要**: `organization_id IS NULL`は共通マスタ（全組織で共有）を表します。

---

### 2. CreatorCSVダウンロードAPI

#### エンドポイント
```
GET /api/v1/master/creator/download-csv
```

#### CSV形式
```csv
creator_id,creator_name,creator_description,creator_annotation,vendor_name,instrument_name,is_active
CR001,研究者A,材料科学専門,注釈テキスト,ベンダーX,装置Y,true
CR002,研究者B,化学専門,注釈テキスト2,ベンダーZ,装置W,true
```

#### ファイル名
```
master_creator_YYYYMMDDhhmmss.csv
```

---

### 3. CreatorCSVアップロードAPI

#### エンドポイント
```
POST /api/v1/master/creator/upload-csv
```

#### CSV形式
```csv
creator_id,creator_name,creator_description,creator_annotation,vendor_name,instrument_name,is_active
CR003,研究者C,物理専門,注釈テキスト3,ベンダーA,装置B,true
```

---

### 4. Creator詳細取得API

#### エンドポイント
```
GET /api/v1/master/creator/:creatorId
```

#### レスポンス例
```json
{
  "success": true,
  "data": {
    "creatorId": "CR001",
    "creatorName": "研究者A",
    "creatorDescription": "材料科学専門",
    "creatorAnnotation": "注釈テキスト",
    "vendorName": "ベンダーX",
    "instrumentName": "装置Y",
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

---

### 5. Creator新規作成API

#### エンドポイント
```
POST /api/v1/master/creator
```

#### リクエストボディ
```json
{
  "creatorId": "CR003",
  "creatorName": "研究者C",
  "creatorDescription": "物理専門",
  "creatorAnnotation": "注釈テキスト3",
  "vendorId": "VND001",
  "instrumentId": "INST001",
  "isActive": true
}
```

---

### 6. Creator更新API

#### エンドポイント
```
PUT /api/v1/master/creator/:creatorId
```

#### リクエストボディ
```json
{
  "creatorName": "研究者A（更新）",
  "creatorDescription": "材料科学・化学専門",
  "isActive": true
}
```

---

### 7. Creatorアクティブ状態更新API

#### エンドポイント
```
PATCH /api/v1/master/creator/:creatorId/status
```

#### リクエストボディ
```json
{
  "isActive": false
}
```

---

## 📋 Vendor（ベンダー）マスタAPI詳細

### 共通パターン

Vendorマスタは、Creatorマスタと同様の7つのエンドポイントを持ちますが、**display_scope機能は持ちません**。

### API一覧

1. **GET /api/v1/master/vendor** - Vendor一覧取得
2. **GET /api/v1/master/vendor/download-csv** - VendorCSVダウンロード
3. **POST /api/v1/master/vendor/upload-csv** - VendorCSVアップロード
4. **GET /api/v1/master/vendor/:vendorId** - Vendor詳細取得
5. **POST /api/v1/master/vendor** - Vendor新規作成
6. **PUT /api/v1/master/vendor/:vendorId** - Vendor更新
7. **PATCH /api/v1/master/vendor/:vendorId/status** - Vendorアクティブ状態更新

### データ構造

#### Vendorレスポンス例
```json
{
  "vendorId": "VND001",
  "vendorName": "ベンダーX",
  "vendorDescription": "実験装置メーカー",
  "vendorAnnotation": "注釈テキスト",
  "isActive": true,
  "createdAt": "2026-01-01T00:00:00Z",
  "updatedAt": "2026-02-13T10:00:00Z"
}
```

#### CSV形式
```csv
vendor_id,vendor_name,vendor_description,vendor_annotation,is_active
VND001,ベンダーX,実験装置メーカー,注釈テキスト,true
VND002,ベンダーY,化学試薬メーカー,注釈テキスト2,true
```

#### ファイル名
```
master_vendor_YYYYMMDDhhmmss.csv
```

### データベーステーブル

#### 使用テーブル
1. **vendor**（主テーブル）
   - organization_id, vendor_id, vendor_name, vendor_description, vendor_annotation
   - is_active, create_user_id, create_at, update_user_id, update_at

---

## 📋 Instrument（装置）マスタAPI詳細

### 共通パターン

Instrumentマスタも、Creatorマスタと同様の7つのエンドポイントを持ちますが、**display_scope機能は持ちません**。

### API一覧

1. **GET /api/v1/master/instrument** - Instrument一覧取得
2. **GET /api/v1/master/instrument/download-csv** - InstrumentCSVダウンロード
3. **POST /api/v1/master/instrument/upload-csv** - InstrumentCSVアップロード
4. **GET /api/v1/master/instrument/:instrumentId** - Instrument詳細取得
5. **POST /api/v1/master/instrument** - Instrument新規作成
6. **PUT /api/v1/master/instrument/:instrumentId** - Instrument更新
7. **PATCH /api/v1/master/instrument/:instrumentId/status** - Instrumentアクティブ状態更新

### データ構造

#### Instrumentレスポンス例
```json
{
  "instrumentId": "INST001",
  "instrumentName": "装置Y",
  "instrumentDescription": "高精度分析装置",
  "instrumentAnnotation": "注釈テキスト",
  "isActive": true,
  "createdAt": "2026-01-01T00:00:00Z",
  "updatedAt": "2026-02-13T10:00:00Z"
}
```

#### CSV形式
```csv
instrument_id,instrument_name,instrument_description,instrument_annotation,is_active
INST001,装置Y,高精度分析装置,注釈テキスト,true
INST002,装置Z,質量分析計,注釈テキスト2,true
```

#### ファイル名
```
master_instrument_YYYYMMDDhhmmss.csv
```

### データベーステーブル

#### 使用テーブル
1. **instrument**（主テーブル）
   - organization_id, instrument_id, instrument_name, instrument_description, instrument_annotation
   - is_active, create_user_id, create_at, update_user_id, update_at

---

## 📋 Attribute（属性）マスタAPI詳細

### 共通パターン

Attributeマスタは、Creatorマスタと同様の7つのエンドポイントを持ちますが、**display_scope機能は持ちません**。  
主キーは `(organization_id, attribute_name, attribute_value)` の複合PKであり、URLパラメータ `:attributeId` は `attributeName__attributeValue` 形式（URLエンコード済み）で指定します。

### API一覧

1. **GET /api/v1/master/attribute** - Attribute一覧取得
2. **GET /api/v1/master/attribute/download-csv** - AttributeCSVダウンロード
3. **POST /api/v1/master/attribute/upload-csv** - AttributeCSVアップロード
4. **GET /api/v1/master/attribute/:attributeId** - Attribute詳細取得
5. **POST /api/v1/master/attribute** - Attribute新規作成
6. **PUT /api/v1/master/attribute/:attributeId** - Attribute更新
7. **PATCH /api/v1/master/attribute/:attributeId/status** - Attributeアクティブ状態更新

### データ構造

#### Attributeレスポンス例（一覧）
```json
{
  "attributeName": "温度",
  "attributeValue": "高温",
  "attributeRemark": "400℃以上の条件",
  "departmentCd": "dept_001",
  "departmentName": "材料科学部門",
  "isActive": true,
  "createdAt": "2026-04-08T00:00:00Z",
  "updatedAt": "2026-04-08T10:00:00Z"
}
```

#### 新規作成リクエストボディ
```json
{
  "attributeName": "温度",
  "attributeValue": "高温",
  "attributeRemark": "400℃以上の条件",
  "departmentCd": "dept_001",
  "isActive": true
}
```

#### 更新リクエストボディ（PUT）
```
PUT /api/v1/master/attribute/%E6%B8%A9%E5%BA%A6__%E9%AB%98%E6%B8%A9
```
```json
{
  "attributeValue": "高温",
  "attributeRemark": "400℃以上の条件（更新）",
  "departmentCd": "dept_001",
  "isActive": true
}
```
> **注意**: PUTの `:attributeId` は `attributeName`（URLエンコード）のみ。`attributeValue` はボディで渡す。

#### ステータス更新（PATCH）
```
PATCH /api/v1/master/attribute/%E6%B8%A9%E5%BA%A6__%E9%AB%98%E6%B8%A9/status
```
```json
{
  "isActive": false
}
```

#### CSV形式（ダウンロード・アップロード）
```csv
attribute_name,attribute_value,attribute_remark,department_cd,is_active
温度,高温,400℃以上の条件,dept_001,true
温度,常温,20〜30℃の条件,dept_001,true
圧力,高圧,100MPa以上,dept_002,true
```

#### ファイル名
```
master_attribute_YYYYMMDDhhmmss.csv
```

### データベーステーブル

#### 使用テーブル
1. **attribute**（主テーブル）
   - organization_id（PK）, attribute_name（PK）, attribute_value（PK）
   - attribute_remark, department_cd, is_active
   - create_user_id, create_at, update_user_id, update_at
2. **department**（結合テーブル：department_name を付与）

### URLパラメータの形式

| エンドポイント | `:attributeId` の形式 |
|---|---|
| GET /:attributeId | `attributeName__attributeValue`（URLエンコード） |
| PUT /:attributeId | `attributeName` のみ（URLエンコード）、`attributeValue` はボディ |
| PATCH /:attributeId/status | `attributeName__attributeValue`（URLエンコード） |

---

## 🔗 関連ドキュメント

### API設計書
- [api_list.md](./api_list.md) - API一覧対応表
- [api_corporation_management.md](./api_corporation_management.md) - 会社管理API
- [api_department_management.md](./api_department_management.md) - 部署管理API
- [api_role_management.md](./api_role_management.md) - ロール管理API

### 規約・ガイドライン
- [API設計ポリシー](../../.clinerules/development/api.md) - API設計の統一ルール
- [バックエンド規約](../../.clinerules/development/backend.md) - 実装規約
- [セキュリティ規約](../../.clinerules/development/security.md) - セキュリティ要件

### 参照ドキュメント
- [データベース構造](../../.clinerules/references/db_structure.md) - DB設計
- [API構成定義](../../.clinerules/references/api_structure.md) - API構成の参照ルール

---

## 📊 実装ファイルパス

### ルートファイル
```
backend/src/routes/masterRoutes.ts
```

### コントローラーファイル
```
backend/src/controllers/masterController.ts
```

### サービスファイル
```
backend/src/services/masterService.ts
```

### リポジトリファイル
```
backend/src/repositories/masterRepository.ts
```

### フロントエンドサービス
```
frontend/src/services/masterApiService.ts
```

### フロントエンドコンポーネント
```
frontend/src/components/DataManagement/MasterManagement.tsx
```

---

## ✅ セキュリティチェックリスト

実装時に以下を確認してください：

### 認証・認可
- [ ] すべてのエンドポイントでJWT認証が必須
- [ ] authMiddlewareが適用されている
- [ ] System AdminまたはData Adminの権限が必要

### マルチテナント分離
- [ ] すべてのDBクエリにorganization_idフィルタが含まれる
- [ ] クロステナントアクセスが不可能
- [ ] authMiddlewareでorganizationIdを取得

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
| | | - マスタ管理API 21エンドポイントの設計書作成 | |
| | | - Creator、Vendor、Instrumentマスタ | |
| | | - 実装済み（100%） | |
| 1.1.0 | 2026-04-08 | Attributeマスタ追加 | Cline |
| | | - Attribute API 7エンドポイント追加（No.22〜28） | |
| | | - 複合PK（attribute_name, attribute_value）対応 | |
| | | - department_cd結合によるdepartment_name付与 | |
| 1.2.0 | 2026-04-09 | MAIMLエディタ向けAttributeマスタ参照API追加 | Cline |
| | | - GET /api/v1/masters/attributes エンドポイント追加（No.0） | |
| | | - NestedPropertyEditor属性追加ダイアログ向け取得専用API | |
| | | - 認証済みユーザー全員が使用可能（実験管理者含む） | |

---

**注意**: この設計書は実装済みAPIの仕様を文書化したものです。実装の詳細については、実際のソースコード（backend/src/routes/masterRoutes.ts等）を参照してください。
