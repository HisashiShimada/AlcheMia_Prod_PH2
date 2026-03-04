# タスク計画書: 実験データAPI statusフィールドバリデーション削除

## メタデータ
- **作成日時**: 2026-03-02 19:06
- **タスクID**: 実験データAPI_statusフィールド削除
- **優先度**: 中
- **推定工数**: 0.5時間

## タスク概要

`POST /api/v1/experiments/projects/:projectName/methods/:methodId/tasks/:taskNo/data` において、
リクエストボディの `records[].status` フィールドのバリデーションチェックを削除する。

### 発生していた問題

リクエストに `"status": 1`（整数）を含めると、バリデーションで `400 Bad Request` が返る。

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [
      {
        "field": "records[0].status",
        "message": "statusは initial, preparing, ready, running, paused, completed, error のいずれかである必要があります",
        "value": "1"
      }
    ]
  }
}
```

## 目的と期待される成果

### 目的
- `records[].status` フィールドはDBに保存されておらず実装上使用されていないため、バリデーションルールを削除して不整合を解消する

### 期待される成果
- [ ] `records[].status` フィールドをリクエストに含めても `400` エラーが発生しない
- [ ] テストが正常に通過する
- [ ] API仕様書の `status` フィールド記述が削除される

## 調査結果サマリー

| 確認箇所 | 状況 |
|---|---|
| `experimentRoutes.ts` | `records.*.status` のバリデーションルールが存在 ← **削除対象** |
| `experimentController.ts` | `rawRecords` の型定義に `status` なし（使っていない） |
| `TemplateDataRecord` 型 | `status` フィールドなし |
| `template_data.sql` (DDL) | `status` カラムなし |
| `experimentRoutes.validation.test.ts` | `status` バリデーションテストが存在 ← **削除対象** |
| `api_experiment_data.md` | `status` フィールドの仕様記述が存在 ← **削除対象** |

## 実装ステップ

### Step 1: ルートファイルのバリデーション削除
- [ ] `backend/src/routes/experimentRoutes.ts` から `body('records.*.status')` のバリデーションルールを削除

### Step 2: テストファイルの修正
- [ ] `backend/tests/routes/experimentRoutes.validation.test.ts` から `status` バリデーションのテストケースを削除
- [ ] 正常系テスト内の `status: 'ready'` フィールドを削除

### Step 3: API設計書の更新
- [ ] `docs/design/api/api_experiment_data.md` の `records` 配列要素の仕様テーブルから `status` 行を削除
- [ ] バリデーションセクションの `status` 記述を削除
- [ ] リクエストボディのサンプルJSONから `status` を削除

## 変更ファイル

1. `backend/src/routes/experimentRoutes.ts` - `status` バリデーションルール削除
2. `backend/tests/routes/experimentRoutes.validation.test.ts` - `status` バリデーションテスト削除
3. `docs/design/api/api_experiment_data.md` - `status` フィールド仕様削除

## 影響範囲

### 影響なし（変更不要）
- `backend/src/controllers/experimentController.ts` - 既に `status` を使っていない
- `backend/src/services/experimentDataService.ts` - 既に `status` を使っていない
- `backend/src/repositories/templateDataRepository.ts` - `status` フィールドなし
- DBスキーマ - `template_data` テーブルに `status` カラムなし

### フロントエンドへの影響
- `status` フィールドをリクエストに含めても今後は無視される（エラーにならない）
- フロントエンド側で `status` フィールドを削除することを推奨（必須ではない）

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| テストが意図せず通らなくなる | 低 | 低 | 削除後にテスト実行して確認 |

## テスト計画

### 削除するテスト
- `it('statusが不正な値の場合、400エラーを返す', ...)` - 不要になるため削除

### 確認するテスト
- 残りの全テストが引き続き通過することを確認

## 承認記録
- **計画書提示日時**: 2026-03-02 19:06
- **承認日時**: 2026-03-02 19:06

## 実施記録

### 実施日時
開始: 2026-03-02 19:06
完了: 2026-03-02 19:09

### 最終的な成果物
- [x] `records[].status` バリデーション削除完了
- [x] テスト修正完了
- [x] API設計書更新完了
