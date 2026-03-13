# MaiML OpenData Pipeline ドキュメント一覧

> 最終更新: 2026-03-12

---

## 📂 現行ドキュメント（参照すること）

| ファイル | 内容 |
|---------|------|
| **[spec.md](./spec.md)** | ✅ **確定仕様書**（アーキテクチャ・処理フロー・API・権限・`maiml_publish_job` DDL） |
| **[db.md](./db.md)** | 🗄️ **DB 設計書**（テーブル構成・DDL・カラムマッピング・eventLog テーブル設計）✅ **確定** |
| **[pending.md](./pending.md)** | ⚠️ **未確定事項一覧**（#6・#8 後回し、#9 解決不可保留中、#7 確定済み） |
| [MaiML_OpenData_Pipeline_BasicDesign_v1.3.md](./MaiML_OpenData_Pipeline_BasicDesign_v1.3.md) | 📄 元仕様書（参考資料） |

---

## 🗂️ アーカイブ（bk/ フォルダ）

以下のファイルは 2026-03-11 に `bk/` フォルダへ移動しました。  
**新仕様書（spec.md）に置き換えられているため、通常は参照不要です。**

| ファイル | 内容 |
|---------|------|
| [bk/spec.md](./bk/spec.md) | 旧仕様書 |
| [bk/implementation.md](./bk/implementation.md) | 旧実装ガイド |
| [bk/issues.md](./bk/issues.md) | 旧課題一覧 |
| [bk/diff.md](./bk/diff.md) | 旧差分分析 |
| [bk/recommendations.md](./bk/recommendations.md) | 旧推奨事項 |
| [bk/implementation_status.md](./bk/implementation_status.md) | 旧実装ステータス |

---

## ⚠️ 仕様ほぼ確定（2026-03-12）

**主要な仕様は確定しており、実装を開始できます。**  
残存する未確定事項（#6・#8・#9）は実装の主要フローに影響しないため、後回しで問題ありません。

### 実装時の注意

| 項目 | 状態 | 参照先 |
|------|------|--------|
| DB テーブル構成 | ✅ 確定 | `db.md` |
| `maiml_publish_job` DDL | ✅ 確定（`public` スキーマ） | `spec.md` セクション10 |
| スキーマ命名規則 | ✅ 確定（UUID ハイフン→`_` 変換、プレフィックスなし） | `db.md` セクション1 / `pending.md` |
| 組織作成時のスキーマ自動作成 | ✅ 確定（COMMENT に `organization_cd` を設定） | `db.md` セクション1 |
| 公開設定 UI | ✅ 確定（実装しない） | `pending.md` |
| 生データ保存（store_raw_series） | ✅ 確定（実装しない） | `pending.md` |

### 廃止事項

- `maiml_publish_registry` テーブルは**廃止** → 旧マイグレーション（`20260310_create_maiml_opendata_tables.sql`）内の同テーブルは無効
- `maiml_series_preview` / `maiml_series_raw_*` テーブルは**廃止** → 旧マイグレーション内の同テーブルは無効
- API エンドポイント（`projectRoutes.ts` / `projectController.ts`）は既存実装を継続利用する
