# タスク計画書: テンプレート実績取得API フロントエンド実装修正

## メタデータ
- **作成日時**: 2026-02-27 20:37
- **タスクID**: experiment-data-api-fallback-frontend
- **優先度**: 中
- **推定工数**: 30分

## 1. タスク概要

`docs/design/api/api_experiment_data.md`（v3.2.0）の仕様変更に伴い、  
`GET テンプレート実績一覧取得API` のフロントエンド実装を修正する。

v3.2.0での変更点：フィルタリング後のデータが0件の場合、空配列を返すのではなく、
MAIMLテンプレート定義から初期値を生成したフォールバックレスポンスを返すようになった。
フォールバック時は `recordedBy` / `recordedAt` が `null` になる。

---

## 2. 設計書との差分分析

### 差分1: `TemplateDataItem` 型の null 非許容問題

| フィールド | 現在の型 | 設計書 v3.2.0 |
|---|---|---|
| `recordedBy` | `string` | `string \| null` |
| `recordedAt` | `string` | `string \| null` |

フォールバック時は `recordedBy: null` / `recordedAt: null` が返るため、
現在の `string` 型定義のままでは TypeScript 型エラーになる。

**ファイル**: `frontend/src/types/api.ts`

---

### 差分2: DataRecordDialog.tsx のフォーム初期値復元ロジック

APIレスポンスの `templates` 配列に含まれる `data` オブジェクトには**2種類の形式**がある。

#### 形式A: DB実績データがある場合（`recordedBy !== null`）
```json
{ "data": { "temperature": 25.5, "pressure": 1013 } }
```
→ 現在の実装（フラットなkey-valueをフォームに反映）は**正しく動作**

#### 形式B: フォールバックデータの場合（`recordedBy === null`）
```json
{
  "data": {
    "templateId": "template-mat-001",
    "templateType": "material",
    "properties": [
      { "key": "temperature", "xsiType": "stringType", "value": null, "units": "°C" }
    ]
  }
}
```
→ 現在の実装でフラットマッピングすると、
  `template-mat-001_templateId` / `template-mat-001_templateType` / `template-mat-001_properties`
  という**存在しないフォームフィールド名**でセットされてしまう（= 事実上無効な処理、バグ）

**修正方針**:
- `item.recordedBy !== null` の場合のみ既存のフラットマッピングを実行
- `item.recordedBy === null`（フォールバック）の場合はマッピングをスキップ
  （`value` がすべて `null` なのでフォームは空の状態で開く設計が意図通り）
- テンプレートIDの選択状態（`setSelectedTemplateId`）はどちらの形式でも復元する

**ファイル**: `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx`

---

## 3. 目的と期待される成果

### 目的
- v3.2.0 の API 仕様変更に対応し、フロントエンドの型定義・ロジックを整合させる
- フォールバック時に存在しないフィールド名でフォームに値をセットするバグを修正する

### 期待される成果
- [ ] `TemplateDataItem.recordedBy` / `recordedAt` が `string | null` になっている
- [ ] フォールバック時（`recordedBy === null`）にフォームへのマッピングをスキップする
- [ ] DB実績データがある場合（`recordedBy !== null`）は既存通りフォームに値を復元する
- [ ] TypeScript コンパイルエラーなし

---

## 4. 実装ステップ

### Step 1: `frontend/src/types/api.ts` の型修正
- [ ] `TemplateDataItem.recordedBy: string` → `string | null` に変更
- [ ] `TemplateDataItem.recordedAt: string` → `string | null` に変更

### Step 2: `DataRecordDialog.tsx` のフォーム初期値復元ロジック修正
- [ ] `item.recordedBy !== null` 判定を追加
  - `true` の場合: 既存のフラットマッピング処理を実行（変更なし）
  - `false` の場合: フォームへのマッピングをスキップ
- [ ] テンプレートID選択状態の復元は両方の形式で維持する

---

## 5. 変更ファイル

1. `frontend/src/types/api.ts`
   - `TemplateDataItem.recordedBy: string` → `string | null`
   - `TemplateDataItem.recordedAt: string` → `string | null`

2. `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx`
   - `getTemplateData` レスポンス処理に `recordedBy !== null` の分岐を追加

---

## 6. 技術的詳細

### 修正後の DataRecordDialog.tsx（フォーム初期値復元部分）

```typescript
if (response.success && response.data.templates.length > 0) {
  const initialValues: Record<string, unknown> = {};
  for (const item of response.data.templates) {
    if (item.recordedBy !== null) {
      // DB実績データ: フラットなkey-value形式でフォームに反映（既存ロジック）
      for (const [fieldKey, fieldValue] of Object.entries(item.data)) {
        const formKey = `${item.templateId}_${fieldKey}`;
        initialValues[formKey] = fieldValue;
      }
    }
    // フォールバックデータ（recordedBy === null）は value がすべて null のため
    // フォームへの反映をスキップ（フォームは空の状態で表示される）
  }
  if (Object.keys(initialValues).length > 0) {
    form.setFieldsValue(initialValues);
  }

  // テンプレートIDでサイドバー選択状態を復元（どちらの形式でも実行）
  const firstItem = response.data.templates[0];
  if (firstItem) {
    setSelectedTemplateId(firstItem.templateId);
  }
}
```

---

## 7. リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `recordedBy` の null 許容変更により他のコンポーネントで型エラー発生 | 低 | 低 | `TemplateDataItem` の参照箇所を検索して確認 |

---

## 8. テスト計画
- [ ] TypeScript コンパイルエラーなし（確認方法: `npx tsc --noEmit`）
- [ ] `TemplateDataItem` を参照している箇所で型エラーが出ていないこと

---

## 9. 承認記録
- **計画書提示日時**: 2026-02-27 20:37
- **承認日時**: 2026-02-27 20:37（ACT MODE切り替えにより承認済み）
