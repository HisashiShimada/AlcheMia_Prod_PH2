# テキストボックス属性一覧表

## 概要

このドキュメントは、MaiML Viewerの全画面で使用されているテキストボックス（Input、TextArea、Select等）の属性を一覧化したものです。

**対象コンポーネント:**
- Ant Design Input
- Ant Design Input.TextArea
- Ant Design Input.Password
- Ant Design Input.Search
- Ant Design Select
- Ant Design InputNumber

**最終更新日:** 2024-12-24

---

## 1. ログイン画面（LoginPage）

### 1.1 ユーザー名入力

| 属性 | 値 | 説明 |
|------|-----|------|
| **コンポーネント** | `Input` | 標準テキスト入力 |
| **id** | `username` | HTML ID属性 |
| **name** | `username` | フォーム送信時の名前 |
| **size** | `large` | 大きいサイズ（40px高さ） |
| **placeholder** | `"ユーザー名を入力"` | プレースホルダーテキスト |
| **value** | `username` (state) | 入力値（制御コンポーネント） |
| **onChange** | `(e) => setUsername(e.target.value)` | 変更ハンドラ |
| **disabled** | `loading` | ログイン処理中は無効化 |
| **status** | `validationError && !username.trim() ? 'error' : ''` | エラー状態の視覚表示 |
| **autoComplete** | `"username"` | ブラウザのオートコンプリート |
| **autoFocus** | `true` | ページ表示時に自動フォーカス |

### 1.2 パスワード入力

| 属性 | 値 | 説明 |
|------|-----|------|
| **コンポーネント** | `Input.Password` | パスワード専用入力 |
| **id** | `password` | HTML ID属性 |
| **name** | `password` | フォーム送信時の名前 |
| **size** | `large` | 大きいサイズ（40px高さ） |
| **placeholder** | `"パスワードを入力"` | プレースホルダーテキスト |
| **value** | `password` (state) | 入力値（制御コンポーネント） |
| **onChange** | `(e) => setPassword(e.target.value)` | 変更ハンドラ |
| **disabled** | `loading` | ログイン処理中は無効化 |
| **status** | `validationError && !password ? 'error' : ''` | エラー状態の視覚表示 |
| **autoComplete** | `"current-password"` | ブラウザのオートコンプリート |
| **iconRender** | `(visible) => visible ? <EyeOutlined /> : <EyeInvisibleOutlined />` | 表示/非表示アイコンのカスタマイズ |

---

## 2. プロジェクト管理画面

### 2.1 プロジェクト作成モーダル - プロジェクト名

| 属性 | 値 | 説明 |
|------|-----|------|
| **コンポーネント** | `Input` | 標準テキスト入力 |
| **placeholder** | `"プロジェクト名を入力"` | プレースホルダーテキスト |
| **maxLength** | `100` | 最大文字数 |
| **showCount** | `true` | 文字数カウンターを表示 |
| **autoFocus** | `true` | モーダル表示時に自動フォーカス |
| **Form.Item rules** | `[{ required: true }, { min: 3 }, { max: 100 }]` | バリデーションルール |

### 2.2 プロジェクト作成モーダル - 概要

| 属性 | 値 | 説明 |
|------|-----|------|
| **コンポーネント** | `Input.TextArea` | 複数行テキスト入力 |
| **placeholder** | `"プロジェクトの概要を入力（任意）"` | プレースホルダーテキスト |
| **maxLength** | `500` | 最大文字数 |
| **showCount** | `true` | 文字数カウンターを表示 |
| **rows** | `4` | 表示行数 |
| **Form.Item rules** | `[{ max: 500 }]` | バリデーションルール |

### 2.3 プロジェクト検索 - 検索テキスト

| 属性 | 値 | 説明 |
|------|-----|------|
| **コンポーネント** | `Input.Search` | 検索専用入力 |
| **placeholder** | `"プロジェクト名で検索"` | プレースホルダーテキスト |
| **value** | `searchQuery` (state) | 検索クエリ（制御コンポーネント） |
| **onChange** | `(e) => setSearchQuery(e.target.value)` | 変更ハンドラ |
| **style** | `{ width: 250 }` | 幅の指定 |
| **allowClear** | `true` | クリアボタンを表示 |

