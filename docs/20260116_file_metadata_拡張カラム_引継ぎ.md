# file_metadata テーブル拡張カラム 引継ぎドキュメント

## 📋 概要

**作成日**: 2026-01-16  
**最終更新**: 2026-01-16 16:59  
**対象テーブル**: `file_metadata`  
**現在のバージョン**: Phase 0（9カラム - S3アクセス必須のみ）  
**このドキュメントの目的**: 将来の機能実装時に追加する拡張カラムの使用箇所と実装ガイドラインをまとめる

---

## 🎯 拡張カラムの段階的実装計画

| Phase | 実装タイミング | 追加カラム数 | 目的 |
|-------|--------------|------------|------|
| **Phase 0 (現在)** | 初期実装 | 9 | S3アクセス必須カラム |
| **Phase 1** | Maiml作成機能実装時 | +9 | MAIML解析メタデータ |
| **Phase 2** | 詳細検索機能実装時 | +6 | メタデータ検索・タグ管理 |
| **Phase 3** | アップロード管理実装時 | +5 | バッチアップロード管理 |
| **Phase 4** | アクセス制御実装時 | +6 | アクセス制御・監査ログ |
| **Phase 5** | 高度な機能実装時 | +8 | 一時保存・データレイク |

**基本方針:**
- 機能実装と連動して段階的にカラムを追加
- 無駄なカラムを作らない
- 各Phaseは独立して実装可能

---

## 📊 Phase 1: Maimlファイル作成機能実装時（優先度: 高）

**実装タイミング:** Maimlファイル作成・編集機能を実装する際

### 追加予定カラム（9カラム）

#### 1. file_category
- **型**: `VARCHAR(100)`
- **用途**: ファイルカテゴリ（maiml, template, data, image等）
- **デフォルト値**: `NULL`

**backend使用箇所:**
```javascript
// reference/backend/routes/dbOperations.js
INSERT INTO file_metadata (file_category, ...) 
VALUES ('maiml', ...);

SELECT * FROM file_metadata 
WHERE file_category = 'maiml' AND organization_id = $1;
```

**実装ガイドライン:**
- インデックス作成推奨: `CREATE INDEX idx_file_metadata_file_category ON file_metadata(file_category);`
- ファイル種別でのフィルタリングに使用

---

#### 2. file_extension
- **型**: `VARCHAR(10)`
- **用途**: ファイル拡張子
- **デフォルト値**: `NULL`

**backend使用箇所:**
```javascript
// original_filenameから自動抽出
const extension = path.extname(original_filename).toLowerCase(); // '.maiml'
```

---

#### 3. is_maiml_file
- **型**: `BOOLEAN`
- **用途**: MAIMLファイルフラグ
- **デフォルト値**: `FALSE`

**backend使用箇所:**
```javascript
// reference/backend/routes/dbOperations.js
const is_maiml_file = file_extension === '.maiml';

SELECT * FROM file_metadata 
WHERE is_maiml_file = TRUE AND organization_id = $1;
```

**実装ガイドライン:**
- インデックス作成推奨: `CREATE INDEX idx_file_metadata_is_maiml_file ON file_metadata(is_maiml_file);`
- MAIML専用機能のフィルタリングに使用

---

#### 4. maiml_version
- **型**: `VARCHAR(20)`
- **用途**: MAIMLバージョン（例: "1.0", "2.0"）
- **デフォルト値**: `NULL`

**backend使用箇所:**
```javascript
// MAIML解析時にXMLから抽出
const maiml_version = xmlDoc.getAttribute('version');
```

---

#### 5. maiml_transitions_count
- **型**: `INTEGER`
- **用途**: MAIMLファイル内のトランジション数
- **デフォルト値**: `NULL`

**backend使用箇所:**
```javascript
// reference/backend/services/dbOperations.js (367-378行目)
const maiml_transitions_count = rows[0]?.maiml_transitions_count;

// MAIML解析時に自動計算
UPDATE file_metadata 
SET maiml_transitions_count = $1
WHERE file_key = $2;
```

**API経由での使用:**
- **エンドポイント**: `GET /api/s3/file-content/:fileKey`
- **レスポンス**: `{ maiml_transitions_count: 42 }`

---

#### 6. maiml_places_count
- **型**: `INTEGER`
- **用途**: MAIMLファイル内のプレイス（場所）数
- **デフォルト値**: `NULL`

