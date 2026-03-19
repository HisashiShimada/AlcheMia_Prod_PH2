# タスク計画書: maiml_event_element カラム追加（maiml_element と構造を揃える）

## メタデータ
- **作成日時**: 2026-03-19 13:43
- **タスクID**: event_element_カラム追加
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

XSD（maiml-eventLog.xsd / maiml-property.xsd / maiml-core.xsd）を確認した結果、
`event` 配下には `property` だけでなく `content` も配置できることが判明。
また `property` は `xsi:type` によって `@units`, `@scaleFactor`, `@formatString` 等の
属性を持てる。

現在の `maiml_event_element` は `element_type='property'` 固定の最小構成で、
`maiml_element` / `maiml_template_element` が持つカラムの多くが欠落している。
これを `maiml_element` と同じカラム構成に揃える。

## 追加するカラム

`maiml_element` に存在し `maiml_event_element` に存在しないカラム：

| カラム名 | 型 | 説明 |
|----------|----|------|
| `xsi_type` | TEXT | `@xsi:type` 属性（intType, stringType 等） |
| `format_string` | TEXT | `@formatString` 属性 |
| `units` | TEXT | `@units` 属性（単位） |
| `scale_factor` | DOUBLE PRECISION | `@scaleFactor` 属性 |
| `axis` | TEXT | `@axis` 属性（contentのみ） |
| `size_value` | INT | `@size` 属性（contentのみ） |
| `element_id_attr` | TEXT | `@id` 属性 |
| `element_ref` | TEXT | `@ref` 属性 |

また `element_type` の DEFAULT 制約を外し、`property` / `content` の両方を格納可能にする。

## 変更ファイル一覧

### 新規作成
1. `backend/migrations/20260319_add_columns_to_event_element.sql` - 既存スキーマへのカラム追加マイグレーション

### 修正
1. `backend/src/sql/ddl/org_schema_tables.sql` - DDLテンプレートのevent_element定義を更新
2. `backend/src/types/maimlOpenData.ts` - `MaimlEventElement` / `MaimlEventElementInput` 型を更新
3. `backend/src/repositories/maimlAssetRepository.ts` - `insertEventElement` のINSERT文を更新
4. `backend/src/services/maimlIngestParserService.ts` - eventElement生成時に属性を設定
5. `docs/MaiML_OpenData_Pipeline/db.md` - §7.2 DDL・カラムマッピングを更新

## 承認記録
- **計画書提示日時**: 2026-03-19 13:43
- **承認日時**: 2026-03-19 13:44

## 実施記録

### 実施日時
開始: 2026-03-19 13:44
完了: 2026-03-19 14:09

### 変更した成果物
- [x] `backend/migrations/20260319_add_columns_to_event_element.sql` - 作成
- [x] `backend/src/sql/ddl/org_schema_tables.sql` - event_element 定義を更新
- [x] `backend/src/types/maimlOpenData.ts` - MaimlEventElement / MaimlEventElementInput に8カラム追加
- [x] `backend/src/repositories/maimlAssetRepository.ts` - insertEventElement の INSERT 文を14列に更新
- [x] `backend/src/services/maimlIngestParserService.ts` - property の属性マッピング追加・content の処理を追加
- [x] `docs/MaiML_OpenData_Pipeline/db.md` - §7.2 DDL・§7.3 カラムマッピング表を更新
