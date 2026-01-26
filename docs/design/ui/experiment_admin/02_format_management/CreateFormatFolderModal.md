# CreateFormatFolderModal UI仕様書

## 1. 概要

### 1.1. コンポーネントの目的

新規フォーマットフォルダを作成するためのモーダルダイアログ。フォルダ名を入力して、選択されたフォーマット内に新しいフォルダを作成します。

### 1.2. 使用場面

- FormatManagement画面の「新規フォルダ」ボタンクリック時
- 選択されたフォーマット内にサブフォルダを作成
- ファイル整理のための階層構造を構築

### 1.3. アクセス権限

- **対象ロール**: Experiment Admin（実験管理者）
- **必須認証**: JWT認証必須
- **テナント分離**: organization_id によるマルチテナント分離

---

## 2. 画面構成

### 2.1. レイアウト構造

```
┌─────────────────────────────────────────┐
│ [📁] 新規フォルダ作成                    │
├─────────────────────────────────────────┤
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 選択中のフォーマット: Materials      │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ フォルダ名 *                            │
│ ┌───────────────────────────────────┐  │
│ │ company_f                         │  │
│ └───────────────────────────────────┘  │
│ ℹ 半角英数字、アンダースコア、ハイフン │
│   のみ使用可能です                      │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ ℹ 注意:                              │ │
│ │ フォルダは作成後に削除できません。   │ │
│ │ 慎重に名前を決定してください。       │ │
│ └─────────────────────────────────────┘ │
│                                         │
├─────────────────────────────────────────┤
│                    [キャンセル] [作成]  │
└─────────────────────────────────────────┘
```

### 2.2. 主要UI要素

#### 2.2.1. モーダルヘッダー

| 要素 | コンポーネント | 説明 |
|------|--------------|------|
| アイコン | FolderAddOutlined | プライマリ色のフォルダ追加アイコン |
| タイトル | Text | 「新規フォルダ作成」（多言語対応） |

#### 2.2.2. フォーマット情報表示

| 項目 | 説明 |
|------|------|
| 選択中のフォーマット | 現在選択されているフォーマット名を表示 |
| スタイル | 背景色、ボーダー付きの情報ボックス |

#### 2.2.3. 入力フォーム

| フィールド | 必須 | 入力タイプ | 制約 |
|----------|------|-----------|------|
| フォルダ名 | ○ | Input | 半角英数字、アンダースコア、ハイフン、最大100文字 |

#### 2.2.4. 注意事項エリア

| 項目 | 説明 |
|------|------|
| 表示内容 | 「フォルダは作成後に削除できません。慎重に名前を決定してください。」 |
| スタイル | 情報色（colorInfoBg）の背景、ボーダー付き |

#### 2.2.5. フッターボタン

| ボタン | スタイル | 動作 |
|--------|---------|------|
| キャンセル | default | モーダルを閉じる（入力内容破棄） |
| 作成 | primary | バリデーション後に作成処理実行 |

### 2.3. 画面遷移

- 画面遷移なし
- 作成成功時はモーダルを閉じる
- 親コンポーネント（FormatManagement）のコールバックを呼び出す

---

## 3. 機能仕様

### 3.1. 主要機能の詳細

#### 3.1.1. モーダル表示

**処理フロー:**
1. 親コンポーネントからopen=trueで呼び出される
2. formatId, formatNameを受け取る
3. useEffectでモーダルが開いた際にフォームをリセット
4. フォーマット情報を表示

**初期化処理:**
```typescript
useEffect(() => {
  if (open) {
    form.resetFields();
  }
}, [open, form]);
```

#### 3.1.2. フォルダ名入力

**処理フロー:**
1. ユーザーがフォルダ名を入力
2. リアルタイムでバリデーション実行
3. 最大100文字まで入力可能

**バリデーション:**
- **必須チェック**: フォルダ名は必須
- **形式チェック**: `/^[a-zA-Z0-9_-]+$/`（半角英数字、アンダースコア、ハイフンのみ）

**ツールチップ:**
- フィールドラベルにツールチップアイコン
- 入力ルールの詳細を表示

#### 3.1.3. 作成処理

**処理フロー:**
1. 「作成」ボタンをクリック
2. フォームバリデーション実行（form.validateFields()）
3. formatIdの存在チェック
   - 存在しない場合: エラーメッセージ「フォーマットが選択されていません」
4. CreateFormatFolderDataオブジェクトの生成
5. 親コンポーネントのonSubmit(data)コールバックを呼び出し
6. 成功時:
   - フォームをリセット
   - モーダルを閉じる（親コンポーネントで制御）
7. 失敗時:
   - コンソールエラーログ
   - エラー処理は親コンポーネントで実行

**送信データ構造:**
```typescript
{
  formatId: string;   // フォーマットID
  folderName: string; // 入力されたフォルダ名
}
```

**エラーハンドリング:**
```typescript
try {
  await onSubmit(data);
} catch (error) {
  console.error('フォームバリデーションエラー:', error);
} finally {
  setSubmitting(false);
}
```

#### 3.1.4. キャンセル処理

**処理フロー:**
1. 「キャンセル」ボタンまたはモーダル外をクリック
2. フォームをリセット（form.resetFields()）
3. 親コンポーネントのonCancel()コールバックを呼び出し
4. モーダルを閉じる（親コンポーネントで制御）

### 3.2. ボタン・操作の動作

