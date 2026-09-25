# タスク計画書: デフォルト定性評価の uncertainty_key null による MAIML 書き出し不具合修正

## メタデータ
- **作成日時**: 2026-09-25 17:00
- **タスクID**: 20260925_1700_デフォルト定性評価uncertainty_key_null修正
- **優先度**: 高
- **推定工数**: 1〜2時間

---

## タスク概要

WorkRecordPanel で「テンプレート側で不確かさ基準を指定していないプロパティ」（デフォルト定性評価：確か / 要確認 / 不確か ボタン）の定性評価値・定性評価理由を保存すると、`template_data.property_set` に以下の JSON が書き込まれる。

```json
{
  "key": "condition:condition1",
  "uncertainty": [],
  "qualitativeKey": null,
  "qualitativeEval": "確か",
  "qualitativeReason": "test"
}
```

この状態では承認後の MAIML 書き出し（`maimlDataWriter.ts`）で `<uncertainty>` タグが出力されず、定性評価情報が MAIML に反映されない。

---

## 問題の根本原因

### キー用語

| 用語 | 意味 |
|------|------|
| テンプレート指定あり定性評価 | MAIML に `<uncertainty key="ns:foo">` が存在し DB に `evaluation_method=2` で登録されているもの |
| デフォルト定性評価 | `uncertainty[]` が空配列または DB 未登録。確か/要確認/不確か がデフォルト選択肢として表示されるもの |

### 原因① フロントエンド: `uncertainty[]` が空配列のため書き込み先がない

`WorkRecordPanel.tsx` handleSave（L2980）は `uncertainty.length > 0` の場合のみ書き込む：

```typescript
if (Array.isArray(p.uncertainty) && p.uncertainty.length > 0) {
  p.uncertainty.forEach((unc) => { ... }); // uncertainty:[] では実行されない
}
```

`qualitativeEval`・`qualitativeReason` はフラットフィールドには書かれるが `uncertainty[]` には書き込まれない。

### 原因② フロントエンド: `qualitativeKey` が null になる

バックエンド `convertPropertyForFallback()`（experimentDataService.ts L748）で `qualitativeKey` を設定するのは DB に `evaluation_method=2` として登録されているキーが存在する場合のみ。デフォルト定性評価では `qualitativeKey = null` のまま → `qualitativeValues` に `uncertaintyKey: null` が送信される。

### 原因③ バックエンド: `maimlDataWriter.ts` で key なしエントリをスキップ

`buildPropertyXML()`（L768-769）：

```typescript
const ucKey = uc['key'] as string | undefined;
if (!ucKey) continue; // key が null の場合スキップ
```

`uncertainty[]` が空配列のためループ自体が実行されず書き出されない（原因①に起因）。

### データフロー（問題箇所）

```
[デフォルト定性評価プロパティ（uncertainty: []）]
→ handleSave(): p.uncertainty = [] → forEach 不実行
→ property_set: { "uncertainty": [], "qualitativeKey": null, "qualitativeEval": "確か" }
→ maimlDataWriter: prop['uncertainty'] = [] → ループ不実行 → <uncertainty> 出力されない ❌
```

---

## 修正方針

**フロントエンドで `uncertainty[]` にデフォルトエントリを追加する。**

定性評価値（`qualitativeEval`）または定性評価理由（`qualitativeReason`）が存在するが、`uncertainty[]` に定性評価キーが存在しない場合、キー `'Alchemia:QualitativeEvaluation'` で新規エントリを `uncertainty[]` に追加する。

これにより：
- `property_set.uncertainty[]` に `{ key: 'Alchemia:QualitativeEvaluation', value: '確か', description: 'test' }` が書き込まれる
- `maimlDataWriter.buildPropertyXML()` の既存ロジックで `<uncertainty>` タグが正常に出力される
- **バックエンド側（`maimlDataWriter.ts`）の変更は不要**

```typescript
const DEFAULT_QUALITATIVE_UNCERTAINTY_KEY = 'Alchemia:QualitativeEvaluation';
```

---

## 実装ステップ

- [ ] STEP 1: `WorkRecordPanel.tsx` の `handleSave` に修正を追加
  - 定性評価値書き込みループ（L2968〜2994）の `p.uncertainty` への書き込み前に、定性評価エントリが存在しない場合にデフォルトキーエントリを追加する処理を挿入する
- [ ] STEP 2: `WorkRecordPanel.tsx` の `handleSaveCorrection` にも同じ修正を適用

---

## 変更ファイル

| # | ファイル | 変更内容 |
|---|---------|---------|
| 1 | `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` | `handleSave`: `uncertainty[]` が空の場合にデフォルトキーエントリを追加 |
| 2 | `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` | `handleSaveCorrection`: 同様の修正 |

---

## 修正コードイメージ

`handleSave` の records 構築ループ内（既存の定性評価書き込み処理 L2968〜2994 を以下に置き換え）：

