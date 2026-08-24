# タスク計画書: 評価機能整備

## メタデータ
- **作成日時**: 2026-08-19 10:00
- **タスクID**: 20260819_1000_評価機能整備
- **優先度**: 高
- **推定工数**: 2〜3時間

---

## タスク概要

評価機能に関する以下2点を修正する。

1. **全体評価タブの復帰**  
   マージ時に `ProjectManagementInner.tsx` のタブ定義から `overall_evaluation` タブが脱落しているため、復帰させる。  
   `OverallEvaluationTab.tsx` コンポーネント自体は存在しており、翻訳キー `tabOverallEvaluation` も定義済み。

2. **評価登録タブ・評価入力ダイアログの不確かさ基準廃止**  
   `EvaluationRegistrationTab.tsx` 内の `InputModal` と `EvaluationDialog.tsx` 内の `InputModal` が、不確かさ基準（`UncertaintyCriteriaForSelector`）から動的に評価値選択肢を生成している。  
   これを廃止し、固定値「良好」「要確認」「不要」を直接使用するよう変更する。

---

## 目的と期待される成果

- [ ] `ProjectManagementInner.tsx` のタブ一覧に「全体評価」タブが表示される
- [ ] 評価登録タブの「評価を入力」ボタンから開くモーダルで、不確かさ基準セレクトが不要になり、「良好」「要確認」「不要」が即座に選択できる
- [ ] `EvaluationDialog.tsx` 内の評価入力モーダルも同様に修正される
- [ ] 不確かさ基準のAPI呼び出し（`fetchUncertaintyCriteriaForSelector`）が `EvaluationRegistrationTab.tsx` から削除される

---

## 実装ステップ

### Step 1: OverallEvaluationTabContent ラッパー作成（新規）
- [ ] `frontend/src/components/project/subcomponents/tabs/OverallEvaluationTabContent.tsx` を作成
  - 既存の `EvaluationRegistrationTabContent.tsx` と同様の薄いラッパー構造
  - `selectedProject` を受け取り `OverallEvaluationTab` に必要な Props を渡す

### Step 2: ProjectManagementInner にタブを追加
- [ ] `OverallEvaluationTabContent` を import
- [ ] タブ配列に `overall_evaluation` エントリを追加（`evaluation_registration` タブの後）
  ```tsx
  {
    key: 'overall_evaluation',
    label: t('projectManagement.tabOverallEvaluation'),
    children: <OverallEvaluationTabContent ... />
  }
  ```

### Step 3: EvaluationRegistrationTab の InputModal 修正
- [ ] `criteriaList` prop を削除
- [ ] `selectedCriteriaKey` / `selectedCriteria` の state・useMemo を削除
- [ ] 不確かさ基準 `<Select>` UI ブロックを削除（`{/* 不確かさ基準 */}` セクション）
- [ ] 評価値 Select の options を固定定数 `EVAL_VALUE_OPTIONS` に変更
  ```ts
  const EVAL_VALUE_OPTIONS = [
    { label: '良好', value: '良好' },
    { label: '要確認', value: '要確認' },
    { label: '不要', value: '不要' },
  ];
  ```
- [ ] `disabled={!selectedCriteria}` を削除
- [ ] `handleSave` から `selectedCriteria` チェックを削除
- [ ] メインコンポーネント側の `criteriaList` state・`fetchUncertaintyCriteriaForSelector` 呼び出しを削除
- [ ] 結果一覧の「不確かさ基準」フィルタ UI と `filterKey` state を削除
- [ ] `EvalValueTag` の `criteria` 依存を除去し固定カラーマップに変更
  ```ts
  const EVAL_COLOR: Record<string, string> = {
    '良好': 'success',
    '要確認': 'warning',
    '不要': 'default',
  };
  ```
- [ ] `UncertaintyCriteriaForSelector` import / `fetchUncertaintyCriteriaForSelector` import を削除

### Step 4: EvaluationDialog の InputModal 修正
- [ ] Step 3 と同内容の変更を `EvaluationDialog.tsx` の `InputModal` / `ResultPanel` にも適用
- [ ] `EvaluationDialogProps` から `criteriaList` を削除
- [ ] `ResultPanel` Props からも `criteriaList` を削除
- [ ] `UncertaintyCriteriaForSelector` import を削除

---

## 変更ファイル一覧

| ファイル | 変更種類 | 変更内容 |
|---------|---------|---------|
| `frontend/src/components/project/subcomponents/tabs/OverallEvaluationTabContent.tsx` | 新規作成 | OverallEvaluationTab のラッパーコンポーネント |
| `frontend/src/components/project/ProjectManagementInner.tsx` | 修正 | import追加 + タブ配列に全体評価タブ追加 |
| `frontend/src/components/project/EvaluationRegistrationTab.tsx` | 修正 | InputModal 不確かさ基準廃止・固定評価値化 |
| `frontend/src/components/project/EvaluationDialog.tsx` | 修正 | 同上（InputModal の不確かさ基準廃止） |

---

## 影響範囲

- **フロントエンドのみ**（バックエンド変更なし）
- `SubEvaluationRow.evaluation_value` カラムに保存される値は従来通り文字列のため、既存データへの影響なし
- `EvaluationDialog.tsx` は現在どこからも import されていないことを確認済みのため、呼び出し元変更は不要

---

## リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| OverallEvaluationTab の Props 不整合 | 低 | Props 型を事前確認済み（`projectId`, `projectName`, `isEditable`, `isProjectCompleted`, `isCheckoutLocked`） |
| 既存保存データの表示崩れ | 低 | `evaluation_value` に直接文字列が格納されているため表示には影響しない |
| EvaluationDialog の呼び出し元が存在する場合 | 低 | 調査でどこからも import されていないことを確認済み |

---

## テスト計画

### 手動テスト
- [ ] プロジェクト選択後、タブに「全体評価」が表示されること
- [ ] 全体評価タブの内容（OverallEvaluationTab）が正常に表示されること
- [ ] 評価登録タブの「評価を入力」ボタン押下でモーダルが開くこと
- [ ] モーダルに不確かさ基準の Select が表示されないこと
- [ ] 評価値として「良好」「要確認」「不要」の3選択肢が表示されること
- [ ] 評価値未選択でも Select が disabled にならないこと
- [ ] 評価を入力して保存が成功すること
- [ ] TypeScript ビルドエラーがないこと（`npm run build` またはエディタエラー確認）

---

## 承認記録
- **計画書提示日時**: 2026-08-19 10:00
- **承認日時**: 2026-08-19（Act モード切替により承認）
- **承認者コメント**: Act モードへの切り替えにより承認

---

## 実施記録

### 実施日時
開始: 2026-08-19 10:00
完了: 2026-08-19 10:45

### 最終的な成果物
- [x] `OverallEvaluationTabContent.tsx` 新規作成
- [x] `ProjectManagementInner.tsx` import追加 + `overall_evaluation` タブ追加
- [x] `EvaluationRegistrationTab.tsx` InputModal の不確かさ基準廃止・固定評価値「良好/要確認/不要」化
- [x] `EvaluationDialog.tsx` InputModal / ResultPanel の不確かさ基準廃止・固定評価値「良好/要確認/不要」化
- [x] TypeScript コンパイルエラーなし（変更ファイルに関するエラー0件）
