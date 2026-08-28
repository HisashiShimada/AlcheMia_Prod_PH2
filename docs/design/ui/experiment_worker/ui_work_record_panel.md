# 作業記録パネル UI設計書

## メタデータ
- **画面ID**: WorkRecordPanel
- **画面名**: 作業記録パネル（実験作業記録タブ）
- **ファイルパス**: `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx`
- **利用権限**: 実験作業者（experiment_worker）
- **作成日**: 2026-06-22
- **最終更新日**: 2026-08-27

---

## 1. 概要

### 1.1 画面の目的
実験作業者が実験データをトランジション単位で記録するためのメインパネルです。  
`ExperimentWorkerMenu` の「作業記録」タブ（key='3'）にレンダリングされます。

> **フェーズ注記**: 現時点（フェーズA）はモックデータで動作します。フェーズBでは Props 経由で実 API データに差し替える予定です。

### 1.2 主要機能
- プロジェクト指示の確認（折りたたみ表示）
- 現在作業中のトランジション情報の表示（ステータス/タスク#/メソッドID/トランジションID）
- テンプレート一覧から **カテゴリ別グループ表示** でテンプレートを選択して実績値を入力
- プロパティカードごとの実績値入力・確信度（定性評価 ← DB登録選択肢使用）・定量評価追加
- 保存時に `is_recorded = TRUE` を更新（トランジションの記録済みフラグ管理）
- 保存 / スキップ / 保存して次へ（トランジション完了）
- コメント記録（ExperimentCommentDialog）
- カスタム Insertion（ファイル添付）追加・削除
- カスタム Content（DataGrid）追加・削除

### 1.3 アクセス権限
- **対象ロール**: 実験作業者（experiment_worker）
- **必要条件**: ログイン済み、有効なセッション

---

## 2. 画面構成

### 2.1 画面イメージ
（スクリーンショット未作成）

### 2.2 レイアウト構造

```
┌──────────────────────────────────────────────────────────┐
│ ▶ プロジェクト指示 [n件]（InstructionCollapse）          │
│   ※ 折りたたみ表示、黄色背景 #fffbe6                     │
├──────────────────────────────────────────────────────────┤
│ WorkHeader                                               │
│ [ステータスTag] ─ タスク# ─ メソッドID ─ トランジションID│
│ ※ 完了済み閲覧時は「完了済み（参照のみ）」Alert + 戻るBtn │
├──────────────────────────────────────────────────────────┤
│ Layout（2カラム, height: 100%）                          │
│ ┌──────────────────┬───────────────────────────────────┐ │
│ │ Sider (280px)    │ Content（残り幅）                 │ │
│ ├──────────────────┼───────────────────────────────────┤ │
│ │ テンプレート数   │ [Category Tag] テンプレート名      │ │
│ │ [検索Input]      │                                   │ │
│ │ [種別Select]     │ Row gutter={[8,8]} （3列グリッド） │ │
│ │                  │ ┌─────────┐ ┌─────────┐ ┌───────┐ │ │
│ │ Table            │ │Property │ │Property │ │  ...  │ │ │
│ │ - テンプレート名 │ │Card     │ │Card     │ │       │ │ │
│ │ - プロパティ数   │ └─────────┘ └─────────┘ └───────┘ │ │
│ │ - Category Tag   │                                   │ │
│ │ - I/O Tag        │ ＋property追加 ＋content追加       │ │
│ │                  │ ＋Insertion追加                   │ │
│ │                  │                                   │ │
│ │                  │ [固定Insertionスロット]            │ │
│ │                  │ [カスタムInsertionスロット]        │ │
│ │                  │ [カスタムContentスロット]          │ │
│ │                  │                                   │ │
│ │                  │ ┌────────────────────────────────┐ │ │
│ │                  │ │ [コメント] [保存] [スキップ]    │ │ │
│ │                  │ │ [保存して次へ / トランジション完了] │ │
│ │                  │ └────────────────────────────────┘ │ │
│ └──────────────────┴───────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘

PropertyCard（Col span={8}）:
┌───────────────────────────────┐
│ [ラベル] [型Tag] (key)         │
│ ─────────────────────────────  │
│ 想定値      │ 不確かさ値       │
│ ─────────────────────────────  │
│ 不確かさ説明（全幅）           │
│ ─────────────────────────────  │
│ 実績値（入力 or 参照表示）     │
│ ─────────────────────────────  │
│ 確信度ボタン [確か][曖昧][不確か] │
│ ─────────────────────────────  │
│ 定量評価 [不確かさ基準Select][値Input][✕]  │
│ [＋値の追加]                   │
└───────────────────────────────┘

モーダル:
- ExperimentCommentDialog（コメント記録）
```

### 2.3 使用コンポーネント

