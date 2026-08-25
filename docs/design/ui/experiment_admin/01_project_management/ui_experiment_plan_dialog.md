# 実験計画詳細指示ダイアログ UI設計書

## メタデータ
- **画面名**: 実験計画詳細指示ダイアログ
- **物理名**: ExperimentPlanDialog.tsx
- **ファイルパス**: `frontend/src/components/project/ExperimentPlanDialog.tsx`
- **利用権限**: 実験管理者（experiment_admin）
- **作成日**: 2026-06-22
- **最終更新日**: 2026-08-20
- **担当者**: Development Team
- **バージョン**: 2.0.0

---

## 1. 画面概要

### 1.1. 目的

実験管理者が、プロジェクトの各メソッド・トランジションに対して**実験計画指示**を設定・保存するためのモーダルダイアログです。
想定値・担当者情報などを構造化して登録し、チェックアウト時に MAIML ファイルへ `supervisorDirective～` キーで反映されます。

### 1.2. アクセス権限

| ロール | アクセス |
|--------|---------|
| `experiment_admin` | ✅ 閲覧・編集可 |
| `system_admin` | ✅ 閲覧・編集可 |
| `experiment_worker` | ❌ アクセス不可（403） |

### 1.3. 主要機能

1. メソッドの全タスク分をタブで切り替えて実験計画を設定
2. 「全体」タブで共通値を設定し、各タスクNタブに継承する
3. 個別タスクでの値の上書き（overrideFlags で管理）
4. 「全体に戻す」ボタンで個別上書きをリセット
5. テンプレートフィールドへの想定値入力
6. 担当者・機器・オーナーの選択
7. 前提トランジション（依存関係）の設定

---

## 2. 画面レイアウト

### 2.1. 全体構成

```
┌──────────────────────────────────────────────────────────────────────┐
│ Modal (width: 1400px, top: 20)                                       │
│ Title: 📄 実験計画詳細指示  [メソッドセレクト▼]                      │
├───────────────────────────┬──────────────────────────────────────────┤
│ 左パネル（幅: 240px）      │ 右パネル                                  │
│                           │  [一括][タスク1][タスク2]...              │
│ トランジション一覧         │  [基本情報][テンプレート入力]              │
│ ┌──────────────────────┐  │  ────────────────────────────────────── │
│ │ ⠿ Transition1        │  │  基本情報タブ:                            │
│ │ ⠿ Transition2  ◉     │  │  【CreatorRef】                          │
│ │ ⠿ Transition3        │  │  [プルダウン ▼] [追加]                   │
│ └──────────────────────┘  │  ・creator_001  [×]                      │
│                           │                                          │
│ [↓ エクスポート]          │  【InstrumentRef】                        │
│ [↑ インポート]            │  [プルダウン ▼] [追加]                   │
│                           │                                          │
│                           │  【注意事項】                             │
│                           │  [タイプ選択 ▼] [追加]                   │
│                           │  ┌────────────────────────┐             │
│                           │  │ ⠿ [注意] テキスト [×]  │             │
│                           │  └────────────────────────┘             │
├───────────────────────────┴──────────────────────────────────────────┤
│                               [キャンセル] [保存]                     │
└──────────────────────────────────────────────────────────────────────┘
```

### 2.2. レイアウト定数

| 要素 | 値 |
|------|-----|
| Modal 幅 | `1400px` |
| Modal top | `20px` |
| 左パネル幅 | `240px` |
| 右パネル | 残り幅（Col 相当）|
| 外部タブ | 一括 + タスク1〜N |
| 内部タブ | 基本情報 / テンプレート入力（固定）|

---

## 3. コンポーネント Props 定義

```typescript
// @/types/experimentPlan に定義
interface ExperimentPlanDialogProps {
  open: boolean;
  projectId: string;
  methodId: string;
  taskNumbers: number[];
  creatorRefOptions?: { value: string; label: string }[];
  instrumentRefOptions?: { value: string; label: string }[];
  ownerRefOptions?: { value: string; label: string }[];
  methodTemplates?: TemplateDefinition[];
  onClose: () => void;
  onSave?: () => void;
  disabled?: boolean;
  allowMethodSelection?: boolean;
  methodOptions?: { id: string; name: string }[];
  onMethodChange?: (methodId: string) => void;
}
```

