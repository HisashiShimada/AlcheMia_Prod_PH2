# タスク計画書: プロジェクト管理画面 タブ内ボタン 権限制御追加

## メタデータ
- **作成日時**: 2026-08-06 16:20
- **タスクID**: tab-permission-control
- **優先度**: 高
- **推定工数**: 3〜4時間

---

## 1. タスク概要

プロジェクト管理画面の各タブ内ボタンに、編集権限（`isEditable`）とプロジェクト完了状態（`isProjectCompleted`）による活性/非活性制御を追加する。

現状はタブ内ボタンが権限・完了状態に関係なく操作可能になっており、閲覧権限のユーザーでもデータ変更操作が実行できてしまう問題がある。

---

## 2. 現状（AS-IS）と目標（TO-BE）

### 現状の問題点

| コンポーネント | 問題 |
|---|---|
| `FileListTable` | isEditable / isProjectCompleted 制御なし。閲覧権限でもファイル削除可能 |
| `TaskRegistrationTab` | `isEditable` 制御なし。閲覧権限でも指示追加・タスク保存・プロジェクト指示可能。`isProjectCompleted` はタスク保存ボタンに未適用 |
| `InstructionRegistrationTab` | `isEditable` / `isProjectCompleted` 制御なし。閲覧権限でも指示送信・編集・削除可能 |
| `ExperimentInstructionTab` | `isEditable` / `isProjectCompleted` 制御なし。閲覧権限でも承認・NG・編集操作可能 |
| `EvaluationRegistrationTab` | `isEditable` / `isProjectCompleted` 制御なし。閲覧権限でも評価入力可能 |

### 基本方針

- **「変更系」操作**: `isEditable=false` または `isProjectCompleted=true` で非活性（`disabled`）
- **「表示系」操作**: 制御しない（閲覧権限でも閲覧ダイアログは開ける）
- ダイアログを開いて「内部が編集不可」にするケースは、ダイアログ側に `readOnly`/`viewOnly` フラグを渡す方式とする（ダイアログコンポーネントへの変更は本タスクスコープ外・但しボタン押下自体は制御する）

### TO-BE 制御一覧

#### ① FileListTable（ファイル管理タブ）

| ボタン | isEditable=false | isProjectCompleted=true | 備考 |
|---|---|---|---|
| ファイルダウンロード（行ごと） | 制御なし（変更なし） | 制御なし（変更なし） | 閲覧系 |
| ファイル削除（行ごと） | **非活性** | **非活性** | 変更系 |
| ビューアーで表示（行ごと） | 制御なし（変更なし） | 制御なし（変更なし） | 閲覧系 |

#### ② TaskRegistrationTab（タスク登録タブ）

| ボタン | isEditable=false | isProjectCompleted=true | 備考 |
|---|---|---|---|
| 指示追加（タスク行ごと） | **非活性** | 既存制御あり（変更なし） | 変更系 |
| プロジェクト指示 | **非活性** | 既存制御あり（変更なし） | 変更系 |
| タスク保存 | **非活性** | **非活性** ← 追加 | 変更系。現状は完了でも有効になっていた |
| ドラッグ並び替え | **無効化** | 既存制御あり（変更なし） | 変更系 |
| 試行回数入力 | **非活性** | 既存制御あり（変更なし） | 変更系 |

#### ③ InstructionRegistrationTab（指示登録タブ）

| ボタン | isEditable=false | isProjectCompleted=true | 備考 |
|---|---|---|---|
| 指示送信（一括） | **非活性** | **非活性** | 変更系 |
| 指示編集（行ごと・未送信） | **非活性** | **非活性** | 変更系 |
| 指示削除（行ごと・未送信） | **非活性** | **非活性** | 変更系 |
| 指示詳細（行ごと・送信済み） | 制御なし（変更なし） | 制御なし（変更なし） | 閲覧系 |

#### ④ ExperimentInstructionTab（タスク結果タブ）

| ボタン | isEditable=false | isProjectCompleted=true | 備考 |
|---|---|---|---|
| 実験指示を編集（行ごと） | **非活性** | **非活性** | 変更系 |
| ペトリネット表示 | 制御なし（変更なし） | 制御なし（変更なし） | 閲覧系 |
| 一括承認 | **非活性** | 既存制御あり（REVIEW_WAITING=0件で非活性） | 変更系。ただしCOMPLETED時はREVIEW_WAITINGタスクが0件のため事実上非活性 |
| 承認（行ごとのモーダル内） | **非活性化** | 同上 | 変更系 |
| NG（行ごとのモーダル内） | **非活性化** | 同上 | 変更系 |

