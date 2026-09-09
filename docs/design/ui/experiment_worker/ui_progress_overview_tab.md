# 全体進捗タブ UI設計書

## メタデータ
- **画面名**: 全体進捗タブ
- **物理名**: ProgressOverviewTab.tsx
- **ファイルパス**: `frontend/src/components/ExperimentWorker/ProgressOverviewTab.tsx`
- **利用権限**: 実験作業者（experiment_worker）
- **作成日**: 2026-06-22
- **最終更新日**: 2026-09-09
- **担当者**: Development Team
- **バージョン**: 3.1.0

---

## 1. 画面概要

### 1.1. 目的

実験作業者（Worker）が、プロジェクト内の全トランジションの進捗状況を一覧で確認し、作業対象を選択・操作するためのタブコンポーネントです。
実験作業者メイン画面（`ExperimentWorkerMenu.tsx`）のタブの1つとして表示されます。

旧来の `ProgressCheckTab` / `ProgressCheckTable` を置き換えたコンポーネントです。

### 1.2. 主要機能

1. **サマリーカード** — 全体進捗率・各ステータス件数・問題報告件数の表示
2. **フィルタバー** — メソッド名・タスクNo・トランジション名・ステータスで絞り込み
3. **進捗テーブル** — 全タスク × トランジションの行テーブル表示（レスポンシブ対応）
4. **操作ボタン** — ステータスに応じた「開始」「作業へ」「再開」「詳細確認」ボタン
5. **前提チェック** — 前提トランジションが未完了の場合は「開始」ボタンを無効化

---

## 2. 画面レイアウト

### 2.1. 全体構成

