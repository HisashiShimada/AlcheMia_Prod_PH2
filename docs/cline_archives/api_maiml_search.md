# MAIML検索API仕様書

---
title: MAIML検索API仕様書
category: API仕様
version: 1.0.0
last_updated: 2026-01-19
author: Development Team
tags: [maiml-search, api, metadata, search]
---

## 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2026-01-19 | 初版作成（SearchModal.js分析に基づく） | Development Team |

---

## 1. 概要

### 1.1 システム概要

MAIML検索APIは、S3に保存されたMAIMLファイルのメタデータを検索する機能を提供します。複数の検索条件を組み合わせて、Document情報、測定データ、ファイル構造、MaiML属性などから目的のファイルを効率的に検索できます。

### 1.2 主要機能

- **複合条件検索**: 最大5つの検索条件を組み合わせて検索
- **属性別検索**: Document情報、測定データ、ファイル構造、MaiML属性の各カテゴリから検索
- **マッチ情報表示**: ヒットした属性と値を詳細に表示
- **署名付きURL生成**: 検索結果のファイルへの一時アクセスURL生成

### 1.3 検索対象属性

#### Document情報
- `document.uuid` - Document UUID
- `document.name` - Document名
- `document.description` - Document説明

#### 測定データ
- `measurement_value` - 測定値
- `units` - 単位

#### ファイル構造
- `section_type` - セクション種別

#### MaiML属性
- `id` - ID属性
- `ref` - Ref属性
- `key` - Key属性
- `element` - Element名
- `value` - 汎用Value

---

## 2. 機能詳細

### 2.1 MAIMLファイルメタデータ検索

#### 概要
複数の検索条件を組み合わせて、MAIMLファイルのメタデータを検索します。検索条件は属性と値のペアで指定し、すべての条件に一致するファイルを返却します（AND条件）。

#### エンドポイント
- **URL**: `POST /api/v1/maiml/search`
- **認証**: 必須（JWT + Session Hybrid）
- **権限**: すべてのロール（自組織のファイルのみ）

#### リクエスト

##### ヘッダー
| ヘッダー名 | 型 | 必須 | 説明 | 例 |
|-----------|---|-----|------|---|
| Authorization | string | ○ | JWTトークン | Bearer maiml_session-abc123_1234567890 |
| X-Organization-Id | string | ○ | 組織ID | a0718dc5-21f3-44e6-87e9-cc2ae83f3385 |

##### リクエストボディ
```json
{
  "criteria": [
    {
      "attribute": "document.name",
      "value": "実験A"
    },
    {
      "attribute": "measurement_value",
      "value": "25.5"
    },
    {
      "attribute": "units",
      "value": "℃"
    }
  ]
}
```

| フィールド名 | 型 | 必須 | 説明 | 制約 |
|------------|---|-----|------|------|
| criteria | array | ○ | 検索条件配列 | 1〜5件 |
| criteria[].attribute | string | ○ | 検索対象属性 | 許可された属性のみ |
| criteria[].value | string | ○ | 検索値 | 1〜255文字 |

##### 許可される attribute 値

| 属性値 | カテゴリ | 説明 |
|-------|---------|------|
| document.uuid | Document情報 | Document UUID |
| document.name | Document情報 | Document名 |
| document.description | Document情報 | Document説明 |
| measurement_value | 測定データ | 測定値 |
| units | 測定データ | 単位 |
| section_type | ファイル構造 | セクション種別 |
| id | MaiML属性 | ID属性 |
| ref | MaiML属性 | Ref属性 |
| key | MaiML属性 | Key属性 |
| element | MaiML属性 | Element名 |
| value | MaiML属性 | 汎用Value |

#### レスポンス

