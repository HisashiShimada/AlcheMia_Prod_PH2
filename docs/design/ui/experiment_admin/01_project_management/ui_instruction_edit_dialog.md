# InstructionEditDialog - 指示編集ダイアログ

## 1. 概要

### 1.1 コンポーネントの目的
単一指示の追加・編集を行うモーダルダイアログ。メソッド、トランジション、タスクに対する作業指示を入力・編集する機能を提供します。連続指示機能に対応しています。

### 1.2 使用場面
- InstructionRegistrationTabから呼び出される
- 新規指示の追加時
- 既存指示の編集時
- 送信済指示の詳細表示時

### 1.3 アクセス権限
- **必須ロール**: experiment_admin
- **認証**: JWT + Session Hybrid認証

---

## 2. 画面構成

### 2.1 レイアウト構造

```
┌─────────────────────────────────────────────┐
│ 新規指示の追加                        [×]   │
├─────────────────────────────────────────────┤
│ 🎯 指示対象                                 │
│ ┌─────────────────────────────────────────┐│
│ │ 🎯 サンプル準備                         ││
│ └─────────────────────────────────────────┘│
│                                             │
│ 対象メソッド                                │
│ [サンプル準備 - 実験サンプルの準備  ▼]    │
│                                             │
│ 優先度 *                                    │
│ [通常 ▼]                                   │
│                                             │
│ タイプ *                                    │
│ [一般 ▼]                                   │
│                                             │
│ 🎯 対象タスク                               │
│ [タスク番号を選択... ▼]                    │
│                                             │
│ 🔗 トランジションID                         │
│ [トランジションを選択... ▼]                │
│                                             │
│ 指示内容 *                                  │
│ ┌─────────────────────────────────────────┐│
│ │ 作業者への具体的な指示を入力...        ││
│ │                                         ││
│ │                            0 / 1000     ││
│ └─────────────────────────────────────────┘│
├─────────────────────────────────────────────┤
│         [キャンセル] [➕連続指示] [💾保存]  │
└─────────────────────────────────────────────┘
```

---

## 3. 機能仕様

### 3.1 Props定義

```typescript
interface InstructionEditDialogProps {
  open: boolean;                                  // ダイアログ表示/非表示
  mode: 'create' | 'edit';                        // モード（新規/編集）
  instruction?: InstructionData;                  // 編集対象の指示（編集時）
  tasks: TaskDetail[];                            // タスク一覧
  availableMethods: MethodInfo[];                 // 利用可能なメソッド一覧
  availableTransitions: TransitionInfo[];         // 利用可能なトランジション一覧
  onClose: () => void;                            // 閉じるハンドラ
  onSave: (instruction: InstructionData, keepDialogOpen?: boolean) => void;  // 保存ハンドラ
}
```

### 3.2 State管理

```typescript
const [form] = Form.useForm();
const [selectedMethodId, setSelectedMethodId] = useState<string>('');
const [selectedTaskNumber, setSelectedTaskNumber] = useState<number | undefined>(undefined);
const [selectedTransitionId, setSelectedTransitionId] = useState<string>('');
```

### 3.3 主要機能

#### 3.3.1 モード切り替え

**新規作成モード（mode='create'）:**
- タイトル: 「新規指示の追加」
- フォーム初期値: デフォルト値
- フッター: キャンセル + 連続指示 + 保存

**編集モード（mode='edit'）:**
- タイトル: 「指示の編集」
- フォーム初期値: 既存データ
- フッター: キャンセル + 保存

**送信済表示モード（isSent=true）:**
- タイトル: 「指示詳細」
- すべてのフィールド: 読み取り専用
- フッター: 閉じるボタンのみ

#### 3.3.2 指示対象の表示

**表示ロジック:**
```typescript
{selectedMethodId ? (
  <Text>
    <AimOutlined /> {selectedMethod?.displayName || 'メソッド未設定'}
  </Text>
) : (
  <Text>
    <FileTextOutlined /> ファイル全体
  </Text>
)}
```

**背景色:** colorPrimaryBg

#### 3.3.3 メソッド選択

```typescript
<Form.Item name="methodId" label="対象メソッド">
  <Select
    placeholder="メソッドを選択..."
    onChange={handleMethodChange}
    allowClear
    disabled={isSentInstruction}
  >
    {tasks.map((task) => {
      const method = availableMethods.find(m => m.id === task.methodId);
      return method ? (
        <Select.Option key={task.methodId} value={task.methodId}>
          {method.displayName}
          {method.description && ` - ${method.description}`}
        </Select.Option>
      ) : null;
    })}
  </Select>
</Form.Item>
```

**メソッド変更時の処理:**
```typescript
const handleMethodChange = (value: string) => {
  setSelectedMethodId(value);
  // トランジションとタスク番号をリセット
  setSelectedTransitionId('');
  setSelectedTaskNumber(undefined);
  form.setFieldsValue({
    transitionId: '',
    taskNumber: undefined,
  });
};
```

#### 3.3.4 優先度選択

