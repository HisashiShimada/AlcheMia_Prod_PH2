# 実験指示タブ UI設計書

## メタデータ
- **画面名**: 実験指示タブ
- **物理名**: ExperimentInstructionTab.tsx
- **ファイルパス**: `frontend/src/components/project/ExperimentInstructionTab.tsx`
- **利用権限**: 実験管理者（experiment_admin）
- **作成日**: 2026-06-22
- **最終更新日**: 2026-08-20
- **担当者**: Development Team
- **バージョン**: 2.0.0

---

## 1. 画面概要

### 1.1. 目的

実験管理者が、実験作業者による実験実施後の**想定値 vs 実績値**を確認し、**タスクの承認またはNG記録**を行うためのタブコンポーネントです。
プロジェクト管理画面（ProjectManagement）の「**実験指示確認**」タブ（`task_results`）として表示されます。

> ⚠️ **設計変更**: 旧バージョンでは `ExperimentInstructionTable` という独立コンポーネントが存在しましたが、現在はテーブルを含む全機能が `ExperimentInstructionTab.tsx` に統合されています。

### 1.2. アクセス権限

| ロール | アクセス |
|--------|---------|
| `experiment_admin` | ✅ 閲覧・承認/NG操作可 |
| `system_admin` | ✅ 閲覧・承認/NG操作可 |
| `experiment_worker` | ❌ アクセス不可 |

### 1.3. 主要機能

1. **フラットテーブル表示**: `FlatRow[]` 形式でフィールド単位にフラット化して表示
2. **フィルターバー**: タスク番号・メソッドID・トランジション・テンプレート・Key でフィルタリング
3. **列カスタマイズ**: 表示/非表示を切替可能な列構成（Dropdown）
4. **承認処理ダイアログ（一括処理）**: レビュー待ちタスクを選択して承認またはNG記録
5. **単体承認モーダル**: テーブル行の操作列から承認確認
6. **単体NGモーダル**: テーブル行の操作列からNG理由入力・記録
7. **実験指示編集**: `ExperimentPlanDialog` を開く（「実験指示を編集」ボタン）
8. **ペトリネットビューア**: `ViewRendererDialog` で MAiML ファイルを表示（フローティング）

---

## 2. 画面レイアウト

### 2.1. 全体構成

```
┌──────────────────────────────────────────────────────────────────────────┐
│ 実験指示タブ                                                               │
├──────────────────────────────────────────────────────────────────────────┤
│ ツールバー                                                                  │
│  [実験指示を編集] [ペトリネット表示] [列選択 ▼] [承認処理 ●]              │
├──────────────────────────────────────────────────────────────────────────┤
│ フィルターバー                                                              │
│  🔍 [タスクNo ▼] [メソッドID ▼] [トランジション ▼] [テンプレ ▼] [Key ▼] N/M行│
├──────────────────────────────────────────────────────────────────────────┤
│ フラットテーブル（横スクロール対応）                                          │
│  #No │ タスクステータス │ メソッド名 │ トランジション │ テンプレ │ Key │ ...│
│ ─────┼──────────────────┼───────────┼───────────────┼─────────┼─────┼───│
│  #1  │ ◆ レビュー待ち   │ method-A  │ trans-001     │ 反応条件 │ temp│ ...│
│  #1  │ ◆ レビュー待ち   │ method-A  │ trans-001     │ 反応条件 │ pres│ ...│
└──────────────────────────────────────────────────────────────────────────┘
```

### 2.2. ツールバー構成

| ボタン | アイコン | type | disabled 条件 | 説明 |
|--------|---------|------|--------------|------|
| 実験指示を編集 | `EditOutlined` | default | `!isEditable \|\| isProjectCompleted \|\| isCheckoutLocked` | `ExperimentPlanDialog` を開く |
| ペトリネット表示 | `FileSearchOutlined` | default | `!projectName` | `ViewRendererDialog` を開く（フローティング）|
| 列選択 | `SettingOutlined` | default | — | 列カスタマイズ Dropdown を開く |
| 承認処理 | `CheckCircleOutlined` | primary | `reviewWaitingTasks.length === 0 \|\| !isEditable \|\| isProjectCompleted \|\| isCheckoutLocked` | 一括承認ダイアログを開く |

