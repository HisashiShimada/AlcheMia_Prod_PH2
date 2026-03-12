# UI仕様書作成テンプレート

## Phase 1完了: テンプレートとフロー確立

**作成日時:** 2026-03-11 09:07

---

## 📋 UI仕様書の標準構成

### 必須セクション

1. **概要**
2. **画面構成**
3. **機能仕様**
4. **データ仕様**
5. **API連携**
6. **エラーハンドリング**
7. **実装ファイル**
8. **変更履歴**

---

## 📝 各セクションの記述方法

### 1. 概要

```markdown
## 1. 概要

### 1.1 コンポーネントの目的
[コンポーネントが何をするか、どんな機能を提供するかを簡潔に記述]

### 1.2 使用場面
- [いつ、どこで表示されるか]
- [どのような操作で表示されるか]

### 1.3 アクセス権限
- **必須ロール**: [必要なロール]
- **認証**: JWT + Session Hybrid認証
```

**実装から抽出する情報:**
- ファイルのコメント
- 表示条件（どのメニュー、どのタブか）
- Props型定義のコメント

---

### 2. 画面構成

```markdown
## 2. 画面構成

### 2.1 レイアウト構造

\```
┌─────────────────────────────────────────────────────┐
│ [ヘッダー領域]                                       │
├─────────────────────────────────────────────────────┤
│ [サブヘッダー/ツールバー]                            │
├──────────────┬──────────────────────────────────────┤
│ 左側パネル   │ 右側パネル                           │
│              │                                      │
└──────────────┴──────────────────────────────────────┘
\```

### 2.2 主要UI要素

#### 2.2.1 [領域名]
- [UI要素名]（[コンポーネント]）: [説明]
- [UI要素名]（[コンポーネント]）: [説明]

### 2.3 画面遷移

\```mermaid
graph TD
    A[現在の画面] --> B[遷移先1]
    A --> C[遷移先2]
\```
```

**実装から抽出する情報:**
- JSXの構造（Layout, Header, Content, Sider等）
- style属性（高さ、幅、padding、margin）
- Ant Designコンポーネントの使用箇所
- 子コンポーネントの配置

---

### 3. 機能仕様

```markdown
## 3. 機能仕様

### 3.1 [機能名]

#### 3.1.1 処理フロー
\```typescript
// 実装コードの抜粋
const handleAction = useCallback(() => {
  // 処理内容
}, [dependencies]);
\```

#### 3.1.2 UI動作
- ユーザー操作: [操作内容]
- 画面変化: [変化内容]
- 完了メッセージ: [メッセージ内容]

#### 3.1.3 条件分岐
- 条件1: [処理内容]
- 条件2: [処理内容]
```

**実装から抽出する情報:**
- useCallback, useMemo, useEffectの内容
- イベントハンドラー（onClick, onChange等）
- 条件分岐（if, switch, 三項演算子）
- message.success/error/warning の呼び出し

---

### 4. データ仕様

```markdown
## 4. データ仕様

### 4.1 Props定義

\```typescript
interface ComponentNameProps {
  prop1: Type1;
  prop2?: Type2;  // オプショナル
  onAction?: (param: Type3) => void;  // コールバック
}
\```

**Props説明:**
| Prop名 | 型 | 必須 | 説明 |
|--------|---|------|------|
| prop1 | Type1 | ✅ | [説明] |
| prop2 | Type2 | - | [説明] |

### 4.2 State定義

\```typescript
// 主要なState
const [state1, setState1] = useState<Type1>(initialValue);
const [state2, setState2] = useState<Type2>(initialValue);
\```

**State説明:**
| State名 | 型 | 初期値 | 説明 |
|---------|---|--------|------|
| state1 | Type1 | [初期値] | [説明] |
| state2 | Type2 | [初期値] | [説明] |

### 4.3 その他の型定義

\```typescript
interface AdditionalType {
  field1: Type1;
  field2: Type2;
}
\```
```

**実装から抽出する情報:**
- Props型定義（interface/type）
- useState の宣言
- useMemo, useCallback の戻り値型
- ローカルで定義された型・インターフェース

---

### 5. API連携

```markdown
## 5. API連携

### 5.1 使用するAPI一覧

| # | API名 | メソッド | エンドポイント | 状態 | 説明 |
|---|------|---------|---------------|------|------|
| 1 | [API名] | GET | \`/api/v1/...\` | ✅ 実装済み | [説明] |
| 2 | [API名] | POST | \`/api/v1/...\` | 🔴 未実装 | [説明] |

### 5.2 API呼び出しコード

\```typescript
const response = await fetch('/api/v1/endpoint', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': \`Bearer \${sessionToken}\`,
    'X-Organization-Id': organizationId,
  },
  credentials: 'include',
  body: JSON.stringify(requestData),
});
\```

### 5.3 リクエスト/レスポンス例

**Request:**
\```json
{
  "field1": "value1"
}
\```

**Response (200 OK):**
\```json
{
  "success": true,
  "data": { }
}
\```
```

