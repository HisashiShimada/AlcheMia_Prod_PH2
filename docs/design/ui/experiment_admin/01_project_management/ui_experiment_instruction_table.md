# 実験指示テーブル UI設計書

## メタデータ
- **画面名**: 実験指示テーブル
- **物理名**: ExperimentInstructionTable.tsx
- **ファイルパス**: `frontend/src/components/project/ExperimentInstructionTable.tsx`
- **利用権限**: 実験管理者（experiment_admin）
- **作成日**: 2026-06-22
- **最終更新日**: 2026-06-22
- **担当者**: Development Team
- **バージョン**: 1.0.0

---

## 1. 画面概要

### 1.1. 目的

実験管理者（Manager）が、実験作業者の実験実施後の**実績値と想定値を対比確認**し、
**タスクの承認またはNG記録**を行うためのテーブルコンポーネントです。
`ExperimentInstructionTab` の子コンポーネントとして表示されます。

### 1.2. アクセス権限

| ロール | アクセス |
|--------|---------|
| `experiment_admin` | ✅ 閲覧・承認/NG操作可 |
| `system_admin` | ✅ 閲覧・承認/NG操作可 |
| `experiment_worker` | ❌ アクセス不可 |

### 1.3. 主要機能

1. タスク一覧を展開可能テーブルで表示（タスク番号・担当者・ステータス等）
2. 各タスク行を展開してトランジション別の想定値 vs 実績値を表示
3. タスク単位の承認ボタン
4. タスク単位のNGボタン（NG理由入力モーダル付き）
5. NG記録後の `review_result` 表示

---

## 2. 画面レイアウト

### 2.1. テーブル全体構成

```
┌────────────────────────────────────────────────────────────────────┐
│ テーブル（ExperimentInstructionTable）                               │
├───┬────────┬────────┬────────┬────────────────────┬──────────────┤
│ ▶ │タスク番号│ タスク名 │ 担当者  │ ステータス           │ 操作         │
├───┼────────┼────────┼────────┼────────────────────┼──────────────┤
│ ▼ │   1    │原料調製  │田中太郎 │ ● レビュー待ち       │[承認][NG]    │
│   └──────────────────────────────────────────────────────────────┤
│   │  展開行（トランジション別 想定値 vs 実績値）                     │
│   │  ┌────────┬────────────┬────────────┬──────────────────┐    │
│   │  │ テンプレ │ フィールド   │ 想定値      │ 実績値            │    │
│   │  ├────────┼────────────┼────────────┼──────────────────┤    │
│   │  │反応条件  │ 温度 [°C]  │ 25         │ 26.3 ⚠          │    │
│   │  │        │ 圧力 [MPa] │ 1.0        │ 1.0 ✓            │    │
│   │  └────────┴────────────┴────────────┴──────────────────┘    │
├───┼────────┼────────┼────────┼────────────────────┼──────────────┤
│ ▶ │   2    │合成反応  │鈴木花子 │ ● 作業中             │[承認][NG]    │
├───┼────────┼────────┼────────┼────────────────────┼──────────────┤
│ ▶ │   3    │精製処理  │田中太郎 │ ✅ 承認済み           │ —           │
└───┴────────┴────────┴────────┴────────────────────┴──────────────┘
```

### 2.2. NG理由入力モーダル

```
┌──────────────────────────────────────────────┐
│ Modal: NG記録 - タスク[N]                      │
│ ┌────────────────────────────────────────┐   │
│ │ NG理由:                                 │   │
│ │ ┌────────────────────────────────────┐ │   │
│ │ │ TextArea（必須）                    │ │   │
│ │ └────────────────────────────────────┘ │   │
│ └────────────────────────────────────────┘   │
│ [キャンセル]                     [NG登録]      │
└──────────────────────────────────────────────┘
```

---

## 3. コンポーネント Props 定義

```typescript
interface ExperimentInstructionTableProps {
  /** プロジェクトID（project_name） */
  projectId: string;
  /** 選択中のメソッドID */
  methodId: string | null;
  /** 承認/NG後にデータを再取得するコールバック */
  onRefresh?: () => void;
}
```

| Prop名 | 型 | 必須 | 説明 |
|--------|-----|------|------|
| `projectId` | `string` | ✅ | プロジェクトID |
| `methodId` | `string \| null` | ✅ | 選択中のメソッドID（null時はテーブル非表示） |
| `onRefresh` | `() => void` | — | 承認/NG後にデータを再取得するコールバック |

---

## 4. State 定義