#### Ant Design コンポーネント
- `Layout` / `Sider` / `Content` - 2カラムレイアウト（Sider 280px固定）
- `Flex` - 縦/横並び制御
- `Collapse` - プロジェクト指示折りたたみ
- `Card` - WorkHeader、PropertyCard コンテナ
- `Table` - テンプレート一覧（左Sider内、ヘッダー非表示、ページネーションなし）
- `Input` - テンプレート検索、実績値（StringValue）、定量評価値
- `InputNumber` - 実績値（FloatValue/IntegerValue）
- `Select` - テンプレート種別フィルタ、定量評価不確かさ基準選択
- `Button` - テンプレート選択（PlanA）、確信度、追加、保存、スキップ、保存して次へ、コメント、戻る
- `Tag` - ステータス、カテゴリ（Materials/Conditions/Results）、I/O（IN/OUT）、型（Float/Int/Str）
- `Badge` - プロジェクト指示件数
- `Alert` - 全完了メッセージ、完了済み参照時の注意
- `Divider` - WorkHeader 項目区切り
- `Row` / `Col` - PropertyCard グリッド（3列）
- `Modal` - 保存成功・完了通知（静的モーダル）
- `Spin` - テンプレート一覧ローディング（現在は常に false）
- `Space` - テンプレート一覧タイトル
- `Tooltip` - メソッドID/トランジションID 長文省略ヒント
- `Typography.Text` - 各ラベル・テキスト表示
- `theme` - デザイントークン取得

#### カスタムコンポーネント
- `ExperimentCommentDialog` - コメント記録モーダル
- `InsertionEditorCompact` - Insertion（ファイル添付）入力
- `ContentGridEditor` - カスタムContent（DataGrid）入力

#### アイコン
- `WarningOutlined` - プロジェクト指示（黄色）
- `SearchOutlined` - テンプレート検索
- `PlusOutlined` - property/content/Insertion追加
- `DeleteOutlined` - カスタムInsertion/Content削除、定量評価行削除
- `CommentOutlined` - コメントボタン
- `FastForwardOutlined` - スキップボタン
- `RightOutlined` - 保存して次へボタン

---

## 3. コントロール一覧

### 3.1 InstructionCollapse（プロジェクト指示）

| 項目 | 説明 |
|------|------|
| 折りたたみパネル | 背景色 `#fffbe6`、ボーダー `#ffe58f`（黄色系） |
| ラベル | `WarningOutlined`（黄色）+ 「プロジェクト指示」+ 件数バッジ |
| 内容 | 指示事項を `<ul><li>` で箇条書き |
| 表示条件 | `instructions.length > 0` の場合のみ表示 |

> **現状**: モックデータ `MOCK_PROJECT_INSTRUCTIONS`（4件固定）を表示。フェーズBで API から取得予定。

### 3.2 WorkHeader（作業情報ヘッダー）

| 項目 | 型 | 内容 |
|------|-----|------|
| ステータス | Tag（color） | not_started=default / in_progress=processing / completed=success / error=error |
| タスク# | Text strong | `#{displayKey.taskNo}` |
| メソッドID | Text code（Tooltip付き、最大幅200px省略） | `method?.id` |
| トランジションID | Text code（Tooltip付き、最大幅200px省略） | `transition.id` |

**表示条件:**
- `displayKey` / `taskTransition` / `transition` が null → 全完了 Alert または何も表示しない
- `isReadOnly === true`（完了済み閲覧時）→ 情報アイコン付き Alert「完了済み（参照のみ）」+ 「作業に戻る」ボタン

### 3.3 左Sider: テンプレート一覧

| 項目 | タイプ | 初期値 | 説明 |
|------|--------|--------|------|
| templateSearchText | Input | '' | テンプレート名のあいまい検索（大文字小文字無視） |
| selectedTemplateCategory | Select | undefined | 種別フィルタ（Materials/Conditions/Results） |

**テンプレートテーブル（Table）カラム:**

| 表示内容 | 説明 |
|---------|------|
| テンプレート名（Text strong） | テンプレートの名前 |
| プロパティ数（Text secondary） | `(N項目)` |
| カテゴリ Tag | Materials（緑）/ Conditions（青）/ Results（紫） |
| I/O Tag | Results → OUT（緑）/ それ以外 → IN（青） |

選択状態: `rowClassName` で `ant-table-row-selected` を付与してハイライト

### 3.4 PropertyCard（プロパティカード）

各 Property ごとに `Card size="small"` で表示（`Col span={8}` = 3列グリッド）。

#### カード上部
| 項目 | 説明 |
|------|------|
| ラベル（Text strong） | `prop.label` |
| 型 Tag | FloatValue=geekblue / IntegerValue=purple / StringValue=cyan |
| key（Text secondary） | `prop.key` 小フォント |
| 選択中の確信度 Tag | 選択済みの場合のみ表示（色分け: 確か=緑/曖昧=橙/不確か=赤） |

#### 想定値 / 不確かさ値（Row 2分割）
| 項目 | 背景色 | 説明 |
|------|--------|------|
| 想定値 | `#e6f7ff`（青系） | `prop.expected` + 単位。未設定時は「未設定」italic |
| 不確かさ値 | `#fafafa` | `prop.uncertaintyValue` + 単位。未設定時は「—」italic。ラベルは `prop.uncertaintyName` または「不確かさ値」 |

