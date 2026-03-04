# タスク計画書: DataRecordDialog フォーム初期値表示バグ修正

## メタデータ
- **作成日時**: 2026-03-02 14:10
- **タスクID**: DataRecordDialog_フォーム初期値バグ修正
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

実験データ記録モーダル（DataRecordDialog）において、保存後に再度モーダルを開いた際、
GETレスポンスの各プロパティ `value` がフォームに表示されない不具合を修正する。

---

## 調査結果

### 再現手順

1. DataRecordDialog を開き、実験データを入力して保存（POST）
2. 再度同じ DataRecordDialog を開く
3. GET API でデータを取得（下記レスポンス例）
4. **→ 各プロパティの value がフォームに表示されない**

### GETレスポンス（問題のある形式）

POST 保存時に `data` が `properties` 配列構造のまま DB に保存されるため、
GET でも同じ構造で返ってくる。

```json
{
  "placeId": "material-1772412240051",
  "templateType": "material",
  "templateId": "materialTemplate_1772412605350",
  "data": {
    "properties": [
      { "key": "property01", "units": null, "value": "2", "xsiType": "stringType" },
      { "key": "content01",  "units": null, "value": "2", "xsiType": "stringType" },
      { "key": "parameter01","units": null, "value": 3,   "xsiType": "longType"   }
    ],
    "templateId": "materialTemplate_1772412605350",
    "templateType": "material"
  },
  "recordedBy": "worker@example.com",
  "recordedAt": "2026-03-02T05:03:23.247Z"
}
```

### 根本原因

`DataRecordDialog.tsx` の `useEffect` 内でフォーム初期値を設定するロジックが、
`recordedBy !== null`（DB保存済み）を「フラットなkey-value形式」と決め打ちして処理している。

```typescript
// ★ 現在のコード（バグあり）
if (item.recordedBy !== null) {
  // DB実績データ → フラットなkey-value形式を想定
  for (const [fieldKey, fieldValue] of Object.entries(item.data)) {
    const formKey = `${item.templateId}_${fieldKey}`;
    initialValues[formKey] = fieldValue;  // ← 問題箇所
  }
}
```

`item.data` の keys は `properties`, `templateId`, `templateType` であるため、
下記のような**存在しないフォームキー**が生成されてしまう。

| 生成されたフォームキー（誤） | フォームが期待するキー（正） |
|---|---|
| `materialTemplate_xxx_properties` | `materialTemplate_xxx_property01` |
| `materialTemplate_xxx_templateId` | `materialTemplate_xxx_content01` |
| `materialTemplate_xxx_templateType` | `materialTemplate_xxx_parameter01` |

### 修正方針

`recordedBy !== null` の分岐内でも、`data.properties` が配列かどうかを先にチェックし、
配列形式であれば `properties[i].value` を使って正しいフォームキーに値をセットする。

```typescript
// ★ 修正後のコード
for (const item of response.data.templates) {
  const rawData = item.data as Record<string, unknown>;
  const rawProperties = rawData.properties as Array<{
    key: string; xsiType: string; value: unknown; units: string | null;
  }> | undefined;

  if (Array.isArray(rawProperties)) {
    // properties配列形式（フォールバック形式・保存済み形式どちらでもこちらで統一処理）
    for (const p of rawProperties) {
      if (p.value !== null && p.value !== undefined) {
        const formKey = `${item.templateId}_${p.key}`;
        if (p.xsiType === 'dateType' || p.xsiType === 'dateTimeType') {
          initialValues[formKey] = dayjs(String(p.value));
        } else {
          initialValues[formKey] = p.value;
        }
      }
    }
  } else if (item.recordedBy !== null) {
    // 純粋なフラットkey-value形式（将来的な形式変更に備えて残す）
    for (const [fieldKey, fieldValue] of Object.entries(rawData)) {
      const formKey = `${item.templateId}_${fieldKey}`;
      initialValues[formKey] = fieldValue;
    }
  }
}
```

---

## 目的と期待される成果

### 目的
- DataRecordDialog を再度開いた際に、過去に保存したプロパティ値がフォームに正しく表示されるようにする

### 期待される成果
- [ ] GETレスポンスの `data.properties[].value` がフォームの各入力項目に正しく反映される
- [ ] `recordedBy === null`（未記録・フォールバック）時の既存動作は変わらない
- [ ] `dateType` / `dateTimeType` は引き続き dayjs オブジェクトに変換される

---

## 実装ステップ

### Phase 1: DataRecordDialog.tsx の useEffect を修正
- [x] バグのある `if (item.recordedBy !== null)` 分岐を特定
- [x] `data.properties` の配列チェックを先頭に移動して統一処理に変更
- [x] 既存の `else`（フォールバック側）との整合性を確認

### Phase 2: 動作確認
- [ ] 保存後に再度モーダルを開き、値が表示されることを確認
- [ ] 未記録（recordedBy === null）のテンプレートも問題なく表示されることを確認

---

## 影響範囲

### 変更するファイル
1. `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` - useEffect 内の初期値設定ロジック

### 新規作成するファイル
なし

### 影響を受ける機能
- 実験記録タブのデータ記録モーダル（DataRecordDialog）の初期値表示

---

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 純粋なフラットkey-value形式（将来の形式）の既存動作が壊れる | 中 | 低 | `Array.isArray(rawProperties)` で判定し、非配列の場合は既存ロジックを維持 |
| dateType/dateTimeType の変換漏れ | 低 | 低 | 修正ロジック内で xsiType チェックを維持 |

---

## テスト計画

### 手動テスト
- [ ] material/condition/result 各テンプレートで値を保存 → 再度モーダルを開いて値が表示されることを確認
- [ ] 未記録のテンプレート（recordedBy === null）は空欄のままであることを確認
- [ ] dateType / dateTimeType のプロパティが DatePicker に正しく表示されることを確認

---

## 承認記録

- **計画書提示日時**: 2026-03-02 14:10
- **承認日時**: 2026-03-02 14:10
- **承認者コメント**: 調査結果確認済み、実装進める

---

## 実施記録

### 実施日時
開始: 2026-03-02 14:10
完了: （作業完了後に記入）

### 計画からの変更点
（実施中に記入）

### 発生した問題と解決方法
（実施中に記入）
