# タスク計画書: 定性評価デフォルト削除と訂正バリデーション

## メタデータ

- **作成日時**: 2026-09-02 10:00
- **タスクID**: 20260902_1000
- **優先度**: 高
- **推定工数**: 4〜6時間

---

## 1. タスク概要

不確かさ基準（Uncertainty）の定性評価に関して、以下3点の修正を行う。

1. **定性評価のデフォルト選択肢を削除**  
   `is_default` という概念自体が定性評価には不要なため、DBカラム・バックエンド型・フロントエンドUIのすべてから削除する。

2. **指示出し時のデフォルト設定を削除**  
   `UncertaintyCriteriaSelectorPanel` で不確かさ基準を選択した際に `is_default=true` の選択肢が自動選択される処理を削除する。

3. **作業者画面の訂正時に定性評価の未選択をエラーにする**  
   定性評価ボタン（確か・要確認・不確か）の表示ロジックは変えず、訂正保存時に `confidenceValuesRef` に1件もエントリが存在しない場合はエラーメッセージを表示して処理を中断する。

---

## 2. 目的と期待される成果

- [x] `intuition_selector.is_default` カラムがDBから削除されている
- [x] バックエンド全レイヤーから `isDefault` 関連の型・ロジックが削除されている
- [x] `QualitativeOptionEditor` の「デフォルト」列・ラジオボタンが非表示になっている
- [x] `UncertaintyCreateModal`/`UncertaintyDetailModal` で定性モード切替時にデフォルト選択肢が生成されない
- [x] `UncertaintyCriteriaSelectorPanel` で基準選択時に定性値が自動選択されない
- [x] `WorkRecordPanel.PropertyCard` の定性評価ボタンは従来通り表示される（`DEFAULT_CONFIDENCE_OPTIONS` フォールバックは維持）
- [x] `WorkRecordPanel.handleSaveCorrection` で定性評価が表示されているプロパティに対して何も選択していない場合にエラーで中断される（定性ボタン自体の表示は変わらない）

---

## 3. 影響範囲

### DB・DDLドキュメント

| ファイル | 変更内容 |
|---|---|
| `backend/migrations/20260902_1000_drop_is_default_from_intuition_selector.sql` | 新規作成 |
| `docs/design/db/ddl/intuition_selector.sql` | `is_default` カラム・コメント・インデックス削除 |

### バックエンド SQL

| ファイル | 変更内容 |
|---|---|
| `backend/src/sql/queries/uncertainty_criteria/findByKey.sql` | `is_default` 列削除 |
| `backend/src/sql/queries/uncertainty_criteria/findForSelector.sql` | `is_default` 列削除 |
| `backend/src/sql/queries/uncertainty_criteria/findByKeysWithDetails.sql` | `json_build_object` から `isDefault` 削除 |
| `backend/src/sql/queries/uncertainty_criteria/insertIntuitionSelector.sql` | `is_default`・`$8` 削除、後続パラメータ繰り上げ |

### バックエンド Repository・テスト

| ファイル | 変更内容 |
|---|---|
| `backend/src/repositories/uncertaintyCriteriaRepository.ts` | `QualitativeOptionRow.isDefault` 削除、`InsertNewVersionRequest` 選択肢型から `isDefault` 削除、`opt.isDefault` 渡し削除 |
| `backend/tests/phase2/repositories/uncertaintyCriteriaRepository.phase2.test.ts` | テストデータから `isDefault` 削除 |
| `backend/tests/phase2/controllers/uncertaintyCriteriaController.phase2.test.ts` | テストデータから `isDefault` 削除 |

### フロントエンド

