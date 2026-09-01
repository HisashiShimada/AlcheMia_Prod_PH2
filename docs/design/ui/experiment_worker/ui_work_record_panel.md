# 実験記録パネル UI設計書

## メタデータ
- **画面ID**: WorkRecordPanel
- **画面名**: 実験記録パネル（実験記録タブ）
- **ファイルパス**: `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx`
- **利用権限**: 実験作業者（experiment_worker）
- **作成日**: 2026-06-22
- **最終更新日**: 2026-08-26

---

## 1. 概要

### 1.1 画面の目的
実験作業者が実験データをトランジション単位で記録するためのメインパネルです。  
`ExperimentWorkerMenu` の「**実験記録**」タブ（key='3'）にレンダリングされます。

### 1.2 主要機能
- プロジェクト指示の確認（折りたたみ表示）・「指示確認」ボタンによる一括確認
- 現在作業中のトランジション情報の表示（ステータス/タスク#/メソッドID/トランジションID）
- テンプレート一覧から **カテゴリ別グループ表示** でテンプレートを選択して実績値を入力
- プロパティカードごとの実績値入力・確信度（定性評価 ← DB登録選択肢使用）・定量評価追加
- 保存 / スキップ / 保存して次へ（トランジション完了）
- コメント記録（ExperimentCommentDialog）
- **状態記録ダイアログ**（「状態記録」ボタン押下で表示）
- カスタム Insertion（ファイル添付）追加・削除
- カスタム Content（DataGrid）追加・削除
- **状態プルダウン**（WorkHeader 内）による状態変更

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
│   ※ 右端に「指示確認」ボタン（onConfirmInstruction）      │
├──────────────────────────────────────────────────────────┤
│ WorkHeader                                               │
│ ┌────────────────────────────────────────────────────┐   │
│ │ [ステータスSelect▼] ─ タスク# ─ メソッドID ─ trID │   │
│ │                              右端ボタン群（1行目）: │   │
│ │  [開始] [終了] | [異常終了（赤）] [状態記録]        │   │
│ │              ※ | はDivider（グループ区切り）        │   │
│ └────────────────────────────────────────────────────┘   │
│ ※ 完了済み閲覧時は「完了済み（参照のみ）」Alert + 戻るBtn │
├──────────────────────────────────────────────────────────┤
│ Layout（2カラム, height: 100%）                          │
│ ┌──────────────────┬───────────────────────────────────┐ │
│ │ Sider (280px)    │ Content（残り幅）                 │ │
│ ├──────────────────┼───────────────────────────────────┤ │
│ │ テンプレート数   │ ボタン群（2行目）:                 │ │
│ │ [検索Input]      │  [保存] [次へ] | [コメント][スキップ]│ │
│ │ [種別Select]     │  ※ | はDivider（グループ区切り）  │ │
│ │                  │                                   │ │
│ │ カテゴリ別グループ│ [Category Tag] テンプレート名     │ │
│ │ ┌──────────────┐ │ Row gutter={[8,8]} （3列グリッド） │ │
│ │ │[Materials]   │ │ ┌─────────┐ ┌─────────┐ ┌───────┐│ │
│ │ │ Card:tpl名   │ │ │Property │ │Property │ │  ...  ││ │
│ │ │ [3項目][IN]  │ │ │Card     │ │Card     │ │       ││ │
│ │ ├──────────────┤ │ └─────────┘ └─────────┘ └───────┘│ │
│ │ │[Conditions]  │ │                                   │ │
│ │ │ Card:tpl名   │ │ ＋property追加 ＋content追加       │ │
│ │ ├──────────────┤ │ ＋Insertion追加                   │ │
│ │ │[Results]     │ │                                   │ │
│ │ │ Card:tpl名   │ │ [固定Insertionスロット]            │ │
│ │ └──────────────┘ │ [カスタムInsertionスロット]        │ │
│ │                  │ [カスタムContentスロット]          │ │
│ └──────────────────┴───────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘

PropertyCard（Col span={8}）:
┌───────────────────────────────┐
│ [ラベル] [型Tag] (key)         │
│  ※ 選択中の確信度Tag（定性評価選択時のみ表示）         │
│  ※ description（qualitativeNote）は確信度ラベル右隣に表示 │
│ ─────────────────────────────  │
│ 想定値（plannedValue）│ 不確かさ値（toleranceValue）  │
│ ─────────────────────────────  │
│ 不確かさ説明（uncertaintyNote, 全幅）    │
│ ─────────────────────────────  │
│ 実績値（入力 or 参照表示）     │
│ ─────────────────────────────  │
│ 確信度ボタン ※DB登録選択肢使用（qualitativeOptions）  │
│ ─────────────────────────────  │
│ 定量評価 [不確かさ基準Select][値Input][✕]  │
│ [＋値の追加]                   │
└───────────────────────────────┘

