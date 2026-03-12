# 新規サブフォルダ作成モーダル UI仕様書

## 1. 概要

### 1.1 コンポーネントの目的
新規サブフォルダ作成モーダルは、フォーマットフォルダまたはサブフォルダ配下に新しいサブフォルダを作成するためのモーダルダイアログです。フォルダ名の入力、バリデーション、階層構造の管理を行います。

### 1.2 使用場面
- **表示場所**: フォーマット管理画面のモーダルオーバーレイ
- **トリガー**: 「新規サブフォルダ作成」ボタンのクリック
- **主な用途**:
  - フォーマットフォルダ配下のサブフォルダ作成
  - サブフォルダ配下のさらなる階層作成
  - ファイルの階層管理のための構造作成

### 1.3 アクセス権限
- **必須ロール**: Experiment Admin（実験管理者）
- **認証**: 親コンポーネント（FormatManagement）で認証済み

---

## 2. 画面構成

### 2.1 モーダル構造

```
┌─────────────────────────────────────────────────┐
│ 📁 新規サブフォルダ作成                  [×]     │
├─────────────────────────────────────────────────┤
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ 選択中のフォーマット: material             │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ フォルダ名 *                                    │
│ ┌─────────────────────────────────────────────┐ │
│ │ company_f                                   │ │
│ └─────────────────────────────────────────────┘ │
│ 英数字、アンダースコア、ハイフンのみ使用可能    │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ 注意: フォルダは階層構造で作成されます     │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│                  [キャンセル]  [作成]          │
└─────────────────────────────────────────────────┘
```

### 2.2 主要UI要素

#### 2.2.1 モーダルヘッダー
- **アイコン**: FolderAddOutlined（青色）
- **タイトル**: 「新規サブフォルダ作成」

#### 2.2.2 フォーマット情報表示（条件付き）
- **表示条件**: formatNameが存在する場合
- **スタイル**: 灰色の背景、細いボーダー
- **内容**: 「選択中のフォーマット: {formatName}」

#### 2.2.3 フォルダ名入力フィールド
- **タイプ**: Input
- **バリデーション**: 
  - 必須
  - 正規表現: `/^[a-zA-Z0-9_-]+$/`（英数字、アンダースコア、ハイフンのみ）
  - 最大100文字
- **ツールチップ**: 使用方法のヒント
- **プレースホルダー**: 「company_f」

#### 2.2.4 注意事項エリア
- **スタイル**: 青い背景、青いボーダー
- **内容**: 「注意: フォルダは階層構造で作成されます」

#### 2.2.5 アクションボタン
- **キャンセルボタン**: モーダルを閉じる
- **作成ボタン**: サブフォルダ作成を実行（ローディング表示あり）

### 2.3 インタラクション

#### 2.3.1 モーダル表示
- **操作**: 「新規サブフォルダ作成」ボタンをクリック
- **結果**: モーダルが開き、フォームがリセットされる

#### 2.3.2 フォルダ名入力
- **操作**: フォルダ名を入力
- **結果**: 
  - 100文字以上は入力できない
  - 不正な文字を入力するとバリデーションエラーが表示される

#### 2.3.3 作成実行
- **操作**: 「作成」ボタンをクリック
- **結果**: 
  - バリデーションが実行される
  - 成功時: モーダルが閉じ、ファイル一覧に新しいフォルダが表示される
  - 失敗時: エラーメッセージが表示される

#### 2.3.4 キャンセル
- **操作**: 「キャンセル」ボタンまたは×ボタンをクリック
- **結果**: 
  - フォームがリセットされる
  - モーダルが閉じる

---

## 3. 機能仕様

### 3.1 フォルダ名バリデーション

#### 3.1.1 必須チェック

```typescript
{
  required: true,
  message: 'フォルダ名を入力してください',
}
```

#### 3.1.2 正規表現パターンチェック

