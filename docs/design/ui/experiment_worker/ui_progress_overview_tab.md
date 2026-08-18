# 全体進捗タブ UI設計書

## メタデータ
- **画面名**: 全体進捗タブ
- **物理名**: ProgressOverviewTab.tsx
- **ファイルパス**: `frontend/src/components/ExperimentWorker/ProgressOverviewTab.tsx`
- **利用権限**: 実験作業者（experiment_worker）
- **作成日**: 2026-06-22
- **最終更新日**: 2026-06-22
- **担当者**: Development Team
- **バージョン**: 1.0.0

---

## 1. 画面概要

### 1.1. 目的

実験作業者（Worker）が、プロジェクト内の全タスクの進捗状況を一覧で確認し、**前提条件（依存関係）を把握しながら作業対象を選択**するためのタブコンポーネントです。
実験作業者メイン画面（`ExperimentWorkerMenu.tsx`）のタブの1つとして表示されます。

旧来の `ProgressCheckTab` / `ProgressCheckTable` を置き換えたコンポーネントです。

### 1.2. アクセス権限

| ロール | アクセス |
|--------|---------|
| `experiment_worker` | ✅ 閲覧・操作可 |
| `experiment_admin` | ✅ 閲覧可（読み取り専用） |

### 1.3. 主要機能

1. メソッド選択ドロップダウンで対象メソッドを絞り込み
2. タスク一覧テーブルの表示（タスク名・ステータス・前提タスク・担当者）
3. 前提タスク（`prerequisite_transition_ids`）の依存関係表示
4. 「作業へ」ボタンで作業記録タブへ遷移・対象トランジション自動選択
5. スキップ可能なタスクの表示（前提タスク未完了時）

### 1.4. ProgressCheckTab との違い

| 項目 | ProgressCheckTab | ProgressOverviewTab |
|------|-----------------|---------------------|
| 前提タスク表示 | なし | あり（新機能） |
| スキップ機能 | なし | あり（新機能） |
| 「作業へ」ボタン | なし | あり（新機能） |
| データ取得元 | — | `GET /progress/projects/:projectName/worker-tasks` |

---

## 2. 画面レイアウト

### 2.1. 全体構成

```
┌──────────────────────────────────────────────────────────────────┐
│ 全体進捗タブ（ExperimentWorkerMenu > Tab「全体進捗」）             │
├──────────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ ツールバー                                                   │  │
│ │  メソッド: [メソッド選択 ▼]                                  │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ タスク一覧テーブル                                           │  │
│ ├────────┬──────────┬──────────────┬────────┬──────────────┤  │
│ │タスク番号│ タスク名  │ 前提タスク    │ 担当者  │ 操作         │  │
│ ├────────┼──────────┼──────────────┼────────┼──────────────┤  │
│ │   1    │ 原料調製  │ —            │ 田中   │ [作業へ]     │  │
│ ├────────┼──────────┼──────────────┼────────┼──────────────┤  │
│ │   2    │ 合成反応  │ タスク1 ✅    │ 鈴木   │ [作業へ]     │  │
│ ├────────┼──────────┼──────────────┼────────┼──────────────┤  │
│ │   3    │ 精製処理  │ タスク2 ⏳    │ 田中   │ [スキップ]   │  │
│ └────────┴──────────┴──────────────┴────────┴──────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2. レイアウト定数

| 要素 | 値 | 説明 |
|------|-----|------|
| テーブル幅 | 100%（親コンテナに追従）| — |

---

## 3. コンポーネント Props 定義

```typescript
interface ProgressOverviewTabProps {
  /** プロジェクトID（project_name） */
  projectId: string;
  /** 作業記録タブへ遷移するコールバック（タブインデックスを渡す） */
  onNavigateToWorkRecord: (transitionId: string) => void;
}
```

| Prop名 | 型 | 必須 | 説明 |
|--------|-----|------|------|
| `projectId` | `string` | ✅ | プロジェクトID |
| `onNavigateToWorkRecord` | `(transitionId: string) => void` | ✅ | 作業記録タブへの遷移コールバック。対象トランジションIDを渡す |

---

## 4. State 定義

| State名 | 型 | 初期値 | 説明 |
|---------|-----|--------|------|
| `selectedMethodId` | `string \| null` | `null` | 選択中のメソッドID |
| `methods` | `MethodOption[]` | `[]` | メソッド選択肢リスト |
| `tasks` | `WorkerTaskOverview[]` | `[]` | タスク一覧データ |
| `isLoading` | `boolean` | `false` | データ取得中フラグ |

```typescript
interface MethodOption {
  methodId: string;
  methodName: string;
}
```

---

## 5. データ型定義

```typescript
/** タスク一覧の表示データ */
interface WorkerTaskOverview {
  taskNo: number;
  taskName: string;
  transitionId: string;
  taskStatus: string;            // task_status コードマスタ値
  assignee: string;              // 担当者名
  prerequisiteTransitionIds: string[];  // 前提トランジションIDリスト
  prerequisiteTasks: PrerequisiteTaskInfo[];  // 前提タスク情報（表示用）
  canSkip: boolean;              // スキップ可能かどうか
}

