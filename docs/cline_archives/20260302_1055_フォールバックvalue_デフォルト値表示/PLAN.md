# タスク計画書: フォールバック時のproperties.valueをDataRecordDialogのデフォルト値として表示

## メタデータ
- **作成日時**: 2026-03-02 10:55
- **タスクID**: fallback_value_default_display
- **優先度**: 中
- **推定工数**: 0.5時間

## 1. タスク概要

`GET /api/v1/experiments/projects/:projectName/methods/:methodId/tasks/:taskNo/data?transitionId=xxx`
で取得した `properties[].value` の値を、実験データ記録モーダル（DataRecordDialog）の
入力コントロールにデフォルト値として表示するようにする。

---

## 2. 背景・関連タスクとの依存関係

### 前タスク（完了済み）: `docs/20260302_1037_テンプレート実績取得_value_units_NULL修正`

上記タスクで **バックエンドの修正は完了済み**。
- `experimentDataService.ts` の `buildFallbackTemplates` 関数の修正
  - `value: null` → `value: p.value ?? null`（MAIMLの`<value>`要素の値を返すように変更）
- APIレスポンスの `templates[].data.properties[].value` には MAIMLの値が入っている状態

### 本タスク: フロントエンドの対応

フロントエンド（`DataRecordDialog.tsx`）の `useEffect` 内で、フォールバックデータ
（`recordedBy === null`）のケースについて「value が null のためスキップ」という
ロジックを削除し、取得した `value` を Ant Design Form のデフォルト値として設定する。

---

## 3. 問題の詳細

### APIレスポンスのデータ構造

**フォールバック時（DBに実績なし）のレスポンス例：**

```json
{
  "success": true,
  "data": {
    "templates": [
      {
        "placeId": "place-xxx",
        "templateType": "material",
        "templateId": "materialTemplate_1772412605350",
        "data": {
          "templateId": "materialTemplate_1772412605350",
          "templateType": "material",
          "properties": [
            { "key": "property01", "xsiType": "stringType", "value": "1",  "units": "nm" },
            { "key": "content01",  "xsiType": "stringType", "value": "2",  "units": "stringType" },
            { "key": "parameter01","xsiType": "longType",   "value": 3,    "units": null }
          ]
        },
        "recordedBy": null,
        "recordedAt": null
      }
    ]
  }
}
```

### フロントエンドの現状コード（DataRecordDialog.tsx）

```typescript
// ② 取得した実績データをフォームフィールドに反映（既存値の復元）
const initialValues: Record<string, unknown> = {};
for (const item of response.data.templates) {
  if (item.recordedBy !== null) {
    // DB実績データ（recordedBy !== null）:
    // フラットなkey-value形式でフォームに反映
    for (const [fieldKey, fieldValue] of Object.entries(item.data)) {
      const formKey = `${item.templateId}_${fieldKey}`;
      initialValues[formKey] = fieldValue;
    }
  }
  // フォールバックデータ（recordedBy === null）:
  // data は { templateId, templateType, properties: [{ key, xsiType, value: null, units }] } 形式。
  // value がすべて null のためフォームへの反映をスキップし、空の状態で開く。  ← ★ここを修正
}
```

### 問題点

- バックエンドの修正で `value` に実際の値が入るようになったが、
  フロントエンドは `recordedBy === null` の場合を「value が null」という前提でスキップしている
- 結果としてフォームは空白のまま表示される

---

## 4. 目的と期待される成果

### 目的
MAIMLファイルのテンプレート定義に記録されたデフォルト値（`<value>` 要素）を、
DataRecordDialog のフォーム入力コントロールにデフォルト値として表示する。

### 期待される成果
- [ ] フォールバック時（recordedBy === null）でも、properties[].value が non-null の場合は
      フォームフィールドにデフォルト値として表示される
- [ ] dateType / dateTimeType は dayjs に変換して DatePicker のデフォルト値として設定される
- [ ] DB実績データがある場合（recordedBy !== null）の挙動は変わらない
- [ ] value が null / undefined のフィールドはフォームに設定しない（空白のまま）

---

## 5. 実装ステップ

### Phase 1: タスク計画書の作成
- [x] タスク専用フォルダを作成 (`docs/20260302_1055_フォールバックvalue_デフォルト値表示/`)
- [x] タスク計画書（PLAN.md）を作成

### Phase 2: フロントエンド修正
- [x] `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` を修正
  - `useEffect` 内のフォールバックデータ処理（`// フォールバックデータ（recordedBy === null）:` のコメント部分）を実装

---

## 6. 変更ファイル

### 修正するファイル

| ファイル | 変更種別 | 変更内容 |
|---------|---------|---------|
| `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` | 修正 | フォールバックデータ（recordedBy === null）の properties[].value をフォームにセット |

---

## 7. 技術的詳細

### 修正内容

**対象箇所**: `DataRecordDialog.tsx` の `useEffect` 内（ダイアログオープン時）

