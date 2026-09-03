# タスク計画書: UncertaintyCriteriaSelectorModal 選択詳細プレビュー追加

## メタデータ

- **作成日時**: 2026-09-03 12:00
- **タスクID**: 20260903_1200
- **優先度**: 中
- **推定工数**: 3〜4時間

---

## 1. タスク概要

`TemplateEditorDialog` から開かれる `UncertaintyCriteriaSelectorModal` にて、
テーブルから定性評価・定量評価の基準を選択した際に、下部に選択内容の詳細プレビューパネルを表示する。

- **定性評価** の場合：登録された選択肢（`qualitativeOptions`）をバッジ形式で表示
- **定量評価** の場合：xsi:type・単位・倍率・フォーマット・許容値（上限・下限）を表示

許容値（`toleranceUpper` / `toleranceLower`）は現在のセレクター用 API レスポンスに含まれていないため、
バックエンド・フロントエンドの API 型を拡張して対応する。

---

## 2. 目的と期待される成果

- [ ] テーブルで行を選択すると、モーダル下部にその基準の詳細プレビューが表示される
- [ ] 定性評価：`qualitativeOptions` をカラー付きバッジで表示する
- [ ] 定量評価：`xsiType`・`unit`・`scaleFactor`・`format`・`toleranceUpper`・`toleranceLower` をグリッド表示する
- [ ] 未選択時は「上のリストから基準を選択してください」というプレースホルダーを表示する
- [ ] 許容値が `null` の場合は「判定なし」と表示する
- [ ] バックエンドのセレクター用型に許容値を追加する
- [ ] フロントエンドの API 型・変換処理に許容値を追加する
- [ ] 日本語・英語の翻訳キーを追加する

---

## 3. 実装ステップ

### Phase 0: モックデータで UI を先行実装・確認 ⭐ 最初に実施

API 拡張（バックエンド変更）を行う前に、`UncertaintyCriteriaSelectorModal.tsx` 内で
許容値を仮固定値として UI を先行実装し、見た目と動作をブラウザで確認する。
確認 OK 後、Phase A 以降で実 API に接続する。

- [x] **0-1**: i18n キーを先行追加（`ja.json` / `en.json` の `uncertaintyCriteriaSelector` セクション）
  - 追加キー：`previewSectionTitle` / `previewEmpty` / `previewXsiType` / `previewUnit` /
    `previewScaleFactor` / `previewFormat` / `previewToleranceUpper` / `previewToleranceLower` /
    `previewNoTolerance` / `previewQualitativeOptions` / `previewNoOptions`

- [x] **0-2**: `UncertaintyCriteria` 型に `toleranceUpper: number | null` / `toleranceLower: number | null` を追加
  - `useEffect` 内の変換処理では `toleranceUpper: null, toleranceLower: null` を仮固定で設定

- [x] **0-3**: `SelectedCriteriaPreview` サブコンポーネントをファイル末尾に追加
  - Props: `criteria: UncertaintyCriteria | null`, `t: (key: string) => string`
  - **未選択時**：破線ボーダー・薄グレー背景 + 中央寄せプレースホルダーテキスト
  - **定量評価時**：`xsiType`・`unit`・`scaleFactor`・`format`・`toleranceUpper`・`toleranceLower` をグリッド表示（許容値 null → 「判定なし」）
  - **定性評価時**：`qualitativeOptions` を `displayOrder` 昇順ソートしてカラー付きバッジ横並び表示（空配列 → 「選択肢なし」）

- [x] **0-4**: テーブル（`</Spin>`）と「新規評価基準を作成」ボタンの間に `<SelectedCriteriaPreview criteria={selectedCriteria} t={t} />` を挿入

- [ ] **0-5**: ブラウザで動作確認
  - 定量評価の行をクリック → xsi:type・単位・倍率・フォーマット が表示される（許容値は「判定なし」）
  - 定性評価の行をクリック → 選択肢バッジが表示される
  - 未選択状態 → プレースホルダーが表示される
  - ✅ 確認 OK → Phase A 以降へ進む
  - ❌ 確認 NG → UI を修正してから Phase A 以降へ進む

---