| State名 | 型 | 初期値 | 説明 |
|---------|-----|--------|------|
| `instructions` | `ExperimentInstructionWithActuals[]` | `[]` | テーブル表示データ |
| `isLoading` | `boolean` | `false` | データ取得中フラグ |
| `expandedRowKeys` | `string[]` | `[]` | 展開中の行キーリスト |
| `isNgModalOpen` | `boolean` | `false` | NGモーダル表示状態 |
| `ngTargetTaskNo` | `number \| null` | `null` | NG対象のタスク番号 |
| `ngReason` | `string` | `''` | NG理由入力値 |
| `isSubmitting` | `boolean` | `false` | 承認/NG送信中フラグ |

---

## 5. データ型定義

```typescript
/** テーブル行データ（タスク単位） */
interface ExperimentInstructionWithActuals {
  taskNo: number;
  taskName: string;
  assignee: string;
  taskStatus: string; // コードマスタの task_status 値
  reviewResult: string | null; // NGの場合のレビュー結果
  reviewedAt: string | null;
  reviewUserName: string | null;
  transitions: TransitionInstruction[];
}

/** トランジション単位の指示データ */
interface TransitionInstruction {
  transitionId: string;
  transitionName: string;
  templates: TemplateInstruction[];
  notes: NoteItem[]; // mgr-instruction: から復元した注意事項
}

/** テンプレート単位の想定値・実績値 */
interface TemplateInstruction {
  templateId: string;
  templateName: string;
  templateType: 'material' | 'condition' | 'result';
  fields: FieldInstruction[];
}

/** フィールド単位の想定値・実績値 */
interface FieldInstruction {
  key: string;
  label: string;
  unit: string;
  expectedValue: string | null;  // 想定値（experiment_plan から）
  actualValue: string | null;    // 実績値（project_task_detail から）
  isDifferent: boolean;          // 想定値と実績値が乖離しているか
}

/** 注意事項アイテム */
interface NoteItem {
  type: 'caution' | 'operationNote' | 'checkItem' | 'prohibitedAction' | 'otherNotes';
  content: string;
}
```

---

## 6. テーブルカラム定義

### 6.1. メインテーブル（タスク一覧）

| カラム | データキー | 幅 | 説明 |
|--------|-----------|-----|------|
| 展開矢印 | — | 40px | 行展開/折りたたみ制御 |
| タスク番号 | `taskNo` | 80px | 1〜N の整数 |
| タスク名 | `taskName` | 200px | トランジション名 |
| 担当者 | `assignee` | 120px | 担当者名 |
| ステータス | `taskStatus` | 150px | バッジ表示（下記参照） |
| 操作 | — | 160px | 承認・NGボタン |

### 6.2. ステータスバッジ

| ステータスコード | 表示名 | Badge色 |
|---------------|--------|---------|
| `01` | 未実施 | gray |
| `02` | 作業中 | blue |
| `03` | 完了 | cyan |
| `04` | 確認中 | orange |
| `05` | レビュー待ち | geekblue |
| `06` | NG | red |
| `07` | 承認済み | green |

### 6.3. 展開行（トランジション別 想定値 vs 実績値）

展開行には対象タスクの全トランジション分のデータを縦に並べて表示する。

**トランジションごとのブロック構成**:
```
トランジション名（サブタイトル）
┌──────────┬─────────────┬──────────┬──────────────────┐
│ テンプレ  │ フィールド名  │ 想定値   │ 実績値            │
├──────────┼─────────────┼──────────┼──────────────────┤
│ 反応条件  │ 温度 [°C]   │ 25       │ 26.3 ⚠（橙色）  │
│          │ 圧力 [MPa]  │ 1.0      │ 1.0 ✓（緑色）   │
│ 反応結果  │ 収率 [%]    │ 85       │ 82.1 ⚠（橙色）  │
└──────────┴─────────────┴──────────┴──────────────────┘

注意事項:
  [注意] 保護具を着用すること
  [禁止事項] 加熱中の蓋開け禁止
```

**実績値の差異表示**:

| 条件 | アイコン | 色 |
|------|---------|-----|
| 想定値と一致（または許容範囲内） | ✓ | 緑（`#52c41a`） |
| 想定値と乖離あり | ⚠ | 橙（`#fa8c16`） |
| 実績値が未入力 | — | グレー |
| 想定値が未設定 | — | （差異表示なし） |

---

## 7. 操作ボタン仕様

### 7.1. 承認ボタン

