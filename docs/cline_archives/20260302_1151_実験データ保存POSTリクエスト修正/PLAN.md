# タスク計画書: 実験データ一括保存POSTリクエスト修正

## メタデータ
- **作成日時**: 2026-03-02 11:51
- **タスクID**: experiment-data-post-fix
- **優先度**: 高
- **推定工数**: 1時間

## 1. タスク概要

`POST /api/v1/experiments/projects/:projectName/methods/:methodId/tasks/:taskNo/data`（実験データ一括保存）のリクエストデータを修正する。

GETで取得したデータ（`TemplateDataItem`）のプロパティ値・構造をそのまま保持し、画面で修正されたデータのみを書き換えた上でバックエンドに送信するよう改修する。

## 2. 問題の詳細

### 問題1: `placeId` に誤った値を使用

**現在のコード（DataRecordDialog.tsx `handleSaveTemplate`）:**
```typescript
const record: ExperimentDataRecord = {
  placeId: template.templateId,  // ❌ templateId を placeId として使っている
  ...
};
```

**問題点:**
- DBの一意キーは `(organization_id, project_id, method_id, task_no, place_id)` だが、`placeId` に `templateId` が入っているためUPSERTが正しく動作しない
- GETレスポンス（`TemplateDataItem`）には `placeId` が含まれているのに使われていない

---

### 問題2: GETで取得した `data` 構造を破壊してゼロから組み立てている

**現在のコード（DataRecordDialog.tsx `handleSaveTemplate`）:**
```typescript
// ❌ ゼロからExperimentDataValue形式で組み立て（GETの構造を無視）
const templateData: ExperimentDataValue = {
  templateId: template.templateId,
  category: template.category,
};
template.properties.forEach((prop) => {
  const key = `${template.templateId}_${prop.key}`;
  templateData[prop.key] = values[key] ?? null;
});

const record: ExperimentDataRecord = {
  data: templateData as Record<string, unknown>,  // ❌ GETの構造が失われている
};
```

**問題点:**
- GETレスポンスには2種類の `data` 形式が存在する
  - **フォールバック形式（初回記録時）**: `{ templateId, templateType, properties: [{ key, xsiType, value, units }] }`
  - **DB実績形式（再編集時）**: フラットなkey-value形式
- 現在はどちらの形式も無視して `ExperimentDataValue` 形式で組み立て直しているため、バックエンドが期待する `data` 構造と異なる値が送られる
- 仕様では「GETで取得した構造をそのまま保持し、変更された値だけ書き換えてPOSTする」ことが求められている

---

## 3. 目的と期待される成果

### 目的
- GETで取得した `TemplateDataItem.data` の構造を保持したまま、画面で変更された値のみ上書きしてPOSTする
- `placeId` を正しく `TemplateDataItem.placeId` から取得する

### 期待される成果
- [ ] `placeId` がGETレスポンスの `TemplateDataItem.placeId` から正しく設定される
- [ ] `data` フィールドがGETレスポンスの構造を保持した上で、フォーム変更値のみ上書きされる
- [ ] フォールバック形式（初回記録時）・DB実績形式（再編集時）の両方に対応
- [ ] 既存の動作（フォーム表示、初期値復元）は変更しない

---

## 4. 実装ステップ

### Phase 1: State追加（GETレスポンスの生データ保持）
- [ ] `fetchedTemplateItems: TemplateDataItem[]` state を追加
- [ ] ダイアログオープン時（`open && transition` 条件）のリセット処理に `setFetchedTemplateItems([])` を追加

### Phase 2: GETレスポンス受信時に生データを保存
- [ ] `getTemplateData` 成功時に `setFetchedTemplateItems(response.data.templates)` を追加

### Phase 3: `handleSaveTemplate` の修正

#### 3-1: placeId の修正
- [ ] `originalItem` を `fetchedTemplateItems.find(item => item.templateId === template.templateId)` で検索
- [ ] `record.placeId` を `originalItem?.placeId ?? template.templateId` に変更

#### 3-2: data 組み立てロジックの修正
- [ ] `originalItem.data` をディープコピーしてベースとする
- [ ] `baseData.properties` が存在する場合（フォールバック形式）
  - `properties[i].value` をフォーム値で上書き
  - `dateType` / `dateTimeType` は文字列フォーマット処理を適用
- [ ] `baseData.properties` が存在しない場合（DB実績形式）
  - `baseData[prop.key]` をフォーム値で上書き
  - `dateType` / `dateTimeType` は文字列フォーマット処理を適用
- [ ] `record.data` を組み立てた `baseData` に変更

---

## 5. 影響範囲

### 変更するファイル
1. `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` - メインの修正箇所

