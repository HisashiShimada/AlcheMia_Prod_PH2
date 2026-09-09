# 新規プロジェクト作成モーダル UI仕様書

## 1. 概要

### 1.1 コンポーネントの目的
新規プロジェクト作成モーダルは、プロジェクト管理画面から新規プロジェクトを作成するためのモーダルダイアログです。プロジェクト名・概要・担当チームを入力し、バックエンドAPIに送信してプロジェクトを作成します。

### 1.2 使用場面
- プロジェクト管理画面のツールバー → 「新規作成」ボタンクリック時に表示
- モーダル形式で画面中央に表示

### 1.3 アクセス権限
- **必須ロール**: Experiment Admin（実験管理者）
- **認証**: JWT + Session Hybrid認証

---

## 2. 画面構成

### 2.1 レイアウト構造

```
┌─────────────────────────────────────────┐
│ 📁 新規プロジェクト作成                 │
├─────────────────────────────────────────┤
│                                         │
│ プロジェクト名 *                        │
│ ┌─────────────────────────────────┐   │
│ │                                 │   │
│ └─────────────────────────────────┘   │
│ 3文字以上、100文字以内                  │
│                                         │
│ 概要                                    │
│ ┌─────────────────────────────────┐   │
│ │                                 │   │
│ │                                 │   │
│ │                                 │   │
│ └─────────────────────────────────┘   │
│ 500文字以内（任意）                     │
│                                         │
│ チーム *                                │
│ ┌─────────────────────────────────┐   │
│ │ チームを選択してください ▼       │   │
│ └─────────────────────────────────┘   │
│ ※プロジェクト作成後の変更不可           │
│                                         │
│              [キャンセル] [作成]        │
└─────────────────────────────────────────┘
```

### 2.2 主要UI要素

#### 2.2.1 モーダルヘッダー
- アイコン: FolderAddOutlined（プライマリカラー）
- タイトル: "新規プロジェクト作成"（多言語対応: `projectManagement.create.title`）

#### 2.2.2 フォームフィールド

**1. プロジェクト名（必須）**
- タイプ: Input
- `data-testid`: `create-project-name-input`
- バリデーション:
  - 必須入力
  - 最小3文字
  - 最大100文字
- `maxLength={100}` / `showCount` で文字数カウント表示
- `autoFocus` あり

**2. 概要（任意）**
- タイプ: TextArea
- `data-testid`: `create-project-description-input`
- 行数: 4行
- バリデーション:
  - 最大500文字
- `maxLength={500}` / `showCount` で文字数カウント表示

**3. グループ（必須）**（2026-09-09 修正: 旧「チーム」から変更）
- タイプ: Select（ドロップダウン）
- `data-testid`: `create-project-org-group-select`
- フォームフィールド名: `organizationGroupCd`
- ラベル: `t('createProject.groupLabel')`
- プレースホルダー: `t('createProject.groupPlaceholder')`
- データソース: `GET /api/v1/organization-groups` で取得したグループ一覧
- ローディング中はスピナー表示（`loading={teamsLoading}`）
- バリデーション:
  - 必須選択（`t('createProject.groupRequired')`）
- フィールド下に補足テキスト（`t('createProject.groupNote')`）を表示

#### 2.2.3 フッターボタン
- **キャンセルボタン** (`data-testid`: `create-project-cancel-button`): モーダルを閉じる、フォームをリセット
- **作成ボタン** (`data-testid`: `create-project-submit-button`): フォーム送信、ローディング状態表示

#### 2.2.4 エラー表示
- Alert（error）: エラーメッセージ表示
- `title` / `description` / `closable` / `showIcon` あり（`title` prop は Ant Design v6 対応）

---

## 3. 機能仕様

### 3.1 チーム一覧の取得

モーダルオープン時（`open === true` になった際）に自動実行。

```
open が true に変化
  ↓
GET /api/v1/organization-groups
  ↓
成功: teams ステートに設定（Select の選択肢として表示）
失敗: teams を空配列に設定（Select は空のまま続行）
```

### 3.2 プロジェクト作成

#### 3.2.1 処理フロー
```typescript
const handleSubmit = async () => {
  try {
    setError(null);
    setSubmitting(true);
    
    // バリデーション
    const values = await form.validateFields();
    
    // プロジェクト名からフォルダ名を自動生成
    const folderName = values.projectName
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_-]/g, '_');
    
    // プロジェクトデータの作成
    const projectData: CreateProjectData = {
      projectName: values.projectName,
      description: values.description || '',
      folderName: folderName,
      owner: currentUser.name,
      organizationGroup: currentUser.organizationGroup,
      organizationId: currentUser.organizationId,
      organizationGroupCd: values.organizationGroupCd || undefined,
    };
    
    // 親コンポーネントの送信ハンドラを呼び出し
    await onSubmit(projectData);
    
    // 成功時はフォームをリセット
    form.resetFields();
  } catch (err) {
    if (err instanceof Error) {
      setError(err.message);
    } else {
      console.error('Form validation failed:', err);
    }
  } finally {
    setSubmitting(false);
  }
};
```