##### 成功時（200 OK）
```json
{
  "success": true,
  "data": [
    {
      "maimlFileName": "sample_project.maiml",
      "key": "projects/sample_project/sample_project.maiml",
      "s3FolderPath": "s3://mmdpf-files/org_maiml_lab_001/projects/sample_project/",
      "matchCount": 3,
      "matchedAttributes": [
        {
          "attribute": "document.name",
          "criterionNumber": 1,
          "matchCount": 1,
          "matchedValues": ["実験A"]
        },
        {
          "attribute": "measurement_value",
          "criterionNumber": 2,
          "matchCount": 5,
          "matchedValues": ["25.5", "25.3", "25.7", "25.4", "25.6"]
        },
        {
          "attribute": "units",
          "criterionNumber": 3,
          "matchCount": 5,
          "matchedValues": ["℃", "℃", "℃", "℃", "℃"]
        }
      ],
      "metadata": {
        "fileSize": 15360,
        "lastModified": "2026-01-18T14:20:00.000Z",
        "contentType": "application/xml"
      }
    },
    {
      "maimlFileName": "experiment_001.maiml",
      "key": "projects/experiment_001/experiment_001.maiml",
      "s3FolderPath": "s3://mmdpf-files/org_maiml_lab_001/projects/experiment_001/",
      "matchCount": 3,
      "matchedAttributes": [
        {
          "attribute": "document.name",
          "criterionNumber": 1,
          "matchCount": 1,
          "matchedValues": ["実験A - 追加試験"]
        },
        {
          "attribute": "measurement_value",
          "criterionNumber": 2,
          "matchCount": 3,
          "matchedValues": ["25.5", "25.5", "25.5"]
        },
        {
          "attribute": "units",
          "criterionNumber": 3,
          "matchCount": 3,
          "matchedValues": ["℃", "℃", "℃"]
        }
      ],
      "metadata": {
        "fileSize": 12800,
        "lastModified": "2026-01-15T09:10:00.000Z",
        "contentType": "application/xml"
      }
    }
  ],
  "pagination": {
    "totalItems": 2,
    "totalPages": 1,
    "currentPage": 1,
    "pageSize": 100
  },
  "meta": {
    "timestamp": "2026-01-19T08:16:00Z",
    "requestId": "req_search_001"
  }
}
```

##### エラー時
| HTTPステータス | エラーコード | 説明 |
|--------------|------------|------|
| 400 | VALIDATION_ERROR | バリデーションエラー（条件が空、属性が不正） |
| 400 | VALIDATION_TOO_MANY_CRITERIA | 検索条件が6件以上指定されている |
| 401 | AUTH_TOKEN_EXPIRED | 認証エラー（トークン期限切れ） |
| 401 | AUTH_TOKEN_INVALID | 認証エラー（トークン不正） |
| 403 | PERMISSION_INSUFFICIENT | 権限不足 |
| 500 | SYSTEM_DATABASE_ERROR | データベースエラー |
| 500 | SYSTEM_S3_ERROR | S3アクセスエラー |

#### ビジネスロジック

1. **認証チェック**: JWTトークンとセッションの検証
2. **組織ID取得**: セッション情報から組織IDを取得
3. **バリデーション**:
   - 検索条件が1〜5件であることを確認
   - 各条件の属性が許可されたものであることを確認
   - 各条件の値が空でないことを確認
4. **メタデータ検索**:
   - file_metadataテーブルまたはAthenaで検索
   - organization_idでフィルタリング（必須）
   - 各検索条件をAND条件で結合
   - MAIML XMLファイルのメタデータを全文検索
5. **S3パス補正**:
   - バケット名が不正な場合の補正
   - organization_prefixの確認と補正
   - 相対パスの絶対パス化
6. **マッチ情報集計**:
   - 各ファイルでマッチした属性と値を集計
   - 条件番号、マッチ件数、マッチした値のリストを生成
7. **ソート**: マッチ件数の多い順にソート
8. **レスポンス生成**: 検索結果とメタデータを返却

#### S3パス補正ロジック

検索結果のS3パスは以下のルールで補正されます：

1. **バケット名補正**:
   - `s3://`で始まらない場合、デフォルトバケット名を追加
   - バケット名が3文字未満の場合、デフォルトバケット名で置換

2. **organization_prefix確認**:
   - パスに`org_{organization_id}`が含まれることを確認
   - 不足している場合は追加

3. **キーの正規化**:
   - `s3://bucket/key`形式の場合、keyのみを抽出
   - 相対パスを絶対パスに変換

#### バリデーション

- [x] Authorization ヘッダーの存在チェック
- [x] X-Organization-Id ヘッダーの存在チェック
- [x] X-Organization-Id が UUID 形式であることをチェック
- [x] criteria が配列であることをチェック
- [x] criteria が 1〜5 件であることをチェック
- [x] criteria[].attribute が必須であることをチェック
- [x] criteria[].attribute が許可された値であることをチェック
- [x] criteria[].value が必須であることをチェック
- [x] criteria[].value が 1〜255 文字であることをチェック

#### セキュリティチェックリスト

- [x] JWT認証の実施（authミドルウェア）
- [x] organization_idフィルタの適用（必須）
- [x] テナント分離（tenantIsolationミドルウェア）
- [x] 権限チェック（permissionCheckミドルウェア）
- [x] Parameterized Queryの使用
- [x] 入力値のサニタイゼーション
- [x] クロステナントアクセスの防止
- [x] S3パスのバリデーション

#### テストケース

