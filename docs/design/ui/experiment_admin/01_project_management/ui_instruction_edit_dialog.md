# 指示編集ダイアログ UI仕様書

## メタデータ
- **画面名**: 指示編集ダイアログ（新規指示の追加 / 指示の編集 / 指示詳細）
- **物理名**: InstructionEditDialog.tsx
- **ファイルパス**: `frontend/src/components/project/InstructionEditDialog.tsx`
- **利用権限**: 実験管理者（experiment_admin）
- **作成日**: 2026-06-22
- **最終更新日**: 2026-08-20
- **担当者**: Development Team
- **バージョン**: 3.0.0

---

## 1. 画面概要

### 1.1. 目的

プロジェクト指示の新規作成・編集・詳細表示を行うモーダルダイアログです。
① 指示種別（必須）→ ② 指示対象（任意）→ ③ 指示内容（必須）の順で入力します。

指示対象を未入力にした場合は「プロジェクト全体指示（OVERALL）」として扱われます。
入力内容に応じて保存時に `granularity`（OVERALL / METHOD / TRANSITION / TASK）が自動判定されます。

### 1.2. 使用場面と開くボタン

| 開くボタン | 場所 | モード | ダイアログタイトル |
|-----------|------|--------|-----------------|
| 「プロジェクト指示」ボタン | タスク登録タブ | 新規作成（create）| 新規指示の追加 |
| 「編集」ボタン（未送信行）| プロジェクト指示タブ 一覧テーブル | 編集（edit）| 指示の編集 |
| 「詳細」ボタン（送信済み行）| プロジェクト指示タブ 一覧テーブル | 詳細表示（参照）| 指示詳細 |

### 1.3. アクセス権限

| ロール | アクセス |
|--------|---------|
| `experiment_admin` | ✅ 作成・編集・閲覧可 |
| `system_admin` | ✅ 作成・編集・閲覧可 |
| `experiment_worker` | ❌ アクセス不可 |

---

## 2. 画面構成

### 2.1. レイアウト構造

```
┌─────────────────────────────────────────────┐
│ 新規指示の追加 / 指示の編集 / 指示詳細    [×] │
├─────────────────────────────────────────────┤
│                                             │
│ 指示種別 *                                  │
│ ┌───────────────────────────────────────┐  │
│ │ 指示種別を選択してください ▼          │  │
│ └───────────────────────────────────────┘  │
│                                             │
│ 指示対象（任意・未入力=プロジェクト全体）     │
│ ┌───────────────────────────────────────┐  │
│ │ メソッドを選択 ▼                      │  │
│ └───────────────────────────────────────┘  │
│ ┌───────────────────────────────────────┐  │
│ │ トランジションを選択 ▼                │  │
│ └───────────────────────────────────────┘  │
│ ┌───────────────────────────────────────┐  │
│ │ タスクNoを選択 ▼                      │  │
│ └───────────────────────────────────────┘  │
│                                             │
│ 指示内容 *                                  │
│ ┌───────────────────────────────────────┐  │
│ │ TextArea (rows:6, maxLength:1000)     │  │
│ └───────────────────────────────────────┘  │
│ 0/1000                                      │
│                                             │
├─────────────────────────────────────────────┤
│ 詳細表示時:  [閉じる]                        │
│ 新規作成時:  [キャンセル] [続けて追加] [追加] │
│ 編集時:      [キャンセル]           [追加]   │
└─────────────────────────────────────────────┘
```

### 2.2. モーダル設定

| 項目 | 値 |
|------|-----|
| width | `700px` |
| `data-testid` | `instruction-edit-dialog` |

---

## 3. コンポーネント Props 定義

```typescript
interface InstructionEditDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  instruction?: InstructionData;
  tasks: TaskDetail[];
  availableMethods?: MethodInfo[];
  availableTransitions: TransitionInfo[];
  onClose: () => void;
  onSave: (instruction: InstructionData, keepDialogOpen?: boolean) => void;
  saveMode?: 'immediate' | 'local';
}
```

