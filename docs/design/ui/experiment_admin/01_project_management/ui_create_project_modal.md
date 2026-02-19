# CreateProjectModal - 新規プロジェクト作成モーダル

## 1. 概要

### 1.1 コンポーネントの目的
新規プロジェクトを作成するためのモーダルダイアログ。プロジェクト名と概要を入力し、自動的にフォルダ名を生成して新しいプロジェクトを作成します。

### 1.2 使用場面
- プロジェクト管理画面のツールバーで「新規プロジェクト作成」ボタンをクリックした際に表示
- プロジェクト情報を入力して新規プロジェクトを作成

### 1.3 アクセス権限
- **必須ロール**: experiment_admin
- **認証**: JWT + Session Hybrid認証

---

## 2. 画面構成

### 2.1 レイアウト構造

```
┌────────────────────────────────────────┐
│ 🗂️ 新規プロジェクト作成                │ ← タイトル
├────────────────────────────────────────┤
│                                        │
│ ⚠️ エラーメッセージ（エラー時のみ）    │
│                                        │
│ プロジェクト名 *                       │
│ ┌────────────────────────────────┐    │
│ │ [入力フィールド]            100│    │ ← 文字数カウント
│ └────────────────────────────────┘    │
│                                        │
│ 概要                                   │
│ ┌────────────────────────────────┐    │
│ │                                │    │
│ │ [複数行入力フィールド]      500│    │ ← 文字数カウント
│ │                                │    │
│ └────────────────────────────────┘    │
│                                        │
├────────────────────────────────────────┤
│               [キャンセル] [作成]      │ ← フッター
└────────────────────────────────────────┘
```

**モーダルサイズ:** width: 500px

### 2.2 主要UI要素

#### 2.2.1 タイトル
- アイコン: `<FolderAddOutlined />` - プライマリカラー
- テキスト: "新規プロジェクト作成"（太字）

#### 2.2.2 エラーメッセージ（条件付き表示）
- コンポーネント: `<Alert type="error" />`
- 表示条件: エラー発生時のみ
- 閉じるボタン付き

#### 2.2.3 入力フォーム
**A. プロジェクト名（必須）**
- ラベル: "プロジェクト名"
- コンポーネント: `<Input />`
- 最大文字数: 100文字
- 文字数カウンター表示
- オートフォーカス

**バリデーション:**
- 必須入力
- 最小3文字
- 最大100文字

**B. 概要（任意）**
- ラベル: "概要"
- コンポーネント: `<Input.TextArea />`
- 行数: 4行
- 最大文字数: 500文字
- 文字数カウンター表示

**バリデーション:**
- 最大500文字

#### 2.2.4 フッターボタン
- キャンセルボタン: モーダルを閉じる
- 作成ボタン: フォーム送信（プライマリカラー、ローディング表示）

---

## 3. 機能仕様

### 3.1 初期表示

#### 3.1.1 デフォルト値
- プロジェクト名: 空
- 概要: 空
- エラーメッセージ: 非表示

#### 3.1.2 フォーカス
初期表示時、プロジェクト名フィールドに自動フォーカス（`autoFocus`）

### 3.2 フォーム送信

#### 3.2.1 送信フロー
```typescript
const handleSubmit = async () => {
  try {
    setError(null);
    setSubmitting(true);
    
    // 1. バリデーション
    const values = await form.validateFields();
    
    // 2. フォルダ名の自動生成
    const folderName = values.name
      .replace(/\s+/g, '_')              // スペース → アンダースコア
      .replace(/[^a-zA-Z0-9_-]/g, '_');  // 使用不可文字 → アンダースコア
    
    // 3. プロジェクトデータの作成
    const projectData: CreateProjectData = {
      name: values.name,
      description: values.description || '',
      folderName: folderName,
      owner: currentUser.name,
      department: currentUser.department,
      organizationId: currentUser.organizationId,
    };
    
    // 4. 親コンポーネントの送信ハンドラ呼び出し
    await onSubmit(projectData);
    
    // 5. 成功時: フォームをリセット
    form.resetFields();
  } catch (err) {
    // エラーハンドリング
    if (err instanceof Error) {
      setError(err.message);
    }
  } finally {
    setSubmitting(false);
  }
};
```

#### 3.2.2 フォルダ名の自動生成ルール
| 文字種 | 変換ルール |
|-------|-----------|
| スペース | アンダースコア（_）に変換 |
| 英数字 | そのまま |
| ハイフン（-） | そのまま |
| アンダースコア（_） | そのまま |
| その他の文字 | アンダースコア（_）に変換 |

**例:**
- "Sample Project" → "Sample_Project"
- "実験プロジェクト１" → "______1"
- "Test-Project_2023" → "Test-Project_2023"

### 3.3 キャンセル処理