```
┌──────────────────────────────────────────────────────────────────────┐
│ 全体進捗タブ（ExperimentWorkerMenu > Tab「全体進捗」）                  │
├──────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────────┐  │
│ │ SummaryCard                                                       │  │
│ │  全体進捗  75%  ════════════════                                  │  │
│ │  タスク 3/4 完了                                                   │  │
│ │  │ 準備中: 1件 │ 準備完了: 1件 │ 未着手: 2件 │ 作業中: 3件 │ 完了: 5件 │ [問題あり: 1件]  │  │
│ └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│ フィルタ: [メソッド名▼] [タスクNo▼] [トランジション名▼] [ステータス▼]  │
│           8/10 件                                                      │
│                                                                        │
│ ┌──────────┬──────┬──────────────┬──────────┬────────┬──────┬──────┐ │
│ │メソッド名 │タスクNo│トランジション名│ステータス │進捗(M/C/R)│問題│操作  │ │
│ ├──────────┼──────┼──────────────┼──────────┼────────┼──────┼──────┤ │
│ │メソッドA  │  #1  │ transition-1  │ 🔵準備中  │ M2/3 C1/2│ — │[記録]  │ │
│ ├──────────┼──────┼──────────────┼──────────┼────────┼──────┼──────┤ │
│ │メソッドA  │  #1  │ transition-2  │ 🟡準備完了│ M2/3 C1/2│ — │[記録]  │ │
│ ├──────────┼──────┼──────────────┼──────────┼────────┼──────┼──────┤ │
│ │メソッドA  │  #1  │ transition-3  │ 🔵作業中  │ M2/3 C1/2│ — │[記録]  │ │
│ ├──────────┼──────┼──────────────┼──────────┼────────┼──────┼──────┤ │
│ │メソッドA  │  #1  │ transition-4  │ ✅完了    │ M3/3 C2/2│ 2 │[記録]  │ │
│ ├──────────┼──────┼──────────────┼──────────┼────────┼──────┼──────┤ │
│ │メソッドA  │  #2  │ transition-5  │ ○未着手   │  —    │ — │[記録]  │ │
│ │           │      │               │           │        │   │(disabled)│ │
│ └──────────┴──────┴──────────────┴──────────┴────────┴──────┴──────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

> ⚠️ **[2026-09-09 修正]**: 操作列のボタンラベルを実装に合わせて統一修正。
> 旧設計書では `preparing=「指示確認」`, `ready=「開始」`, `in_progress=「作業へ」`, `completed=「詳細確認」`, `not_started=「開始」` と記述していたが、
> ソース実装（`renderAction`）では **全ステータス共通で `t('experimentWork.table.record')`（「記録」） ボタン1種類のみ**。
> `not_started` のみ `disabled`。それ以外は全て活性で `onGoToWork` を呼ぶ。

### 2.2. レスポンシブ対応

| 幅 | 進捗列の表示 |
|----|------------|
| xl（1200px 以上） | Material / Condition / Result を独立3列（Progressバー + rec/tot 数値） |
| xl 未満 | 「進捗」1列にまとめ（M rec/tot · C rec/tot · R rec/tot をテキストで表示） |

## 4. ProgressRow 型定義

```typescript
interface ProgressRow {
  rowKey: string;             // テーブルキー（`${taskNo}-${transitionId}` 等の一意な値）
  taskNo: number;
  methodId: string;
  methodName?: string;        // メソッド名（未設定時は methodId をフォールバック表示）
  transitionId: string;
  transitionName?: string;    // トランジション名（未設定時は transitionId をフォールバック表示）
  status:
    | 'not_started'    // 未着手
    | 'preparing'      // 準備中（PREPARING: 進捗確認から「開始」押下後）
    | 'ready'          // 準備完了（READY: 指示確認ボタン押下後）
    | 'in_progress'    // 作業中（IN_PROGRESS: 「開始」ボタン押下後）
    | 'on_hold'        // 一時停止
    | 'completed'      // 完了
    | 'issue';         // 問題あり
  hasRecord: boolean;         // 記録済みプロパティが1件以上ある場合 true
  prerequisiteTransitionIds?: string[];
  issueCount?: number;
  order?: number;             // 表示順序（省略時は 0 として扱う）
  materialRecorded?: number; materialTotal?: number;
  conditionRecorded?: number; conditionTotal?: number;
  resultRecorded?: number; resultTotal?: number;
  isRecorded?: boolean;       // 記録済みフラグ（template_data に保存済みかどうか）
}
```

---

## 5. 状態遷移フロー

> ⚠️ **[2026-09-09 修正]**: 「ProgressOverviewTab 操作ボタン」列を実装に合わせて全面修正。

| 操作 | APIステータス値 | バックエンドラベル | ProgressRow.status | ProgressOverviewTab 操作ボタン |
|------|----------------|------------------|-------------------|-------------------------------|
| 初期状態 | — | — | `not_started` | 「記録」ボタン（**disabled**）|
| 進捗確認「記録」→バックエンド自動遷移 | PREPARING(1) | 準備中 | `preparing` | 「記録」ボタン（活性）→ `onGoToWork` |
| 指示確認ボタン | READY(2) | 準備完了 | `ready` | 「記録」ボタン（活性）→ `onGoToWork` |
| WorkRecordPanel内「開始」 | IN_PROGRESS(3) | 実行中 | `in_progress` | 「記録」ボタン（活性）→ `onGoToWork` |
| WorkRecordPanel内「一時停止」 | ON_HOLD(4) | 休止中 | `on_hold` | 「記録」ボタン（活性）→ `onGoToWork` |
| WorkRecordPanel内「終了」 | COMPLETED(5) | 完了 | `completed` | 「記録」ボタン（活性）→ `onGoToWork` |
| WorkRecordPanel内「異常終了」 | ERROR(6) | エラー | `issue` | 「記録」ボタン（活性）→ `onGoToWork` |

> **設計方針（ソースコメントより）**: `not_started` 以外は全ステータス活性で `onGoToWork` に渡す。
> WorkRecordPanel 側が `progressRows` のステータスを見て編集モード/閲覧モードを自己判定する。
> 前提トランジション完了チェックはバックエンドが担当（バックエンドが前提完了時に自動で PREPARING に変える）ため、フロント側での前提チェックは不要。

---

```typescript
interface ProgressOverviewTabProps {
  rows: ProgressRow[];
  onGoToWork: (taskNo: number, transitionId: string) => void;
}
```

| Prop名 | 型 | 必須 | 説明 |
|--------|-----|------|------|
| `rows` | `ProgressRow[]` | ✅ | 親コンポーネントから渡される全行データ |
| `onGoToWork` | `(taskNo, transitionId) => void` | ✅ | 「記録」ボタン押下時：作業記録タブに遷移し、指定タスク+トランジションを表示。`not_started` 以外の全ステータスで使用 |

> ⚠️ **[2026-09-09 修正]**: 旧設計書では `onViewDetail`（「詳細確認」用）・`onStartWork`（「開始」用フォールバック）を記載していたが、ソース実装では **`onGoToWork` のみ** 使用。`onViewDetail`・`onStartWork` は実装に存在しない。

---

## 4. データ型定義（`@/types/progress.ts`）

### 4.1. ProgressRow

```typescript
interface ProgressRow {
  rowKey: string;                              // テーブルキー（一意な値）
  taskNo: number;                              // タスク番号
  methodId: string;                            // メソッドID
  methodName?: string;                         // メソッド名（未設定時は methodId）
  transitionId: string;                        // トランジションID
  transitionName?: string;                     // トランジション名（未設定時は transitionId）
  status: 'not_started' | 'preparing' | 'ready' | 'in_progress' | 'on_hold' | 'completed' | 'issue';
  hasRecord: boolean;                          // 記録済みプロパティが1件以上ある場合 true
  materialRecorded?: number;                   // Material 記録済み件数
  materialTotal?: number;                      // Material 合計件数
  conditionRecorded?: number;                  // Condition 記録済み件数
  conditionTotal?: number;                     // Condition 合計件数
  resultRecorded?: number;                     // Result 記録済み件数
  resultTotal?: number;                        // Result 合計件数
  issueCount?: number;                         // 問題報告数
  order?: number;                              // 表示順序（省略時は 0 として扱う）
  prerequisiteTransitionIds?: string[];        // 前提トランジションIDの配列
}
```

### 4.2. ProgressOverviewTabProps

上記セクション 3 を参照。

---

## 5. State 定義

| State名 | 型 | 初期値 | 説明 |
|---------|-----|--------|------|
| `filterTaskNo` | `number \| null` | `null` | タスクNo フィルタ選択値 |
| `filterStatus` | `ProgressRow['status'] \| null` | `null` | ステータスフィルタ選択値 |
| `filterMethodId` | `string \| null` | `null` | メソッドIDフィルタ選択値 |
| `filterTransitionId` | `string \| null` | `null` | トランジションIDフィルタ選択値 |
| `viewMode` | `'list' \| 'flow'` | `'list'` | 表示モード（リスト表示 / フロー図表示） |
| `flowTabKey` | `string \| null` | `null` | フロー図モードで選択中のタブキー（`${methodId}__${taskNo}` 形式） |

---

## 6. サブコンポーネント

### 6.1. SummaryCard

全体進捗サマリーを表示するカード（`rows` を受け取って自動計算）。

**表示内容：**

| 要素 | 説明 |
|------|------|
| 全体進捗バー | 完了件数 / 総件数 のパーセント表示（Progress コンポーネント）|
| 進捗率テキスト | `N%`（完了100%で緑色、それ以外は青色）|
| タスク完了数 | `タスク M/N 完了`（全トランジションが completed のタスクをカウント）|
| ステータス別件数 | 未着手・作業中・完了 件数（Statistic コンポーネント）。`preparing`/`ready` は個別表示なし |
| 問題あり件数 | issue ステータス行が1件以上ある場合のみ表示（赤色）|
| 問題報告件数 | `issueCount` の合計（1件以上ある場合のみ表示）|

### 6.2. FilterBar

4種類のフィルタを横並びで表示するバー。

| フィルタ | プレースホルダー | 幅 | 説明 |
|---------|-------------|-----|------|
| メソッド名 | `メソッド名` | 140px以上 | rows から重複排除して選択肢を生成 |
| タスクNo | `タスクNo` | 100px | `#N` 形式で表示 |
| トランジション名 | `トランジション名` | 160px以上 | メソッド選択時はそのメソッド内に絞り込み |
| ステータス | `ステータス` | 120px | 5ステータスから選択（`not_started`・`in_progress`・`on_hold`・`completed`・`issue`）。`preparing`・`ready` はフィルター選択肢に含まれない |

