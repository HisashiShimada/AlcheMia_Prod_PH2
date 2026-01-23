# PetriNetEditor UI仕様書

## 1. 概要

### 1.1. コンポーネントの目的

React Flowを使用したPetri Net（ペトリネット）の表示・編集を行うメインコンポーネント。MAIMLファイルの視覚的な編集、複数メソッド対応、ドラフト管理、バリデーション、自動補正などの高度な機能を提供します。

### 1.2. 使用場面

- プロジェクト管理画面からMAIMLファイルを編集する場合
- フォーマット管理画面からワークフローテンプレートを編集する場合
- ドラフトファイルを復元して編集を継続する場合

### 1.3. アクセス権限

- **対象ロール**: Experiment Admin（実験管理者）
- **必須認証**: JWT認証必須
- **テナント分離**: organization_id によるマルチテナント分離

---

## 2. 画面構成

### 2.1. レイアウト構造

```
┌─────────────────────────────────────────────────────┐
│ EditorToolbar                                       │
│ [選択] [ワークフロー] [保存] [バリデ] [元に戻す]    │
├─────────────────────────────────────────────────────┤
│ MethodTabPanel（複数メソッドがある場合）            │
│ [メソッド1] [メソッド2] [メソッド3]                 │
├─────────────────────────────────────────────────────┤
│ ReactFlow編集エリア                    PropertyPanel│
│ ┌────────────────────────────┐  ┌────────────────┐ │
│ │                            │  │ プロパティ編集 │ │
│ │   ◯→[T]→◯                │  │                │ │
│ │  Place Trans Place         │  │ ノード詳細     │ │
│ │                            │  │                │ │
│ │ [Controls] [MiniMap]       │  │ [更新] [削除]  │ │
│ └────────────────────────────┘  └────────────────┘ │
├─────────────────────────────────────────────────────┤
│ ValidationPanel（開いている場合）                    │
│ [エラー一覧] [自動補正]                             │
└─────────────────────────────────────────────────────┘
```

### 2.2. 主要UI要素

#### 2.2.1. EditorToolbar（ツールバー）

- ツール選択（選択モード/ワークフロー追加モード）
- 保存ボタン
- バリデーションボタン
- 元に戻す/やり直しボタン
- ドキュメント編集ボタン
- ドラフト管理ボタン

#### 2.2.2. MethodTabPanel（メソッドタブ）

**表示条件:** 複数メソッドがある場合

- メソッドタブ（クリックで切替）
- メソッド追加ボタン
- メソッド削除ボタン

#### 2.2.3. ReactFlow編集エリア

| 要素 | 説明 |
|------|------|
| Canvas | Petri Netを表示・編集するキャンバス |
| Nodes | Place/Transitionノード |
| Edges | Arc（矢印） |
| Controls | ズーム、フィット、ロックコントロール |
| MiniMap | 右下のミニマップ |
| Background | ドット背景 |

#### 2.2.4. PropertyPanel（プロパティパネル）

**表示条件:** ノードまたはエッジが選択されている場合

- ノード/エッジのプロパティ編集フォーム
- 更新ボタン
- 削除ボタン

#### 2.2.5. ValidationPanel（バリデーションパネル）

**表示条件:** バリデーションボタンをクリックした場合

- エラー・警告の一覧
- 自動補正ボタン
- 閉じるボタン

### 2.3. ダイアログ一覧

| ダイアログ | 用途 |
|-----------|------|
| SaveConfirmDialog | 保存確認 |
| TemplateEditorDialog | テンプレート編集 |
| DocumentEditDialog | ドキュメント（プロジェクト情報）編集 |
| WorkflowSelectorDialog | ワークフロー選択 |
| DraftManager | ドラフト管理・復元 |

### 2.4. 画面遷移

- なし（全ての操作はダイアログで完結）

---

## 3. 機能仕様

### 3.1. 主要機能の詳細

#### 3.1.1. MAIMLファイルの読み込み

**処理フロー:**
1. useEffect()でmaimlDataまたはinitialContentを監視
2. parseMaimlToPetriNet()でMAIMLをパース
3. 複数メソッドがある場合、メソッドごとに分離
4. convertToReactFlow()でReactFlowノード・エッジに変換
5. methodsステートに格納
6. 最初のメソッドをアクティブ化

**エラーハンドリング:**
- パースエラー時はAlertでエラー表示
- onError()コールバックを実行

#### 3.1.2. ノード・エッジの選択

**処理フロー:**
1. onNodeClick()イベントをキャプチャ
2. selectedNodeステートに設定
3. PropertyPanelを表示
4. Ctrl/Cmdキー押下で複数選択（selectedNodes配列）