#### 不確かさ説明（全幅）
- `prop.uncertaintyDescription` を表示。未設定時は「—」italic。

#### 実績値
- **参照時（readOnly）**: 値 + 単位 + 差分表示（`calcDiff`）。未入力時は「未記録」italic
- **入力時**: `StringValue` → `Input`、`FloatValue/IntegerValue` → `InputNumber`（単位ラベル付き）

差分表示ルール（`calcDiff`）:
- 差分 = 0 → `±0`（secondary）
- 差分 > 0 → `+値`（赤 #cf1322）
- 差分 < 0 → `値`（青 #096dd9）

#### 確信度ボタン（定性評価）- 入力時のみ
| 選択肢 | 背景色 | ボーダー色 | テキスト色 |
|--------|--------|-----------|-----------|
| 確か | #d9f7be | #b7eb8f | #389e0d |
| 曖昧 | #fff7e6 | #ffd591 | #d46b08 |
| 不確か | #fff1f0 | #ffa39e | #cf1322 |
| OK（カスタム） | #d9f7be | #b7eb8f | #389e0d |
| NG（カスタム） | #fff1f0 | #ffa39e | #cf1322 |

選択状態: `fontWeight: 'bold'` + `outline` で強調。再クリックで解除。

#### 定量評価（入力時のみ）
- **追加済み行**: `Select`（不確かさ基準）+ `Input`（値）+ `DeleteOutlined` ボタン
- **追加ボタン**: `PlusOutlined` + 「＋値の追加」（背景 `#1d4e63`）

> 不確かさ基準は `uncertainty.json` から `eval==='quantitative' && status==='active'` で絞り込み

### 3.5 追加ボタン群（右Content下部 / 入力時のみ）

| ボタン名 | アイコン | アクション |
|---------|---------|-----------|
| property 追加 | PlusOutlined | カスタムプロパティ行追加（現状はクリックのみ、TODO） |
| content 追加 | PlusOutlined | カスタム ContentGridEditor スロットを追加 |
| Insertion 追加 | PlusOutlined | カスタム InsertionEditorCompact スロットを追加 |

### 3.6 固定Insertionスロット（`template.insertions` 由来）

テンプレートに `insertions` 配列が定義されている場合、各スロットを表示。

| 項目 | 説明 |
|------|------|
| スロットラベル（Text strong） | `slot.label`（例: 試薬安全データシート） |
| InsertionEditorCompact | ファイル選択・アップロードUI |

### 3.7 カスタムInsertionスロット

ユーザーが「Insertion追加」で追加したスロット。青系点線ボーダー（`#91caff`）+ 背景 `#e6f4ff`。

| 項目 | 説明 |
|------|------|
| 「カスタム Insertion」ラベル | 青色テキスト |
| DeleteOutlined ボタン | 入力時のみ表示。クリックでスロット削除 |
| InsertionEditorCompact | ファイル選択・アップロードUI |

### 3.8 カスタムContentスロット

ユーザーが「content追加」で追加したスロット。紫系点線ボーダー（`#b37feb`）+ 背景 `#f9f0ff`。

| 項目 | 説明 |
|------|------|
| 「カスタム Content」ラベル | 紫色テキスト |
| DeleteOutlined ボタン | 入力時のみ表示。クリックでスロット削除 |
| ContentGridEditor | 行/列の数値グリッド入力UI |

### 3.9 保存ボタン群（右Content右下 / 入力時のみ）

| ボタン名 | タイプ | アイコン | 表示条件 | アクション |
|---------|--------|---------|---------|-----------|
| コメント | default | CommentOutlined | 常時（入力時） | ExperimentCommentDialogを開く |
| 保存 | default | - | 常時（入力時） | `handleSave`（Modal.success でモック保存通知） |
| スキップ | default | FastForwardOutlined | 入力時 | 現トランジションをスキップリストに追加し次へ。他に実行可能なトランジションがない場合は disabled（Tooltip表示） |
| 保存して次へ | primary | RightOutlined | 常時（入力時） | テンプレートが複数ある場合: 次テンプレートへ遷移。最後のテンプレートの場合: トランジションを completed に更新してタスク完了/次トランジションへ |

**「保存して次へ」ラベル:**
- 最後のテンプレートでない場合: 「テンプレート {current+1}/{total} へ」
- 最後のテンプレートの場合: 「トランジション完了・次へ」

---

## 4. イベント

### 4.1 テンプレート選択イベント

| イベント名 | トリガー | 処理内容 |
|-----------|---------|---------|
| テンプレート行クリック | Table `onRow.onClick` | `selectedTemplateId` を更新、右Contentのプロパティカードを切り替え |
| templateSearchText変更 | 検索Input入力 | テンプレート一覧をあいまい検索でフィルタ |
| selectedTemplateCategory変更 | 種別Select選択 | テンプレート一覧を種別でフィルタ |

### 4.2 実績値入力イベント

