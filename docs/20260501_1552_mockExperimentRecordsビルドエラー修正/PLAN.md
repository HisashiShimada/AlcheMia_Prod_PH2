# タスク計画書: mockExperimentRecords ビルドエラー修正

## メタデータ
- **作成日時**: 2026-05-01 15:52
- **タスクID**: mockExperimentRecords-build-error
- **優先度**: 高
- **推定工数**: 0.1時間

## タスク概要

フロントエンドのビルド時に以下のエラーが発生している。

```
Type error: Cannot find module '@/data/mock/mockExperimentRecords.json'
or its corresponding type declarations.
```

`frontend/src/utils/apiClient.ts` の `fetchExperimentRecords` 関数が、存在しないモックJSONファイルを動的インポートしようとしているため、Next.jsのビルド時（静的解析フェーズ）にエラーが発生している。

## 原因分析

- **エラー箇所**: `frontend/src/utils/apiClient.ts` の152行目
- **問題コード**: `const mockData = await import('@/data/mock/mockExperimentRecords.json');`
- **原因**: `frontend/src/data/mock/mockExperimentRecords.json` が存在しない
- **補足**: `try/catch` で囲まれているため実行時は `catch` ブロックの空データが返されるが、Next.jsのビルドは動的インポートのパスを静的解析するためビルドエラーになる

## 修正方針

`fetchExperimentRecords` はバックエンドAPIが未実装なためモックを返す関数（コメントに明記）。
`catch` ブロックが返す空データを直接返すよう変更し、存在しないJSONファイルへの参照を除去する。

## 変更ファイル

1. `frontend/src/utils/apiClient.ts` - `fetchExperimentRecords` 関数の `try/catch` を削除し、空データを直接返す

## 承認記録
- **計画書提示日時**: 2026-05-01 15:52
- **承認日時**: 2026-05-01 15:52

## 実施記録

### 最終的な成果物
- [x] `frontend/src/utils/apiClient.ts` 修正完了