```typescript
const DEFAULT_QUALITATIVE_UNCERTAINTY_KEY = 'Alchemia:QualitativeEvaluation';

if (Array.isArray(baseData.properties)) {
  (baseData.properties as Array<Record<string, unknown>>).forEach((p) => {
    if (p.isCustomProperty === true) return;
    const propKey = String(p.key ?? '');
    const confidenceEntry =
      confidenceValuesRef.current.get(`${item.placeId}__${propKey}`) ??
      confidenceValuesRef.current.get(`${item.templateId}__${propKey}`);

    const quantitativeKeys = new Set(
      (p['toleranceValues'] as Array<{ uncertaintyKey: string }> | null)
        ?.map((tv) => tv.uncertaintyKey) ?? []
    );

    // 【追加】デフォルト定性評価: 定性評価エントリが uncertainty[] にない場合に追加
    if (confidenceEntry && (confidenceEntry.value || confidenceEntry.description)) {
      const hasQualitativeEntry =
        Array.isArray(p.uncertainty) &&
        (p.uncertainty as Array<Record<string, unknown>>).some((unc) => {
          const k = unc['key'] as string | undefined;
          return k && !quantitativeKeys.has(k);
        });
      if (!hasQualitativeEntry) {
        if (!Array.isArray(p.uncertainty)) p.uncertainty = [];
        (p.uncertainty as Array<Record<string, unknown>>).push({
          key: DEFAULT_QUALITATIVE_UNCERTAINTY_KEY,
          value: confidenceEntry.value || null,
          description: confidenceEntry.description || null,
        });
      }
    }

    // 既存: uncertainty[] への書き込み
    if (Array.isArray(p.uncertainty) && p.uncertainty.length > 0) {
      (p.uncertainty as Array<Record<string, unknown>>).forEach((unc) => {
        const ucKey = unc['key'] as string | undefined;
        if (!ucKey || quantitativeKeys.has(ucKey)) return;
        if (confidenceEntry?.value) unc.value = confidenceEntry.value;
        if (confidenceEntry?.description) unc.description = confidenceEntry.description;
      });
    }
    // フラットフィールド同期（既存のまま）
    if (confidenceEntry?.value) p['qualitativeEval'] = confidenceEntry.value;
    if (confidenceEntry?.description != null) {
      p['qualitativeReason'] = confidenceEntry.description;
    } else if (confidenceEntry !== undefined) {
      p['qualitativeReason'] = null;
    }
  });
}
        });
      if (!hasQualitativeEntry) {
        if (!Array.isArray(p.uncertainty)) p.uncertainty = [];
        (p.uncertainty as Array<Record<string, unknown>>).push({
          key: DEFAULT_QUALITATIVE_UNCERTAINTY_KEY,
          value: confidenceEntry.value || null,
          description: confidenceEntry.description || null,
        });
      }
    }

    // 既存: uncertainty[] への書き込み
    if (Array.isArray(p.uncertainty) && p.uncertainty.length > 0) {
      (p.uncertainty as Array<Record<string, unknown>>).forEach((unc) => {
        const ucKey = unc['key'] as string | undefined;
        if (!ucKey || quantitativeKeys.has(ucKey)) return;
        if (confidenceEntry?.value) unc.value = confidenceEntry.value;
        if (confidenceEntry?.description) unc.description = confidenceEntry.description;
      });
    }
    // フラットフィールド同期（既存のまま）
    if (confidenceEntry?.value) p['qualitativeEval'] = confidenceEntry.value;
    if (confidenceEntry?.description != null) {
      p['qualitativeReason'] = confidenceEntry.description;
    } else if (confidenceEntry !== undefined) {
      p['qualitativeReason'] = null;
    }
  });
}
```

---

## 影響範囲

- `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx`（handleSave / handleSaveCorrection）
- `template_data.property_set`（uncertainty[] に `Alchemia:QualitativeEvaluation` エントリが追加される）
- 承認後の MAIML ファイル（`<uncertainty key="Alchemia:QualitativeEvaluation">` タグが出力される）

### 影響しない範囲
- テンプレート指定あり定性評価（既存キーあり）→ `hasQualitativeEntry = true` のためエントリ追加されない
- `maimlDataWriter.ts` → 変更不要
- 定量評価 → `quantitativeKeys` ヒットのため書き込み対象外

---

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| テンプレート指定あり定性評価に重複エントリ追加 | 高 | 低 | `hasQualitativeEntry` チェックで回避 |
| 既存の保存済みデータへの影響 | 低 | なし | 保存時のみ。既存 DB データは変更しない |
| `handleSaveCorrection` への適用漏れ | 中 | 中 | STEP 2 で明示的に対応 |

---

## テスト計画

- [ ] デフォルト定性評価を選択して「保存」→ `property_set.properties[].uncertainty[]` に `{ key: 'Alchemia:QualitativeEvaluation', value: '確か' }` が格納されること（DB 直接確認）
- [ ] 定性評価理由を入力して「保存」→ `uncertainty[].description` に入力値が格納されること
- [ ] 承認後の MAIML に `<uncertainty key="Alchemia:QualitativeEvaluation"><value>確か</value></uncertainty>` が出力されること
- [ ] テンプレート指定あり定性評価（既存キーあり）では `Alchemia:QualitativeEvaluation` エントリが重複追加されないこと
- [ ] 定量評価のみのプロパティに影響がないこと
- [ ] 訂正保存（handleSaveCorrection）でも同様に動作すること

---

## 承認記録
- **計画書提示日時**: 2026-09-25 17:00
- **承認日時**: 2026-09-25
- **承認者コメント**: Alchemia:QualitativeEvaluation はスペースなし（修正済み）

---

## 実施記録

### 実施日時
開始: 2026-09-25  
完了: 2026-09-25

### 変更ファイル
- `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx`

### 実施内容
- [x] STEP 1: `handleSave` に修正を追加（L2799 定数定義、L3007〜3025 デフォルトエントリ追加処理）
- [x] STEP 2: `handleSaveCorrection` に同様の修正を適用（L2862〜2880 デフォルトエントリ追加処理）

### 修正概要
`handleSave` / `handleSaveCorrection` の records 構築ループ内、定性評価書き込み処理の直前に以下を追加：
- `confidenceEntry` が存在し（定性評価値または定性評価理由がある）、かつ `uncertainty[]` に定性評価キーが存在しない場合、`'Alchemia:QualitativeEvaluation'` キーのエントリを `uncertainty[]` に push する
- テンプレート指定あり定性評価（既存キーあり）は `hasQualitativeEntry = true` となり追加されない
