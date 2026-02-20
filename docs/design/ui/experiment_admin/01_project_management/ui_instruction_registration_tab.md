# InstructionRegistrationTab - 指示登録タブ

## 1. 概要

### 1.1 コンポーネントの目的
プロジェクト管理画面内の指示登録タブ。作業者向けの指示を作成・管理し、一括送信する機能を提供します。

### 1.2 使用場面
- プロジェクト管理画面の「指示登録」タブで使用
- メソッドやトランジション、タスクに対する作業指示を登録

### 1.3 アクセス権限
- **必須ロール**: experiment_admin
- **認証**: JWT + Session Hybrid認証

---

## 2. 画面構成

### 2.1 レイアウト構造

```
┌─────────────────────────────────────────────────────────┐
│ 指示一覧 (3件)            [➕ 指示追加] [📤 一括送信]  │
├─────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────────────┐  │
│ │ 指示対象          │ 優先度 │ 種別   │ 内容       │  │
│ ├───────────────────────────────────────────────────┤  │
│ │ メソッド > トラン │ [高]   │ 測定   │ 温度を... │  │
│ │ ジション          │        │        │           │  │
│ ├───────────────────────────────────────────────────┤  │
│ │ メソッド > タスク │ [中]   │ 一般   │ データ... │  │
│ │ 1                 │        │        │           │  │
│ ├───────────────────────────────────────────────────┤  │
│ │ ファイル全体      │ [通常] │ セット │ 実験準... │  │
│ │                   │        │ アップ │           │  │
│ └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 3. 機能仕様

### 3.1 Props定義

```typescript
interface InstructionRegistrationTabProps {
  projectId: string;              // プロジェクトID
  projectName: string;            // プロジェクト名
  tasks: TaskDetail[];            // タスク一覧
  onInstructionsSubmit?: (instructions: InstructionData[]) => void;  // 送信完了時コールバック
}
```

### 3.2 State管理

```typescript
const [instructions, setInstructions] = useState<InstructionData[]>([]);
const [availableMethods, setAvailableMethods] = useState<MethodInfo[]>([]);
const [availableTransitions, setAvailableTransitions] = useState<TransitionInfo[]>([]);
const [loadingTransitions, setLoadingTransitions] = useState<boolean>(false);
const [editDialogOpen, setEditDialogOpen] = useState<boolean>(false);
const [editMode, setEditMode] = useState<'create' | 'edit'>('create');
const [editingInstruction, setEditingInstruction] = useState<InstructionData | undefined>(undefined);
const [isSending, setIsSending] = useState<boolean>(false);
```

### 3.3 主要機能

#### 3.3.1 指示一覧表示

**テーブルカラム:**
| カラム | 説明 | 幅 |
|--------|------|-----|
| 指示対象 | メソッド/トランジション/タスク | 200px |
| 優先度 | 高/中/通常/低（タグ表示） | 100px |
| 種別 | 一般/セットアップ/測定/安全/清掃 | 120px |
| 内容 | 指示内容（省略表示、Tooltip） | 可変 |
| 操作 | 編集/削除または詳細ボタン | 150px |

**優先度タグカラー:**
- 高（3）: red
- 中（2）: orange
- 通常（1）: blue
- 低（0）: default

#### 3.3.2 指示追加

```typescript
const handleOpenCreateDialog = () => {
  setEditMode('create');
  setEditingInstruction(undefined);
  setEditDialogOpen(true);
};
```

**ボタン:**
- ラベル: 「指示追加」
- アイコン: PlusOutlined
- 無効化条件: データ読み込み中 または 送信中

#### 3.3.3 指示編集・削除

**編集ボタン:**
- 送信前: 「編集」ボタン表示
- 送信後: 「詳細」ボタン表示（読み取り専用）

**削除ボタン:**
- 送信前のみ表示
- danger スタイル
- 確認なしで即座に削除

```typescript
const handleDeleteInstruction = (id: string | number) => {
  setInstructions(prev => prev.filter(inst => inst.id !== id));
  // localStorageも更新
  localStorage.setItem(storageKey, JSON.stringify(dataToSave));
  message.success('指示を削除しました');
};
```

#### 3.3.4 一括送信

```typescript
const handleSubmitInstructions = async () => {
  if (instructions.length === 0) {
    message.warning('送信する指示がありません');
    return;
  }

  setIsSending(true);
  try {
    // API呼び出し（TODO: 実装）
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 送信済フラグを立てる
    const sentInstructions = instructions.map(inst => ({
      ...inst,
      isSent: true,
    }));
    
    setInstructions(sentInstructions);
    onInstructionsSubmit?.(sentInstructions);
    
    message.success('指示を送信しました');
  } catch (error) {
    message.error('指示送信エラー');
  } finally {
    setIsSending(false);
  }
};
```

**ボタン:**
- ラベル: 「一括送信」
- アイコン: SendOutlined
- 色: 成功カラー（colorSuccess）
- 無効化条件: 指示が0件 または 送信中
- ローディング表示: 送信中

### 3.4 LocalStorage保存・復元

**保存キー:**
```typescript
const storageKey = `instruction-registration-${projectId}`;
```

**保存データ形式:**
```typescript
interface InstructionRegistrationData {
  projectId: string;
  projectName: string;
  instructions: InstructionData[];
  savedAt: string;  // ISO 8601形式
}
```

**保存タイミング:**
- 指示追加時
- 指示編集時
- 指示削除時
- 一括送信時

**復元タイミング:**
- コンポーネントマウント時（useEffect）

### 3.5 メソッド・トランジション情報取得

```typescript
useEffect(() => {
  const fetchData = async () => {
    setLoadingTransitions(true);
    
    try {
      // TODO: 実際のAPI実装時に置き換え
      // モックデータで代替
      const mockMethods: MethodInfo[] = [...];
      const mockTransitions: TransitionInfo[] = [...];
      
      setAvailableMethods(mockMethods);
      setAvailableTransitions(mockTransitions);
      
      // LocalStorageから復元
      const savedData = localStorage.getItem(storageKey);
      if (savedData) {
        const parsed: InstructionRegistrationData = JSON.parse(savedData);
        if (parsed.projectId === projectId) {
          setInstructions(parsed.instructions);
          message.success('保存された指示を復元しました');
        }
      }
    } catch (error) {
      message.error('データ取得エラー');
    } finally {
      setLoadingTransitions(false);
    }
  };

  fetchData();
}, [projectId, storageKey]);
```

---

## 4. データ型定義

### 4.1 InstructionData型

```typescript
interface InstructionData {
  id: string | number;
  methodId?: string;           // メソッドID
  transitionId?: string;       // トランジションID
  taskNumber?: number;         // タスク番号
  priority: number;            // 優先度（0: 低, 1: 通常, 2: 中, 3: 高）
  type: number;                // 種別（0: 一般, 1: セットアップ, 2: 測定, 3: 安全, 4: 清掃）
  content: string;             // 指示内容
  isSent?: boolean;            // 送信済フラグ
}
```

### 4.2 MethodInfo型

```typescript
interface MethodInfo {
  id: string;
  name: string;
  displayName: string;
  description: string;
}
```

### 4.3 TransitionInfo型

```typescript
interface TransitionInfo {
  id: string;
  displayName: string;
  category: string;
  description: string;
  isExperimentRelevant: boolean;
}
```

---

## 5. 子コンポーネント

### 5.1 InstructionEditDialog

指示の追加・編集を行うダイアログコンポーネント。

```typescript
<InstructionEditDialog
  open={editDialogOpen}
  mode={editMode}                          // 'create' | 'edit'
  instruction={editingInstruction}
  tasks={tasks}
  availableMethods={availableMethods}
  availableTransitions={availableTransitions}
  onClose={handleCloseDialog}
  onSave={handleSaveInstruction}