| イベント名 | トリガー | 処理内容 |
|-----------|---------|---------|
| handleActualChange | 実績値Input/InputNumber変更 | `tasks` State を immutable 更新（対象 taskNo・transitionId・propKey を更新） |
| 確信度ボタンクリック | 確信度ボタン | PropertyCard 内部 State `confidence` を更新（再クリックで null）|
| 定量評価追加 | 「＋値の追加」クリック | PropertyCard 内部 State `addedValues` に行追加 |
| 定量評価削除 | DeleteOutlined クリック | PropertyCard 内部 State `addedValues` から行削除 |

### 4.3 保存・完了イベント

| イベント名 | トリガー | 処理内容 |
|-----------|---------|---------|
| handleSave | 保存ボタンクリック | `Modal.success` で保存通知（モック） |
| handleSaveAndNext | 保存して次へクリック（最終テンプレート） | 対象トランジションを `completed` に更新 → `viewingKey` をリセット → 次トランジションIDを `Modal.success` で通知 |
| onTemplateIdxChange | 保存して次へクリック（途中テンプレート） | 次テンプレートインデックスに切り替え |

### 4.4 スキップイベント

| イベント名 | トリガー | 処理内容 |
|-----------|---------|---------|
| handleSkip | スキップボタンクリック | `skippedTransitionIds` に追加 → `findNextAvailableTransition` で次を検索 → 見つかれば `viewingKey` リセット・Modal通知、見つからなければ警告Modal |

### 4.5 Insertion/Content追加・削除イベント

| イベント名 | トリガー | 処理内容 |
|-----------|---------|---------|
| handleInsertionAdd | Insertion追加ボタン | `tasks[taskNo].transitions[transitionId].customInsertionIds` に新ID追加 |
| handleInsertionRemove | カスタムInsertionスロット削除ボタン | `customInsertionIds` から対象ID削除、`actuals` から `insertion_custom_{id}` を削除 |
| handleContentAdd | content追加ボタン | `customContentIds` に新ID追加 |
| handleContentRemove | カスタムContentスロット削除ボタン | `customContentIds` から対象ID削除、`actuals` から `content_custom_{id}` を削除 |

### 4.6 コメントイベント

| イベント名 | トリガー | 処理内容 |
|-----------|---------|---------|
| commentDialogOpen | コメントボタンクリック | `commentDialogOpen` を true にして ExperimentCommentDialog を表示 |
| handleSaveComment | ExperimentCommentDialog 保存 | `Modal.success` でコメント保存通知（モック） |

---

## 5. データフロー

### 5.1 Props（親から受け取るデータ）

```typescript
interface WorkRecordPanelProps {
  /** 選択中のプロジェクト名（S3アップロードパスの組み立てに使用） */
  projectName?: string;
}
```

| Prop名 | 型 | 必須 | 説明 |
|--------|-----|------|------|
| `projectName` | `string` | ❌ | 選択中のプロジェクト名 |
| `projectId` | `string` | ❌ | 選択中のプロジェクトID |
| `methodId` | `string` | ❌ | メソッドID（`progressRows[0]?.methodId` から渡される） |
| `progressRows` | `ProgressRow[]` | ❌ | 親コンポーネント（ExperimentWorkerMenu）から渡される進捗行データ。これを元に `activeEntry` を算出。各行に `isRecorded?: boolean` フィールドを含む |
| `projectStatus` | `number` | ❌ | プロジェクトステータスコード |
| `useDeemedProgress` | `boolean` | ❌ | みなし進捗フラグ |
| `initialTaskNo` | `number` | ❌ | 初期表示タスクNo。進捗確認タブから「作業へ」「詳細確認」で遷移した際に指定 |
| `initialTransitionId` | `string` | ❌ | 初期表示トランジションID。進捗確認タブから遷移した際に指定 |
| `projectInstructions` | `string[]` | ❌ | プロジェクト指示テキスト配列 |
| `onConfirmInstruction` | `() => void` | ❌ | 指示確認ボタン押下時。省略時はボタン非表示 |
| `onStart` | `() => void` | ❌ | 「開始」ボタン押下時（`ready` → `IN_PROGRESS` 遷移） |
| `onEnd` | `() => void` | ❌ | 「終了」ボタン押下時（`in_progress` → `COMPLETED` 遷移） |
| `onForceEnd` | `() => void` | ❌ | 「異常終了」ボタン押下時（`in_progress` → `ERROR` 遷移） |

### 5.2 State（内部状態）

```typescript
// タスク一覧（フェーズA: モックデータ INITIAL_TASKS で初期化）
const [tasks, setTasks] = useState<MockTask[]>(INITIAL_TASKS);

// 完了済みトランジション閲覧モード（null: 通常作業、非null: 閲覧対象キー）
const [viewingKey, setViewingKey] = useState<{ taskNo: number; transitionId: string } | null>(null);

// スキップ済みトランジションIDリスト
const [skippedTransitionIds, setSkippedTransitionIds] = useState<string[]>([]);

// コメントダイアログ表示状態
const [commentDialogOpen, setCommentDialogOpen] = useState(false);

// PlanB (Sider) 内部State
// selectedTemplateId: 選択中のテンプレートID（null の場合は先頭テンプレートを自動選択）
// templateSearchText: テンプレート検索テキスト
// selectedTemplateCategory: テンプレート種別フィルタ
```

