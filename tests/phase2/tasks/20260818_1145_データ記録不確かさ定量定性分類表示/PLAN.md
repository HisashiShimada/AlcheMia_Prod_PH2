# タスク計画書: データ記録ダイアログ 不確かさ定量/定性分類表示

## メタデータ
- **作成日時**: 2026-08-18 11:45
- **タスクID**: データ記録不確かさ定量定性分類表示
- **優先度**: 高
- **推定工数**: 3時間

## タスク概要

実験作業者メニューの実験記録タブ内にある「データ記録ダイアログ（DataRecordDialog）」において、
MAIMLの `<uncertainty>` タグを `uncertainty_criteria` テーブルの `evaluation_method` カラム
（1=定量 / 2=定性）で分類し、それぞれ以下のように表示を変更する。

### 現状
- `toleranceValue` / `uncertaintyNote` / `uncertaintyName` は MAIMLの uncertainty の1件目を
  無条件にマッピングしている。
- 定性評価の選択肢はデフォルト（5段階）のみ表示。

### 目標
| 要件 | 内容 |
|------|------|
| 1-1 | 定量評価なし → ヘッダを「不確かさ値」（デフォルト多言語キー） |
| 1-2 | 定量評価なし → セル「ー」 （実装済み） |
| 1-3 | 定量評価あり → ヘッダをDB の `termDisplayName`（名前空間表示名） |
| 1-4 | 定量評価あり → セルに uncertainty の `<value>` を表示 |
| 2-1 | 定量評価なし → 「不確かさ説明」セルを「ー」 （実装済み） |
| 2-2 | 定量評価あり → セルに uncertainty の `<description>` を表示 |
| 3-1 | 定性評価なし → デフォルト選択肢「デフォルト選択肢」を表示 |
| 3-2 | 定性評価あり → Uncertainty（定性）Key に紐づく DB の選択肢を表示 |
| 3-3 | 定性評価あり → Value 値を初期選択状態にする |
| 3-4 | 定性評価あり且つ description タグあり → 定量評価タイトルの右に `（内容）` で表示 |

## 目的と期待される成果

- [ ] MAIMLの各 `<uncertainty key="...">` を DB の `evaluation_method` で定量/定性に分類できる
- [ ] 定量uncertainty: 「不確かさ値」ヘッダが名前空間表示名に変わり、value/descriptionが表示される
- [ ] 定性uncertainty: DB の選択肢が正しく表示され、初期選択値と説明が反映される

## 実装ステップ

### Phase 1: バックエンド — SQL / Repository 拡張
- [ ] `findByKeys.sql` を拡張し `evaluation_method` / `termDisplayName` / `qualitativeOptions` も返す新SQLを作成
  - ファイル名: `backend/src/sql/queries/uncertainty_criteria/findByKeysWithDetails.sql`
- [ ] `uncertaintyCriteriaRepository.ts` に `findByKeysWithDetails()` 関数を追加

### Phase 2: バックエンド — experimentDataService.ts の property マッピング修正
- [ ] `getExperimentData()` / `buildPropertyMaps()` 内で uncertainty を定量/定性に分類する処理を追加
- [ ] `Property` 型のレスポンスに以下フィールドを追加
  - `toleranceValue` → 定量uncertaintyの `<value>`
  - `uncertaintyNote` → 定量uncertaintyの `<description>`
  - `uncertaintyName` → 定量uncertaintyの `termDisplayName`（DB から取得）
  - `qualitativeOptions` → 定性uncertaintyの DB選択肢（`QualitativeOptionRow[]`）
  - `qualitativeEval` → 定性uncertaintyの初期選択値（`<value>`）
  - `qualitativeNote` → 定性uncertaintyの `<description>`（3-4用）

### Phase 3: 型定義更新
- [ ] `frontend/src/types/experimentWorker.ts` の `Property` インターフェースに
  `qualitativeNote?: string | null` フィールドを追加
  （定性uncertaintyの description → 定量タイトル右横の `（）`内表示用）