| Prop名 | 型 | デフォルト | 説明 |
|--------|-----|----------|------|
| `open` | `boolean` | — | ダイアログ表示/非表示（必須）|
| `mode` | `'create' \| 'edit'` | — | 新規作成 or 編集モード（必須）|
| `instruction` | `InstructionData?` | — | 編集対象の指示データ（編集モード時）|
| `tasks` | `TaskDetail[]` | — | タスク一覧（タスクNo選択肢の生成に使用）|
| `availableMethods` | `MethodInfo[]?` | — | メソッド一覧（指示対象のメソッド選択肢）|
| `availableTransitions` | `TransitionInfo[]` | — | トランジション一覧（指示対象のトランジション選択肢）|
| `onClose` | `() => void` | — | キャンセル・閉じる時のコールバック（必須）|
| `onSave` | `(instruction, keepDialogOpen?) => void` | — | 保存時のコールバック（必須）|
| `saveMode` | `'immediate' \| 'local'` | — | 保存モード（`immediate`: 即時DB保存、`local`: ローカル保存）|

---

## 4. State 定義

| State名 | 型 | 初期値 | 説明 |
|---------|-----|--------|------|
| `form` | `FormInstance` | — | Ant Design Form インスタンス |
| `selectedInstructionKey` | `string \| null` | `null` | 選択中の指示種別キー |
| `selectedMethodId` | `string` | `''` | 選択中のメソッドID |
| `selectedTransitionId` | `string` | `''` | 選択中のトランジションID |
| `selectedTaskNo` | `number \| undefined` | `undefined` | 選択中のタスク番号 |

---

## 5. 送信済み判定

```typescript
const isSentInstruction = instruction?.isSent === true;
```

- `isSent === true` の場合は**詳細表示モード**（全フィールド disabled）
- ダイアログタイトルが `t('instructionEditDialog.titleDetail')` に切り替わる
- フッターが「閉じる」ボタンのみになる

---

## 6. フォームフィールド

### 6.1. 指示種別（必須）

| 項目 | 値 |
|------|-----|
| コンポーネント | `Select` |
| `data-testid` | `instruction-key-select` |
| 選択肢 | `INSTRUCTION_KEY_LABELS` から動的生成（i18n: `instructionEditDialog.instructionKeyOptions.{value}`）|
| `allowClear` | あり |
| disabled 条件 | `isSentInstruction === true` |

バリデーション:
- 必須: `t('instructionEditDialog.instructionKeyRequired')`

### 6.2. 指示対象（任意）

未入力の場合はプロジェクト全体指示（OVERALL）として扱います。
メソッドを選択すると、そのメソッドに紐づくトランジション・タスクNoの選択肢が表示されます。

**メソッドID選択（常時表示）**

| 項目 | 値 |
|------|-----|
| コンポーネント | `Select` |
| `data-testid` | `instruction-method-select` |
| 選択肢 | `availableMethods` から動的生成（`m.displayName \|\| m.id`）|
| `allowClear` | あり |
| disabled 条件 | `isSentInstruction === true` |
| 変更時 | `selectedTransitionId` / `selectedTaskNo` をリセット |

**トランジションID選択（常時表示）**

| 項目 | 値 |
|------|-----|
| コンポーネント | `Select` |
| `data-testid` | `instruction-transition-select` |
| 選択肢 | `availableTransitions` のうち `methodId === selectedMethodId` に合致するものを表示 |
| `allowClear` | あり |
| disabled 条件 | `isSentInstruction === true \|\| !selectedMethodId`（メソッド未選択時は無効）|

**タスクNo選択（常時表示）**

| 項目 | 値 |
|------|-----|
| コンポーネント | `Select` |
| `data-testid` | `instruction-taskno-select` |
| 選択肢 | `tasks` のうち `methodId === selectedMethodId` に合致するものの試行回数（1〜N）|
| `allowClear` | あり |
| disabled 条件 | `isSentInstruction === true \|\| !selectedMethodId`（メソッド未選択時は無効）|

### 6.3. 指示内容（必須）

| 項目 | 値 |
|------|-----|
| コンポーネント | `Input.TextArea` |
| `rows` | 6 |
| `maxLength` | 1000 |
| `showCount` | あり |
| `data-testid` | `instruction-edit-dialog-content` |
| disabled 条件 | `isSentInstruction === true`（送信済み）|

**バリデーション:**
- 必須: `t('instructionEditDialog.contentRequired')`
- 最大1000文字: `t('instructionEditDialog.contentMaxLength')`