メソッドフィルタ変更時、トランジションフィルタは自動リセットされる。

---

## 7. テーブルカラム定義

### 7.1. 共通ベース列

| カラム | データキー | 幅 | 説明 |
|--------|-----------|-----|------|
| メソッド名 | `methodId` | 160px | `methodName` または `methodId` を表示。Tooltip あり |
| タスクNo | `taskNo` | 80px | `#N` 形式で中央寄せ表示 |
| トランジション名 | `transitionId` | 180px | `transitionName` または `transitionId` を表示。前提がある場合は 🔒 アイコン（Tooltip付き）|
| ステータス | `status` | 160px | ステータスアイコン + Tag で表示（後述）|

### 7.2. 進捗列（xl: 1200px 以上）3列独立表示

| カラム | 幅 | バー色 |
|--------|----|--------|
| Material | 130px | `#1677ff`（青）|
| Condition | 130px | `#52c41a`（緑）|
| Result | 130px | `#fa8c16`（橙）|

各列: `Progress（showInfo: false）+ rec/tot テキスト`。合計データが0件の場合は `—` を表示。

### 7.3. 進捗列（xl 未満）1列まとめ表示

| カラム | 幅 | 内容 |
|--------|----|------|
| 進捗 | 150px | `M rec/tot · C rec/tot · R rec/tot` をテキスト表示。各ラベルは色付き（M=青・C=緑・R=橙）。全て0の場合は `—` を表示 |

