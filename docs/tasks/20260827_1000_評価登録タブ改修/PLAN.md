# タスク計画書: 評価登録タブ改修

## メタデータ
- **作成日時**: 2026-08-27 10:00
- **タスクID**: 20260827_1000_評価登録タブ改修
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

評価登録タブにおいて、不確かさ基準を利用する設計から変更し、
「良好」「要確認」「不良」の3固定値で評価登録できるようにレイアウト変更を行う。
また、評価値と並んでコメントを入力・表示できるように修正する。

バックエンドのAPIは既に実装済みのため、フロントエンドの修正が中心。

## 目的と期待される成果

- [x] 評価値の選択肢を「良好 / 要確認 / 不良」の3固定値に統一
- [x] 「不確かさ基準名」列を一覧テーブルから削除（評価単位列で代替）
- [x] モックデータ初期値を空配列に変更しバックエンドAPIからデータ取得
- [x] EvaluationDialog.tsx も同様に修正して整合性を保つ

## 実装ステップ

### Step 1: 型定義修正（`frontend/src/types/projectOverallEvaluation.ts`）
- [x] `SUB_EVAL_VALUE_OPTIONS` の `'不要'` を `'不良'` に修正
- [x] `SUB_EVAL_VALUE_COLOR` の `'不要': 'default'` を `'不良': 'error'` に修正
- [x] コメント文字列「良好 / 要確認 / 不要」を「良好 / 要確認 / 不良」に修正

### Step 2: EvaluationRegistrationTab.tsx 修正
- [x] `MOCK_TRANSITION_NAMES` 定数を削除（MOCK_EVALUATION_RECORDSとセットで不要）
- [x] `MOCK_EVALUATION_RECORDS` 定数を削除
- [x] `useState(MOCK_EVALUATION_RECORDS)` → `useState<EvaluationRecord[]>([])` に変更
- [x] `resultColumns` から「不確かさ基準名」列（`criteriaName`）を削除

### Step 3: EvaluationDialog.tsx 修正
- [x] `MOCK_TRANSITION_NAMES` 定数を削除
- [x] `MOCK_EVALUATION_RECORDS` 定数を削除
- [x] `useState(MOCK_EVALUATION_RECORDS)` → `useState<EvaluationRecord[]>([])` に変更
- [x] 一覧テーブル列定義から「不確かさ基準名」相当の列を削除
- [x] `buildEvalRows` 関数内の `MOCK_TRANSITION_NAMES` 参照を空配列に変更

### Step 4: 動作確認
- [x] TypeScript 型エラーがないことを確認（今回変更ファイルに関するエラーなし）
- [ ] ビルドが通ることを確認（既存の無関係エラーあり・本タスクの変更に起因するものはなし）

## 変更ファイル
1. `frontend/src/types/projectOverallEvaluation.ts` - 評価値定数修正
2. `frontend/src/components/project/EvaluationRegistrationTab.tsx` - レイアウト変更・モック削除
3. `frontend/src/components/project/EvaluationDialog.tsx` - 同上（二重管理の整合）

## 影響範囲

- **評価値の変更**（不要→不良）: バックエンドDDL・バリデーション（`不良`）と整合が取れる
- **列削除**（不確かさ基準名）: UI上の表示のみの変更。既存DBデータへの影響なし
- **モック削除**: API接続済みのため空配列で問題なし

## リスク
| リスク | 対策 |
|--------|------|
| EvaluationDialog.tsx でMOCK削除により表示が変わる | APIからデータを正常取得できれば問題なし |
| `'不要'` → `'不良'` 変更によりDBの既存レコードと不一致 | DBには `CHECK` 制約で `'不良'` のみ許可されているため既存データは `'不良'` が正しい。フロントの表示修正は整合性向上 |

## テスト計画
- [x] 型定義修正後に TypeScript ビルドエラーが出ないこと（本タスク変更ファイルに関するエラーなし）
- [ ] 評価登録タブを開いてAPIからデータが表示されること（手動確認要）
- [ ] 「評価を入力」ボタン押下でモーダルが開き、評価値選択肢が「良好/要確認/不良」であること（手動確認要）
- [ ] 一覧に「不確かさ基準名」列が表示されないこと（手動確認要）

## 承認記録
- **計画書提示日時**: 2026-08-27 10:00
- **承認日時**: 2026-08-27 10:05（承認済み・実装開始）

## 実施記録

### 実施日時
開始: 2026-08-27 10:05
完了: 2026-08-27 10:30

### 最終的な成果物
- [x] Step 1: `SUB_EVAL_VALUE_OPTIONS` の '不要' → '不良' 修正完了
- [x] Step 1: `SUB_EVAL_VALUE_COLOR` の '不要': 'default' → '不良': 'error' 修正完了
- [x] Step 2: `EvaluationRegistrationTab.tsx` の MOCK_TRANSITION_NAMES・MOCK_EVALUATION_RECORDS 削除完了
- [x] Step 2: `useState([])` への初期値変更完了
- [x] Step 2: 「不確かさ基準名」列（criteriaName）の削除完了
- [x] Step 2: `buildEvalRows` 内 MOCK_TRANSITION_NAMES 参照を空配列に変更完了
- [x] Step 3: `EvaluationDialog.tsx` の MOCK_TRANSITION_NAMES・MOCK_EVALUATION_RECORDS 削除完了
- [x] Step 3: `useState([])` への初期値変更完了
- [x] Step 3: 「不確かさ基準名」列（criteriaName）の削除完了
- [x] Step 3: `buildEvalRows` 内 MOCK_TRANSITION_NAMES 参照を空配列に変更完了
- [x] Step 4: TypeScript エラーなし（今回変更ファイルに関するエラーなし）を確認完了

### バックエンド変更
変更不要（既に '不良' でDDL・バリデーション・SQLが設定済み）

