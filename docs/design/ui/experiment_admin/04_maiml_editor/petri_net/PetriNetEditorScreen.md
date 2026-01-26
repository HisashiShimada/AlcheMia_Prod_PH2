# PetriNetEditorScreen UI仕様書

## 1. 概要

### 1.1. コンポーネントの目的

PetriNetEditorをフルスクリーンで表示するラッパー画面コンポーネント。ExperimentAdminMenuから呼び出され、プロジェクトの実験フローを編集します。プロジェクトデータの読み込み、保存処理、未保存の変更の警告などを管理します。

### 1.2. 使用場面

- ExperimentAdminMenuから「MAIML編集」を選択した場合
- プロジェクト管理画面から実験フローを編集する場合
- 新規プロジェクトの実験フローを作成する場合

### 1.3. アクセス権限

- **対象ロール**: Experiment Admin（実験管理者）
- **必須認証**: JWT認証必須
- **テナント分離**: organization_id によるマルチテナント分離

---

## 2. 画面構成

### 2.1. レイアウト構造

```
┌─────────────────────────────────────────────────────┐
│ Header                                              │
│ [← 戻る]     プロジェクト名: 材料実験A              │
├─────────────────────────────────────────────────────┤
│                                                     │
│ PetriNetEditor（フルスクリーン）                    │
│                                                     │
│ [ツールバー] [保存] [バリデーション]                │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ ReactFlow編集エリア                             │ │
│ │                                                 │ │
│ │   ◯→[T]→◯                                     │ │
│ │                                                 │ │
│ │ [Controls] [MiniMap]                            │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ℹ️ ローディング表示（初回のみ）                     │
└─────────────────────────────────────────────────────┘
```

### 2.2. 主要UI要素

#### 2.2.1. ヘッダー

| 要素 | コンポーネント | 説明 |
|------|--------------|------|
| 戻るボタン | Button | ArrowLeftOutlined、onBack()実行 |
| プロジェクト名 | Typography.Title | level={4} |

**スタイル:**
- padding: 16px
- borderBottom: 1px solid colorBorder
- 固定配置（スクロールしても表示）

#### 2.2.2. PetriNetEditor

**Props渡し:**
- initialContent: maimlContent
- projectId: projectId
- projectName: projectName
- onSave: handleSave
- onContentChange: handleContentChange
- onError: handleError

#### 2.2.3. ローディング表示

**表示条件:** isLoading === true

| 要素 | 設定 |
|------|------|
| Spin | size="large", tip="読み込み中..." |
| 配置 | 画面中央 |

### 2.3. 画面遷移

- 戻るボタン: ExperimentAdminMenuに戻る（未保存の変更がある場合は確認ダイアログ）

---

## 3. 機能仕様

### 3.1. 主要機能の詳細

#### 3.1.1. プロジェクトデータの読み込み

**処理フロー:**
1. useEffect()でprojectIdを監視
2. loadProjectData()を実行
3. isLoading: true
4. プロジェクトに関連するMAIMLファイルを検索:
   - プロジェクトのメインMAIMLファイル
   - プロジェクトフォルダ内の*.maimlファイル
   - なければundefined（新規作成モード）
5. maimlContentステートに設定
6. isLoading: false

**エラーハンドリング:**
- message.error()でエラー通知
- isLoading: false

**現在の実装:**
- TODO: API未実装
- 仮実装: 新規作成モードで開始（maimlContent: undefined）

#### 3.1.2. 保存処理

**処理フロー:**
1. PetriNetEditorからonSave()コールバックを受け取る
2. handleSave()を実行
3. contentを受け取る
4. バリデーション実行（PetriNetEditor側で実施済み）
5. プロジェクトのMAIMLファイルとして保存:
   - 既存ファイルがあれば上書き
   - なければ新規作成
6. message.success()で成功通知
7. hasUnsavedChanges: false

**エラーハンドリング:**
- message.error()でエラー通知
- hasUnsavedChanges: 変更なし

**現在の実装:**
- TODO: API未実装
- 仮実装: コンソールログのみ

#### 3.1.3. 変更通知の処理

**処理フロー:**
1. PetriNetEditorからonContentChange()コールバックを受け取る
2. handleContentChange()を実行
3. hasUnsavedChanges: true

