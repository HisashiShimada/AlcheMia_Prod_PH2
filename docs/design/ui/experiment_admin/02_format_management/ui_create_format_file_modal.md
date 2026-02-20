# CreateFormatFileModal UI仕様書

## 1. 概要

### 1.1. コンポーネントの目的

新規フォーマットファイル（XML/MAIML）を作成するためのモーダルダイアログ。ファイル名、テンプレートタイプ、説明を入力して新しいフォーマットファイルを作成します。

### 1.2. 使用場面

- FormatManagement画面の「新規ファイル」ボタンクリック時
- 選択されたフォーマット内に新しいファイルを作成
- XMLファイルの場合はテンプレートタイプ（Material/Condition/Result）を選択

### 1.3. アクセス権限

- **対象ロール**: Experiment Admin（実験管理者）
- **必須認証**: JWT認証必須
- **テナント分離**: organization_id によるマルチテナント分離

---

## 2. 画面構成

### 2.1. レイアウト構造

```
┌─────────────────────────────────────────┐
│ [📄] 新規XMLファイル作成                 │
├─────────────────────────────────────────┤
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ ℹ フォーマット情報                   │ │
│ │ フォーマット: Materials             │ │
│ │ ファイルタイプ: XML                 │ │
│ │ 拡張子: .xml                        │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ファイル名 *                            │
│ ┌───────────────────────────┬─────┐    │
│ │ template1                 │ .xml│    │
│ └───────────────────────────┴─────┘    │
│ 拡張子 .xml は自動で付加されます        │
│                                         │
│ テンプレートタイプ *                    │
│ ┌───────────────────────────────────┐  │
│ │ MaterialTemplate            [▼] │  │
│ └───────────────────────────────────┘  │
│ 作成するXMLのテンプレート種別を選択     │
│                                         │
│ 概要                                    │
│ ┌───────────────────────────────────┐  │
│ │                                   │  │
│ │                                   │  │
│ │                                   │  │
│ └───────────────────────────────────┘  │
│ ファイルの目的や内容を記述してください  │
│                                         │
├─────────────────────────────────────────┤
│                    [キャンセル] [作成]  │
└─────────────────────────────────────────┘
```

### 2.2. 主要UI要素

#### 2.2.1. モーダルヘッダー

| 要素 | コンポーネント | 説明 |
|------|--------------|------|
| アイコン | FileAddOutlined | プライマリ色のファイル追加アイコン |
| タイトル | Text (strong) | 「新規XMLファイル作成」または「新規MaiMLファイル作成」 |

#### 2.2.2. 情報表示エリア（Alert）

| 項目 | 説明 |
|------|------|
| フォーマット名 | 選択中のフォーマット名 |
| ファイルタイプ | XML / MAIML（大文字） |
| 拡張子 | `.xml` または `.maiml` |

#### 2.2.3. 入力フォーム

| フィールド | 必須 | 入力タイプ | 制約 |
|----------|------|-----------|------|
| ファイル名 | ○ | Input | 1〜100文字、自動で拡張子が付加される |
| テンプレートタイプ | ○ (XML時) | Select | Material/Condition/Result |
| 概要 | × | TextArea | 最大500文字 |

#### 2.2.4. フッターボタン

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
2. formatId, formatName, fileTypeを受け取る
3. フォーマット情報をAlert（info）で表示
4. fileTypeに応じてテンプレートタイプ選択を表示/非表示

**表示条件:**
- **XMLファイル**: テンプレートタイプ選択を表示
- **MAIMLファイル**: テンプレートタイプ選択を非表示

#### 3.1.2. ファイル名入力

**処理フロー:**
1. ユーザーがファイル名を入力
2. リアルタイムで文字数カウント表示（最大100文字）
3. 入力欄の右側に拡張子を自動表示（.xml または .maiml）
4. バリデーションルール適用

**バリデーション:**
- 必須入力チェック
- 1文字以上100文字以内
- 文字数カウンター表示

**サニタイズ処理:**
- 送信時にスペース → `_` に変換
- ファイル名に使用できない文字 → `_` に変換
- 正規表現: `/[^a-zA-Z0-9_-]/g`

#### 3.1.3. テンプレートタイプ選択（XML時のみ）

**処理フロー:**
1. fileType='xml' の場合のみ表示
2. デフォルト値: 'material'
3. ドロップダウンで選択

**選択肢:**
- **MaterialTemplate**: Material（材料）テンプレート
- **ConditionTemplate**: Condition（条件）テンプレート
- **ResultTemplate**: Result（結果）テンプレート

**必須バリデーション:**
- XMLファイルの場合は必須選択

#### 3.1.4. 概要入力

**処理フロー:**
1. オプショナルな入力フィールド
2. 最大500文字
3. 文字数カウンター表示
4. 4行のTextArea

**バリデーション:**
- 最大500文字

#### 3.1.5. 作成処理

**処理フロー:**
1. 「作成」ボタンをクリック
2. フォームバリデーション実行（form.validateFields()）
3. ファイル名のサニタイズ処理
4. CreateFormatFileDataオブジェクトの生成
5. 親コンポーネントのonSubmit(data)コールバックを呼び出し
6. 成功時:
   - フォームをリセット
   - モーダルを閉じる（親コンポーネントで制御）
7. 失敗時:
   - エラーメッセージを表示（Alert error）
   - モーダルは開いたまま

