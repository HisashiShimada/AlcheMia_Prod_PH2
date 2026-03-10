# 詳細検索（ProjectSearchModal）調査結果レポート

## 作成日時
2026-03-05 08:05

---

## 1. 既に完了した修正

### ProjectManagement.tsx
- **修正内容**: 詳細検索モーダルからプロジェクトを選択した際、既存のフィルター条件（所有者・部門・ステータス・チェックアウト状態・検索クエリ）を全てリセット
- **効果**: 選択したプロジェクトが左パネルに確実に表示され、ハイライト（選択状態）になる
- **ステータス**: ✅ 完了済み（コミット済み）

---

## 2. 検索方式の差異（未修正）

### 問題の概要
Reference版（`enhancedSearchService.js`）と現在のmmdpf版（`fileMetadataRepository.ts`）でDBスキーマが異なるため、`id/ref/key/element/value/units/section_type` の検索挙動が異なる。

### Reference版のDBスキーマ
- **テーブル**: 別テーブル（行ごとに id/ref/key がテキストカラムで1値ずつ格納）
- **検索SQL**: `LOWER(COALESCE(id, '')) LIKE LOWER('%検索値%')` → **大文字小文字を無視した部分一致**

### mmdpf版のDBスキーマ（file_metadataテーブル）
- **カラム**: JSONB配列カラム（全idをひとつの配列にまとめて格納）
  - `maiml_ids JSONB DEFAULT '[]'::jsonb`
  - `maiml_refs JSONB DEFAULT '[]'::jsonb`
  - `maiml_keys JSONB DEFAULT '[]'::jsonb`
  - `maiml_elements JSONB DEFAULT '[]'::jsonb`
  - `maiml_values JSONB DEFAULT '[]'::jsonb`
  - `maiml_units JSONB DEFAULT '[]'::jsonb`
  - `maiml_section_types JSONB DEFAULT '[]'::jsonb`
  - `maiml_measurement_values JSONB DEFAULT '[]'::jsonb`
- **検索SQL**: `maiml_ids @> '["検索値"]'::jsonb` → **配列内の完全一致**
- **例**: `place` と入力しても `["place_01", "place_02"]` にはヒットしない。`place_01` と完全一致する値がないとヒットしない

### テキストカラム（部分一致・正常）
以下3カラムはテキスト型なので ILIKE による部分一致で動作中：
- `maiml_document_name` → `ILIKE '%値%'`
- `maiml_document_uuid` → `ILIKE '%値%'`
- `maiml_document_description` → `ILIKE '%値%'`

---

## 3. 検索属性マッピング一覧（現在のmmdpf版）

| 検索属性 | DBカラム | 型 | 現在の検索方式 | Reference方式 |
|---------|---------|---|--------------|--------------|
| `document.uuid` | `fm.maiml_document_uuid` | TEXT | ILIKE 部分一致 ✅ | LIKE 部分一致 |
| `document.name` | `fm.maiml_document_name` | TEXT | ILIKE 部分一致 ✅ | LIKE 部分一致 |
| `document.description` | `fm.maiml_document_description` | TEXT | ILIKE 部分一致 ✅ | LIKE 部分一致 |
| `measurement_value` | `fm.maiml_measurement_values` | JSONB配列 | `@>` 完全一致 ⚠️ | LIKE 部分一致 |
| `units` | `fm.maiml_units` | JSONB配列 | `@>` 完全一致 ⚠️ | LIKE 部分一致 |
| `section_type` | `fm.maiml_section_types` | JSONB配列 | `@>` 完全一致 ⚠️ | LIKE 部分一致 |
| `id` | `fm.maiml_ids` | JSONB配列 | `@>` 完全一致 ⚠️ | LIKE 部分一致 |
| `ref` | `fm.maiml_refs` | JSONB配列 | `@>` 完全一致 ⚠️ | LIKE 部分一致 |
| `key` | `fm.maiml_keys` | JSONB配列 | `@>` 完全一致 ⚠️ | LIKE 部分一致 |
| `element` | `fm.maiml_elements` | JSONB配列 | `@>` 完全一致 ⚠️ | LIKE 部分一致 |
| `value` | `fm.maiml_values` | JSONB配列 | `@>` 完全一致 ⚠️ | LIKE 部分一致 |