**backend使用箇所:**
```javascript
// reference/backend/services/dbOperations.js
const maiml_places_count = rows[0]?.maiml_places_count;

// MAIML解析時に自動計算
UPDATE file_metadata 
SET maiml_places_count = $1
WHERE file_key = $2;
```

---

#### 7. processing_status
- **型**: `VARCHAR(50)`
- **用途**: ファイル処理状態
- **許可値**: `pending`, `processing`, `completed`, `failed`
- **デフォルト値**: `pending`

**backend使用箇所:**
```javascript
// reference/backend/services/dbOperations.js
UPDATE file_metadata 
SET processing_status = 'processing'
WHERE file_key = $1;

// 処理完了後
UPDATE file_metadata 
SET processing_status = 'completed'
WHERE file_key = $1;
```

**実装ガイドライン:**
- CHECK制約で許可値を制限
- インデックス作成推奨: `CREATE INDEX idx_file_metadata_processing_status ON file_metadata(processing_status);`

---

#### 8. validation_status
- **型**: `VARCHAR(50)`
- **用途**: バリデーション状態
- **許可値**: `pending`, `valid`, `invalid`, `warning`
- **デフォルト値**: `pending`

**backend使用箇所:**
```javascript
// MAIML検証後に更新
UPDATE file_metadata 
SET validation_status = 'valid'
WHERE file_key = $1;
```

---

#### 9. maiml_validation_result
- **型**: `JSONB`
- **用途**: MAIML検証結果の詳細情報
- **デフォルト値**: `'{}'::jsonb`

**保存データ例:**
```json
{
  "valid": true,
  "errors": [],
  "warnings": [
    {
      "code": "WARN_001",
      "message": "Transition T1 has no input place",
      "location": "line 42"
    }
  ],
  "validated_at": "2026-01-16T12:00:00Z",
  "validator_version": "1.0.0"
}
```

**backend使用箇所:**
```javascript
// reference/backend/services/maimlParser.js
const validationResult = {
  valid: true,
  errors: [],
  warnings: []
};

UPDATE file_metadata 
SET maiml_validation_result = $1::JSONB
WHERE file_key = $2;
```

**実装ガイドライン:**
- GINインデックス作成推奨: `CREATE INDEX idx_file_metadata_validation_result_gin ON file_metadata USING GIN (maiml_validation_result);`

---

### Phase 1 DDL

```sql
-- Phase 1: Maimlファイル作成機能実装時の拡張
ALTER TABLE file_metadata
ADD COLUMN file_category VARCHAR(100),
ADD COLUMN file_extension VARCHAR(10),
ADD COLUMN is_maiml_file BOOLEAN DEFAULT FALSE,
ADD COLUMN maiml_version VARCHAR(20),
ADD COLUMN maiml_transitions_count INTEGER,
ADD COLUMN maiml_places_count INTEGER,
ADD COLUMN processing_status VARCHAR(50) DEFAULT 'pending'
  CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
ADD COLUMN validation_status VARCHAR(50) DEFAULT 'pending'
  CHECK (validation_status IN ('pending', 'valid', 'invalid', 'warning')),
ADD COLUMN maiml_validation_result JSONB DEFAULT '{}'::jsonb;

-- インデックス作成
CREATE INDEX idx_file_metadata_file_category ON file_metadata(file_category);
CREATE INDEX idx_file_metadata_is_maiml_file ON file_metadata(is_maiml_file);
CREATE INDEX idx_file_metadata_processing_status ON file_metadata(processing_status);
CREATE INDEX idx_file_metadata_validation_result_gin 
  ON file_metadata USING GIN (maiml_validation_result);
```

---

## 🔍 Phase 2: 詳細検索機能実装時（優先度: 高）

**✅ 反映済み (2026-01-19): docs/design/db/ddl/file_metadata.sql に統合完了**

**実装タイミング:** SearchModal.js のような詳細検索機能を実装する際

**重要:** このPhaseは検索性能に直結する重要な実装です。

### 追加予定カラム（6カラム）

#### 10. custom_metadata ✅ 反映済み
- **型**: `JSONB`
- **用途**: カスタムメタデータ（検索対象）
- **デフォルト値**: `'{}'::jsonb`

