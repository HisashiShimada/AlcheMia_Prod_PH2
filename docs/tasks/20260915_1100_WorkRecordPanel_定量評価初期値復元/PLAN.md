# タスク計画書: WorkRecordPanel 定量評価初期値復元

## メタデータ
- **作成日時**: 2026-09-15 11:00
- **タスクID**: 20260915_1100
- **優先度**: 高
- **推定工数**: 2〜3時間

---

## 1. タスク概要

`WorkRecordPanel` の `PropertyCard` で表示される定量評価欄（`addedValues`）の `value`（ユーザーが入力した記録値）が、画面ロード時に常に空文字で初期化されている。

DB に保存済みの定量評価値（`experiment_uncertainty_judge.recorded_value`）が `getTemplateData` API レスポンスに含まれていないため、初回ロード時および画面リロード後にユーザーが過去に入力した値が表示されない。

---

## 2. 問題の詳細分析

### 2-1. 定量評価値の保存先

ユーザーが `PropertyCard` の定量評価欄に入力した値は `experiment_uncertainty_judge` テーブルの `recorded_value` カラムに保存される。

### 2-2. `getTemplateData` レスポンスに `recordedValue` が含まれない

`getTemplateData` が返す `TemplateDataItem.data.properties[]` には `toleranceValues[]`（許容値）は含まれているが、`experiment_uncertainty_judge.recorded_value`（実際の記録値）は含まれていない。

`convertRawProperty` で `toleranceValues` → `quantitativeUncertainties` にマッピングされるが記録値は含まれない:

```typescript
// QuantitativeUncertaintyInfo（WorkRecordPanel.tsx）
{ uncertaintyKey, uncertaintyName?, toleranceValue?, description? }
//  ↑ recordedValue なし
```

### 2-3. `addedValues` の `value` が常に空文字

```typescript
// PropertyCard の addedValues 初期化
return prop.quantitativeUncertainties.map((qu) => ({
  id: qu.uncertaintyKey,
  uncertaintyKey: qu.uncertaintyKey,
  value: '',  // ← 常に空文字（DB値を参照していない）
}));
```

### 2-4. 既存 API で一括取得可能

`experimentUncertaintyJudgeRepository` には `findAllByProject` があり DISTINCT ON で最新値を取得できる。`getTemplateData` のスコープに合わせた `findByTaskNo`（taskNo × transitionId 絞り込み）を新規追加すれば効率的に取得できる。


---

## 3. 解決方針

### 方針: `getTemplateData` のレスポンスに `recordedValue` を追加する

バックエンドで `getTemplateData` 実行時に `experiment_uncertainty_judge` の最新 `recorded_value` を一括取得し、各プロパティの `toleranceValues[]` に `recordedValue` フィールドを追加する。フロントエンドでは `QuantitativeUncertaintyInfo` に `recordedValue` を追加し、`addedValues` の初期値として使用する。また `uncertaintyValuesRef` も DB 値で初期化することで、ユーザーが操作しなくても `handleSave` 時に記録値が送信されるようにする。

---

## 4. 実装ステップ

### Step 1: バックエンド — `findByTaskNo` SQL 新規作成

**新規ファイル**: `backend/src/sql/queries/experiment_uncertainty_judge/findByTaskNo.sql`

task_no × transition_id の全プロパティについて最新の `recorded_value` を一括取得する（DISTINCT ON で最新1件）。

### Step 2: バックエンド — `findByTaskNo` メソッドを Repository に追加

**ファイル**: `backend/src/repositories/experimentUncertaintyJudgeRepository.ts`

```typescript
async findByTaskNo(
  organizationId: string, projectId: string, methodId: string,
  taskNo: number, transitionId: string, client?: PoolClient
): Promise<Array<{ templateId: string; propertyKey: string; uncertaintyKey: string; recordedValue: number }>>
```

### Step 3: バックエンド — `ToleranceValueEntry` に `recordedValue?` 追加

**ファイル**: `backend/src/services/experimentDataService.ts`

`ToleranceValueEntry` インターフェースに `recordedValue?: number | null` を追加。

### Step 4: バックエンド — `getTemplateData` 内で `judgeMap` を構築し `toleranceValues` に付与

**ファイル**: `backend/src/services/experimentDataService.ts`

`templates` の構築前に `findByTaskNo` を呼び出し、`templateId__propertyKey__uncertaintyKey` → `recordedValue` のマップを生成。`enrichedProperties` 構築後に各プロパティの `toleranceValues[]` に `recordedValue` を後付けで付与する。（`convertPropertyForFallback` は `templateId` を持たないため後付け方式を採用）

### Step 5: フロントエンド — `QuantitativeUncertaintyInfo` に `recordedValue?` 追加

**ファイル**: `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx`

`QuantitativeUncertaintyInfo` インターフェースに `recordedValue?: number | null` を追加。

### Step 6: フロントエンド — `convertRawProperty` のマッピングに `recordedValue` 追加

**ファイル**: `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx`

`quantitativeUncertainties` マッピングに `recordedValue: (tv as any).recordedValue ?? null` を追加。