**用途:**
- 戻るボタンクリック時の警告表示

#### 3.1.4. 戻る処理

**処理フロー:**
1. 戻るボタンをクリック
2. handleBack()を実行
3. hasUnsavedChangesをチェック:
   - true: 確認ダイアログ表示
     - 「保存されていない変更があります。破棄して戻りますか？」
     - OK: onClose()実行
     - Cancel: 何もしない
   - false: 即座にonClose()実行

#### 3.1.5. エラー処理

**処理フロー:**
1. PetriNetEditorからonError()コールバックを受け取る
2. handleError()を実行
3. console.error()でエラーログ
4. message.error()でエラー通知

### 3.2. ボタン・操作の動作

| 操作 | 動作 | 状態変更 |
|------|------|---------|
| 戻るボタンクリック | 確認後に戻る | onClose()実行 |
| PetriNetEditorで保存 | 保存処理 | hasUnsavedChanges: false |
| PetriNetEditorで編集 | 変更通知 | hasUnsavedChanges: true |

### 3.3. バリデーションルール

- なし（PetriNetEditor側で実施）

---

## 4. データ仕様

### 4.1. Props型定義

```typescript
interface PetriNetEditorScreenProps {
  projectId: string;         // プロジェクトID
  projectName: string;       // プロジェクト名
  projectOverview?: string;  // プロジェクト概要
  onClose: () => void;       // 画面を閉じるコールバック
}
```

### 4.2. State型定義

```typescript
interface State {
  isLoading: boolean;                // ローディング状態
  maimlContent: string | undefined;  // MAIMLコンテンツ
  hasUnsavedChanges: boolean;        // 未保存の変更フラグ
}
```

---

## 5. API連携

### 5.1. 使用するAPI一覧

[MAIML編集API仕様書](../../../api/api_maiml_editor.md)を参照

| API | メソッド | エンドポイント | 説明 | 実装状態 |
|-----|---------|---------------|------|---------|
| MAIMLファイル取得 | GET | `/api/v1/projects/:projectId/maiml` | プロジェクトのMAIMLファイル取得 | 🔴 未実装 |
| MAIMLファイル保存 | PUT | `/api/v1/projects/:projectId/maiml` | プロジェクトのMAIMLファイル保存 | 🔴 未実装 |

### 5.2. MAIMLファイル取得

**エンドポイント**: `GET /api/v1/projects/:projectId/maiml`

**リクエストパラメータ**:
- `projectId` (パスパラメータ): プロジェクトID

**レスポンス**:
```typescript
{
  "success": true,
  "data": {
    "file_id": "file-uuid",
    "file_name": "sample_project.maiml",
    "file_path": "org_maiml_lab_001/projects/Sample_Project/sample_project.maiml",
    "file_size": 12345,
    "content": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<maiml>...</maiml>",
    "loaded_at": "2026-01-21T16:00:00Z"
  },
  "meta": {
    "timestamp": "2026-01-21T16:00:00Z",
    "requestId": "req_abc123"
  }
}
```

### 5.3. MAIMLファイル保存

**エンドポイント**: `PUT /api/v1/projects/:projectId/maiml`

**リクエストパラメータ**:
- `projectId` (パスパラメータ): プロジェクトID

**リクエストボディ**:
```typescript
{
  "content": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<maiml>...</maiml>",
  "fileName": "sample_project.maiml",
  "createBackup": true
}
```

**レスポンス**:
```typescript
{
  "success": true,
  "data": {
    "file_id": "file-uuid",
    "file_name": "sample_project.maiml",
    "file_path": "org_maiml_lab_001/projects/Sample_Project/sample_project.maiml",
    "file_size": 12345,
    "saved_at": "2026-01-21T16:00:00Z",
    "backup_created": true,
    "backup_path": "org_maiml_lab_001/projects/Sample_Project/archive/sample_project_v2.maiml"
  },
  "meta": {
    "timestamp": "2026-01-21T16:00:00Z",
    "requestId": "req_abc123"
  }
}
```

### 5.4. 現在の実装状況

**注意**: 上記APIは現在未実装です。