**エッジ選択:**
1. onEdgeClick()イベントをキャプチャ
2. selectedEdgeステートに設定
3. PropertyPanelを表示

#### 3.1.3. ノード・エッジの追加

**ノード追加（ワークフローモード）:**
1. ツールバーで「ワークフロー追加」を選択
2. キャンバス上をクリック
3. WorkflowSelectorDialogを表示
4. ワークフローファイルを選択
5. 選択位置にサブネットを追加

**エッジ追加:**
1. ノードのHandleをドラッグ
2. 別のノードのHandleにドロップ
3. onConnect()イベントでエッジを追加

#### 3.1.4. ノード・エッジの編集

**プロパティ編集:**
1. PropertyPanelでプロパティを変更
2. 更新ボタンをクリック
3. ノード/エッジのdataを更新

**テンプレート編集（Place）:**
1. Placeノードをダブルクリック
2. TemplateEditorDialogを表示
3. Material/Condition/Resultテンプレートを編集
4. 保存後、ノードを更新

#### 3.1.5. ノード・エッジの削除

**削除方法:**
1. ノード/エッジを選択
2. Deleteキーを押下、またはPropertyPanelの削除ボタン
3. 確認ダイアログを表示
4. 削除実行

**複数削除:**
- Ctrl/Cmd + クリックで複数選択
- Deleteキーで一括削除

#### 3.1.6. コピー・ペースト

**コピー:**
1. ノードを選択
2. Ctrl/Cmd + C
3. clipboardステートに保存

**ペースト:**
1. Ctrl/Cmd + V
2. マウス位置に新しいノードを配置
3. IDを自動生成

#### 3.1.7. 元に戻す・やり直し

**処理フロー:**
1. useHistory()カスタムフックで履歴管理
2. Ctrl/Cmd + Z: 元に戻す
3. Ctrl/Cmd + Shift + Z: やり直し
4. 最大20ステップまで保存

#### 3.1.8. メソッドの切り替え

**処理フロー:**
1. MethodTabPanelでタブをクリック
2. handleSwitchMethod()を実行
3. 現在のメソッドのviewportを保存
4. 新しいメソッドのnodes/edgesを読み込み
5. activeMethodIndexを更新

#### 3.1.9. メソッドの追加・削除

**追加:**
1. MethodTabPanelの「+」ボタンをクリック
2. 新しいメソッドを作成（空のPetri Net）
3. methods配列に追加
4. 新しいメソッドをアクティブ化

**削除:**
1. メソッドタブの削除ボタン
2. 確認ダイアログ
3. 該当メソッドを削除
4. 前のメソッドをアクティブ化

#### 3.1.10. バリデーション

**処理フロー:**
1. バリデーションボタンをクリック
2. convertReactFlowToMaiML()でMAIMLに変換
3. validateMaimlContent()でサーバー側バリデーション
4. 結果をvalidationResultに設定
5. ValidationPanelを表示

**バリデーション項目:**
- Petri Net構造の妥当性
- ノード・エッジのプロパティ
- テンプレートの完全性
- ドキュメント情報の完全性

#### 3.1.11. 自動補正

**処理フロー:**
1. ValidationPanelの「自動補正」ボタンをクリック
2. autoCorrectMaiml()でサーバー側補正
3. 補正されたMAIMLを受け取る
4. Petri Netを再構築
5. 成功メッセージを表示

#### 3.1.12. 保存処理

**処理フロー:**
1. 保存ボタンをクリック
2. バリデーション実行
3. エラーがある場合、SaveConfirmDialogを表示
4. convertMultipleMethodsToMaiML()でMAIMLに変換
5. onSaveCallback()またはデフォルト保存処理
6. 成功メッセージを表示

**ドラフトモード:**
- editMode === 'draft'の場合、ドラフトとして保存
- 元ファイルは上書きしない

#### 3.1.13. ドキュメント編集

**処理フロー:**
1. ツールバーの「ドキュメント編集」ボタン
2. DocumentEditDialogを表示
3. プロジェクト情報（タイトル、著者等）を編集
4. 保存後、documentDataステートを更新

#### 3.1.14. ドラフト管理

**ドラフト保存:**
- 自動保存: 30秒ごと
- 手動保存: ツールバーの「ドラフト保存」ボタン
- useDraftManager()フックで管理

**ドラフト復元:**
1. editMode === 'draft'で起動時
2. DraftManagerを自動表示（draftModeHandled）
3. ユーザーが復元または破棄を選択

#### 3.1.15. キーボードショートカット