### 2.4 プロジェクト検索モーダル - 属性選択

| 属性 | 値 | 説明 |
|------|-----|------|
| **コンポーネント** | `Select` | ドロップダウン選択 |
| **placeholder** | `"属性を選択"` | プレースホルダーテキスト |
| **value** | `criteria.attribute \|\| undefined` | 選択値 |
| **onChange** | `(value) => updateSearchCriteria(index, 'attribute', value)` | 変更ハンドラ |
| **style** | `{ width: 280 }` | 幅の指定 |
| **allowClear** | `true` | クリアボタンを表示 |

### 2.5 プロジェクト検索モーダル - 値入力

| 属性 | 値 | 説明 |
|------|-----|------|
| **コンポーネント** | `Input` | 標準テキスト入力 |
| **placeholder** | `"値を入力"` | プレースホルダーテキスト |
| **value** | `criteria.value` | 入力値（制御コンポーネント） |
| **onChange** | `(e) => updateSearchCriteria(index, 'value', e.target.value)` | 変更ハンドラ |
| **style** | `{ flex: 1 }` | フレックスレイアウト |

---

## 3. フォーマット管理画面

### 3.1 フォーマットファイル作成モーダル - ファイル名

| 属性 | 値 | 説明 |
|------|-----|------|
| **コンポーネント** | `Input` | 標準テキスト入力 |
| **placeholder** | `"ファイル名を入力"` | プレースホルダーテキスト |
| **maxLength** | `100` | 最大文字数 |
| **showCount** | `true` | 文字数カウンターを表示 |
| **autoFocus** | `true` | モーダル表示時に自動フォーカス |
| **addonAfter** | `extension` (例: `.xml`, `.maiml`) | 入力欄の後ろに拡張子を表示 |
| **Form.Item rules** | `[{ required: true }, { min: 1 }, { max: 100 }]` | バリデーションルール |
| **Form.Item extra** | `"拡張子 {extension} は自動で付加されます"` | 補足説明 |

### 3.2 フォーマットファイル作成モーダル - 概要

| 属性 | 値 | 説明 |
|------|-----|------|
| **コンポーネント** | `Input.TextArea` | 複数行テキスト入力 |
| **placeholder** | `"ファイルの概要を入力（オプション）"` | プレースホルダーテキスト |
| **maxLength** | `500` | 最大文字数 |
| **showCount** | `true` | 文字数カウンターを表示 |
| **rows** | `4` | 表示行数 |
| **Form.Item rules** | `[{ max: 500 }]` | バリデーションルール |
| **Form.Item extra** | `"ファイルの目的や内容を記述してください"` | 補足説明 |

### 3.3 フォーマット検索 - 検索テキスト

| 属性 | 値 | 説明 |
|------|-----|------|
| **コンポーネント** | `Input.Search` | 検索専用入力 |
| **placeholder** | `"フォーマット名で検索"` | プレースホルダーテキスト |
| **value** | `searchText` (state) | 検索クエリ（制御コンポーネント） |
| **onChange** | `(e) => setSearchQuery(e.target.value)` | 変更ハンドラ |
| **style** | `{ width: 250 }` | 幅の指定 |
| **allowClear** | `true` | クリアボタンを表示 |

### 3.4 フォーマット検索モーダル - 属性・値入力

| 属性 | 値 | 説明 |
|------|-----|------|
| **属性選択** | `Select` | ドロップダウン選択（プロジェクト検索と同様） |
| **値入力** | `Input` | 標準テキスト入力（プロジェクト検索と同様） |

---

## 4. システム管理画面（ユーザー管理）

### 4.1 ユーザー検索 - 検索テキスト