### 2.3. フィルターバー構成

| フィルター | 幅 | i18n キー | 対応フィールド |
|----------|-----|----------|--------------|
| タスクNo | 70px | `experimentInstructionTab.filter.taskNumber` | `taskNumber` |
| メソッドID | 200px | `experimentInstructionTab.filter.methodId` | `methodId` |
| トランジション | 160px | `experimentInstructionTab.filter.transitionId` | `transitionId` |
| テンプレート | 190px | `experimentInstructionTab.filter.templateName` | `templateName` |
| Key | 160px | `Key`（固定）| `propKey` |

フィルターバー右側に `{filtered}/{total}行` を表示。

---

## 3. コンポーネント Props 定義

```typescript
export interface ExperimentInstructionTabProps {
  /** 対象プロジェクトID */
  projectId: string;
  /** 対象プロジェクト名（ペトリネットビューア用） */
  projectName?: string;
  /** 編集権限フラグ。false の場合は変更系ボタンを非活性にする */
  isEditable?: boolean;
  /** プロジェクト完了フラグ。true の場合は変更系ボタンを非活性にする */
  isProjectCompleted?: boolean;
  /** チェックアウト中フラグ。true の場合は変更系ボタンを非活性にする */
  isCheckoutLocked?: boolean;
}
```

| Prop名 | 型 | デフォルト | 説明 |
|--------|-----|-----------|------|
| `projectId` | `string` | — | プロジェクトID（必須）|
| `projectName` | `string?` | — | プロジェクト名（ペトリネット表示ボタンの活性判定に使用）|
| `isEditable` | `boolean?` | `true` | 変更系ボタン（編集・承認処理）の活性制御 |
| `isProjectCompleted` | `boolean?` | `false` | プロジェクト完了時は変更系ボタンを無効化 |
| `isCheckoutLocked` | `boolean?` | `false` | チェックアウト中は変更系ボタンを無効化 |

---

## 4. State 定義

| State名 | 型 | 初期値 | 説明 |
|---------|-----|--------|------|
| `instructions` | `InstructionMethodResponse[]` | `[]` | API から取得したメソッド別実験指示データ |
| `methods` | `ProjectMethod[]` | `[]` | API から取得したプロジェクトのメソッド一覧 |
| `loading` | `boolean` | `false` | データ取得中フラグ |
| `filters` | `FilterState` | `INITIAL_FILTER` | フィルターバーの選択値 |
| `approveTarget` | `FlatRow \| null` | `null` | 単体承認モーダルの対象行 |
| `ngTarget` | `FlatRow \| null` | `null` | NGモーダルの対象行 |
| `ngForm` | `FormInstance` | — | NG理由フォーム |
| `actionLoading` | `boolean` | `false` | 承認/NG API 呼び出し中フラグ |
| `bulkApproveOpen` | `boolean` | `false` | 一括承認ダイアログ表示状態 |
| `bulkSelectedMethodId` | `string \| null` | `null` | 一括ダイアログ選択中メソッドID |
| `bulkSelectedTaskKey` | `string \| null` | `null` | 一括ダイアログ選択中タスクキー（`methodId__taskNumber`）|
| `bulkSelectedAction` | `'approve' \| 'ng'` | `'approve'` | 一括ダイアログの操作選択 |
| `bulkSelectedNgReason` | `string` | `''` | 一括ダイアログのNG理由 |
| `planDialogOpen` | `boolean` | `false` | ExperimentPlanDialog 表示状態 |
| `planDialogMethodId` | `string` | `''` | ExperimentPlanDialog に渡すメソッドID |
| `visibleColumnKeys` | `string[]` | `ALL_COLUMN_KEYS` | 表示中の列キー一覧 |
| `columnDropdownOpen` | `boolean` | `false` | 列選択ドロップダウンの開閉状態 |
| `viewerDialogs` | `{ id, file, zIndex }[]` | `[]` | フローティングビューア一覧 |

