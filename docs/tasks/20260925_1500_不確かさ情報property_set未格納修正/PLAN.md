# タスク計画書: 不確かさ情報がproperty_setに格納されないバグ修正

## メタデータ
- **作成日時**: 2026-09-25 15:00
- **更新日時**: 2026-09-25 15:30（追加調査により定性評価の問題を追記）
- **タスクID**: 20260925_1500_不確かさ情報property_set未格納修正
- **優先度**: 高
- **推定工数**: 2〜3時間

---

## タスク概要

`WorkRecordPanel.tsx` で画面から入力した「不確かさ関連情報」が
`template_data.property_set` に正しく書き込まれないため、`MaimlWriterService` が
実MAIMLに書き込む際に不確かさ情報が欠落する。

**欠落している情報:**
1. **定量評価値** — `uncertaintyValuesRef` の値が `records` に含まれていない
2. **定性評価値（確か/要確認/不確か ボタン選択値）** — `confidenceValuesRef` のキーが `handleSave` の参照キーと不一致のため書き込みが機能していない
3. **定性評価理由** — 同上（定性評価値と同じキー不一致問題）

---

## 問題の根本原因（調査結果）

### キー・ID 体系の整理

`TemplateDataItem`（バックエンドの `getTemplateData` レスポンス）には2種類のIDが存在する：

| フィールド | 値の例 | 意味 |
|---|---|---|
| `TemplateDataItem.templateId` | `T_material01` | MAIMLの `template.id` |
| `TemplateDataItem.placeId` | `place-001` | DBの `place_id` / MAIMLの `placeRef.ref` |

フロントエンドで `WorkTemplate` を構築する際（2418行目）：
```typescript
// WorkTemplate.id = item.placeId（place_id）
id: String(item.placeId || `tpl-${row.transitionId}-${_tplIdx}`),
```

つまり `onConfidenceChange(template.id, propKey, ...)` で使われる `template.id` は **`placeId`** になる。

---

### 問題1（定性評価）: `confidenceValuesRef` のキー不一致

**Ref への書き込み**（`onConfidenceChange` コールバック、3474〜3489行目）：
```
confidenceValuesRef キー = `${templateId}__${propKey}`
  ↑ templateId = template.id（PropertyList から渡される） = placeId
  = `${placeId}__${propKey}`
```

**handleSave での読み取り**（2879行目）：
```
confidenceValuesRef.current.get(`${item.templateId}__${propKey}`)
  ↑ item.templateId = property_set.templateId（MAIMLのtemplate.id）
  ≠ placeId
```

`placeId ≠ property_set.templateId` のため **常にキーが不一致 → `confidenceEntry` が `undefined`**。

→ 定性評価選択値・定性評価理由が `uncertainty[].value / description` に書き込まれない。

---

### 問題2（定量評価）: `uncertaintyValuesRef` の値が `records` に含まれない

**Ref への書き込み**（3465〜3472行目）：
```
uncertaintyValuesRef キー = placeId（= template.id）
```

**handleSave での利用**（2921〜2933行目）：
```
uncertaintyValues として saveBatchExperimentData に別途送信
→ バックエンドは experiment_uncertainty_judge（判定テーブル）にのみ保存
→ property_set には書き込まない
```

---

### データフロー全体図

```
[画面]
  confidence ボタン → confidenceValuesRef キー: `${placeId}__${propKey}`
  qualitativeReason → confidenceValuesRef キー: `${placeId}__${propKey}`（同上）
  addedValues       → uncertaintyValuesRef キー: placeId

[handleSave()]
  rawItems.map((item) => { ... })
    item.templateId = property_set.templateId（MAIMLのtemplate.id）
    item.placeId    = DBのplace_id
    → item.templateId ≠ item.placeId（通常は別値）

    定性評価書き込み:
      confidenceValuesRef.current.get(`${item.templateId}__${propKey}`)
      ← キーは placeId ベースのため ❌ 不一致 → confidenceEntry = undefined
      → uncertainty[].value/description に何も書き込まれない

    定量評価書き込み:
      uncertaintyValuesRef → uncertaintyValues として別途送信のみ
      → property_set には書き込まれない ❌

[バックエンド]
  records → property_set（定性・定量値なし）
  uncertaintyValues → experiment_uncertainty_judge のみ
```

---

## rawTemplateItemsRef の構造（参考）

各アイテムの `data.properties[]`（`convertPropertyForFallback` 変換後）：

```json
{
  "key": "propKey",
  "value": "実績値",
  "uncertainty": [
    { "key": "qualitativeKey" },
    { "key": "quantitativeKey1" }
  ],
  "toleranceValues": [
    { "uncertaintyKey": "quantitativeKey1", "toleranceValue": 0.1 }
  ]
}
```