**実装から抽出する情報:**
- fetch の呼び出し
- useApi, useQuery等のカスタムフックの使用
- APIサービス関数（apiService.ts等）の呼び出し
- リクエストボディ、ヘッダー
- レスポンスの処理

---

### 6. エラーハンドリング

```markdown
## 6. エラーハンドリング

### 6.1 エラーケース一覧

| エラーケース | HTTPステータス | エラーコード | 対処方法 |
|-------------|---------------|-------------|----------|
| [ケース1] | 400 | \`ERROR_CODE\` | message.error表示 |
| [ケース2] | 500 | \`ERROR_CODE\` | 再試行を促す |

### 6.2 エラー処理コード

\```typescript
try {
  // 処理
} catch (error) {
  message.error('エラーメッセージ');
  console.error('詳細:', error);
}
\```
```

**実装から抽出する情報:**
- try-catch ブロック
- .catch() チェーン
- error ハンドリング
- message.error の呼び出し

---

### 7. 実装ファイル

```markdown
## 7. 実装ファイル

### 7.1 ファイルパス
- **メインファイル**: \`frontend/src/components/.../ComponentName.tsx\`

### 7.2 関連ファイル
- **型定義**: \`frontend/src/types/xxx.ts\`
- **スタイル**: \`frontend/src/styles/xxx.css\` (存在する場合)
- **ユーティリティ**: \`frontend/src/utils/xxx.ts\`

### 7.3 依存コンポーネント
- \`<ChildComponent1 />\` - [説明]
- \`<ChildComponent2 />\` - [説明]
```

**実装から抽出する情報:**
- ファイルの相対パス
- import 文
- 子コンポーネントの使用箇所

---

### 8. 変更履歴

```markdown
## 8. 変更履歴

| 日付 | 変更内容 | 担当者 |
|------|----------|--------|
| 2026-03-11 | 実装ベースで仕様書を再作成 | Cline |
| YYYY-MM-DD | [変更内容] | [担当者] |
```

---

## 🔄 実装→仕様書の作成フロー

### Step 1: 実装ファイルを読み込む

```typescript
// frontend/src/components/.../ComponentName.tsx
```

### Step 2: 以下の情報を抽出

#### A. 基本情報
- [ ] ファイル名
- [ ] ファイルのコメント・説明
- [ ] export default/named exports

#### B. Props型定義
- [ ] interface/type の定義
- [ ] 各Propsの型・必須/オプショナル
- [ ] コールバック関数の定義

#### C. State管理
- [ ] useState の宣言（型、初期値）
- [ ] useContext の使用
- [ ] カスタムフックの使用

#### D. 副作用・メモ化
- [ ] useEffect の依存関係と処理内容
- [ ] useMemo の依存関係と計算内容
- [ ] useCallback の依存関係と関数内容

#### E. イベントハンドラー
- [ ] onClick, onChange等のハンドラー
- [ ] フォーム送信処理
- [ ] モーダル開閉処理

#### F. UI構造
- [ ] Layout構造（Header, Content, Sider等）
- [ ] Ant Designコンポーネントの使用
- [ ] 子コンポーネントの配置
- [ ] 条件付きレンダリング

#### G. API連携
- [ ] fetch の呼び出し
- [ ] APIサービス関数の使用
- [ ] リクエスト/レスポンスの型

#### H. エラーハンドリング
- [ ] try-catch ブロック
- [ ] message.error/warning/success の使用
- [ ] エラー時の処理

### Step 3: テンプレートに沿って記述

1. **概要** - ファイルコメント、使用場面を記述
2. **画面構成** - JSX構造からレイアウト図を作成
3. **機能仕様** - イベントハンドラー、useEffectから処理フローを記述
4. **データ仕様** - Props, State, 型定義をコピー
5. **API連携** - fetch呼び出しからAPIリストを作成
6. **エラーハンドリング** - エラー処理コードを抽出
7. **実装ファイル** - パスとimport文を記録
8. **変更履歴** - 今日の日付で「実装ベースで再作成」を記録

### Step 4: レビュー

- [ ] 実装コードと完全に一致しているか
- [ ] Props型定義が正確にコピーされているか
- [ ] State管理が漏れなく記載されているか
- [ ] API呼び出しが全て記載されているか
- [ ] テンプレートの全セクションが埋まっているか

---

## 📊 作成時間の目安

### ファイル規模別

| ファイル規模 | 行数 | 作成時間 | 例 |
|------------|------|---------|---|
| 小規模 | 〜200行 | 20-30分 | シンプルなモーダル、ボタン |
| 中規模 | 200-500行 | 30-60分 | タブコンポーネント、フォーム |
| 大規模 | 500行〜 | 1-2時間 | メイン画面、複雑なエディタ |

