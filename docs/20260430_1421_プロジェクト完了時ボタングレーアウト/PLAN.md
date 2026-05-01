# タスク計画書: プロジェクト完了時ボタングレーアウト

## メタデータ
- **作成日時**: 2026-04-30 14:21
- **タスクID**: project-completed-button-disable
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

プロジェクト管理画面（`ProjectManagement.tsx`）のファイル操作ツールバーにある各ボタンに、プロジェクト完了時（`status === 4`）のグレーアウト制御を追加する。

## 目的と期待される成果

### 目的
プロジェクトが完了状態のときに、ファイル操作（アップロード・編集・削除）を画面上で防止する。

### 期待される成果
- [x] `status === 4` のプロジェクトで「アップロード」ボタンがグレーアウトされる
- [x] `status === 4` のプロジェクトで「編集」ボタンがグレーアウトされる
- [x] `status === 4` のプロジェクトで「削除」ボタンがグレーアウトされる
- [x] 各ボタンに `status === 4` 時のツールチップメッセージが追加される

## 実装ステップ

### Phase 1: ファイル操作ツールバー（完了済み）
- [x] Step 1: アップロードボタンに `status === 4` の disabled 制御 + tooltip 追加
- [x] Step 2: 編集ボタンに `status === 4` の disabled 制御 + tooltip 優先表示ロジック追加
- [x] Step 3: 削除ボタンに `status === 4` の disabled 制御 + tooltip 追加

### Phase 2: タスク登録タブの指示追加ボタン
- [x] Step 4: `TaskRegistrationTab.tsx` に `isProjectCompleted` prop を追加
- [x] Step 5: `isFieldDisabled` の条件に `isProjectCompleted` を追加（行単位「指示追加」ボタン）
- [x] Step 6: プロジェクト指示追加ボタンの `disabled` 条件に `isProjectCompleted` を追加
- [x] Step 7: `ProjectManagement.tsx` から `isProjectCompleted={selectedProject?.status === 4}` を渡す

## 変更ファイル

1. `frontend/src/components/project/ProjectManagement.tsx` - ファイル操作ツールバーの3ボタンに disabled + tooltip 追加（完了済み）、`TaskRegistrationTab` に `isProjectCompleted` prop を渡す
2. `frontend/src/components/project/TaskRegistrationTab.tsx` - `isProjectCompleted` prop 追加・`isFieldDisabled` 更新・プロジェクト指示追加ボタンの disabled 条件更新

## 影響範囲

- チェックアウト/チェックインボタンは既に `disabled={selectedProject?.status === 4}` が実装済みのため変更不要
- `TaskRegistrationTab` の `isProjectCompleted` prop は `isCheckoutLocked` と同様の設計パターンで実装

## リスク

| リスク | 対策 |
|--------|------|
| チェックアウト中の編集ボタン制御との競合 | `status === 4` を `isProjectCheckedOut` より優先してツールチップ表示 |

## テスト計画

- [x] `status === 4` のプロジェクトでアップロード/編集/削除ボタンがグレーアウトされることを確認
- [x] `status !== 4` のプロジェクトで通常通りボタンが活性化されることを確認
- [x] チェックアウト中かつ `status === 4` の場合に `status === 4` のツールチップが優先表示されることを確認

## 承認記録

- **計画書提示日時**: 2026-04-30 14:21
- **承認日時**: 2026-04-30 14:21
- **承認者コメント**: 承認済み

## 実施記録

### 実施日時
開始: 2026-04-30 14:21  
完了: 2026-04-30 15:00

### 変更内容詳細

#### アップロードボタン
```tsx
// 変更前
disabled={!selectedProject}

// 変更後
disabled={!selectedProject || selectedProject.status === 4}
title={selectedProject?.status === 4 ? 'プロジェクト完了後はアップロードできません' : undefined}
```

#### 編集ボタン
```tsx
// 変更前
disabled={!selectedProject || isProjectCheckedOut}
title={isProjectCheckedOut ? 'チェックイン状態でのみ編集できます' : undefined}

// 変更後
disabled={!selectedProject || isProjectCheckedOut || selectedProject.status === 4}
title={selectedProject?.status === 4 ? 'プロジェクト完了後は編集できません' : isProjectCheckedOut ? 'チェックイン状態でのみ編集できます' : undefined}
```

#### 削除ボタン
```tsx
// 変更前
disabled={!selectedProject}

// 変更後
disabled={!selectedProject || selectedProject.status === 4}
title={selectedProject?.status === 4 ? 'プロジェクト完了後は削除できません' : undefined}
```

#### TaskRegistrationTab.tsx — prop 追加
```tsx
// インターフェースに追加
/** プロジェクト完了状態（status === 4）の場合 true */
isProjectCompleted?: boolean;
```

#### 指示追加ボタン（行単位・`isFieldDisabled`）
```tsx
// 変更前
return isSaving || loadingMethods || isCheckoutLocked || record.workerLinkedFlg || !!maimlHasErrors;

// 変更後
return isSaving || loadingMethods || isCheckoutLocked || record.workerLinkedFlg || !!maimlHasErrors || !!isProjectCompleted;
```

#### プロジェクト指示追加ボタン（`project-instruction-button`）
```tsx
// 変更前
disabled={loadingMethods || isCheckoutLocked || maimlHasErrors}

// 変更後
disabled={loadingMethods || isCheckoutLocked || maimlHasErrors || !!isProjectCompleted}
```

#### ProjectManagement.tsx — `isProjectCompleted` prop を渡す
```tsx
// 変更前
<TaskRegistrationTab ... maimlHasErrors={maimlHasErrors} />

// 変更後
<TaskRegistrationTab ... maimlHasErrors={maimlHasErrors} isProjectCompleted={selectedProject?.status === 4} />
```

### 最終的な成果物
- [x] アップロードボタン: `status === 4` 時 disabled + tooltip 追加
- [x] 編集ボタン: `status === 4` 時 disabled + tooltip 優先表示追加
- [x] 削除ボタン: `status === 4` 時 disabled + tooltip 追加
- [x] 指示追加ボタン（行単位）: `isProjectCompleted` prop 経由で `status === 4` 時 disabled 制御追加
- [x] プロジェクト指示追加ボタン: `isProjectCompleted` prop 経由で `status === 4` 時 disabled 制御追加

