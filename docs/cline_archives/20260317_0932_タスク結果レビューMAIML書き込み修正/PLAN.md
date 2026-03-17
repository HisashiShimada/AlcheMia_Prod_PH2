# タスク計画書: タスク結果レビュー時のMAIML書き込み処理修正

## メタデータ
- **作成日時**: 2026-03-17 09:34
- **タスクID**: 20260317_0932_タスク結果レビューMAIML書き込み修正
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

タスク結果レビュー時（`completeReviewTasks` 経由の `MaimlWriterService.writeDataAndEventLog()`）において、
MAIMLファイルへ data 層・eventLog 層を書き込む際に、既存ファイルをそのまま上書きしている問題を修正する。

また、バージョン管理（`maimlService.createBackup()`）で使用しているアーカイブファイルの命名形式と、
ファイル一覧取得（`projectService.getProjectFiles()`）でバージョン番号を抽出する際のパターンが不一致のため、
命名規則を統一する。

## 問題の詳細

### 問題1: writeDataAndEventLog でアーカイブ化をスキップしている

`MaimlWriterService.writeDataAndEventLog()` の処理フロー:
```
1. MAIMLファイルの存在確認
2. MAIMLファイルをダウンロード
3. template_data を取得
4. maiml_event_log を取得
5-6. XML を生成
7. <data>/<eventLog> タグを置き換え
8. 上書き保存 ← ここでアーカイブ化なしに直接上書き
```

`maimlService.saveMaiML()` では `archive=true` の場合に `createBackup()` を呼び出しているが、
`writeDataAndEventLog()` はこのアーカイブ処理を呼び出していない。

### 問題2: アーカイブファイルの命名形式が不一致

- **`maimlService.createBackup()`** の命名形式: `{baseName}_001.maiml`, `{baseName}_002.maiml`（3桁ゼロパディング）
- **`projectService.getProjectFiles()`** のバージョン抽出パターン: `/_v(\d+)\.maiml$/`（`_v1`, `_v2` 形式を期待）
- **`.clinerules/references/s3_structure.md`** の規約: `{project_name}_v{version}.maiml`（`_v1`, `_v2` 形式）

→ 命名形式を `_v{n}` に統一する（規約準拠・`getProjectFiles` と整合）

## 目的と期待される成果

- [ ] `writeDataAndEventLog()` がMAIMLファイル上書き前にアーカイブを作成する
- [ ] アーカイブファイルの命名形式が `_v{n}.maiml` に統一される
- [ ] `getProjectFiles()` のバージョン番号抽出が正しく機能する

## 実装ステップ

### Phase 1: maimlService.createBackup() の命名形式を `_v{n}` に変更

- [ ] `createBackup()` 内のバックアップファイル検索パターンを `_001`→`_v{n}` 形式に変更
- [ ] `backupFileName` の生成を `{baseName}_v${n}.maiml` 形式に変更

### Phase 2: MaimlWriterService.writeDataAndEventLog() にアーカイブ処理を追加

- [ ] 上書き保存（ステップ8）の前に `createBackup()` 相当のアーカイブ処理を追加
  - アーカイブ失敗はログのみ（既存の `saveMaiML` と同じグレースフル処理）

## 変更ファイル

1. `backend/src/services/maimlService.ts` - `createBackup()` の命名形式を `_v{n}` に変更
2. `backend/src/services/maimlWriterService.ts` - アーカイブ処理を追加

## リスク

| リスク | 対策 |
|--------|------|
| 既存アーカイブファイル（`_001` 形式）との混在 | 新規書き込みから `_v{n}` 形式に移行。既存ファイルは影響なし |
| アーカイブ失敗時の処理継続 | `try/catch` でグレースフル処理（既存の `saveMaiML` と同様） |

## 承認記録
- **計画書提示日時**: 2026-03-17 09:34
- **承認日時**: 
