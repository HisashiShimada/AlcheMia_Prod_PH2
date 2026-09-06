# タスク計画書: 既存グループの formats フォルダ バックフィルスクリプト作成

## メタデータ
- **作成日時**: 2026-09-04
- **タスクID**: 20260904_0001
- **優先度**: 中
- **推定工数**: 0.5時間

## タスク概要

`scripts/result/organization_group.txt` に記載されたテスト環境の既存グループレコードを対象に、
ファイルサーバ（S3/Swift）の `formats/{group_cd}/` フォルダが存在しない場合のみ作成するバックフィルスクリプトを作成する。

## 方針

- テキストファイル（TSV形式）を読み込んでグループ一覧を取得（DB接続不要）
- `storageService.listFiles()` で既存の `formats/` 配下フォルダを確認
- 存在しない場合のみ `formats/{group_cd}/`, `material/`, `condition/`, `result/` を作成（冪等）
- 失敗しても他グループの処理を継続する
- `backfill-organization-group-namespace.ts` と同じ構造・パターンに準拠

## 変更ファイル

1. `backend/scripts/backfill-organization-group-formats-folder.ts`（新規作成）

## テキストファイルの形式（TSV）

```
organization_id\torganization_group_cd\torganization_group_name\t...
{a0718dc5-...}\tDEP001\t材料合成部\t...
```

注意点:
- `organization_id` は `{UUID}` 形式なので `{}` を除去して使用
- `parent_group_cd` が `« NULL »` または空文字の場合は null 扱い

## 承認記録
- **承認日時**: 2026-09-04
- **承認者コメント**: 承認済み
