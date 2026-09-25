# タスク計画書: WorkRecordPanel 定量評価入力欄バグ修正

## メタデータ

- **作成日時**: 2026-09-25
- **タスクID**: 20260925_WorkRecordPanel_定量評価入力欄バグ修正
- **優先度**: 高
- **推定工数**: 3時間

---

## タスク概要

`frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` の定量評価入力欄に関する4件のバグを修正する。フロントエンド3件・バックエンド1件（SQL／Repository／Service の3ファイルにまたがる）の修正を行う。

---

## 不具合一覧と根本原因

### ① 定量評価指定がない場合でも入力欄が表示される

**根本原因:**
`addedValues` 初期化（378行目）で `prop.quantitativeUncertainties` が未設定・空の場合に空行 `{ id: 'initial', uncertaintyKey: '', value: '' }` を1件返す。描画側（602行目）は `!readOnly` のみ条件で `addedValues` に要素がある限り常に入力行を描画してしまう。

**修正方針:**
定量評価欄（タイトル・追加ボタン）は常に `!readOnly` で表示したまま、`addedValues` の初期値を空配列 `[]` に変更することで、デフォルトの空行1件だけ表示されてしまう問題を解消する。ユーザーが「値を追加」ボタンを押した時のみ行が追加される形にする。

**修正箇所:** `WorkRecordPanel.tsx` 378行目のみ

---

### ② 不確かさ基準の表示名がない場合にキーへのフォールバックがない

**根本原因:**
617行目が `qInfo.uncertaintyName ?? t('workRecord.uncertaintyValue')` となっており、`uncertaintyName` 未設定時に `uncertaintyKey` ではなく翻訳文字列にフォールバックしている。

**修正箇所:** `WorkRecordPanel.tsx` 617行目

---

### ③ `toleranceValue`（許容値）が空で渡ってくる

**根本原因が2つある:**

**原因A — SQLが `tolerance_upper` / `tolerance_lower` を取得していない:**
`findByKeysWithDetails.sql` の SELECT 句に `uc.tolerance_upper` / `uc.tolerance_lower` が含まれていない。これにより `UncertaintyKeyDetail` 型の `detail` オブジェクトに許容値情報が含まれない。

**原因B — 計画段階のMAIMLの `<uncertainty>` タグには `<value>` 要素がない:**
`convertPropertyForFallback`（725行目）が `unc.value`（MAIMLの `<uncertainty><value>` 要素）から `toleranceValue` を生成しようとしているが、計画段階のMAIMLでは `<value>` 要素が存在しない。許容値はDB（`uncertainty_criteria.tolerance_upper` / `tolerance_lower`）に保存されているため、`unc.value` は常に `null` になる。

**修正箇所:**
- `backend/src/sql/queries/uncertainty_criteria/findByKeysWithDetails.sql`
- `backend/src/repositories/uncertaintyCriteriaRepository.ts`
- `backend/src/services/experimentDataService.ts`

**許容値の表示形式:** `"{lower} ~ {upper}"`（例: `"0.5 ~ 1.5"`）

---

### ④ デフォルト設定の `addedValue` で不確かさキーのSelectが変更可能

**根本原因:**
プリセット行も手動追加行も同一の `<Select>` を使用しており `disabled` 属性がない。`AddedUncertaintyValue` 型にプリセット行か否かを示すフラグがないため描画時に区別できない。

**修正箇所:** `WorkRecordPanel.tsx`（型定義・初期化・描画）

---

## 実装ステップ

### STEP 1: SQL修正

**ファイル:** `backend/src/sql/queries/uncertainty_criteria/findByKeysWithDetails.sql`

- [ ] `uc.tolerance_upper AS "toleranceUpper"` を SELECT 句に追加
- [ ] `uc.tolerance_lower AS "toleranceLower"` を SELECT 句に追加
- [ ] `uc.tolerance_upper` / `uc.tolerance_lower` を `GROUP BY` 句に追加

### STEP 2: Repository修正

**ファイル:** `backend/src/repositories/uncertaintyCriteriaRepository.ts`

- [ ] `UncertaintyKeyDetail` インターフェースに `toleranceUpper: number | null` / `toleranceLower: number | null` を追加
- [ ] `findByKeysWithDetails` 関数内のクエリ型アノテーションに `toleranceUpper` / `toleranceLower` を追加
- [ ] `rows.map` のマッピングに `toleranceUpper: r.toleranceUpper ?? null` / `toleranceLower: r.toleranceLower ?? null` を追加

### STEP 3: Service修正

**ファイル:** `backend/src/services/experimentDataService.ts`

- [ ] `convertPropertyForFallback` 内の `const tv = unc.value != null ? String(unc.value) : null;` を削除
- [ ] `detail?.toleranceUpper` / `detail?.toleranceLower` から `"{lower} ~ {upper}"` 形式の文字列を生成するロジックに置き換え（両方 `null` でない場合のみ生成、いずれか `null` なら `null`）
- [ ] `toleranceValue`（後方互換単一フィールド）も同じロジックで生成
- [ ] `uncertaintyName` 取得を `detail?.termDisplayName ?? detail?.uncertaintyName ?? null` に修正