| Prop名 | 型 | デフォルト | 説明 |
|--------|-----|----------|------|
| `open` | `boolean` | — | ダイアログ表示/非表示（必須）|
| `projectId` | `string` | — | プロジェクトID（必須）|
| `methodId` | `string` | — | 対象メソッドID（必須）|
| `taskNumbers` | `number[]` | — | タスク番号配列（必須）。タブ生成・伝播に使用 |
| `creatorRefOptions` | `option[]` | `[]` | CreatorRef 選択肢（APIデータ優先）|
| `instrumentRefOptions` | `option[]` | `[]` | InstrumentRef 選択肢（APIデータ優先）|
| `ownerRefOptions` | `option[]` | `[]` | OwnerRef 選択肢（APIデータ優先）|
| `methodTemplates` | `TemplateDefinition[]` | `[]` | テンプレート定義（APIデータ優先）|
| `onClose` | `() => void` | — | キャンセル・閉じる時のコールバック（必須）|
| `onSave` | `() => void` | — | 保存成功後のコールバック |
| `disabled` | `boolean` | `false` | `true` の場合は全入力を無効化（参照専用）|
| `allowMethodSelection` | `boolean` | `false` | `true` の場合はヘッダーにメソッド選択セレクトを表示 |
| `methodOptions` | `{ id, name }[]` | `[]` | メソッド選択肢（allowMethodSelection=true 時に使用）|
| `onMethodChange` | `(id) => void` | — | メソッド変更時のコールバック |

---

## 4. State 定義

| State名 | 型 | 初期値 | 説明 |
|---------|-----|--------|------|
| `dialogData` | `PlanDialogData \| null` | `null` | APIから取得したダイアログ初期データ |
| `dialogDataLoading` | `boolean` | `false` | 初期データ取得中フラグ |
| `activeTab` | `string` | `TAB_KEY_ALL ('all')` | 現在アクティブなタブキー |
| `selectedTransitionId` | `string \| null` | `null` | 左パネルで選択中のトランジションID |
| `transitionOrder` | `TransitionOrderItem[]` | `[]` | DnD で設定したトランジション実行順序 |
| `tabDataMap` | `Record<tabKey, Record<transitionId, ExperimentPlanTabData>>` | `{}` | 二次元マップ（タブキー × トランジションID）|
| `isSaving` | `boolean` | `false` | 保存API呼び出し中フラグ |
| `pendingNoteType` | `NoteTypeValue \| undefined` | `undefined` | 注意事項追加時の選択タイプ |
| `innerTab` | `'basic' \| 'template'` | `'basic'` | 右パネル内部タブ |

---

## 5. データ型定義

### 5.1. ExperimentPlanTabData（`@/types/experimentPlan`）

```typescript
interface ExperimentPlanTabData {
  creatorRefs: string[];          // CreatorRef の UUID リスト
  instrumentRefs: string[];       // InstrumentRef の UUID リスト
  ownerRefs: string[];            // OwnerRef の UUID リスト
  notes: NoteItem[];              // 注意事項リスト
  templateValues: Record<string, string | number | boolean>;  // 想定値マップ
}
```

// 1タブ分のデータ
interface TabData {
  /** テンプレートごとの想定値 {templateId: {fieldKey: value}} */
  templateValues: Record<string, Record<string, string>>;
  /** 担当者UUID */
  assignee: string;
  /** 必要作成者UUIDリスト */
  requiredCreatorUUIDs: string[];
  /** 必要機器UUIDリスト */
  requiredInstrumentUUIDs: string[];
  /** 必要オーナーUUIDリスト */
  requiredOwnerUUIDs: string[];
}

### 5.3. TransitionOrderItem（`@/types/experimentPlanDialog`）

```typescript
interface TransitionOrderItem {
  id: string;                          // トランジションID
  order: number;                       // 実行順序（1〜N）
  prerequisiteTransitionIds: string[]; // 依存するトランジションIDリスト
}
```

### 5.4. InheritableField（`@/types/experimentPlanDialog`）

```typescript
type InheritableField = 'creatorRefs' | 'instrumentRefs' | 'ownerRefs' | 'notes' | 'templateValues';
```

### 5.5. PlanDialogData（`@/services/experimentPlanApiService`）

```typescript
interface PlanDialogData {
  transitions: TransitionRow[];                    // トランジション一覧
  templates: TemplateDefinition[];                 // テンプレート定義
  creatorRefs: { value: string; label: string }[]; // Creator 選択肢
  instrumentRefs: { value: string; label: string }[]; // Instrument 選択肢
  ownerRefs: { value: string; label: string }[];   // Owner 選択肢
}
```