### Phase A: バックエンド — セレクター型に許容値フィールドを追加

- [x] **A-1**: `backend/src/repositories/uncertaintyCriteriaRepository.ts`
  - `UncertaintyCriteriaSelectorRow` 型に `toleranceUpper: number | null` / `toleranceLower: number | null` を追加
  - `findForSelector` のグループ化マッピング処理に `toleranceUpper` / `toleranceLower` の取得を追加
  - ※SQL クエリが `tolerance_upper` / `tolerance_lower` を SELECT しているかを事前確認
  - **→ 確認結果: 型・SQL・マッピングすでに対応済みのため変更不要**

### Phase B: フロントエンド — API 型・変換処理に許容値を追加

- [x] **B-1**: `frontend/src/services/uncertaintyCriteriaApiService.ts`
  - `UncertaintyCriteriaSelectorApiRow` 型に `toleranceUpper: number | null` / `toleranceLower: number | null` を追加
  - `UncertaintyCriteriaForSelector` 型に同フィールドを追加
  - `fetchUncertaintyCriteriaForSelector` のマッピング処理に追加

### Phase C: Modal — 仮固定値を実 API 値に差し替え

- [x] **C-1**: `UncertaintyCriteriaSelectorModal.tsx` の `useEffect` 内変換処理の仮固定を
  実値（`row.toleranceUpper` / `row.toleranceLower`）に差し替え

### Phase D: Panel — 型変換に許容値を追加

- [x] **D-1**: `frontend/src/components/uncertainty/UncertaintyCriteriaSelectorPanel.tsx`
  - `fetchUncertaintyCriteriaForSelector` レスポンスの変換処理に `toleranceUpper` / `toleranceLower` を追加
  - ※パネル側にプレビュー UI は追加しない

### Phase E: 最終確認

- [x] **E-1**: ブラウザで定量評価の許容値が実 DB 値で正しく表示されることを確認


---

## 4. 変更ファイル一覧

| # | フェーズ | ファイル | 変更種別 | 変更内容 |
|---|---|---|---|---|
| 1 | 0 | `frontend/src/locales/ja.json` | 変更 | プレビューパネル用 i18n キー追加 |
| 2 | 0 | `frontend/src/locales/en.json` | 変更 | プレビューパネル用 i18n キー追加 |
| 3 | 0 | `frontend/src/components/uncertainty/UncertaintyCriteriaSelectorModal.tsx` | 変更 | `UncertaintyCriteria` 型に許容値追加（仮固定）・`SelectedCriteriaPreview` 追加・テーブル下に挿入 |
| 4 | A | `backend/src/repositories/uncertaintyCriteriaRepository.ts` | 変更 | `UncertaintyCriteriaSelectorRow` 型・マッピングに許容値追加 |
| 5 | B | `frontend/src/services/uncertaintyCriteriaApiService.ts` | 変更 | セレクター用 API 型・マッピングに許容値追加 |
| 6 | C | `frontend/src/components/uncertainty/UncertaintyCriteriaSelectorModal.tsx` | 変更 | 仮固定を実 API 値に差し替え |
| 7 | D | `frontend/src/components/uncertainty/UncertaintyCriteriaSelectorPanel.tsx` | 変更 | 型変換処理に許容値を追加 |

---

## 5. 影響範囲分析

### 影響を受けるコンポーネント・ファイル

- `UncertaintyCriteriaSelectorModal` — UI 変更（テーブル下部にプレビュー追加）
- `UncertaintyCriteriaSelectorPanel` — 型変換処理のみ（UI 変更なし）
- `uncertaintyCriteriaApiService.ts` — 型追加（既存メソッドの動作変化なし）
- `uncertaintyCriteriaRepository.ts` — 型追加・マッピング追加（SQL 変更は要確認）

### 影響を受けない機能

- 付与ロジック（`handleAssign`・`AssignPayload` 型）は変更なし
- `TemplateEditorDialog` は変更なし
- バックエンドの保存・更新 API は変更なし
- 認証・認可・マルチテナント分離への影響なし

