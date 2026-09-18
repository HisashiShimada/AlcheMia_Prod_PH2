# タスク計画書: チェックアウト時 実験計画想定値 MAIML 書き込み修正（key 変換）

## メタデータ
- **作成日時**: 2026-09-18 11:00（再調査後修正）
- **タスクID**: 20260918_1100_チェックアウト時指示内容MAIML書き込み修正
- **優先度**: 高
- **推定工数**: 1〜2時間

---

## 1. タスク概要

`ExperimentPlanDialog` で設定した `experiment_plan.planned_values` のテンプレート想定値を、
チェックアウト時に MAIML ファイルの `<data>` タグに `<results>` として書き込む処理が
正しく動いていない。

**根本的な問題**: 現在の実装は `planned_values` → `template_data` を経由して
`buildDataXML()` で `<results>` を生成する設計になっているが、
チェックアウト時点では `template_data` は空（実績値がまだない）のため何も出力されない。
また、書き込む際に property の key を `{prefix}:SupervisorDirective{localName}` 形式に
変換する処理が欠落している。

---

## 2. 期待される MAIML 出力（サンプルより）

テンプレートの property key が `material:material1` で `planned_values` に `49.5` が設定されている場合：

```xml
<data id="dataID">
  <uuid>...</uuid>
  <results id="results_method_xxx_1">
    <uuid>...</uuid>
    <material id="data-material-yyy" ref="materialTemplate_zzz">
      <uuid>...</uuid>
      <!-- prop_key を SupervisorDirective 付きに変換して出力 -->
      <property key="material:SupervisorDirectivematerial1" units="mL" xsi:type="floatType">
        <value>49.5</value>
      </property>
    </material>
    <condition id="data-condition-yyy" ref="conditionTemplate_zzz">
      <uuid>...</uuid>
      <property key="condition:SupervisorDirectivecondition1" units="s" xsi:type="intType">
        <value>30</value>
      </property>
    </condition>
  </results>
</data>
```

**変換規則**: `{prefix}:{localName}` → `{prefix}:SupervisorDirective{localName}`

---

## 3. `planned_values` の構造（実際）

```json
{
  "transitionId-xxx": {
    "materialTemplate_yyy_material:material1": "49.5",
    "conditionTemplate_zzz_condition:condition1": "30"
  },
  "__meta__": { "transitionOrder": [...] }
}
```

- キー形式: `{templateId}_{prop_key}` または `{prop_key}` 単独
- `prop_key` 自体は `{prefix}:{localName}` 形式（例: `material:material1`）
- `templateId` からどの `<material>/<condition>/<result>` に属するかが分かる

---

## 4. 原因分析

### 現在の処理フロー（問題）

```
writeExperimentPlanProperties()
  Step 3: updatePropertySetByPlan()
    → template_data.property_set.properties[].value を想定値で上書き
    → ただしチェックアウト時点は template_data が空 → no-op
  Step 7: buildDataXML(template_data)
    → template_data が空 → <results> に何も出力されない
```

### あるべき処理フロー

```
writeExperimentPlanProperties()
  planned_values を直接読み込む
  → templateId × prop_key × value を抽出
  → prop_key を SupervisorDirective 付きに変換
  → <results> XML を生成
  → MAIML の <data> タグに追記（replaceDataSection）
```

`template_data` を経由させる必要はなく、`planned_values` だけで `<results>` XML を生成できる。

---

## 5. 修正方針

**`planned_values` から直接 `<results>` XML を生成する独立した処理を新規作成する。**

- `maimlDataWriter.ts` に新関数 `buildPlannedValuesResultsXML()` を追加
- `writeExperimentPlanProperties()` の Step 7 でこの関数を呼び出す
- `template_data` への書き込み（Step 3）はチェックアウト時は不要なので削除対象（または無効化）

---

## 6. 変更ファイル

| # | ファイル | 変更内容 |
|---|---------|---------|
| 1 | `backend/src/utils/maimlDataWriter.ts` | `buildPlannedValuesResultsXML()` 新規追加 |
| 2 | `backend/src/services/maimlWriterService.ts` | Step 7 を新関数呼び出しに差し替え。Step 3（`updatePropertySetByPlan`）は削除 |

---

## 7. 実装詳細

### Step 1: `maimlDataWriter.ts` — `buildPlannedValuesResultsXML()` 新規追加