| 属性 | 値 | 説明 |
|------|-----|------|
| **コンポーネント** | `Input` | 標準テキスト入力 |
| **placeholder** | `"ユーザー名、ユーザーID、メールアドレスで検索"` | プレースホルダーテキスト |
| **prefix** | `<SearchOutlined />` | 検索アイコンを前に表示 |
| **value** | `searchText` (state) | 検索クエリ（制御コンポーネント） |
| **onChange** | `(e) => setSearchText(e.target.value)` | 変更ハンドラ |
| **allowClear** | `true` | クリアボタンを表示 |

### 4.2 ユーザー検索 - 所属部署フィルター

| 属性 | 値 | 説明 |
|------|-----|------|
| **コンポーネント** | `Select` | ドロップダウン選択 |
| **placeholder** | `"所属部署"` | プレースホルダーテキスト |
| **value** | `selectedDepartment \|\| undefined` | 選択値 |
| **onChange** | `(value) => setSelectedDepartment(value \|\| '')` | 変更ハンドラ |
| **allowClear** | `true` | クリアボタンを表示 |
| **style** | `{ width: '100%' }` | 幅の指定 |
| **options** | 動的生成（部署リスト） | 選択肢 |

### 4.3 ユーザー検索 - 二段階認証フィルター

| 属性 | 値 | 説明 |
|------|-----|------|
| **コンポーネント** | `Select` | ドロップダウン選択 |
| **placeholder** | `"二段階認証"` | プレースホルダーテキスト |
| **value** | `selectedTwoFactorAuth \|\| undefined` | 選択値 |
| **onChange** | `(value) => setSelectedTwoFactorAuth(value \|\| '')` | 変更ハンドラ |
| **allowClear** | `true` | クリアボタンを表示 |
| **style** | `{ width: '100%' }` | 幅の指定 |
| **options** | `[{ label: '済', value: '済' }, { label: '未', value: '未' }]` | 選択肢 |

### 4.4 ユーザー検索 - ロールフィルター

| 属性 | 値 | 説明 |
|------|-----|------|
| **コンポーネント** | `Select` | ドロップダウン選択 |
| **placeholder** | `"ロール"` | プレースホルダーテキスト |
| **value** | `selectedRole \|\| undefined` | 選択値 |
| **onChange** | `(value) => setSelectedRole(value \|\| '')` | 変更ハンドラ |
| **allowClear** | `true` | クリアボタンを表示 |
| **style** | `{ width: '100%' }` | 幅の指定 |
| **options** | `roles` 配列 | 選択肢 |

### 4.5 ユーザー編集モーダル - 姓

| 属性 | 値 | 説明 |
|------|-----|------|
| **コンポーネント** | `Input` | 標準テキスト入力 |
| **placeholder** | `"山田"` | プレースホルダーテキスト |
| **Form.Item rules** | `[{ required: true, message: '姓を入力してください' }]` | バリデーションルール |

### 4.6 ユーザー編集モーダル - 名

| 属性 | 値 | 説明 |
|------|-----|------|
| **コンポーネント** | `Input` | 標準テキスト入力 |
| **placeholder** | `"太郎"` | プレースホルダーテキスト |
| **Form.Item rules** | `[{ required: true, message: '名を入力してください' }]` | バリデーションルール |

### 4.7 ユーザー編集モーダル - ユーザーID

| 属性 | 値 | 説明 |
|------|-----|------|
| **コンポーネント** | `Input` | 標準テキスト入力 |
| **placeholder** | `"example@company.com"` | プレースホルダーテキスト |
| **Form.Item rules** | `[{ required: true }, { type: 'email' }]` | バリデーションルール（メール形式） |

### 4.8 ユーザー編集モーダル - メールアドレス

| 属性 | 値 | 説明 |
|------|-----|------|
| **コンポーネント** | `Input` | 標準テキスト入力 |
| **placeholder** | `"example@company.com"` | プレースホルダーテキスト |
| **Form.Item rules** | `[{ required: true }, { type: 'email' }]` | バリデーションルール（メール形式） |

### 4.9 ユーザー編集モーダル - 所属部署

| 属性 | 値 | 説明 |
|------|-----|------|
| **コンポーネント** | `Input` | 標準テキスト入力 |
| **placeholder** | `"A"` | プレースホルダーテキスト |
| **Form.Item rules** | `[{ required: true, message: '所属部署を入力してください' }]` | バリデーションルール |

