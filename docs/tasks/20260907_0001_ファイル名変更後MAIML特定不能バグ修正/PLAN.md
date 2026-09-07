# タスク計画書: ファイル名変更後 MAIML 特定不能バグ修正

## メタデータ
- **作成日時**: 2026-09-07
- **タスクID**: 20260907_0001
- **優先度**: 高
- **推定工数**: 0.25時間

## タスク概要

ファイル名変更後、MAIMLファイルが特定できなくなる問題を修正する。

## 問題の根本原因

`renameService.renameFile()` 内で `file_metadata` テーブルを更新する際、  
`updateFileMetadata()` に渡す `fileKey`（WHERE句の検索キー）と  
更新値の `file_key` が **相対パス**（organizationId なし）になっている。

しかし `file_metadata.file_key` に保存されている値は  
**フルキー**（`{organizationId}/projects/...`）形式のため、  
`WHERE file_key = $1` で一致するレコードが存在せず UPDATE が 0件 になる。

`catch` で警告のみ出して処理続行するため、S3 は成功するが  
`file_metadata.file_key` は旧ファイル名のまま残り、  
`findMaimlByProjectUuid` が古い（S3 上に存在しない）パスを返すため  
MAIMLが特定できなくなる。

## 他の呼び出し箇所との比較

| 箇所 | キー形式 |
|------|---------|
| `fileAccessService.ts` L830 | `${organizationId}/${maimlFile.filePath}` → フルキー ✅ |
| `fileAccessService.ts` L711 | `${organizationId}/${filePath}` → フルキー ✅ |
| `maimlService.ts` L268 | `normalizedFileKey`（org プレフィックス付与済み）→ フルキー ✅ |
| `storageService.ts` L260 | storageService 内部で生成したフルキー ✅ |
| **`renameService.ts` L333** | `fileKey`（相対パス）→ **❌ バグ** |

## 実装ステップ

- [x] `renameService.ts` の `renameFile` 関数を修正
  - `updateFileMetadata` 呼び出しのキーをフルキー形式に変換
  - 更新値 `file_key` もフルキー形式に変換

## 変更ファイル

1. `backend/src/services/renameService.ts` - `updateFileMetadata` 呼び出しのキー形式修正

## リスク

| リスク | 対策 |
|--------|------|
| なし | `organizationId` は既に引数にある。他のサービスと同じパターンへの統一のみ |

## 承認記録
- **承認日時**: 2026-09-07
- **承認者コメント**: 承認済み・Act モードに切り替え