```typescript
/**
 * experiment_plan.planned_values から <data><results> XML を生成する
 *
 * planned_values の各 fieldKey を {prefix}:SupervisorDirective{localName} に変換して
 * <property> タグとして出力する。
 *
 * @param experimentPlans - experiment_plan テーブルのレコード一覧
 * @param dataId          - <data> タグの id 属性（デフォルト: 'dataID'）
 * @param existingUuids   - 既存 MAIML から抽出した UUID マップ
 */
export function buildPlannedValuesResultsXML(
  experimentPlans: ExperimentPlan[],
  dataId: string = 'dataID',
  existingUuids?: Map<string, string>
): string {
  // method_id × task_no でグルーピング
  // { planKey: { templateId: { prop_key: value }[] } }
  ...

  // fieldKey から templateId と propKey を解析する
  // fieldKey 形式: "{templateId}_{propKey}" または "{propKey}" 単独
  // propKey 形式: "{prefix}:{localName}"

  // propKey を SupervisorDirective 付きに変換
  // "{prefix}:{localName}" → "{prefix}:SupervisorDirective{localName}"
  const colonIdx = propKey.indexOf(':');
  if (colonIdx > 0) {
    const prefix = propKey.slice(0, colonIdx);
    const localName = propKey.slice(colonIdx + 1);
    outputKey = `${prefix}:SupervisorDirective${localName}`;
  }
}
```

### Step 2: `maimlWriterService.ts` — Step 3 削除・Step 7 差し替え

```typescript
// Step 3: template_data への書き込みを削除
// （チェックアウト時は planned_values から直接 XML 生成するため不要）

// Step 7（差し替え）: planned_values から直接 <results> XML を生成
const dataXml = buildPlannedValuesResultsXML(experimentPlans, dataId, existingUuids);
maimlContent = this._replaceDataSection(maimlContent, dataXml);
```

---

## 8. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `template_data` 書き込み削除による既存機能への影響 | 中 | 低 | Step 3 は `writeExperimentPlanProperties` 内のみに閉じており他からは呼ばれていない |
| コロンなし key（プレフィックスなし用語）が変換されない | 低 | 低 | `colonIdx > 0` チェックで除外。変換せずそのまま出力する |
| `planned_values` が空のプロジェクトで `<data>` が消える | 中 | 低 | 空の場合は `<data>` 置換をスキップする |

---

## 9. テスト計画

- [ ] `cd backend && npx tsc --noEmit` がエラーなし
- [ ] チェックアウト後の MAIML を手動確認
  - `planned_values` に値がある property が `SupervisorDirective` 付きkeyで `<results>` に出力される
  - `planned_values` が空の場合は `<data>` が変更されない（または空 `<results>` で出力される）
- [ ] 既存の `buildDataXML()` を使う他の処理（`writeDataAndEventLog` 等）が影響を受けないこと

---

## 10. 承認記録

- **計画書提示日時**: 2026-09-18 11:00（修正版）
- **承認日時**: 2026-09-18
- **承認者コメント**: 承認します。

## 11. 実施記録

開始: 2026-09-18　完了: 2026-09-18

### 変更内容

1. `backend/src/utils/maimlDataWriter.ts`
   - `import type { ExperimentPlan } from '../types/database'` を追加
   - `buildPlannedValuesResultsXML()` 関数を新規追加（ファイル末尾）
     - `planned_values` の fieldKey を `{templateId}_{propKey}` パターンで解析
     - `propKey`（`{prefix}:{localName}`）を `{prefix}:SupervisorDirective{localName}` に変換
     - method_id × task_no ごとに `<results>` を生成して `<data>` XML を返す
     - `planned_values` が空の場合は空文字列を返す（置換スキップ）

2. `backend/src/services/maimlWriterService.ts`
   - `buildPlannedValuesResultsXML` を import に追加
   - `writeExperimentPlanProperties()` の Step 3〜7b を全面置き換え
     - 削除: `template_data` への書き込み（`updatePropertySetByPlan`）・DB取得・`buildDataXML` 呼び出し・`mgr-instruction` 注入
     - 追加: `buildPlannedValuesResultsXML()` 呼び出しと `_replaceDataSection()` による置換
   - 不要になった `pool`・`templateDataRepo` の宣言を削除
   - ログ出力の変数参照（`updatedCount`・`templateDataRows`）を修正