モーダル:
- ExperimentCommentDialog（コメント記録）
- 状態記録ダイアログ（「状態記録」ボタン押下で表示）
  - 「動作状態」固定行（日時＋状態選択）
  - 「＋ 休止状態記録追加」ボタンでペア動的追加
  - 追加ペアはボーダーで囲み「- 休止状態記録削除」で削除可
```

### 2.3 使用コンポーネント

#### Ant Design コンポーネント
- `Layout` / `Sider` / `Content` - 2カラムレイアウト（Sider 280px固定）
- `Flex` - 縦/横並び制御
- `Collapse` - プロジェクト指示折りたたみ
- `Card` - WorkHeader、PropertyCard コンテナ
- `List` / `List.Item` - 左Siderのカテゴリ別テンプレートリスト
- `Input` - テンプレート検索、実績値（StringValue）、定量評価値
- `InputNumber` - 実績値（FloatValue/IntegerValue）
- `Select` - テンプレート種別フィルタ、定量評価不確かさ基準選択、WorkHeader 状態プルダウン
- `Button` - 確信度、追加、保存、スキップ、保存して次へ、コメント、状態記録、戻る、指示確認
- `Tag` - ステータス、カテゴリ（Materials/Conditions/Results）、I/O（IN/OUT）、型（Float/Int/Str）
- `Badge` - プロジェクト指示件数
- `Alert` - 全完了メッセージ、完了済み参照時の注意
- `Divider` - WorkHeader 項目区切り、ボタングループ区切り
- `Row` / `Col` - PropertyCard グリッド（3列）
- `Modal` - 状態記録ダイアログ

---

## 3. コンポーネント Props 定義

```typescript
interface WorkRecordPanelProps {
  projectName?: string;
  projectId?: string;
  methodId?: string;
  progressRows?: ProgressRow[];
  projectStatus?: number;
  useDeemedProgress?: boolean;        // みなし進捗フラグ
  initialTaskNo?: number;             // 初期表示タスクNo（進捗確認タブから遷移時）
  initialTransitionId?: string;       // 初期表示トランジションID（進捗確認タブから遷移時）
  projectInstructions?: string[];
  onConfirmInstruction?: () => void;  // 指示確認ボタン押下時のコールバック
  onStart?: () => void;               // 「開始」ボタン押下時（準備完了→動作状態）
  onEnd?: () => void;                 // 「終了」ボタン押下時（動作状態→終状態）
  onForceEnd?: () => void;            // 「異常終了」ボタン押下時
}
```

| Prop名 | 型 | 必須 | 説明 |
|--------|-----|------|------|
| `projectName` | `string` | ❌ | 選択中のプロジェクト名 |
| `projectId` | `string` | ❌ | 選択中のプロジェクトID |
| `methodId` | `string` | ❌ | メソッドID（`progressRows[0]?.methodId` から渡される） |
| `progressRows` | `ProgressRow[]` | ❌ | 親コンポーネント（ExperimentWorkerMenu）から渡される進捗行データ。これを元に `activeEntry` を算出 |
| `projectStatus` | `number` | ❌ | プロジェクトステータスコード |
| `useDeemedProgress` | `boolean` | ❌ | みなし進捗フラグ |
| `initialTaskNo` | `number` | ❌ | 初期表示タスクNo。進捗確認タブから「作業へ」「詳細確認」で遷移した際に指定 |
| `initialTransitionId` | `string` | ❌ | 初期表示トランジションID。進捗確認タブから遷移した際に指定 |
| `projectInstructions` | `string[]` | ❌ | プロジェクト指示テキスト配列 |
| `onConfirmInstruction` | `() => void` | ❌ | 指示確認ボタン押下時。省略時はボタン非表示 |
| `onStart` | `() => void` | ❌ | 「開始」ボタン押下時（`ready` → `IN_PROGRESS` 遷移） |
| `onEnd` | `() => void` | ❌ | 「終了」ボタン押下時（`in_progress` → `COMPLETED` 遷移） |
| `onForceEnd` | `() => void` | ❌ | 「異常終了」ボタン押下時（`in_progress` → `ERROR` 遷移） |

> **注意**: `onStatusChange` は外部 Props ではありません。状態プルダウンの変更は `WorkHeader` 内の `onStatusChange?(transitionId, status)` として内部的に処理されます。

---

## 4. WorkHeader 仕様

### 4.1 WorkHeader レイアウト

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [状態 Select▼] ─ タスク#{n} ─ {methodId} ─ {transitionId（省略）}         │
│                                    [開始] [終了] | [異常終了] [状態記録]   │
└──────────────────────────────────────────────────────────────────────────┘
```

### 4.2 WorkHeader ボタン仕様