**保存データ例:**
```json
{
  "document": {
    "uuid": "doc_001",
    "name": "実験プロトコル_001",
    "description": "材料Aの合成実験"
  },
  "measurement": {
    "value": 25.5,
    "units": "℃"
  },
  "section_type": "Method",
  "attributes": {
    "id": "method_001",
    "ref": "template_001"
  }
}
```

**backend使用箇所:**
```javascript
// reference/backend/routes/s3/searchMetadataRoutes.js
// MAIML解析時に抽出したメタデータを保存
UPDATE file_metadata 
SET custom_metadata = $1::JSONB
WHERE file_key = $2;

// 検索クエリ
SELECT * FROM file_metadata
WHERE organization_id = $1
  AND custom_metadata @> '{"document": {"name": "実験"}}'::jsonb;
```

**frontend使用箇所:**
```javascript
// reference/frontend/src/components/SearchModal.js
// マルチ条件検索で使用
const searchCriteria = [
  { attribute: 'document.name', value: '実験' },
  { attribute: 'measurement.value', value: '25.5' }
];

// API呼び出し
const results = await searchMaimlFilesMetadata(searchCriteria);
```

**実装ガイドライン:**
- **GINインデックス必須**（検索性能向上）
- JSONB演算子（@>, ?, ?&, ?|）での高速検索
- マルチ条件検索の実現

**インデックス:**
```sql
CREATE INDEX idx_file_metadata_custom_metadata_gin 
  ON file_metadata USING GIN (custom_metadata);
```

---

#### 11. tags ✅ 反映済み
- **型**: `JSONB`
- **用途**: 検索タグ（配列形式）
- **デフォルト値**: `'[]'::jsonb`

**保存データ例:**
```json
["実験", "材料A", "合成", "温度測定"]
```

**backend使用箇所:**
```javascript
// reference/backend/routes/s3/searchMetadataRoutes.js
// タグ検索
SELECT * FROM file_metadata
WHERE organization_id = $1
  AND tags @> '["実験"]'::jsonb;
```

**frontend使用箇所:**
```javascript
// reference/frontend/src/components/SearchModal.js
// タグフィルタリング
<Select
  mode="multiple"
  options={tags.map(tag => ({ label: tag, value: tag }))}
/>
```

**実装ガイドライン:**
- **GINインデックス必須**
- タグベース検索の実現
- お気に入り機能（"favorite"タグ）にも活用可能

**インデックス:**
```sql
CREATE INDEX idx_file_metadata_tags_gin 
  ON file_metadata USING GIN (tags);
```

---

#### 12. search_keywords ✅ 反映済み
- **型**: `TEXT[]`
- **用途**: 検索キーワード配列
- **デフォルト値**: `NULL`

**保存データ例:**
```sql
ARRAY['実験', 'プロトコル', '材料A', '合成', '温度', '25.5度']
```

**backend使用箇所:**
```javascript
// MAIML解析時に自動生成
const keywords = extractKeywords(maimlContent);
UPDATE file_metadata 
SET search_keywords = $1::TEXT[]
WHERE file_key = $2;

// 検索クエリ
SELECT * FROM file_metadata
WHERE organization_id = $1
  AND search_keywords @> ARRAY['実験']::TEXT[];
```

**実装ガイドライン:**
- **GINインデックス必須**
- 全文検索の補助として使用

**インデックス:**
```sql
CREATE INDEX idx_file_metadata_search_keywords_gin 
  ON file_metadata USING GIN (search_keywords);
```

---

#### 13. description ✅ 反映済み
- **型**: `TEXT`
- **用途**: ファイル説明
- **デフォルト値**: `NULL`

**backend使用箇所:**
```javascript
// ユーザーが入力した説明文を保存
UPDATE file_metadata 
SET description = $1
WHERE file_key = $2;
```

---

#### 14. file_hash ✅ 反映済み
- **型**: `VARCHAR(64)`
- **用途**: ファイルハッシュ（SHA-256、重複検出用）
- **デフォルト値**: `NULL`

**backend使用箇所:**
```javascript
const crypto = require('crypto');
const fileHash = crypto.createHash('sha256').update(fileContent).digest('hex');

// 重複チェック
SELECT file_key FROM file_metadata
WHERE file_hash = $1 AND organization_id = $2;
```

**実装ガイドライン:**
- インデックス作成推奨: `CREATE INDEX idx_file_metadata_file_hash ON file_metadata(file_hash);`
- 同一ファイルの重複検出に使用

---