### 4.10 ユーザー編集モーダル - 二段階認証

| 属性 | 値 | 説明 |
|------|-----|------|
| **コンポーネント** | `Select` | ドロップダウン選択 |
| **options** | `[{ value: '済', label: '済' }, { value: '未', label: '未' }]` | 選択肢 |
| **Form.Item rules** | `[{ required: true }]` | バリデーションルール |

### 4.11 ユーザー編集モーダル - ロール

| 属性 | 値 | 説明 |
|------|-----|------|
| **コンポーネント** | `Select` | ドロップダウン選択 |
| **options** | `roles` 配列（システム管理者、データ管理者など） | 選択肢 |
| **Form.Item rules** | `[{ required: true, message: 'ロールを選択してください' }]` | バリデーションルール |

### 4.12 ユーザー編集モーダル - 状態

| 属性 | 値 | 説明 |
|------|-----|------|
| **コンポーネント** | `Select` | ドロップダウン選択 |
| **options** | `[{ value: false, label: 'アクティブ' }, { value: true, label: '非アクティブ' }]` | 選択肢 |
| **Form.Item valuePropName** | `"checked"` | チェックボックス用のプロパティ名 |

---

## 5. ビューア画面（Document編集）

### 5.1 Document ID

| 属性 | 値 | 説明 |
|------|-----|------|
| **コンポーネント** | `Input` | 標準テキスト入力 |
| **placeholder** | `"document_001"` | プレースホルダーテキスト |
| **Form.Item rules** | `[{ required: true, message: 'IDは必須です' }]` | バリデーションルール |

### 5.2 Document名

| 属性 | 値 | 説明 |
|------|-----|------|
| **コンポーネント** | `Input` | 標準テキスト入力 |
| **placeholder** | `"実験名"` | プレースホルダーテキスト |
| **Form.Item rules** | `[{ required: true, message: '名前は必須です' }]` | バリデーションルール |

### 5.3 説明

| 属性 | 値 | 説明 |
|------|-----|------|
| **コンポーネント** | `Input.TextArea` | 複数行テキスト入力 |
| **placeholder** | `"Documentの説明を入力"` | プレースホルダーテキスト |
| **rows** | `3` | 表示行数 |

### 5.4 日付

| 属性 | 値 | 説明 |
|------|-----|------|
| **コンポーネント** | `Input` + `Button` | 読み取り専用入力+ボタン |
| **readOnly** | `true` | 編集不可 |
| **Space.Compact** | 使用 | ボタンと一体化したレイアウト |
| **ボタン** | 現在時刻設定ボタン | 自動で現在時刻を設定 |

### 5.5 Creator ID / Name

| 属性 | 値 | 説明 |
|------|-----|------|
| **コンポーネント** | `Input` | 標準テキスト入力 |
| **placeholder (ID)** | `"Creator"` | プレースホルダーテキスト |
| **placeholder (Name)** | `"作成者名"` | プレースホルダーテキスト |
| **Form.Item rules (ID)** | `[{ required: true, message: 'Creator IDは必須です' }]` | バリデーションルール |

### 5.6 Vendor ID / Name

| 属性 | 値 | 説明 |
|------|-----|------|
| **コンポーネント** | `Input` | 標準テキスト入力 |
| **placeholder (ID)** | `"Vendor"` | プレースホルダーテキスト |
| **placeholder (Name)** | `"ベンダー名"` | プレースホルダーテキスト |
| **Form.Item rules (ID)** | `[{ required: true, message: 'Vendor IDは必須です' }]` | バリデーションルール |

---

## 6. 実験作業者画面（作業指示）

### 6.1 作業者選択

| 属性 | 値 | 説明 |
|------|-----|------|
| **コンポーネント** | `Select` | ドロップダウン選択 |
| **placeholder** | `"割り当てなし（チェックアウトのみ）"` | プレースホルダーテキスト |
| **value** | `selectedWorkerId \|\| undefined` | 選択値 |
| **onChange** | `setSelectedWorkerId` | 変更ハンドラ |
| **disabled** | `submitting` | 送信中は無効化 |
| **style** | `{ width: '100%' }` | 幅の指定 |
| **allowClear** | `true` | クリアボタンを表示 |

