# DraftManager UI仕様書

## 1. 概要

### 1.1. コンポーネントの目的

PetriNetEditorで編集中のMAIMLファイルの下書き（Draft）を管理するコンポーネント。自動保存・手動保存、読み込み、削除、検索・ソート機能を提供します。

### 1.2. 使用場面

- PetriNetEditorで編集中に下書きを保存したい場合
- 過去の下書きを読み込んで編集を再開したい場合
- 不要な下書きを削除したい場合
- 自動保存機能を有効/無効にしたい場合

### 1.3. アクセス権限

- **対象ロール**: Experiment Admin（実験管理者）
- **必須認証**: JWT認証必須
- **ユーザー分離**: 自分の下書きのみアクセス可能

---

## 2. 画面構成

### 2.1. レイアウト構造

```
┌────────────────────────────────────────────────────────────┐
│ 📁 下書き管理                                       [×]     │
├────────────────────────────────────────────────────────────┤
│ 自動保存: [ON/OFF]  検索: [        ] ソート: [日時順▼]   │
├────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────────┐  │
│ │ 📄 sample_project_draft (自動保存)                   │  │
│ │    最終保存: 2026-01-21 14:30  ノード: 15  アーク: 20 │  │
│ │    [📂 読み込み] [🗑 削除]                            │  │
│ ├──────────────────────────────────────────────────────┤  │
│ │ 📄 experiment_workflow_v2                            │  │
│ │    最終保存: 2026-01-21 12:00  ノード: 20  アーク: 30 │  │
│ │    [📂 読み込み] [🗑 削除]                            │  │
│ └──────────────────────────────────────────────────────┘  │
│                                                            │
│ 現在の編集内容を保存:                                       │
│ 下書き名: [________________]  [💾 保存]                   │
└────────────────────────────────────────────────────────────┘
```

### 2.2. 主要UI要素

#### 2.2.1. ヘッダー

| 要素 | 説明 |
|------|------|
| タイトル | 「📁 下書き管理」 |
| 閉じるボタン | CloseOutlined、onClose()実行 |

#### 2.2.2. ツールバー

| 要素 | 説明 |
|------|------|
| 自動保存スイッチ | Switch、ON/OFF切り替え |
| 検索フィールド | Input + SearchOutlined、下書き名で検索 |
| ソート選択 | Select、日時順/名前順/ノード数順 |
| 更新ボタン | ReloadOutlined、一覧を再取得 |

#### 2.2.3. 下書き一覧

**List.Item構成:**
- 下書き名（太字）
- 自動保存タグ（該当する場合）
- 最終保存日時
- ノード数、アーク数、テンプレート数
- 操作ボタン（読み込み、削除）

**表示情報:**
```
📄 sample_project_draft (自動保存)
最終保存: 2026-01-21 14:30
ノード: 15  アーク: 20  テンプレート: 5
[📂 読み込み] [🗑 削除]
```

#### 2.2.4. 現在の編集内容保存エリア

| 要素 | 説明 |
|------|------|
| 下書き名入力 | Input、新規保存時の名前 |
| 保存ボタン | SaveOutlined、現在の編集状態を保存 |

#### 2.2.5. ローディング状態

**表示内容:**
- Spin コンポーネント
- 「読み込み中...」メッセージ

#### 2.2.6. エラー状態

**表示内容:**
- Alert コンポーネント（type="error"）
- エラーメッセージ

#### 2.2.7. 空状態

**表示内容:**
- Empty コンポーネント
- 「下書きがありません」メッセージ

---

## 3. 機能仕様

### 3.1. 主要機能の詳細

#### 3.1.1. 下書き一覧取得

**処理フロー:**
1. コンポーネントマウント時またはopen=trueになった時
2. fetchDrafts() を実行
3. `/api/s3/drafts?userId={userId}&organizationId={orgId}`
4. S3から下書きJSON一覧を取得
5. drafts stateに保存
6. リスト表示

