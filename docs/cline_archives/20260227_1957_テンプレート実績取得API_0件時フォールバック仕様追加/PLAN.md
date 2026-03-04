# タスク計画書: テンプレート実績取得API 0件時フォールバック仕様追加

## メタデータ
- **作成日時**: 2026-02-27 19:57
- **タスクID**: experiment-data-api-fallback
- **優先度**: 中
- **推定工数**: 0.5時間

## タスク概要

`docs/design/api/api_experiment_data.md` の `GET /api/v1/experiments/projects/:projectName/methods/:methodId/tasks/:taskNo/data`（テンプレート実績一覧取得API）仕様を修正する。

現在の仕様では、フィルタリング後にデータが0件の場合は空配列を返す仕様だが、
これを「MAIMLファイルのテンプレート定義から初期値（property_set相当のJSON）を生成して返す」仕様に変更する。

## 目的と期待される成果

### 目的
実験作業者が `DataRecordDialog` を初めて開いた際（実績データ未記録時）に、
空のフォームではなく MAIMLで定義されたプロパティ構造を持つ初期値付きフォームを表示できるようにする。

### 期待される成果
- [ ] 処理フローが0件時フォールバック処理を含む形に更新されている
- [ ] 0件時のレスポンス例が MAIMLのproperty_set形式のdataを含む形に更新されている
- [ ] レスポンスフィールド詳細で `recordedBy`/`recordedAt` が null 許容と明記されている
- [ ] 実装要件にMAIMLからのテンプレート情報取得ロジック（コード例）が追記されている
- [ ] 変更履歴に v3.2.0 が追加されている

## 実装ステップ

### Phase 1: 処理フロー更新
- [ ] Step 10〜12を追加（0件時のMAIMLテンプレート取得フロー）
  - Step 10: フィルタリング後のデータ件数を確認
  - Step 11: 1件以上 → そのままレスポンス返却
  - Step 12: 0件 → MAIMLからテンプレート定義を取得してレスポンス生成

### Phase 2: レスポンス仕様更新
- [ ] 0件時のレスポンス例を更新（空配列 → MAIMLのproperty_set形式のdataを設定）
- [ ] レスポンスフィールド詳細を更新（`recordedBy`/`recordedAt` に null許容を追記）

### Phase 3: 実装要件追記
- [ ] 0件時フォールバック処理のTypeScriptコード例を追記
  - `parser.getMethods()` を使用
  - `materialTemplates`/`conditionTemplates`/`resultTemplates` をループ
  - `placeRefs` で隣接プレースIDを絞り込み
  - `properties` を `{ key, xsiType, value: null, units }` 形式でマッピング
  - `data` に `{ templateId, templateType, properties }` をセット

### Phase 4: 変更履歴追加
- [ ] バージョン v3.2.0 を変更履歴テーブルに追加

## 変更ファイル

1. `docs/design/api/api_experiment_data.md` - 仕様変更

## 技術的詳細

### data フィールドの形式（0件時）

`taskRegistrationService.ts` の `deleteAndInsertTemplateData` が `template_data.property_set` に格納する形式と同一：

```json
{
  "templateId": "template-mat-001",
  "templateType": "material",
  "properties": [
    { "key": "temperature", "xsiType": "stringType", "value": null, "units": "°C" },
    { "key": "pressure",    "xsiType": "floatType",  "value": null, "units": "hPa" }
  ]
}
```

### 0件時のフォールバック処理ロジック

```typescript
if (filteredRecords.length === 0) {
  const methods = parser.getMethods();
  const method = methods.find(m => m.id === methodId);
  if (!method) throw new NotFoundError('Method not found in MAIML');

  const templateCategories = [
    { templates: method.materialTemplates, templateType: 'material' },
    { templates: method.conditionTemplates, templateType: 'condition' },
    { templates: method.resultTemplates,    templateType: 'result' },
  ];

  const fallbackTemplates = [];
  for (const { templates, templateType } of templateCategories) {
    if (!templates) continue;
    const templateArray = Array.isArray(templates) ? templates : [templates];
    for (const template of templateArray) {
      if (!template.placeRefs) continue;
      for (const placeRef of template.placeRefs) {
        const placeId = placeRef.ref || '';
        if (!adjacentPlaceIds.includes(placeId)) continue;

        const properties = (template.properties || []).map(p => ({
          key: p.key || '',
          xsiType: p.xsiType || 'stringType',
          value: null,
          units: p.units || null,
        }));

        fallbackTemplates.push({
          placeId,
          templateType,
          templateId: template.id || '',
          data: {
            templateId: template.id || '',
            templateType,
            properties,
          },
          recordedBy: null,
          recordedAt: null,
        });
      }
    }
  }
  return fallbackTemplates;
}
```

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 既存の0件レスポンスに依存しているフロントエンド実装がある | 中 | 低 | 今回はAPIドキュメント修正のみ。実装時に確認 |

## テスト計画
- [ ] 変更後の仕様が `taskRegistrationService.ts` の実装パターンと整合しているか確認

## 承認記録
- **計画書提示日時**: 2026-02-27 19:57
- **承認日時**: 2026-02-27 19:57
- **承認者コメント**: この方針で進めてください。

## 実施記録

### 実施日時
開始: 2026-02-27 19:57
完了: （作業完了後に記入）

### 計画からの変更点
（なし）

### 最終的な成果物
- [ ] `docs/design/api/api_experiment_data.md` 更新完了
