# 元仕様書 vs 要約仕様書 差分まとめ

> 元仕様書: `MaiML_OpenData_Pipeline_BasicDesign_v1.3.md` (v1.3, 2026-02-17)
> 要約仕様書: `spec.md` / `implementation.md` / `issues.md` (2026-03-05〜06)
> 作成日: 2026-03-09

---

## 1. アーキテクチャ・実装方針の差分（最重要）

### 1.1 操作インターフェース

| 項目 | 元仕様書 | 要約仕様書（spec.md）での変更 |
|------|---------|--------------------------|
| **一次IF** | CLIツール（`maimlctl` コマンド） | mmdpf UIの「公開」「非公開」ボタン → HTTP API |
| **補助IF** | API（CLIと並列で記載） | バックエンドAPIが主体 |
| **実行者** | DBロール `publisher` を持つユーザー | mmdpfの `experiment_admin` ロールのユーザー |

> **変更理由（spec.mdより）**: mmdpfのプロジェクト詳細画面に統合するため

---

### 1.2 Worker実装言語

| 項目 | 元仕様書 | 要約仕様書での変更 |
|------|---------|-----------------|
| **Worker言語** | Python（疑似コードがPython記法、`iterparse`はPython API） | Node.js / TypeScript（backendに組み込む） |
| **SAX解析** | Python `xml.etree.ElementTree.iterparse` | Node.jsの `sax` パッケージ等で代替 |
| **数値計算** | Python（`numpy`等を想定） | TypeScriptで再実装 |

---

### 1.3 実行方式

| 項目 | 元仕様書 | 要約仕様書での変更 |
|------|---------|-----------------|
| **実行タイミング** | CLI手動実行 または cron定期実行 | UIボタン押下によるリアルタイムトリガー |
| **プロセス形態** | 独立したバッチプロセス | mmdpf backend（Node.js/Express）に組み込み |
| **スケジュール非公開** | `maiml_unpublish_due_assets()` をcron実行 | 未決（issues.mdに記載なし） |

---

### 1.4 認証・権限モデル

| 項目 | 元仕様書 | 要約仕様書での変更 |
|------|---------|-----------------|
| **権限管理** | PostgreSQLのDBロール（`viewer` / `publisher` / `admin`） | mmdpfのRBAC（`experiment_admin`のみ操作可） |
| **マルチテナント** | 記載なし（organization_id不明） | mmdpfの `organization_id` に準拠（未決事項として記載） |

---

### 1.5 対象ファイルの指定方法

| 項目 | 元仕様書 | 要約仕様書での変更 |
|------|---------|-----------------|
| **ファイル指定** | `--file-uri "file:///data/maiml/raman_001.xml"` をCLIで明示指定 | ボタン押下時点のプロジェクトの**最新MaiMLファイルを自動的に**対象とする |
| **対象選択** | ユーザーが任意のファイルを登録（ホワイトリスト方式） | プロジェクトに紐づく最新ファイルが自動選択される |

---

## 2. DB設計の差分

### 2.1 スキーマ定義の完全性

| テーブル | 元仕様書 | 要約仕様書（implementation.md）での状態 |
|---------|---------|--------------------------------------|
| `maiml_condition_kv` | ✅ CREATE TABLE全量記載 | ✅ カラムマッピング確定 |
| `maiml_material_kv` | ✅ CREATE TABLE全量記載 | ✅ カラムマッピング確定 |
| `maiml_series_preview` | ✅ CREATE TABLE全量記載 | ✅ カラムマッピング確定 |
| `maiml_series_raw_header` | ✅ CREATE TABLE全量記載 | ✅ カラムマッピング確定 |
| `maiml_series_raw_chunk` | ✅ CREATE TABLE全量記載 | ✅ カラムマッピング確定 |
| `maiml_series_raw_chunk_bin` | ✅ CREATE TABLE全量記載 | ✅ カラムマッピング確定 |
| `maiml_publish_registry` | ❌ ALTER TABLE（追加分のみ） | ❌ 既存スキーマ不明（要確認） |
| `maiml_asset` | ❌ ALTER TABLE（追加分のみ） | ❌ 既存スキーマ不明（要確認） |

### 2.2 mmdpf固有カラムの追加が必要

元仕様書にはmmdpf固有の概念がないため、以下のカラムを追加設計する必要がある：

| テーブル | 追加が必要なカラム | 理由 |
|---------|----------------|------|
| `maiml_asset` | `organization_id` | マルチテナント分離 |
| `maiml_asset` | `project_id`（検討） | mmdpfプロジェクトとの紐付け（不要との決定あり） |
| `maiml_publish_registry` | `organization_id` | マルチテナント分離 |

---

## 3. 機能スコープの差分

### 3.1 要約仕様書で**追加・明確化**された内容

| 項目 | 内容 |
|------|------|
| XSDカラムマッピング | XSDファイル（`maiml-property.xsd` 等）を調査し、各カラムのXMLパス対応を確定 |
| `instruction_id` の取得元 | `<instruction id="...">` の `id` 属性（maiml-protocol.xsd で確認） |
| `doc_name` の取得元 | `/maiml/document/name/text()`（XRF.maimlサンプルで確認） |
| `value_type` の値一覧 | XSDタグ名 → DB保存値のマッピング表を作成 |
| SAX/iterparseの解説 | DOM方式との違い、なぜMaiMLにストリーミングが必要かを説明 |

### 3.2 要約仕様書で**未解決のまま**の内容

| 項目 | 内容 | 対策 |
|------|------|------|
| `series_type` 判定ロジック | TIC / SPECTRUM_TOTAL / OTHER の判定ルール未定義 | inline seriesを含むMaiMLサンプル（クロマトグラフィー系）が必要 |
| `maiml_publish_registry` 既存スキーマ | PK・ステータスカラム・file_uriカラム名が不明 | OpenData側DB SQL（CREATE TABLE全文）を受領 |
| `maiml_asset` 既存スキーマ | v1.3以前の設計書が未確認 | 同上 |
| プレビューのデフォルトモード | uniform / maxhold / mmr のいずれをデフォルトにするか | 実装時に決定 |
| スケジュール自動非公開の実装 | `maiml_unpublish_due_assets()` をどこで定期実行するか | 未検討 |
| フロントエンドUI詳細 | 公開設定入力フォームのデザイン | 未設計 |

---

## 4. 要約仕様書で**省略・簡略化**された内容

以下は元仕様書に記載があるが、要約仕様書では省略または参照のみとなっている内容：

| 項目 | 元仕様書 | 要約仕様書 |
|------|---------|---------|
| MMRアルゴリズムの疑似コード（Python） | 詳細な実装コード掲載 | アルゴリズム説明のみ（コードは元仕様書参照） |
| パフォーマンス・容量ガイド | チャンクサイズ・インデックス指針など詳細記載 | 表形式で簡略化（implementation.md） |
| テスト計画の詳細 | MAE/MAPE/Peak Recall/Area保持率など品質指標 | 要点のみ記載 |
| Binary方式チャンクの詳細 | `codec` / `payload` の詳細 | 表形式で概要のみ |
| CLI全コマンドオプション | `--retention` / `--keep-meta-on-unpublish` など | コマンド表形式で概要のみ |