**APIレスポンス:**
```json
{
  "drafts": [
    {
      "draft_key": "drafts/user_123/auto_20260121_143000.json",
      "draft_name": "sample_project_draft",
      "last_saved_at": "2026-01-21T14:30:00Z",
      "node_count": 15,
      "arc_count": 20,
      "template_count": 5
    }
  ]
}
```

#### 3.1.2. 下書き保存

**処理フロー:**
1. 「保存」ボタンをクリック
2. 下書き名をバリデーション（必須、重複チェック）
3. 現在の編集状態（nodes, edges, templates, documentData）を取得
4. saveDraft() を実行
5. POST `/api/s3/drafts`
6. S3に下書きJSONを保存
7. 一覧を再取得

**リクエストボディ:**
```json
{
  "userId": "user_123",
  "organizationId": "org_456",
  "draftName": "sample_project_draft",
  "draftData": {
    "nodes": [...],
    "edges": [...],
    "templates": {...},
    "documentData": {...},
    "fileName": "sample_project.maiml"
  }
}
```

#### 3.1.3. 下書き読み込み

**処理フロー:**
1. 「読み込み」ボタンをクリック
2. 確認ダイアログを表示（現在の編集内容が失われる警告）
3. OKの場合、loadDraft() を実行
4. GET `/api/s3/drafts/{draftKey}`
5. S3から下書きJSONを取得
6. onLoad(draftData) を実行
7. 親コンポーネント（PetriNetEditor）で状態を復元
8. モーダルを閉じる

#### 3.1.4. 下書き削除

**処理フロー:**
1. 「削除」ボタンをクリック
2. 削除確認ダイアログを表示
3. OKの場合、deleteDraft() を実行
4. DELETE `/api/s3/drafts/{draftKey}`
5. S3から下書きJSONを削除
6. 一覧を再取得

#### 3.1.5. 自動保存機能

**処理フロー:**
1. 自動保存スイッチをONにする
2. onAutoSaveToggle(true) を実行
3. 親コンポーネント（PetriNetEditor）で自動保存タイマーを開始
4. 一定時間（例: 5分）ごとに自動保存を実行
5. 下書き名: "auto_{timestamp}"

**自動保存の識別:**
- 下書き名が "auto_" で始まる場合、自動保存と判定
- 自動保存タグ（Tag color="blue"）を表示

#### 3.1.6. 検索機能

**処理フロー:**
1. 検索フィールドに文字列を入力
2. searchQuery stateを更新
3. useMemo() でフィルタリング
4. 下書き名に searchQuery が含まれるものを表示

**検索条件:**
- 下書き名で部分一致検索
- 大文字小文字を区別しない

#### 3.1.7. ソート機能

**処理フロー:**
1. ソート選択を変更
2. sortBy stateを更新
3. useMemo() でソート
4. 選択した順序で下書きを並び替え

**ソート順序:**
| ソート | 説明 |
|-------|------|
| date（デフォルト） | 最終保存日時の降順（新しい順） |
| name | 下書き名の昇順（アルファベット順） |
| nodeCount | ノード数の降順（多い順） |

#### 3.1.8. 自動保存世代管理

**処理フロー:**
1. 自動保存は最新5世代のみ保持
2. 6世代目以降は自動削除
3. 世代番号で識別（auto_0, auto_1, auto_2...）
4. 最も古い世代を削除して新しい世代を保存

### 3.2. ボタン・操作の動作

| 操作 | 動作 | 状態変更 |
|------|------|---------|
| 自動保存スイッチ | 自動保存を有効/無効 | onAutoSaveToggle() |
| 検索フィールド入力 | 下書きをフィルタ | searchQuery更新 |
| ソート選択 | 下書きを並び替え | sortBy更新 |
| 更新ボタン | 一覧を再取得 | fetchDrafts() |
| 読み込みボタン | 下書きを読み込み | onLoad() |
| 削除ボタン | 下書きを削除 | deleteDraft() |
| 保存ボタン | 現在の編集内容を保存 | saveDraft() |
| 閉じるボタン | モーダルを閉じる | onClose() |