/** 前提タスク情報 */
interface PrerequisiteTaskInfo {
  transitionId: string;
  taskNo: number;
  taskName: string;
  taskStatus: string;    // 前提タスクのステータス
  isCompleted: boolean;  // 完了しているか
}
```

---

## 6. テーブルカラム定義

| カラム | データキー | 幅 | 説明 |
|--------|-----------|-----|------|
| タスク番号 | `taskNo` | 80px | 1〜N の整数 |
| タスク名 | `taskName` | 200px | トランジション名 |
| ステータス | `taskStatus` | 130px | バッジ表示 |
| 前提タスク | `prerequisiteTasks` | 200px | 前提タスクリスト（後述） |
| 担当者 | `assignee` | 120px | 担当者名 |
| 操作 | — | 120px | 「作業へ」または「スキップ」ボタン |

### 6.1. ステータスバッジ

| ステータスコード | 表示名 | Badge色 |
|---------------|--------|---------|
| `01` | 未実施 | gray |
| `02` | 作業中 | blue |
| `03` | 完了 | cyan |
| `04` | 確認中 | orange |
| `05` | レビュー待ち | geekblue |
| `06` | NG | red |
| `07` | 承認済み | green |

### 6.2. 前提タスク列の表示

前提タスクが複数ある場合は縦に並べて表示する。

```
前提タスクあり（全て完了）:
  タスク1 ✅

前提タスクあり（一部未完了）:
  タスク1 ✅
  タスク2 ⏳

前提タスクなし:
  —
```

**前提タスクの状態アイコン**:

| 状態 | アイコン | 色 |
|------|---------|-----|
| 完了（status: `03` 以上） | ✅ | 緑 |
| 未完了 | ⏳ | 橙 |

---

## 7. 操作ボタン仕様

### 7.1. 「作業へ」ボタン

| 項目 | 値 |
|------|-----|
| ラベル | 「作業へ」 |
| type | `primary` |
| アイコン | `ArrowRightOutlined` |
| 表示条件 | `canSkip === false`（前提タスクが全て完了 or 前提タスクなし） |
| 押下時 | `onNavigateToWorkRecord(transitionId)` を呼び出し |

### 7.2. 「スキップ」ボタン

| 項目 | 値 |
|------|-----|
| ラベル | 「スキップ」 |
| type | `default`（warning） |
| アイコン | `FastForwardOutlined` |
| 表示条件 | `canSkip === true`（前提タスクが未完了） |
| 押下時 | 確認ダイアログ表示 → `onNavigateToWorkRecord(transitionId)` を呼び出し |

**スキップ確認ダイアログ**:
```
タイトル: スキップ確認
メッセージ: 前提タスクが未完了ですが、タスク[N]「[タスク名]」の作業を開始しますか？
ボタン: [キャンセル] [スキップして作業へ]
```

---

## 8. スキップ可能判定ロジック

```typescript
/**
 * タスクがスキップ可能かどうかを判定する
 * 前提タスクが存在し、かつその前提タスクのうち1つ以上が未完了の場合にスキップ可能
 */