**選択肢:**
| 値 | ラベル | code_value |
|----|--------|-----------|
| 高 | HIGH | 3 |
| 中 | MEDIUM | 2 |
| 通常 | NORMAL | 1 |
| 低 | LOW | 0 |

**デフォルト値:** NORMAL (1)

```typescript
<Form.Item
  name="priority"
  label="優先度"
  rules={[{ required: true, message: '優先度を選択してください' }]}
>
  <Select disabled={isSentInstruction}>
    <Select.Option value={3}>高</Select.Option>
    <Select.Option value={2}>中</Select.Option>
    <Select.Option value={1}>通常</Select.Option>
    <Select.Option value={0}>低</Select.Option>
  </Select>
</Form.Item>
```

#### 3.3.5 タイプ選択

**選択肢:**
| 値 | ラベル | code_value |
|----|--------|-----------|
| 一般 | GENERAL | 0 |
| セットアップ | SETUP | 1 |
| 測定 | MEASUREMENT | 2 |
| 安全 | SAFETY | 3 |
| 清掃 | CLEANUP | 4 |

**デフォルト値:** GENERAL (0)

```typescript
<Form.Item
  name="type"
  label="タイプ"
  rules={[{ required: true, message: 'タイプを選択してください' }]}
>
  <Select disabled={isSentInstruction}>
    <Select.Option value={0}>一般</Select.Option>
    <Select.Option value={1}>セットアップ</Select.Option>
    <Select.Option value={2}>測定</Select.Option>
    <Select.Option value={3}>安全</Select.Option>
    <Select.Option value={4}>清掃</Select.Option>
  </Select>
</Form.Item>
```

#### 3.3.6 対象タスク選択

**有効化条件:**
- メソッドが選択されている
- 選択されたタスクの実験条件が「異なる」（experimentCondition === 1）

```typescript
<Form.Item name="taskNumber" label="🎯 対象タスク">
  <Select
    placeholder="タスク番号を選択..."
    disabled={
      isSentInstruction || 
      !selectedMethodId || 
      !selectedTask || 
      selectedTask.experimentCondition !== 1
    }
    allowClear
  >
    {selectedTask?.taskNumberOptions.map((taskNum) => (
      <Select.Option key={taskNum} value={taskNum}>
        タスク {taskNum}
      </Select.Option>
    ))}
  </Select>
</Form.Item>
```

#### 3.3.7 トランジション選択

**有効化条件:**
- メソッドが選択されている

```typescript
<Form.Item name="transitionId" label="🔗 トランジションID">
  <Select
    placeholder="トランジションを選択..."
    disabled={isSentInstruction || !selectedMethodId}
    onChange={(value) => setSelectedTransitionId(value)}
    allowClear
  >
    {availableTransitions.map((transition) => (
      <Select.Option key={transition.id} value={transition.id}>
        {transition.isExperimentRelevant && '⭐ '}
        {transition.displayName}
        {transition.category !== 'other' && ` [${transition.category}]`}
      </Select.Option>
    ))}
  </Select>
</Form.Item>
```

**選択されたトランジションの詳細表示:**
```typescript
{selectedTransition && (
  <Alert
    message={
      <Space direction="vertical" size="small">
        <Text><Text strong>選択中:</Text> {selectedTransition.displayName}</Text>
        <Text><Text strong>カテゴリ:</Text> {selectedTransition.category}</Text>
        {selectedTransition.description && (
          <Text><Text strong>説明:</Text> {selectedTransition.description}</Text>
        )}
      </Space>
    }
    type="success"
    showIcon
  />
)}
```

#### 3.3.8 指示内容入力

```typescript
<Form.Item
  name="content"
  label="指示内容 *"
  rules={[
    { required: true, message: '指示内容を入力してください' },
    { max: 1000, message: '1000文字以内で入力してください' },
  ]}
>
  <TextArea
    placeholder="作業者への具体的な指示を入力してください..."
    rows={6}
    showCount
    maxLength={1000}
    disabled={isSentInstruction}
  />
</Form.Item>
```

**バリデーション:**
- 必須チェック
- 最大1000文字
- トリム処理（空白除去）

#### 3.3.9 保存処理