```typescript
{
  pattern: /^[a-zA-Z0-9_-]+$/,
  message: '英数字、アンダースコア、ハイフンのみ使用できます',
}
```

- **許可される文字**:
  - 英字（大文字・小文字）: `a-zA-Z`
  - 数字: `0-9`
  - アンダースコア: `_`
  - ハイフン: `-`
- **禁止される文字**:
  - スペース
  - 日本語文字
  - 特殊記号（`@`, `#`, `$`, `%` など）

#### 3.1.3 UI動作
- ユーザー操作: 「作成」ボタンをクリック
- 画面変化: 
  - バリデーションエラーがある場合、フィールド下部に赤いエラーメッセージが表示される
  - すべてのバリデーションが通過すると、送信処理が実行される

### 3.2 フォルダ作成処理

#### 3.2.1 送信ハンドラ

```typescript
const handleSubmit = async () => {
  try {
    const values = await form.validateFields();
    
    if (!formatId) {
      message.error('フォーマットが選択されていません');
      return;
    }

    setSubmitting(true);

    const data: CreateFormatFolderData = {
      formatId,
      folderName: values.folderName,
      currentPath: currentPath.length > 0 ? currentPath.join('/') : undefined,
    };

    await onSubmit(data);
    form.resetFields();
  } catch (error) {
    console.error('フォームバリデーションエラー:', error);
  } finally {
    setSubmitting(false);
  }
};
```

#### 3.2.2 データ構造

```typescript
const data: CreateFormatFolderData = {
  formatId,                                                      // フォーマットID
  folderName: values.folderName,                                // ユーザー入力のフォルダ名
  currentPath: currentPath.length > 0 ? currentPath.join('/') : undefined, // 現在のパス
};
```

**例:**
- フォーマットフォルダ直下に作成する場合:
  ```json
  {
    "formatId": "material",
    "folderName": "company_f",
    "currentPath": undefined
  }
  ```
- サブフォルダ配下に作成する場合:
  ```json
  {
    "formatId": "material",
    "folderName": "subfolder2",
    "currentPath": "subfolder1"
  }
  ```

#### 3.2.3 UI動作
- ユーザー操作: 「作成」ボタンをクリック
- 画面変化: 
  - ボタンがローディング状態になる
  - formatIdがnullの場合、エラーメッセージが表示される
  - 成功時: モーダルが閉じ、フォームがリセットされる
  - 失敗時: エラーメッセージが表示される

### 3.3 フォーム自動リセット

#### 3.3.1 モーダル表示時のリセット

```typescript
useEffect(() => {
  if (open) {
    form.resetFields();
  }
}, [open, form]);
```

- **目的**: モーダルが開くたびにフォームを初期状態に戻す
- **タイミング**: `open`プロパティが`true`になった時

#### 3.3.2 UI動作
- ユーザー操作: モーダルを開く
- 画面変化: 
  - フォームフィールドがクリアされる
  - 前回入力した内容が残らない

### 3.4 キャンセル処理

#### 3.4.1 キャンセルハンドラ

```typescript
const handleCancel = () => {
  form.resetFields();
  onCancel();
};
```

#### 3.4.2 UI動作
- ユーザー操作: 「キャンセル」ボタンまたは×ボタンをクリック
- 画面変化: 
  - フォームがリセットされる
  - モーダルが閉じる

---

## 4. データ仕様

### 4.1 Props定義

```typescript
interface CreateFormatFolderModalProps {
  open: boolean;                                      // モーダル表示状態
  onCancel: () => void;                               // キャンセル時のコールバック
  onSubmit: (data: CreateFormatFolderData) => Promise<void>; // 送信時のコールバック
  formatId: string | null;                            // フォーマットID
  formatName: string | null;                          // フォーマット名
  currentPath?: string[];                             // 現在のフォルダパス（サブフォルダ階層）
}
```

