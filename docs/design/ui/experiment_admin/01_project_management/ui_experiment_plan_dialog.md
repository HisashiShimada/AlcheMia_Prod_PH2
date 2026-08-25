# 実験計画ダイアログ UI設計書

## メタデータ
- **画面名**: 実験計画ダイアログ
- **物理名**: ExperimentPlanDialog.tsx
- **ファイルパス**: `frontend/src/components/project/ExperimentPlanDialog.tsx`
- **利用権限**: 実験管理者（experiment_admin）
- **作成日**: 2026-06-22
- **最終更新日**: 2026-06-22
- **担当者**: Development Team
- **バージョン**: 1.0.0

---

## 1. 画面概要

### 1.1. 目的

実験管理者（Manager）が、プロジェクトの各メソッド・タスクに対して**実験計画指示**を設定・保存するためのモーダルダイアログです。
想定値・担当者情報などを構造化して登録し、チェックアウト時に MAIML ファイルへ `mgr-instruction:` プレフィックスで反映されます。

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
┌─────────────────────────────────────────────────────────────────┐
│ Modal (width: 1400px, top: 20)                                  │
│ ┌───────────────────────────────────────────────────────────┐  │
│ │ Title: 実験計画指示 - [メソッド名]                         │  │
│ ├───────────────────────────────────────────────────────────┤  │
│ │ Body:                                                      │  │
│ │                                                            │  │
│ │ ┌─────────────────────────────────────────────────────┐   │  │
│ │ │ 外部タブバー                                         │   │  │
│ │ │  [全体] [タスク1] [タスク2] ... [タスクN]           │   │  │
│ │ ├─────────────────────────────────────────────────────┤   │  │
│ │ │ タブコンテンツ                                        │   │  │
│ │ │ ┌───────────────────────────────────────────────┐   │   │  │
│ │ │ │ 内部タブバー                                   │   │   │  │
│ │ │ │  [基本情報] [テンプレート入力]                 │   │   │  │
│ │ │ ├───────────────────────────────────────────────┤   │   │  │
│ │ │ │                                               │   │   │  │
│ │ │ │  基本情報タブ / テンプレート入力タブ           │   │   │  │
│ │ │ │                                               │   │   │  │
│ │ │ └───────────────────────────────────────────────┘   │   │  │
│ │ └─────────────────────────────────────────────────────┘   │  │
│ │                                                            │  │
│ ├───────────────────────────────────────────────────────────┤  │
│ │ Footer: [キャンセル]                    [保存] ボタン      │  │
│ └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2. レイアウト定数

| 要素 | 値 | 説明 |
|------|-----|------|
| Modal 幅 | 1400px | ダイアログ全体幅 |
| Modal top | 20px | 上端マージン |
| 外部タブ | 全体 + タスク1〜N | メソッドのタスク数に応じて動的生成 |
| 内部タブ | 2タブ固定 | 「基本情報」「テンプレート入力」 |

---

## 3. コンポーネント Props 定義

```typescript
interface ExperimentPlanDialogProps {
  /** ダイアログの表示状態 */
  open: boolean;
  /** 閉じる時のコールバック */
  onClose: () => void;
  /** プロジェクトID（project_name） */
  projectId: string;
  /** メソッドID */
  methodId: string;
  /** メソッド名（タイトル表示用） */
  methodName: string;
}
```

| Prop名 | 型 | 必須 | 説明 |
|--------|-----|------|------|
| `open` | `boolean` | ✅ | ダイアログ表示/非表示 |
| `onClose` | `() => void` | ✅ | キャンセル・保存後の閉じるコールバック |
| `projectId` | `string` | ✅ | プロジェクトID（project_name） |
| `methodId` | `string` | ✅ | 対象メソッドのID |
| `methodName` | `string` | ✅ | タイトル表示用メソッド名 |

---

## 4. State 構造

```typescript
// 外部タブのキー（全体 or タスク番号）
type TabKey = 'all' | `task-${number}`;

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

// 上書きフラグ（全体→タスクN継承管理）
interface OverrideFlags {
  [taskNumber: number]: {
    [fieldPath: string]: boolean; // true = 個別上書き中
  };
}

// ダイアログ初期データ（APIから取得）
interface PlanDialogData {
  methodInfo: {
    methodId: string;
    methodName: string;
    taskCount: number;
  };
  availableCreators: { uuid: string; name: string }[];
  availableInstruments: { uuid: string; name: string }[];
  availableOwners: { uuid: string; name: string }[];
  availableTransitions: {
    transitionId: string;
    name: string;
    taskNo: number;
    prerequisiteTransitionIds: string[];
  }[];
  templates: {
    templateId: string;
    templateName: string;
    templateType: 'material' | 'condition' | 'result';
    fields: { key: string; label: string; unit: string; type: string }[];
  }[];
  existingPlans: {
    taskNo: number;
    plannedValues: Record<string, Record<string, string | string[]>>;
    updatedAt: string;
  }[];
}
```