| キー | 動作 |
|------|------|
| Ctrl/Cmd + S | 保存 |
| Ctrl/Cmd + Z | 元に戻す |
| Ctrl/Cmd + Shift + Z | やり直し |
| Ctrl/Cmd + C | コピー |
| Ctrl/Cmd + V | ペースト |
| Delete | 削除 |
| Escape | 選択解除 |

### 3.2. ボタン・操作の動作

| 操作 | 動作 | 状態変更 |
|------|------|---------|
| 選択モード | ノード・エッジを選択 | selectedTool: 'select' |
| ワークフロー追加モード | サブネット追加 | selectedTool: 'workflow' |
| 保存ボタン | 保存処理 | isSaving: true → false |
| バリデーションボタン | バリデーション実行 | isValidating: true → false |
| 元に戻す | 履歴を戻す | historyIndex更新 |
| やり直し | 履歴を進む | historyIndex更新 |
| ノードクリック | ノード選択 | selectedNode更新 |
| ノードダブルクリック | テンプレート編集 | templateEditorOpen: true |
| エッジクリック | エッジ選択 | selectedEdge更新 |
| キャンバスクリック | 選択解除 | selectedNode/Edge: null |
| メソッドタブクリック | メソッド切替 | activeMethodIndex更新 |

### 3.3. バリデーションルール

| 項目 | ルール | エラーメッセージ |
|------|--------|----------------|
| Petri Net構造 | Place-Transition-Placeの構造 | 「不正なPetri Net構造です」 |
| ノードプロパティ | 必須項目の入力 | 「必須項目が入力されていません」 |
| エッジ接続 | PlaceとTransition間のみ接続可能 | 「不正な接続です」 |
| テンプレート | 完全性チェック | 「テンプレートが不完全です」 |
| ドキュメント | 必須項目の入力 | 「ドキュメント情報が不足しています」 |

---

## 4. データ仕様

### 4.1. Props型定義

```typescript
interface PetriNetEditorProps {
  maimlData?: string;                   // MAIML文字列（後方互換）
  initialContent?: string;              // 初期MAIMLコンテンツ（推奨）
  projectId?: string;                   // プロジェクトID
  projectName?: string;                 // プロジェクト名
  editingFileName?: string;             // 編集中ファイル名
  editMode?: 'normal' | 'draft';        // 編集モード
  originalFileName?: string;            // 元ファイル名（ドラフト時）
  sourceS3Key?: string;                 // S3キー
  sourceContext?: 'project' | 'format'; // 遷移元コンテキスト
  onSave?: (content: string) => Promise<void>;  // 保存コールバック
  onContentChange?: () => void;         // 変更通知コールバック
  onError?: (error: Error) => void;     // エラーコールバック
}
```

### 4.2. MethodData型定義

```typescript
interface MethodData {
  methodId: string;              // メソッドID
  methodIndex: number;           // メソッドインデックス
  name: string;                  // メソッド名
  nodes: Node[];                 // ReactFlowノード
  edges: Edge[];                 // ReactFlowエッジ
  viewport: { x: number; y: number; zoom: number }; // ビューポート
}
```

### 4.3. ReactFlow Node型定義

```typescript
interface CustomNode extends Node {
  id: string;
  type: 'MaterialTemplate' | 'ConditionTemplate' | 'ResultTemplate' | 'Transition';
  position: { x: number; y: number };
  data: {
    label: string;
    stereotype?: string;
    template?: any;
    [key: string]: any;
  };
}
```

### 4.4. DocumentData型定義

```typescript
interface DocumentData {
  title: string;              // タイトル
  author: string;             // 著者
  version: string;            // バージョン
  date: string;               // 日付
  description?: string;       // 説明
  [key: string]: any;
}
```

---

## 5. API連携

### 5.1. 使用するAPI一覧

[MAIML編集API仕様書](../../../api/api_maiml_editor.md)を参照

| API | メソッド | エンドポイント | 説明 | 実装状態 |
|-----|---------|---------------|------|---------|
| MAIMLバリデーション | POST | `/api/v1/maiml/validate` | MAIMLのXMLバリデーション | 🔴 未実装 |
| MAIML自動補正 | POST | `/api/v1/maiml/correct` | 不正なMAIMLを自動補正 | 🔴 未実装 |
| MAIMLファイル保存（プロジェクト） | PUT | `/api/v1/projects/:projectId/maiml` | プロジェクトのMAIMLファイル保存 | 🔴 未実装 |
| MAIMLファイル保存（フォーマット） | PUT | `/api/v1/formats/:formatId/maiml` | フォーマットのMAIMLファイル保存 | 🔴 未実装 |