| 項目 | 値 |
|------|-----|
| ラベル | 「承認」 |
| type | `primary` |
| アイコン | `CheckCircleOutlined` |
| 表示条件 | `taskStatus` が `05`（レビュー待ち）の場合のみ |
| 押下時 | 確認ダイアログ表示 → API呼び出し |

**確認ダイアログ**:
```
タイトル: 承認確認
メッセージ: タスク[N]「[タスク名]」を承認しますか？
ボタン: [キャンセル] [承認する]
```

### 7.2. NGボタン

| 項目 | 値 |
|------|-----|
| ラベル | 「NG」 |
| type | `default`（danger） |
| アイコン | `CloseCircleOutlined` |
| 表示条件 | `taskStatus` が `05`（レビュー待ち）の場合のみ |
| 押下時 | NGモーダル表示 |

**NGモーダル仕様**:

| 項目 | 値 |
|------|-----|
| タイトル | 「NG記録 - タスク[N]」 |
| NG理由入力 | `Input.TextArea`（必須、rows: 4） |
| 登録ボタン | type: danger、NG理由が空の場合 disabled |
| キャンセルボタン | モーダルを閉じる |

---

## 8. API連携

### 8.1. 使用APIエンドポイント

| API | メソッド | パス | 用途 |
|-----|---------|------|------|
| 実験指示一覧取得 | GET | `/api/v1/projects/:projectId/experiment-instructions?methodId=xxx` | テーブルデータ取得 |
| タスク承認 | POST | `/api/v1/projects/:projectId/experiment-instructions/:methodId/:taskNo/approve` | タスク承認処理 |
| タスクNG記録 | POST | `/api/v1/projects/:projectId/experiment-instructions/:methodId/:taskNo/ng` | タスクNG記録処理 |

### 8.2. 承認処理フロー

```
[承認] ボタン押下
  ↓
Modal.confirm 確認ダイアログ表示
  ↓
「承認する」押下
  ↓
isSubmitting = true
  ↓
POST /experiment-instructions/:methodId/:taskNo/approve
  ↓
成功時:
  → message.success("タスク[N]を承認しました")
  → データ再取得（テーブル更新）
  → onRefresh?() コールバック
  
失敗時:
  → message.error("承認処理に失敗しました")
  ↓
isSubmitting = false
```

### 8.3. NG記録処理フロー

```
[NG] ボタン押下
  ↓
NGモーダルオープン（ngTargetTaskNo に対象タスク番号をセット）
  ↓
NG理由を入力
  ↓
[NG登録] ボタン押下
  ↓
isSubmitting = true
  ↓
POST /experiment-instructions/:methodId/:taskNo/ng
  Body: { ngReason: "..." }
  ↓
成功時:
  → message.success("NG記録しました")
  → NGモーダルを閉じる
  → データ再取得（テーブル更新）
  → onRefresh?() コールバック
  
失敗時:
  → message.error("NG記録に失敗しました")
  ↓
isSubmitting = false
```

---

## 9. バリデーション仕様

| 項目 | バリデーション | エラー表示 |
|------|--------------|----------|
| NG理由 | 必須（1文字以上） | 「NG登録」ボタン disabled |

---

## 10. エラーハンドリング

| エラーコード | HTTPステータス | 表示方法 | メッセージ |
|------------|---------------|---------|----------|
| E6001 | 404 | `message.error()` | 「プロジェクトまたはタスクが見つかりません」 |
| E5015 | 403 | `message.error()` | 「この操作を実行する権限がありません」 |
| E4001 | 500 | `message.error()` | 「サーバーエラーが発生しました」 |
| データなし | — | テーブルに `Empty` | 「実験指示データがありません」 |

---

## 11. 使用コンポーネント

### Ant Design コンポーネント
- `Table` - メインテーブル（expandable 設定）
- `Modal` / `Modal.confirm` - NG入力モーダル・承認確認ダイアログ
- `Badge` - ステータスバッジ
- `Button` - 承認・NGボタン
- `Input.TextArea` - NG理由入力
- `Space` - ボタン間隔制御
- `Tag` - テンプレート種別・注意事項種別
- `Typography.Text` - 差異ハイライトテキスト
- `Tooltip` - 想定値/実績値の詳細ホバー表示
- `Spin` - ロード中スピナー
- `Empty` - データなし表示
- `message` - 成功/エラートースト

### アイコン
- `CheckCircleOutlined` - 承認ボタン
- `CloseCircleOutlined` - NGボタン
- `CheckOutlined` - 差異なし（緑）
- `WarningOutlined` - 差異あり（橙）