| ボタン | スタイル | 動作 |
|--------|---------|------|
| 開始 | `primary` | トランジションを IN_PROGRESS 状態に遷移 |
| 終了 | `default` | トランジションを COMPLETED 状態に遷移 |
| **（Divider）** | — | 開始・終了グループとその右グループを区切る `<Divider type="vertical" />` |
| 異常終了 | **`danger`（赤）** | トランジションを ERROR 状態に遷移 |
| 状態記録 | `default` | 状態記録ダイアログを開く |

### 4.3 状態プルダウン

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

`progressRows` から以下の優先順位で `activeEntry` を選択する：

1. `activeTaskNo` の `in_progress` 行
2. 全体の `in_progress` 行
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

| ボタン | スタイル | 動作 |
|--------|---------|------|
| 保存 | `primary` | 実績値を API 保存（`POST /api/v1/experiment-data`） |
| 次へ | `default` | 保存してトランジションを完了扱いにし次トランジションへ |
| **（Divider）** | — | `<Divider type="vertical" />` |
| コメント | `default` | ExperimentCommentDialog を開く |
| スキップ | `default` | 現在のトランジションをスキップして次へ（スキップ不可時は disabled） |

### 5.4 PropertyCard 詳細仕様

PropertyCard が内部で使用する `MockProperty` 型のフィールドと、バックエンドが返す API フィールド名（`convertRawProperty` 関数で変換）の対応：

| `MockProperty` 内部フィールド | バックエンド API フィールド | 表示箇所 |
|------------------------------|--------------------------|---------|
| `expected` | `value`（優先）/ `plannedValue`（フォールバック） | 「想定値」セル |
| `uncertaintyName` | `uncertaintyName` | 「不確かさ値」列ヘッダー文字列 |
| `uncertaintyValue` | `toleranceValue` | 「不確かさ値」セルの数値 |
| `uncertaintyDescription` | `uncertaintyNote` | 「不確かさ説明」全幅セル |
| `uncertaintyKey` | `uncertaintyKey` | 定量評価 Select の初期値 |
| `confidenceOptions` | `qualitativeOptions`（`displayOrder` 順にソートして `selectorValue` を使用） | **確信度ボタン群**（DB登録の選択肢。未設定時のみデフォルト3択にフォールバック） |
| `defaultConfidence` | `qualitativeEval` | 確信度ボタンの初期選択状態 |
| `description` | `qualitativeNote` | **確信度ラベル（`workRecord.qualitativeEval`）の右隣**に `（description）` 形式で表示 |

> ⚠️ `description`（= `qualitativeNote`）は**確信度（定性評価）ラベルの右隣**に表示されます。「不確かさ値ヘッダー」の右隣ではありません（ソースコード L401-403 参照）。

### 5.5 スキップロジック

`canAccessTransitionInTask(target, taskTransitions)`:
- `prerequisiteTransitionIds` が空 → 常にアクセス可能
- `prerequisiteTransitionIds` が設定されている場合 → 全て `completed` のときのみアクセス可能

`findNextAvailableTransition(taskNo, currentTransitionId, skippedIds, tasks)`:

1. `apiTransitions` 配列の現在インデックスより後ろを優先検索
2. 見つからなければ先頭から現在の前まで循環検索
3. `completed / error` の行と `skippedIds` に含まれる行はスキップ対象外

### 5.6 使用するAPI

| API | 用途 | 実装状況 |
|-----|------|---------|
| `GET /api/v1/progress/projects/:name/work-details` | プロジェクトのトランジション一覧取得（`getWorkDetails`） | ✅ 実装済み |
| `GET /api/v1/experiment-data/template-data` | テンプレート・プロパティ取得（`getTemplateData`） | ✅ 実装済み |
| `POST /api/v1/experiment-data` | 実績値保存 | ✅ 実装済み |
| `PATCH /api/v1/progress/.../status` | トランジションステータス更新（`updateTransitionStatus`） | ✅ 実装済み |
| `POST /api/v1/projects/.../instructions/confirm` | プロジェクト指示一括確認（`confirmInstruction`） | ✅ 実装済み |
| `POST /api/v1/experiment-data/comment` | コメント保存 | ✅ 実装済み |
| S3ファイルアップロード | Insertion ファイルアップロード（`InsertionEditorCompact`） | TODO |

---

## 6. エラーチェック

### 6.1 スキップ制御

| 状態 | スキップボタン | Tooltip |
|------|--------------|---------|
| 他に実行可能なトランジションがある | 有効 | 「スキップ可能です」 |
| 他に実行可能なトランジションがない | disabled | 「スキップできるトランジションがありません」 |

### 6.2 トランジションアクセス制御

`prerequisiteTransitionIds` が設定されているトランジションは、前提がすべて `completed` になるまで `activeEntry` に選ばれない。

---

## 7. 画面遷移