### 6.2 タスク名

| 属性 | 値 | 説明 |
|------|-----|------|
| **コンポーネント** | `Input` | 標準テキスト入力 |
| **placeholder** | `"タスク名を入力"` | プレースホルダーテキスト |
| **value** | `taskName` (state) | 入力値（制御コンポーネント） |
| **onChange** | `(e) => setTaskName(e.target.value)` | 変更ハンドラ |
| **disabled** | `submitting` | 送信中は無効化 |
| **maxLength** | `100` | 最大文字数 |
| **showCount** | `true` | 文字数カウンターを表示 |
| **style** | `{ width: '100%' }` | 幅の指定 |

### 6.3 試行回数

| 属性 | 値 | 説明 |
|------|-----|------|
| **コンポーネント** | `Input` | 数値入力（type="number"） |
| **type** | `"number"` | 数値専用 |
| **placeholder** | `"試行回数を入力"` | プレースホルダーテキスト |
| **value** | `trialCount` (state) | 入力値（制御コンポーネント） |
| **onChange** | カスタムハンドラ（1〜999の範囲制限） | 変更ハンドラ |
| **disabled** | `submitting` | 送信中は無効化 |
| **min** | `1` | 最小値 |
| **max** | `999` | 最大値 |
| **style** | `{ width: '100%' }` | 幅の指定 |

### 6.4 指示対象範囲（固定値）

| 属性 | 値 | 説明 |
|------|-----|------|
| **コンポーネント** | `Input` | 標準テキスト入力 |
| **value** | `"実験全体への指示"` | 固定値 |
| **disabled** | `true` | 常に無効（編集不可） |
| **style** | `{ width: '100%' }` | 幅の指定 |

### 6.5 優先度選択

| 属性 | 値 | 説明 |
|------|-----|------|
| **コンポーネント** | `Select` | ドロップダウン選択 |
| **value** | `instruction.priority` | 選択値 |
| **onChange** | `(value) => handleUpdateInstruction(id, 'priority', value)` | 変更ハンドラ |
| **disabled** | `submitting` | 送信中は無効化 |
| **style** | `{ width: '100%' }` | 幅の指定 |
| **options** | 高、中、通常、低 | 選択肢 |

### 6.6 指示タイプ選択

| 属性 | 値 | 説明 |
|------|-----|------|
| **コンポーネント** | `Select` | ドロップダウン選択 |
| **value** | `instruction.type` | 選択値 |
| **onChange** | `(value) => handleUpdateInstruction(id, 'type', value)` | 変更ハンドラ |
| **disabled** | `submitting` | 送信中は無効化 |
| **style** | `{ width: '100%' }` | 幅の指定 |
| **options** | 一般、セットアップ、測定、安全、清掃 | 選択肢 |

### 6.7 対象トランジション選択

| 属性 | 値 | 説明 |
|------|-----|------|
| **コンポーネント** | `Select` | ドロップダウン選択 |
| **value** | `instruction.transitionId \|\| undefined` | 選択値 |
| **onChange** | `(value) => handleUpdateInstruction(id, 'transitionId', value)` | 変更ハンドラ |
| **disabled** | `submitting \|\| loadingTransitions \|\| availableTransitions.length === 0` | 条件による無効化 |
| **placeholder** | `"トランジションを選択..."` | プレースホルダーテキスト |
| **style** | `{ width: '100%' }` | 幅の指定 |
| **loading** | `loadingTransitions` | ローディング状態 |

### 6.8 指示内容

