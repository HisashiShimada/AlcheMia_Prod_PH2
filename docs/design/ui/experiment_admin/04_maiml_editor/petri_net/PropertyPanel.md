# PropertyPanel UI仕様書

## 1. 概要

### 1.1. コンポーネントの目的

ノードまたはエッジ選択時に表示される右側プロパティ編集パネル。選択されたノードのラベル、テンプレート、ステレオタイプなどのプロパティを編集し、エッジの接続先変更や削除を行います。

### 1.2. 使用場面

- PetriNetEditor内でノードを選択した場合
- PetriNetEditor内でエッジを選択した場合

### 1.3. アクセス権限

- **対象ロール**: Experiment Admin（実験管理者）
- **必須認証**: JWT認証必須

---

## 2. 画面構成

### 2.1. レイアウト構造

```
┌────────────────────────────────┐
│ [×] ノードプロパティ            │
├────────────────────────────────┤
│ ノードID: node_001             │
│ ノードタイプ: Place (Material) │
├────────────────────────────────┤
│ ラベル:                        │
│ [入力フィールド]               │
│                                │
│ ステレオタイプ:                │
│ [入力フィールド]               │
│                                │
│ テンプレート:                  │
│ 選択されていません             │
│ [テンプレートを編集]           │
│                                │
│ 説明:                          │
│ [テキストエリア]               │
│                                │
│ □ 出力ノード                   │
├────────────────────────────────┤
│ [削除]                         │
└────────────────────────────────┘
```

### 2.2. 主要UI要素

#### 2.2.1. ヘッダー

| 要素 | 機能 |
|------|------|
| タイトル | 「ノードプロパティ」/ 「エッジプロパティ」 |
| 閉じるボタン | Xアイコン、onClose()実行 |

#### 2.2.2. ノード情報（読み取り専用）

| 項目 | 説明 |
|------|------|
| ノードID | 選択されたノードのID |
| ノードタイプ | Place / Transition |
| Placeタイプ | Material / Condition / Result |

#### 2.2.3. 編集可能プロパティ

**Placeノードの場合:**

| プロパティ | コンポーネント | 説明 |
|----------|--------------|------|
| ラベル | Input | ノードのラベル |
| ステレオタイプ | Input | ステレオタイプ |
| テンプレート | テンプレート選択 | テンプレートの選択・編集 |
| 説明 | TextArea | 説明文 |
| 出力ノード | Checkbox | 出力ノードフラグ |

**Transitionノードの場合:**

| プロパティ | コンポーネント | 説明 |
|----------|--------------|------|
| ラベル | Input | トランジション名 |
| サブネット | サブネット選択 | サブネットの選択 |
| 説明 | TextArea | 説明文 |

**エッジの場合:**

| プロパティ | コンポーネント | 説明 |
|----------|--------------|------|
| エッジID | Text（読み取り専用） | エッジID |
| 接続元 | Select | 接続元ノード選択 |
| 接続先 | Select | 接続先ノード選択 |

#### 2.2.4. テンプレート選択エリア

**テンプレートが未選択の場合:**
- 「選択されていません」と表示
- 「テンプレートを編集」ボタン

**テンプレートが選択済みの場合:**
- テンプレートID表示
- テンプレート名表示
- 所属メソッド表示（複数メソッド対応）
- 「テンプレートを編集」ボタン

#### 2.2.5. 削除ボタン

| ボタン | アイコン | 機能 |
|-------|---------|------|
| 削除 | Trash2 | 選択されたノード/エッジを削除 |

**スタイル:**
- Button type="danger", block, icon

---

## 3. 機能仕様

### 3.1. 主要機能の詳細

#### 3.1.1. ノードプロパティの編集

**処理フロー:**
1. Inputフィールドに値を入力
2. onUpdate(nodeId, data)を実行
3. PetriNetEditor側でノードデータを更新

**更新可能なプロパティ:**
- label: ラベル
- stereotype: ステレオタイプ
- description: 説明
- outputNode: 出力ノードフラグ
- template: テンプレート情報