### 7.4. 末尾共通列

| カラム | データキー | 幅 | 説明 |
|--------|-----------|-----|------|
| 問題 | `issueCount` | 60px | 1件以上: 赤色 Badge、0件: `—` |
| 操作 | — | 100px | ステータス別ボタン（後述）|

---

## 8. ステータス設定

| ステータス値 | 表示ラベル | Badge色 | アイコン |
|------------|---------|---------|---------| 
| `not_started` | 未着手 | default（グレー）| `MinusCircleOutlined`（グレー）|
| `preparing` | 準備中 | processing（青）| `SyncOutlined`（青）|
| `ready` | 準備完了 | cyan（シアン）| `CheckSquareOutlined`（シアン `#13c2c2`）|
| `in_progress` | 作業中 | processing（青）| なし |
| `on_hold` | 一時停止 | warning（橙）| `PauseCircleOutlined`（橙）|
| `completed` | 完了 | success（緑）| `CheckCircleOutlined`（緑）|
| `issue` | 問題あり | error（赤）| `ExclamationCircleOutlined`（赤）|
---

## 9. 操作ボタン仕様

> ⚠️ **[2026-09-09 全面修正]**: ソース実装（`renderAction` 関数）に合わせて修正。旧記述（「詳細確認」「作業へ」「再開」「開始」の4種類・`onViewDetail`・`onStartWork` 参照）は実装と乖離していたため削除。

ソース実装（`ProgressOverviewTab.tsx` L376〜384）：

```tsx
const renderAction = (_: unknown, r: ProgressRow) => (
  <Button
    size="small"
    disabled={r.status === 'not_started'}
    onClick={() => onGoToWork(r.taskNo, r.transitionId)}
  >
    {t('experimentWork.table.record')}
  </Button>
);
```

