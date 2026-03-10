# InstructionDialog 呼び出し元調査レポート

## 調査日時
2026-03-09 19:48

## 調査対象
`docs/design/ui/experiment_admin/03_progress_monitoring/ui_instruction_dialog.md`

---

## 調査結果

### 設計書（ui_instruction_dialog.md）の想定

**1.2 使用場面（設計書より）:**
> - ProjectManagement画面から作業指示を送信する場合
> - プロジェクトに作業者を割り当て、タスクを設定する場合
> - 複数の指示を一括で送信する場合

---

### 実際の実装構造

設計書で定義された `InstructionDialog`（`InstructionDialogProps` を持つコンポーネント）は、**現時点では実装されていません**。

代わりに以下の構造で実装されています：

```
ProjectManagement.tsx
  └── InstructionRegistrationTab.tsx（「指示送信」タブとしてレンダリング）
        └── InstructionEditDialog.tsx（単一指示の編集/追加ダイアログ）
```

---

### 各コンポーネントの役割

| コンポーネント | ファイルパス | 役割 |
|---|---|---|
| `ProjectManagement` | `frontend/src/components/project/ProjectManagement.tsx` | プロジェクト管理画面。「指示送信」タブとして `InstructionRegistrationTab` をレンダリング |
| `InstructionRegistrationTab` | `frontend/src/components/project/InstructionRegistrationTab.tsx` | 指示一覧テーブルを表示し、「指示を追加」「送信」ボタンを管理するタブコンポーネント |
| `InstructionEditDialog` | `frontend/src/components/project/InstructionEditDialog.tsx` | 単一指示を編集/追加するダイアログ（設計書の `InstructionDialog` に相当するが、機能が分割されている） |

---

### ProjectManagement.tsx における InstructionRegistrationTab の呼び出し箇所

```tsx
// ProjectManagement.tsx - Tabs の items 定義内
{
  key: 'instruction_registration',
  label: '指示送信',
  children: (
    <InstructionRegistrationTab
      projectId={selectedProject.id}
      projectName={selectedProject.name}
      isActive={currentTab === 'instruction_registration'}
      isCheckoutLocked={isProjectCheckedOut}
      onInstructionsSubmit={handleInstructionsSubmit}
    />
  ),
},
```

### InstructionRegistrationTab.tsx における InstructionEditDialog の呼び出し箇所

```tsx
// InstructionRegistrationTab.tsx - render 内
{/* 指示編集ダイアログ */}
<InstructionEditDialog
  open={editDialogOpen}
  mode={editMode}
  instruction={editingInstruction}
  tasks={registeredTasks}
  availableMethods={availableMethods}
  availableTransitions={availableTransitions}
  onClose={handleCloseDialog}
  onSave={handleSaveInstruction}
/>
```

ダイアログのオープンは以下のボタン操作で行われます：
- **「指示を追加」ボタン** → `handleOpenCreateDialog()` → `editMode: 'create'`
- **テーブル行の「編集」ボタン** → `handleOpenEditDialog(record)` → `editMode: 'edit'`

---

### 設計書との差異まとめ

設計書の `InstructionDialog` は「複数指示を一括設定して送信する」オールインワン型ダイアログとして設計されていますが、実際の実装では**役割が分離**されています。

| 機能 | 設計書（InstructionDialog） | 実際の実装 |
|---|---|---|
| 指示一覧の管理・送信 | ダイアログ内で完結 | `InstructionRegistrationTab`（タブとして常時表示） |
| 個別指示の編集 | ダイアログ内のカード | `InstructionEditDialog`（タブ内からポップアップ） |
| ドラッグ&ドロップ（タスク順序変更） | 実装予定 | 未実装 |
| 連続指示モード | 実装予定 | 未実装 |
| 作業者割り当て（availableWorkers） | Props で受け取る | 未実装 |
| MAIMLからのメソッド/トランジション取得 | モックデータ | MAIMLContextから取得（実装済み） |
| 作業指示送信API | POST `/api/v1/instructions`（未実装） | `sendInstructions()` API経由（実装済み） |

---

### まとめ

**設計書が想定している呼び出し元：**
→ `ProjectManagement` 画面（プロジェクト管理画面）の **「指示送信」タブ**

**呼び出し階層：**
```
ProjectManagement（プロジェクト管理画面）
  ↓ 「指示送信」タブ
InstructionRegistrationTab（指示一覧タブ）
  ↓ 「指示を追加」または「編集」ボタン
InstructionEditDialog（単一指示編集ダイアログ）
```

**注意事項：**
設計書で定義された `InstructionDialog` コンポーネントそのもの（`InstructionDialogProps` の型定義を持つもの）は未実装であり、設計書はフューチャー仕様として参照する位置づけです。現行の実装は `InstructionRegistrationTab` + `InstructionEditDialog` という分離された構造になっています。
