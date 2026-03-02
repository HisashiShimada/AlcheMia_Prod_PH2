# タスク計画書: POST実験データ保存APIにtemplate_dataのproperty_setへのtemplateId・templateType保存対応

## メタデータ
- **作成日時**: 2026-03-02 13:56
- **タスクID**: POST実験データ保存_templateId_templateType追加
- **優先度**: 高
- **推定工数**: 1時間

---

## 1. タスク概要

実験データ一括保存API（POST `/api/v1/experiments/projects/:projectName/methods/:methodId/tasks/:taskNo/data`）を修正し、
GETレスポンスの `templates[].data`（`{ templateId, templateType, properties }`）と同一形式を POSTリクエストの `records[].data` として受け取り、
そのまま `template_data.property_set` へ保存できるようにする。

---

## 2. 現状分析

### GET APIのレスポンス形式

`GET /api/v1/experiments/projects/:projectName/methods/:methodId/tasks/:taskNo/data` のレスポンス `templates[].data` は以下の形式：

```json
{
  "placeId": "p1",
  "templateType": "material",
  "templateId": "template-mat-001",
  "data": {
    "templateId": "template-mat-001",
    "templateType": "material",
    "properties": [
      { "key": "temperature", "xsiType": "floatType", "value": null, "units": "°C" }
    ]
  }
}
```

- `data` の中に `templateId`・`templateType`・`properties` が含まれる
- `data` は `template_data.property_set` カラム（`PropertySet` 型）と同一構造

### POST APIの現在のリクエスト形式

```json
{
  "records": [
    {
      "placeId": "p1",
      "templateType": "material",
      "templateId": "mat_001",
      "data": {
        "temperature": { "value": 25.5, "unit": "°C" }
      }
    }
  ]
}
```

- `templateType`・`templateId` がトップレベルに存在
- `data` は任意のオブジェクト（`properties` 配列形式ではない）

### 現在のコントローラー変換ロジック（問題箇所）

`backend/src/controllers/experimentController.ts` の `saveBatchData` 内：

```typescript
const records: TemplateDataRecord[] = rawRecords.map(r => {
  const propertySet: PropertySet = {
    templateId: r.templateId,           // トップレベルから取得
    templateType: r.templateType,       // トップレベルから取得
    properties: Array.isArray(r.data?.properties)
      ? (r.data.properties as ...)
      : [],
  };
  return { placeId: r.placeId, propertySet, updateUserId: recordedBy };
});
```

**問題点**:
- GETで返した `data`（`{ templateId, templateType, properties }`）をそのまま再利用できない
- フロントエンドはGETで受け取った `data` を修正して保存するため、二重変換が必要になっている

---

## 3. 変更方針

### POST APIのリクエスト形式を変更

`data` フィールドを GETレスポンスと同一形式（`PropertySet`型: `{ templateId, templateType, properties }`）とし、
これをそのまま `property_set` に保存する。
トップレベルの `templateType`・`templateId` フィールドは廃止する。

### 新しいPOSTリクエスト形式

```json
{
  "records": [
    {
      "placeId": "p1",
      "data": {
        "templateId": "template-mat-001",
        "templateType": "material",
        "properties": [
          { "key": "temperature", "xsiType": "floatType", "value": 25.5, "units": "°C" }
        ]
      }
    }
  ]
}
```

### データフロー

```
GET /api/v1/.../data
  → templates[].data = { templateId, templateType, properties: [{key, xsiType, value, units}] }

フロントエンドでユーザーが properties の value を編集

POST /api/v1/.../data  ← 今回修正
  → records[].data = { templateId, templateType, properties: [{key, xsiType, value, units}] }

コントローラー: data をそのまま PropertySet としてマッピング（変換不要）

リポジトリ/SQL: property_set カラムにJSONBとして保存
```

---

## 4. 目的と期待される成果

### 目的
- GETで取得した `data` をフロントエンドがそのまま（修正分だけ書き換えて）POSTできるようにする
- `templateId`・`templateType` を `property_set` に確実に含めて保存する
- GET↔POST間のデータ形式を統一し、フロントエンドの実装を簡素化する

### 期待される成果
- [ ] POST APIが `data.templateId`・`data.templateType` を受け取ってDBに保存できる
- [ ] GETレスポンスの `data` をそのまま（値修正のみして）POSTできる
- [ ] `template_data.property_set` に `{ templateId, templateType, properties }` が保存される
- [ ] バリデーションが新形式に対応している
- [ ] API設計書が新仕様に更新されている

---

