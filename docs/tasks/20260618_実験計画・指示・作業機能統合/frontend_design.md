# フロントエンド設計

> 作成日: 2026-06-18

---

## コンポーネント全体構成

```
ProjectManagementPage
└── Tab3「指示管理」
    ├── SubTab「実験計画」
    │   └── ExperimentPlanDialog       ← Manager が実験計画を指示
    └── SubTab「実験指示」
        ├── ExperimentInstructionTab   ← Manager が実績レビュー
        └── ExperimentInstructionTable

ExperimentWorkerPage
├── Tab「作業記録」
│   └── WorkRecordPanel               ← Worker が実験実施・記録
└── Tab「全体進捗」
    └── ProgressOverviewTab           ← Worker が全体進捗を確認
```

---

## ExperimentPlanDialog

**ファイル**: `frontend/src/components/project/ExperimentPlanDialog.tsx`

### State 構成

```typescript
// タブ構成（全体タブ + タスクN タブ）
type TabKey = 'all' | `task-${number}`;

// 1タブ分のデータ
interface TabData {
  templateValues: Record<string, Record<string, string>>; // {templateId: {fieldKey: value}}
  notes: NoteItem[];
  assignee: string;
}

// 上書きフラグ（全体→タスクN継承管理）
interface OverrideFlags {
  [taskNumber: number]: {
    [fieldPath: string]: boolean; // true = 個別上書き中
  };
}
```

### 継承ロジック（全体タブ → タスクN）

```
全体タブ変更時:
  forEachTask(taskN):
    if !overrideFlags[taskN][fieldPath]:
      tabData[taskN][fieldPath] = tabData['all'][fieldPath]

タスクNタブで個別編集時:
  overrideFlags[taskN][fieldPath] = true

「全体に戻す」ボタン押下時:
  overrideFlags[taskN][fieldPath] = false
  tabData[taskN][fieldPath] = tabData['all'][fieldPath]
```

### API呼び出し

```
ダイアログオープン時:
  1. GET /plan-dialog-data → tasks, templates, existingPlans を取得
  2. existingPlans を各タブの state に復元

保存ボタン押下時:
  1. 全タブをループ
  2. PUT /experiment-plans/:methodId/:taskNumber を全タブ分実行
  3. 全成功後にダイアログを閉じる
```

---

## ExperimentInstructionTab / ExperimentInstructionTable

**ファイル**:
- `frontend/src/components/project/ExperimentInstructionTab.tsx`
- `frontend/src/components/project/ExperimentInstructionTable.tsx`

### 表示仕様

| 列 | 内容 |
|----|------|
| タスク番号 | taskNumber |
| タスク名 | taskName |
| 担当者 | assignee |
| ステータス | taskStatus（バッジ表示） |
| 想定値 | expectedValues（テンプレートフィールド） |
| 実績値 | actualValues（テンプレートフィールド） |
| 差異 | 想定値との差（計算値・色分け表示） |
| 操作 | 承認ボタン / NGボタン |

### 承認・NG処理

```
承認ボタン押下:
  1. 確認ダイアログ表示
  2. POST /experiment-instructions/:methodId/:taskNumber/approve
  3. 成功後にデータ再取得

NGボタン押下:
  1. NGモーダル表示（NG理由入力フォーム）
  2. POST /experiment-instructions/:methodId/:taskNumber/ng
  3. 成功後にデータ再取得
```

---

## WorkRecordPanel

**ファイル**: `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx`

### DataRecordDialog 統合方針

`DataRecordDialog.tsx`（約2810行）のロジックを `WorkRecordPanel` に統合する。

```
統合対象:
  - フォーム state 管理（useFormState）
  - 保存処理（saveTransitionData）
  - バリデーション

統合方法:
  - JSXのみ移植（内部ロジックは変更しない）
  - DataRecordDialog はコメントアウト（削除はしない）
```

### 想定値表示

```typescript
// transition.templates[n].properties[m].expectedValue から取得
// mgr-instruction: プレフィックス付きの property から抽出

const getExpectedValue = (propertyKey: string, transition: TransitionData) => {
  const expectedProp = transition.properties?.find(
    p => p.key === `mgr-instruction:${propertyKey}`
  );
  return expectedProp?.value ?? null;
};
```

### 表示レイアウト

```
WorkRecordPanel
├── トランジション情報ヘッダー
├── ステータス更新セクション（← 元は別コンポーネント）
├── テンプレートフォームセクション
│   └── 各フィールド:
│       ├── ラベル（フィールド名）
│       ├── 想定値（mgr-instruction:xxx から表示）
│       └── 実績値入力（Input/Select等）
└── 保存ボタン
```

---

## ProgressOverviewTab

**ファイル**: `frontend/src/components/ExperimentWorker/ProgressOverviewTab.tsx`

### 表示仕様

```
ProgressOverviewTab
├── メソッド選択ドロップダウン
└── タスク一覧テーブル
    ├── タスク名
    ├── ステータス（バッジ）
    ├── 前提タスク（prerequisite_transition_ids）
    ├── 担当者
    └── 「作業へ」ボタン
```

### 依存関係チェック（スキップ機能）

```typescript
// 前提タスクが未完了の場合、スキップボタンを表示
const canSkip = (transition: TransitionData): boolean => {
  if (!transition.prerequisiteTransitionIds?.length) return false;
  return transition.prerequisiteTransitionIds.some(
    prereqId => getTransitionStatus(prereqId) !== 'completed'
  );
};
```

### 「作業へ」ボタン押下時

```
1. 作業記録タブへ切り替え
2. 該当トランジションを自動選択
3. WorkRecordPanel にフォーカス
```

---

## 既存コンポーネントの変更点

| コンポーネント | 変更内容 |
|------------|---------|
| `ProjectManagementPage` | Tab3を「指示管理」に変更、サブタブ追加 |
| `ProgressCheckTab` | `ProgressOverviewTab` に置き換え |
| `ProgressCheckTable` | 使用停止（削除せずコメントアウト） |
| `DataRecordDialog` | `WorkRecordPanel` に統合後、使用停止 |
| `TaskRegistrationTab` | 実験条件列削除済み（変更なし） |