---

## 5. 外部タブ（タスク選択）

### 5.1. 構成

| タブキー | ラベル | 説明 |
|---------|--------|------|
| `all` | 全体 | 全タスク共通の設定値。変更時に各タスクNへ継承される |
| `task-1` | タスク1 | タスク番号1の個別設定 |
| `task-2` | タスク2 | タスク番号2の個別設定 |
| ... | ... | タスク数に応じて動的生成 |
| `task-N` | タスクN | タスク番号Nの個別設定 |

### 5.2. タブのインジケーター

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

### 6.2. テンプレート入力タブ

```
┌────────────────────────────────────────────────────────────────┐
│ テンプレート入力                                                 │
│                                                                │
│ テンプレート種別: [全て ▼]                                      │
│                                                                │
│ ┌────────────────────────────────────────────────────────┐   │
│ │ ▼ [反応条件] condition                                  │   │
│ │                                                        │   │
│ │  温度  [°C]  [       想定値入力       ]  [全体に戻す]  │   │
│ │  圧力  [MPa] [       想定値入力       ]  [全体に戻す]  │   │
│ │  時間  [h]   [       想定値入力       ]  [全体に戻す]  │   │
│ └────────────────────────────────────────────────────────┘   │
│ ┌────────────────────────────────────────────────────────┐   │
│ │ ▼ [反応結果] result                                     │   │
│ │                                                        │   │
│ │  収率  [%]   [       想定値入力       ]  [全体に戻す]  │   │
│ └────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────┘
```

#### 6.2.1. テンプレート種別フィルター

| 項目 | 値 |
|------|-----|
| コンポーネント | `Select`（Ant Design）|
| 選択肢 | 全て / material / condition / result |
| デフォルト | 「全て」 |

#### 6.2.2. フィールド入力

| 項目 | 値 |
|------|-----|
| コンポーネント | `InputNumber`（type=number）または `Input`（type=text）|
| 幅 | 200px |
| type 判定 | `field.type === 'number'` → `InputNumber`、その他 → `Input` |
| 単位表示 | `[unit]` を入力フィールド右側に表示（`addonAfter`） |

#### 6.2.3. フィールド継承制御（タスクNタブのみ）

各フィールド行の右端に「全体に戻す」ボタンを表示。
押下で該当フィールドの `overrideFlags` を false にリセットし、全体タブの値に戻す。

---

## 7. 継承ロジック仕様

### 7.1. 全体タブ変更時（全タスクへの反映）

```typescript
// 全体タブ（all）で値が変更された場合
const handleAllTabChange = (fieldPath: string, value: any) => {
  setTabData(prev => ({ ...prev, all: { ...prev.all, [fieldPath]: value } }));
  
  // overrideFlags が false のタスクにのみ反映
  Object.keys(tabData).filter(k => k !== 'all').forEach(taskKey => {
    const taskNum = parseInt(taskKey.replace('task-', ''));
    if (!overrideFlags[taskNum]?.[fieldPath]) {
      setTabData(prev => ({
        ...prev,
        [taskKey]: { ...prev[taskKey], [fieldPath]: value }
      }));
    }
  });
};
```

### 7.2. タスクNタブで個別編集時

```typescript
// タスクNタブでフィールドを変更した場合
const handleTaskTabChange = (taskNum: number, fieldPath: string, value: any) => {
  // 上書きフラグを立てる
  setOverrideFlags(prev => ({
    ...prev,
    [taskNum]: { ...prev[taskNum], [fieldPath]: true }
  }));
  setTabData(prev => ({
    ...prev,
    [`task-${taskNum}`]: { ...prev[`task-${taskNum}`], [fieldPath]: value }
  }));
};
```

### 7.3. 「全体に戻す」ボタン押下時

