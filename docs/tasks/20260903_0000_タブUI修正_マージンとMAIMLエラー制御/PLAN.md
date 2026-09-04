# タスク計画書: タブUI修正 - マージン・MAIMLエラー制御・ステータス定数統一

## メタデータ
- **作成日時**: 2026-09-03 00:00
- **タスクID**: 20260903_0000
- **優先度**: 中
- **推定工数**: 1〜2時間

---

## タスク概要

以下の3つの問題を修正する。

1. **マージン・パディング不足**：実験指示タブ・評価登録タブ・全体評価タブで、コンテンツが左右の端にべた付きになっている
2. **MAIMLエラー時の制御未実装**：タスク登録タブには `maimlHasErrors` によるボタン制御が実装済みだが、プロジェクト指示・実験指示・評価登録・全体評価タブには未実装
3. **ステータス定数の直接リテラル使用**：一部ファイルで `status === 4 || status === 5` と直接リテラルを使っており、`ProjectStatus` 定数が未使用

---

## 目的と期待される成果

- [ ] 実験指示・評価登録・全体評価タブのコンテンツに適切な左右パディングが付く
- [ ] プロジェクト指示・実験指示・評価登録・全体評価タブで MAIMLにエラーがある場合は変更系ボタンが非活性になる
- [ ] `isProjectCompleted` の計算で `ProjectStatus` 定数を使うよう統一される

---

## 実装ステップ

### Phase 1: 計画書作成・承認（完了）

- [x] 調査
- [x] 計画書作成

### Phase 2: MAIMLエラー制御の伝播（ProjectManagementInner → TabContent → Tab）

- [ ] **2-1.** `ProjectManagementInner.tsx` の 3タブに `maimlHasErrors={maimlHasErrors}` を追加
  - `ExperimentInstructionTabContent`
  - `EvaluationRegistrationTabContent`
  - `OverallEvaluationTabContent`
  - `ProjectInstructionTabContent`（328行目）
- [ ] **2-2.** `ExperimentInstructionTabContent.tsx` に `maimlHasErrors` prop追加 → `ExperimentInstructionTab` へ渡す
- [ ] **2-3.** `EvaluationRegistrationTabContent.tsx` に `maimlHasErrors` prop追加 → `EvaluationRegistrationTab` へ渡す
- [ ] **2-4.** `OverallEvaluationTabContent.tsx` に `maimlHasErrors` prop追加 → `OverallEvaluationTab` へ渡す
- [ ] **2-5.** `ProjectInstructionTabContent.tsx` に `maimlHasErrors` prop追加 → `InstructionRegistrationTab` へ渡す

### Phase 3: 各タブコンポーネントのボタン制御修正

- [ ] **3-1.** `ExperimentInstructionTab.tsx`
  - props に `maimlHasErrors?: boolean` 追加
  - 「実験指示を編集」ボタン（1135行）の `disabled` 条件に `|| maimlHasErrors` 追加
  - 「承認」ボタン（1164行）の `disabled` 条件に `|| maimlHasErrors` 追加
  - 「修正モード」ボタン（1172行）の `disabled` 条件に `|| maimlHasErrors` 追加
- [ ] **3-2.** `EvaluationRegistrationTab.tsx`
  - props に `maimlHasErrors?: boolean` 追加
  - 「評価を入力」ボタン（572行）の `disabled` 条件に `|| maimlHasErrors` 追加
- [ ] **3-3.** `OverallEvaluationTab.tsx`（`OverallEvaluationTabProps` 型経由）
  - `types/projectOverallEvaluation.ts` の `OverallEvaluationTabProps` に `maimlHasErrors?: boolean` 追加
  - `isDisabled` の計算（338行）に `|| maimlHasErrors` 追加
- [ ] **3-4.** `InstructionRegistrationTab.tsx`
  - props に `maimlHasErrors?: boolean` 追加
  - 「編集」ボタン（405行）の `disabled` 条件に `|| maimlHasErrors` 追加
  - 「削除」ボタン（415行）の `disabled` 条件に `|| maimlHasErrors` 追加

### Phase 4: マージン・パディングの修正

- [ ] **4-1.** `ExperimentInstructionTabContent.tsx`：ラッパー `padding: '4px 0'` → `padding: '4px 16px'`
- [ ] **4-2.** `EvaluationRegistrationTabContent.tsx`：ラッパー `padding: '8px 0'` → `padding: '8px 16px'`
- [ ] **4-3.** `OverallEvaluationTabContent.tsx`：ラッパー `padding: '8px 0'` → `padding: '8px 16px'`

### Phase 5: ステータス定数の統一（直接リテラル → ProjectStatus定数）

- [ ] **5-1.** `ExperimentInstructionTabContent.tsx`：`status === 4 || status === 5` → `ProjectStatus.COMPLETED || ProjectStatus.ERROR`（import追加）
- [ ] **5-2.** `ProjectInstructionTabContent.tsx`：同上
- [ ] **5-3.** `TaskRegistrationTabContent.tsx`：同上

### Phase 6: ビルド確認

- [ ] `npm run build` または TypeScript コンパイルエラーがないことを確認