**全ステータス共通で「記録」（`t('experimentWork.table.record')`）ボタン1種類のみ。**

| ステータス | ボタンラベル | type | disabled | 押下時処理 |
|-----------|------------|------|----------|----------|
| `not_started` | 記録 | default | **true** | — |
| `preparing` | 記録 | default | false | `onGoToWork(taskNo, transitionId)` |
| `ready` | 記録 | default | false | `onGoToWork(taskNo, transitionId)` |
| `in_progress` | 記録 | default | false | `onGoToWork(taskNo, transitionId)` |
| `on_hold` | 記録 | default | false | `onGoToWork(taskNo, transitionId)` |
| `completed` | 記録 | default | false | `onGoToWork(taskNo, transitionId)` |
| `issue` | 記録 | default | false | `onGoToWork(taskNo, transitionId)` |

**設計方針（ソースコメントより）:**
- `not_started` 以外は全ステータス活性 → `onGoToWork` で WorkRecordPanel を開く
- WorkRecordPanel 側が `progressRows` のステータスを見て編集/閲覧モードを自己判定する
- **前提チェックはフロント側で行わない**: バックエンドが前提完了時に自動で PREPARING に変えるため

---

## 10. 前提チェックロジック

> ⚠️ **[2026-09-09 修正]**: フロント側の前提チェック関数（`canAccessTransition`）は**ソースに存在しない**。バックエンドが前提完了時に自動で PREPARING ステータスに変更するため、フロント側での前提チェック・disabled 制御は不要。  
> ただし `prerequisiteTransitionIds` が設定されているトランジション名の横には `LockOutlined`（黄）アイコン + Tooltip を表示する（UI上の情報提供のみ）。

```tsx
// トランジション名列のレンダリング（ProgressOverviewTab.tsx L414〜429）
const hasPrereqs = (record.prerequisiteTransitionIds?.length ?? 0) > 0;
{hasPrereqs && (
  <Tooltip title={t('experimentWork.table.prerequisiteLockTooltip', { ids: ... })}>
    <LockOutlined style={{ color: '#faad14', fontSize: 12 }} />
  </Tooltip>
)}
```

- 前提があるトランジションの場合: トランジション名横に `LockOutlined`（黄）アイコン + Tooltip を表示
- **「記録」ボタンの disabled 制御は `not_started` のみ**（前提有無は問わない）

## 11. 使用コンポーネント

### Ant Design コンポーネント

| コンポーネント | 用途 |
|-------------|------|
| `Table` | トランジション一覧テーブル |
| `Select` | フィルタバーの各セレクト |
| `Badge` | ステータス表示・問題件数表示 |
| `Button` | 操作ボタン（「記録」のみ）・表示モード切り替えボタン（2026-09-09 修正: 旧「開始・作業へ・再開・詳細確認」→「記録」のみに統一）|
| `Card` | サマリーカードのコンテナ |
| `Progress` | Material / Condition / Result 進捗バー |
| `Statistic` | サマリーカードの統計数値表示 |
| `Tabs` | フロー図モードのメソッド/タスク切り替えタブ |
| `Tag` | ステータスタグ |
| `Tooltip` | メソッド名・トランジション名の省略表示、前提未完了の説明 |
| `Flex` | 各所の横並びレイアウト |
| `Grid.useBreakpoint` | レスポンシブ幅検知（xl: 1200px 以上） |
| `Checkbox` | （インポート済み・現在未使用）|

### アイコン

| アイコン | 用途 |
|---------|------|
| `CheckCircleOutlined` | completed ステータスアイコン |
| `CheckSquareOutlined` | ready ステータスアイコン（シアン）|
| `ExclamationCircleOutlined` | issue ステータスアイコン・問題報告 Statistic prefix |
| `LockOutlined` | 前提あり（未完了）のトランジション名横に表示（黄色）|
| `MinusCircleOutlined` | not_started ステータスアイコン |
| `PartitionOutlined` | フロー図モード切り替えボタンアイコン |
| `PauseCircleOutlined` | on_hold ステータスアイコン |
| `SyncOutlined` | preparing ステータスアイコン |
| `UnorderedListOutlined` | リスト表示モード切り替えボタンアイコン |