```typescript
const handleResetToAll = (taskNum: number, fieldPath: string) => {
  // 上書きフラグを解除
  setOverrideFlags(prev => ({
    ...prev,
    [taskNum]: { ...prev[taskNum], [fieldPath]: false }
  }));
  // 全体タブの値で上書き
  const allValue = tabData['all']?.[fieldPath];
  setTabData(prev => ({
    ...prev,
    [`task-${taskNum}`]: { ...prev[`task-${taskNum}`], [fieldPath]: allValue }
  }));
};
```

---

## 8. API連携

### 8.1. 使用APIエンドポイント

| API | メソッド | パス | 用途 |
|-----|---------|------|------|
| ダイアログ初期データ取得 | GET | `/api/v1/projects/:projectId/methods/:methodId/plan-dialog-data` | ダイアログオープン時の初期データ一括取得 |
| 実験計画一括取得 | GET | `/api/v1/projects/:projectId/experiment-plans?methodId=xxx` | 指定メソッドの全タスク計画取得 |
| 実験計画保存 | PUT | `/api/v1/projects/:projectId/experiment-plans/:methodId/:taskNo` | 1タスク分UPSERT保存 |

### 8.2. ダイアログオープン時のデータフロー

```
ダイアログオープン
  ↓
[1] GET /plan-dialog-data
  → methodInfo, availableCreators/Instruments/Owners
  → availableTransitions（依存関係含む）
  → templates（フィールド定義）
  → existingPlans（既存の保存データ）
  ↓
[2] existingPlans を各タブの state に復元
  → 各 taskNo の plannedValues を tabData[`task-${taskNo}`] に変換
  ↓
表示完了
```

### 8.3. 保存処理のデータフロー

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
全タスク保存成功後
  → ダイアログを閉じる（onClose()）
  → 成功トースト表示
  
失敗時:
  → エラーメッセージ表示（Modalで継続）
```

---

## 9. バリデーション仕様

| 項目 | バリデーション | エラーメッセージ |
|------|--------------|----------------|
| taskNo | 1以上の整数 | — （UI上は自動的に正しい番号が設定される） |
| templateValues のフィールド | number型の場合は数値形式 | 「数値を入力してください」 |

---

## 10. エラーハンドリング

| エラーコード | HTTPステータス | 表示方法 | メッセージ |
|------------|---------------|---------|----------|
| E6001 | 404 | `message.error()` | 「プロジェクトが見つかりません」 |
| E5015 | 403 | `message.error()` | 「この操作を実行する権限がありません」 |
| E4001 | 500 | `message.error()` | 「サーバーエラーが発生しました」 |
| E1003 | 400 | `message.error()` | 「入力内容に誤りがあります」 |

---

## 11. 使用コンポーネント

### Ant Design コンポーネント

- `Modal` - ダイアログコンテナ（width: 1400px, top: 20）
- `Tabs` - 外部タブ（タスク選択）・内部タブ（基本情報/テンプレート入力）
- `Form` - 入力フォーム
- `Input` / `Input.TextArea` - テキスト入力
- `InputNumber` - 数値入力
- `Select` - 担当者・機器・種別選択（モード: `multiple` 含む）
- `Radio.Group` / `Radio` - 継承制御（全体設定/個別設定）
- `Button` - 保存・キャンセル・削除・全体に戻す
- `Collapse` / `Panel` - テンプレートセクションの折りたたみ
- `Space` - 要素の間隔制御
- `Tag` - テンプレート種別バッジ
- `Spin` - ロード中スピナー
- `message` - 成功/エラートースト

### アイコン
- `SaveOutlined` - 保存ボタン
- `CloseOutlined` - キャンセルボタン
- `UndoOutlined` - 全体に戻すボタン
- `CheckCircleOutlined` - 設定済みインジケーター
- `EditOutlined` - 個別上書きインジケーター

---

## 12. 備考・注意事項

1. **MAIMLへの書き込みタイミング**: 本ダイアログでの保存は `experiment_plan` テーブルへの保存のみ。MAIML への実際の反映はチェックアウト時に `projectService.checkout()` で行われる。
2. **`all` タブの保存**: `all`（全体）タブのデータは保存 API への送信対象ではない。各タスクNタブに継承された結果のみ保存される。
3. **前提トランジション表示**: `availableTransitions[].prerequisiteTransitionIds` を参照し、依存関係を UI 上に表示する（本ダイアログでは読み取り専用表示）。
4. **既存データの復元**: ダイアログオープン時に `existingPlans` から各タブの state を復元する。復元後の `all` タブは各タスクタブの最大公約数的な値（または空）とする。
