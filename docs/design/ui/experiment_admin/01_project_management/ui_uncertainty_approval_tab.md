# 実験指示タブ UI設計書

> [!WARNING]
> **このドキュメントは現在のバージョンが古く、今後修正が予定されています。**
> テスト仕様書作成の参考資料には含めないでください。

## メタデータ
- **画面名**: 実験指示タブ
- **物理名**: ExperimentInstructionTab.tsx
- **ファイルパス**: `frontend/src/components/project/ExperimentInstructionTab.tsx`
- **利用権限**: 実験管理者（experiment_admin）
- **作成日**: 2026-08-14
- **最終更新日**: 2026-08-17
- **担当者**: Development Team
- **バージョン**: 1.1.0

> **注意**: 旧バージョン（v1.0.0）では物理名を `UncertaintyApprovalTab.tsx` と誤記していた。正しくは `ExperimentInstructionTab.tsx`。

---

## 1. 画面概要

### 1.1. 目的

プロジェクト管理画面内のタブコンポーネントとして、**実験指示の一覧表示・承認処理・NG処理**を提供します。
メソッド・タスク・トランジション・テンプレート単位の実験指示データを表示し、実験管理者がタスクの承認 / NG を実行します。

### 1.2. アクセス権限

| ロール | アクセス |
|--------|---------|
| `experiment_admin` | ✅ 閲覧・操作可 |
| `system_admin` | ✅ 閲覧・操作可 |
| `experiment_worker` | ❌ アクセス不可 |

### 1.3. 主要機能

1. 実験指示データの一覧表示（フィルタ・ソート・列選択対応）
2. フィルタバーによる絞り込み（タスクNo・メソッドID・トランジション名・テンプレート名・Key）
3. ツールバーの「承認処理」ボタンから承認 / NG 処理ダイアログを開く
4. 実験指示の編集（`実験指示を編集` ボタン）
5. ペトリネット表示（`ペトリネットを表示` ボタン）
6. 表示列の選択・切り替え（`列を選択` ボタン）
7. 承認処理後のデータリフレッシュ

---

## 2. 画面レイアウト

