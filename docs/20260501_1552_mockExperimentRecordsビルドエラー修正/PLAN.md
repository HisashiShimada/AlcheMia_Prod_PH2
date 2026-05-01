# タスク計画書: mockExperimentRecords ビルドエラー修正

## メタデータ
- **作成日時**: 2026-05-01 16:14
- **タスクID**: mockExperimentRecordsビルドエラー修正
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

フロントエンドのビルド時に以下のエラーが発生している。

```
Type error: Cannot find module 'data/mock/mockExperimentRecords.json'
  > 152 |     const mockData = await import('data/mock/mockExperimentRecords.json');
```

`fetchExperimentRecords` 関数が存在しないモックJSONファイルをimportしようとしていたが、
すでに空データを返すよう修正されている。
この関数は **バックエンドAPIが未実装のため、常に空データを返すだけ** であり、
呼び出し元の `PetriNetVisualization.tsx` への影響もない。

そのため、モック関連の不要な関数をまとめて削除してビルドエラーを解消する。

## 目的と期待される成果
- [x] ビルドエラー（`Cannot find module 'data/mock/mockExperimentRecords.json'`）を解消
- [ ] 不要なモック関数（`fetchExperimentRecords`・`simulateApiDelay`・`shouldUseMockAPI`）を削除
- [ ] `PetriNetVisualization.tsx` から `fetchExperimentRecords` の呼び出しを削除

## 実装ステップ

### Phase 1: タスク計画書作成
- [x] PLAN.md 作成

### Phase 2: apiClient.ts からモック関連コードを削除
- [ ] `simulateApiDelay` 関数を削除
- [ ] `shouldUseMockAPI` 関数を削除
- [ ] `fetchExperimentRecords` 関数を削除

### Phase 3: PetriNetVisualization.tsx から呼び出しを削除
- [ ] importから `fetchExperimentRecords as fetchExperimentRecordsAPI` を削除
- [ ] `ExperimentRecordsData` 型インポートを削除（未使用になる場合）
- [ ] `experimentRecordsData` state と `setExperimentRecordsData` を削除
- [ ] `fetchedExperimentRecords` 変数と `fetchExperimentRecordsAPI` 呼び出しブロックを削除

## 変更ファイル
1. `frontend/src/utils/apiClient.ts` - モック関連3関数を削除
2. `frontend/src/components/progress/PetriNetVisualization.tsx` - 呼び出し箇所を削除

## 影響範囲
- ペトリネット図のツールチップ「実験記録進捗」は `0/?` 表示のまま（変化なし）
- バックエンドAPIが未実装のため、機能的な影響はなし

## 承認記録
- **承認日時**: 2026-05-01 16:14
- **承認者コメント**: 削除してください