#### 15. parent_folder_path ✅ 反映済み
- **型**: `VARCHAR(500)`
- **用途**: 親フォルダパス
- **デフォルト値**: `NULL`

**保存データ例:**
```
"org_maiml_lab_001/projects/sample_project"
```

**backend使用箇所:**
```javascript
// file_keyから自動抽出
const parent_folder_path = path.dirname(file_key);

// フォルダ単位でのファイル一覧取得
SELECT * FROM file_metadata
WHERE parent_folder_path = $1 AND organization_id = $2;
```

**実装ガイドライン:**
- インデックス作成推奨: `CREATE INDEX idx_file_metadata_parent_folder ON file_metadata(parent_folder_path);`
- フォルダ階層管理に使用

---

### Phase 2 DDL

**✅ 2026-01-19 反映完了: file_metadata.sql に統合済み**

```sql
-- Phase 2: 詳細検索機能実装時の拡張
ALTER TABLE file_metadata
ADD COLUMN custom_metadata JSONB DEFAULT '{}'::jsonb,
ADD COLUMN tags JSONB DEFAULT '[]'::jsonb,
ADD COLUMN search_keywords TEXT[],
ADD COLUMN description TEXT,
ADD COLUMN file_hash VARCHAR(64),
ADD COLUMN parent_folder_path VARCHAR(500);

-- インデックス作成（検索性能向上に必須）
CREATE INDEX idx_file_metadata_custom_metadata_gin 
  ON file_metadata USING GIN (custom_metadata);
CREATE INDEX idx_file_metadata_tags_gin 
  ON file_metadata USING GIN (tags);
CREATE INDEX idx_file_metadata_search_keywords_gin 
  ON file_metadata USING GIN (search_keywords);
CREATE INDEX idx_file_metadata_file_hash 
  ON file_metadata(file_hash);
CREATE INDEX idx_file_metadata_parent_folder 
  ON file_metadata(parent_folder_path);

-- コメント追加
COMMENT ON COLUMN file_metadata.custom_metadata IS 'カスタムメタデータ（SearchModal.jsでの検索対象）';
COMMENT ON COLUMN file_metadata.tags IS '検索タグ（配列形式、SearchModal.jsでの検索対象）';
```

---

## 📦 Phase 3: アップロード管理機能実装時（優先度: 中）

**実装タイミング:** バッチアップロードや複雑なアップロード機能を実装する際

### 追加予定カラム（5カラム）

#### 16. upload_batch_id
- **型**: `VARCHAR(255)`
- **用途**: アップロードバッチID（複数ファイル一括アップロード時のグルーピング用）
- **デフォルト値**: `NULL`

**backend使用箇所:**
```javascript
// reference/backend/routes/s3Operations.js
const batchId = uuidv4();

// 各ファイルに同じバッチIDを付与
INSERT INTO file_metadata (upload_batch_id, ...) 
VALUES ($1, ...);

// バッチ単位でのファイル取得
SELECT * FROM file_metadata
WHERE upload_batch_id = $1 AND organization_id = $2;
```

**実装ガイドライン:**
- インデックス作成推奨: `CREATE INDEX idx_file_metadata_upload_batch ON file_metadata(upload_batch_id);`
- バッチ単位での操作（削除、移動等）に使用

---

#### 17. upload_source
- **型**: `VARCHAR(50)`
- **用途**: アップロード元
- **許可値**: `web_upload`, `bulk_upload`, `folder_upload`, `api_upload`
- **デフォルト値**: `web_upload`

**backend使用箇所:**
```javascript
INSERT INTO file_metadata (upload_source, ...) 
VALUES ('web_upload', ...);

// 統計情報の取得
SELECT upload_source, COUNT(*) 
FROM file_metadata
WHERE organization_id = $1
GROUP BY upload_source;
```

**実装ガイドライン:**
- CHECK制約で許可値を制限
- アップロード統計の分析に使用

---

#### 18. upload_method
- **型**: `VARCHAR(50)`
- **用途**: アップロード方法
- **許可値**: `single`, `multipart`, `resumable`
- **デフォルト値**: `single`

---

#### 19. s3_storage_class
- **型**: `VARCHAR(50)`
- **用途**: S3ストレージクラス
- **許可値**: `STANDARD`, `INTELLIGENT_TIERING`, `GLACIER`
- **デフォルト値**: `STANDARD`

---