## 5. 実装ステップ

### Phase 1: ルートのバリデーション修正
- [ ] `backend/src/routes/experimentRoutes.ts`
  - `body('records.*.templateType')` バリデーションルールを削除
  - `body('records.*.templateId')` バリデーションルールを削除
  - `body('records.*.data.templateId')` バリデーションルールを追加（必須、文字列）
  - `body('records.*.data.templateType')` バリデーションルールを追加（必須、material/condition/resultのいずれか）
  - `body('records.*.data.properties')` バリデーションルールを追加（配列であること）

### Phase 2: コントローラーの変換ロジック修正
- [ ] `backend/src/controllers/experimentController.ts`
  - `rawRecords` の型定義を変更（`templateType`・`templateId` トップレベルを削除、`data` を `PropertySet` 型に変更）
  - `PropertySet` 生成ロジックを変更（`r.data` をそのまま `PropertySet` としてキャスト）

### Phase 3: API設計書更新
- [ ] `docs/design/api/api_experiment_data.md`
  - POST APIのリクエストボディ例を更新
  - `records`配列のパラメータ詳細テーブルを更新（`templateType`・`templateId` 削除、`data`の形式を明記）
  - バリデーションセクションを更新

---

## 6. 影響範囲

### 変更するファイル
1. `backend/src/routes/experimentRoutes.ts` - バリデーションルールの修正
2. `backend/src/controllers/experimentController.ts` - 型定義・変換ロジックの修正
3. `docs/design/api/api_experiment_data.md` - API仕様書の更新

### 変更しないファイル
- `backend/src/services/experimentDataService.ts` - 変更不要（`TemplateDataRecord`をそのまま受け取る）
- `backend/src/repositories/templateDataRepository.ts` - 変更不要（`PropertySet`型はそのまま使用）
- `backend/src/sql/queries/template_data/upsert.sql` - 変更不要

### 影響を受ける機能
- **POST 実験データ一括保存API**: リクエスト形式が変わる（破壊的変更）
- **フロントエンド**: 新しいリクエスト形式に合わせた修正が必要（フロントエンドは別タスク）

---

## 7. 技術的詳細

### 変更前後の型比較

#### 変更前（rawRecords の型）
```typescript
type RawRecord = {
  placeId: string;
  templateType: 'material' | 'condition' | 'result';  // 削除
  templateId: string;                                   // 削除
  data: Record<string, unknown>;                        // 変更
};
```

#### 変更後（rawRecords の型）
```typescript
type RawRecord = {
  placeId: string;
  data: {                                               // PropertySet形式
    templateId: string;
    templateType: 'material' | 'condition' | 'result';
    properties: Array<{
      key: string;
      xsiType: string;
      value: unknown;
      units: string | null;
    }>;
  };
};
```

#### 変更前（PropertySet生成ロジック）
```typescript
const propertySet: PropertySet = {
  templateId: r.templateId,
  templateType: r.templateType,
  properties: Array.isArray(r.data?.properties)
    ? (r.data.properties as ...)
    : [],
};
```

#### 変更後（PropertySet生成ロジック）
```typescript
const propertySet: PropertySet = {
  templateId: r.data.templateId,
  templateType: r.data.templateType,
  properties: Array.isArray(r.data.properties)
    ? (r.data.properties as ...)
    : [],
};
```

---

## 8. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| フロントエンドとの破壊的変更 | 高 | 高 | フロントエンドへの変更通知・対応依頼 |
| propertiesが空配列の場合の挙動 | 低 | 低 | `Array.isArray` チェックで空配列として扱う |

---

## 9. テスト計画

### 手動テスト
- [ ] 新形式のリクエストで201レスポンスが返ること
- [ ] `template_data.property_set` に `{ templateId, templateType, properties }` が保存されること
- [ ] `templateType`・`templateId` をトップレベルに含むリクエストは400エラーになること（バリデーション）
- [ ] `data.templateType` が不正値の場合は400エラーになること

---

## 10. 承認記録

- **計画書提示日時**: 2026-03-02 13:56
- **承認日時**: 2026-03-02 13:56
- **承認者コメント**: 承認済み（Act mode移行指示）

---

## 11. 実施記録

### 実施日時
開始: 2026-03-02 13:56  
完了: （作業中）

### 計画からの変更点
（なし）

### 最終的な成果物
- [x] `backend/src/routes/experimentRoutes.ts` 修正済み
- [x] `backend/src/controllers/experimentController.ts` 修正済み
- [x] `docs/design/api/api_experiment_data.md` 更新済み
