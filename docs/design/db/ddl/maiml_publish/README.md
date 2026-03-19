# maiml_publish スキーマ DDL（廃止済み）

> ⚠️ **このフォルダは廃止済みです（2026-03-13）**
>
> 旧設計（KV 方式 / `maiml_publish` 専用スキーマ）のテーブル DDL を保存しています。  
> 現在の実装には使用していません。参照のみ許可。

---

## 廃止の経緯

当初は `maiml_publish` スキーマを設け、KV 方式でデータを格納する設計でした。  
設計見直しにより **maiml2Excel 方式**（組織スキーマへの階層構造格納）に変更され、  
`maiml_publish` スキーマおよびこのフォルダ配下の全 DDL は廃止されました。

| 旧テーブル（廃止） | 代替 |
|-------------------|------|
| `maiml_publish.maiml_asset` | `{org_schema}.maiml_asset` |
| `maiml_publish.maiml_publish_registry` | `public.maiml_publish_job` |
| `maiml_publish.maiml_condition_kv` | `{org_schema}.maiml_element` |
| `maiml_publish.maiml_material_kv` | `{org_schema}.maiml_element` |
| `maiml_publish.maiml_series_preview` | `{org_schema}.maiml_element_value` |
| `maiml_publish.maiml_series_raw_header` | `{org_schema}.maiml_element_value` |
| `maiml_publish.maiml_series_raw_chunk` | `{org_schema}.maiml_element_value` |

---

## 現在の設計

### public スキーマ（全組織共通）

| DDL ファイル | テーブル | 説明 |
|-------------|---------|------|
| `docs/design/db/ddl/maiml_publish_job.sql` | `public.maiml_publish_job` | 公開・非公開ジョブ管理 |

### 組織スキーマ（`{organization_id の - を _ に変換}`）

組織ごとに作成されるスキーマ。DDL テンプレートは以下を参照：

- **設計書**: `docs/MaiML_OpenData_Pipeline/db.md`
- **実装 DDL テンプレート**: `backend/src/sql/ddl/org_schema_tables.sql`
- **マイグレーション（data/protocol 層）**: `backend/migrations/20260313_create_org_schema_tables.sql`
- **マイグレーション（eventLog 層）**: `backend/migrations/20260318_add_event_tables_to_org_schema.sql`

| テーブル | 役割 |
|---------|------|
| `maiml_asset` | MaiML ファイル代表メタ |
| `maiml_instance` | result/material/condition インスタンス |
| `maiml_element` | 汎用データ行 |
| `maiml_element_value` | `<value>` 展開 |
| `maiml_insertion` | 外部ファイル参照 |
| `maiml_template` | テンプレート定義 |
| `maiml_template_element` | テンプレート汎用データ行 |
| `maiml_template_element_value` | テンプレート `<value>` 展開 |
| `maiml_template_insertion` | テンプレート外部ファイル参照 |
| `maiml_event` | event 要素（eventLog 層） |
| `maiml_event_element` | event 配下の property 行 |
| `maiml_event_element_value` | property の `<value>` 展開 |

---

## 変更履歴

| 日付 | 変更内容 | 担当者 |
|------|----------|--------|
| 2026-03-18 | 廃止済みに変更・現在の設計へのリンクを追記 | Cline |
| 2026-03-13 | 旧設計を廃止（maiml2Excel 方式に移行） | Cline |
| 2026-03-11 | 初版作成（旧 KV 方式設計） | Cline |