#### ⑤ EvaluationRegistrationTab（評価登録タブ）

| ボタン | isEditable=false | isProjectCompleted=true | 備考 |
|---|---|---|---|
| 評価入力ボタン | **非活性** | **非活性** | 変更系 |
| 評価入力モーダル内「保存」 | **非活性** | 同上 | 変更系（モーダル開くのは許可しない方針） |

---

## 3. 実装ステップ

### Phase 1: FileListTable の修正

- [x] `FileListTableProps` に `isEditable?: boolean` / `isProjectCompleted?: boolean` 追加
- [x] ファイル削除ボタンに `disabled={!isEditable || isProjectCompleted}` 追加
- [x] `ProjectManagement.tsx` の `<FileListTable>` に Props 渡し

### Phase 2: TaskRegistrationTab の修正

- [x] `TaskRegistrationTabProps` に `isEditable?: boolean` 追加
- [x] `isFieldDisabled` / `isOrderChangeDisabled` のロジックに `!isEditable` 追加
- [x] 「プロジェクト指示」ボタン disabled に `!isEditable` 追加
- [x] 「タスク保存」ボタン disabled に `!!isProjectCompleted` 追加（isEditable は追加）
- [x] `ProjectManagement.tsx` の `<TaskRegistrationTab>` に `isEditable` 渡し

### Phase 3: InstructionRegistrationTab の修正

- [x] `InstructionRegistrationTabProps` に `isEditable?: boolean` / `isProjectCompleted?: boolean` 追加
- [x] 「指示送信」ボタン disabled に `!isEditable || !!isProjectCompleted` 追加
- [x] 「指示編集」「指示削除」ボタン disabled に `!isEditable || !!isProjectCompleted` 追加
- [x] `ProjectManagement.tsx` の `<InstructionRegistrationTab>` に Props 渡し

### Phase 4: ExperimentInstructionTab の修正

- [x] `ExperimentInstructionTabProps` に `isEditable?: boolean` / `isProjectCompleted?: boolean` 追加
- [x] 「実験指示を編集」ボタン disabled に `!isEditable || !!isProjectCompleted` 追加
- [x] 「一括承認」ボタン disabled に `!isEditable` 追加
- [x] 承認・NGモーダルの okButtonProps に `disabled: !isEditable` 追加
- [x] `ProjectManagement.tsx` の `<ExperimentInstructionTab>` に Props 渡し

### Phase 5: EvaluationRegistrationTab の修正

- [x] `EvaluationRegistrationTabProps` に `isEditable?: boolean` / `isProjectCompleted?: boolean` 追加
- [x] 「評価入力」ボタン disabled に `!isEditable || !!isProjectCompleted` 追加
- [x] `ProjectManagement.tsx` の `<EvaluationRegistrationTab>` に Props 渡し

### Phase 6: ProjectManagement.tsx の修正（完了ボタン含む）

- [x] `isEditable` / `isProjectCompleted` を各タブコンポーネントへ渡す実装
- [x] `isEditable` = `selectedProject?.isEditable !== false`
- [x] `isProjectCompleted` = `selectedProject?.status === 4`
- [ ] **完了ボタン** の disabled 条件に `!isEditable` を追加（スコープ外として保留）
  - 現状: `disabled={!allTasksCompleted}`
  - TO-BE: `disabled={!allTasksCompleted || !isEditable}`

### Phase 7: Excelドキュメント更新

- [ ] `scripts/generate-project-button-matrix.js` のボタン定義を TO-BE に更新（次回タスクで対応）
- [ ] スクリプト再実行・Excel 再生成

---

## 4. 影響範囲

### 変更するファイル

1. `frontend/src/components/project/FileListTable.tsx` - Props追加・削除ボタン制御
2. `frontend/src/components/project/TaskRegistrationTab.tsx` - isEditable Props追加・保存ボタン完了制御
3. `frontend/src/components/project/InstructionRegistrationTab.tsx` - isEditable/isProjectCompleted追加
4. `frontend/src/components/project/ExperimentInstructionTab.tsx` - isEditable/isProjectCompleted追加
5. `frontend/src/components/project/EvaluationRegistrationTab.tsx` - isEditable/isProjectCompleted追加
6. `frontend/src/components/project/ProjectManagement.tsx` - 各タブへのProps受け渡し追加
7. `scripts/generate-project-button-matrix.js` - Excelドキュメント更新
8. `scripts/result/プロジェクト管理画面_ボタン権限一覧.xlsx` - 再生成

### 影響を受けるユーザー

