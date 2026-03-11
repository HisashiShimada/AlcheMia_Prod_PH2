# MaiML OpenData Pipeline ドキュメント一覧

> 最終更新: 2026-03-11

---

## 📂 現行ドキュメント（参照すること）

| ファイル | 内容 |
|---------|------|
| **[spec.md](./spec.md)** | ✅ **確定仕様書**（アーキテクチャ・処理フロー・API・権限） |
| **[db.md](./db.md)** | 🗄️ **DB 設計書**（テーブル構成・DDL・カラムマッピング）※暫定 |
| **[pending.md](./pending.md)** | ⚠️ **未確定事項一覧**（スキーマ命名規則・UI・inline series） |
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

## ⚠️ 実装時の注意

**テーブル関連の実装は `pending.md` の更新（確定）後に着手すること。**

- API エンドポイント（`projectRoutes.ts` / `projectController.ts`）は既存実装を継続利用する
- KV 抽出・Repository・マイグレーション等はテーブル構成確定後に再実装する