---

## 6. タブ構成

### 6.1. 外部タブ（右パネル上部）

| タブキー | ラベル | 説明 |
|---------|--------|------|
| `TAB_KEY_ALL ('all')` | 一括 | 全トランジション共通設定。変更時は各タスクNタブに伝播 |
| `task-1` | タスク1 | タスク番号1の個別設定 |
| `task-N` | タスクN | `taskNumbers` の各番号に対応して動的生成 |

### 6.2. 内部タブ（右パネル下部）

| 状態 | 表示 | 条件 |
|------|------|------|
| 設定済み | タブ名 + ✓（緑）| 1件以上のデータが設定されている |
| 個別上書きあり | タブ名 + ✏（橙）| overrideFlags に1件以上trueがある |
| 未設定 | タブ名のみ | データなし |

---

## 6. 内部タブ

### 6.1. 基本情報タブ

```
┌────────────────────────────────────────────────────────────────┐
│ 基本情報                                                        │
│                                                                │
│ 担当者:      [担当者を選択 ▼]                                  │
│ 必要作成者:  [複数選択可 ▼]                                    │
│ 必要機器:    [複数選択可 ▼]                                    │
│ 必要オーナー: [複数選択可 ▼]                                   │
│                                                                │
│ ─── タスクNのみ表示 ─────────────────────────────────────── │
│ ○ 全体設定を使用  ○ このタスクで個別設定  [全体に戻す]       │
└────────────────────────────────────────────────────────────────┘
```

#### 6.1.1. 担当者選択

| 項目 | 値 |
|------|-----|
| コンポーネント | `Select`（Ant Design）|
| モード | `multiple`（複数選択） |
| データ取得元 | `dialogData.availableCreators` |
| プレースホルダー | 担当者を選択してください |

#### 6.1.2. 必要機器選択

| 項目 | 値 |
|------|-----|
| コンポーネント | `Select`（Ant Design）|
| モード | `multiple`（複数選択） |
| データ取得元 | `dialogData.availableInstruments` |
| プレースホルダー | 機器を選択してください |

#### 6.1.3. 継承制御（タスクNタブのみ表示）

| UI要素 | 説明 |
|--------|------|
| `全体設定を使用` ラジオ | overrideFlags を false にする |
| `このタスクで個別設定` ラジオ | overrideFlags を true にする |
| `全体に戻す` ボタン | overrideFlags を false にリセットし、全体タブの値で上書き |

---

## 7. 左パネル（トランジション一覧）

### 7.1. トランジション行

- `SortableTransitionRow` コンポーネントで描画
- `@dnd-kit/sortable` によるドラッグ&ドロップ並べ替え対応
- 選択中トランジションはハイライト表示（◉マーク相当）
- 行クリックで `selectedTransitionId` を更新（右パネルに内容を反映）

### 7.2. インポート/エクスポート

| ボタン | アイコン | 動作 |
|--------|---------|------|
| エクスポート | `ExportOutlined` | `tabDataMap` と `transitionOrder` を JSON でダウンロード |
| インポート | `ImportOutlined` | JSON ファイルを読み込み `tabDataMap` と `transitionOrder` に反映 |

### 7.3. DnD 並べ替えロジック

```
トランジション行をドラッグ
  ↓
handleDragEnd(event: DragEndEvent)
  ↓
canMoveToOrder() で依存関係チェック
  ↓
OK: moveTransitionWithSubtree() で transitionOrder を更新
NG: 移動をキャンセル（依存関係違反）
```

---

## 8. 右パネル

### 8.1. 基本情報タブ（innerTab === 'basic'）

`RefSection` コンポーネントを使用して各 Ref セクションを描画。

#### 8.1.1. CreatorRef / InstrumentRef / OwnerRef 共通仕様

| 項目 | 値 |
|------|-----|
| コンポーネント | `RefSection`（`./ExperimentPlanDialog/RefSection`）|
| 操作 | セレクトから選択して「追加」ボタン、追加済みアイテムの [×] で削除 |
| データ取得元 | `dialogData?.creatorRefs` など（APIデータ優先、なければ Props から取得）|

#### 8.1.2. 注意事項（NoteItem）