---

## 4. データ仕様

### 4.1. Props型定義

```typescript
interface DraftManagerProps {
  open: boolean;                              // 表示フラグ
  onClose: () => void;                        // 閉じる
  onLoad: (draft: any) => void;               // 下書き読み込み
  currentEditState?: EditState;               // 現在の編集状態
  userId: string;                             // ユーザーID
  autoSaveEnabled?: boolean;                  // 自動保存有効フラグ
  onAutoSaveToggle?: (enabled: boolean) => void; // 自動保存切り替え
  currentDraftKey?: string | null;            // 現在の下書きキー
}
```

### 4.2. DraftInfo型定義

```typescript
interface DraftInfo {
  draft_key: string;           // S3キー
  draft_name: string;          // 下書き名
  original_file_key?: string;  // 元ファイルキー
  last_saved_at: string;       // 最終保存日時（ISO 8601）
  node_count?: number;         // ノード数
  arc_count?: number;          // アーク数
  template_count?: number;     // テンプレート数
  nodes?: any[];               // ノードデータ
  edges?: any[];               // エッジデータ
  templates?: any;             // テンプレートデータ
  documentData?: any;          // ドキュメントデータ
}
```

### 4.3. EditState型定義

```typescript
interface EditState {
  fileName?: string;    // ファイル名
  nodes?: any[];        // ノードデータ
  edges?: any[];        // エッジデータ
  templates?: any;      // テンプレートデータ
  documentData?: any;   // ドキュメントデータ
}
```

### 4.4. State型定義

```typescript
interface State {
  drafts: DraftInfo[];                     // 下書き一覧
  isLoading: boolean;                      // ローディング状態
  error: string | null;                    // エラーメッセージ
  searchQuery: string;                     // 検索クエリ
  showSaveDialog: boolean;                 // 保存ダイアログ表示フラグ
  showDeleteConfirm: boolean;              // 削除確認ダイアログ表示フラグ
  selectedDraft: DraftInfo | null;         // 選択中の下書き
  newDraftName: string;                    // 新規下書き名
  sortBy: 'date' | 'name' | 'nodeCount';   // ソート順序
  selectedAutoSaveGeneration: number;      // 自動保存世代番号
}
```

---

## 5. UI/UXポリシー準拠

### 5.1. Ant Designコンポーネント使用

| コンポーネント | 使用箇所 | props |
|--------------|---------|-------|
| Modal | 外側のコンテナ | open, onCancel, title, width, footer |
| Card | 保存エリア | size, bordered |
| Typography.Text | テキスト表示 | strong, type |
| Button | 各種操作ボタン | type, icon, onClick, danger |
| Input | 検索、下書き名入力 | prefix, placeholder, value, onChange |
| Select | ソート選択 | value, onChange, options |
| Switch | 自動保存切り替え | checked, onChange |
| List | 下書き一覧 | dataSource, renderItem, loading |
| List.Item | リスト項目 | actions |
| Tag | 自動保存タグ | color |
| Space | ボタングループ | size |
| Flex | レイアウト | justify, align, vertical |
| Spin | ローディング | - |
| Alert | エラー表示 | type, message, showIcon |
| Empty | 空状態 | description |

### 5.2. @ant-design/icons使用

- CloseOutlined: 閉じるボタン
- SaveOutlined: 保存ボタン
- ReloadOutlined: 更新ボタン
- DeleteOutlined: 削除ボタン
- FolderOpenOutlined: 読み込みボタン
- SearchOutlined: 検索アイコン
- SortAscendingOutlined: ソートアイコン

---

## 6. 実装ファイル

### 6.1. ソースファイルパス

```
frontend/src/components/editor/DraftManager.tsx
```

### 6.2. 関連コンポーネント・フック