### 変更しないファイル
- `frontend/src/types/api.ts` - 型定義の変更不要
- `frontend/src/services/experimentDataApiService.ts` - APIクライアントの変更不要

### 影響を受ける機能
- **実験データ記録ダイアログ（DataRecordDialog）**: 保存処理のみ変更、フォーム表示・初期値復元は変更なし
- **フォールバック時（初回記録）**: `properties` 形式を保持して保存
- **DB実績あり時（再編集）**: フラットkey-value形式を保持して保存

---

## 6. 技術的詳細

### data 組み立てロジックの詳細

```typescript
// fetchedTemplateItems から templateId でオリジナルを検索
const originalItem = fetchedTemplateItems.find(
  (item) => item.templateId === template.templateId
);

// ベースデータ: 元アイテムのdataをディープコピー
const baseData: Record<string, unknown> = originalItem
  ? JSON.parse(JSON.stringify(originalItem.data))
  : {};

// フォールバック形式か判定（properties配列が存在するか）
if (
  baseData.properties &&
  Array.isArray(baseData.properties)
) {
  // フォールバック形式: properties[i].value を上書き
  (baseData.properties as Array<{ key: string; xsiType: string; value: unknown; units: string | null }>)
    .forEach((p) => {
      const formKey = `${template.templateId}_${p.key}`;
      if (p.xsiType === 'dateType') {
        const v = values[formKey];
        p.value = v ? dayjs(v).format('YYYY-MM-DD') : null;
      } else if (p.xsiType === 'dateTimeType') {
        const v = values[formKey];
        p.value = v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : null;
      } else if (p.xsiType === 'contentDoubleListType') {
        p.value = dataGrids[formKey] ?? null;
      } else {
        p.value = values[formKey] ?? null;
      }
    });
} else {
  // DB実績形式: フラットkey-valueを上書き
  template.properties.forEach((prop) => {
    const formKey = `${template.templateId}_${prop.key}`;
    if (prop.type === 'contentDoubleListType') {
      baseData[prop.key] = dataGrids[formKey] ?? [[0, 0, 0]];
    } else if (prop.type === 'dateType' || prop.type === 'dateTimeType') {
      const v = values[formKey];
      baseData[prop.key] = v
        ? dayjs(v).format(prop.type === 'dateType' ? 'YYYY-MM-DD' : 'YYYY-MM-DD HH:mm:ss')
        : null;
    } else {
      baseData[prop.key] = values[formKey] ?? null;
    }
  });
}

const record: ExperimentDataRecord = {
  placeId: originalItem?.placeId ?? template.templateId,
  templateType: mapTemplateCategoryToApiType(template.category),
  templateId: template.templateId,
  data: baseData,
  status: selectedStatus,
  comment: comment || undefined,
};
```

---

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| fetchedTemplateItems が空の場合（ダイアログ初期表示前に保存した場合） | 中 | 低 | `originalItem` が undefined の場合は `template.templateId` をfallbackとして使用。`baseData` は空オブジェクトとして現状維持 |
| フォールバック形式・DB実績形式の判定ミス | 高 | 低 | `baseData.properties && Array.isArray(baseData.properties)` で安全に判定 |
| dateType/dateTimeType の変換漏れ | 中 | 低 | 両形式でそれぞれdateの変換処理を実装 |

---

## 8. テスト計画

### 手動テスト
- [ ] 初回記録（DBに実績なし）: フォールバック形式でPOSTされることを確認
- [ ] 再編集（DBに実績あり）: フラットkey-value形式でPOSTされることを確認
- [ ] POSTリクエストのボディを開発者ツールで確認
  - `placeId` が正しいプレースIDになっていること
  - `data` がGETで取得した構造を保持していること
- [ ] フォームの表示・初期値復元が従来通り動作すること

---

## 9. 承認記録
- **計画書提示日時**: 2026-03-02 11:51
- **承認日時**: 2026-03-02 11:51

---

## 10. 実施記録

### 実施日時
開始: 2026-03-02 11:51  
完了: 2026-03-02 11:55

### 計画からの変更点
- `onSave([templateData])` の `templateData` が新ロジックで不要になったため、`onSave([baseData as ExperimentDataValue])` に変更

### 最終的な成果物
- [x] `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` 修正完了
  - `fetchedTemplateItems: TemplateDataItem[]` state を追加
  - ダイアログオープン時に `setFetchedTemplateItems([])` でリセット
  - GETレスポンス受信時に `setFetchedTemplateItems(response.data.templates)` で生データを保存
  - `handleSaveTemplate` の `placeId` を `originalItem?.placeId ?? template.templateId` に修正
  - `handleSaveTemplate` の `data` 組み立てを GETレスポンスの構造を保持する方式に修正