**共通保存ロジック:**
```typescript
const saveInstruction = async (keepDialogOpen: boolean) => {
  const values = await form.validateFields();

  // バリデーション
  if (!values.content || values.content.trim() === '') {
    form.setFields([{ name: 'content', errors: ['指示内容を入力してください'] }]);
    return;
  }

  // 指示データを構築
  const instructionData: InstructionData = {
    id: instruction?.id || Date.now(),
    content: values.content.trim(),
    priority: values.priority,
    type: values.type,
    targetType: TARGET_TYPES_LOCAL.FILE,
    methodId: values.methodId || '',
    transitionId: values.transitionId || '',
    taskNumber: values.taskNumber,
  };

  // 対象タイプを判定
  if (instructionData.transitionId) {
    instructionData.targetType = TARGET_TYPES_LOCAL.TRANSITION;
  } else if (instructionData.taskNumber !== undefined) {
    instructionData.targetType = TARGET_TYPES_LOCAL.TASK;
  } else {
    instructionData.targetType = TARGET_TYPES_LOCAL.FILE;
  }

  // 保存コールバック
  onSave(instructionData, keepDialogOpen);

  // 連続指示の場合はフォームをリセット
  if (keepDialogOpen) {
    const currentMethodId = values.methodId || '';
    form.resetFields();
    form.setFieldsValue({
      priority: INSTRUCTION_PRIORITIES_LOCAL.NORMAL,
      type: INSTRUCTION_TYPES_LOCAL.GENERAL,
      methodId: currentMethodId, // メソッドIDを引き継ぐ
      taskNumber: undefined,
      transitionId: '',
      content: '',
    });
    setSelectedMethodId(currentMethodId);
    setSelectedTaskNumber(undefined);
    setSelectedTransitionId('');
  }
};
```

**通常保存:**
- ボタン: 「保存」
- アイコン: SaveOutlined
- 動作: 保存してダイアログを閉じる

**連続指示:**
- ボタン: 「連続指示」
- アイコン: PlusOutlined
- 動作: 保存してダイアログは開いたまま
- メソッドIDを引き継ぐ
- その他のフィールドはリセット

#### 3.3.10 キャンセル処理

```typescript
const handleCancel = () => {
  form.resetFields();
  setSelectedMethodId('');
  setSelectedTaskNumber(undefined);
  setSelectedTransitionId('');
  onClose();
};
```

---

## 4. データ型定義

### 4.1 InstructionData型

```typescript
interface InstructionData {
  id: string | number;
  content: string;                // 指示内容（最大1000文字）
  priority: number;               // 優先度（0-3）
  type: number;                   // タイプ（0-4）
  targetType: number;             // 対象タイプ（0-2）
  methodId?: string;              // メソッドID
  transitionId?: string;          // トランジションID
  taskNumber?: number;            // タスク番号
  isSent?: boolean;               // 送信済フラグ
}
```

### 4.2 対象タイプの判定ロジック

```typescript
const TARGET_TYPES = {
  FILE: 0,         // ファイル全体
  TASK: 1,         // タスク
  TRANSITION: 2,   // トランジション
};

// 判定ロジック
if (transitionId) {
  targetType = TARGET_TYPES.TRANSITION;
} else if (taskNumber !== undefined) {
  targetType = TARGET_TYPES.TASK;
} else {
  targetType = TARGET_TYPES.FILE;
}
```

---

## 5. UI/UXポリシー準拠

### 5.1 Ant Designコンポーネント使用

| 用途 | コンポーネント | Props |
|------|---------------|-------|
| モーダル | Modal | title, open, onCancel, width, footer |
| フォーム | Form | form, layout="vertical" |
| セレクト | Select | placeholder, onChange, allowClear, disabled |
| テキストエリア | Input.TextArea | rows, showCount, maxLength |
| カード | Card | size="small", style |
| アラート | Alert | message, type, showIcon |
| ボタン | Button | type, icon, onClick |

### 5.2 カラーパレット

| 要素 | 色 | 用途 |
|------|-----|------|
| 指示対象カード | colorPrimaryBg | 情報表示エリア |
| トランジション詳細 | success (Alert) | 選択中の詳細 |

---

## 6. エラーハンドリング

### 6.1 エラーケース

| エラーケース | 原因 | 対処方法 |
|-------------|------|----------|
| 指示内容未入力 | 必須フィールド空 | フォームエラー表示 |
| 指示内容が空白のみ | トリム後空 | カスタムエラー表示 |
| 文字数超過 | 1000文字超 | フォームエラー表示 |
| バリデーション失敗 | その他の入力エラー | コンソールログ出力 |

---

## 7. 実装ファイル

### 7.1 ファイルパス
```
frontend/src/components/project/InstructionEditDialog.tsx
```

### 7.2 依存コンポーネント
- なし（単独で動作）

### 7.3 依存ライブラリ
- antd: Modal, Form, Select, Input, Space, Typography, Alert, Card, Button
- @ant-design/icons: FileTextOutlined, AimOutlined, PlusOutlined, SaveOutlined

---

## 8. 既知の課題・TODO

### 8.1 将来の改善案
- [ ] テンプレート機能（よく使う指示の保存）
- [ ] 下書き保存機能
- [ ] 指示のプレビュー機能
- [ ] AIによる指示内容の提案
- [ ] 過去の指示履歴の参照

---

## 9. 変更履歴

| 日付 | バージョン | 変更内容 | 担当者 |
|------|-----------|---------|--------|
| 2026-02-19 | 1.0.0 | 初版作成 | Cline |

---

## 10. 関連ドキュメント

- [InstructionRegistrationTab仕様](./InstructionRegistrationTab.md) - 親コンポーネント
- [InstructionDialog仕様](./InstructionDialog.md) - 旧バージョンダイアログ