- [x] 正常系：単一条件での検索
- [x] 正常系：複数条件（AND）での検索
- [x] 正常系：Document情報での検索
- [x] 正常系：測定データでの検索
- [x] 正常系：MaiML属性での検索
- [x] 正常系：検索結果が0件の場合
- [x] 正常系：S3パスの補正が正しく行われる
- [x] 正常系：マッチ情報が正しく集計される
- [x] 異常系：未認証ユーザーによるアクセス（401エラー）
- [x] 異常系：権限不足ユーザーによるアクセス（403エラー）
- [x] 異常系：検索条件が空（400エラー）
- [x] 異常系：検索条件が6件以上（400エラー）
- [x] 異常系：不正な属性名（400エラー）
- [x] 異常系：空の検索値（400エラー）
- [x] 異常系：他組織のファイルは検索結果に含まれない

#### レスポンスフィールド説明

##### data（検索結果）
| フィールド名 | 型 | NULL許可 | 説明 |
|------------|---|---------|------|
| maimlFileName | string | × | MAIMLファイル名 |
| key | string | × | S3オブジェクトキー |
| s3FolderPath | string | × | S3フォルダパス（バケット含む） |
| matchCount | number | × | 総マッチ件数 |
| matchedAttributes | array | × | マッチした属性情報の配列 |
| metadata | object | × | ファイルメタデータ |

##### matchedAttributes（マッチ属性情報）
| フィールド名 | 型 | NULL許可 | 説明 |
|------------|---|---------|------|
| attribute | string | × | 属性名 |
| criterionNumber | number | × | 検索条件番号（1始まり） |
| matchCount | number | × | この属性でのマッチ件数 |
| matchedValues | array | × | マッチした値の配列（最大5件表示） |

##### metadata（ファイルメタデータ）
| フィールド名 | 型 | NULL許可 | 説明 |
|------------|---|---------|------|
| fileSize | number | × | ファイルサイズ（バイト） |
| lastModified | string | × | 最終更新日時（ISO 8601形式） |
| contentType | string | × | コンテンツタイプ |

---

## 3. データモデル

### 3.1 file_metadata テーブル（ファイルメタデータ）

検索対象となるメタデータを格納するテーブル。

| カラム名 | 型 | NULL | デフォルト | 説明 |
|---------|---|------|----------|------|
| organization_id | UUID | NOT NULL | - | 組織ID（複合主キー） |
| file_id | UUID | NOT NULL | uuid_generate_v4() | ファイルID（複合主キー） |
| bucket_name | VARCHAR(255) | NULL | - | S3バケット名 |
| object_key | VARCHAR(1024) | NULL | - | S3オブジェクトキー |
| file_name | VARCHAR(255) | NULL | - | ファイル名 |
| file_type | VARCHAR(50) | NULL | - | ファイル種別（maiml, xml等） |
| file_size | BIGINT | NULL | - | ファイルサイズ（バイト） |
| content_type | VARCHAR(100) | NULL | - | コンテンツタイプ |
| metadata_json | JSONB | NULL | - | メタデータ（JSON形式） |
| last_modified | TIMESTAMP | NULL | - | 最終更新日時 |
| created_at | TIMESTAMP | NULL | CURRENT_TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | NULL | CURRENT_TIMESTAMP | 更新日時 |

**主キー**: `(organization_id, file_id)`

**インデックス**:
- `organization_id`
- `file_id`
- `bucket_name`
- `object_key`
- `file_type`
- `metadata_json` (GINインデックス - JSONB検索用)

### 3.2 メタデータJSON構造

`metadata_json`カラムには以下の構造でMAIMLファイルのメタデータが格納されます：

```json
{
  "document": {
    "uuid": "doc-uuid-001",
    "name": "実験A",
    "description": "材料合成実験"
  },
  "measurements": [
    {
      "measurement_value": "25.5",
      "units": "℃"
    }
  ],
  "sections": [
    {
      "section_type": "Material"
    }
  ],
  "attributes": {
    "id": ["material_001", "condition_001"],
    "ref": ["ref_001", "ref_002"],
    "key": ["temp", "pressure"],
    "elements": ["Material", "Condition", "Result"],
    "values": ["value1", "value2"]
  }
}
```

### 3.3 検索クエリ例

#### PostgreSQL + JSONB
```sql
SELECT 
  file_id,
  file_name,
  object_key,
  bucket_name,
  file_size,
  last_modified,
  metadata_json
FROM file_metadata
WHERE organization_id = $1
  AND file_type = 'maiml'
  AND metadata_json @> '{"document": {"name": "実験A"}}'::jsonb
  AND metadata_json @> '{"measurements": [{"units": "℃"}]}'::jsonb
ORDER BY last_modified DESC;
```

#### AWS Athena
```sql
SELECT 
  file_id,
  file_name,
  s3_key,
  bucket_name,
  file_size,
  last_modified,
  json_extract(metadata_json, '$.document.name') as document_name
FROM maiml_metadata_catalog
WHERE organization_id = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'
  AND json_extract_scalar(metadata_json, '$.document.name') LIKE '%実験A%'
  AND json_extract_scalar(metadata_json, '$.measurements[0].units') = '℃'
ORDER BY last_modified DESC
LIMIT 100;
```