```typescript
// 修正前
for (const item of response.data.templates) {
  if (item.recordedBy !== null) {
    // DB実績データ（recordedBy !== null）:
    // フラットなkey-value形式でフォームに反映
    for (const [fieldKey, fieldValue] of Object.entries(item.data)) {
      const formKey = `${item.templateId}_${fieldKey}`;
      initialValues[formKey] = fieldValue;
    }
  }
  // フォールバックデータ（recordedBy === null）:
  // data は { templateId, templateType, properties: [{ key, xsiType, value: null, units }] } 形式。
  // value がすべて null のためフォームへの反映をスキップし、空の状態で開く。
}
```

```typescript
// 修正後
for (const item of response.data.templates) {
  if (item.recordedBy !== null) {
    // DB実績データ（recordedBy !== null）:
    // フラットなkey-value形式でフォームに反映
    for (const [fieldKey, fieldValue] of Object.entries(item.data)) {
      const formKey = `${item.templateId}_${fieldKey}`;
      initialValues[formKey] = fieldValue;
    }
  } else {
    // フォールバックデータ（recordedBy === null）:
    // data は { templateId, templateType, properties: [{ key, xsiType, value, units }] } 形式。
    // value が non-null の場合はフォームにデフォルト値として反映する
    const rawData = item.data as Record<string, unknown>;
    const rawProperties = rawData.properties as Array<{
      key: string;
      xsiType: string;
      value: unknown;
      units: string | null;
    }> | undefined;
    if (rawProperties) {
      for (const p of rawProperties) {
        if (p.value !== null && p.value !== undefined) {
          const formKey = `${item.templateId}_${p.key}`;
          // dateType / dateTimeType は dayjs に変換（DatePicker が dayjs オブジェクトを期待するため）
          if (p.xsiType === 'dateType' || p.xsiType === 'dateTimeType') {
            initialValues[formKey] = dayjs(String(p.value));
          } else {
            initialValues[formKey] = p.value;
          }
        }
      }
    }
  }
}
```

### 考慮事項

#### 1. xsiType と Form 入力コントロールの対応

| xsiType | 入力コントロール | value の扱い |
|---------|----------------|------------|
| stringType | TextArea | そのまま文字列 |
| intType | InputNumber | そのまま数値 |
| floatType | InputNumber | そのまま数値 |
| booleanType | Checkbox | そのまま boolean |
| dateType | DatePicker | dayjs(String(value)) に変換 |
| dateTimeType | DatePicker(showTime) | dayjs(String(value)) に変換 |
| contentDoubleListType | DataGrid | DataGrid は別の state（dataGrids）で管理のため今回は対象外 |
| propertyListType | 再帰ネスト | 今回は対象外（ネスト構造は複雑なため） |
| insertion | Upload | ファイルパスのみ返るため今回は対象外 |

#### 2. contentDoubleListType の扱い
DataGrid は `dataGrids` という別の React state で管理されており、Ant Design Form の `setFieldsValue` では制御できない。
フォールバック時の DataGrid デフォルト値設定は今回のスコープ外とし、将来タスクで対応予定。

#### 3. DB実績データとフォールバックデータの違い

| 項目 | DB実績データ (recordedBy !== null) | フォールバック (recordedBy === null) |
|------|-------------------------------|----------------------------------|
| data 形式 | フラット key-value | `{ templateId, templateType, properties: [] }` |
| value の取得方法 | `Object.entries(item.data)` | `item.data.properties[].value` |
| 意味 | 過去の入力値を復元 | MAIMLで定義されたデフォルト値を表示 |

---

## 8. リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| DB実績データがある場合の動作変更 | 低 | 低 | `recordedBy !== null` の分岐は変更しないため影響なし |
| valueの型が想定外（例: オブジェクト型） | 低 | 低 | InputNumber等は文字列を受け取っても内部で変換するため問題なし |
| DatePickerにInvalidなdate文字列が渡る | 低 | 低 | dayjs はInvalid Dateを許容し、入力欄は空になるため問題なし |
| contentDoubleListType のデフォルト値未対応 | 低 | 低 | 今回スコープ外として明示、将来タスクで対応 |

---

## 9. テスト計画

### 手動テスト

1. **フォールバック時（DBに実績なし）のデフォルト値表示**
   - TestProjectOmori8 プロジェクトを選択
   - 実験記録タブでトランジションの「データ記録」ボタンをクリック
   - DataRecordDialog が開いた際、テンプレートを選択すると MAIMLの`<value>`値がフォームに表示されること

2. **DB実績データがある場合の既存動作確認**
   - 一度データを保存した後、再度 DataRecordDialog を開く
   - 保存した値がフォームに表示されること（変更なし）

3. **value が null のプロパティ**
   - MAIMLで `<value>` タグがないプロパティはフォームが空白であること

---

## 10. 承認記録
- **計画書提示日時**: 2026-03-02 10:55
- **承認日時**: 2026-03-02 10:55
- **承認者コメント**: 承認済み

## 11. 実施記録

### 実施日時
開始: 2026-03-02 10:55
完了: （作業完了後に記入）

### 最終的な成果物
- [ ] `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` 修正完了