---

## 5. データ型定義

### 5.1. FlatRow（テーブル行）

APIレスポンスをフィールド単位にフラット化した行型。

```typescript
interface FlatRow {
  rowKey: string;            // テーブルの rowKey（一意キー）
  methodId: string;
  methodName: string;
  taskNumber: number;
  taskStatus: string;        // 2桁ゼロ埋め文字列 ('01'〜'06')
  transitionId: string;
  transitionName: string;
  templateName: string;
  propKey: string;
  propLabel: string;
  xsiType: string;           // FloatValue / IntegerValue / StringValue
  expected: number | string | null;         // 想定値（個別）
  expectedAverage: number | null;           // 想定値平均（同一グループ）
  actual: number | string | null;           // 実績値（個別）
  actualAverage: number | null;             // 実績値平均（同一グループ）
  unit: string;
  uncertaintyCriteriaName: string | null;
  uncertaintyCriteriaType: 'qualitative' | 'quantitative' | null;
  uncertaintyAssignedValue: string | null;
  uncertaintyAssignedBy: string | null;
  uncertaintyAssignedAt: string | null;
  uncertaintyComment: string | null;
}
```

### 5.2. FilterState

```typescript
interface FilterState {
  taskNumber: number | null;
  methodId:   string | null;
  transitionId: string | null;
  templateName: string | null;
  propKey: string | null;
}
```

---

## 6. テーブルカラム定義

### 6.1. 固定列（非表示不可）

| カラムキー | タイトル | 幅 | 説明 |
|-----------|---------|-----|------|
| `taskNumber` | `experimentInstructionTab.col.taskNo` | 80px | `#N` 形式。ソート対応 |
| `propKey` | `Key` | 160px | プロパティキー（コード表示）|

### 6.2. 切替可能列（デフォルト全表示）

| カラムキー | i18n キー | 幅 | 説明 |
|-----------|----------|-----|------|
| `taskStatus` | `experimentInstructionTab.col.taskStatus*` | 110px | Tag（色付き）|
| `methodName` | `experimentInstructionTab.col.methodName` | 190px | Tooltip付き |
| `transitionName` | `experimentInstructionTab.col.transitionName` | 180px | Tooltip付き |
| `templateName` | `experimentInstructionTab.col.templateName` | 180px | Tooltip付き |
| `xsiType` | `xsi:type`（固定）| 75px | Tag（色付き）|
| `expected` | `experimentInstructionTab.col.expected` | 100px | 右寄せ。単位付き |
| `expectedAverage` | `experimentInstructionTab.col.expectedAverage` | 120px | 右寄せ。同一グループ平均 |
| `actual` | `experimentInstructionTab.col.actual` | 100px | 右寄せ。未入力時「記録なし」|
| `actualAverage` | `experimentInstructionTab.col.actualAverage` | 120px | 右寄せ。同一グループ平均 |
| `diff` | `experimentInstructionTab.col.diff` | 85px | 実績-想定の差分（赤/青色分け）|
| `uncertaintyCriteriaName` | `experimentInstructionTab.col.uncertaintyCriteriaName` | 200px | 定性/定量 Tag付き |
| `uncertaintyAssignedValue` | `experimentInstructionTab.col.uncertaintyAssignedValue` | 140px | 不確かさ付与値 |
| `uncertaintyAssignedBy` | `experimentInstructionTab.col.uncertaintyAssignedBy` | 140px | 付与者名 |
| `uncertaintyAssignedAt` | `experimentInstructionTab.col.uncertaintyAssignedAt` | 160px | 付与日時 |
| `uncertaintyComment` | `experimentInstructionTab.col.uncertaintyComment` | 220px | Tooltip付き |

### 6.3. タスクステータス設定