---

## 4. セキュリティ要件

### 4.1 認証・認可

#### 認証方式
- JWT + Session Hybrid認証を使用
- すべてのエンドポイントで `auth` ミドルウェアを適用

#### 認可（RBAC）
| エンドポイント | System Admin | Manager | Worker |
|--------------|-------------|---------|--------|
| POST /maiml/search | ○（全組織） | ○（自組織のみ） | ○（自組織のみ） |

### 4.2 マルチテナント分離

#### 必須事項
- すべてのAPIリクエストに `X-Organization-Id` ヘッダーが必須
- すべてのDBクエリに `organization_id` フィルタが必須
- S3パスに `org_{organization_prefix}` が含まれることを確認
- クロステナントアクセスは厳禁（System Adminを除く）

### 4.3 入力値検証

#### SQLインジェクション対策
- Parameterized Queriesを使用
- JSONB検索時もプレースホルダーを使用

#### XSS対策
- 検索値のサニタイゼーション
- HTMLエスケープ処理

---

## 5. パフォーマンス要件

### 5.1 レスポンスタイム

| 検索条件数 | 目標レスポンスタイム | 最大許容時間 |
|----------|-------------------|-------------|
| 1件 | < 500ms | < 2秒 |
| 2-3件 | < 1秒 | < 3秒 |
| 4-5件 | < 2秒 | < 5秒 |

### 5.2 インデックス戦略

#### PostgreSQLの場合
- `metadata_json`カラムにGINインデックスを作成
- JSONB検索クエリを最適化

```sql
CREATE INDEX idx_file_metadata_json 
ON file_metadata USING GIN (metadata_json);

CREATE INDEX idx_file_metadata_org_type 
ON file_metadata (organization_id, file_type);
```

#### AWS Athenaの場合
- パーティショニング: `organization_id`, `year`, `month`
- 圧縮形式: Parquet
- データカタログの最適化

### 5.3 キャッシング戦略

#### 対象データ
- 検索可能な属性リスト（TTL: 1時間）
- 頻繁に検索される条件の結果（TTL: 5分）

#### キャッシュ無効化タイミング
- ファイルアップロード時
- ファイル更新時
- ファイル削除時

---

## 6. エラーハンドリング

### 6.1 エラーレスポンス例

#### 検索条件が空
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "検索条件を1つ以上設定してください",
    "details": [
      {
        "field": "criteria",
        "message": "検索条件が空です",
        "code": "EMPTY_CRITERIA"
      }
    ]
  },
  "meta": {
    "timestamp": "2026-01-19T08:16:00Z",
    "requestId": "req_search_002"
  }
}
```

#### 不正な属性名
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "不正な属性名が指定されています",
    "details": [
      {
        "field": "criteria[0].attribute",
        "message": "属性 'invalid_attr' は検索対象ではありません",
        "code": "INVALID_ATTRIBUTE"
      }
    ]
  },
  "meta": {
    "timestamp": "2026-01-19T08:16:00Z",
    "requestId": "req_search_003"
  }
}
```

---

## 7. 関連ドキュメント

- [API設計ポリシー](../../.clinerules/development/api.md)
- [バックエンド規約](../../.clinerules/development/backend.md)
- [セキュリティルール](../../.clinerules/development/security.md)
- [S3構造定義](../../.clinerules/references/s3_structure.md)
- [データベース構造](../../.clinerules/references/db_structure.md)

---

## 8. 実装時の注意事項

### DO（推奨）
✅ organization_idフィルタを必ず適用する
✅ JSONB検索時にインデックスを活用する
✅ 検索結果の件数制限（最大100件）を実装する
✅ S3パスの補正ロジックを実装する
✅ マッチ情報を詳細に返却する
✅ 検索値のサニタイゼーションを行う
✅ Parameterized Queriesを使用する

### DON'T（非推奨）
❌ organization_idなしで検索しない
❌ 無制限に検索結果を返却しない
❌ 生のS3パスをそのまま返却しない
❌ 文字列連結でSQLクエリを構築しない
❌ XSS対策を怠らない
❌ 検索条件の上限を設けずに実装しない

---

## 9. 将来の拡張可能性

### 9.1 検索機能の拡張

- ファジー検索（あいまい検索）
- 範囲検索（数値、日付）
- OR条件のサポート
- ワイルドカード検索
- 正規表現検索

### 9.2 パフォーマンス改善

- Elasticsearchへの移行検討
- キャッシュ戦略の最適化
- 非同期検索（大量データ対応）
- 検索結果のページネーション改善

### 9.3 ユーザビリティ向上

- 検索履歴の保存
- よく使う検索条件の保存
- 検索候補の自動補完
- 検索結果のエクスポート機能