#### 20. s3_etag
- **型**: `VARCHAR(100)`
- **用途**: S3 ETag（整合性チェック用）
- **デフォルト値**: `NULL`

---

### Phase 3 DDL

```sql
-- Phase 3: アップロード管理機能実装時の拡張
ALTER TABLE file_metadata
ADD COLUMN upload_batch_id VARCHAR(255),
ADD COLUMN upload_source VARCHAR(50) DEFAULT 'web_upload'
  CHECK (upload_source IN ('web_upload', 'bulk_upload', 'folder_upload', 'api_upload')),
ADD COLUMN upload_method VARCHAR(50) DEFAULT 'single'
  CHECK (upload_method IN ('single', 'multipart', 'resumable')),
ADD COLUMN s3_storage_class VARCHAR(50) DEFAULT 'STANDARD',
ADD COLUMN s3_etag VARCHAR(100);

-- インデックス作成
CREATE INDEX idx_file_metadata_upload_batch 
  ON file_metadata(upload_batch_id);
```

---

## 🔒 Phase 4: アクセス制御・監査機能実装時（優先度: 中）

**実装タイミング:** ファイルアクセス制御や監査ログ機能を実装する際

### 追加予定カラム（6カラム）

#### 21. access_level
- **型**: `VARCHAR(20)`
- **用途**: アクセスレベル
- **許可値**: `public`, `internal`, `restricted`, `private`
- **デフォルト値**: `internal`

---

#### 22. owner_user_id
- **型**: `VARCHAR(100)`
- **用途**: 所有者ユーザーID
- **デフォルト値**: `NULL`

**実装ガイドライン:**
- 外部キー制約を設定（owner_user_id → organization_user(user_id)）

---

#### 23. access_permissions
- **型**: `JSONB`
- **用途**: アクセス権限詳細
- **デフォルト値**: `'{}'::jsonb`

**保存データ例:**
```json
{
  "read": ["user_001", "user_002"],
  "write": ["user_001"],
  "delete": ["user_001"]
}
```

---

#### 24. last_accessed_at
- **型**: `TIMESTAMP WITH TIME ZONE`
- **用途**: 最終アクセス日時
- **デフォルト値**: `NULL`

**backend使用箇所:**
```javascript
// ファイルアクセス時に更新
UPDATE file_metadata 
SET last_accessed_at = CURRENT_TIMESTAMP
WHERE file_key = $1;

// 最近使用したファイル表示
SELECT * FROM file_metadata
WHERE organization_id = $1
ORDER BY last_accessed_at DESC NULLS LAST
LIMIT 10;
```

---

#### 25. archived_at
- **型**: `TIMESTAMP WITH TIME ZONE`
- **用途**: アーカイブ日時
- **デフォルト値**: `NULL`

---

#### 26. download_count
- **型**: `INTEGER`
- **用途**: ダウンロード回数
- **デフォルト値**: `0`

**backend使用箇所:**
```javascript
// ダウンロード時にカウントアップ
UPDATE file_metadata 
SET download_count = download_count + 1
WHERE file_key = $1;

// 人気ファイルのランキング
SELECT file_key, original_filename, download_count
FROM file_metadata
WHERE organization_id = $1
ORDER BY download_count DESC
LIMIT 10;
```

---

### Phase 4 DDL

```sql
-- Phase 4: アクセス制御・監査機能実装時の拡張
ALTER TABLE file_metadata
ADD COLUMN access_level VARCHAR(20) DEFAULT 'internal'
  CHECK (access_level IN ('public', 'internal', 'restricted', 'private')),
ADD COLUMN owner_user_id VARCHAR(100),
ADD COLUMN access_permissions JSONB DEFAULT '{}'::jsonb,
ADD COLUMN last_accessed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN download_count INTEGER DEFAULT 0;

-- インデックス作成
CREATE INDEX idx_file_metadata_access_level 
  ON file_metadata(access_level);
CREATE INDEX idx_file_metadata_owner 
  ON file_metadata(owner_user_id);
CREATE INDEX idx_file_metadata_last_accessed 
  ON file_metadata(last_accessed_at);

-- 外部キー制約（ユーザー管理テーブル確定後）
-- ALTER TABLE file_metadata 
--     ADD CONSTRAINT fk_file_metadata_owner 
--     FOREIGN KEY (owner_user_id) 
--     REFERENCES organization_user(user_id)
--     ON DELETE SET NULL;
```