| ファイル | 変更内容 |
|---|---|
| `frontend/src/services/uncertaintyCriteriaApiService.ts` | `QualitativeOptionApiRow.isDefault` / `SaveQualitativeOption.isDefault` 削除 |
| `frontend/src/components/uncertainty/QualitativeOptionEditor.tsx` | `isDefault` フィールド・「デフォルト」列UI・`handleSetDefault` 削除 |
| `frontend/src/components/uncertainty/UncertaintyCreateModal.tsx` | `DEFAULT_OPTIONS` を `[]` に変更、保存時 `isDefault` マッピング削除 |
| `frontend/src/components/uncertainty/UncertaintyDetailModal.tsx` | `isDefault` 参照・マッピング削除、差分比較から `defaultMark` 削除 |
| `frontend/src/components/uncertainty/UncertaintyCriteriaSelectorModal.tsx` | `QualitativeOption.isDefault` 削除 |
| `frontend/src/components/uncertainty/UncertaintyCriteriaSelectorPanel.tsx` | `defaultOpt` 自動選択削除 → `setQualValue(null)` に統一 |
| `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` | `handleSaveCorrection` に未選択バリデーション追加（定性UIの表示ロジック自体は変更しない） |
| `frontend/src/locales/ja.json` | `defaultMark` 削除、訂正未選択エラーキー追加 |
| `frontend/src/locales/en.json` | 同上（英語版） |

---

## 4. 実装ステップ

### STEP 1: DBマイグレーション作成
- [x] `backend/migrations/20260902_1000_drop_is_default_from_intuition_selector.sql` 新規作成
  - `DROP INDEX IF EXISTS idx_intuition_selector_default`
  - `ALTER TABLE intuition_selector DROP COLUMN IF EXISTS is_default`

### STEP 2: DDLドキュメント更新
- [x] `docs/design/db/ddl/intuition_selector.sql` : `is_default` カラム・コメント・インデックス削除

### STEP 3: バックエンド SQL 更新
- [x] `findByKey.sql` : `ins.is_default AS "isDefault"` 行削除
- [x] `findForSelector.sql` : `ins.is_default AS "isDefault"` 行削除
- [x] `findByKeysWithDetails.sql` : `json_build_object` 内の `'isDefault', ins.is_default` 削除
- [x] `insertIntuitionSelector.sql` : `is_default` カラム記述・`$8` 削除、`$9`（`create_user_id`）→ `$8` に繰り上げ

### STEP 4: バックエンド Repository 更新
- [x] `QualitativeOptionRow.isDefault: boolean` 削除
- [x] `InsertNewVersionRequest` 内の選択肢型から `isDefault` 削除
- [x] `insertNewVersion` の `t.none` 呼び出しから `opt.isDefault` を削除

### STEP 5: バックエンドテスト更新
- [x] `uncertaintyCriteriaRepository.phase2.test.ts` : `isDefault` フィールド全削除
- [x] `uncertaintyCriteriaController.phase2.test.ts` : `isDefault` フィールド全削除

### STEP 6: フロントエンド サービス型更新
- [x] `uncertaintyCriteriaApiService.ts` : `QualitativeOptionApiRow.isDefault` / `SaveQualitativeOption.isDefault` 削除

### STEP 7: `QualitativeOptionEditor.tsx` 更新
- [x] `QualitativeOption.isDefault: boolean` フィールド削除
- [x] `SortableRowProps` の `onSetDefault` prop 削除
- [x] `SortableRow` コンポーネントのラジオボタン JSX 削除
- [x] ヘッダー行「デフォルト」列 `<span>` 削除
- [x] `QualitativeOptionEditor` 本体の `handleSetDefault` ハンドラ削除

### STEP 8: `UncertaintyCreateModal.tsx` 更新
- [x] `DEFAULT_OPTIONS` を `[]` に変更（定性モード切替時に空スタート）
- [x] 保存時の `qualitativeOptions.map` 内 `isDefault: opt.isDefault` マッピング削除

### STEP 9: `UncertaintyDetailModal.tsx` 更新
- [x] 初期化・保存の `qualitativeOptions.map` 内 `isDefault` マッピング削除
- [x] `buildDiffData` の差分文字列生成から `isDefault`/`defaultMark` 参照削除
- [x] `buildDiffLabels` の `defaultMark` 削除

### STEP 10: `UncertaintyCriteriaSelectorModal.tsx` 更新
- [x] `QualitativeOption.isDefault` フィールド削除

### STEP 11: `UncertaintyCriteriaSelectorPanel.tsx` 更新
- [x] `useEffect` 内の定性デフォルト自動選択ロジック削除
  - `const defaultOpt = ...find(isDefault)` / `setQualValue(defaultOpt?.selectorValue ?? ...[0]?)` を削除
  - 代わりに `setQualValue(null)` で統一