#### 3.3.1 キャンセルフロー
```typescript
const handleCancel = () => {
  form.resetFields();      // フォームをリセット
  setError(null);          // エラーをクリア
  onCancel();              // 親コンポーネントのハンドラ呼び出し
};
```

**実行タイミング:**
- キャンセルボタンクリック
- モーダル外側クリック
- Escキー押下

### 3.4 バリデーション

#### 3.4.1 プロジェクト名
```typescript
rules: [
  {
    required: true,
    message: 'プロジェクト名を入力してください',
  },
  {
    min: 3,
    message: 'プロジェクト名は3文字以上で入力してください',
  },
  {
    max: 100,
    message: 'プロジェクト名は100文字以内で入力してください',
  },
]
```

#### 3.4.2 概要
```typescript
rules: [
  {
    max: 500,
    message: '概要は500文字以内で入力してください',
  },
]
```

#### 3.4.3 バリデーションタイミング
- フォーカス離脱時（onChange）
- フォーム送信時（onSubmit）

---

## 4. データ仕様

### 4.1 Props定義

```typescript
interface CreateProjectModalProps {
  open: boolean;                              // モーダル表示状態
  onCancel: () => void;                      // キャンセルハンドラ
  onSubmit: (data: CreateProjectData) => Promise<void>; // 送信ハンドラ
  currentUser?: {                            // 現在のユーザー情報（任意）
    name: string;
    department: string;
    organizationId: string;
  };
}
```

### 4.2 CreateProjectData型定義

```typescript
export interface CreateProjectData {
  name: string;              // プロジェクト名
  description: string;       // 概要
  folderName: string;        // フォルダ名（自動生成）
  owner: string;             // 所有者（現在のユーザー名）
  department: string;        // 部署（現在のユーザーの部署）
  organizationId: string;    // 組織ID（現在のユーザーの組織）
}
```

### 4.3 State定義

```typescript
const [form] = Form.useForm();                    // Antd Form インスタンス
const [submitting, setSubmitting] = useState(false); // 送信中フラグ
const [error, setError] = useState<string | null>(null); // エラーメッセージ
```

### 4.4 currentUserのデフォルト値

```typescript
currentUser = {
  name: '田中 太郎',
  department: '材料開発部',
  organizationId: 'org_maiml_lab_001',
}
```

---

## 5. API連携

### 5.1 直接使用するAPI
このコンポーネント自体はAPIを直接呼び出しません。

### 5.2 親コンポーネントでの使用API

**ProjectManagementコンポーネント:**
```typescript
const handleCreateProject = async (data: CreateProjectData) => {
  // プロジェクト作成APIを呼び出し
  await apiService.post('/api/v1/projects', data);
  
  // 成功時の処理
  message.success('プロジェクトが正常に作成されました');
  refetchProjects(); // プロジェクト一覧を再取得
};
```

**使用API:** ✅
- POST `/api/v1/projects` - プロジェクト作成