| 項目 | 値 |
|------|-----|
| 追加操作 | `NoteTypeValue` セレクトで種別を選択 → 「追加」ボタンで行追加 |
| 行並べ替え | `@dnd-kit/sortable` による DnD 対応 |
| 行削除 | `CloseOutlined` ボタン |
| 内容入力 | `Input.TextArea`（`autoSize={{ minRows: 1, maxRows: 4 }}`）|

**NoteType 種別リスト**:

| 種別キー | 表示名（NOTE_TYPE_LABELS）|
|---------|------------------------|
| `caution` | 注意 |
| `operationNote` | 操作メモ |
| `checkItem` | 確認項目 |
| `prohibitedAction` | 禁止事項 |
| `otherNotes` | その他 |

### 8.2. テンプレート入力タブ（innerTab === 'template'）

`TemplateInputPanel` コンポーネントを使用。

```
TemplateInputPanel
  ├── selectedTransitionId に紐づくテンプレートを filteredTemplates から取得
  ├── 各テンプレートフィールドの想定値を入力（InputNumber or Input）
  ├── outputTemplateIds（前工程結果 = 参照専用）のフィールドは disabled
  └── effectiveTemplateValues（参照専用フィールドは producer の値で上書き）を表示
```

**テンプレート表示ロジック**:
- 選択トランジションの `inputPlaceIds + outputPlaceIds` に紐づくテンプレートを表示
- `placeIds` が空の場合は全テンプレートを表示（フォールバック）
- `result` カテゴリかつ `inputPlaceIds` に紐づくテンプレートは参照専用（disabled）

---

## 9. 継承ロジック

### 9.1. 一括タブ変更時（各タスクNへの伝播）

```
一括タブ（TAB_KEY_ALL）でフィールドを変更
  ↓
updateCurrentTabData(field, updater) を呼び出し
  ↓
tabDataMap['all'][selectedTransitionId] を更新
  + 各タスクN の同じトランジションIDにも同じ値を伝播
  ↓
（field は InheritableField: creatorRefs / instrumentRefs / ownerRefs / notes / templateValues）
```

### 9.2. タスクNタブでの個別編集

タスクNタブで直接編集した場合は、そのタスクNのデータのみ更新され、一括タブには反映されない（一方向伝播）。

---

## 10. API連携

### 10.1. 使用APIエンドポイント

| API | メソッド | パス | 用途 |
|-----|---------|------|------|
| ダイアログ初期データ取得 | GET | `/api/v1/projects/:projectId/methods/:methodId/plan-dialog-data` | トランジション・テンプレート・Ref選択肢の一括取得 |
| 実験計画一覧取得 | GET | `/api/v1/projects/:projectId/experiment-plans?methodId=xxx` | 既存の保存データを取得して tabDataMap に復元 |
| 実験計画保存（UPSERT）| PUT | `/api/v1/projects/:projectId/experiment-plans/:methodId/:taskNo` | タスクN × 全トランジション分を保存 |

### 10.2. ダイアログオープン時のデータフロー

```
open が true に変化
  ↓
State リセット（activeTab='all', selectedTransitionId=null, 等）
  ↓
[1] getPlanDialogData(projectId, methodId)
    → transitions / templates / creatorRefs / instrumentRefs / ownerRefs を取得
    → dialogData ステートに保存
  ↓
[2] getExperimentPlans(projectId, methodId)
    → 既存の保存済み計画データを取得
    → experimentPlansToTabDataMap() で tabDataMap 形式に変換
  ↓
保存済みデータがある場合: tabDataMap をそのまま適用
保存済みデータがない場合: 全トランジション × デフォルト値で一括タブを初期化（buildDefaultTemplateValues）
```

### 10.3. 保存処理のデータフロー

```
[保存] ボタン押下
  ↓
全タブをループ（all タブは保存しない）
  for each taskNo in [1..N]:
    plannedValues を組み立て:
      - 基本情報（requiredCreatorUUIDs, requiredInstrumentUUIDs, etc.）
      - テンプレート値（templateValues）
    ↓
    PUT /experiment-plans/:methodId/:taskNo
  ↓
taskNumbers.forEach(taskNo => {
  upsertExperimentPlanToApi(projectId, methodId, taskNo, tabDataMap, transitionOrder)
})
  ↓
全タスク保存成功:
  → message.success('...')
  → onSave?.() コールバック
  → onClose() でダイアログを閉じる

失敗時:
  → message.error(t('experimentPlan.saveFailed'))
  ↓
isSaving = false
```

---

## 11. エラーハンドリング