#### 3.2.2 フォルダ名の自動生成
```typescript
const folderName = values.projectName
  .replace(/\s+/g, '_')      // スペースをアンダースコアに変換
  .replace(/[^a-zA-Z0-9_-]/g, '_');  // 使用不可文字をアンダースコアに変換
```

**例:**
- `"プロジェクト 001"` → `"________001"`
- `"Project-ABC"` → `"Project-ABC"`
- `"Test Project (2026)"` → `"Test_Project__2026_"`

#### 3.2.3 UI動作
1. 作成ボタンクリック
2. フォームバリデーション実行
3. バリデーション成功: プロジェクトデータを作成
4. 親コンポーネントの`onSubmit`コールバック呼び出し
5. 成功: モーダルを閉じる、フォームリセット
6. 失敗: エラーメッセージ表示（Alert）

### 3.3 キャンセル

```typescript
const handleCancel = () => {
  form.resetFields();
  setError(null);
  onCancel();
};
```

- キャンセルボタンまたは×ボタンクリック
- フォームをリセット
- エラーメッセージをクリア
- モーダルを閉じる

### 3.4 バリデーション

#### 3.4.1 プロジェクト名
| ルール | メッセージ（i18n キー）|
|--------|---------------------|
| 必須 | `projectManagement.create.projectNameRequired` |
| 最小3文字 | `projectManagement.create.projectNameMinLength` |
| 最大100文字 | `projectManagement.create.projectNameMaxLength` |

#### 3.4.2 概要
| ルール | メッセージ（i18n キー）|
|--------|---------------------|
| 最大500文字 | `projectManagement.create.descriptionMaxLength` |

#### 3.4.3 チーム
| ルール | メッセージ（i18n キー）|
|--------|---------------------|
| 必須 | `createProject.teamRequired` |

### 3.5 多言語対応

```typescript
// モーダルタイトル
t('projectManagement.create.title')

// フィールドラベル
t('projectManagement.create.projectName')
t('projectManagement.create.description')
t('createProject.teamLabel')

// プレースホルダー
t('projectManagement.create.projectNamePlaceholder')
t('projectManagement.create.descriptionPlaceholder')
t('createProject.teamPlaceholder')

// 補足テキスト
t('createProject.teamNote')  // "※プロジェクト作成後の変更不可" 相当

// バリデーションメッセージ
t('projectManagement.create.projectNameRequired')
t('projectManagement.create.projectNameMinLength')
t('projectManagement.create.projectNameMaxLength')
t('projectManagement.create.descriptionMaxLength')
t('createProject.teamRequired')

// ボタン
t('common.create')
t('common.cancel')

// エラー
t('projectManagement.create.error')
```

---

## 4. データ仕様

### 4.1 Props定義

```typescript
interface CreateProjectModalProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: (data: CreateProjectData) => Promise<void>;
  currentUser?: {
    name: string;
    organizationGroup: string;
    organizationId: string;
  };
}

/**
 * チーム情報の型定義（/api/v1/organization-groups レスポンス）
 */
interface TeamOption {
  organizationGroupCd: string;
  organizationGroupName: string;
}
```

**Props説明:**
| Prop名 | 型 | 必須 | 説明 |
|--------|---|------|------|
| open | `boolean` | ✅ | モーダルの表示状態 |
| onCancel | `() => void` | ✅ | キャンセル時のコールバック |
| onSubmit | `(data: CreateProjectData) => Promise<void>` | ✅ | 送信時のコールバック |
| currentUser | `{ name, organizationGroup, organizationId }` | - | 現在のユーザー情報（デフォルト: テストデータ） |

### 4.2 State定義

```typescript
const [form] = Form.useForm();
const [submitting, setSubmitting] = useState(false);
const [error, setError] = useState<string | null>(null);
const [teams, setTeams] = useState<TeamOption[]>([]);
const [teamsLoading, setTeamsLoading] = useState(false);
```

**State説明:**
| State名 | 型 | 初期値 | 説明 |
|---------|---|--------|------|
| form | `FormInstance` | — | Ant Design Form インスタンス |
| submitting | `boolean` | `false` | 送信中かどうか |
| error | `string \| null` | `null` | エラーメッセージ |
| teams | `TeamOption[]` | `[]` | チーム選択肢一覧（API取得） |
| teamsLoading | `boolean` | `false` | チーム一覧取得中かどうか |

### 4.3 CreateProjectData 型定義（`@/types/project`）

```typescript
interface CreateProjectData {
  projectName: string;           // プロジェクト名
  description: string;           // 概要
  folderName: string;            // フォルダ名（自動生成）
  owner: string;                 // 所有者名
  organizationGroup: string;     // 組織グループ名
  organizationId: string;        // 組織ID
  organizationGroupCd?: string;  // チームコード（チーム選択セレクトから取得）
}
```

