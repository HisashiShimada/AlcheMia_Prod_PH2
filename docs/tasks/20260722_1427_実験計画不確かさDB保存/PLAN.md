# タスク計画書: 実験計画詳細指示ダイアログ 不確かさDB保存実装

## メタデータ
- **作成日時**: 2026-07-22 14:27
- **タスクID**: 実験計画不確かさDB保存
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

実験計画詳細指示ダイアログ（`ExperimentPlanDialog`）内の `TemplateInputPanel` で
ユーザーが付与した「不確かさ」が、DB（`experiment_plan` テーブルの `planned_values` JSONB）
に保存されていなかった問題を修正する。

## 原因

`TemplateInputPanel` は `assignedUncertainty` / `onAssignedUncertaintyChange` props を
持っていたが、親コンポーネント `ExperimentPlanDialog.tsx` でこれらの props が渡されていなかった。

## 実装内容

### 変更ファイル

| ファイル | 変更内容 |
|--------|--------|
| `frontend/src/types/experimentPlan.ts` | `ExperimentPlanTabData.assignedUncertainty` の型を `AssignPayload[]` に統一 |
| `frontend/src/types/experimentPlanDialog.ts` | `InheritableField` に `'assignedUncertainty'` を追加 |
| `frontend/src/components/project/ExperimentPlanDialog.tsx` | `handleAssignedUncertaintyChange` ハンドラ追加 + `TemplateInputPanel` に `assignedUncertainty` / `onAssignedUncertaintyChange` props 渡し |

### 保存/復元ロジック（変更なし・既に実装済み）

`frontend/src/services/experimentPlanApiService.ts` の `tabDataToTransitionValues` 関数が
`tabData.assignedUncertainty` を `__uncertainty__` キーとして JSONB に保存する実装は
**既に存在していた**。今回は「フロント側で state が `tabData` に反映されない」という
接続漏れを修正したのみ。

## 実装詳細

### 1. 型定義修正（`experimentPlan.ts`）

`ExperimentPlanTabData.assignedUncertainty` を `UncertaintyAssignment[]` から
`AssignPayload[]` （`UncertaintyCriteriaSelectorModal` からの import）に変更。
これにより `TemplateInputPanel` の props 型と完全一致する。

### 2. `InheritableField` 追加（`experimentPlanDialog.ts`）

```typescript
export type InheritableField =
  | 'creatorRefs'
  | 'instrumentRefs'
  | 'ownerRefs'
  | 'notes'
  | 'templateValues'
  | 'assignedUncertainty';  // ← 追加
```

### 3. ハンドラ追加と props 渡し（`ExperimentPlanDialog.tsx`）

```typescript
// ハンドラ追加
const handleAssignedUncertaintyChange = useCallback(
  (next: ExperimentPlanTabData['assignedUncertainty']) => {
    updateCurrentTabData('assignedUncertainty', (prev) => ({
      ...prev,
      assignedUncertainty: next,
    }));
  },
  [updateCurrentTabData]
);

// TemplateInputPanel に props 渡し
<TemplateInputPanel
  ...
  assignedUncertainty={currentTabData.assignedUncertainty}
  onAssignedUncertaintyChange={handleAssignedUncertaintyChange}
/>
```

## テスト計画

- [ ] 実験計画詳細指示ダイアログを開く
- [ ] トランジションを選択し「テンプレート入力」タブに切り替える
- [ ] プロパティに不確かさを付与する
- [ ] 「保存」ボタンをクリック
- [ ] DB（`experiment_plan.planned_values`）の `__uncertainty__` キーに不確かさデータが登録されていることを確認
- [ ] ダイアログを再度開いたとき、不確かさが復元表示されることを確認

## 承認記録

- **計画書提示日時**: 2026-07-22 14:27
- **承認日時**: 2026-07-22 14:27（実装完了後）