| 属性 | 値 | 説明 |
|------|-----|------|
| **コンポーネント** | `Input.TextArea` | 複数行テキスト入力 |
| **value** | `instruction.content` | 入力値（制御コンポーネント） |
| **onChange** | `(e) => handleUpdateInstruction(id, 'content', e.target.value)` | 変更ハンドラ |
| **placeholder** | 動的（対象によって変化） | プレースホルダーテキスト |
| **disabled** | `submitting` | 送信中は無効化 |
| **rows** | `4` | 表示行数 |
| **showCount** | `true` | 文字数カウンターを表示 |
| **maxLength** | `1000` | 最大文字数 |

---

## 7. 実験作業者画面（その他）

### 7.1 プロジェクト選択（ProjectSelector）

| 属性 | 値 | 説明 |
|------|-----|------|
| **コンポーネント** | `Select` | ドロップダウン選択 |
| **placeholder** | `"プロジェクトを選択"` | プレースホルダーテキスト |
| **value** | `selectedProjectId` | 選択値 |
| **onChange** | `onSelectProject` | 変更ハンドラ |
| **allowClear** | `true` | クリアボタンを表示 |

### 7.2 タスク検索（TaskListTable）

| 属性 | 値 | 説明 |
|------|-----|------|
| **コンポーネント** | `Input.Search` | 検索専用入力 |
| **placeholder** | `"タスク名で検索"` | プレースホルダーテキスト |
| **value** | `searchText` (state) | 検索クエリ（制御コンポーネント） |
| **onChange** | `(e) => setSearchText(e.target.value)` | 変更ハンドラ |
| **allowClear** | `true` | クリアボタンを表示 |

### 7.3 タスク名フィルター（TaskListTable）

| 属性 | 値 | 説明 |
|------|-----|------|
| **コンポーネント** | `Select` | ドロップダウン選択 |
| **placeholder** | `"タスク名で絞り込み"` | プレースホルダーテキスト |
| **value** | `selectedTaskName` | 選択値 |
| **onChange** | `(value) => setSelectedTaskName(value)` | 変更ハンドラ |
| **allowClear** | `true` | クリアボタンを表示 |

### 7.4 ステータスフィルター（TaskListTable）

| 属性 | 値 | 説明 |
|------|-----|------|
| **コンポーネント** | `Select` | ドロップダウン選択 |
| **placeholder** | `"ステータスで絞り込み"` | プレースホルダーテキスト |
| **value** | `selectedStatus` | 選択値 |
| **onChange** | `(value) => setSelectedStatus(value as TaskStatus)` | 変更ハンドラ |
| **allowClear** | `true` | クリアボタンを表示 |

### 7.5 進捗報告 - 検索テキスト

| 属性 | 値 | 説明 |
|------|-----|------|
| **コンポーネント** | `Input.Search` | 検索専用入力 |
| **placeholder** | `"検索"` | プレースホルダーテキスト |
| **value** | `searchText` (state) | 検索クエリ（制御コンポーネント） |
| **onChange** | `(e) => setSearchText(e.target.value)` | 変更ハンドラ |
| **allowClear** | `true` | クリアボタンを表示 |

### 7.6 進捗報告 - トランジション名フィルター

| 属性 | 値 | 説明 |
|------|-----|------|
| **コンポーネント** | `Select` | ドロップダウン選択 |
| **placeholder** | `"トランジション名で絞り込み"` | プレースホルダーテキスト |
| **value** | `selectedTransitionName` | 選択値 |
| **onChange** | `(value) => setSelectedTransitionName(value)` | 変更ハンドラ |
| **allowClear** | `true` | クリアボタンを表示 |

### 7.7 進捗報告 - ステータスフィルター

| 属性 | 値 | 説明 |
|------|-----|------|
| **コンポーネント** | `Select` | ドロップダウン選択 |
| **placeholder** | `"ステータスで絞り込み"` | プレースホルダーテキスト |
| **value** | `selectedStatus` | 選択値 |
| **onChange** | `(value) => setSelectedStatus(value as ProgressStatus)` | 変更ハンドラ |
| **allowClear** | `true` | クリアボタンを表示 |

### 7.8 データ記録ダイアログ - プロパティ入力

| 属性 | 値 | 説明 |
|------|-----|------|
| **コンポーネント** | `Input` | 標準テキスト入力 |
| **placeholder** | `"{property.label}を入力"` | 動的プレースホルダー |
| **Form.Item** | Ant Design Form使用 | フォームアイテム内 |

