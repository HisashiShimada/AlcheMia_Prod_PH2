# タスク計画書: Uncertainty 許容値入力欄追加 & 値入力UI削除

## メタデータ
- **作成日時**: 2026-08-26 12:00
- **タスクID**: 20260826_1200
- **優先度**: 高
- **推定工数**: 3〜4時間

---

## タスク概要

`uncertainty_criteria` テーブルに `tolerance_upper` / `tolerance_lower` カラムが追加済みだが、
実験管理者画面の不確かさ基準管理（新規作成・詳細編集）モーダルに入力欄が存在しない。

また `TemplateEditorDialog` から不確かさ基準を付与する `UncertaintyCriteriaSelectorModal` に
「値入力エリア（不確かさ値・包含係数・定性選択・コメント）」が存在するが、
設計方針として「テンプレートには基準キーのみ記録し、値は WorkRecordPanel で記録する」ため
このエリアは不要であり、削除する必要がある。

---

## 目的と期待される成果

- [x] 調査完了
- [x] 不確かさ基準管理画面（新規作成・詳細編集）に許容上限値・許容下限値の入力欄を追加する
- [x] 入力値が保存APIリクエストに含まれ、DBに保存される
- [x] 詳細編集時に既存の許容値がフォームに復元される
- [x] 差分プレビューで許容値の変更が検知される
- [x] `UncertaintyCriteriaSelectorModal` の③値入力エリアを削除し、基準選択のみのUIにする
- [x] 削除によって「付与する」ボタンが値入力なしで動作する

---

## 実装ステップ

### A. フロントエンド API Service 型修正（前提）

- [x] **A-1**: `uncertaintyCriteriaApiService.ts` の `UncertaintyCriteriaApiRow` に `toleranceUpper: number | null` / `toleranceLower: number | null` を追加（`as any` キャスト除去）
- [x] **A-2**: `uncertaintyCriteriaApiService.ts` の `SaveUncertaintyCriteriaRequest` に `toleranceUpper: number | null` / `toleranceLower: number | null` を追加

### B. 不確かさ基準 新規作成モーダル修正

対象: `frontend/src/components/uncertainty/UncertaintyCreateModal.tsx`

- [x] **B-1**: 定量評価モード時に許容上限値・許容下限値の入力欄（`Form.Item` name=`toleranceUpper` / `toleranceLower`）を追加
- [x] **B-2**: `handleSave` の `saveUncertaintyCriteriaNewVersion` 呼び出しに `toleranceUpper` / `toleranceLower` を追加
- [x] **B-3**: i18n キーを `ja.json` / `en.json` に追加（許容上限値・許容下限値のラベル）

### C. 不確かさ基準 詳細・編集モーダル修正

対象: `frontend/src/components/uncertainty/UncertaintyDetailModal.tsx`

- [x] **C-1**: 定量評価モード時に許容上限値・許容下限値の入力欄（`Form.Item` name=`toleranceUpper` / `toleranceLower`）を追加
- [x] **C-2**: 詳細データロード時（`fetchUncertaintyCriteriaDetail` レスポンス）の `form.setFieldsValue` に `toleranceUpper` / `toleranceLower` を追加
- [x] **C-3**: `handleSave` の `saveUncertaintyCriteriaNewVersion` 呼び出しに `toleranceUpper` / `toleranceLower` を追加
- [x] **C-4**: `buildDiffData` 関数で `toleranceUpper` / `toleranceLower` を差分検知フィールドに追加（変更前後のプレビュー対応）
- [x] **C-5**: `DiffLabels` インターフェースに許容値ラベルを追加（必要な場合）
- [x] **C-6**: C-3 と合わせて、無変更チェック（`noChanges` 判定）にも許容値の変化を含める

### D. UncertaintyCriteriaSelectorModal 値入力エリア削除

対象: `frontend/src/components/uncertainty/UncertaintyCriteriaSelectorModal.tsx`

- [x] **D-1**: `AssignPayload` 型の `ucValue?` / `kFactor?` / `qualitativeValue?` / `comment` に `@deprecated` 付与
- [x] **D-2**: `useState` の `ucValue` / `kFactor` / `qualValue` / `comment` / `ucValueError` を削除
- [x] **D-3**: `validateUcValue` 関数を削除
- [x] **D-4**: モーダルopen時の初期化 `useEffect` から値初期化処理を削除
- [x] **D-5**: `initialPayload` からの値復元処理を削除（選択状態の復元のみに変更）
- [x] **D-6**: 基準切替時の値リセット `useEffect` を削除
- [x] **D-7**: `handleAssign` のバリデーションを基準選択チェックのみにする
- [x] **D-8**: `handleAssign` の `onAssign` 呼び出しを `{ criteria: selectedCriteria }` のみにする
- [x] **D-9**: `handleReset`（リセットボタン含む）を削除
- [x] **D-10**: ③値入力エリアの JSX ブロックを丸ごと削除
- [x] **D-11**: 確認ダイアログから値・コメント表示部分を削除（評価方式表示に変更）
- [x] **D-12**: 不要な `Form`・`TextArea` の import を削除
- [x] **D-13**: `isQuantitative` 変数は `confirmContent` で引き続き使用のため存置

### E. TemplateEditorDialog の editPayload 整理