---

## 4. 修正方針の選択肢

### 選択肢A: 部分一致に変更（Referenceと同等）

**修正箇所**: `backend/src/repositories/fileMetadataRepository.ts` の `searchByMaimlMetadata()` 内

**現在のコード（完全一致）**:
```typescript
if (mapping.isJsonb) {
  additionalConditions.push(
    `${mapping.column} @> $${paramIndex}::jsonb`
  );
  params.push(JSON.stringify([criterion.value]));
}
```

**修正後のコード（部分一致）**:
```typescript
if (mapping.isJsonb) {
  additionalConditions.push(
    `EXISTS (SELECT 1 FROM jsonb_array_elements_text(${mapping.column}) AS elem WHERE LOWER(elem) ILIKE $${paramIndex})`
  );
  params.push(`%${criterion.value}%`);
}
```

**メリット**: Referenceと同じ動作。`place` → `place_01`, `place_02` 等すべてヒット
**デメリット**: GINインデックス（`idx_file_metadata_maiml_ids_gin` 等）が使われなくなる。データ量が多い場合はパフォーマンス低下の可能性

### 選択肢B: 完全一致のまま（現状維持）

**メリット**: GINインデックスが有効、高速
**デメリット**: Reference仕様と乖離。ユーザーは正確なID値を知っていないと検索できない

### 選択肢C: 部分一致に変更 + GINインデックスをトリグラムインデックスに変更

**修正箇所**: 
1. `fileMetadataRepository.ts` を選択肢Aと同様に修正
2. マイグレーションSQL追加: GINインデックスを `pg_trgm` ベースのインデックスに変更

```sql
-- pg_trgm拡張を有効化（既に有効な場合は不要）
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- トリグラムインデックス追加（ILIKE部分一致に対応）
CREATE INDEX idx_file_metadata_maiml_ids_trgm
  ON file_metadata USING GIN ((maiml_ids::text) gin_trgm_ops);
```

**メリット**: 部分一致でもインデックス使用可能
**デメリット**: マイグレーション作業が必要

---

## 5. 関連ファイル

| ファイル | 役割 |
|---------|-----|
| `backend/src/repositories/fileMetadataRepository.ts` | 検索SQL構築（`ATTRIBUTE_TO_COLUMN`マッピング + `searchByMaimlMetadata()`） |
| `backend/src/sql/queries/projectSearch/searchByMaimlMetadata.sql` | ベースSQL（SELECT/FROM/JOIN部分） |
| `backend/src/services/projectService.ts` | `searchProjects()`（プロジェクト単位に重複除去して返す） |
| `backend/src/controllers/projectController.ts` | APIエンドポイント処理 |
| `frontend/src/components/project/ProjectSearchModal.tsx` | 検索モーダルUI |
| `frontend/src/components/project/ProjectManagement.tsx` | ✅ 修正済み（フィルターリセット） |
| `backend/reference/services/enhancedSearchService.js` | Reference版検索サービス（比較元） |

---

## 6. Reference版の詳細仕様（細部把握）

### 6-1. 検索エンジン・インフラ

| 項目 | Reference版 | mmdpf版 |
|------|-----------|--------|
| 検索エンジン | AWS Athena（サーバーレスクエリ） | PostgreSQL |
| データソース | `maiml_unified_db.maiml_unified`（統合テーブル） | `file_metadata`テーブル（JSONB配列カラム） |
| インフラ | AWS Glue データカタログ + S3上のParquet | Docker上のPostgreSQL |
| クエリ言語 | Athena SQL（Presto方言） | PostgreSQL SQL |
| タイムアウト | 30秒（デフォルト）/ 最大30秒待機 | N/A（同期クエリ） |

---

### 6-2. Reference版の統合テーブルスキーマ

