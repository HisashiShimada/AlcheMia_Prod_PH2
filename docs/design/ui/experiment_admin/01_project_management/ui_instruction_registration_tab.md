# プロジェクト指示タブ UI仕様書

## メタデータ
- **画面名**: プロジェクト指示タブ
- **物理名**: InstructionRegistrationTab.tsx
- **ファイルパス**: `frontend/src/components/project/InstructionRegistrationTab.tsx`
- **利用権限**: 実験管理者（experiment_admin）
- **作成日**: 2026-06-22
- **最終更新日**: 2026-08-20
- **担当者**: Development Team
- **バージョン**: 3.0.0

---

> ⚠️ **名称変更**: 旧設計書では「指示登録タブ」という名称でしたが、現在の UI タブラベルは **「プロジェクト指示」** です。

---

## 1. 画面概要

### 1.1. 目的

プロジェクトに登録されたプロジェクト指示の一覧表示・管理を行うタブコンポーネントです。
未送信の指示の編集・削除機能を提供します。

### 1.2. 使用場面

- プロジェクト管理画面の **「プロジェクト指示」** タブ（`key: 'project_instruction'`）
- タスク登録タブで「プロジェクト指示」ボタンから追加された指示の確認・管理

### 1.3. アクセス権限

| ロール | アクセス |
|--------|---------|
| `experiment_admin` | ✅ 閲覧・編集・削除可 |
| `system_admin` | ✅ 閲覧・編集・削除可 |
| `experiment_worker` | ❌ アクセス不可 |

---

## 2. 画面構成

### 2.1. レイアウト構造

```
┌──────────────────────────────────────────────────────────┐
│ ツールバー                                                 │
│  指示一覧 ({N}件)                                          │
├──────────────────────────────────────────────────────────┤
│ 指示一覧テーブル（固定レイアウト）                          │
│ ┌────────┬────┬──────────┬──────────┬──────┬──────────┐ │
│ │ 対象   │No.│トランジション│ 指示種別 │ 内容 │ 操作     │ │
│ ├────────┼────┼──────────┼──────────┼──────┼──────────┤ │
│ │Method1 │  -│    -      │ 種別名   │テキスト│[編集][削除]│ │
│ │（全体）│  -│    -      │ 種別名   │テキスト│[詳細]    │ │
│ └────────┴────┴──────────┴──────────┴──────┴──────────┘ │
│                                                          │
│ （データなし）                                            │
│   📭 空のステート表示                                     │
└──────────────────────────────────────────────────────────┘
```

---

## 3. コンポーネント Props 定義

```typescript
interface InstructionRegistrationTabProps {
  projectId: string;
  projectName: string;
  isActive: boolean;
  isCheckoutLocked?: boolean;
  isEditable?: boolean;
  isProjectCompleted?: boolean;
}
```

| Prop名 | 型 | デフォルト | 説明 |
|--------|-----|----------|------|
| `projectId` | `string` | — | プロジェクトID（必須）|
| `projectName` | `string` | — | プロジェクト名（API呼び出し条件判定に使用、必須）|
| `isActive` | `boolean` | — | タブがアクティブかどうか（データ取得タイミング制御、必須）|
| `isCheckoutLocked` | `boolean?` | — | チェックアウト中は変更系ボタンを無効化 |
| `isEditable` | `boolean?` | `true` | 変更系ボタンの活性制御 |
| `isProjectCompleted` | `boolean?` | `false` | プロジェクト完了時は変更系ボタンを無効化 |

---

## 4. State 定義

| State名 | 型 | 初期値 | 説明 |
|---------|-----|--------|------|
| `instructions` | `InstructionData[]` | `[]` | 指示一覧データ |
| `registeredTasks` | `TaskDetail[]` | `[]` | タスク登録情報（InstructionEditDialog に渡す）|
| `editDialogOpen` | `boolean` | `false` | 指示編集ダイアログの表示状態 |
| `editMode` | `'create' \| 'edit'` | `'create'` | ダイアログのモード |
| `editingInstruction` | `InstructionData \| undefined` | `undefined` | 編集/詳細表示対象の指示データ |

---

## 5. データ取得フロー

### 5.1. タブアクティブ時

```
isActive が true かつ projectName が存在する時
  ↓
[1] getTaskRegistration(projectId)
    → タスク情報を TaskDetail[] に変換して registeredTasks にセット
    失敗時: message.error(instructionRegistration.messages.taskFetchFailed)
  ↓
[2] getInstructions(projectId)
    → 指示一覧を instructions にセット
    失敗時: message.error(instructionRegistration.messages.fetchFailed)
```

### 5.2. MAIML コンテキストからのデータ

`useProjectMaiml()` コンテキストから以下を取得（useMemo）:
- `availableMethods`: メソッド一覧（指示対象の表示名解決用）
- `availableTransitions`: トランジション一覧（表示名解決用）

---

## 6. テーブルカラム定義