**送信データ構造:**
```typescript
{
  fileName: string;              // 入力されたファイル名
  fileNameWithExtension: string; // サニタイズ+拡張子付きファイル名
  formatId: string;              // フォーマットID
  formatName: string;            // フォーマット名
  fileType: 'xml' | 'maiml';     // ファイルタイプ
  templateType?: string;         // テンプレートタイプ（XML時）
  description: string;           // 概要
  createdBy: string;             // 作成者ID
  createdByName: string;         // 作成者名
}
```

#### 3.1.6. キャンセル処理

**処理フロー:**
1. 「キャンセル」ボタンまたはモーダル外をクリック
2. フォームをリセット（form.resetFields()）
3. エラー状態をクリア
4. 親コンポーネントのonCancel()コールバックを呼び出し
5. モーダルを閉じる（親コンポーネントで制御）

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
| ファイル名 | 必須 | 「ファイル名を入力してください」 |
| ファイル名 | 1文字以上 | 「ファイル名は1文字以上で入力してください」 |
| ファイル名 | 100文字以内 | 「ファイル名は100文字以内で入力してください」 |
| テンプレートタイプ | 必須（XML時） | 「テンプレートタイプを選択してください」 |
| 概要 | 500文字以内 | 「概要は500文字以内で入力してください」 |

---

## 4. データ仕様

### 4.1. 入力項目（Props）

```typescript
interface CreateFormatFileModalProps {
  open: boolean;                      // モーダル表示状態
  onCancel: () => void;               // キャンセル時のコールバック
  onSubmit: (data: CreateFormatFileData) => Promise<void>;  // 送信時のコールバック
  formatId: string | null;            // フォーマットID
  formatName: string | null;          // フォーマット名
  fileType: 'xml' | 'maiml' | null;   // ファイルタイプ
  createdBy: string;                  // 作成者ID
  createdByName: string;              // 作成者名
}
```

### 4.2. CreateFormatFileData型定義

```typescript
interface CreateFormatFileData {
  fileName: string;              // 入力されたファイル名
  fileNameWithExtension: string; // サニタイズ+拡張子付きファイル名
  formatId: string;              // フォーマットID
  formatName: string;            // フォーマット名
  fileType: 'xml' | 'maiml';     // ファイルタイプ
  templateType?: 'material' | 'condition' | 'result';  // テンプレートタイプ（XML時）
  description: string;           // 概要
  createdBy: string;             // 作成者ID
  createdByName: string;         // 作成者名
}
```

### 4.3. フォーム値

```typescript
{
  fileName: string;       // ファイル名（拡張子なし）
  templateType?: string;  // テンプレートタイプ（XML時のみ）
  description?: string;   // 概要（オプション）
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
| 送信処理エラー | モーダル上部にAlert（error）表示 |
| ネットワークエラー | 親コンポーネントで処理（モーダルに伝播） |

### 6.2. エラーメッセージ

| メッセージ | 表示タイミング | 種類 |
|----------|--------------|------|
| 「ファイル名を入力してください」 | ファイル名未入力で送信 | validation |
| 「テンプレートタイプを選択してください」 | XML時にテンプレートタイプ未選択で送信 | validation |
| 「作成エラー」+ 詳細 | 送信処理失敗 | Alert（error） |

---

## 7. UI/UXポリシー準拠

### 7.1. Ant Designコンポーネント使用

| コンポーネント | 使用箇所 | props |
|--------------|---------|-------|
| Modal | モーダル本体 | open, onCancel, onOk, okText, cancelText, confirmLoading, width={500}, destroyOnClose |
| Form | 入力フォーム | layout="vertical", requiredMark="optional" |
| Form.Item | 各入力項目 | name, label, extra, rules, initialValue |
| Input | ファイル名入力 | placeholder, maxLength={100}, showCount, autoFocus, addonAfter |
| Select | テンプレートタイプ選択 | placeholder, options |
| Input.TextArea | 概要入力 | placeholder, maxLength={500}, showCount, rows={4} |
| Alert | 情報・エラー表示 | message, description, type, showIcon, closable |
| Space | 要素の配置 | direction="vertical", size="middle" |
| Typography.Text | テキスト表示 | strong, type="secondary" |

### 7.2. デザイントークン使用

```typescript
const { token } = theme.useToken();

// 使用例
color: token.colorPrimary  // アイコン色
```

### 7.3. 多言語対応

- `useLanguage()` カスタムフックを使用
- `t('formatManagement.create.*')` で翻訳文字列を取得
- 未翻訳時はデフォルト日本語テキストを表示

### 7.4. レスポンシブ対応

- モーダル幅: 500px（固定）
- モバイルでは自動的に幅が調整される（Ant Designのデフォルト動作）

---

## 8. 実装ファイル

### 8.1. ソースファイルパス

```
frontend/src/components/project/CreateFormatFileModal.tsx
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

### 改善提案

- [ ] ファイル名の重複チェック機能
- [ ] プレビュー機能（作成前にテンプレート構造を表示）
- [ ] テンプレート選択時のサンプル表示
- [ ] ファイル名の自動提案機能
- [ ] ドラッグ&ドロップでのテンプレートファイル取り込み
- [ ] タグ付け機能の追加

---

## 10. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2026-01-21 | 初版作成 | Cline |