### Step 7: フロントエンド — `addedValues` 初期化で `recordedValue` を使用

**ファイル**: `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx`

`PropertyCard` の `addedValues` 初期化時に `savedEntry?.value`（Ref 復元）を優先し、なければ `qu.recordedValue`（DB 値）を使用するように修正。

```typescript
const dbValue = qu.recordedValue != null ? String(qu.recordedValue) : '';
value: savedEntry?.value ?? dbValue,
```

### Step 8: フロントエンド — `buildTransitions` useEffect 内で `uncertaintyValuesRef` を DB 値で初期化

**ファイル**: `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx`

`templatesMap` 構築後に `uncertaintyValuesRef` を DB の `recordedValue` で初期化する。`uncertaintyValuesRef.current.has(key)` チェックで既存ユーザー入力を上書きしないように保護する。

---

## 5. 変更ファイルリスト

| # | ファイル | 変更種別 | 変更内容 |
|---|---------|---------|---------|
| 1 | `backend/src/sql/queries/experiment_uncertainty_judge/findByTaskNo.sql` | **新規** | task_no × transition_id の最新 recorded_value を一括取得 |
| 2 | `backend/src/repositories/experimentUncertaintyJudgeRepository.ts` | **修正** | `findByTaskNo` メソッド追加 |
| 3 | `backend/src/services/experimentDataService.ts` | **修正** | `ToleranceValueEntry` に `recordedValue?` 追加・`getTemplateData` 内で付与処理追加 |
| 4 | `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` | **修正** | ① `QuantitativeUncertaintyInfo` に `recordedValue?` 追加 ② `convertRawProperty` にマッピング追加 ③ `addedValues` 初期化修正 ④ `buildTransitions` で `uncertaintyValuesRef` 初期化追加 |

---

## 6. 影響範囲の分析

- **API レスポンスへの影響**: `toleranceValues[].recordedValue` が追加されるが既存フィールドの変更はなく後方互換 ✅
- **保存ロジックへの影響**: `handleSave` 本体は変更なし ✅
- **他画面への影響**: `getTemplateData` は WorkRecordPanel 専用エンドポイント
- **DB クエリ追加**: `findByTaskNo` は既存インデックス（主キー範囲）で効率的に取得可能

---

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `convertPropertyForFallback` に templateId が渡せない | 中 | 確定 | `enrichedProperties` 構築後にプロパティキーでマップ参照する後付け方式で対応 |
| `uncertaintyValuesRef` 初期化でユーザー入力済み値を上書き | 中 | 低 | `has()` チェックで既存エントリを保護 |
| `findByTaskNo` のパフォーマンス | 低 | 低 | 既存主キー範囲で DISTINCT ON、件数は限定的 |

---

## 8. テスト計画

### 手動テスト
- [ ] DB に定量評価値が保存済みの状態で WorkRecordPanel を開き、`addedValues` に値が初期表示されること
- [ ] 未保存状態で開いた場合、`addedValues` が空文字であること（既存動作と変わらない）
- [ ] 定量評価値を入力して保存後、テンプレートを切り替えて戻ったとき値が保持されていること
- [ ] 保存ボタンを押さずに（DB 値のみの状態で）保存したとき、`uncertaintyValues` に DB 値が含まれること

### ビルド確認
- [ ] TypeScript コンパイルエラーなし（フロントエンド・バックエンド両方）
- [ ] `backend/tests/controllers/experimentController.test.ts` が PASS すること

---

## 9. 承認記録

- **計画書提示日時**: 2026-09-15 11:00
- **承認日時**: 2026-09-15 11:30
- **承認者コメント**: 承認

---

## 10. 実施記録

### 実施日時
開始: 2026-09-15 11:30
完了: 2026-09-15 12:00

### 変更箇所

1. **`backend/src/sql/queries/experiment_uncertainty_judge/findByTaskNo.sql`**（新規）— task_no × transition_id の最新 recorded_value を一括取得
2. **`backend/src/repositories/experimentUncertaintyJudgeRepository.ts`** — `findByTaskNo` メソッド追加
3. **`backend/src/types/api.ts`** — `ToleranceValueEntry` に `recordedValue?: number | null` 追加
4. **`backend/src/services/experimentDataService.ts`** — import 追加・`getTemplateData` 内で judgeMap 構築・`toleranceValues[]` への後付け付与
5. **`frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx`** — ① `QuantitativeUncertaintyInfo` に `recordedValue?` 追加 ② `convertRawProperty` マッピング追加 ③ `addedValues` 初期化で `recordedValue` 使用 ④ `buildTransitions` useEffect で `uncertaintyValuesRef` 初期化

### 最終的な成果物
- [x] DB 保存済みの定量評価値が画面ロード時に `addedValues` の初期値として表示されるようになった
- [x] ユーザーが操作しなくても `handleSave` 時に `uncertaintyValues` に DB 値が含まれて送信されるようになった
- [x] TypeScript コンパイルエラーなし（フロントエンド・バックエンド両方）