```
maiml_unified テーブルのカラム構成:
- source_filename    : MAIMLファイル名
- source_s3_path     : S3フルパス
- source_uuid        : Document UUID
- source_description : Document説明
- project_database   : プロジェクトDB名
- project_table      : プロジェクトテーブル名
- attribute          : JSON型（属性パス情報）
- value              : テキスト（測定値）
- units              : テキスト（単位）
- section_type       : テキスト（セクション種別）
- id                 : テキスト（MAIMLのid属性）    ← 直接カラム（Glue最適化）
- ref                : テキスト（MAIMLのref属性）   ← 直接カラム（Glue最適化）
- key                : テキスト（MAIMLのkey属性）   ← 直接カラム（Glue最適化）
- element            : テキスト（MAIMLの要素名）    ← 直接カラム（Glue最適化）
```

> **補足**: `id`, `ref`, `key`, `element`, `value` はv0.93で追加。v0.93以前は `attribute` カラムのJSON内に埋め込まれていた（`JSON_EXTRACT_SCALAR`での検索が必要だった）。v0.93でGlue最適化として直接カラム化し、パフォーマンスが大幅向上。

---

### 6-3. Reference版のSQLクエリ構造（buildUnifiedTableQuery）

```sql
WITH search_results AS (
  SELECT DISTINCT
    source_filename,
    source_s3_path,
    source_uuid,
    source_description,
    project_database,
    project_table,
    COUNT(*) OVER (PARTITION BY source_filename) as match_count
  FROM "maiml_unified_db"."maiml_unified"
  WHERE (条件1) OR (条件2) OR ...   -- ← OR結合
)
SELECT 
  source_filename as maiml_filename,
  source_s3_path as s3_path,
  source_uuid as document_uuid,
  source_description as document_description,
  project_database,
  project_table,
  match_count
FROM search_results
GROUP BY ...
ORDER BY source_filename
```

> **重要**: Reference版のWHERE句は **OR結合**。mmdpf版は **AND結合**（全条件を同時に満たすファイルのみヒット）。

---

### 6-4. Reference版の各属性の検索SQL（buildConditionForCriterion）

| 属性 | Reference版のSQL条件 | 特記事項 |
|------|---------------------|---------|
| `document.uuid` | `JSON_EXTRACT_SCALAR(attribute, '$["1"]') = 'document' AND JSON_EXTRACT_SCALAR(attribute, '$["2"]') = 'uuid' AND LOWER(COALESCE(value, '')) LIKE LOWER('%値%')` | JSONパス検索 |
| `document.name` | `JSON_EXTRACT_SCALAR(attribute, '$["1"]') = 'document' AND JSON_EXTRACT_SCALAR(attribute, '$["2"]') = 'name' AND LOWER(COALESCE(value, '')) LIKE LOWER('%値%')` | JSONパス検索 |
| `document.description` | `JSON_EXTRACT_SCALAR(attribute, '$["1"]') = 'document' AND JSON_EXTRACT_SCALAR(attribute, '$["2"]') = 'description' AND LOWER(COALESCE(value, '')) LIKE LOWER('%値%')` | JSONパス検索 |
| `measurement_value` | `LOWER(COALESCE(value, '')) LIKE LOWER('%値%')` | `value`カラム直接検索 |
| `units` | `LOWER(COALESCE(units, '')) LIKE LOWER('%値%')` | `units`カラム直接検索 |
| `section_type` | `LOWER(COALESCE(section_type, '')) LIKE LOWER('%値%')` | `section_type`カラム直接検索 |
| `id` | `id IS NOT NULL AND LOWER(COALESCE(id, '')) LIKE LOWER('%値%')` | 直接カラム（v0.93追加） |
| `ref` | `ref IS NOT NULL AND LOWER(COALESCE(ref, '')) LIKE LOWER('%値%')` | 直接カラム（v0.93追加） |
| `key` | `key IS NOT NULL AND LOWER(COALESCE(key, '')) LIKE LOWER('%値%')` | 直接カラム（v0.93追加） |
| `element` | `element IS NOT NULL AND LOWER(COALESCE(element, '')) LIKE LOWER('%値%')` | 直接カラム（v0.93追加） |
| `value` | `value IS NOT NULL AND LOWER(COALESCE(value, '')) LIKE LOWER('%値%')` | 直接カラム（v0.93追加） |

**共通ルール**:
- すべて `LOWER(COALESCE(カラム, '')) LIKE LOWER('%値%')` → **大文字小文字を無視した部分一致**
- `IS NOT NULL` チェックを `id`, `ref`, `key`, `element`, `value` に付与（データ量を減らす最適化）
- `NULL` → 空文字として扱う（`COALESCE`）