### Phase 4: フロントエンド — DataRecordDialog.tsx の UI 修正
- [ ] 「不確かさ値」ヘッダ部分（1-1/1-3）:
  - `prop.uncertaintyName` がある場合はそれを表示、なければ `t('dataRecordDialog.uncertaintyValue')` を表示
  - ※現在は `uncertaintyName ?? t('dataRecordDialog.uncertaintyName')` → キーを `uncertaintyValue` へ変更も検討
- [ ] 「不確かさ説明」セル（2-2）:
  - `prop.uncertaintyNote ?? '—'` は既存のまま（uncertaintyNoteが定量descriptionになる）
- [ ] 「定性評価」エリア（3-1/3-2/3-3）:
  - `qualOptions` の解決ロジック: `prop.qualitativeOptions` が空でなければそれを使用、なければデフォルト選択肢（「デフォルト選択肢」）
  - 初期選択状態: `prop.qualitativeEval` を初期値として使用
- [ ] 「定性評価タイトル右の説明」（3-4）:
  - `prop.qualitativeNote` がある場合、定量評価タイトルの右に `（{qualitativeNote}）` を追加

### Phase 5: 多言語対応
- [ ] `frontend/src/locales/ja.json` に `dataRecordDialog.uncertaintyValue: "不確かさ値"` を追加
- [ ] `frontend/src/locales/en.json` に対応する英語キーを追加

## 変更ファイル

### 新規作成
1. `backend/src/sql/queries/uncertainty_criteria/findByKeysWithDetails.sql` - 定量/定性分類込みの複数キー取得SQL

### 修正
1. `backend/src/repositories/uncertaintyCriteriaRepository.ts` - `findByKeysWithDetails()` 関数追加
2. `backend/src/services/experimentDataService.ts` - property マッピングロジック修正（定量/定性分類）
3. `frontend/src/types/experimentWorker.ts` - `Property` に `qualitativeNote` フィールド追加
4. `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` - UI修正（1-1〜3-4）
5. `frontend/src/locales/ja.json` - `uncertaintyValue` キー追加
6. `frontend/src/locales/en.json` - `uncertaintyValue` キー追加

## 技術的詳細

### MAIMLの uncertainty 分類ロジック

```
property.uncertainties[] が存在する場合:
  各 uncertainty の key を DB（uncertainty_criteria）に問い合わせ
  evaluation_method = 1 → 定量評価
  evaluation_method = 2 → 定性評価
  DB に存在しない key → 定量として扱う（デフォルト）

定量評価の最初の1件を:
  toleranceValue = uncertainty.value
  uncertaintyNote = uncertainty.description
  uncertaintyName = DB の termDisplayName（名前空間表示名）

定性評価の最初の1件を:
  qualitativeOptions = DB の intuition_selector 選択肢
  qualitativeEval = uncertainty.value（初期選択値）
  qualitativeNote = uncertainty.description（3-4用）
```

### findByKeysWithDetails.sql の追加カラム
既存の `findByKeys.sql` に加えて以下を取得:
- `evaluation_method`
- `term_display_name`（namespace_term テーブルの表示名）
- intuition_selector の選択肢（JSON集約）

### セキュリティ考慮事項
- [ ] organization_id によるマルチテナント分離維持

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| findByKeys.sql に termDisplayName/intuition_selector が含まれておらず JOIN が必要 | 中 | 高 | findByKeysWithDetails.sql として新規作成し既存SQLに影響なし |
| 複数の定量/定性uncertaintyが混在するプロパティ | 中 | 中 | 定量は最初の1件、定性は最初の1件を採用する仕様で対応 |
| 初期選択値（qualitativeEval）が DataRecordDialog の state 初期化タイミングと競合 | 低 | 中 | useEffect での state 初期化を修正 |

## 承認記録
- **計画書提示日時**: 2026-08-18 11:45
- **承認日時**: 
- **承認者コメント**: 