| 操作 | 動作 | 状態変更 |
|------|------|---------|
| 作成ボタンクリック | バリデーション→作成処理 | submitting=true→false |
| キャンセルボタンクリック | フォームリセット→モーダルを閉じる | - |
| モーダル外クリック | キャンセル処理 | - |
| Escキー | キャンセル処理 | - |

### 3.3. バリデーションルール

| フィールド | ルール | エラーメッセージ |
|----------|--------|----------------|
| フォルダ名 | 必須 | 「フォルダ名を入力してください」（多言語対応） |
| フォルダ名 | 半角英数字、`_`、`-` のみ | 「半角英数字、アンダースコア、ハイフンのみ使用できます」（多言語対応） |
| フォルダ名 | 100文字以内 | （maxLengthで自動制限） |

---

## 4. データ仕様

### 4.1. 入力項目（Props）

```typescript
interface CreateFormatFolderModalProps {
  open: boolean;                  // モーダル表示状態
  onCancel: () => void;           // キャンセル時のコールバック
  onSubmit: (data: CreateFormatFolderData) => Promise<void>;  // 送信時のコールバック
  formatId: string | null;        // フォーマットID
  formatName: string | null;      // フォーマット名
}
```

### 4.2. CreateFormatFolderData型定義

```typescript
interface CreateFormatFolderData {
  formatId: string;   // フォーマットID
  folderName: string; // フォルダ名
}
```

### 4.3. フォーム値

```typescript
{
  folderName: string;  // フォルダ名
}
```

---

## 5. API連携

### 5.1. 使用するAPI一覧

- なし（親コンポーネントでAPI呼び出しを実行）
- onSubmitコールバック経由でデータを渡す

---

## 6. エラーハンドリング

### 6.1. エラーケース

| エラーケース | 処理 |
|------------|------|
| バリデーションエラー | フォーム項目下にエラーメッセージ表示 |
| formatIdなし | message.error()で「フォーマットが選択されていません」 |
| 送信処理エラー | コンソールエラーログ、親コンポーネントで処理 |

### 6.2. エラーメッセージ

| メッセージ | 表示タイミング | 種類 |
|----------|--------------|------|
| 「フォルダ名を入力してください」 | フォルダ名未入力で送信 | validation |
| 「半角英数字、アンダースコア、ハイフンのみ使用できます」 | 不正な文字を含む | validation |
| 「フォーマットが選択されていません」 | formatIdがnull | message.error() |

---

## 7. UI/UXポリシー準拠

### 7.1. Ant Designコンポーネント使用

| コンポーネント | 使用箇所 | props |
|--------------|---------|-------|
| Modal | モーダル本体 | title, open, onOk, onCancel, confirmLoading, okText, cancelText, width={600}, destroyOnClose |
| Form | 入力フォーム | layout="vertical", requiredMark="optional" |
| Form.Item | フォルダ名入力項目 | label, name, rules, tooltip |
| Input | フォルダ名入力 | placeholder, maxLength={100} |
| Space | ヘッダーアイコンとテキスト | - |
| Typography.Text | テキスト表示 | strong, type="secondary" |
| message | エラー通知 | message.error() |

### 7.2. デザイントークン使用

```typescript
const { token } = theme.useToken();

// 使用例
color: token.colorPrimary              // アイコン色
marginTop: token.margin                // 上部マージン
padding: token.paddingSM               // 小さいパディング
backgroundColor: token.colorBgContainer // 背景色
borderRadius: token.borderRadius       // ボーダー半径
border: `1px solid ${token.colorBorderSecondary}` // ボーダー
fontSize: token.fontSizeSM             // 小さいフォントサイズ
marginLeft: token.marginXS             // 極小マージン
colorInfoBg: token.colorInfoBg         // 情報背景色
colorInfoBorder: token.colorInfoBorder // 情報ボーダー色
```

### 7.3. 多言語対応

- `useLanguage()` カスタムフックを使用
- `t('formatManagement.*')` で翻訳文字列を取得
- 主な翻訳キー:
  - `formatManagement.new_folder`
  - `formatManagement.selected_format`
  - `formatManagement.folder_name`
  - `formatManagement.folder_name_required`
  - `formatManagement.folder_name_format`
  - `formatManagement.folder_name_tooltip`
  - `formatManagement.folder_create_note`
  - `common.create`
  - `common.cancel`
  - `common.note`

### 7.4. レスポンシブ対応

- モーダル幅: 600px（固定）
- モバイルでは自動的に幅が調整される（Ant Designのデフォルト動作）

---

## 8. 実装ファイル

### 8.1. ソースファイルパス

```
frontend/src/components/project/CreateFormatFolderModal.tsx
```

### 8.2. 関連コンポーネント

| コンポーネント | パス | 役割 |
|--------------|------|------|
| FormatManagement | ./FormatManagement.tsx | 親コンポーネント |

### 8.3. カスタムフック

| フック | パス | 役割 |
|--------|------|------|
| useLanguage | @/contexts/LanguageContext | 多言語化 |

### 8.4. ユーティリティ

- なし

---

## 9. 既知の課題・TODO

### 注意事項

- フォルダは作成後に削除できない仕様（注意書きを表示中）
- フォルダ名は変更不可（将来的に実装予定）

### 改善提案

- [ ] フォルダ名の重複チェック機能
- [ ] フォルダ削除機能の追加（Phase 6以降）
- [ ] フォルダ名変更機能の追加
- [ ] フォルダの説明・メタデータ追加機能
- [ ] フォルダテンプレート機能（よく使うフォルダ構造の保存）
- [ ] フォルダ階層のプレビュー表示

---

## 10. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2026-01-21 | 初版作成 | Cline |