`uncertainty[]`（単数）は定性・定量が混在する配列で MAIML XML 出力対象。
`toleranceValues[]` は許容値表示用フラットフィールド（`property_set` 外）。

---

## 修正方針

**`handleSave`・`handleSaveCorrection` の参照側キーを `item.placeId` に統一する（最小変更）**

- `confidenceValuesRef` / `uncertaintyValuesRef` のキー（Ref書き込み側）は `placeId` ベースのまま維持
- `handleSave`（2879行目）の `confidenceValuesRef` 参照キーを `item.templateId` → `item.placeId` に変更
- `handleSave` に定量評価値を `uncertainty[]` に書き込む処理を追加
- `handleSaveCorrection`（2796行目）にも定性・定量の書き込み処理を追加

### 修正1: `handleSave` の `confidenceValuesRef` 参照キーを `item.placeId` に変更

```typescript
// 変更前（不一致）
const confidenceEntry = confidenceValuesRef.current.get(`${item.templateId}__${propKey}`);

// 変更後（placeId で統一）
const confidenceEntry = confidenceValuesRef.current.get(`${item.placeId}__${propKey}`);
```

### 修正2: `handleSave` に定量評価値を `uncertainty[]` に書き込む処理を追加

定性評価書き込み処理の直後（2912行目）に追加：

```typescript
// ── 定量評価値（uncertaintyValuesRef）を uncertainty[] に書き込む ──
if (Array.isArray(baseData.properties)) {
  const quantEntries = uncertaintyValuesRef.current.get(item.placeId) ?? [];
  if (quantEntries.length > 0) {
    (baseData.properties as Array<Record<string, unknown>>).forEach((p) => {
      if (p.isCustomProperty === true) return;
      const propKey = String(p.key ?? '');
      const propEntries = quantEntries.filter((e) => e.propKey === propKey);
      if (propEntries.length === 0 || !Array.isArray(p.uncertainty)) return;
      (p.uncertainty as Array<Record<string, unknown>>).forEach((unc) => {
        const ucKey = unc['key'] as string | undefined;
        if (!ucKey) return;
        const entry = propEntries.find((e) => e.uncertaintyKey === ucKey);
        if (entry && entry.value && !isNaN(Number(entry.value))) {
          unc['value'] = entry.value;
        }
      });
    });
  }
}
```

### 修正3: `handleSaveCorrection` にも定性・定量の書き込み処理を追加

`handleSaveCorrection`（2796〜2817行目）の `records` 構築では定性・定量評価の書き込みが一切ない。
`handleSave` と同等の処理を追加する。

---

## 実装ステップ

- [ ] STEP 1: `handleSave` の `confidenceValuesRef` 参照キーを `item.templateId` → `item.placeId` に変更
- [ ] STEP 2: `handleSave` の `records` 構築ループ内に定量評価値を `uncertainty[]` に書き込む処理を追加
- [ ] STEP 3: `handleSaveCorrection` の `records` 構築に定性・定量評価の書き込み処理を追加

---

## 変更ファイル

| # | ファイル | 変更内容 |
|---|---------|---------|
| 1 | `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` | `handleSave`: confidenceValuesRef 参照キーを placeId に変更 + 定量評価値書き込み追加 |
| 2 | `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` | `handleSaveCorrection`: 定性・定量評価値の書き込み処理を追加 |

---

## リスク

| リスク | 対策 |
|--------|------|
| `uncertainty[]` に対象キーが存在しない場合 | エントリが見つからない場合はスキップ |
| 同一プロパティキーに定性・定量両方のエントリが重複する場合 | 既存の `quantitativeKeys` セットによる定量キー判定で定性と定量を分離済み |

---

## テスト計画

- [ ] 定性評価ボタン（確か/要確認/不確か等）を選択して「保存」→ `property_set.properties[].uncertainty[].value` に値が格納されること
- [ ] 定性評価理由を入力して「保存」→ `property_set.properties[].uncertainty[].description` に値が格納されること
- [ ] 定量評価値を入力して「保存」→ `property_set.properties[].uncertainty[].value` に値が格納されること
- [ ] 承認後の MAIML に `<uncertainty key="..."><value>...</value></uncertainty>` が出力されること
- [ ] 訂正保存（handleSaveCorrection）でも同様に動作すること
- [ ] 既存の実績値保存（`properties[].value`）が引き続き正しく動作すること

---

## 承認記録
- **計画書提示日時**: 2026-09-25 15:30
- **承認日時**: 2026-09-25（ユーザー承認済み・実装開始）
- **承認者コメント**: 実装開始の指示あり