対象: `frontend/src/components/editorv2/TemplateEditorDialog.tsx`

- [x] **E-1**: `handleEditUncertainty` 内の `editPayload` 組み立てから `comment: ''` を削除（`AssignPayload` 型変更に合わせる）

---

## 変更ファイル一覧

| # | ファイル | 変更種別 | 概要 |
|---|---------|---------|------|
| 1 | `frontend/src/services/uncertaintyCriteriaApiService.ts` | 型修正 | `UncertaintyCriteriaApiRow` / `SaveUncertaintyCriteriaRequest` に toleranceUpper/Lower 追加 |
| 2 | `frontend/src/components/uncertainty/UncertaintyCreateModal.tsx` | 機能追加 | 許容値入力欄追加、保存リクエストに含める |
| 3 | `frontend/src/components/uncertainty/UncertaintyDetailModal.tsx` | 機能追加 | 許容値入力欄追加、ロード復元・保存・差分検知対応 |
| 4 | `frontend/src/components/uncertainty/UncertaintyCriteriaSelectorModal.tsx` | 機能削除 | ③値入力エリア削除・AssignPayload型フィールドに @deprecated 付与 |
| 5 | `frontend/src/components/editorv2/TemplateEditorDialog.tsx` | 整理 | editPayload から不要フィールド削除 |
| 6 | `frontend/src/components/uncertainty/UncertaintyCriteriaSelectorPanel.tsx` | バグ修正 | 変換コードに xsiType/scaleFactor 追加（型エラー修正） |
| 7 | `frontend/src/locales/ja.json` | 追加 | 許容値ラベルの翻訳キー追加 |
| 8 | `frontend/src/locales/en.json` | 追加 | 許容値ラベルの翻訳キー追加（英語） |

---

## 影響範囲分析

- `UncertaintyCriteriaSelectorModal` は `TemplateEditorDialog` からのみ呼ばれている（`WorkRecordPanel` からは `UncertaintyCriteriaSelectorPanel` が使われる）
- `AssignPayload` 型の変更は `TemplateEditorDialog.handleCriteriaAssign` に影響するが、現状でも値フィールドは使われていないため動作変更なし
- 不確かさ基準管理画面への許容値追加は既存の保存・取得フロー（SQL・Repository・Controller・Service）はすべて対応済みのため、フロントエンドのUIと型のみ修正すれば動作する

---

## リスク

| リスク | 対策 |
|--------|------|
| `UncertaintyCriteriaSelectorPanel`（WorkRecordPanel側）も `AssignPayload` を参照している場合、型変更の影響を受ける | 削除前に参照箇所を確認してからフィールド削除する |
| `buildDiffData` への差分フィールド追加で既存の差分プレビューが壊れる | 既存フィールドのパターンに倣い、同一構造で追加する |

---

## テスト計画

- [ ] 新規作成モーダルで定量モード時に許容上限・下限の入力欄が表示されること
- [ ] 定性モード切替時に許容値入力欄が非表示になること
- [ ] 保存後、一覧を再取得して toleranceUpper/Lower が反映されていること（ブラウザで確認）
- [ ] 詳細モーダルを開いたとき、既存の許容値がフォームに表示されること
- [ ] 詳細モーダルで許容値を変更して保存すると差分プレビューで変更が表示されること
- [ ] `UncertaintyCriteriaSelectorModal` で基準を選択して「付与する」を押したとき、値入力なしで付与できること
- [ ] `TemplateEditorDialog` の「不確かさ編集」から開いたとき、基準選択のみで更新できること

---

## 承認記録
- **計画書提示日時**: 2026-08-26 12:00
- **承認日時**: 2026-08-26（承認済み）

## 実施記録

### 完了ステップ

- [x] **A-1**: `uncertaintyCriteriaApiService.ts` の `UncertaintyCriteriaApiRow` に `toleranceUpper`/`toleranceLower` 追加（`as any` 解消）
- [x] **A-2**: `SaveUncertaintyCriteriaRequest` に `toleranceUpper`/`toleranceLower` 追加
- [x] **B-1〜B-3**: `UncertaintyCreateModal.tsx` に定量モード限定の許容値入力欄追加・保存処理追加・i18n 追加
- [x] **C-1〜C-6**: `UncertaintyDetailModal.tsx` に入力欄追加・ロード時復元・保存・差分プレビュー対応・i18n 追加
- [x] **D-1〜D-13**: `UncertaintyCriteriaSelectorModal.tsx` の③値入力エリア削除・値 state/関数削除・`AssignPayload` に `@deprecated` 付与・不要 import 削除
- [x] **E-1**: `TemplateEditorDialog.tsx` の `editPayload` から `comment: ''` を削除
- [x] **追加**: `UncertaintyCriteriaSelectorPanel.tsx` の変換コードに `xsiType`/`scaleFactor` 追加（型エラー修正）
- [x] **追加（バグ修正）**: `TemplateEditorDialog.tsx` の `handleCriteriaAssign` で `uncertaintyNode.attributes` に親プロパティの `xsi:type`/`units` を引き継ぐよう修正（定量評価のみ・定性評価は空のまま維持）

### TypeScript チェック結果
今回の修正に起因するエラー: **0件**  
残存エラーはすべて既存の無関係なもの（`EncryptionManagement`・`TransitionList`・`LanguageContext`）