---

## 7. フッターボタン

### 7.1. 詳細表示モード（`isSentInstruction === true`）

| ボタン | ラベル | 動作 |
|--------|--------|------|
| 閉じる | `t('common.close')` | `handleCancel()` |

### 7.2. 新規作成・編集モード（`isSentInstruction === false`）

| ボタン | ラベル | 動作 | 表示条件 |
|--------|--------|------|---------|
| キャンセル | `t('common.cancel')` | `handleCancel()` | 常時 |
| 続けて追加 | `t('instructionEditDialog.saveAndContinueButton')` | `handleSaveAndContinue()` | `mode === 'create'` のみ |
| 追加 | `t('instructionEditDialog.saveButton')` | `handleSave()` | 常時 |

`data-testid`: `instruction-edit-dialog-save-button`（追加ボタン）

---

## 8. 保存ロジック

### 8.1. granularity 自動判定

```typescript
const calcEffectiveGranularity = () => {
  if (selectedTaskNo !== undefined)   return INSTRUCTION_GRANULARITY.TASK;
  if (selectedTransitionId)           return INSTRUCTION_GRANULARITY.TRANSITION;
  if (selectedMethodId)               return INSTRUCTION_GRANULARITY.METHOD;
  return INSTRUCTION_GRANULARITY.OVERALL;
};
```

| 入力状態 | granularity |
|---------|------------|
| `selectedTaskNo` あり | `TASK` |
| `selectedTransitionId` あり（taskNo なし）| `TRANSITION` |
| `selectedMethodId` のみ | `METHOD` |
| すべて空 | `OVERALL`（プロジェクト全体）|

### 8.2. 保存時に設定される値

```typescript
const instructionData: InstructionData = {
  id: instruction?.id || Date.now(),
  content: values.content.trim(),
  targetType: calcTargetType(effectiveGranularity),
  methodId: selectedMethodId || '',
  transitionId: selectedTransitionId || '',
  taskNumber: selectedTaskNo,
  instructionKey: selectedInstructionKey ?? INSTRUCTION_KEY.GENERAL,
  granularity: effectiveGranularity,
};
```

### 8.3. 続けて追加（keepDialogOpen）

「続けて追加」ボタン押下時:
- `onSave(instructionData, true)` を呼び出し
- ダイアログを閉じずにフォームをリセット（全フィールドを初期化）

### 8.4. 通常保存

「追加」ボタン押下時:
- `onSave(instructionData, false)` を呼び出し
- 親コンポーネントがダイアログを閉じる

---

## 9. 初期化処理

```
open が true に変化
  ↓
mode === 'edit' && instruction あり:
  setSelectedInstructionKey(instruction.instructionKey ?? null)
  setSelectedMethodId(instruction.methodId || '')
  setSelectedTransitionId(instruction.transitionId || '')
  setSelectedTaskNo(instruction.taskNumber)
  form.setFieldsValue({
    instructionKey: instruction.instructionKey ?? undefined,
    content: instruction.content,
  })

mode === 'create':
  setSelectedInstructionKey(null)
  setSelectedMethodId('')
  setSelectedTransitionId('')
  setSelectedTaskNo(undefined)
  form.resetFields()
```

---

## 10. 使用コンポーネント

### Ant Design
- `Modal` - ダイアログコンテナ
- `Form` / `Form.Item` - フォーム管理
- `Input` / `Input.TextArea` - 指示内容入力
- `Select` - 指示種別・メソッド・トランジション・タスクNo選択
- `Button` - フッターボタン
- `Space` - レイアウト
- `Typography.Text` - ラベル・テキスト
- `theme.useToken()` - テーマトークン

### アイコン
- `PlusOutlined` - 追加ボタン・続けて追加ボタン

---

## 11. 変更履歴

| 日付 | 変更内容 | 担当者 |
|------|----------|--------|
| 2026-06-22 | 初版作成 | Cline |
| 2026-08-20 | 実装に合わせて全面改訂（フォーム簡素化・優先度/種別固定化・送信済み詳細モード追加・Props修正）| Cline |
| 2026-08-20 | ソース再確認により全面改訂（指示種別Select追加・指示対象を3つのSelect構成に変更・granularity自動判定追加・Props/State修正）| Cline |