---

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `findForSelector` の SQL クエリが `tolerance_upper` / `tolerance_lower` を SELECT していない | 中 | 低 | 実装前に SQL ファイルを確認し、必要に応じて SELECT に追加 |
| `UncertaintyCriteriaSelectorPanel` の型変換漏れ | 低 | 低 | TypeScript コンパイルエラーで検知可能 |
| `qualitativeOptions` が空配列の場合の表示崩れ | 低 | 低 | 空配列時は「選択肢なし」テキストを表示して対応 |
| `displayColor` に無効な CSS カラー値が含まれる | 低 | 低 | 無効値の場合はデフォルト色（`#888`）にフォールバック |

---

## 7. UI 詳細設計

テーブル（`</Spin>`）の直後、「新規評価基準を作成」ボタンの直前に挿入。

**未選択時**
```
┌─────────────────────────────────────────────────────────┐
│  （破線ボーダー、薄グレー背景）                           │
│   上のリストから不確かさ基準を選択すると詳細が表示されます │
└─────────────────────────────────────────────────────────┘
```

**定量評価選択時**
```
┌─────────────────────────────────────────────────────────┐
│ 選択中の基準の詳細   [定量（blue タグ）]                  │
├─────────────┬──────────┬──────────┬──────────────────────┤
│ xsi:type    │ 単位     │ 倍率     │ フォーマット         │
│  Float      │  kg      │  1.0     │  %.4f               │
├─────────────┴──────────┴──────────┴──────────────────────┤
│ 許容下限値   │  許容上限値  （null → 「判定なし」）        │
│  -0.005      │   +0.005                                  │
└─────────────────────────────────────────────────────────┘
```

**定性評価選択時**
```
┌─────────────────────────────────────────────────────────┐
│ 選択中の基準の詳細   [定性（purple タグ）]                │
│ 選択肢                                                  │
│  ●確か     ●曖昧     ●不確か                           │
│  （displayColor を枠色・背景色、displayOrder 昇順ソート） │
└─────────────────────────────────────────────────────────┘
```

---

## 8. i18n キー一覧（Phase 0 で追加）

`uncertaintyCriteriaSelector` セクションに追加するキー：

| キー | 日本語 | 英語 |
|---|---|---|
| `previewSectionTitle` | 選択中の基準の詳細 | Selected Criteria Detail |
| `previewEmpty` | 上のリストから不確かさ基準を選択すると詳細が表示されます | Select a criteria from the list above to see details |
| `previewXsiType` | xsi:type | xsi:type |
| `previewUnit` | 単位 (units) | Unit |
| `previewScaleFactor` | 倍率 | Scale Factor |
| `previewFormat` | フォーマット | Format |
| `previewToleranceUpper` | 許容上限値 | Tolerance Upper |
| `previewToleranceLower` | 許容下限値 | Tolerance Lower |
| `previewNoTolerance` | 判定なし | No limit |
| `previewQualitativeOptions` | 選択肢 | Options |
| `previewNoOptions` | 選択肢なし | No options |

---

## 9. テスト計画

### 手動テスト（Phase 0 確認時）

- [ ] 定量評価の行をクリック → xsi:type・単位・倍率・フォーマットが表示される（許容値は「判定なし」）
- [ ] 定性評価の行をクリック → 選択肢がカラー付きバッジで表示される
- [ ] 未選択状態 → プレースホルダーテキストが表示される
- [ ] 定性評価の選択肢が空の場合に「選択肢なし」と表示される
- [ ] 別の基準に切り替えたとき、プレビューが更新される
- [ ] モーダルを閉じて再度開いたとき、プレビューがリセットされる（未選択状態）

### 手動テスト（Phase E 最終確認時）

- [ ] 定量評価の許容値が実 DB 値で正しく表示される
- [ ] 許容値が `null` の場合に「判定なし」と表示される

---

## 10. 関連ドキュメント

- [不確かさ基準 API 設計書](../../design/api/api_uncertainty_criteria.md)
- [タスク: Uncertainty許容値入力欄追加と値入力UI削除](../20260826_1200_Uncertainty許容値入力欄追加と値入力UI削除/PLAN.md)

---

## 11. 承認記録

- **計画書提示日時**: 2026-09-03 12:00
- **承認日時**: —
- **承認者コメント**: —