const canSkip = (task: WorkerTaskOverview): boolean => {
  if (!task.prerequisiteTransitionIds?.length) return false;
  return task.prerequisiteTasks.some(prereq => !prereq.isCompleted);
};

/**
 * トランジションのステータスが完了かどうかを判定する
 * task_status が '03'（完了）以上の場合に完了とみなす
 */
const isTransitionCompleted = (taskStatus: string): boolean => {
  const completedStatuses = ['03', '04', '05', '06', '07'];
  return completedStatuses.includes(taskStatus);
};
```

---

## 9. 「作業へ」ボタン押下時の遷移仕様

```
[作業へ] / [スキップして作業へ] 押下
  ↓
onNavigateToWorkRecord(transitionId) コールバック呼び出し
  ↓
ExperimentWorkerMenu 側で処理:
  1. タブを「作業記録」タブに切り替え
  2. WorkRecordPanel の selectedTransitionId を transitionId に設定
  3. WorkRecordPanel がデータを自動取得・表示
```

---

## 10. API連携

### 10.1. 使用APIエンドポイント

| API | メソッド | パス | 用途 |
|-----|---------|------|------|
| メソッド一覧取得 | GET | `/api/v1/projects/:projectId/methods` | メソッド選択肢の取得 |
| ワーカータスク一覧取得 | GET | `/api/v1/progress/projects/:projectName/worker-tasks` | タスク一覧データの取得 |

### 10.2. データ取得フロー

```
コンポーネントマウント時
  ↓
[1] GET /api/v1/projects/:projectId/methods
  → methods リストを取得
  → 先頭メソッドを自動選択
  ↓
メソッド選択変更時
  ↓
[2] GET /api/v1/progress/projects/:projectName/worker-tasks?methodId=xxx
  → tasks データを取得
  → prerequisiteTransitionIds から前提タスク情報を解決
  → canSkip フラグを計算
  ↓
テーブル表示
```

---

## 11. エラーハンドリング

| エラー | 表示方法 | メッセージ |
|--------|---------|----------|
| メソッド一覧取得失敗 | `message.error()` | 「メソッド一覧の取得に失敗しました」 |
| タスク一覧取得失敗 | `message.error()` | 「タスク一覧の取得に失敗しました」 |
| タスクが0件 | テーブルに `Empty` コンポーネント | 「タスクがありません」 |

---

## 12. 使用コンポーネント

### Ant Design コンポーネント
- `Table` - タスク一覧テーブル
- `Select` - メソッド選択
- `Badge` - ステータスバッジ
- `Button` - 作業へ・スキップボタン
- `Modal.confirm` - スキップ確認ダイアログ
- `Tag` - 前提タスク状態表示
- `Space` - 要素間隔制御
- `Typography.Text` - ラベルテキスト
- `Spin` - ロード中スピナー
- `Empty` - データなし表示
- `message` - エラートースト
- `Tooltip` - 前提タスク詳細ホバー表示

### アイコン
- `ArrowRightOutlined` - 「作業へ」ボタン
- `FastForwardOutlined` - 「スキップ」ボタン
- `CheckCircleFilled` - 前提タスク完了アイコン
- `ClockCircleOutlined` - 前提タスク未完了アイコン

---

## 13. 備考・注意事項

1. **前提タスク情報の解決**: `prerequisiteTransitionIds`（transitionId のリスト）から `tasks` の中で対応するタスク情報を検索して `prerequisiteTasks` を構成する。APIは transitionId のみを返すため、フロントエンド側で解決する。
2. **承認依頼ボタンとの関係**: 旧 `ProgressCheckTab` にあった「承認依頼」ボタンは本コンポーネントには含まない。承認依頼機能は `ExperimentWorkerMenu` のプロジェクト選択エリアに残る。
3. **旧コンポーネントの廃止**: `ProgressCheckTab.tsx` / `ProgressCheckTable.tsx` は本コンポーネントで置き換えられる。