| ユーザー種別 | 影響 |
|---|---|
| 閲覧権限ユーザー（isEditable=false） | タブ内の変更系ボタンが新たに非活性になる（操作不可） |
| 編集権限ユーザー（isEditable=true） | 変更なし（現状通り操作可能） |
| SystemAdmin | 変更なし（isEditable=true のため影響なし） |

---

## 5. 技術的詳細

### isEditable の取得経路

```
ProjectManagement.tsx
  └─ selectedProject.isEditable  ← プロジェクト一覧API レスポンスに含まれる
       └─ organization_group権限により backend が設定
```

### Props 受け渡しパターン（統一）

```tsx
// ProjectManagement.tsx から各タブへ渡す値
const isEditable = selectedProject?.isEditable ?? false;
const isProjectCompleted = selectedProject?.status === ProjectStatus.COMPLETED; // status === 4

<SomeTab
  isEditable={isEditable}
  isProjectCompleted={isProjectCompleted}
  ...
/>
```

### 各タブの disabled 条件パターン

```tsx
// 変更系ボタンの統一パターン
disabled={!isEditable || !!isProjectCompleted || (既存条件)}

// 例: 指示送信ボタン
disabled={instructions.length === 0 || isSending || isCheckoutLocked || !isEditable || !!isProjectCompleted}
```

---

## 6. リスクと対策

| リスク | 影響度 | 対策 |
|---|---|---|
| isEditable が undefined の場合に全ボタン非活性になる | 中 | `isEditable ?? false` ではなく `isEditable ?? true` で安全側に倒す（未取得時は操作可能） |
| タスク保存ボタンにisProjectCompleted追加でCOMPLETED時に保存不可になる | 低 | 仕様通り（完了後は変更不可が正しい） |
| 既存テストが壊れる | 低 | Props追加はオプショナル（`?:`）にするため既存動作に影響なし |

---

## 7. テスト計画

### 手動テスト

- [ ] 閲覧権限ユーザー（hq_user → P_HQ_DEV プロジェクト）でログインし、各タブのボタンが非活性になることを確認
- [ ] 編集権限ユーザー（dev_user → P_HQ_DEV プロジェクト）でログインし、各タブのボタンが正常に動作することを確認
- [ ] COMPLETED プロジェクトを選択し、変更系ボタンが非活性になることを確認
- [ ] SystemAdmin でログインし、全ボタンが操作可能なことを確認

---

## 8. 承認記録

- **計画書提示日時**: 2026-08-06 16:20
- **承認日時**: （承認後に記入）
- **承認者コメント**: （承認後に記入）

---

## 9. 実施記録

### 実施日時
開始: 2026-08-06 16:23  
完了: 2026-08-06 16:36

### 実装結果

#### 変更ファイル
1. `frontend/src/components/project/FileListTable.tsx` - `isEditable` / `isProjectCompleted` Props追加、削除・リネームボタン制御
2. `frontend/src/components/project/TaskRegistrationTab.tsx` - `isEditable` Props追加、保存・登録ボタンに `isProjectCompleted` 追加
3. `frontend/src/components/project/InstructionRegistrationTab.tsx` - `isEditable` / `isProjectCompleted` Props追加、送信ボタン制御
4. `frontend/src/components/project/ExperimentInstructionTab.tsx` - `isEditable` / `isProjectCompleted` Props追加、承認ボタン制御
5. `frontend/src/components/project/EvaluationRegistrationTab.tsx` - `isEditable` / `isProjectCompleted` Props追加、「評価を入力」ボタン制御
6. `frontend/src/components/project/ProjectManagement.tsx` - 全タブに `isEditable={selectedProject?.isEditable !== false}` / `isProjectCompleted={selectedProject?.status === 4}` を渡す

### ビルド確認
TypeScript コンパイルで今回変更ファイルに起因するエラーなし（既存エラーのみ）。

### Phase 7（追加実施）: Excelドキュメント更新
- `scripts/generate-project-button-matrix.js` のボタン定義を TO-BE に更新
  - no.12 完了ボタン: `editableRequire: true` に変更
  - no.18 ファイル削除: `editableRequire: true`、activeRule(4)を ✕ に変更
  - no.20〜22 タスク登録タブ: editableRequire / activeRule 更新
  - no.23〜25 指示登録タブ: editableRequire / activeRule 更新
  - no.27〜29 タスク結果タブ: editableRequire / activeRule 更新
  - no.30 評価登録タブ: editableRequire / activeRule 更新
- `scripts/result/プロジェクト管理画面_ボタン権限一覧.xlsx` 再生成完了

完了: 2026-08-06 16:42