**詳細:** [プロジェクト管理API仕様書](../../api/api_project_management.md#32-プロジェクト作成-)

**Request:**
```http
POST /api/v1/projects
Authorization: Bearer maiml_session-{sessionId}_{timestamp}
X-Organization-Id: {organization_id}
Content-Type: application/json

{
  "project_name": "Sample Project",
  "project_folder_name": "Sample_Project",
  "description": "This is a sample project",
  "owner_id": "user-uuid-001",
  "department_id": "dept-uuid-001"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "project_id": "550e8400-e29b-41d4-a716-446655440000",
    "project_name": "Sample Project",
    "project_folder_name": "Sample_Project",
    "description": "This is a sample project",
    "project_status": "planning",
    "is_checked_out": false,
    "owner_id": "user-uuid-001",
    "owner_name": "田中太郎",
    "department_id": "dept-uuid-001",
    "department_name": "材料開発部",
    "organization_id": "org-uuid-001",
    "created_at": "2026-01-23T08:00:00Z",
    "updated_at": "2026-01-23T08:00:00Z"
  },
  "meta": {
    "timestamp": "2026-01-23T08:00:00Z",
    "requestId": "req_abc123"
  }
}
```

---

## 6. エラーハンドリング

### 6.1 エラーケース

| エラーケース | 原因 | 対処方法 |
|-------------|------|----------|
| バリデーションエラー | 入力値が規則に違反 | フィールド下にエラーメッセージ表示 |
| 送信エラー | API呼び出し失敗 | モーダル上部にAlertでエラー表示 |
| ネットワークエラー | 通信失敗 | エラーメッセージをAlert表示 |

### 6.2 エラーメッセージ表示

```typescript
{error && (
  <Alert
    message="作成エラー"
    description={error}
    type="error"
    showIcon
    closable
    onClose={() => setError(null)}
  />
)}
```

**特徴:**
- 閉じるボタン付き
- アイコン表示
- エラー詳細を表示

---

## 7. UI/UXポリシー準拠

### 7.1 Ant Designコンポーネント使用

| 用途 | コンポーネント | Props |
|------|---------------|-------|
| モーダル | Modal | title, open, onCancel, onOk, width=500 |
| フォーム | Form | layout="vertical" |
| 入力フィールド | Input | maxLength=100, showCount, autoFocus |
| 複数行入力 | Input.TextArea | rows=4, maxLength=500, showCount |
| エラー表示 | Alert | type="error", showIcon, closable |
| スペース | Space | direction="vertical", size="middle" |
| テキスト | Typography.Text | strong |

### 7.2 デザイントークン使用

```typescript
const { token } = theme.useToken();

// 使用例
<FolderAddOutlined style={{ color: token.colorPrimary }} />
```

### 7.3 フォームレイアウト

```typescript
<Form
  form={form}
  layout="vertical"         // ✅ 推奨: 縦配置レイアウト
  requiredMark="optional"   // ✅ 任意項目のマーク表示
>
```

### 7.4 入力フィールドの文字数制限

```typescript
// ✅ 推奨: maxLength + showCount の組み合わせ
<Input
  maxLength={100}
  showCount
/>
```

### 7.5 バリデーションメッセージ

- ユーザーフレンドリーな日本語メッセージ
- 具体的な制約を明示（最小3文字、最大100文字等）
- 多言語対応（`t()`関数使用）

---

## 8. 実装ファイル

### 8.1 ファイルパス
```
frontend/src/components/project/CreateProjectModal.tsx
```

### 8.2 依存コンポーネント
- なし（単独で動作）

### 8.3 依存ライブラリ
- antd: Modal, Form, Input, Space, Typography, Alert, theme
- @ant-design/icons: FolderAddOutlined
- React: useState

---

## 9. 多言語対応

### 9.1 翻訳キー

```typescript
// タイトル
t('projectManagement.create.title')                     // "新規プロジェクト作成"

// ボタン
t('projectManagement.create.submit')                    // "作成"
t('common.cancel')                                      // "キャンセル"

// フィールドラベル
t('projectManagement.create.projectName')               // "プロジェクト名"
t('projectManagement.create.description')               // "概要"

// プレースホルダー
t('projectManagement.create.projectNamePlaceholder')    // "プロジェクト名を入力"
t('projectManagement.create.descriptionPlaceholder')    // "プロジェクトの概要を入力（任意）"

// バリデーションメッセージ
t('projectManagement.create.projectNameRequired')       // "プロジェクト名を入力してください"
t('projectManagement.create.projectNameMinLength')      // "プロジェクト名は3文字以上で入力してください"
t('projectManagement.create.projectNameMaxLength')      // "プロジェクト名は100文字以内で入力してください"
t('projectManagement.create.descriptionMaxLength')      // "概要は500文字以内で入力してください"

// エラーメッセージ
t('projectManagement.create.error')                     // "作成エラー"
t('projectManagement.create.success')                   // "プロジェクトが正常に作成されました"
```

---

## 10. テスト観点

### 10.1 単体テスト
- [ ] モーダル表示/非表示が正しく動作する
- [ ] プロジェクト名バリデーションが正しく動作する
- [ ] 概要バリデーションが正しく動作する
- [ ] フォルダ名が正しく生成される
- [ ] 送信時にonSubmitが正しく呼ばれる
- [ ] キャンセル時にフォームがリセットされる
- [ ] エラー時にAlertが表示される

### 10.2 統合テスト
- [ ] 親コンポーネントからの表示・非表示制御
- [ ] プロジェクト作成後の一覧更新
- [ ] エラー発生時のリトライ

### 10.3 E2Eテスト
- [ ] プロジェクト作成フローの完了
- [ ] バリデーションエラーの表示
- [ ] キャンセル操作

---

## 11. 既知の課題・TODO

### 11.1 既知の課題
- なし

### 11.2 将来の改善案
- [ ] 実際のAPI呼び出し実装（現在はモック）
- [ ] プロジェクトテンプレート選択機能
- [ ] フォルダ名のプレビュー表示
- [ ] 重複プロジェクト名チェック
- [ ] プロジェクト初期設定（メンバー追加等）

---

## 12. 変更履歴

| 日付 | バージョン | 変更内容 | 担当者 |
|------|-----------|---------|--------|
| 2026-01-21 | 1.0.0 | 初版作成 | Cline |

---

## 13. 関連ドキュメント

- [ProjectManagement仕様](./ProjectManagement.md) - 親コンポーネント
- [UIポリシー](.clinerules/references/ui_policy.md) - UI設計ルール
- [フォーム規約](.clinerules/development/frontend.md) - フォーム記述規約