### 7.1 遷移元
- `ExperimentWorkerMenu`（実験作業者メニュー）の「**実験記録**」タブ（key='3'）

### 7.2 遷移先
なし（パネル内で完結）

### 7.3 モーダル遷移

```
WorkRecordPanel (PlanB)
  ├→ ExperimentCommentDialog（コメント記録）
  │     └→ 保存 / キャンセル → 閉じる
  └→ 状態記録ダイアログ（Modal）
        ├→ 動作状態行（日時＋状態選択）
        ├→ [＋ 休止状態記録追加] → 休止状態＋動作状態ペア追加
        └→ 保存 / キャンセル → 閉じる
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
- `handleActualChange`、`handleSave`、`handleSaveAndNext`、`handleSkip`、`handleInsertionAdd`、`handleInsertionRemove`、`handleContentAdd`、`handleContentRemove`、`handleSaveComment`、`handleStatusChange` は `useCallback` でメモ化

### 9.2 データ量
- テンプレート数: API接続後は100件程度を想定
- プロパティ数: テンプレートあたり最大10項目程度

---

## 10. 備考

### 10.1 特記事項

1. **PlanA / PlanB の2実装**  
   ソースコード内に `PlanA`（テンプレート選択ボタン形式）と `PlanB`（左Siderカテゴリグループ形式）の2実装が存在するが、`WorkRecordPanel` の `return` では **`PlanB` のみを使用**している。`PlanA` はコード内に残存しているが未使用。

2. **activeEntry の決定方式（フェーズB完了）**  
   `ORDERED_TRANSITION_IDS`（モック固定ID配列）・`INITIAL_TASKS`（モックタスク）は全て除去済み。`progressRows`（`getWorkDetails` API レスポンス）を元に `activeEntry` を動的決定する。

3. **確信度（定性評価）選択肢**  
   PropertyCard の確信度ボタン選択肢は `qualitativeOptions`（バックエンドが返す `intuition_selector` テーブル由来）を直接使用する。`qualitativeEval`（保存済み値）が初期選択状態になる。

4. **状態プルダウンの活性化**  
   WorkHeader の「状態」Select は `disabled` が解除されており、ユーザーが直接状態を変更できる。

5. **モックデータ除去済み**  
   `MOCK_TRANSITIONS` / `MOCK_PROJECT_INSTRUCTIONS` / `MOCK_METHODS` / `TR_A_ID` 〜 `TR_D_ID` 等のモック定数は全て削除済み。

### 10.2 実装済み機能（フェーズB完了）

| # | 機能 | 状態 |
|---|------|------|
| 1 | activeEntry を progressRows / API データで決定 | ✅ 完了 |
| 2 | 実績値の API 保存（POST） | ✅ 完了 |
| 3 | トランジションステータス更新の API 接続 | ✅ 完了 |
| 4 | コメント保存の API 接続 | ✅ 完了 |
| 5 | 状態記録ダイアログの実装 | ✅ 完了 |
| 6 | 左Sider カテゴリ別グループ表示 | ✅ 完了 |
| 7 | S3ファイルアップロード（Insertion） | 🔲 TODO |
| 8 | PlanA の削除または採用判断 | 🔲 TODO |

### 10.3 関連ドキュメント

- [ExperimentWorkerMenu 設計書](./ui_experiment_worker_main.md)
- [ExperimentCommentDialog 設計書](./ui_experiment_comment_dialog.md)
- [ProgressOverviewTab 設計書](./ui_progress_overview_tab.md)

---

## 11. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 3.0.1 | 2026-08-26 | ソースコードとの乖離を修正：①タイトル・画面名・タブ名を「作業記録」→「実験記録」に統一（`tabs.experimentRecord="実験記録"` に準拠）、②Props定義を `WorkRecordPanelProps` 型に合わせて全面修正（`onStatusChange` 削除・`useDeemedProgress`/`initialTaskNo`/`initialTransitionId` 追加・`selectedProject` → 個別フィールドに変更）、③§4.3 状態プルダウンの内部ステータス値を正確に記載（`running`/`paused` ← `in_progress`/`on_hold` のマッピング説明追加）、④§5.4 PropertyCard フィールド名を内部 `MockProperty` 型とAPIフィールド名に分けて記載（`uncertaintyValue`/`uncertaintyDescription` ← `toleranceValue`/`uncertaintyNote`）、⑤`qualitativeNote`（description）の表示位置を「確信度ラベル右隣」に修正（「不確かさ値ヘッダー右隣」は誤り） | Cline |
| 3.0.0 | 2026-08-26 | フェーズB移行完了に伴う全面更新（詳細は3.0.0の変更内容を参照） | Cline |
| 2.0.0 | 2026-08-19 | WorkRecordPanel.tsx ソースコードに基づき全面書き直し（旧ExperimentRecordTab設計書から統合） | Cline |
