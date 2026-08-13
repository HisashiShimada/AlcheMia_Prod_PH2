# タスク計画書: CSV/XMLインポート機能 仕様書・確認手順書作成

## メタデータ
- **作成日時**: 2026-07-27 16:26
- **タスクID**: csv-xml-import-docs
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

`docs/tasks/20260727_0949_Insertion機能改修/PLAN.md` の Phase3 で実装した
CSV/XML インポート機能（ContentGridEditor）について、以下を作成する。

1. 機能仕様詳細書 `csv_xml_import_spec.md`
2. 動作確認手順書 `manual_test_procedure.md`
3. 動作確認用サンプルファイル（`samples/` 配下）

## 成果物一覧

| ファイル | 内容 |
|--------|------|
| `csv_xml_import_spec.md` | コンポーネント構成・パースルール・エラー仕様の詳細 |
| `manual_test_procedure.md` | 動作確認の前提条件・テストシナリオ手順 |
| `samples/sample_normal.csv` | 正常インポート確認用 CSV（5行×4列）|
| `samples/sample_with_warning.csv` | 警告表示確認用 CSV（非数値セル混在）|
| `samples/sample_content_direct.xml` | XMLパターン①：直接テキスト形式 |
| `samples/sample_content_value_children.xml` | XMLパターン②：`<value>` 子タグ形式 |
| `samples/sample_row_tags.xml` | XMLパターン③：`<row>` タグ形式 |

## 承認記録
- **承認日時**: 2026-07-27 16:26