**Props説明:**
| Prop名 | 型 | 必須 | 説明 |
|--------|---|------|------|
| open | boolean | ✅ | モーダルの表示状態（true=表示、false=非表示） |
| onCancel | () => void | ✅ | キャンセル時に呼び出されるコールバック関数 |
| onSubmit | (data: CreateFormatFolderData) => Promise<void> | ✅ | 送信時に呼び出されるコールバック関数（非同期） |
| formatId | string \| null | ✅ | フォーマットのID |
| formatName | string \| null | ✅ | フォーマットの名前（表示用） |
| currentPath | string[] | - | 現在のフォルダパス（配列形式、例: `['subfolder1', 'subfolder2']`） |

### 4.2 CreateFormatFolderData型定義

```typescript
export interface CreateFormatFolderData {
  formatId: string;         // フォーマットID
  folderName: string;       // ユーザー入力のフォルダ名
  currentPath?: string;     // 現在のパス（スラッシュ区切り文字列）
}
```

**CreateFormatFolderData説明:**
| フィールド名 | 型 | 必須 | 説明 |
|------------|---|------|------|
| formatId | string | ✅ | フォーマットのID（親フォルダの識別子） |
| folderName | string | ✅ | 作成するフォルダの名前（英数字・アンダースコア・ハイフンのみ） |
| currentPath | string | - | 現在のフォルダパス（スラッシュ区切り、例: `subfolder1/subfolder2`） |

### 4.3 State定義

```typescript
const [submitting, setSubmitting] = useState(false);  // 送信中フラグ
const [form] = Form.useForm();                        // Ant Design Form インスタンス
```

**State説明:**
| State名 | 型 | 説明 |
|---------|---|------|
| submitting | boolean | 送信処理中かどうか（true=送信中、ボタンがローディング状態になる） |
| form | FormInstance | Ant Design Formのインスタンス（バリデーションとリセットに使用） |

---

## 5. API連携

このコンポーネントは直接APIを呼び出しません。
親コンポーネント（FormatManagement）の`onSubmit`コールバックを呼び出し、親コンポーネントがAPI通信を行います。

### 5.1 呼び出されるAPI（親コンポーネント経由）

**想定されるAPI:**
- **POST** `/api/v1/experiment_admin/formats/{formatId}/folders`
  - サブフォルダ作成API
  - リクエストボディ: `CreateFormatFolderData`
  - レスポンス: 作成されたフォルダ情報

---

## 6. エラーハンドリング

### 6.1 エラーケースと表示方法

| エラーケース | 検知タイミング | 表示方法 | 表示内容 |
|------------|------------|---------|---------|
| フォルダ名未入力 | バリデーション時 | フィールド下部 | 「フォルダ名を入力してください」 |
| フォルダ名が不正な文字 | バリデーション時 | フィールド下部 | 「英数字、アンダースコア、ハイフンのみ使用できます」 |
| フォーマット未選択 | 送信時 | Ant Design Message | 「フォーマットが選択されていません」 |
| フォルダ名重複 | API返却時 | （親コンポーネントで処理） | APIから返却されたエラーメッセージ |
| API通信エラー | API返却時 | （親コンポーネントで処理） | APIから返却されたエラーメッセージ |

### 6.2 エラー回復方法

- **バリデーションエラー**: ユーザーが入力を修正
- **フォーマット未選択**: ユーザーがフォーマットを選択してから再試行
- **重複エラー**: ユーザーがフォルダ名を変更
- **API通信エラー**: ユーザーが再試行またはキャンセル

---

## 7. 実装ファイル

### 7.1 ファイルパス
- **メインファイル**: `frontend/src/components/project/CreateFormatFolderModal.tsx`

### 7.2 関連ファイル
- **親コンポーネント**: `frontend/src/components/project/FormatManagement.tsx`
- **コンテキスト**: `frontend/src/contexts/LanguageContext.tsx`
- **型定義**: このファイル内で定義・export（CreateFormatFolderData型）