### 5.3 算出データ（useMemo）

```typescript
// 現在の active entry（作業中トランジション）
// ORDERED_TRANSITION_IDS の順で tasks[activeTaskNo].transitions を走査し、
// status が completed/error でない最初のものを返す
const activeEntry: { taskNo: number; transitionId: string } | null

// displayKey = viewingKey（閲覧モード）または activeEntry（作業モード）
const displayKey = viewingKey ?? activeEntry;

`WorkHeader` 内の `Select` コンポーネントで表示。`WorkRecordPanelProps.onStatusChange` は**存在しない**。内部的に `WorkHeaderProps.onStatusChange?(transitionId: string, status: TransitionStatus)` として処理される。

**内部 `TransitionStatus` 型の値と表示ラベル：**

| 内部ステータス値（`TransitionStatus`） | 表示ラベル | 対応する `ProgressRow.status` |
|---------------------------------------|------------|-------------------------------|
| `not_started` | 未着手（`progressStatus.notStarted`） | `not_started` |
| `preparing` | 準備中（`progressStatus.preparing`） | `preparing` |
| `ready` | 準備完了（`progressStatus.ready`） | `ready` |
| **`running`** | 実行中（`progressStatus.running`） | `in_progress` |
| **`paused`** | 一時停止（`progressStatus.paused`） | `on_hold` |
| `completed` | 完了（`progressStatus.completed`） | `completed` |
| `error` | エラー（`progressStatus.error`） | `issue` |

> ⚠️ `ProgressRow.status` の `in_progress` / `on_hold` は、`buildTransitions` 内の `switch` 文で内部値 `running` / `paused` にそれぞれ変換されます。

---

## 5. 機能仕様

### 5.1 activeEntry 選択ロジック

`progressRows` から以下の優先順位で `activeEntry` を選択する（2026-08-27 修正）：

1. **`activeTaskNo` の `in_progress` / `ready` / `preparing` 行**  
   ステータス優先順位: `in_progress` (1) > `ready` (2) > `preparing` (3)、同一ステータス内は `order` 昇順（若い順）
2. **全体の `in_progress` / `ready` / `preparing` 行**（同上の優先順位）
3. `activeTaskNo` の `not_started` 行（未着手でもカードを表示）
4. 全体の `not_started` 行
5. 全行が `completed` / `error` → `null`（「全トランジション完了」Alert を表示）

`activeTaskNo` は `progressRows` が存在する場合はその `taskNo` から自動決定する。

### 5.2 左Sider テンプレートリスト（カテゴリ別グループ表示）

`categorizedTemplates` useMemo でテンプレートを `Materials` / `Conditions` / `Results` の3カテゴリに分類し、各グループをカード形式で表示する。

**カードの表示項目**:
- テンプレート名
- プロパティ数（`N項目`）
- カテゴリ Tag（Materials / Conditions / Results）
- I/O Tag（IN / OUT）

**クリック動作**: 選択されると右 Content エリアにプロパティカードグリッドが表示される。

### 5.3 ボタン群（2行目）配置

```
[保存] [次へ] | [コメント] [スキップ]
              ↑ Divider（グループ区切り）