### 4.4 TeamOption 型定義（コンポーネント内）

```typescript
interface TeamOption {
  organizationGroupCd: string;
  organizationGroupName: string;
}
```

---

## 5. API連携

### 5.1 チーム一覧取得（コンポーネント内で直接呼び出し）

| 項目 | 内容 |
|------|------|
| メソッド | GET |
| パス | `/api/v1/organization-groups` |
| タイミング | モーダルオープン時（`open` が `true` になった際）|
| 成功時 | `teams` ステートにマッピングして設定 |
| 失敗時 | `teams` を空配列に設定し続行 |

**レスポンス型:**
```typescript
{
  success: boolean;
  data: Array<{
    organization_group_cd: string;
    organization_group_name: string;
  }>;
}
```

### 5.2 プロジェクト作成（親コンポーネント委譲）

このコンポーネントはプロジェクト作成 API を直接呼び出しません。親コンポーネント（ProjectManagement）の `onSubmit` コールバックを通じて委譲します。

**親コンポーネントでの実装:**
```typescript
const handleCreateProject = async (data: CreateProjectData) => {
  const requestData: CreateProjectRequest = {
    projectName: data.projectName,
    description: data.description || undefined,
  };
  
  await createProjectApi(requestData);
  await refetchProjects();
  message.success('プロジェクトが正常に作成されました');
};
```

---

## 6. エラーハンドリング

### 6.1 エラーケース一覧

| エラーケース | 対処方法 |
|-------------|----------|
| バリデーションエラー | フィールド下にエラーメッセージ表示 |
| API呼び出しエラー（プロジェクト作成） | Alert（error）でエラーメッセージ表示 |
| チーム一覧取得失敗 | 空のまま続行（Select が空になる）。エラーは表示しない |

---

## 7. 実装ファイル

### 7.1 メインファイル
- **パス**: `frontend/src/components/project/CreateProjectModal.tsx`
- **行数**: 261行
- **エクスポート**: `CreateProjectModal`（default export）

### 7.2 関連ファイル
- `frontend/src/types/project.ts` - `CreateProjectData` 型定義
- `frontend/src/utils/authUtils.ts` - `createApiClient`（組織グループ取得用）
- `frontend/src/contexts/LanguageContext.tsx` - 多言語対応

### 7.3 依存ライブラリ
- React 18.2.0
- Ant Design v6 (Modal, Form, Input, Select, Space, Typography, Alert, theme)
- @ant-design/icons (FolderAddOutlined)
- `@/utils/authUtils` (createApiClient)

---

## 8. 変更履歴

| 日付 | 変更内容 | 担当者 |
|------|----------|--------|
| 2026-03-11 | 実装ベースで仕様書を再作成 | Cline |
| 2026-08-23 | ソース実態に合わせて修正（チーム選択フィールド追加・Props/State/型定義更新） | Cline |
| 2026-09-09 | フィールド3重複記述を統合・「チーム」→「グループ」に修正（i18nキー: `createProject.groupLabel`/`groupPlaceholder`/`groupRequired`/`groupNote`）・Alert の `message` prop → `title` prop に修正（Ant Design v6 対応） | Cline |

---

## 9. 補足事項

### 9.1 モーダル設定

```typescript
<Modal
  title={<Space><FolderAddOutlined style={{ color: token.colorPrimary }} /><Text strong>{t('...')}</Text></Space>}
  open={open}
  onOk={handleSubmit}
  onCancel={handleCancel}
  confirmLoading={submitting}
  okText={t('common.create')}
  cancelText={t('common.cancel')}
  okButtonProps={{ 'data-testid': 'create-project-submit-button' }}
  cancelButtonProps={{ 'data-testid': 'create-project-cancel-button' }}
  width={600}
  destroyOnHidden
/>
```

### 9.2 フォームレイアウト

```typescript
<Form
  form={form}
  layout="vertical"       // 縦レイアウト
  requiredMark="optional" // 必須マークをオプション扱い
>
```

### 9.3 デフォルトユーザー情報

```typescript
currentUser = {
  name: '田中 太郎',
  organizationGroup: '材料開発部',
  organizationId: 'org_maiml_lab_001',
}
```
- 開発・テスト用のデフォルト値
- 本番環境では親コンポーネントから渡される実際のユーザー情報を使用

### 9.4 フォルダ名生成の注意点

- 日本語はすべてアンダースコアに変換される
- 英数字とハイフン、アンダースコアのみ許可
- S3キーとして使用可能な文字に制限

### 9.5 送信ボタンの状態

- **通常**: "作成"
- **送信中**: スピナー表示 + "作成"（グレーアウト）
- **送信完了**: モーダルを閉じる

### 9.6 バリデーションタイミング

- フォーム送信時（`validateFields`）
- リアルタイム文字数カウント（`showCount` / `maxLength`）
