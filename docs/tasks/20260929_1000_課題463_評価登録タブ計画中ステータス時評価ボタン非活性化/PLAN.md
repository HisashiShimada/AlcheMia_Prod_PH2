# タスク計画書: 評価登録タブ「評価を入力」ボタン - プロジェクト計画中ステータス時の非活性化

## メタデータ
- **作成日時**: 2026-09-29 10:00
- **タスクID**: 20260929_1000_課題463_評価登録タブ計画中ステータス時評価ボタン非活性化
- **課題番号**: 課題対応-463
- **優先度**: 中
- **推定工数**: 30分

---

## タスク概要

実験管理者メニュー > プロジェクト管理画面 > 評価登録確認タブにて、
プロジェクトステータスが「プロジェクト計画中」（`status = 0: PLANNING`）の場合、
「評価を入力」ボタンを非活性にする。

---

## 背景・調査結果

### 現在の「評価を入力」ボタンの `disabled` 条件

`EvaluationRegistrationTab.tsx`（L575）:

```tsx
<Button
  disabled={!isEditable || isProjectCompleted || isCheckoutLocked || maimlHasErrors}
>
  {t('evaluation.buttons.inputEvaluation')}
</Button>
```

| Props | 意味 |
|---|---|
| `!isEditable` | 編集権限がない |
| `isProjectCompleted` | プロジェクト完了（status=4）またはタスク異常終了（status=5） |
| `isCheckoutLocked` | チェックアウト中 |
| `maimlHasErrors` | MAIMLバリデーションエラーあり |

`status = 0`（プロジェクト計画中）は現在いずれの条件にも該当しないため、ボタンが活性のままになっている。

### ラッパーコンポーネントでの `isProjectCompleted` 算出箇所

`EvaluationRegistrationTabContent.tsx`:

```tsx
const isProjectCompleted =
  selectedProject.status === ProjectStatus.COMPLETED ||
  selectedProject.status === ProjectStatus.ERROR;
```

このファイルが `EvaluationRegistrationTab` に Props を渡している。

### 関連定数

`frontend/src/constants/codeMaster.ts`:

```typescript
export const ProjectStatus = {
  PLANNING: 0,   // ← 今回対象
  TASK_PENDING: 1,
  TASK_IN_PROGRESS: 2,
  REVIEW_WAITING: 3,
  COMPLETED: 4,
  ERROR: 5,
  REVIEW_REJECTED: 6,
} as const;
```

---

## 実装ステップ

### Phase 1: 計画書作成・承認（完了）

- [x] 調査
- [x] 計画書作成

### Phase 2: EvaluationRegistrationTabContent.tsx の修正

- [x] `isProjectPlanning` フラグを追加し、`EvaluationRegistrationTab` に渡す

**変更内容:**

```diff
  const isProjectCompleted =
    selectedProject.status === ProjectStatus.COMPLETED ||
    selectedProject.status === ProjectStatus.ERROR;
+ const isProjectPlanning = selectedProject.status === ProjectStatus.PLANNING;

  return (
    <EvaluationRegistrationTab
      projectId={selectedProject.id}
      isEditable={selectedProject.isEditable !== false}
      isProjectCompleted={isProjectCompleted}
+     isProjectPlanning={isProjectPlanning}
      isCheckoutLocked={isProjectCheckedOut}
      maimlHasErrors={maimlHasErrors}
    />
  );
```

### Phase 3: EvaluationRegistrationTab.tsx の修正

- [x] `EvaluationRegistrationTabProps` インターフェースに `isProjectPlanning` を追加
- [x] ボタンの `disabled` 条件に `isProjectPlanning` を追加

**変更内容①（Props インターフェース）:**

```diff
  export interface EvaluationRegistrationTabProps {
    projectId: string;
    isEditable?: boolean;
    isProjectCompleted?: boolean;
+   /** プロジェクト計画中フラグ。true の場合は変更系ボタンを非活性にする */
+   isProjectPlanning?: boolean;
    isCheckoutLocked?: boolean;
    maimlHasErrors?: boolean;
  }
```

**変更内容②（ボタン `disabled` 条件）:**

```diff
- disabled={!isEditable || isProjectCompleted || isCheckoutLocked || maimlHasErrors}
+ disabled={!isEditable || isProjectPlanning || isProjectCompleted || isCheckoutLocked || maimlHasErrors}
```

### Phase 4: ビルド確認

- [x] TypeScript コンパイルエラーがないことを確認

---

## 変更ファイル一覧

| # | ファイルパス | 修正内容 |
|---|------------|---------|
| 1 | `frontend/src/components/project/subcomponents/tabs/EvaluationRegistrationTabContent.tsx` | `isProjectPlanning` フラグ算出と Props 渡しを追加 |
| 2 | `frontend/src/components/project/EvaluationRegistrationTab.tsx` | Props インターフェースに `isProjectPlanning` 追加、ボタンの `disabled` 条件に追加 |

---

## 影響範囲

- プロジェクト管理画面（実験管理者ロール）の評価登録確認タブのみ
- バックエンドへの変更なし
- 他画面・他機能への影響なし

---

## リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| `isProjectPlanning` が `undefined` の場合の挙動 | 低 | `EvaluationRegistrationTab` 内でデフォルト値 `false` として扱われる（`undefined` は falsy）ため影響なし |
| 既存の `disabled` 条件への影響 | なし | 新規条件の追加のみで既存条件は変更しない |

---

## テスト計画

### 手動確認

- [ ] プロジェクトステータスが「プロジェクト計画中」（status=0）の場合、「評価を入力」ボタンが非活性になること
- [ ] プロジェクトステータスが「タスク実行待ち」（status=1）以降の場合、既存の活性制御が変わらないこと
  - status=1（タスク実行待ち）：ボタン活性
  - status=2（タスク実行中）：ボタン活性
  - status=3（レビュー待ち）：ボタン活性
  - status=4（完了）：ボタン非活性（isProjectCompleted による）
  - status=5（異常終了）：ボタン非活性（isProjectCompleted による）

### ビルド確認

- [ ] TypeScript エラーなし

---

## 承認記録

- **計画書提示日時**: 2026-09-29 10:00
- **承認日時**: 
- **承認者コメント**: 