#### 3.1.2. テンプレートの選択・編集

**処理フロー:**
1. 「テンプレートを編集」ボタンをクリック
2. onOpenTemplateEditor(node)を実行
3. TemplateEditorダイアログを表示
4. テンプレート選択または新規作成
5. テンプレートIDを取得
6. onUpdate()でノードに関連付け

#### 3.1.3. サブネットの選択

**処理フロー:**
1. サブネット選択Selectをクリック
2. 利用可能なメソッド一覧を表示
3. メソッドを選択
4. onUpdate()でTransitionノードに関連付け

#### 3.1.4. エッジの接続先変更

**処理フロー:**
1. 接続元/接続先Selectを変更
2. 変更内容を検証（循環参照チェック）
3. onUpdateEdge(oldEdgeId, newEdgeId)を実行
4. 新しいエッジIDを生成（source-target形式）
5. PetriNetEditor側でエッジを更新

**検証ルール:**
- 接続元と接続先が同一ノードでないこと
- Placeノード同士は直接接続できない
- Transitionノード同士は直接接続できない

#### 3.1.5. ノード/エッジの削除

**処理フロー:**
1. 削除ボタンをクリック
2. 確認ダイアログを表示
3. OKの場合:
   - ノード: onDelete(nodeId)を実行
   - エッジ: onDeleteEdge(edgeId)を実行
4. Cancelの場合: ダイアログを閉じる

**確認メッセージ:**
- ノード: 「このノードを削除しますか？関連するエッジも削除されます。」
- エッジ: 「このエッジを削除しますか？」

### 3.2. ボタン・操作の動作

| 操作 | 動作 | 状態変更 |
|------|------|---------|
| ラベル入力 | ノード更新 | onUpdate(nodeId, {label}) |
| ステレオタイプ入力 | ノード更新 | onUpdate(nodeId, {stereotype}) |
| 説明入力 | ノード更新 | onUpdate(nodeId, {description}) |
| 出力ノードチェック | ノード更新 | onUpdate(nodeId, {outputNode}) |
| テンプレート編集ボタン | テンプレートエディタ表示 | onOpenTemplateEditor() |
| 接続元Select変更 | エッジ更新 | onUpdateEdge() |
| 接続先Select変更 | エッジ更新 | onUpdateEdge() |
| 削除ボタン | 削除確認 | Modal表示 |
| 閉じるボタン | パネルを閉じる | onClose() |

### 3.3. バリデーションルール

- ラベル: 必須（空白不可）
- 接続元/接続先: 必須、有効なノードID
- 循環参照: 禁止

---

## 4. データ仕様

### 4.1. Props型定義

```typescript
interface PropertyPanelProps {
  selectedNode: Node | null;                         // 選択されたノード
  selectedEdge: Edge | null;                         // 選択されたエッジ
  onUpdate: (nodeId: string, data: any) => void;    // ノード更新
  onUpdateEdge?: (oldEdgeId: string, newEdgeId: string) => void;  // エッジ更新
  onClose: () => void;                               // パネルを閉じる
  onOpenTemplateEditor: (node: Node) => void;        // テンプレートエディタ
  onDelete?: (nodeId: string) => void;               // ノード削除
  onDeleteEdge?: (edgeId: string) => void;           // エッジ削除
  nodes: Node[];                                     // 全ノードリスト
  edges: Edge[];                                     // 全エッジリスト
  methods?: Method[];                                // 全Method情報
  activeMethodIndex?: number;                        // アクティブなMethodインデックス
}
```

### 4.2. State型定義

```typescript
interface State {
  deleteConfirmOpen: boolean;      // 削除確認ダイアログ表示フラグ
  deleteEdgeConfirmOpen: boolean;  // エッジ削除確認ダイアログ表示フラグ
}
```

### 4.3. Node.data型定義