**注意**: ドラフト保存・読み込みAPIは現在API仕様書に未定義です。将来的に追加予定。

### 5.2. MAIMLバリデーション

**エンドポイント**: `POST /api/v1/maiml/validate`

**リクエストボディ**:
```typescript
{
  "content": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<maiml>...</maiml>",
  "strict": false
}
```

**レスポンス**:
```typescript
{
  "success": true,
  "data": {
    "valid": true,
    "errors": [],
    "warnings": [],
    "info": {
      "methodCount": 2,
      "placeCount": 10,
      "transitionCount": 8,
      "arcCount": 18
    }
  }
}
```

### 5.3. MAIML自動補正

**エンドポイント**: `POST /api/v1/maiml/correct`

**リクエストボディ**:
```typescript
{
  "content": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<maiml>...</maiml>",
  "correctionLevel": "safe"
}
```

**レスポンス**:
```typescript
{
  "success": true,
  "data": {
    "corrected": true,
    "originalContent": "<?xml version=\"1.0\"...",
    "correctedContent": "<?xml version=\"1.0\"...",
    "corrections": [
      {
        "type": "CLOSE_TAG_ADDED",
        "message": "閉じタグを追加しました",
        "line": 42,
        "element": "transition"
      }
    ]
  }
}
```

### 5.4. MAIMLファイル保存

**エンドポイント（プロジェクト）**: `PUT /api/v1/projects/:projectId/maiml`

**エンドポイント（フォーマット）**: `PUT /api/v1/formats/:formatId/maiml`

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
  }
}
```

### 5.5. 現在の実装状況

**重要**: 上記APIは現在すべて未実装です。

**代替実装**:
- バリデーション: クライアント側でのみ実施
- 自動補正: 機能なし
- 保存: onSaveコールバック経由（親コンポーネントで処理）
- ドラフト: ローカルストレージを使用

---

## 6. エラーハンドリング

### 6.1. エラーケース

| エラーケース | 処理 | 表示 |
|------------|------|------|
| MAIMLパースエラー | error設定 | Alertでエラー表示 |
| バリデーションエラー | validationResult設定 | ValidationPanelで表示 |
| 保存失敗 | message.error() | エラートースト |
| ネットワークエラー | onError()コールバック | エラートースト |

### 6.2. エラーメッセージ

- 「MAIMLファイルの読み込みに失敗しました」
- 「Petri Net構造にエラーがあります」
- 「保存に失敗しました」
- 「自動補正に失敗しました」

---

## 7. UI/UXポリシー準拠

### 7.1. Ant Designコンポーネント使用

| コンポーネント | 使用箇所 |
|--------------|---------|
| Spin | ローディング表示 |
| Alert | エラー表示 |
| Flex | レイアウト |

### 7.2. ReactFlow使用

- ReactFlow本体
- useNodesState / useEdgesState
- useReactFlow
- Background / Controls / MiniMap
- カスタムノードタイプ

### 7.3. サブコンポーネント

- EditorToolbar
- MethodTabPanel
- PropertyPanel
- ValidationPanel
- TemplateEditorDialog
- DocumentEditDialog
- WorkflowSelectorDialog
- SaveConfirmDialog
- DraftManager

---

## 8. 実装ファイル

### 8.1. ソースファイルパス

```
frontend/src/components/editor/PetriNetEditor.tsx
```

### 8.2. 関連コンポーネント

| コンポーネント | パス | 役割 |
|--------------|------|------|
| EditorToolbar | ./EditorToolbar.tsx | ツールバー |
| MethodTabPanel | ./MethodTabPanel.tsx | メソッドタブ |
| PropertyPanel | ./PropertyPanel.tsx | プロパティパネル |
| ValidationPanel | ./ValidationPanel.tsx | バリデーションパネル |
| MaterialTemplateNode | ../nodes/ | カスタムノード |

### 8.3. カスタムフック

| フック | パス | 役割 |
|--------|------|------|
| useHistory | ../../hooks/useHistory | 履歴管理 |
| useWorkflow | ../../hooks/useWorkflow | ワークフロー管理 |
| useDraftManager | ../../hooks/useDraftManager | ドラフト管理 |

---

## 9. 既知の課題・TODO

- [ ] 大規模Petri Net（100ノード以上）のパフォーマンス最適化
- [ ] より高度な自動レイアウト機能
- [ ] コラボレーション編集機能
- [ ] リアルタイムプレビュー機能

---

## 10. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 3.0.0 | 2025-12-23 | Phase 6対応 | Development Team |
| 1.0.0 | 2026-01-21 | 初版作成 | Cline |