/>
```

---

## 6. API連携

### 6.1 メソッド・トランジション情報取得

**エンドポイント:** TODO（未実装）
**メソッド:** GET
**レスポンス:**
```typescript
{
  methods: MethodInfo[];
  transitions: TransitionInfo[];
}
```

### 6.2 指示一括送信

**エンドポイント:** TODO（未実装）
**メソッド:** POST
**リクエスト:**
```typescript
{
  projectId: string;
  instructions: InstructionData[];
}
```

**レスポンス:**
```typescript
{
  success: boolean;
  sentCount: number;
}
```

---

## 7. UI/UXポリシー準拠

### 7.1 Ant Designコンポーネント使用

| 用途 | コンポーネント | Props |
|------|---------------|-------|
| テーブル | Table | columns, dataSource, size="small" |
| ボタン | Button | type, icon, disabled, loading |
| タグ | Tag | color |
| テキスト | Typography.Text | type, ellipsis |
| スペース | Space | size |
| ツールチップ | Tooltip | title |
| 空状態 | Empty | description, image |

### 7.2 カラーパレット

| 要素 | 色 | 用途 |
|------|-----|------|
| 送信ボタン | colorSuccess | アクション強調 |
| 優先度「高」 | red | 緊急度表示 |
| 優先度「中」 | orange | 重要度表示 |
| 優先度「通常」 | blue | 標準表示 |

---

## 8. エラーハンドリング

### 8.1 エラーケース

| エラーケース | 原因 | 対処方法 |
|-------------|------|----------|
| データ取得失敗 | APIエラー | エラーメッセージ表示 |
| 送信する指示なし | 指示が0件 | 警告メッセージ表示 |
| 一括送信失敗 | ネットワークエラー | エラーメッセージ表示、再試行 |
| LocalStorage復元失敗 | JSON解析エラー | コンソールログ出力、無視 |

---

## 9. 実装ファイル

### 9.1 ファイルパス
```
frontend/src/components/project/InstructionRegistrationTab.tsx
```

### 9.2 依存コンポーネント
- InstructionEditDialog - 指示編集ダイアログ

### 9.3 依存ライブラリ
- antd: Table, Button, Tag, Typography, Space, Tooltip, Empty, message
- @ant-design/icons: PlusOutlined, EditOutlined, DeleteOutlined, SendOutlined, EyeOutlined
- @/contexts/LanguageContext: useLanguage

---

## 10. 既知の課題・TODO

### 10.1 API未実装
- [ ] メソッド・トランジション情報取得API
- [ ] 指示一括送信API

### 10.2 将来の改善案
- [ ] 指示の並び替え機能
- [ ] 指示のフィルタリング機能
- [ ] 指示のエクスポート機能
- [ ] 送信履歴の表示
- [ ] 指示のテンプレート機能

---

## 11. 変更履歴

| 日付 | バージョン | 変更内容 | 担当者 |
|------|-----------|---------|--------|
| 2026-02-19 | 1.0.0 | 初版作成 | Cline |

---

## 12. 関連ドキュメント

- [ProjectManagement仕様](./ProjectManagement.md) - 親コンポーネント
- [InstructionEditDialog仕様](./InstructionEditDialog.md) - 編集ダイアログ
- [TaskRegistrationTab仕様](./TaskRegistrationTab.md) - タスク登録タブ