| コード | i18n キー | Tag色 |
|--------|----------|-------|
| `'01'` | `experimentInstruction.status.waiting` | `default` |
| `'02'` | `experimentInstruction.status.inProgress` | `processing` |
| `'03'` | `experimentInstruction.status.running` | `processing` |
| `'04'` | `experimentInstruction.status.reviewWaiting` | `warning` |
| `'05'` | `experimentInstruction.status.completed` | `success` |
| `'06'` | `experimentInstruction.status.ng` | `error` |

> **注意**: ステータス `'04'`（reviewWaiting）の行が承認/NG操作の対象となる。

### 6.4. xsi:type 表示設定

| 値 | 短縮表示 | Tag色 |
|----|---------|-------|
| `FloatValue` | `Float` | `geekblue` |
| `IntegerValue` | `Int` | `purple` |
| `StringValue` | `Str` | `cyan` |

### 6.5. 差分セル（DiffCell）

| 条件 | 表示 |
|------|------|
| どちらかが非数値 | `—`（グレー）|
| diff === 0 | `±0`（グレー）|
| diff > 0 | `+{値}`（赤 `#cf1322`）|
| diff < 0 | `{値}`（青 `#096dd9`）|

---

## 7. 操作仕様

### 7.1. 承認処理ダイアログ（一括）

「承認処理」ボタン押下でダイアログが開く。

**ダイアログ構成:**

```
┌─────────────────────────────────────────────────┐
│ 承認処理ダイアログ（width: 480px）               │
│                                                  │
│ メソッド: [Select▼] タスク番号: [Select▼]        │
│                                                  │
│ 操作: ○ 承認  ○ NG                              │
│                                                  │
│ （NG選択時のみ）                                  │
│ NG理由:                                          │
│ ┌────────────────────────────────────────────┐ │
│ │ TextArea (rows:3, maxLength:500)           │ │
│ └────────────────────────────────────────────┘ │
│                                                  │
│ [キャンセル]                           [実行]   │
└─────────────────────────────────────────────────┘
```

**操作フロー:**
1. 「承認処理」ボタン押下（`reviewWaitingTasks.length > 0` のとき活性）
2. ダイアログが開く（選択状態リセット）
3. メソッドIDを選択 → タスク番号の選択肢が絞り込まれる
4. タスク番号を選択
5. 操作（承認 or NG）を選択。NG選択時はNG理由入力欄が表示
6. 「実行」ボタン押下 → API呼び出し → テーブル更新

**入力必須条件:**
- タスク未選択時: `message.warning` で警告（`experimentInstruction.warningSelectTask`）
- NG選択かつ理由が空: `message.warning` で警告（`experimentInstruction.ngReasonRequired`）

### 7.2. 単体承認モーダル

テーブル行の操作列「承認」ボタン押下でモーダル表示。

| 項目 | 値 |
|------|-----|
| タイトル | `experimentInstructionTab.approveModal.title` |
| 内容 | タスク番号・メソッド名 |
| OKボタン | `experimentInstructionTab.approveModal.ok` |
| キャンセル | `experimentInstructionTab.approveModal.cancel` |

### 7.3. NGモーダル

テーブル行の操作列「NG」ボタン押下でモーダル表示。

| 項目 | 値 |
|------|-----|
| タイトル | `experimentInstructionTab.ngModal.title` |
| NG理由 | `Input.TextArea`（rows:3, maxLength:500, showCount）必須 |
| OKボタン | `experimentInstructionTab.ngModal.ok`（danger）|
| キャンセル | `experimentInstructionTab.ngModal.cancel` |

---

## 8. API連携

### 8.1. 使用APIエンドポイント（`experimentInstructionApiService`）

| API | メソッド | パス | 用途 |
|-----|---------|------|------|
| 実験指示取得 | GET | `/api/v1/projects/:projectId/experiment-instructions` | フラットテーブルデータ取得 |
| メソッド一覧取得 | GET | `/api/v1/projects/:projectId/methods` | ExperimentPlanDialog のメソッド選択用 |
| タスク承認 | POST | `/api/v1/projects/:projectId/experiment-instructions/:methodId/:taskNo/approve` | 承認処理 |
| NG記録 | POST | `/api/v1/projects/:projectId/experiment-instructions/:methodId/:taskNo/ng` | NG記録処理 |

