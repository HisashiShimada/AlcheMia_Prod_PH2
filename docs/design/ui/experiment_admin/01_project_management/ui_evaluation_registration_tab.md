# 評価登録確認タブ UI設計書

> [!WARNING]
> **このドキュメントは現在のバージョンが古く、今後修正が予定されています。**
> テスト仕様書作成の参考資料には含めないでください。

## メタデータ
- **画面名**: 評価登録確認タブ
- **物理名**: EvaluationRegistrationTab.tsx
- **ファイルパス**: `frontend/src/components/project/EvaluationRegistrationTab.tsx`
- **利用権限**: 実験管理者（experiment_admin）
- **作成日**: 2026-08-14
- **最終更新日**: 2026-08-25
- **担当者**: Development Team
- **バージョン**: 1.1.0

---

## 1. 画面概要

### 1.1. 目的

プロジェクト管理画面内のタブコンポーネントとして、**定性評価の登録状況確認**と**評価入力**を提供します。
`EvaluationDialog` の `ResultPanel` 相当の機能を独立タブとして実装したもので、プロジェクト管理画面に直接埋め込まれます。

### 1.2. アクセス権限

| ロール | アクセス |
|--------|---------|
| `experiment_admin` | ✅ 閲覧・編集可（権限フラグによる制御あり）|
| `system_admin` | ✅ 閲覧・編集可 |
| `experiment_worker` | ❌ アクセス不可 |

### 1.3. 主要機能

1. 評価結果一覧の表示（評価単位別にグループ化、Collapse）
2. 評価単位・メソッド・タスクNoによるフィルタリング ※2026-08-25 変更：「不確かさ基準」フィルタを削除
3. 「評価を入力」ボタンから `InputModal` を開いて評価を登録
4. プロジェクトメソッドを自律的にAPIから取得（`getProjectMethods`）

> ⚠️ **[2026-08-25 更新]**: 不確かさ基準を自律的にAPIから取得する処理（`fetchUncertaintyCriteriaForSelector`）を廃止。評価値選択肢は固定値「良好」「要確認」「不要」を直接使用する仕様に変更。

---

## 2. コンポーネント Props 定義

```typescript
export interface EvaluationRegistrationTabProps {
  projectId: string;
  /** 編集権限フラグ。false の場合は変更系ボタンを非活性 */
  isEditable?: boolean;
  /** プロジェクト完了フラグ。true の場合は変更系ボタンを非活性 */
  isProjectCompleted?: boolean;
  /** チェックアウト中フラグ。true の場合は変更系ボタンを非活性 */
  isCheckoutLocked?: boolean;
}
```

| Prop名 | 型 | 必須 | デフォルト | 説明 |
|--------|-----|------|-----------|------|
| `projectId` | `string` | ✅ | — | プロジェクトID |
| `isEditable` | `boolean` | ❌ | `true` | 編集権限フラグ |
| `isProjectCompleted` | `boolean` | ❌ | `false` | プロジェクト完了フラグ |
| `isCheckoutLocked` | `boolean` | ❌ | `false` | チェックアウト中フラグ |

---

## 3. 変更系ボタンの活性制御

```typescript
const isLocked = !isEditable || isProjectCompleted || isCheckoutLocked;
```

`isEditable=false`、`isProjectCompleted=true`、`isCheckoutLocked=true` のいずれかが true の場合、「評価を入力」ボタンを非活性化。

---

## 4. データ取得

`EvaluationDialog` と異なり、Props からデータを受け取らず、自律的にAPIから取得する。

| データ | API | 取得タイミング |
|--------|-----|--------------|
| 不確かさ基準一覧 | `fetchUncertaintyCriteriaForSelector` | マウント時 |
| プロジェクトメソッド一覧 | `getProjectMethods(projectId)` | マウント時 |
| レビュー待ちタスク | `getExperimentInstructions(projectId)` | マウント時 |
| 評価結果一覧 | `getEvaluationsByProject(projectId)` | マウント時・保存後 |

> ⚠️ **[2026-08-25 更新]**: 「不確かさ基準一覧（`fetchUncertaintyCriteriaForSelector`）」の取得は廃止。

---

## 5. レイアウト

```
┌────────────────────────────────────────────────────────┐
│ 評価登録確認タブ（プロジェクト管理画面内）               │
│                                                        │
│ [✏️ 評価を入力]                         ← 右寄せ      │
│                                                        │
│ 評価単位: ○全て ○メソッド ○タスク                    │
│           ○トランジション(メソッド別)                   │
│           ○トランジション(タスク別)                    │
│                                                        │
│ （transition系のみ）メソッド [絞り込み ▼]              │
│                                                        │
│ ▼ メソッド単位（N件）                                  │
│   [対象][評価値][コメント][評価日時]                    │

> ⚠️ **[2026-08-25 更新]**: 「不確かさ基準 [絞り込み ▼]」フィルタを削除。
│ ▼ タスク単位（N件）                                    │
│   ...                                                  │
└────────────────────────────────────────────────────────┘
```

---

## 6. InputModal（内包）

`EvaluationDialog` の `InputModal` と同一の実装を内包。
評価単位・評価値・コメントを入力し、`saveEvaluations` API で保存。

> ⚠️ **[2026-08-25 更新]**: 評価値の選択肢は不確かさ基準の `intuitionOptions` から動的生成する方式を廃止し、固定値「**良好**」「**要確認**」「**不要**」の3択に変更。

```typescript
// 固定評価値選択肢
const EVAL_VALUE_OPTIONS = [
  { label: '良好', value: '良好' },
  { label: '要確認', value: '要確認' },
  { label: '不要', value: '不要' },
];
```

---

## 7. 備考・注意事項

1. `EvaluationDialog` との違い: Props からデータを受け取らず自律取得する点と、`isEditable`/`isProjectCompleted`/`isCheckoutLocked` による権限制御が追加されている点。
2. モックデータ (`MOCK_TRANSITION_NAMES`) はMAIMLパース統合後に削除予定。

---

## 8. 変更履歴

| 日付 | バージョン | 変更内容 | 担当者 |
|------|-----------|----------|--------|
| 2026-08-25 | 1.1.0 | §1.3: 「不確かさ基準」フィルタ削除・主要機能から `fetchUncertaintyCriteriaForSelector` 取得を廃止。§4: データ取得表から不確かさ基準一覧を削除。§5: レイアウトから「不確かさ基準 [絞り込み ▼]」フィルタを削除。§6: 評価値選択肢を動的生成→固定値「良好/要確認/不要」に変更。 | Cline |
| 2026-08-14 | 1.0.0 | 初版作成 | Development Team |