---

## 8. 進捗監視画面

### 8.1 タスクID選択

| 属性 | 値 | 説明 |
|------|-----|------|
| **コンポーネント** | `Input.Search` | 検索専用入力 |
| **placeholder** | `"タスクIDで検索"` | プレースホルダーテキスト |
| **value** | `selectedTaskId \|\| ''` | 検索値 |
| **onChange** | `(e) => setSearchText(e.target.value)` | 変更ハンドラ |
| **style** | `{ width: 300 }` | 幅の指定 |

### 8.2 メソッドフィルター（WorkProgressDetailDialog）

| 属性 | 値 | 説明 |
|------|-----|------|
| **コンポーネント** | `Select` | ドロップダウン選択 |
| **placeholder** | `"メソッドで絞り込み"` | プレースホルダーテキスト |
| **value** | `selectedMethod` | 選択値 |
| **onChange** | `setSelectedMethod` | 変更ハンドラ |

---

## 9. 共通パターンと標準属性

### 9.1 Input（標準テキスト入力）の共通パターン

| 属性カテゴリ | よく使われる値 | 説明 |
|------------|--------------|------|
| **size** | `"small"`, `"middle"`, `"large"` | サイズ（24px, 32px, 40px） |
| **placeholder** | 文字列 | プレースホルダーテキスト |
| **maxLength** | `100`, `500`, `1000` | 最大文字数 |
| **showCount** | `true` | 文字数カウンター表示 |
| **allowClear** | `true` | クリアボタン表示 |
| **disabled** | `loading`, `submitting` | 無効化状態 |
| **autoFocus** | `true` | 自動フォーカス |
| **prefix** | `<Icon />` | 前置アイコン |
| **suffix** | `<Icon />` | 後置アイコン |
| **addonBefore** | 文字列/要素 | 前置アドオン |
| **addonAfter** | 文字列/要素 | 後置アドオン |
| **status** | `"error"`, `"warning"` | 状態表示 |

### 9.2 Input.TextArea（複数行）の共通パターン

| 属性カテゴリ | よく使われる値 | 説明 |
|------------|--------------|------|
| **rows** | `3`, `4`, `5` | 表示行数 |
| **maxLength** | `500`, `1000` | 最大文字数 |
| **showCount** | `true` | 文字数カウンター表示 |
| **placeholder** | 文字列 | プレースホルダーテキスト |
| **autoSize** | `{ minRows: 3, maxRows: 10 }` | 自動サイズ調整 |

### 9.3 Select（ドロップダウン）の共通パターン

| 属性カテゴリ | よく使われる値 | 説明 |
|------------|--------------|------|
| **placeholder** | 文字列 | プレースホルダーテキスト |
| **allowClear** | `true` | クリアボタン表示 |
| **showSearch** | `true` | 検索機能有効化 |
| **filterOption** | カスタム関数 | フィルタリングロジック |
| **mode** | `"multiple"`, `"tags"` | 複数選択モード |
| **loading** | `true`, `false` | ローディング状態 |
| **disabled** | 条件式 | 無効化状態 |
| **style** | `{ width: '100%' }` | スタイル指定 |

### 9.4 Input.Password（パスワード）の共通パターン

| 属性カテゴリ | よく使われる値 | 説明 |
|------------|--------------|------|
| **iconRender** | `(visible) => ...` | 表示切替アイコンのカスタマイズ |
| **visibilityToggle** | `true` | 表示切替ボタン |
| **autoComplete** | `"current-password"`, `"new-password"` | オートコンプリート |

### 9.5 Input.Search（検索）の共通パターン

| 属性カテゴリ | よく使われる値 | 説明 |
|------------|--------------|------|
| **onSearch** | 関数 | 検索実行ハンドラ |
| **enterButton** | `true`, 文字列, `<Icon />` | 検索ボタンのカスタマイズ |
| **loading** | `true`, `false` | ローディング状態 |

---

## 10. バリデーションルールパターン

