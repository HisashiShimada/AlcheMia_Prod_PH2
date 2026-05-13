# タスク計画書: file_metadata × Swift 汎用同期スクリプト

## メタデータ
- **作成日時**: 2026-04-03 14:30
- **タスクID**: file_metadata_Swift同期スクリプト
- **優先度**: 高
- **推定工数**: 1〜2時間

---

## 1. タスク概要

`file_metadata` ロジック共通化実装（`storageService.uploadFile()` 統合）完了後、
既存のDBレコードとSwiftの実ファイルの間に乖離が生じている。

本タスクでは、**Swift上のファイル一覧をソース of truth として**、DBを自動同期する汎用スクリプトを実装する。

### 背景

- `fix-file-metadata-sync.ts` はハードコードされたファイルリストを使用しており、再利用性がない
- `check-file-metadata-sync.ts` は確認のみで修正しない
- 今回の共通化実装により、フォーマット管理・MAIMLエディタ等から作成したファイルが今後は自動登録されるが、過去に作成されたファイルはDBに未登録のまま

---

## 2. 目的と期待される成果

- [ ] Swift上に存在してDBにないファイル → file_metadata に INSERT（ON CONFLICT DO NOTHING）
- [ ] DBにあってSwiftに存在しないファイル → DBから DELETE
- [ ] ファイルサイズ不一致のレコード → file_size を UPDATE
- [ ] 実行前に --dry-run オプションで変更内容を確認可能
- [ ] 全組織 or 特定組織を引数で指定可能

---

## 3. 実装ステップ

### Phase 1: スクリプト設計
- [ ] 引数パース（--dry-run, --org-id, --bucket）
- [ ] Swift から全ファイル一覧を取得（ページネーション対応 MaxKeys 制限突破）
- [ ] DB から file_metadata を取得
- [ ] 差分計算（DBのみ / Swiftのみ / size不一致）

### Phase 2: 同期処理実装
- [ ] SwiftのみのファイルをDBにINSERT（insertIfNotExists 使用）
- [ ] DBのみのファイルをDBからDELETE（realtime-validationなど特定キーワードは除外）
- [ ] size不一致レコードのUPDATE
- [ ] トランザクション管理（全操作を1トランザクション）

### Phase 3: レポート出力
- [ ] 処理前サマリー（件数）
- [ ] 処理後サマリー（INSERT/DELETE/UPDATE 件数）
- [ ] dry-run モードでは変更SQLを出力するのみ

---

## 4. 変更ファイル

### 新規作成
1. `backend/scripts/sync-file-metadata-from-swift.ts` — 汎用同期スクリプト

---

## 5. 技術的詳細

### file_key の形式
```
{organizationId}/{filePath}
例: a0718dc5-21f3-44e6-87e9-cc2ae83f3385/formats/DEP004/material/test.xml
```

### 除外対象（DELETEしない）
- `file_key` に `realtime-validation` を含むレコード（保存前処理用プレースホルダー）

### Swift ページネーション
- `ListObjectsV2Command` の `ContinuationToken` を使って全件取得
- フォルダマーカー（`Key.endsWith('/')`）はスキップ
- サイズ 0 のファイルもスキップ（フォルダマーカー代替）

### DB INSERT 時のデフォルト値
| フィールド | 値 |
|-----------|---|
| uploaded_by | `'system_sync'` |
| upload_source | `'swift_sync'` |
| upload_method | `'sync_script'` |
| file_type | 拡張子から推定（.maiml → application/xml, .xml → application/xml, その他 → application/octet-stream） |
| is_maiml_file | `.maiml` 拡張子判定 |
| parent_folder_path | `key.substring(0, key.lastIndexOf('/'))` |

---

## 6. 承認記録
- **計画書提示日時**: 2026-04-03 14:30
- **承認日時**: 
- **承認者コメント**: 
