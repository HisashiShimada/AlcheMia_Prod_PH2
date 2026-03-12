# MaiML 公開処理 課題・未決事項まとめ

> 元仕様書: `docs/design/MaiML_OpenData_Pipeline_BasicDesign_v1.3.md` (v1.3, 2026-02-17)
> 作成日: 2026-03-06
> 最終更新: 2026-03-06

---

## 1. スキーマ関連の課題

### 1.1 maiml_publish_registry の既存スキーマが不明

仕様書には `ALTER TABLE`（追加カラムのみ）が記載されており、既存スキーマが確認できない。

| 不明な点 | 詳細 |
|---------|------|
| ファイル URI を保持するカラム名 | CLI の `--file-uri` オプションから入ることは推測できるが、カラム名が不明 |
| ステータスカラム | `requested` / `published` 等のステータスを管理するカラムの有無・名前が不明 |
| PRIMARY KEY の構成 | 単純な連番 ID か複合キーかが不明 |

**対策:** OpenData 側 DB の SQL（CREATE TABLE 全文）を受領する

---

### 1.2 maiml_asset の既存スキーマが不明

同じく `ALTER TABLE`（`template_only` 追加のみ）しか記載がなく、既存スキーマが不明。

| 不明な点 | 詳細 |
|---------|------|
| ファイル URI / パスのカラム | ストレージ上のファイルパスを保持するカラムがあるか不明 |
| 公開ステータス / 公開日時 | カラムの有無・名前が不明 |
| organization_id | mmdpf 固有のマルチテナント分離カラムの有無が不明 |

**対策:** OpenData 側 DB の SQL（CREATE TABLE 全文）を受領する

---

## 2. Worker 実装の課題

### 2.1 series_type の判定ロジックが未定義

`maiml_series_preview` の `series_type` カラム（`TIC` / `SPECTRUM_TOTAL` / `OTHER`）について判定ルールが未定義。

XRF.maiml を調査した結果、XRF スペクトルデータは `<insertion>` で外部バイナリファイルを参照する形式であり、maiml 内に inline の series 数値列が存在しないことが判明した。そのため `contentBaseType` の `key` 属性値（TIC / SPECTRUM_TOTAL 相当の文字列）を確認できなかった。

| 不明な点 | 詳細 |
|---------|------|
| `TIC` の判定条件 | inline series を持つサンプルで `key` 属性の実値を確認する必要がある |
| `SPECTRUM_TOTAL` の判定条件 | 同上 |
| 部分マッチか完全一致か | マッチング方式が未定 |

**対策:** inline series データ（`contentBaseType` の `key` 属性）を含む MaiML サンプル（クロマトグラフィー系など）を入手し、実際の `key` 属性値を確認してルールを決定する

---

### 2.2 公開対象ファイルの URI 形式が未決

仕様書の Storage 抽象（オンプレ = OpenStack Swift、クラウド = AWS S3）に基づき、`maiml_publish_registry` の `file_uri` カラムに保存する URI の具体的な形式が未決。

| 未決事項 | 詳細 |
|---------|------|
| Swift の場合の URI 形式 | コンテナ名・オブジェクトパスをどのようなスキームで表現するか |
| S3 の場合の URI 形式 | バケット名・キーをどのようなスキームで表現するか（例: `s3://bucket/key`） |

**対策:** `maiml_publish_registry` の既存スキーマ（Issue 1.1）確認後、URI 形式を設計する

---

### 2.3 プレビュー生成のデフォルトモードが未決

仕様書には `uniform` / `maxhold` / `mmr` の3モードが定義されているが、デフォルトが指定されていない。

| 未決事項 | 詳細 |
|---------|------|
| デフォルトモード | `uniform` / `maxhold` / `mmr` のいずれをデフォルトにするか |
| 複数モード同時保存の要否 | 1 content_id につき複数モードで保存するか、1 モードのみか |

---

## 3. フロントエンド / 認証の課題

### 3.1 フロントエンド操作 UI が未設計

| 未決事項 | 詳細 |
|---------|------|
| 公開/非公開ボタンの配置画面 | プロジェクト詳細画面か、専用の公開管理画面か |
| 公開ステータスの表示方法 | バッジ・アイコン・リスト等の表示形式 |
| 公開設定の入力 UI | `template_only` / `store_raw_series` / `retention` 等の設定をどのフォームで入力するか |

---

## 4. 追加調査が必要なドキュメント

| 調査対象 | 目的 |
|---------|------|
| OpenData 側 DB の SQL（CREATE TABLE 全文） | `maiml_asset` / `maiml_publish_registry` の既存スキーマ全量を確認 |
| inline series データを含む MaiML サンプル（クロマトグラフィー系など） | `series_type`（TIC / SPECTRUM_TOTAL）判定に使用する `key` 属性の実値を確認 |