| ファイル | パス | 役割 |
|---------|------|------|
| PetriNetEditor | ./PetriNetEditor | 親コンポーネント |
| useDraftManager | ../../hooks/useDraftManager | 下書き管理カスタムフック |
| DraftRestoreDialog | ../viewer/DraftRestoreDialog | 下書き復元確認ダイアログ |

### 6.3. 依存ライブラリ

| ライブラリ | バージョン | 用途 |
|-----------|----------|------|
| antd | 6.x | UIコンポーネント |
| @ant-design/icons | 5.x | アイコン |
| react | 18.2.0 | Reactライブラリ |

---

## 7. 既知の課題・TODO

- [ ] 下書きのプレビュー機能
- [ ] 下書きの比較機能
- [ ] 下書きのマージ機能
- [ ] 下書きのエクスポート/インポート

---

## 8. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 2.0.0 | 2025-12-23 | Ant Design v6対応、自動保存世代管理 | Development Team |
| 1.0.0 | 2026-01-21 | 初版作成 | Cline |

---

## 9. 使用例

```typescript
<DraftManager
  open={draftManagerOpen}
  onClose={() => setDraftManagerOpen(false)}
  onLoad={(draft) => {
    // 下書きを読み込んで編集状態を復元
    setNodes(draft.nodes);
    setEdges(draft.edges);
    setTemplates(draft.templates);
    setDocumentData(draft.documentData);
  }}
  currentEditState={{
    fileName: currentFileName,
    nodes: nodes,
    edges: edges,
    templates: templates,
    documentData: documentData
  }}
  userId={user.id}
  autoSaveEnabled={autoSaveEnabled}
  onAutoSaveToggle={(enabled) => setAutoSaveEnabled(enabled)}
  currentDraftKey={currentDraftKey}
/>
```

---

## 10. APIエンドポイント

### 10.1. 下書き一覧取得

**エンドポイント:**
```
GET /api/s3/drafts?userId={userId}&organizationId={orgId}
```

**クエリパラメータ:**
| パラメータ | 必須 | 説明 |
|-----------|-----|------|
| userId | ○ | ユーザーID |
| organizationId | ○ | 組織ID |

**レスポンス:**
```json
{
  "drafts": [
    {
      "draft_key": "drafts/user_123/auto_20260121_143000.json",
      "draft_name": "sample_project_draft",
      "last_saved_at": "2026-01-21T14:30:00Z",
      "node_count": 15,
      "arc_count": 20,
      "template_count": 5
    }
  ]
}
```

### 10.2. 下書き保存

**エンドポイント:**
```
POST /api/s3/drafts
```

**リクエストボディ:**
```json
{
  "userId": "user_123",
  "organizationId": "org_456",
  "draftName": "sample_project_draft",
  "draftData": {
    "nodes": [...],
    "edges": [...],
    "templates": {...},
    "documentData": {...}
  }
}
```

**レスポンス:**
```json
{
  "success": true,
  "draftKey": "drafts/user_123/sample_project_draft_20260121_143000.json"
}
```

### 10.3. 下書き読み込み

**エンドポイント:**
```
GET /api/s3/drafts/{draftKey}
```

**レスポンス:**
```json
{
  "nodes": [...],
  "edges": [...],
  "templates": {...},
  "documentData": {...}
}
```

### 10.4. 下書き削除

**エンドポイント:**
```
DELETE /api/s3/drafts/{draftKey}
```

**レスポンス:**
```json
{
  "success": true
}
```

---

## 11. S3パス構造

### 11.1. 下書き保存パス

```
s3://bucket-name/
  └── org_{organization_id}/
      └── drafts/
          └── user_{user_id}/
              ├── manual_sample_project_20260121_120000.json
              ├── auto_0.json  # 自動保存（最新）
              ├── auto_1.json  # 自動保存（1世代前）
              ├── auto_2.json  # 自動保存（2世代前）
              ├── auto_3.json  # 自動保存（3世代前）
              └── auto_4.json  # 自動保存（4世代前）
```

### 11.2. 下書きJSON形式

