# タスク計画書: PropertyValue要素なしテンプレートフィールド対応

## メタデータ

- **作成日時**: 2026-09-25 10:00
- **タスクID**: 20260925_1000
- **優先度**: 高
- **推定工数**: 2時間

---

## 1. タスク概要

JIS規格上、MAIMLファイルの `Property` タグの `value` 要素は入力なしが許容される。  
しかし現状、`buildDefaultTemplateValues` は `field.defaultValue` が存在する場合のみ
`templateValues` にエントリを生成する実装となっているため、`value` 要素を持たない Property
（`xsi:type` や `units` 属性のみが設定されたフィールド）が含まれるテンプレートでは
`templateValues` が空になる。

その結果、`experiment_plan` テーブルの `planned_value` JSONB カラムに各テンプレート
フィールドのエントリが生成されず、`buildInstructionDetailRows` がフィールドを見つけられないため
`experiment_instruction_detail` テーブルのレコードが作成されない。

---

## 2. 根本原因の分析

### 問題の連鎖

```
[MAIML] Property タグに value 要素なし
    ↓
[バックエンド] convertTemplate()
    → prop.value === undefined のため defaultValue を設定しない
    → TemplateDef.fields[].defaultValue = undefined

    ↓
[フロントエンド] buildDefaultTemplateValues()
    → field.defaultValue が undefined / null の場合はスキップ
    → 当該フィールドのエントリが templateValues に入らない

    ↓
[フロントエンド] tabDataToTransitionValues()
    → templateValues が空 or 当該フィールドのキーがない
    → planned_value JSONB に当該フィールドのキーが書き込まれない

    ↓
[バックエンド] buildInstructionDetailRows()
    → plannedValues[transitionId][fieldKey] が存在しない
    → experiment_instruction_detail レコードが生成されない ← 問題発生
```

### ポイント

- `buildDefaultTemplateValues` の目的は「ダイアログの初期表示用デフォルト値の生成」だが、
  **value 要素なしフィールドの存在を templateValues に登録する役割**も兼ねる必要がある。
- `value` がなくても `xsi:type` や `units` などの属性を持つ Property は
  フィールドとして存在を登録すべきである（値は空文字 `""` で初期化）。
- バックエンドの `buildInstructionDetailRows` では
  `value === ''`（空文字）の場合をスキップしていないが、
  `tabDataToTransitionValues` 側で `value !== ''` の場合のみ送信しているため
  空文字フィールドは最終的に planned_value に書き込まれない。
  → **空文字でも存在を保持して DB に書き込む必要がある**。

---

## 3. 目的と期待される成果

- [ ] `value` 要素がなく `xsi:type` / `units` 等の属性のみを持つ Property フィールドも
      `templateValues` に初期登録され（初期値は空文字 `""`）、
      ダイアログで表示・入力ができるようになる
- [ ] 上記フィールドを含む実験計画を保存した場合、`experiment_plan.planned_value` に
      当該フィールドのキーが書き込まれる（値は空文字でも可）
- [ ] `experiment_instruction_detail` のレコードが正常に生成される
      （`expected_value` が空文字 `""` のレコードとして登録される）
- [ ] 既存の `defaultValue` あり / なしの両パターンで動作が壊れていないこと

---

## 4. 実装ステップ

### Step 1: `buildDefaultTemplateValues` の修正（フロントエンド）

**ファイル**: `frontend/src/utils/experimentPlanHelpers.ts`

**変更内容**:

現在の実装:
```typescript
if (field.defaultValue !== undefined && field.defaultValue !== null) {
  values[`${tmpl.id}_${field.key}`] = field.defaultValue;
}
```

変更後:
- `defaultValue` の有無にかかわらず、すべてのフィールドを `templateValues` に登録する
- `defaultValue` がある場合はその値を使用、ない場合は空文字 `""` を使用

```typescript
// defaultValue があればその値、なければ空文字で初期登録
values[`${tmpl.id}_${field.key}`] = field.defaultValue ?? '';
```

**注意**: `insertion` 型フィールドは値入力対象外（表示専用）であり、
空文字で登録すると UI や保存処理に影響する可能性がある。
`xsiType === 'insertion'` の場合は従来通りスキップする。

### Step 2: `tabDataToTransitionValues` の修正（フロントエンド）

**ファイル**: `frontend/src/services/experimentPlanApiService.ts`

**変更内容**:

現在の実装では `value !== ''` のものだけ送信している:
```typescript
if (value !== null && value !== undefined && value !== '') {
  values[key] = String(value);
}
```

**課題**: 空文字 `""` も planned_value に書き込む必要がある。
ただし、`InputNumber` クリア時に `null` が来る場合の考慮は維持する。