---

## 🔮 Phase 5: 高度な機能実装時（優先度: 低）

**実装タイミング:** 一時保存機能やデータレイク機能を実装する際

### 追加予定カラム（8カラム）

#### 27. is_draft
- **型**: `BOOLEAN`
- **用途**: 一時保存フラグ
- **デフォルト値**: `FALSE`

**backend使用箇所:**
```javascript
// reference/backend/routes/dbOperations.js (getDraftFiles)
SELECT * FROM file_metadata
WHERE uploaded_by = $1 
  AND is_draft = TRUE
  AND organization_id = $2
ORDER BY last_edit_timestamp DESC;
```

**実装ガイドライン:**
- 部分インデックス作成推奨:
```sql
CREATE INDEX idx_file_metadata_is_draft 
  ON file_metadata(is_draft) WHERE is_draft = TRUE;
```

---

#### 28. draft_metadata
- **型**: `JSONB`
- **用途**: 一時保存メタデータ
- **デフォルト値**: `'{}'::jsonb`

**保存データ例:**
```json
{
  "draftName": "実験記録_下書き_001",
  "editState": "in_progress",
  "autoSaveEnabled": true,
  "changeCount": 15,
  "lastSaveType": "auto"
}
```

---

#### 29. last_edit_timestamp
- **型**: `TIMESTAMP WITH TIME ZONE`
- **用途**: 最終編集日時
- **デフォルト値**: `NULL`

---

#### 30. data_layer
- **型**: `VARCHAR(20)`
- **用途**: データレイク階層
- **許可値**: `uploads`, `raw`, `processed`, `archive`
- **デフォルト値**: `uploads`

---

#### 31. version_number
- **型**: `INTEGER`
- **用途**: バージョン番号
- **デフォルト値**: `1`

---

#### 32. parent_version_id
- **型**: `INTEGER`
- **用途**: 親バージョンのID（自己参照外部キー）
- **デフォルト値**: `NULL`

**実装ガイドライン:**
- 自己参照外部キー:
```sql
ALTER TABLE file_metadata 
    ADD CONSTRAINT fk_file_metadata_parent_version 
    FOREIGN KEY (parent_version_id) 
    REFERENCES file_metadata(id)
    ON DELETE SET NULL;
```

---

#### 33. folder_structure
- **型**: `JSONB`
- **用途**: フォルダ階層情報
- **デフォルト値**: `'{}'::jsonb`

---

#### 34. is_folder_root
- **型**: `BOOLEAN`
- **用途**: フォルダルートフラグ
- **デフォルト値**: `FALSE`

---

### Phase 5 DDL

```sql
-- Phase 5: 高度な機能実装時の拡張
ALTER TABLE file_metadata
ADD COLUMN is_draft BOOLEAN DEFAULT FALSE,
ADD COLUMN draft_metadata JSONB DEFAULT '{}'::jsonb,
ADD COLUMN last_edit_timestamp TIMESTAMP WITH TIME ZONE,
ADD COLUMN data_layer VARCHAR(20) DEFAULT 'uploads'
  CHECK (data_layer IN ('uploads', 'raw', 'processed', 'archive')),
ADD COLUMN version_number INTEGER DEFAULT 1,
ADD COLUMN parent_version_id INTEGER,
ADD COLUMN folder_structure JSONB DEFAULT '{}'::jsonb,
ADD COLUMN is_folder_root BOOLEAN DEFAULT FALSE;

-- インデックス作成
CREATE INDEX idx_file_metadata_is_draft 
  ON file_metadata(is_draft) WHERE is_draft = TRUE;
CREATE INDEX idx_file_metadata_draft_metadata_gin 
  ON file_metadata USING GIN (draft_metadata);
CREATE INDEX idx_file_metadata_data_layer 
  ON file_metadata(data_layer);
CREATE INDEX idx_file_metadata_version 
  ON file_metadata(parent_version_id);

-- 自己参照外部キー
ALTER TABLE file_metadata 
    ADD CONSTRAINT fk_file_metadata_parent_version 
    FOREIGN KEY (parent_version_id) 
    REFERENCES file_metadata(id)
    ON DELETE SET NULL;
```

---

## 🛠️ 実装時の推奨手順

### 各Phaseの実装手順

1. **DDLファイルの更新**
   - `docs/design/db/ddl/file_metadata_