```typescript
interface NodeData {
  label: string;                   // ラベル
  nodeType: 'place' | 'transition';  // ノードタイプ
  placeType?: 'material' | 'condition' | 'result';  // Placeタイプ
  stereotype?: string;             // ステレオタイプ
  description?: string;            // 説明
  outputNode?: boolean;            // 出力ノードフラグ
  template?: {
    id: string;
    name: string;
  };
  subnetMethod?: {
    methodIndex: number;
    methodName: string;
  };
}
```

---

## 5. UI/UXポリシー準拠

### 5.1. Ant Designコンポーネント使用

| コンポーネント | 使用箇所 | props |
|--------------|---------|-------|
| Input | ラベル、ステレオタイプ | value, onChange |
| TextArea | 説明 | value, onChange, rows |
| Select | 接続元/接続先、サブネット | value, onChange, options |
| Checkbox | 出力ノード | checked, onChange |
| Button | テンプレート編集、削除、閉じる | type, icon, onClick, block |
| Typography.Text | 読み取り専用情報 | type="secondary" |
| Divider | セクション区切り | - |
| Modal | 削除確認ダイアログ | title, open, onOk, onCancel |
| Space | レイアウト | direction, size |

### 5.2. Lucide Reactアイコン使用

- X: 閉じるボタン
- Trash2: 削除ボタン

---

## 6. 実装ファイル

### 6.1. ソースファイルパス

```
frontend/src/components/editor/PropertyPanel.tsx
```

### 6.2. 関連コンポーネント

| コンポーネント | パス | 役割 |
|--------------|------|------|
| PetriNetEditor | ./PetriNetEditor | 親コンポーネント |
| TemplateEditor | ../dialogs/TemplateEditor | テンプレート編集 |

### 6.3. 依存ライブラリ

| ライブラリ | バージョン | 用途 |
|-----------|----------|------|
| antd | 6.x | UIコンポーネント |
| lucide-react | - | アイコン |
| reactflow | 11.11.4 | Node/Edge型定義 |

---

## 7. 既知の課題・TODO

- [ ] 複数ノード選択時の一括編集機能
- [ ] プロパティのUndo/Redo対応
- [ ] テンプレートプレビュー機能
- [ ] プロパティの履歴表示

---

## 8. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 2.0.0 | 2025-12-23 | Ant Design v6対応 | Development Team |
| 1.0.0 | 2026-01-21 | 初版作成 | Cline |

---

## 9. スタイリング

### 9.1. パネルコンテナ

```typescript
{
  width: '350px',
  height: '100%',
  borderLeft: '1px solid #f0f0f0',
  backgroundColor: '#ffffff',
  padding: '16px',
  overflow: 'auto',
}
```

### 9.2. レスポンシブ対応

- 固定幅: 350px
- モバイル: 全幅に展開（オーバーレイ表示）

---

## 10. 使用例

### 10.1. PetriNetEditorからの使用

```typescript
<PropertyPanel
  selectedNode={selectedNode}
  selectedEdge={selectedEdge}
  onUpdate={handleNodeUpdate}
  onUpdateEdge={handleEdgeUpdate}
  onClose={() => setSelectedNode(null)}
  onOpenTemplateEditor={handleOpenTemplateEditor}
  onDelete={handleDeleteNode}
  onDeleteEdge={handleDeleteEdge}
  nodes={nodes}
  edges={edges}
  methods={methods}
  activeMethodIndex={activeMethodIndex}
/>
```

---

## 11. パフォーマンス最適化

### 11.1. メモ化

- useMemo()でテンプレート情報を計算
- useMemo()でエッジ接続可能ノードをフィルタリング

### 11.2. デバウンス

- Input/TextArea の onChange イベントにデバウンスを適用（300ms）
- 頻繁な更新を抑制

---

## 12. アクセシビリティ

### 12.1. キーボード操作

- Tab: フォーカス移動
- Enter: 保存（Input内）
- Escape: パネルを閉じる

### 12.2. ラベル

- すべてのInputにlabel設定
- aria-labelで説明