## 実施記録
### 実施日時
開始: 2026-09-25 15:30
完了: 2026-09-25

### 実施内容
- ✅ STEP 1（修正1）: `handleSave` の `confidenceValuesRef` 参照キーを `item.placeId` ベースに変更（定性評価のキー不一致修正）
  - 確認: 実装済みであった（2941行目）
  - 追加対応: `item.templateId` フォールバックを追加
- ✅ STEP 2（修正2）: `handleSave` の `records` 構築ループ内に定量評価値を `uncertainty[]` に書き込む処理を追加（2975〜2996行目）
- ✅ STEP 3（修正3）: `handleSaveCorrection` にも修正1・2 と同様の修正を適用（2808〜2869行目）

### 変更ファイル
- `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx`


```typescript
// 変更前（不一致）
const confidenceEntry = confidenceValuesRef.current.get(`${item.templateId}__${propKey}`);

// 変更後（placeId で統一。item.templateId でフォールバック）
const confidenceEntry =
  confidenceValuesRef.current.get(`${item.placeId}__${propKey}`) ??
  confidenceValuesRef.current.get(`${item.templateId}__${propKey}`);
```

### 修正2: `records` 構築時に定量評価値を `uncertainty[]` に書き込む

定性評価書き込み処理の直後（2912行目）に追加：

```typescript
// ── 定量評価値（uncertaintyValuesRef）を uncertainty[] に書き込む ──
if (Array.isArray(baseData.properties)) {
  const quantEntries =
    uncertaintyValuesRef.current.get(item.placeId) ??
    uncertaintyValuesRef.current.get(item.templateId) ?? [];
  if (quantEntries.length > 0) {
    (baseData.properties as Array<Record<string, unknown>>).forEach((p) => {
      if (p.isCustomProperty === true) return;
      const propKey = String(p.key ?? '');
      const propEntries = quantEntries.filter((e) => e.propKey === propKey);
      if (propEntries.length === 0 || !Array.isArray(p.uncertainty)) return;
      (p.uncertainty as Array<Record<string, unknown>>).forEach((unc) => {
        const ucKey = unc['key'] as string | undefined;
        if (!ucKey) return;
        const entry = propEntries.find((e) => e.uncertaintyKey === ucKey);
        if (entry && entry.value && !isNaN(Number(entry.value))) {
          unc['value'] = entry.value;
        }
      });
    });
  }
}
```

### 修正3: `handleSaveCorrection` にも修正1・2を適用

`handleSaveCorrection`（2796〜2818行目）も同じ `records` 構築パターンを持つ。  
`confidenceValuesRef` のキーを `item.placeId` ベースに変更し、定量評価値の書き込みを追加する。

---

## 実装ステップ

- [ ] STEP 1: `handleSave` の `confidenceValuesRef` 参照キーを `item.placeId` ベースに変更（定性評価のキー不一致修正）
- [ ] STEP 2: `handleSave` の `records` 構築ループ内に定量評価値を `uncertainty[]` に書き込む処理を追加
- [ ] STEP 3: `handleSaveCorrection` にも STEP 1・2 と同様の修正を適用

---

## 変更ファイル

| # | ファイル | 変更内容 |
|---|---------|---------|
| 1 | `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` | `handleSave`: confidenceValuesRef 参照キーを placeId ベースに修正 + 定量評価値を uncertainty[].value に書き込む処理を追加 |
| 2 | `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` | `handleSaveCorrection`: 同様の修正 |

---

## リスク

| リスク | 対策 |
|--------|------|
| `item.placeId` が空の場合 | `item.templateId` でフォールバック |
| `uncertainty[]` に対象キーが存在しない場合 | エントリが見つからない場合はスキップ |
| `confidenceValuesRef` に placeId と templateId 両方のキーが混在 | placeId 優先・templateId フォールバックで対処 |

---

## テスト計画

- [ ] 定性評価ボタン（確か/要確認/不確か等）を選択して「保存」→ `property_set.properties[].uncertainty[].value` に値が格納されること
- [ ] 定性評価理由を入力して「保存」→ `property_set.properties[].uncertainty[].description` に値が格納されること
- [ ] 定量評価値を入力して「保存」→ `property_set.properties[].uncertainty[].value` に値が格納されること
- [ ] 承認後の MAIML に `<uncertainty key="..."><value>...</value></uncertainty>` が出力されること
- [ ] 訂正保存でも同様に動作すること
- [ ] 既存の実績値保存（`properties[].value`）が引き続き正しく動作すること

---

## 承認記録
- **計画書提示日時**: 2026-09-25 15:30
- **承認日時**: （承認後記入）
- **承認者コメント**: （承認後記入）