変更後:
- `null` / `undefined` のみスキップ（`""` は通過させる）
- `boolean false` や `数値 0` は引き続き通過させる

```typescript
if (value !== null && value !== undefined) {
  values[key] = String(value);
}
```

### Step 3: `buildInstructionDetailRows` の修正（バックエンド）

**ファイル**: `backend/src/services/experimentPlanService.ts`

**現状確認**:
```typescript
if (value === null || value === undefined) continue;
if (typeof value !== 'string' && typeof value !== 'number') continue;
```
空文字 `""` は通過するが、`expectedValue: String(value)` = `""` で登録される。
`""` を持つレコードを生成するかどうかについては、**意図的にスキップするか登録するか**の
設計判断が必要。

**方針**:
`experiment_instruction_detail` は「予定値」テーブルであるため、
値が空文字のフィールドもレコードとして存在すること自体に意味がある
（作業者が後から値を入力できる枠として機能する）。
→ **空文字は許容してレコードを生成する**。

ただし現状コードはすでに空文字を通過させているため、**バックエンドの変更は不要**。

### Step 4: 動作確認

- [ ] value 要素なし（xsi:type のみ）の Property を含む MAIML でダイアログを開き、
      テンプレートフィールドが表示されることを確認
- [ ] 保存後、`experiment_plan.planned_value` に空文字フィールドが含まれることを確認
- [ ] `experiment_instruction_detail` にレコードが生成されることを確認
- [ ] value 要素あり（defaultValue 設定済み）フィールドの既存動作が壊れていないことを確認

---

## 5. 変更ファイル一覧

| # | ファイル | 変更内容 |
|---|---------|---------|
| 1 | `frontend/src/utils/experimentPlanHelpers.ts` | `buildDefaultTemplateValues`: insertion 以外の全フィールドを空文字デフォルトで登録 |
| 2 | `frontend/src/services/experimentPlanApiService.ts` | `tabDataToTransitionValues`: 空文字 `""` もスキップせず送信する |

※ バックエンドの `experimentPlanService.ts` は変更不要（空文字は既に通過させている）

---

## 6. 影響範囲

| 領域 | 影響内容 | 影響度 |
|------|---------|------|
| ExperimentPlanDialog 初期表示 | value なし Property のフィールドが初期値 `""` で表示される | 低（UI改善） |
| 実験計画保存処理 | 空文字フィールドも planned_value に書き込まれる | 低（データ増加） |
| experiment_instruction_detail 生成 | value なし Property のレコードが生成されるようになる | 中（機能修正） |
| 既存データの復元 | 復元時に空文字フィールドが増えるが機能影響なし | 低 |
| tabDataToTransitionValues | 空文字スキップを廃止することで 既存の `InputNumber` クリア時の null は引き続きスキップ | 低（null は除外維持） |

---

## 7. リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `insertion` 型フィールドに空文字が登録される | 中 | 中 | `xsiType === 'insertion'` の場合はスキップする条件を追加 |
| 既存の `InputNumber` クリア時の挙動変化 | 低 | 低 | `null` / `undefined` のスキップは維持するため影響なし |
| planned_value の JSONB サイズ増加 | 低 | 低 | 増加は空文字 `""` の分のみで実害なし |

---

## 8. テスト計画

### 手動テスト

- [ ] value 要素なしの Property を含む MAIML テンプレートで実験計画ダイアログを開く
- [ ] テンプレートフィールドが（空の入力欄として）表示されること
- [ ] フィールドに値を入力せず保存 → `experiment_instruction_detail` にレコードが生成されること
- [ ] フィールドに値を入力して保存 → 値が正しく保存されること
- [ ] value 要素ありの既存テンプレートで動作が変わっていないこと

---

## 9. 承認記録

- **計画書提示日時**: 2026-09-25 10:00
- **承認日時**: 2026-09-25 10:30
- **承認者コメント**: 承認。復元処理（experimentPlansToTabDataMap）への影響調査も実施済み・変更不要を確認。

## 10. 実施記録

### 実施日時
開始: 2026-09-25 10:30  
完了: 2026-09-25 10:40

### 変更ファイル
1. `frontend/src/utils/experimentPlanHelpers.ts` - `buildDefaultTemplateValues` 修正
2. `frontend/src/services/experimentPlanApiService.ts` - `tabDataToTransitionValues` 修正

### 計画からの変更点
なし（計画通り実施）

### 最終的な成果物
- [x] `buildDefaultTemplateValues`: insertion 以外の全フィールドを空文字デフォルトで登録するよう変更
- [x] `tabDataToTransitionValues`: 空文字 `""` のスキップを廃止（null/undefined のみスキップ）
- [x] TypeScript コンパイルエラーなし（`npx tsc --noEmit` でエラー0件確認）