### 8.2. データ取得フロー

```
コンポーネントマウント時（useEffect [fetchData]）
  ↓
Promise.all([
  getExperimentInstructions(projectId),
  getProjectMethods(projectId),
])
  ↓
instructions / methods ステートに保存
  ↓
flattenInstructions(instructions) でフラット化 → allRows（useMemo）
  ↓
フィルター適用 → filteredRows（useMemo）
```

### 8.3. 承認フロー

```
「実行」押下 または 単体「承認」ボタン押下
  ↓
setActionLoading(true)
  ↓
approveTask(projectId, methodId, taskNumber)
  ↓
成功: message.success / ダイアログ閉 / fetchData()
失敗: message.error('experimentInstruction.approveError')
  ↓
setActionLoading(false)
```

### 8.4. NG記録フロー

```
「実行」押下 または 単体「NG登録」ボタン押下
  ↓
（単体の場合: ngForm.validateFields()）
  ↓
setActionLoading(true)
  ↓
recordNg(projectId, methodId, taskNumber, { ngReason })
  ↓
成功: message.warning('experimentInstruction.ngRecorded') / ダイアログ閉 / fetchData()
失敗: message.error('experimentInstruction.ngError')
  ↓
setActionLoading(false)
```

---

## 9. 子コンポーネント連携

| コンポーネント | Props | 説明 |
|------------|-------|------|
| `ExperimentPlanDialog` | `open`, `projectId`, `methodId`, `taskNumbers`, `allowMethodSelection`, `methodOptions`, `onMethodChange`, `onClose`, `onSave` | 実験計画指示編集ダイアログ |
| `ViewRendererDialog` | `id`, `contentType`, `file`, `zIndex`, `onClose`, `onFocus` | ペトリネットビューア（フローティング、複数起動可）|

---

## 10. エラーハンドリング

| エラー | 表示方法 | i18n キー |
|--------|---------|----------|
| データ取得失敗 | `message.error` | `experimentInstruction.fetchError` |
| 承認処理失敗 | `message.error` | `experimentInstruction.approveError` |
| NG記録失敗 | `message.error` | `experimentInstruction.ngError` |
| タスク未選択（一括ダイアログ）| `message.warning` | `experimentInstruction.warningSelectTask` |
| NG理由が空（一括ダイアログ）| `message.warning` | `experimentInstruction.ngReasonRequired` |
| データなし | `Empty` コンポーネント | `experimentInstructionTab.empty` |

---

## 11. 使用コンポーネント

### Ant Design コンポーネント
- `Table` - メインテーブル（フラット行、横スクロール対応）
- `Modal` - 承認確認・NG記録・一括承認ダイアログ
- `Form` / `Input.TextArea` - NG理由入力
- `Select` - フィルターバー・一括ダイアログのセレクト
- `Radio.Group` - 一括ダイアログの操作選択
- `Dropdown` - 列カスタマイズ
- `Button` - ツールバーボタン群
- `Tag` - ステータス・xsi:type 表示
- `Tooltip` - 長テキストのホバー表示
- `Spin` / `Empty` - ローディング・データなし
- `Typography.Text` - セル内テキスト
- `Flex` / `Space` - レイアウト
- `App.useApp()` - `message` / `modal` の取得
- `message` - 成功/警告/エラートースト

### アイコン
- `EditOutlined` - 実験指示を編集ボタン
- `FileSearchOutlined` - ペトリネット表示ボタン
- `SettingOutlined` - 列選択ボタン
- `CheckCircleOutlined` - 承認処理ボタン
- `FilterOutlined` - フィルターバーアイコン

---

## 12. 変更履歴

| 日付 | 変更内容 | 担当者 |
|------|----------|--------|
| 2026-06-22 | 初版作成 | Cline |
| 2026-08-20 | アーキテクチャ変更に合わせて全面改訂（フラットテーブル化・不確かさ列・フィルターバー・一括承認ダイアログ・ペトリネットビューア追加） | Cline |