```
┌──────────────────────────────────────────────────────────────────────┐
│ 実験指示タブ（プロジェクト管理画面内）                                   │
│                                                                      │
│ ── フィルタバー ────────────────────────────────────────────────── │
│ 🔍 タスクNo [▼]  メソッドID [▼]  トランジション名 [▼]               │
│    テンプレート名 [▼]  Key [▼]                                       │
│                                                                      │
│ ── ツールバー ──────────────────────────────────────────────────── │
│ （左）列リセット テキスト                                             │
│ （右）[実験指示を編集] [ペトリネットを表示] [⚙ 列を選択▼] [承認処理] │
│                                                                      │
│ ── テーブル ────────────────────────────────────────────────────── │
│ メソッド名 | タスクNo | タスクステータス | トランジション名 |          │
│ テンプレート名 | 想定値 | 想定値平均 | 実績値 | 実績値平均 | 差分 |  │
│ 不確かさ基準名 | 不確かさ付与値 | 付与者 | 付与日時 | コメント        │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 3. コンポーネント Props 定義

```typescript
interface ExperimentInstructionTabProps {
  projectId: string;
}
```

| Prop名 | 型 | 必須 | 説明 |
|--------|-----|------|------|
| `projectId` | `string` | ✅ | プロジェクトID |

---

## 4. フィルタバー

| フィルタ | 対象カラム | 幅 |
|---------|-----------|-----|
| タスクNo | `taskNumber` | 70px |
| メソッドID | `methodId` | 200px |
| トランジション名 | `transitionId` | 160px |
| テンプレート名 | `templateName` | 190px |
| Key | `propKey` | 160px |

各フィルタは対象カラムのユニーク値から選択肢を生成する `Select`。

---

## 5. ツールバー

### 左側

| 要素 | 説明 |
|------|------|
| 列リセットテキスト | 選択列を既定に戻す操作（`experimentInstructionTab.toolbar.resetColumns`）|

### 右側（ボタン群）

| ボタン | ラベルキー | 説明 |
|--------|----------|------|
| 実験指示を編集 | `experimentInstructionTab.toolbar.edit` | 実験指示編集画面へ遷移 |
| ペトリネットを表示 | `experimentInstructionTab.toolbar.petriNet` | ペトリネット表示 |
| 列を選択 ▼ | `experimentInstructionTab.toolbar.selectColumns` | 表示列選択ドロップダウン（`SettingOutlined`）|
| 承認処理 | `experimentInstructionTab.toolbar.approval` | **承認 / NG 処理ダイアログを開く** |

---

## 6. テーブル列定義

### 固定表示列

| 列キー | 表示名（ラベルキー） | 幅 | 説明 |
|--------|---------------------|-----|------|
| `methodName` | `experimentInstructionTab.col.methodName` | 190px | メソッド名 |
| `taskNumber` | `experimentInstructionTab.col.taskNo` | — | タスクNo |
| `taskStatus` | `experimentInstructionTab.col.taskStatus` | 110px | タスクステータス（Tag表示）|
| `transitionName` | `experimentInstructionTab.col.transitionName` | 180px | トランジション名 |

### トグル可能列（列を選択で表示/非表示切り替え）

| 列キー | 表示名（ラベルキー） | 幅 |
|--------|---------------------|-----|
| `templateName` | `experimentInstructionTab.col.templateName` | 180px |
| `xsiType` | `experimentInstructionTab.col.xsiType` | 75px |
| `expected` | `experimentInstructionTab.col.expected` | 100px |
| `expectedAverage` | `experimentInstructionTab.col.expectedAverage` | 120px |
| `actual` | `experimentInstructionTab.col.actual` | 100px |
| `actualAverage` | `experimentInstructionTab.col.actualAverage` | 120px |
| `diff` | `experimentInstructionTab.col.diff` | 85px |
| `uncertaintyCriteriaName` | `experimentInstructionTab.col.uncertaintyCriteriaName` | 200px |
| `uncertaintyAssignedValue` | `experimentInstructionTab.col.uncertaintyAssignedValue` | 140px |
| `uncertaintyAssignedBy` | `experimentInstructionTab.col.uncertaintyAssignedBy` | 140px |
| `uncertaintyAssignedAt` | `experimentInstructionTab.col.uncertaintyAssignedAt` | 160px |
| `uncertaintyComment` | `experimentInstructionTab.col.uncertaintyComment` | 220px |

---

## 7. タスクステータス

| コード | 表示名（ラベルキー） | Tag色 |
|--------|---------------------|-------|
| `01` | `experimentInstruction.status.waiting` | default |
| `02` | `experimentInstruction.status.inProgress` | processing |
| `03` | `experimentInstruction.status.running` | processing |
| `04` | `experimentInstruction.status.reviewWaiting` | warning |
| `05` | `experimentInstruction.status.completed` | success |
| `06` | `experimentInstruction.status.ng` | error |

---

## 8. 承認処理ダイアログ（`承認処理` ボタン）

ツールバーの「承認処理」ボタンから開く `Modal`。承認・NG の両操作をこのダイアログから実施する。

```
┌────────────────────────────────────────────────────┐
│ Modal: 承認処理                                     │
├────────────────────────────────────────────────────┤
│ メソッド [選択 ▼ 幅180px]  タスクNo [選択 ▼ 幅90px]│
│                                                    │
│ 操作: ● 承認（緑）  ○ NG（赤）                    │
│                                                    │
│ （NG選択時のみ表示）                                │
│ NG理由 [TextArea 最大500文字]                       │
├────────────────────────────────────────────────────┤
│ [キャンセル]  [実行]（タスク未選択時 disabled）     │
└────────────────────────────────────────────────────┘
```

| 要素 | 説明 |
|------|------|
| メソッド選択 | `Select`（幅180px）|
| タスクNo選択 | `Select`（幅90px）|
| 処理選択 | `Radio.Group`：承認（緑）/ NG（赤）|
| NG理由入力 | `TextArea`（NG選択時のみ表示）最大500文字 |
| 実行ボタン | タスクKey未選択時は disabled |

---

## 9. 備考・注意事項

1. **旧設計書との差異**: v1.0.0では `UncertaintyApprovalTab.tsx` をソースとして誤認していた。正しくは `ExperimentInstructionTab.tsx`。
2. **列の表示/非表示**: `TOGGLEABLE_COLUMN_KEYS_AND_WIDTHS` 定数で管理。列リセットで既定値に戻る。
3. **不確かさ基準タイプ**: `qualitative`（定性・緑Tag）/ `quantitative`（定量・青Tag）で色分け表示。
4. **承認・NG操作**: ツールバーの「承認処理」ボタンから開くダイアログで一元的に実施する。

---

## 10. 変更履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|---------|
| 1.0.0 | 2026-08-14 | 初版作成（ソースを `UncertaintyApprovalTab.tsx` と誤認）|
| 1.1.0 | 2026-08-17 | 画面名を「実験指示タブ」に修正。ソースを `ExperimentInstructionTab.tsx` に訂正。承認・NG操作は「承認処理」ダイアログに統一。画面レイアウト・Props・フィルタ・ツールバー・テーブル列を実装に合わせて全面更新 |