### 7.3 依存ライブラリ
- **Ant Design**:
  - Modal
  - Form
  - Input
  - Space
  - Typography (Text)
  - theme
  - message
- **Ant Design Icons**:
  - FolderAddOutlined
- **Context**:
  - useLanguage（多言語対応）

### 7.4 親子関係

```
FormatManagement (親)
  ↓ Props: open, onCancel, onSubmit, formatId, formatName, currentPath
CreateFormatFolderModal (このコンポーネント)
```

**親コンポーネントから受け取るデータ:**
- モーダル表示状態
- フォーマット情報（ID、名前）
- 現在のフォルダパス

**親コンポーネントへの通知:**
- キャンセルイベント（`onCancel()`）
- 送信イベント（`onSubmit(data)`）

---

## 8. UI/UXの考慮事項

### 8.1 レスポンシブデザイン

- **幅**: 600px（固定）
- **高さ**: コンテンツに応じて可変

### 8.2 アクセシビリティ

- **キーボード操作**: Enterキーで送信、Escキーでキャンセル
- **エラーメッセージ**: 明確で具体的なメッセージ
- **ツールチップ**: 使用方法のヒントを提供

### 8.3 視覚的フィードバック

#### 8.3.1 ローディング状態
- 送信中は「作成」ボタンがローディング表示
- モーダルは閉じられない（confirmLoadingで制御）

#### 8.3.2 エラー表示
- **フィールドエラー**: 赤い枠線 + 下部に赤いエラーメッセージ
- **一般エラー**: Ant Design Messageで画面上部に表示

#### 8.3.3 情報表示
- **フォーマット情報**: 灰色の背景ボックスで目立たせる
- **注意事項**: 青い背景ボックスで目立たせる

### 8.4 ユーザーガイダンス

- **プレースホルダー**: 「company_f」（命名例を示す）
- **ツールチップ**: フォルダ名のルールを説明
- **注意事項**: 階層構造について説明

### 8.5 フォーム自動リセット

- **モーダル表示時**: フォームが自動的にリセットされる
- **送信成功時**: フォームが自動的にリセットされる
- **キャンセル時**: フォームが自動的にリセットされる

### 8.6 多言語対応

- **LanguageContext**: `useLanguage`フックを使用
- **翻訳キー**:
  - `formatManagement.new_folder`
  - `formatManagement.selected_format`
  - `formatManagement.folder_name`
  - `formatManagement.folder_name_required`
  - `formatManagement.folder_name_format`
  - `formatManagement.folder_name_tooltip`
  - `formatManagement.folder_create_note`
  - など

---

## 9. 使用例

### 9.1 フォーマットフォルダ直下にサブフォルダを作成

```typescript
// 親コンポーネントでの呼び出し
<CreateFormatFolderModal
  open={isCreateFolderModalOpen}
  onCancel={() => setIsCreateFolderModalOpen(false)}
  onSubmit={handleCreateFolder}
  formatId="material"
  formatName="material"
  currentPath={[]}
/>
```

**結果のS3パス:**
```
{organization_id}/formats/{department_cd}/material/company_f/
```

### 9.2 サブフォルダ配下にさらにサブフォルダを作成

```typescript
// 親コンポーネントでの呼び出し
<CreateFormatFolderModal
  open={isCreateFolderModalOpen}
  onCancel={() => setIsCreateFolderModalOpen(false)}
  onSubmit={handleCreateFolder}
  formatId="material"
  formatName="material"
  currentPath={['company_f', 'subfolder1']}
/>
```

**結果のS3パス:**
```
{organization_id}/formats/{department_cd}/material/company_f/subfolder1/subfolder2/
```

---

## 10. 変更履歴

| 日付 | 変更内容 | 担当者 |
|------|----------|--------|
| 2026-03-11 | 実装ベースで仕様書を作成（Phase 4: フォーマット管理画面） | Cline |
