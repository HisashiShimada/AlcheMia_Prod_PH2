# タスク計画書: antd message静的API警告修正

## メタデータ
- **作成日時**: 2026-09-07
- **タスクID**: antd_message_static_fix
- **優先度**: 中
- **推定工数**: 0.5時間

## タスク概要
`FileListTable.tsx` で antd の `message` を静的API（`import { message } from 'antd'`）として使用しているため、
`Warning: [antd: message] Static function can not consume context like dynamic theme. Please use 'App' component instead.`
というWarningが発生している。
同じ問題が `frontend/src/components/project` フォルダ内の他ファイルにないかも確認し、修正する。

## 目的と期待される成果
- [ ] `FileListTable.tsx` の antd message警告を解消
- [ ] `InstructionRegistrationTab.tsx` の antd message警告を解消
- [ ] 既存の `App.useApp()` パターンと統一した実装に揃える

## 調査結果
`frontend/src/components/project/` 配下で静的 `message` を使用しているファイル：

| ファイル | 状態 |
|---------|------|
| `FileListTable.tsx` | ❌ 静的 `message` を使用（修正必要） |
| `InstructionRegistrationTab.tsx` | ❌ 静的 `message` を使用（修正必要） |

すでに `App.useApp()` を使用しているファイル（修正不要）：
- `BulkUploadDialog.tsx`, `EvaluationDialog.tsx`, `EvaluationRegistrationTab.tsx`
- `ExperimentInstructionTab.tsx`, `ExperimentPlanDialog.tsx`, `OverallEvaluationTab.tsx`
- `ProjectCompletionDialog.tsx`, `ProjectManagementInner.tsx`, `RenameProjectModal.tsx`
- `TaskRegistrationTab.tsx`

## 実装ステップ
- [ ] `FileListTable.tsx` を修正
  - `message` を antd インポートから削除
  - `App` を antd インポートに追加
  - `const { message } = App.useApp();` をコンポーネント内に追加
- [ ] `InstructionRegistrationTab.tsx` を修正
  - 同様の変更

## 変更ファイル
1. `frontend/src/components/project/FileListTable.tsx`
2. `frontend/src/components/project/InstructionRegistrationTab.tsx`

## リスク
| リスク | 対策 |
|--------|------|
| `App.useApp()` を使うには antd の `App` コンポーネントが上位に存在する必要がある | 既に他コンポーネントで同パターンが使用されているため問題なし |

## 承認記録
- **計画書提示日時**: 2026-09-07