| カラムキー | タイトル（i18n）| 幅 | 説明 |
|-----------|--------------|-----|------|
| 対象 | `instructionRegistration.columns.target` | 240px | メソッド名またはプロジェクト全体 |
| タスク番号 | `instructionRegistration.columns.taskNumber` | 90px | タスク番号（未設定の場合 `-`）|
| トランジション | `instructionRegistration.columns.transitionId` | 180px | トランジション表示名（未設定の場合 `-`）|
| 指示種別 | `instructionRegistration.columns.instructionKey` | 180px | `INSTRUCTION_KEY_LABELS` から表示名解決、Tooltip付き |
| 内容 | `instructionRegistration.columns.content` | 残り幅 | Tooltip付き省略表示 |
| 操作 | `instructionRegistration.columns.action` | 160px | ボタン群 |

### 6.1. 対象列の表示ロジック

```
instruction.transitionId あり:  "メソッド名 > トランジション名"
instruction.taskNumber あり:    "メソッド名 > タスク N"
instruction.methodId あり:      "メソッド名"
それ以外:                        "プロジェクト全体"（instructionRegistration.target.project）
```

---

## 7. ツールバー

### 7.1. 左側（件数表示）

```
指示一覧 ({N}件)
```
`data-testid`: `instruction-status-summary`

---

## 8. 操作列ボタン

### 8.1. 未送信（`isSent !== true`）

| ボタン | アイコン | ラベル | disabled 条件 |
|--------|---------|--------|--------------|
| 編集 | `EditOutlined` | `instructionRegistration.editButton` | `!isEditable \|\| isProjectCompleted \|\| isCheckoutLocked` |
| 削除 | `DeleteOutlined` | `instructionRegistration.deleteButton` | 同上 |

### 8.2. 送信済み（`isSent === true`）

| ボタン | アイコン | ラベル |
|--------|---------|--------|
| 詳細 | `EyeOutlined` | `instructionRegistration.detailButton` |

詳細ボタン押下: `InstructionEditDialog` を編集モードで開く（`instruction.isSent === true` のため詳細表示になる）

---

## 9. 各種操作フロー

### 9.1. 指示削除

```
「削除」ボタン押下
  ↓
deleteInstruction(projectId, String(id))
  ↓
成功(result.deleted === true):
  → instructions からフィルタで除去
  → message.success(deleted)
失敗:
  → message.error(deleteError)
```

### 9.2. 指示保存（新規作成・編集）

InstructionEditDialog の `onSave` コールバック:

```
新規作成:
  saveInstruction(projectId, { methodId, transitionId, taskNumber, priority, type, content })
  → 返却された instructionId で InstructionData を生成
  → instructions に追加
  → message.success(added)

編集:
  updateInstruction(projectId, String(id), { ... })
  → instructions 内の該当データを更新
  → message.success(updated)

連続追加（keepDialogOpen=true）:
  → ダイアログを閉じず、editMode を 'create' に切り替え
```

---

## 10. API連携

| API | メソッド | サービス関数 | 用途 |
|-----|---------|------------|------|
| タスク登録取得 | GET | `getTaskRegistration(projectId)` | タスク一覧取得 |
| 指示一覧取得 | GET | `getInstructions(projectId)` | 指示一覧取得 |
| 指示保存 | POST | `saveInstruction(projectId, data)` | 新規指示作成 |
| 指示更新 | PUT | `updateInstruction(projectId, id, data)` | 指示編集 |
| 指示削除 | DELETE | `deleteInstruction(projectId, id)` | 指示削除 |

---

## 11. エラーハンドリング

| エラー | i18n キー | 表示方法 |
|--------|----------|---------|
| タスク取得失敗 | `instructionRegistration.messages.taskFetchFailed` | `message.error` |
| 指示一覧取得失敗 | `instructionRegistration.messages.fetchFailed` | `message.error` |
| 指示保存失敗 | `instructionRegistration.messages.saveFailed` | `message.error` |
| 指示更新失敗 | `instructionRegistration.messages.saveFailed` | `message.error` |
| 指示削除失敗 | `instructionRegistration.messages.deleteError` | `message.error` |
| データなし | `instructionRegistration.emptyState` | `Empty` コンポーネント |

---

## 12. 使用コンポーネント

### Ant Design
- `Table` - 指示一覧テーブル（`tableLayout: 'fixed'`）
- `Button` - ツールバーボタン・操作ボタン
- `Tooltip` - 長テキストのホバー表示
- `Space` - ボタン間隔制御
- `Typography.Text` - 件数表示・テキスト
- `Empty` - データなし表示
- `message` - 成功/警告/エラートースト
- `theme.useToken()` - テーマトークン

### アイコン
- `EditOutlined` - 編集ボタン
- `DeleteOutlined` - 削除ボタン
- `EyeOutlined` - 詳細ボタン

### コンテキスト
- `useProjectMaiml()` - MAIMLデータ（メソッド・トランジション一覧）

---

## 13. 子コンポーネント

| コンポーネント | 用途 |
|------------|------|
| `InstructionEditDialog` | 指示の新規作成・編集・詳細表示ダイアログ |

---

## 14. 変更履歴

| 日付 | 変更内容 | 担当者 |
|------|----------|--------|
| 2026-06-22 | 初版作成 | Cline |
| 2026-08-20 | 実装に合わせて全面改訂（タブ名「プロジェクト指示」に変更・Props追加・テーブル列更新・送信済み詳細ボタン追加）| Cline |
| 2026-08-20 | ソース再確認により修正（指示送信ボタン削除・isSending/onInstructionsSubmit削除・テーブルカラム修正（優先度/種別削除→instructionKey追加）・sendInstructions API削除）| Cline |