---

## 変更ファイル一覧

| # | ファイルパス | 修正内容 |
|---|------------|---------|
| 1 | `frontend/src/components/project/ProjectManagementInner.tsx` | 4タブに `maimlHasErrors={maimlHasErrors}` を追加 |
| 2 | `frontend/src/components/project/subcomponents/tabs/ExperimentInstructionTabContent.tsx` | `maimlHasErrors` prop追加、ステータス定数化、パディング修正 |
| 3 | `frontend/src/components/project/subcomponents/tabs/EvaluationRegistrationTabContent.tsx` | `maimlHasErrors` prop追加、パディング修正 |
| 4 | `frontend/src/components/project/subcomponents/tabs/OverallEvaluationTabContent.tsx` | `maimlHasErrors` prop追加、パディング修正 |
| 5 | `frontend/src/components/project/subcomponents/tabs/ProjectInstructionTabContent.tsx` | `maimlHasErrors` prop追加、ステータス定数化 |
| 6 | `frontend/src/components/project/subcomponents/tabs/TaskRegistrationTabContent.tsx` | ステータス定数化のみ |
| 7 | `frontend/src/components/project/ExperimentInstructionTab.tsx` | `maimlHasErrors` prop追加、ボタン制御に組み込み |
| 8 | `frontend/src/components/project/EvaluationRegistrationTab.tsx` | `maimlHasErrors` prop追加、ボタン制御に組み込み |
| 9 | `frontend/src/components/project/OverallEvaluationTab.tsx` | `maimlHasErrors` prop受取・isDisabledに組み込み |
| 10 | `frontend/src/components/project/InstructionRegistrationTab.tsx` | `maimlHasErrors` prop追加、ボタン制御に組み込み |
| 11 | `frontend/src/types/projectOverallEvaluation.ts` | `OverallEvaluationTabProps` に `maimlHasErrors` 追加 |

---

## 影響範囲

- プロジェクト管理画面（実験管理者ロール）の各タブ UI のみ
- バックエンドへの変更なし
- 他画面・他機能への影響なし

---

## リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| パディング変更によるレイアウト崩れ | 低 | タスク登録タブ（`token.paddingLG` = 24px）より小さい 16px を採用し慎重に調整 |
| `maimlHasErrors` が `undefined` の場合の挙動 | 低 | 各コンポーネントのデフォルト値を `false` に設定 |
| `OverallEvaluationTabProps` の型定義場所 | 低 | 事前調査済み：`types/projectOverallEvaluation.ts` に存在 |

---

## テスト計画

### 手動確認

- [ ] MAIMLにエラーがある状態で プロジェクト指示タブ の編集・削除ボタンが非活性になること
- [ ] MAIMLにエラーがある状態で 実験指示タブ の「実験指示を編集」「承認」「修正モード」ボタンが非活性になること
- [ ] MAIMLにエラーがある状態で 評価登録タブ の「評価を入力」ボタンが非活性になること
- [ ] MAIMLにエラーがある状態で 全体評価タブ の登録ボタン・評価ボタン・スライダー・テキストエリアが非活性になること
- [ ] 実験指示タブ・評価登録タブ・全体評価タブで左右に適切な余白が付いていること

### ビルド確認

- [ ] TypeScript エラーなし

---

## 承認記録

- **計画書提示日時**: 2026-09-03 00:00
- **承認日時**: 2026-09-03
- **承認者コメント**: 承認

## 実施記録

### 実施日時
開始: 2026-09-03
完了: 2026-09-03

### 最終的な成果物
- [x] Phase 2-1: `ProjectManagementInner.tsx` の4タブに `maimlHasErrors={maimlHasErrors}` 追加
- [x] Phase 2-2: `ExperimentInstructionTabContent.tsx` に `maimlHasErrors` prop追加・パディング修正・ステータス定数化
- [x] Phase 2-3: `EvaluationRegistrationTabContent.tsx` に `maimlHasErrors` prop追加・パディング修正
- [x] Phase 2-4: `OverallEvaluationTabContent.tsx` に `maimlHasErrors` prop追加・パディング修正
- [x] Phase 2-5: `ProjectInstructionTabContent.tsx` に `maimlHasErrors` prop追加・ステータス定数化
- [x] Phase 3-1: `ExperimentInstructionTab.tsx` の3ボタンに `|| maimlHasErrors` 追加
- [x] Phase 3-2: `EvaluationRegistrationTab.tsx` の「評価を入力」ボタンに `|| maimlHasErrors` 追加
- [x] Phase 3-3: `OverallEvaluationTab.tsx` の `isDisabled` 計算に `|| maimlHasErrors` 追加・`OverallEvaluationTabProps` 型に `maimlHasErrors` 追加
- [x] Phase 3-4: `InstructionRegistrationTab.tsx` の編集・削除ボタンに `|| maimlHasErrors` 追加
- [x] Phase 5-1: `TaskRegistrationTabContent.tsx` ステータス定数化
- [x] Phase 6: TypeScript ビルドチェック - 今回変更ファイルに起因するエラーなし（既存エラーのみ）