---

## 12. 備考・注意事項

1. **APIデータ接続済み**: `ExperimentWorkerMenu` が `getWorkDetails` API を呼び出し、得られたデータを `rows` Props 経由で渡す。
2. **前提チェックのスコープ**: 前提チェックは「同一タスク内」のみ対象。異なるタスク間の依存関係は現時点では考慮しない。
3. **`Checkbox` インポート**: 現時点では未使用だが、将来の一括操作機能のために import 済み。
4. **フロー図モード**: `viewMode: 'list' | 'flow'` で切り替え可能。フロー図モードでは `TransitionFlowDiagram` コンポーネントを使用し、`rows` から `(methodId, taskNo)` のユニーク組み合わせをタブとして表示。フィルタバーはリストモード時のみ表示。フロー図モード切り替えボタン（`PartitionOutlined`）はフィルタバー右端に配置。
5. **`ready` ステータスの操作ボタン**: ソース実装では `ready` は `in_progress` と同様に「作業へ」（primary）→ `onGoToWork` を呼ぶ。設計上 `ready` を「開始」ボタンとする案があったが、実装では `in_progress` と同じ扱いに変更された（2026-08-27 確認）。

---

## 13. 変更履歴

| 日付 | バージョン | 変更内容 | 担当者 |
|------|-----------|----------|--------|
| 2026-09-09 | v3.1.0 | §2.1 レイアウト図・§5 状態遷移フロー表・§9 操作ボタン仕様・§3 Props定義・§10 前提チェックロジック・§11 Button用途説明を実装（`renderAction` 関数）に合わせて全面修正。ボタンは全ステータス共通で「記録」1種類のみ・`not_started` のみ disabled・`onViewDetail`/`onStartWork` は実装に存在しないことを明記。§13 変更履歴セクションの重複記述（2箇所）を1箇所に統合・削除 | Cline |

| 2026-08-27 | v3.1.0 | ソースコードとの照合に基づき修正（2026-08-27）：①§4 ProgressRow型定義に `rowKey`・`methodName`・`hasRecord`・`order`・`isRecorded` を追加、`progressRate` を削除。②§5 状態遷移フロー表の列名を修正、`ready`/`preparing` の操作ボタンをソース実装（「作業へ」→ `onGoToWork`）に合わせて修正。③§5 State定義に `viewMode`・`flowTabKey` を追加。④§6.1 SummaryCard に `preparing`/`ready` は個別表示なしの旨を追記。⑤§6.2 FilterBar のステータス選択肢に `preparing`/`ready` が含まれない旨を追記。⑥§8 ステータス設定の `ready` アイコンを `ClockCircleOutlined`（黄）→ `CheckSquareOutlined`（シアン）に修正。⑦§9 操作ボタン仕様の `ready`（「開始」→「作業へ」primary）・`preparing`（「指示確認」primary→「作業へ」default）を修正。⑧§11 使用コンポーネントに `Tabs` を追加、アイコンリストを更新（`ClockCircleOutlined` 削除・`CheckSquareOutlined`・`PartitionOutlined`・`UnorderedListOutlined` 追加）。⑨§12 備考にフロー図モード説明を追加 | Cline |
| 2026-08-26 | v3.0.0 | `preparing`（準備中）・`ready`（準備完了）ステータスを追加（§4 ProgressRow型定義・§5 状態遷移フロー表（新規）・§6 サマリーカード・§8 ステータス設定・§9 操作ボタン仕様）。APIデータ接続済みに更新。フェーズ記載を削除 | Cline |
| 2026-08-19 | v2.0.0 | 初版作成 | Development Team |