### STEP 12: `WorkRecordPanel.tsx` 更新
- [x] `handleSaveCorrection` に未選択バリデーション追加
  - `viewingKey` のトランジション配下に定性評価ボタンが表示されているプロパティが存在し（`confidenceOptions` の有無・内容にかかわらず、定性評価UIが描画されるプロパティが対象）、かつ `confidenceValuesRef` に対応エントリが1件もない場合はエラーメッセージを表示して処理中断
  - `DEFAULT_CONFIDENCE_OPTIONS` フォールバックや定性評価ボタンの表示ロジック自体は**変更しない**

### STEP 13: ロケール更新
- [x] `ja.json` : `defaultMark` キー削除、`workRecord.correctionQualitativeRequired` キー追加
- [x] `en.json` : 同上（英語）

### STEP 14: 動作確認
- [x] `cd backend && npm test` 全パス（20/20）
- [x] `cd frontend && npx tsc --noEmit` エラーなし（本タスク起因のものはゼロ）
- [x] `cd backend && npx tsc --noEmit` エラーなし

---

## 5. リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| `insertIntuitionSelector.sql` のパラメータ番号ずれ | 高 | `$8` 削除後に `create_user_id` が `$8` に繰り上がることを確認。Repository の配列と SQL を照合 |
| `WorkRecordPanel` バリデーションの判定漏れ | 中 | `rawTemplateItemsRef` から定性プロパティ存在を確認する方法を慎重に実装 |
| テスト失敗（`isDefault` 残存） | 中 | STEP 5 でテストデータを漏れなく修正後にテスト実行で確認 |
| `UncertaintyDetailModal` 差分表示崩れ | 低 | `buildDiffData` の文字列生成を慎重に修正 |

---

## 6. テスト計画

### 自動テスト
- [x] `cd backend && npm test` 全パス（20/20）
- [x] `cd frontend && npx tsc --noEmit` エラーなし（本タスク起因のものはゼロ）
- [x] `cd backend && npx tsc --noEmit` エラーなし

### 手動テスト観点
- [ ] 不確かさ基準管理：定性モード切替でデフォルト選択肢が生成されないこと
- [ ] `QualitativeOptionEditor` に「デフォルト」列が表示されないこと
- [ ] `UncertaintyCriteriaSelectorPanel` で定性基準選択後に自動選択されないこと
- [ ] 作業者画面：従来通り定性評価ボタン（確か・要確認・不確か）が表示されること
- [ ] 訂正モード：定性評価未選択で「訂正保存」するとエラーが出て保存されないこと（定性ボタン自体は従来通り表示される）
- [ ] 訂正モード：定性評価を選択してから「訂正保存」すると正常に保存されること

---

## 7. 承認記録

- **計画書提示日時**: 2026-09-02 10:00
- **承認日時**: 2026-09-02 10:00
- **承認者コメント**: 承認済み

---

## 8. 実施記録

### 実施日時
開始: 2026-09-02 10:00　完了: 2026-09-02 11:30

### 計画からの変更点
- STEP 12: `WorkRecordPanel.tsx` のバリデーション実装で当初 `tasks.transitions.templates` を参照しようとしたが `TaskTransitionState` に `templates` フィールドが存在しなかった。代わりに `rawTemplateItemsRef` の `item.data.properties[].qualitativeOptions` の有無で判定するアプローチに変更。

### 発生した問題と解決方法
- バックエンドテストの既存データに `scaleFactor` / `toleranceUpper` / `toleranceLower` が不足していたため TypeScript エラーが発生 → テストデータに `null` で追加して解決。
- `QualitativeOptionEditor` の `SortableRowProps.onUpdate` の型が `string | boolean` のままだと型エラーになる → `string` のみに変更。

### 最終的な成果物
- [x] DBマイグレーションSQL（`backend/migrations/20260902_1000_drop_is_default_from_intuition_selector.sql`）
- [x] DDLドキュメント更新（`docs/design/db/ddl/intuition_selector.sql`）
- [x] バックエンドSQL / Repository / テスト更新（4 SQL + 1 Repository + 2 テスト）
- [x] フロントエンドサービス / コンポーネント / ロケール更新（1 サービス + 5 コンポーネント + 2 ロケール）
- [x] バックエンドテスト 20件全パス
- [x] バックエンド TypeScript コンパイルエラーなし
- [x] フロントエンド TypeScript コンパイルエラーなし（本タスク起因のものはゼロ）