### STEP 4: フロントエンド修正① — `isPreset` フラグ追加（不具合④）

**ファイル:** `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx`

- [ ] `AddedUncertaintyValue` 型（70行目〜）に `isPreset?: boolean` フィールドを追加
- [ ] `prop.quantitativeUncertainties` からプリセット生成する行（364行目〜）に `isPreset: true` を設定

### STEP 5: フロントエンド修正② — 初期値修正（不具合①）

**ファイル:** `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx`

- [ ] 378行目の `return [{ id: 'initial', uncertaintyKey: '', value: '' }];` を `return [];` に変更（空配列を返すことでデフォルトの空行1件が表示されなくなる）
- [ ] 描画条件（602行目）は変更しない（定量評価欄・追加ボタン自体は引き続き表示する）

### STEP 6: フロントエンド修正③ — 表示名フォールバック修正（不具合②）

**ファイル:** `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx`

- [ ] 617行目を `{qInfo.uncertaintyName || qInfo.uncertaintyKey || t('workRecord.uncertaintyValue')}` に変更

### STEP 7: フロントエンド修正④ — プリセット行のSelect固定化（不具合④）

**ファイル:** `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx`

- [ ] 634〜641行目の `<Select>` に `disabled={!!av.isPreset}` を追加

---

## 変更ファイル一覧

| # | ファイル | 変更種別 | 対応STEP |
|---|---------|---------|---------|
| 1 | `backend/src/sql/queries/uncertainty_criteria/findByKeysWithDetails.sql` | 修正 | STEP 1 |
| 2 | `backend/src/repositories/uncertaintyCriteriaRepository.ts` | 修正 | STEP 2 |
| 3 | `backend/src/services/experimentDataService.ts` | 修正 | STEP 3 |
| 4 | `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` | 修正 | STEP 4〜7 |

---

## 影響範囲

- `findByKeysWithDetails` の呼び出し元は `experimentDataService.ts` のみ
- `convertPropertyForFallback` はフォールバックパス・実績データありパス両方から呼ばれる
- `ToleranceValueEntry.toleranceValue` の型（`string | null`）は変更不要
- `AddedUncertaintyValue` 型は `WorkRecordPanel.tsx` 内部ローカル型のため外部影響なし

---

## リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `tolerance_upper` / `tolerance_lower` が両方 `null` のデータが存在する場合 `toleranceValue` が `null` になる | 中 | 低（両方必須登録） | 既存の `qInfo.toleranceValue !== undefined` 条件でスキップされるため表示に問題なし |
| STEP 5 で定量評価欄の `addedValues` 初期値を空配列にした場合、デフォルト行が消えることで手動追加が必要なことに気づかないユーザーが出る可能性 | 低 | 低（「値を追加」ボタンが常に表示される） | ボタン表示を維持するため操作方法は変わらない |

---

## テスト計画

### 手動テスト
- [ ] `quantitativeUncertainties` 設定ありプロパティカード → 定量評価入力欄が表示される
- [ ] `quantitativeUncertainties` 未設定プロパティカード → 定量評価入力欄が表示されない
- [ ] プリセット行の不確かさキーSelectが変更不可（disabled）になっている
- [ ] 手動追加行の不確かさキーSelectが変更可能になっている
- [ ] `uncertaintyName` がないプリセット行で `uncertaintyKey` が表示名として表示される
- [ ] 許容値が `"lower ~ upper"` 形式で表示される

---

## 承認記録

- **計画書提示日時**: 2026-09-25
- **承認日時**: 2026-09-25
- **承認者コメント**: 承認します。

## 実施記録

### 実施日時
開始: 2026-09-25
完了: 2026-09-25

### 最終的な成果物
- [x] STEP 1: `findByKeysWithDetails.sql` に `tolerance_upper` / `tolerance_lower` を追加
- [x] STEP 2: `UncertaintyKeyDetail` 型と `findByKeysWithDetails` 関数に `toleranceUpper` / `toleranceLower` を追加
- [x] STEP 3: `convertPropertyForFallback` の `toleranceValue` 生成を `unc.value` → DB値（`"{lower} ~ {upper}"`）に変更。`uncertaintyName` フォールバックも修正
- [x] STEP 4: `AddedUncertaintyValue` 型に `isPreset?: boolean` 追加。プリセット行に `isPreset: true` 設定
- [x] STEP 5: `addedValues` 初期値を空配列 `[]` に変更（デフォルトの空行1件が表示されなくなる）
- [x] STEP 6: 617行目の表示名フォールバックを `uncertaintyName || uncertaintyKey || t(...)` に変更
- [x] STEP 7: プリセット行の `<Select>` に `disabled={!!av.isPreset}` を追加

### TypeScript ビルド結果
- バックエンド: `tsc --noEmit` → エラーなし（exit:0）
- フロントエンド: `tsc --noEmit` → エラーなし（exit:0）