| 項目 | バリデーション | エラーメッセージ |
|------|--------------|----------------|
| taskNo | 1以上の整数 | — （UI上は自動的に正しい番号が設定される） |
| templateValues のフィールド | number型の場合は数値形式 | 「数値を入力してください」 |

---

## 12. 子コンポーネント

| コンポーネント | ファイルパス | 説明 |
|------------|------------|------|
| `RefSection` | `./ExperimentPlanDialog/RefSection.tsx` | Creator / Instrument / Owner Ref の入力セクション |
| `SortableTransitionRow` | `./ExperimentPlanDialog/SortableTransitionRow.tsx` | DnD 対応トランジション行 |
| `TemplateInputPanel` | `./ExperimentPlanDialog/TemplateInputPanel.tsx` | テンプレートフィールドへの想定値入力パネル |

---

## 13. 使用コンポーネント

### Ant Design コンポーネント
- `Modal` - ダイアログコンテナ
- `Tabs` - 外部タブ（一括/タスクN）・内部タブ（基本情報/テンプレート入力）
- `Table` - トランジション一覧（左パネル）
- `Select` - NoteType・Ref 選択
- `Input.TextArea` - 注意事項内容入力
- `Button` - 保存・キャンセル・追加・削除・エクスポート・インポート
- `Card` - パネルコンテナ
- `Tag` - トランジション・テンプレート種別表示
- `Tooltip` - 長テキストホバー表示
- `Spin` - ローディング
- `Empty` - トランジション未選択 / データなし表示
- `Row` / `Col` - 左右レイアウト
- `Space` / `Divider` - 要素間隔・区切り
- `Typography.Text` - ラベルテキスト
- `App.useApp()` - `message` の取得

### @dnd-kit
- `DndContext` / `SortableContext` / `PointerSensor` / `KeyboardSensor` - DnD 基盤
- `useSensor` / `useSensors` - センサー設定
- `verticalListSortingStrategy` - 縦方向ソート

### アイコン
- `SaveOutlined` - 保存ボタン
- `CloseOutlined` - キャンセルボタン
- `UndoOutlined` - 全体に戻すボタン
- `CheckCircleOutlined` - 設定済みインジケーター
- `EditOutlined` - 個別上書きインジケーター

---

## 14. 関連ファイル

| ファイル | 説明 |
|---------|------|
| `@/types/experimentPlan.ts` | `ExperimentPlanDialogProps`, `ExperimentPlanTabData`, `NoteItem`, `NoteType` |
| `@/types/experimentPlanDialog.ts` | `TransitionRow`, `TransitionOrderItem`, `InheritableField`, `CustomPropValue` |
| `@/constants/experimentPlanConstants.ts` | `TAB_KEY_ALL` 定数 |
| `@/utils/experimentPlanHelpers.ts` | `createInitialTabData`, `buildDefaultTemplateValues`, `calculateSteps`, `canMoveToOrder`, `moveTransitionWithSubtree` |
| `@/services/experimentPlanApiService.ts` | `getPlanDialogData`, `getExperimentPlans`, `experimentPlansToTabDataMap`, `upsertExperimentPlanToApi` |

---

## 15. 変更履歴

| 日付 | 変更内容 | 担当者 |
|------|----------|--------|
| 2026-06-22 | 初版作成 | Cline |
| 2026-08-20 | アーキテクチャ変更に合わせて全面改訂（左右2分割レイアウト・DnDトランジション並べ替え・二次元 tabDataMap・JSON インポート/エクスポート・子コンポーネント追加）| Cline |

---

## 16. 備考・注意事項

1. **MAIMLへの書き込みタイミング**: 本ダイアログでの保存は `experiment_plan` テーブルへの保存のみ。MAIML への実際の反映はチェックアウト時に行われる。
2. **一括タブの保存**: 一括（`TAB_KEY_ALL`）タブのデータは保存 API への送信対象ではない。各タスクNタブに伝播された結果のみ保存される。
3. **参照専用テンプレート**: `result` カテゴリかつ前工程（inputPlaceIds に紐づく）テンプレートは、前工程の出力値として参照専用（disabled）になる。
4. **DnD 依存関係制約**: トランジションの並べ替えは `prerequisiteTransitionIds` による依存関係を尊重し、依存元より前に移動できないように制約される（`canMoveToOrder()` で判定）。
5. **APIデータ優先**: `creatorRefOptions` 等の Props は初期値として使われるが、`dialogData`（APIレスポンス）が存在する場合はそちらが優先される。