```

### 5.4 モックデータ構成

| 定数名 | 内容 |
|--------|------|
| `MOCK_PROJECT_INSTRUCTIONS` | プロジェクト指示 4件 |
| `MOCK_TRANSITIONS` | TR_A / TR_B / TR_C / TR_D の 4トランジション |
| `MOCK_METHODS` | メソッド 1件 |
| `INITIAL_TASKS` | タスク 3件（全完了済み / TR_B完了・TR_A作業中 / 未着手） |
| `ASSIGNED_TASK_NO` | `2`（フェーズA固定、フェーズBでProps化予定） |

**トランジション構成:**

| ID | 名称 | 前提 | テンプレート |
|----|------|------|------------|
| TR_A | 混合条件 | なし（順序自由） | Condition-Mixing, Material-Reagent（Insertion付き） |
| TR_B | 加熱条件 | なし（順序自由） | Condition-Heating |
| TR_C | 分離操作 | なし（順序自由） | Condition-Centrifuge, Material-Solvent |
| TR_D | 最終評価 | TR_A + TR_B + TR_C 全完了後のみ | Result-Yield |

### 5.5 スキップロジック

`canAccessTransitionInTask(target, taskTransitions)`:
- `prerequisiteTransitionIds` が空 → 常にアクセス可能
- `prerequisiteTransitionIds` が設定されている場合 → 全て `completed` のときのみアクセス可能

`findNextAvailableTransition(taskNo, currentTransitionId, skippedIds, tasks)`:
1. `ORDERED_TRANSITION_IDS` の現在インデックスより後ろを優先検索
2. 見つからなければ先頭から現在の前まで循環検索
3. `completed / error` の行と `skippedIds` に含まれる行はスキップ対象外

### 5.6 使用するAPI

| API | 用途 | 実装状況 |
|-----|------|---------|
| S3ファイルアップロード | Insertion ファイルアップロード（`InsertionEditorCompact`） | TODO（フェーズB） |
| コメント保存API | コメントの永続化 | TODO（フェーズB） |
| 実績値保存API | トランジションデータの保存 | TODO（フェーズB） |
| ステータス更新API | トランジションステータスの更新 | TODO（フェーズB） |

---

### 5.7 状態記録ダイアログ仕様

> **[2026-08-26 追加]**: ソースコード（WorkRecordPanel.tsx L2624〜2837）から仕様を起こして追記。

### 5.7.1 概要

「状態記録」ボタン押下時に表示される `Modal`（幅 520px）。  
各状態への遷移時刻を手動入力・補正するためのダイアログ。  
タイトル: `workRecord.stateRecordDialogTitle`（ja: **「状態記録」**）

### 5.7.2 ダイアログレイアウト

```
┌─────────────────────────────────────────────┐
│ 状態記録                               [✕]  │
├─────────────────────────────────────────────┤
│ [準備状態]       状態遷移時刻               │
│（cyan Tag）      [DatePicker（日時選択）  ]  │
├─────────────────────────────────────────────┤
│ [準備完了状態]   状態遷移時刻               │
│（blue Tag）      [DatePicker（日時選択）  ]  │
├─────────────────────────────────────────────┤
│ [動作状態]       状態遷移時刻               │
│（processing Tag）[DatePicker（日時選択）  ]  │
│                  [＋ 休止状態記録追加]       │
├─────────────────────────────────────────────┤
│ ┌─ 休止状態記録（動的追加、ボーダー囲み）──┐ │
│ │ [休止状態]    状態遷移時刻               │ │
│ │（gold Tag）   [DatePicker（日時選択）  ]  │ │
│ │ [動作状態]    状態遷移時刻               │ │
│ │（processing） [DatePicker（日時選択）  ]  │ │
│ │              [＋ 休止状態記録追加] [削除] │ │
│ └──────────────────────────────────────────┘ │
│  （＋ ボタンで同構造のペアが末尾に追加）      │
├─────────────────────────────────────────────┤
│ [終状態]         状態遷移時刻               │
│（success Tag）   [DatePicker（日時選択）  ]  │
├─────────────────────────────────────────────┤
│ [異常終了状態]   状態遷移時刻               │
│（error Tag）     [DatePicker（日時選択）  ]  │
├─────────────────────────────────────────────┤
│                       [キャンセル] [保存]   │
└─────────────────────────────────────────────┘
```

### 5.7.3 固定行の仕様

| 行 | ロケールキー | Tag 色 | 入力 state 変数 |
|----|------------|---------|----------------|
| 準備状態 | `workRecord.srStatusPreparing` | `cyan` | `srPreparingTime` |
| 準備完了状態 | `workRecord.srStatusReady` | `blue` | `srReadyTime` |
| 動作状態 | `workRecord.srStatusRunning` | `processing`（青） | `srRunningTime` |
| 終状態 | `workRecord.srStatusCompleted` | `success`（緑） | `srCompletedTime` |
| 異常終了状態 | `workRecord.srStatusError` | `error`（赤） | `srErrorTime` |

- 各行の入力欄：`DatePicker`（`showTime` 付き、日時選択可）
- プレースホルダー：`workRecord.srTransitionTime`（ja: **「状態遷移時刻」**）

### 5.7.4 動的追加行（休止状態記録ペア）

**「＋ 休止状態記録追加」ボタン**（`workRecord.srAddPause`、`PlusOutlined` アイコン）押下で、以下の構造のペアが末尾に追加される。

| 行 | ロケールキー | Tag 色 | state 変数（`PauseEntry` 型） |
|----|------------|---------|-------------------------------|
| 休止状態 | `workRecord.srStatusPaused` | `gold` | `pauseTime` |
| 動作状態（再開） | `workRecord.srStatusRunning` | `processing`（青） | `resumeTime` |

**`PauseEntry` 型:**
```typescript
interface PauseEntry {
  id: string;        // 行を一意に識別するID（Date.now() + ランダム文字列）
  pauseTime: string; // 休止状態の状態遷移時刻
  resumeTime: string;// 再開（動作状態）の状態遷移時刻
}
```

**ペア内のボタン:**
| ボタン | ロケールキー | 動作 |
|--------|------------|------|
| ＋ 休止状態記録追加 | `workRecord.srAddPause` | 新しいペアを `srPauseEntries` 末尾に追加 |
| 削除（danger） | `workRecord.srRemovePause` | 該当 `id` のペアを `srPauseEntries` から除去 |

ペアはボーダー（`1px solid #e8e8e8`）で囲まれて表示される。

### 5.7.5 保存・キャンセル動作

| 操作 | 動作 |
|------|------|
| **保存**（`okText: workRecord.common.save`） | 各 state 値をオブジェクトに集約して `console.info` 出力（**現状モック・API 保存未実装**）。`Modal.success`（`workRecord.stateRecordSaved`）を表示後、ダイアログを閉じて全 state をリセット |
| **キャンセル**（`cancelText: common.cancel`） | ダイアログを閉じ、`srPreparingTime` / `srReadyTime` / `srRunningTime` / `srCompletedTime` / `srErrorTime` / `srPauseEntries` を全てリセット |