```json
{
  "version": "2.0.0",
  "savedAt": "2026-01-21T14:30:00Z",
  "fileName": "sample_project.maiml",
  "nodes": [
    {
      "id": "node_1",
      "type": "place",
      "data": {...},
      "position": { "x": 100, "y": 100 }
    }
  ],
  "edges": [
    {
      "id": "edge_1",
      "source": "node_1",
      "target": "node_2"
    }
  ],
  "templates": {
    "material": {...},
    "condition": {...},
    "result": {...}
  },
  "documentData": {...}
}
```

---

## 12. エラーハンドリング

### 12.1. ユーザーIDバリデーション

```typescript
useEffect(() => {
  if (!userId || userId === 'default-user' || userId === 'unknown-user') {
    console.error('❌ [DraftManager] Invalid userId:', userId);
    setError('ユーザーIDが正しく設定されていません。ログインし直してください。');
  }
}, [userId]);
```

### 12.2. API呼び出しエラー

```typescript
try {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`下書き取得失敗: ${response.status}`);
  }
  const data = await response.json();
  setDrafts(data.drafts);
} catch (error) {
  setError(error.message);
  setDrafts([]);
}
```

---

## 13. 使用シナリオ

### 13.1. 手動保存

1. PetriNetEditorで編集中
2. 「下書き管理」ボタンをクリック
3. DraftManagerが表示される
4. 下書き名を入力（例: "experiment_workflow_v2"）
5. 「保存」ボタンをクリック
6. 下書きがS3に保存される
7. 一覧に表示される

### 13.2. 自動保存

1. 自動保存スイッチをONにする
2. 5分ごとに自動保存が実行される
3. 下書き名: "auto_0" → "auto_1" → ... → "auto_4"
4. 5世代を超えると古いものから削除される
5. 一覧に自動保存タグ付きで表示される

### 13.3. 下書き読み込み

1. 「下書き管理」を開く
2. 読み込みたい下書きを選択
3. 「読み込み」ボタンをクリック
4. 確認ダイアログが表示される
5. 「OK」をクリック
6. 下書きの内容が復元される
7. 編集を再開できる

### 13.4. 下書き削除

1. 「下書き管理」を開く
2. 削除したい下書きを選択
3. 「削除」ボタンをクリック
4. 削除確認ダイアログが表示される
5. 「OK」をクリック
6. 下書きがS3から削除される
7. 一覧から消える

### 13.5. 下書き検索

1. 検索フィールドに「experiment」と入力
2. "experiment"を含む下書きのみ表示される
3. 検索クエリをクリアすると全件表示に戻る

---

## 14. パフォーマンス最適化

### 14.1. フィルタリングとソートのメモ化

```typescript
const filteredAndSortedDrafts = useMemo(() => {
  let result = [...drafts];
  
  // 検索フィルタ
  if (searchQuery) {
    result = result.filter(draft =>
      draft.draft_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }
  
  // ソート
  result.sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return new Date(b.last_saved_at).getTime() - new Date(a.last_saved_at).getTime();
      case 'name':
        return a.draft_name.localeCompare(b.draft_name);
      case 'nodeCount':
        return (b.node_count || 0) - (a.node_count || 0);
      default:
        return 0;
    }
  });
  
  return result;
}, [drafts, searchQuery, sortBy]);
```

---

## 15. セキュリティ

### 15.1. ユーザー分離

- 各ユーザーは自分の下書きのみアクセス可能
- S3パスに user_id を含める
- APIでuserIdを検証

### 15.2. 組織分離

- 各組織は自組織の下書きのみアクセス可能
- S3パスに organization_id を含める
- APIでorganizationIdを検証

---

## 16. アクセシビリティ

### 16.1. キーボード操作

- Tab: フォーカス移動
- Enter: ボタンクリック
- Escape: モーダルを閉じる
- 矢印キー: リスト項目移動

### 16.2. ARIA属性

- role="dialog"（Modal時に自動付与）
- aria-label="下書き管理"