---

### 6-5. Reference版の検索条件バリデーション

```javascript
// サポートされている属性リスト（validateSearchCriteria）
const supportedAttributes = [
  'document.uuid', 'document.name', 'document.description',
  'measurement_value', 'units', 'section_type',
  'id', 'ref', 'key', 'element', 'value'
];

// バリデーションルール
// 1. criteria が配列であること
// 2. criterion.attribute が非空であること
// 3. criterion.value が非空かつ trim() 後に長さ > 0
// 4. criterion.attribute が supportedAttributes に含まれること
// 5. 最大10条件まで（enhancedRoutesのexpress-validatorで制限）
```

**サニタイズ処理（sanitizeForAthena）**:
```javascript
value
  .replace(/'/g, "''")       // シングルクォートをエスケープ
  .replace(/\\/g, '\\\\')   // バックスラッシュをエスケープ
  .substring(0, 200)         // 200文字で切り詰め
```

---

### 6-6. Reference版の検索結果構造（aggregateResultsByFile）

```javascript
// ファイル1件分の結果オブジェクト
{
  maimlFileName: "sample.maiml",
  s3FolderPath: "s3://bucket/org/projects/project1/",  // S3パス補正済み
  documentDescription: "...",
  matchCount: 3,                 // そのファイル内のマッチ行数（行レベル）
  key: "s3フルパス",
  name: "sample.maiml",
  
  // v0.94追加: ヒット属性情報
  matchedAttributes: [
    {
      attribute: "ID属性",          // 表示名（getAttributeDisplayName変換後）
      value: "place_01",            // 検索値
      searchCriterion: "id"         // 元の属性キー
    }
  ],
  
  metadata: {
    projectName: "99999-AISOL",
    databaseName: "99999_aisol",
    tableName: "...",
    documentUuid: "...",
    sourceMaimlFile: "s3フルパス"
  }
}
```

> **注意**: Reference版の `matchedAttributes` は「検索条件から生成した表示用情報」であり、**実際にヒットした値の一覧ではない**。SearchModal.jsの表示コードでは `match.matchedValues`（配列）を参照しているが、これはSearchModal.js固有の古い形式で、v0.94のAPIレスポンスとは齟齬がある（後述）。

---

### 6-7. Reference版のフロントエンド（SearchModal.js）の詳細仕様

#### 検索条件の制約
- **最大5条件**まで（`searchCriteria.length < 5` でガード）
- **モーダルを開くたびに条件リセット**（`useEffect`で`isOpen`変化時に初期化）

#### 検索フロー
```
1. validCriteria = criteria.filter(attribute && value.trim())
2. searchMaimlFilesMetadata(validCriteria) を呼び出し
   ※ APIエンドポイント: POST /s3/search-maiml-metadata
   ※ リクエストボディ: { searchCriteria: validCriteria }
3. 結果にS3パス補正（correctS3Path）を適用
4. matchedAttributes を追加（検索条件から生成）
5. 結果を表示
```

#### 結果表示の特徴（SearchModal.jsの表示コード）
```jsx
// ヒット属性の表示（reference版SearchModal.jsより）
{file.matchedAttributes && file.matchedAttributes.map((match, matchIndex) => (
  <Box key={matchIndex}>
    <Chip label={`条件${match.criterionNumber}`} />   // ← 条件番号
    <Typography>{getAttributeDisplayName(match.attribute)}</Typography>
    <Typography>({match.matchCount}件)</Typography>  // ← ヒット件数
    
    {match.matchedValues.slice(0, 5).map((value, valueIndex) => (
      <Chip label={value} />   // ← 実際にヒットした値のリスト（最大5件）
    ))}
    {match.matchedValues.length > 5 && (
      <Chip label={`+${match.matchedValues.length - 5}件`} />
    )}
  </Box>
))}
```

> **重要な齟齬**: SearchModal.jsでは `match.criterionNumber`, `match.matchedValues`（配列）, `match.matchCount` を期待しているが、v0.94のAPIレスポンス（`aggregateResultsByFile`）が返す `matchedAttributes` には `criterionNumber` も `matchedValues` も含まれていない。**Reference版内部でもフロントエンドとバックエンドの仕様が一致していない**。