> ⚠️ **保存は現状モック実装**です。実際のバックエンド API への保存は未実装（TODO）。

### 5.7.6 保存データ構造（モック）

```typescript
const saveData = {
  preparingTime:  srPreparingTime,   // 準備状態 遷移時刻
  readyTime:      srReadyTime,       // 準備完了状態 遷移時刻
  runningTime:    srRunningTime,     // 動作状態 遷移時刻
  pauseEntries:   srPauseEntries,    // 休止状態記録ペア配列
  completedTime:  srCompletedTime,   // 終状態 遷移時刻
  errorTime:      srErrorTime,       // 異常終了状態 遷移時刻
};
```

---

## 6. エラーチェック

### 6.1 スキップ制御

| 状態 | スキップボタン | Tooltip |
|------|--------------|---------|
| `in_progress`（動作状態）のトランジションが選択中 | **disabled** | `t('workRecord.skipTooltipUnavailable')` = 「スキップできる別のトランジションがありません」 |
| 他に実行可能なトランジションがある | 有効 | `t('workRecord.skipTooltipAvailable')` = 「このトランジションを後回しにして次へ進みます」 |
| 他に実行可能なトランジションがない | disabled | `t('workRecord.skipTooltipUnavailable')` = 「スキップできる別のトランジションがありません」 |

> **実装上の補足（2026-08-27 確認）**: ソースでは `canSkipFlag = hasNextTransition && !isInProgress` の真偽値 1つで分岐。`true` なら `skipTooltipAvailable`、`false` なら `skipTooltipUnavailable` を表示（`in_progress` 専用の Tooltip テキストは存在しない）。

> `in_progress` ステータスのトランジションはスキップ不可（実験データ保存を促す）。

### 6.2 トランジションアクセス制御

`prerequisiteTransitionIds` が設定されているトランジションは、前提がすべて `completed` になるまで `activeEntry` に選ばれない。

### 6.3 承認依頼ボタン活性条件

`ExperimentWorkerMenu` の承認依頼ボタンは以下の**両方**を満たす場合のみ活性化する。

| 条件 | 詳細 |
|------|---------|
| 全トランジションが `completed` | `progressRows` の全行の `status === 'completed'` |
| 全トランジションが記録済み | `progressRows` の全行の `isRecorded === true` |

どちらか一方でも満たさない場合はボタンが `disabled` になる。

---

## 7. 画面遷移

### 7.1 遷移元
- `ExperimentWorkerMenu`（実験作業者メニュー）の「作業記録」タブ（key='3'）

### 7.2 遷移先
なし（パネル内で完結）

### 7.3 モーダル遷移

```
WorkRecordPanel (PlanB)
  ├→ ExperimentCommentDialog（コメント記録）
  │     └→ 保存 / キャンセル → 閉じる
  └→ 状態記録ダイアログ（Modal, width=520）
        ├→ 固定行: 準備状態（DatePicker）
        ├→ 固定行: 準備完了状態（DatePicker）
        ├→ 固定行: 動作状態（DatePicker）＋「＋ 休止状態記録追加」ボタン
        ├→ [動的追加] 休止状態・動作状態ペア（DatePicker ×2）×n件
        ├→ 固定行: 終状態（DatePicker）
        ├→ 固定行: 異常終了状態（DatePicker）
        └→ 保存 / キャンセル → 閉じる（キャンセル時は全入力リセット）
```

---

## 8. レスポンシブ対応

### 8.1 ブレークポイント

| サイズ | 対応 |
|--------|-----|
| Desktop (> 1024px) | 2カラム標準レイアウト |
| Tablet (768-1024px) | 部分対応（左Sider 280px固定） |
| Mobile (< 768px) | 非推奨（Sider固定幅のため） |

---

## 9. パフォーマンス考慮事項

### 9.1 最適化
- `activeEntry`、`filteredTemplates`、`categorizedTemplates` は `useMemo` でメモ化
- `handleActualChange`、`handleSave`、`handleSaveAndNext`、`handleSkip`、`handleInsertionAdd`、`handleInsertionRemove`、`handleContentAdd`、`handleContentRemove`、`handleSaveComment` は `useCallback` でメモ化

### 9.2 データ量
- テンプレート数: 現在最大4件（モック）。実API接続後は100件程度を想定
- プロパティ数: テンプレートあたり最大10項目程度

---

## 10. 備考

### 10.1 特記事項

1. **PlanA / PlanB の2実装**  
   ソースコード内に `PlanA`（テンプレート選択ボタン形式）と `PlanB`（左Siderテーブル形式）の2実装が存在するが、`WorkRecordPanel` の `return` では **`PlanB` のみを使用**している。`PlanA` はコード内に残存しているが未使用。

2. **ASSIGNED_TASK_NO = 2 の固定**  
   フェーズAでは作業対象タスク番号が `2` に固定されている。フェーズBでログインユーザーの担当タスクを API から取得して Props 化する予定。