### 10.1 Form.Item rulesの共通パターン

| ルールタイプ | 設定例 | 説明 |
|------------|--------|------|
| **必須** | `{ required: true, message: 'メッセージ' }` | 入力必須 |
| **最小文字数** | `{ min: 3, message: 'メッセージ' }` | 最小文字数制限 |
| **最大文字数** | `{ max: 100, message: 'メッセージ' }` | 最大文字数制限 |
| **メール形式** | `{ type: 'email', message: 'メッセージ' }` | メールアドレス検証 |
| **URL形式** | `{ type: 'url', message: 'メッセージ' }` | URL検証 |
| **数値範囲** | `{ min: 1, max: 999, message: 'メッセージ' }` | 数値範囲制限 |
| **正規表現** | `{ pattern: /正規表現/, message: 'メッセージ' }` | パターンマッチング |
| **カスタム** | `{ validator: async (_, value) => {...} }` | カスタムバリデーション |

---

## 11. アクセシビリティ対応

### 11.1 推奨される属性

| 属性 | 設定例 | 説明 |
|------|--------|------|
| **id** | `"username"` | ラベルとの関連付け |
| **name** | `"username"` | フォーム送信時の識別子 |
| **aria-label** | `"ユーザー名入力"` | スクリーンリーダー用ラベル |
| **aria-describedby** | `"username-help"` | 説明テキストとの関連付け |
| **aria-required** | `"true"` | 必須項目の明示 |
| **aria-invalid** | `"true"` | エラー状態の明示 |
| **autoComplete** | `"username"`, `"email"` | オートコンプリート設定 |

---

## 12. パフォーマンス最適化

### 12.1 制御コンポーネント vs 非制御コンポーネント

| パターン | 使用場面 | 実装例 |
|---------|---------|--------|
| **制御コンポーネント** | リアルタイムバリデーション、動的UI更新 | `value={state}` + `onChange` |
| **非制御コンポーネント** | シンプルなフォーム送信 | `defaultValue` + `ref` |

### 12.2 debounce/throttleの活用

| 用途 | 実装パターン | タイミング |
|------|------------|-----------|
| **検索入力** | `debounce(searchFunction, 300)` | 入力停止後300ms |
| **オートコンプリート** | `debounce(fetchSuggestions, 500)` | 入力停止後500ms |
| **スクロールイベント** | `throttle(handleScroll, 100)` | 100ms間隔 |

---

## 13. まとめ

### 13.1 設計原則

1. **一貫性**: 同じ機能には同じコンポーネントと属性を使用
2. **アクセシビリティ**: id、name、aria属性を適切に設定
3. **ユーザビリティ**: placeholder、maxLength、showCountで使いやすさを向上
4. **バリデーション**: Form.Item rulesで入力検証を実装
5. **パフォーマンス**: 制御コンポーネント + debounceで最適化

### 13.2 チェックリスト

新しいテキスト入力要素を追加する際は以下を確認：

- [ ] 適切なコンポーネントタイプを選択（Input / TextArea / Password / Search / Select）
- [ ] placeholderを設定
- [ ] 必要に応じてmaxLength、showCountを設定
- [ ] バリデーションルールを定義（Form.Item rules）
- [ ] 制御コンポーネントとして実装（value + onChange）
- [ ] 無効化状態を適切に管理（disabled）
- [ ] アクセシビリティ属性を設定（id、name、aria-*）
- [ ] autoFocusは必要な場合のみ使用
- [ ] allowClearで入力クリアボタンを提供
- [ ] スタイル指定が必要な場合はstyleまたはclassNameで設定

---

## 14. 関連ドキュメント

- [ボタン属性一覧表](./button_analysis.md)
- [ボタン分類](./button_categorization.md)
- [ボタン色設計](./button_color_design.md)
- [UIポリシー](../../.clinerules/ui_policy.md)
- [フロントエンド規約](../../.clinerules/frontend.md)

---

**作成日:** 2024-12-24  
**更新履歴:**
- 2024-12-24: 初版作成（全画面のテキストボックス属性を網羅）