---

### 6-8. Reference版のAPIエンドポイント構成

| エンドポイント | メソッド | 用途 |
|--------------|---------|------|
| `POST /api/enhanced/search/maiml` | POST | Enhanced検索（Athena経由） |
| `POST /api/s3/search-maiml-metadata` | POST | マルチテナント対応メタデータ検索（DB経由） |
| `GET /api/enhanced/projects` | GET | プロジェクト一覧取得 |
| `GET /api/enhanced/health` | GET | ヘルスチェック |

**SearchModal.jsが使うAPI**:
- `searchMaimlFilesMetadata` → `POST /api/s3/search-maiml-metadata`（DBベース）
- `searchMaimlFilesEnhanced` → `POST /api/enhanced/search/maiml`（Athenaベース）

---

### 6-9. Reference版とmmdpf版の詳細差異まとめ

| 比較項目 | Reference版 | mmdpf版 | 影響度 |
|---------|-----------|--------|-------|
| **検索方式** | LIKE部分一致（大文字小文字無視） | JSONB `@>` 完全一致 | ⚠️ 高（ユーザー体験に直結） |
| **条件結合** | OR結合（いずれかの条件に一致） | AND結合（全条件に一致） | ⚠️ 高（ヒット件数が大きく変わる） |
| **検索単位** | MAIMLファイル単位 | プロジェクト単位 | ✅ 意図的な変更 |
| **検索対象データ** | Athena統合テーブル（行ごとに1値） | PostgreSQL JSONB配列（1ファイル=1行） | - |
| **最大検索条件数** | 10条件（バックエンド）/ 5条件（フロントエンド） | 5条件（フロントエンドのみ制限） | ✅ 同等 |
| **NULL/空値の扱い** | `COALESCE(カラム, '')` で空文字化 | `@>`なのでNULL配列はヒットしない | ⚠️ 中 |
| **入力サニタイズ** | `''`エスケープ＋200文字切り詰め | Parameterized Queryで自動対応 | ✅ 同等（mmdpf版が安全） |
| **matchedAttributesの内容** | 検索条件から生成（表示名＋検索値） | 検索条件から生成（表示名＋検索値） | ✅ 同等 |
| **matchCountの意味** | Athena行レベルのマッチ数 | 検索条件数（`validCriteria.length`） | ⚠️ 意味が異なる |
| **S3パス補正** | あり（extractFolderPath） | 不要（S3パスを返さない） | ✅ 不要 |

---

### 6-10. OR結合 vs AND結合の仕様差異（重要）

**Reference版（OR結合）の動作例**:
```
検索条件: id="place" AND measurement_value="100"
→ SQL: WHERE (id LIKE '%place%') OR (value LIKE '%100%')
→ どちらか一方でも含むファイルがヒット
→ ヒット件数が多い、広い検索
```

**mmdpf版（AND結合）の動作例**:
```
検索条件: id="place" AND measurement_value="100"
→ SQL: WHERE maiml_ids @> '["place"]'::jsonb
         AND maiml_measurement_values @> '["100"]'::jsonb
→ 両方を同時に含むファイルのみヒット
→ ヒット件数が少ない、絞り込み検索
```

> **結論**: Reference版は「いずれかに一致するファイルを広く探す」、mmdpf版は「すべての条件を満たすファイルだけを返す」という設計思想の違いがある。どちらの仕様にするかはユーザー要件次第だが、Reference版のUIは「条件の間にANDと表示している」にもかかわらずSQL上はOR結合という**バグに近い実装**の可能性もある。

---

## 7. 推奨事項

**選択肢Aの部分一致変更を推奨**。理由：
- 検索対象データ（file_metadataのMAIML検索カラム）は通常数百〜数千件程度と想定され、インデックスなしでも実用上問題ない
- ユーザーが正確なID値（例: `mat_Sample01_condition_param_1_chem_formula`）を知っていることは稀で、部分一致でないと実用的でない
- Referenceの仕様を踏襲するのが一貫性上望ましい
