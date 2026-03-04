# タスク計画書: テンプレート実績取得API バックエンド実装修正

## メタデータ
- **作成日時**: 2026-02-27 20:28
- **タスクID**: experiment-data-api-fallback-impl
- **優先度**: 中
- **推定工数**: 1時間

## 1. タスク概要

`docs/design/api/api_experiment_data.md`（v3.2.0）の仕様に従い、  
`GET テンプレート実績一覧取得API` のバックエンド実装を修正する。

現在の実装はv3.1.0以前の仕様に基づいており、以下の問題がある：
1. 0件フォールバック処理が未実装（空配列をそのまま返す）
2. `TemplateDataItem` 型の `recordedBy`/`recordedAt` がnull非許容
3. MAIMLパーサーに `parsePetriNetStructure`（maimlService）を使用しており、
   `MaimlParserTyped` に統一されていない

## 2. 設計書との差分分析

### 差分1: 0件フォールバック処理が未実装（最重要）

| | 現在の実装 | 設計書 v3.2.0 |
|---|---|---|
| フィルタリング後0件 | 空配列 `[]` を返す | MAIMLテンプレート定義から初期値を生成して返す |
| `recordedBy` | `string` (DB値のみ) | `string \| null` (未記録時はnull) |
| `recordedAt` | `string` (DB値のみ) | `string \| null` (未記録時はnull) |

### 差分2: MAIMLパーサーの不統一

| | 現在の実装 | 設計書・taskRegistrationService.ts |
|---|---|---|
| パーサー | `parsePetriNetStructure()` (maimlService) | `MaimlParserTyped` |
| メソッド取得 | `parseResult.methods[].methodId` | `parser.getMethods()[].id` |
| トランジション参照 | `targetMethod.transitions[].transitionId` | `method.pnml.transitions[].id` |
| Arc参照 | `targetMethod.arcs[].source/target` | `method.pnml.arcs[].source/target` |

### 差分3: findIdByName.sql の返り値

現在のコードは `projectResult.rows[0].project_id` を参照しているが、  
SQL の SELECT 句に応じて `id` または `project_id` のどちらかに統一する必要がある。

## 3. 目的と期待される成果

### 目的
実験作業者が `DataRecordDialog` を初めて開いた際（実績データ未記録時）に、
空のフォームではなく MAIML で定義されたプロパティ構造を持つ初期値付きフォームを表示できるようにする。

### 期待される成果
- [ ] 0件時に `buildFallbackTemplates()` でMAIMLテンプレート定義から初期値を生成して返す
- [ ] `TemplateDataItem.recordedBy` / `recordedAt` が null 許容になっている
- [ ] `MaimlParserTyped` を使用してペトリネット構造を解析している
- [ ] TypeScript コンパイルエラーなし

## 4. 実装ステップ

### Phase 1: TemplateDataItem 型の修正
- [ ] `recordedBy: string | null` に変更
- [ ] `recordedAt: string | null` に変更

### Phase 2: getTemplateData() のパーサー切り替え
- [ ] インポートから `parsePetriNetStructure` を削除、`MaimlParserTyped` を追加
- [ ] `parsePetriNetStructure()` の呼び出しを `new MaimlParserTyped()` に置き換え
- [ ] メソッド・トランジション・Arc の参照先を `MaimlParserTyped` のAPI に合わせて修正

### Phase 3: 0件フォールバック処理の追加
- [ ] `buildFallbackTemplates()` 関数を追加（設計書の実装要件に記載のコードを実装）
- [ ] `getTemplateData()` 内で `filteredRecords.length > 0` の分岐を追加
  - 1件以上 → DB実績データをマッピング（既存ロジック）
  - 0件 → `buildFallbackTemplates()` を呼び出し

### Phase 4: recordedAt の null 対応修正
- [ ] DB実績データマッピング時の `recordedAt` 型処理を修正（null を許容）

## 5. 変更ファイル

1. `backend/src/services/experimentDataService.ts` - メイン修正（唯一の修正対象）

## 6. 技術的詳細

### 修正後の getTemplateData() 処理フロー

```
1. project_id 解決 (SQL: projects/findIdByName.sql)
2. template_data 全件取得 (repository.findByTaskNo)
3. S3/Swift から MaiML ダウンロード
4. new MaimlParserTyped(maimlContent) でパース
5. parser.getMethods() でメソッド取得
6. methodId に一致するメソッドを特定
7. method.pnml.transitions でトランジション存在確認
8. method.pnml.arcs で隣接プレースID特定
9. template_data をフィルタリング
10. 件数確認
    ├─ 1件以上 → DB実績データをマッピングして返却
    └─ 0件 → buildFallbackTemplates() でMAIML定義から生成して返却
```

### buildFallbackTemplates() 実装方針

`taskRegistrationService.ts` の `deleteAndInsertTemplateData()` と同一ロジックを使用：
- `parser.getMethods()` → 対象メソッドを特定
- `materialTemplates` / `conditionTemplates` / `resultTemplates` をループ
- 各テンプレートの `placeRefs` から隣接プレースIDに一致するものを抽出
- `properties` を `{ key, xsiType, value: null, units }` 形式でマッピング
- `data` に `{ templateId, templateType, properties }` をセット
- `recordedBy: null` / `recordedAt: null`

## 7. リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `parsePetriNetStructure` を他の箇所から参照している場合、削除でエラー | 低 | 低 | 削除前に grep 検索で確認 |
| `findIdByName.sql` の返り値カラム名が `id` か `project_id` か不明 | 中 | 低 | SQL ファイルを確認して合わせる |

## 8. テスト計画
- [ ] TypeScript コンパイルエラーなし（`npx tsc --noEmit`）
- [ ] 既存テストが壊れていないこと

## 9. 承認記録
- **計画書提示日時**: 2026-02-27 20:28
- **承認日時**: 2026-02-27 20:28

## 10. 実施記録
開始: 2026-02-27 20:28
完了: 2026-02-27 20:33

### 最終的な成果物
- [x] `backend/src/services/experimentDataService.ts` 修正完了

### 実施内容
1. `TemplateDataItem.recordedBy` / `recordedAt` を `string | null` に変更
2. インポートを `parsePetriNetStructure` (maimlService) → `MaimlParserTyped` に変更
3. `getTemplateData()` 内のペトリネット解析を `MaimlParserTyped` APIに切り替え
   - `parser.getMethods()` でメソッド取得
   - `method.pnml.transitions` でトランジション確認
   - `method.pnml.arcs` で隣接プレースID特定
4. 0件フォールバック処理を追加（`buildFallbackTemplates()` 関数）
5. TypeScript コンパイル確認: Exit code 0（エラーなし）