**代替実装**:
- 新規作成モードで開始（`maimlContent: undefined`）
- 保存処理はコンソールログのみ
- 実際のS3操作は行われません

---

## 6. エラーハンドリング

### 6.1. エラーケース

| エラーケース | 処理 | 表示 |
|------------|------|------|
| プロジェクトデータ読み込み失敗 | message.error() | 「プロジェクトの読み込みに失敗しました」 |
| 保存失敗 | message.error() | 「保存に失敗しました」 |
| PetriNetEditorからのエラー | message.error() | エラー内容 |

### 6.2. エラーメッセージ

- 「プロジェクトの読み込みに失敗しました」
- 「保存に失敗しました」
- 「保存されていない変更があります。破棄して戻りますか？」

---

## 7. UI/UXポリシー準拠

### 7.1. Ant Designコンポーネント使用

| コンポーネント | 使用箇所 | props |
|--------------|---------|-------|
| Button | 戻るボタン | icon, onClick |
| Spin | ローディング | size, tip |
| message | 通知 | success, error |
| Typography | プロジェクト名 | Title level={4} |

### 7.2. ReactFlowProvider

- PetriNetEditorをReactFlowProviderでラップ
- ReactFlowのコンテキストを提供

### 7.3. レイアウト

- フルスクリーン表示（固定ヘッダー + スクロール可能コンテンツ）
- ヘッダー高さ: 64px
- コンテンツエリア: calc(100vh - 64px)

---

## 8. 実装ファイル

### 8.1. ソースファイルパス

```
frontend/src/components/viewer/PetriNetEditorScreen.tsx
```

### 8.2. 関連コンポーネント

| コンポーネント | パス | 役割 |
|--------------|------|------|
| PetriNetEditor | @/components/editor/PetriNetEditor | メインエディタ |
| ExperimentAdminMenu | - | 呼び出し元 |

### 8.3. 依存ライブラリ

| ライブラリ | バージョン | 用途 |
|-----------|----------|------|
| antd | 6.x | UIコンポーネント |
| @ant-design/icons | 5.x | アイコン |
| reactflow | 11.11.4 | ReactFlowProvider |

---

## 9. 既知の課題・TODO

### 実装待ち

- [ ] プロジェクトのMAIMLファイル読み込みAPI
- [ ] プロジェクトのMAIMLファイル保存API
- [ ] 複数のMAIMLファイルがある場合の処理
- [ ] バージョン管理機能
- [ ] 自動保存機能

### 改善提案

- [ ] ヘッダーに保存状態表示（保存済み / 未保存）
- [ ] ヘッダーに最終更新日時表示
- [ ] ブラウザの戻るボタン対応
- [ ] キーボードショートカット（Ctrl+S）のハンドリング
- [ ] オフライン対応

---

## 10. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2026-01-21 | 初版作成 | Cline |

---

## 11. 使用例

### 11.1. ExperimentAdminMenuからの呼び出し

```typescript
// ExperimentAdminMenu内
const [editorOpen, setEditorOpen] = useState(false);
const [selectedProject, setSelectedProject] = useState<Project | null>(null);

const handleOpenEditor = (project: Project) => {
  setSelectedProject(project);
  setEditorOpen(true);
};

const handleCloseEditor = () => {
  setEditorOpen(false);
  setSelectedProject(null);
};

return (
  <>
    {editorOpen && selectedProject ? (
      <PetriNetEditorScreen
        projectId={selectedProject.id}
        projectName={selectedProject.name}
        projectOverview={selectedProject.overview}
        onClose={handleCloseEditor}
      />
    ) : (
      <div>メニュー画面</div>
    )}
  </>
);
```

---

## 12. パフォーマンス最適化

### 12.1. メモ化

- useCallback()で handleBack, handleSave, handleContentChange をメモ化
- 不要な再レンダリングを防ぐ

### 12.2. 遅延読み込み

- PetriNetEditorは動的インポート可能（将来的に）

---

## 13. アクセシビリティ

### 13.1. キーボード操作

- Esc: 戻る（未保存の変更がある場合は確認ダイアログ）
- PetriNetEditor内のショートカットは継承

### 13.2. スクリーンリーダー対応

- ヘッダーにaria-labelを設定
- ローディング中はaria-busyを設定