### コンポーネント種別別

| 種別 | 作成時間 | 特徴 |
|------|---------|------|
| メニュー | 30分 | タブ構成、子コンポーネント呼び出しのみ |
| 一覧画面 | 1-2時間 | テーブル、フィルタ、ソート、API連携 |
| 編集画面 | 1.5-2時間 | フォーム、バリデーション、API連携 |
| モーダル | 30-60分 | Props渡し、フォーム、送信処理 |
| ビューア | 1-1.5時間 | 複雑なレンダリング、ダイアログ管理 |
| エディタ | 2-3時間 | 複雑なState管理、ReactFlow等の統合 |

---

## 💡 効率化のヒント

### DO（推奨）

✅ **Props型定義はコードから直接コピー**
```typescript
// 実装ファイルから
interface ComponentProps {
  prop1: string;
  prop2?: number;
}

// ↓ そのまま仕様書にコピー
```

✅ **複雑な処理はコードブロックで引用**
```markdown
### 3.1.1 処理フロー
\```typescript
const handleAction = useCallback(() => {
  // 実装コードをそのまま引用
}, [dependencies]);
\```
```

✅ **レイアウトはASCII図で視覚化**
```
┌─────────────┬─────────────┐
│ 左側        │ 右側        │
└─────────────┴─────────────┘
```

✅ **API呼び出しは表形式で一覧化**
| # | API名 | メソッド | エンドポイント |
|---|------|---------|---------------|

### DON'T（非推奨）

❌ **実装コードを要約・省略しない**
- Props型定義は完全にコピーする
- State宣言も全て記載する

❌ **推測で記述しない**
- 実装コードに書かれていることだけを記載
- 「多分こう動く」は書かない

❌ **古い仕様書の内容を流用しない**
- 実装が変わっている可能性が高い
- 実装コードを正として作成する

---

## 📂 作成例: ExperimentAdminMenu

### 実装ファイル
`frontend/src/components/menus/ExperimentAdminMenu.tsx`

### 抽出した情報

**Props:**
```typescript
interface ExperimentAdminMenuProps {
  user: User;
  onLogout: () => void;
  onNavigate: (path: string) => void;
  onMenuChange?: (menuType: MenuType) => void;
}
```

**State:**
```typescript
const [currentTab, setCurrentTab] = useState('1');
const [showEditor, setShowEditor] = useState(false);
const [editorProjectParams, setEditorProjectParams] = useState<MaimlEditorParams | null>(null);
const [workerOverlayOpen, setWorkerOverlayOpen] = useState(false);
const [workerOverlayProjectId, setWorkerOverlayProjectId] = useState<string | undefined>(undefined);
const [workerOverlayProjectName, setWorkerOverlayProjectName] = useState<string | undefined>(undefined);
```

**子コンポーネント:**
- `<Header />` - 共通ヘッダー
- `<SubHeader />` - サブヘッダー（タブ付き）
- `<ProjectManagement />` - タブ1
- `<FormatManagement />` - タブ2
- `<ProgressMonitoring />` - タブ3
- `<PetriNetEditorScreen />` - エディタ画面
- `<WorkerScreenOverlay />` - 作業者画面オーバーレイ

**レイアウト:**
```
┌─────────────────────────────────────────────────────┐
│ Header (64px)                                       │
├─────────────────────────────────────────────────────┤
│ SubHeader with Tabs (76px)                          │
├─────────────────────────────────────────────────────┤
│ Content (calc(100vh - 140px))                       │
│ - Tab 1: ProjectManagement                          │
│ - Tab 2: FormatManagement                           │
│ - Tab 3: ProgressMonitoring                         │
└─────────────────────────────────────────────────────┘
```

**タブ構成:**
```typescript
const tabItems = [
  { key: '1', label: 'プロジェクト管理', icon: <FolderAddOutlined /> },
  { key: '2', label: 'フォーマット管理', icon: <FileTextOutlined /> },
  { key: '3', label: '進捗確認', icon: <LineChartOutlined /> },
];
```

**主要機能:**
1. タブ切り替え（`handleTabChange`）
2. エディタ表示（`handleEditProject`）
3. 作業者画面オーバーレイ表示（`handleOpenWorkerScreen`）

---

## ✅ Phase 1完了チェックリスト

- [x] 実装ファイルの配置を特定
- [x] 全実装ファイルをリストアップ
- [x] UI仕様書の標準テンプレートを作成
- [x] サンプルファイルで実装→仕様書フローを確立
- [ ] 不一致ファイルの詳細確認（次のタスクで実施）

**Phase 1完了！Phase 2以降で実際のUI仕様書作成を開始できます。**