3. **確信度・定量評価の永続化未実装**  
   PropertyCard の確信度（`confidence` State）と定量評価追加行（`addedValues` State）はコンポーネント内ローカル State であり、保存ボタン押下時に API へ送信する実装は未完了（フェーズB）。

4. **データ保存のモック実装**  
   保存ボタン → `Modal.success` で通知のみ。実際の API 呼び出しはフェーズBで実装予定。

### 10.2 実装済み機能

| # | 機能 | 状態 |
|---|------|------|
| 1 | activeEntry を progressRows / API データで決定 | ✅ 完了 |
| 2 | 実績値の API 保存（POST） | ✅ 完了 |
| 3 | トランジションステータス更新の API 接続 | ✅ 完了 |
| 4 | コメント保存の API 接続 | ✅ 完了 |
| 5 | 状態記録ダイアログの実装 | ✅ 完了 |
| 6 | 左Sider カテゴリ別グループ表示 | ✅ 完了 |
| 7 | 保存時 `is_recorded = TRUE` 更新 | ✅ 完了 |
| 8 | `in_progress` 時スキップボタン非活性 | ✅ 完了 |
| 9 | 承認依頼ボタン: 全完了 + 全 isRecorded=true 条件 | ✅ 完了 |
| 10 | トランジション優先順位: in_progress > ready > preparing | ✅ 完了 |
| 11 | S3ファイルアップロード（Insertion） | 🔲 TODO |
| 12 | PlanA の削除または採用判断 | 🔲 TODO |

### 10.3 関連ドキュメント

- [ExperimentWorkerMenu 設計書](./ui_experiment_worker_main.md)
- [ExperimentCommentDialog 設計書](./ui_experiment_comment_dialog.md)
- [ProgressOverviewTab 設計書](./ui_progress_overview_tab.md)

---

## 11. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 3.2.0 | 2026-08-27 | ソースコードとの照合に基づき修正（2026-08-27）：①§5.1 activeEntry 選択ロジックを修正（`in_progress` のみ→`in_progress`/`ready`/`preparing` の3ステータスを対象に優先順位ソート・同一ステータス内は `order` 昇順）。②§6.1 スキップ Tooltip テキストを `t('workRecord.skipTooltipAvailable')` = 「このトランジションを後回しにして次へ進みます」/ `t('workRecord.skipTooltipUnavailable')` = 「スキップできる別のトランジションがありません」に修正（3種→2種、`in_progress` 専用テキストは存在しないことを補足注記に明記）。③§9.1 `handleStatusChange` を `useCallback` メモ化対象リストから削除（`WorkRecordPanel` の export default 内に存在しない） | Cline |
| 3.1.0 | 2026-08-25 | §1.2: 保存時 `is_recorded=TRUE` 更新を主要機能に追記。§3 Props: `progressRows` に `isRecorded?: boolean` フィールドを追記。§6.1 スキップ制御: `in_progress` 時の disabled 条件を追加・優先順位を先頭に変更。§6.3: 承認依頼ボタン活性条件セクション新規追加（全 completed + 全 isRecorded=true）。§10.2: 実装済み機能に7〜10を追加 | Cline |
| 3.0.2 | 2026-08-26 | §5.7 状態記録ダイアログ仕様を新規追加（ソースコード L2624〜2837 から起こし）：ダイアログレイアウト・固定5行の仕様（準備状態/準備完了状態/動作状態/終状態/異常終了状態・各行Tag色・DatePicker・state変数名）・動的追加行の PauseEntry 型・追加/削除ボタン仕様・保存/キャンセル動作・保存データ構造（現状モック）。§7.3 モーダル遷移図を実装に合わせて更新 | Cline |
| 3.0.1 | 2026-08-26 | ソースコードとの乖離を修正：①タイトル・画面名・タブ名を「作業記録」→「実験記録」に統一（`tabs.experimentRecord="実験記録"` に準拠）、②Props定義を `WorkRecordPanelProps` 型に合わせて全面修正（`onStatusChange` 削除・`useDeemedProgress`/`initialTaskNo`/`initialTransitionId` 追加・`selectedProject` → 個別フィールドに変更）、③§4.3 状態プルダウンの内部ステータス値を正確に記載（`running`/`paused` ← `in_progress`/`on_hold` のマッピング説明追加）、④§5.4 PropertyCard フィールド名を内部 `MockProperty` 型とAPIフィールド名に分けて記載（`uncertaintyValue`/`uncertaintyDescription` ← `toleranceValue`/`uncertaintyNote`）、⑤`qualitativeNote`（description）の表示位置を「確信度ラベル右隣」に修正（「不確かさ値ヘッダー右隣」は誤り） | Cline |
| 3.0.0 | 2026-08-26 | フェーズB移行完了に伴う全面更新（詳細は3.0.0の変更内容を参照） | Cline |
| 2.0.0 | 2026-08-19 | WorkRecordPanel.tsx ソースコードに基づき全面書き直し（旧ExperimentRecordTab設計書から統合） | Cline |
