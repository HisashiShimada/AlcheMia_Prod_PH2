# PetriNetViewer UI仕様書

## 1. 概要

### 1.1. コンポーネントの目的

Petri Netを閲覧専用で表示するビューアーコンポーネント。編集機能は持たず、MAIMLファイルの可視化、ズーム・パン操作、ノードのプロパティ表示、サブネット表示などの閲覧機能を提供します。

### 1.2. 使用場面

- 進捗確認画面で実験フローを表示する場合
- 作業指示画面でタスクを確認する場合
- プロジェクト詳細モーダルでPetri Netを表示する場合
- 実験記録画面でメソッドを表示する場合

### 1.3. アクセス権限

- **対象ロール**: Experiment Admin、Experiment Worker
- **必須認証**: JWT認証必須
- **テナント分離**: organization_id によるマルチテナント分離

---

## 2. 画面構成

### 2.1. レイアウト構造

```
┌─────────────────────────────────────────────────────┐
│ ツールバー（Panel）                                  │
│ [拡大] [縮小] [リセット] [全画面] [ダウンロード]     │
├─────────────────────────────────────────────────────┤
│ ReactFlow表示エリア                                 │
│ ┌─────────────────────────────────────────────────┐ │
│ │                                                 │ │
│ │   ◯→[T]→◯                                     │ │
│ │  Place Trans Place                              │ │
│ │                                                 │ │
│ │ [Controls] [MiniMap]                            │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ℹ️ エラー表示（パースエラー時）                      │
│ 🔄 ローディング（初回読み込み時）                    │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ PropertyViewerWithSelection（ノード選択時）          │
│ Modal or Drawer                                     │
└─────────────────────────────────────────────────────┘
```

### 2.2. 主要UI要素

#### 2.2.1. ツールバー（Panel）

**配置:** ReactFlow上部（Panel top-right）

| ボタン | アイコン | 機能 |
|-------|---------|------|
| 拡大 | ZoomInOutlined | ズームイン |
| 縮小 | ZoomOutOutlined | ズームアウト |
| リセット | ReloadOutlined | ビューをリセット |
| 全画面 | FullscreenOutlined | 全画面表示 |
| ダウンロード | DownloadOutlined | PNG/SVGダウンロード |

**スタイル:**
- Space size="small"
- Button type="default", size="small"

#### 2.2.2. ReactFlow表示エリア

| 要素 | 説明 |
|------|------|
| Canvas | Petri Netを表示するキャンバス |
| Nodes | Place/Transitionノード（閲覧専用） |
| Edges | Arc（矢印） |
| Controls | 標準のReactFlowコントロール（右下） |
| MiniMap | ミニマップ（右下） |
| Background | ドット背景 |

**ノードタイプ:**
- materialTemplate: MaterialTemplateNode
- conditionTemplate: ConditionTemplateNode
- resultTemplate: ResultTemplateNode
- transition: TransitionNode

#### 2.2.3. PropertyViewerWithSelection

**表示条件:** ノードをクリックした場合

**表示モード:**
- modal: モーダル表示（デフォルト）
- drawer: ドロワー表示

**機能:**
- ノードのプロパティ表示
- テンプレート詳細表示
- サブネットビューアー起動（Transitionノードの場合）

#### 2.2.4. ローディング表示

**表示条件:** loading === true

| 要素 | 設定 |
|------|------|
| Spin | size="large" |
| 配置 | 画面中央 |

#### 2.2.5. エラー表示

**表示条件:** error !== null

| 要素 | 設定 |
|------|------|
| Alert | type="error", message, showIcon |
| 配置 | ReactFlowの上部 |

### 2.3. 画面遷移

- なし（閲覧専用）

---

## 3. 機能仕様

### 3.1. 主要機能の詳細

#### 3.1.1. MAIMLファイルの読み込み

**処理フロー:**
1. useEffect()でmaimlDataを監視
2. loading: true
3. parseMaimlToPetriNet()でMAIMLをパース
4. selectedMethodIdが指定されている場合、該当メソッドを抽出
5. convertToReactFlow()でReactFlowノード・エッジに変換
6. setNodes(), setEdges()で表示
7. loading: false

**エラーハンドリング:**
- パースエラー時はAlertでエラー表示
- error設定
- loading: false

#### 3.1.2. ノードのクリック

**処理フロー:**
1. onNodeClick()イベントをキャプチャ
2. selectedNodeステートに設定
3. PropertyViewerWithSelectionを表示:
   - propertyDisplayMode === 'modal': モーダル
   - propertyDisplayMode === 'drawer': ドロワー

**Transitionノードの場合:**
- onOpenSubNetViewer()コールバックを呼び出し
- サブネットビューアーを起動

#### 3.1.3. ズーム操作

**ズームイン:**
1. ツールバーの拡大ボタンをクリック
2. zoomIn()を実行
3. ズームレベル+0.2

**ズームアウト:**
1. ツールバーの縮小ボタンをクリック
2. zoomOut()を実行
3. ズームレベル-0.2

**ビューリセット:**
1. ツールバーのリセットボタンをクリック
2. fitView()を実行
3. すべてのノードが表示されるように調整

#### 3.1.4. 全画面表示

**処理フロー:**
1. ツールバーの全画面ボタンをクリック
2. containerElementIdが指定されている場合、該当要素を全画面化
3. 未指定の場合、document.documentElementを全画面化
4. Fullscreen API使用

#### 3.1.5. ダウンロード

**処理フロー:**
1. ツールバーのダウンロードボタンをクリック
2. Dropdownメニュー表示:
   - PNG形式でダウンロード
   - SVG形式でダウンロード
3. html-to-imageライブラリで画像生成
4. ダウンロード実行

#### 3.1.6. 複数メソッド対応

**処理フロー:**
1. maimlDataに複数メソッドが含まれる場合
2. selectedMethodIdで表示するメソッドを指定
3. 該当メソッドのみを抽出してパース
4. 未指定の場合、最初のメソッドを表示

#### 3.1.7. パフォーマンス最適化

**useMemo()使用:**
- ノード・エッジの変換処理
- 大規模Petri Net（100ノード以上）で効果

**useCallback()使用:**
- イベントハンドラー
- 不要な再レンダリングを防ぐ

### 3.2. ボタン・操作の動作

| 操作 | 動作 | 状態変更 |
|------|------|---------|
| 拡大ボタン | ズームイン | ズームレベル+0.2 |
| 縮小ボタン | ズームアウト | ズームレベル-0.2 |
| リセットボタン | ビューリセット | fitView() |
| 全画面ボタン | 全画面表示 | Fullscreen API |
| ダウンロードボタン | メニュー表示 | Dropdown表示 |
| ノードクリック | プロパティ表示 | selectedNode設定 |

### 3.3. バリデーションルール

- なし（閲覧専用のため）

---

## 4. データ仕様

### 4.1. Props型定義

```typescript
interface PetriNetViewerProps {
  maimlData?: string | null;              // MAIML文字列
  dotData?: string | null;                // DOT文字列（未使用）
  enhancedMode?: boolean;                 // 拡張モード
  performanceStats?: unknown;             // パフォーマンス統計
  propertyDisplayMode?: 'modal' | 'drawer';  // プロパティ表示モード
  containerElementId?: string;            // コンテナ要素ID（全画面用）
  selectedMethodId?: string;              // 選択されたメソッドID
  onOpenSubNetViewer?: (subnetData) => void;  // サブネット表示コールバック
}
```

### 4.2. State型定義

```typescript
interface State {
  nodes: Node[];                 // ReactFlowノード
  edges: Edge[];                 // ReactFlowエッジ
  loading: boolean;              // ローディング状態
  error: string | null;          // エラーメッセージ
  selectedNode: Node | null;     // 選択されたノード
  propertyViewerOpen: boolean;   // プロパティビューアー表示状態
}
```

### 4.3. ReactFlow Node型定義

```typescript
interface CustomNode extends Node {
  id: string;
  type: 'materialTemplate' | 'conditionTemplate' | 'resultTemplate' | 'transition';
  position: { x: number; y: number };
  data: {
    label: string;
    stereotype?: string;
    template?: any;
    [key: string]: any;
  };
}
```

---

## 5. API連携

### 5.1. 使用するAPI一覧

- なし（Props経由でデータを受け取る）

---

## 6. エラーハンドリング

### 6.1. エラーケース

| エラーケース | 処理 | 表示 |
|------------|------|------|
| MAIMLパースエラー | error設定 | Alertでエラー表示 |
| 空のMAIMLデータ | エラー表示なし | 空のキャンバス表示 |

### 6.2. エラーメッセージ

- 「MAIMLファイルの読み込みに失敗しました」
- 「Petri Netのパースに失敗しました」

---

## 7. UI/UXポリシー準拠

### 7.1. Ant Designコンポーネント使用

| コンポーネント | 使用箇所 | props |
|--------------|---------|-------|
| Card | 外側のコンテナ | bordered={false} |
| Button | ツールバー | type, size, icon, onClick |
| Space | ツールバーレイアウト | size="small" |
| Alert | エラー表示 | type, message, showIcon |
| Spin | ローディング | size="large" |
| Dropdown | ダウンロードメニュー | menu, trigger |
| Drawer | プロパティ表示（drawer mode） | width, open, onClose |

### 7.2. ReactFlow使用

- ReactFlow本体
- useNodesState / useEdgesState
- MiniMap / Controls / Background / Panel
- カスタムノードタイプ

### 7.3. カスタムノード

- MaterialTemplateNode
- ConditionTemplateNode
- ResultTemplateNode
- TransitionNode

### 7.4. レスポンシブ対応

- 親コンテナのサイズに応じて自動調整
- 最小高さ: 400px（推奨）

---

## 8. 実装ファイル

### 8.1. ソースファイルパス

```
frontend/src/components/viewer/PetriNetViewer.tsx
```

### 8.2. 関連コンポーネント

| コンポーネント | パス | 役割 |
|--------------|------|------|
| PropertyViewerWithSelection | ./dialogs/PropertyViewerWithSelection | プロパティ表示 |
| MaterialTemplateNode | ../nodes/MaterialTemplateNode | カスタムノード |
| ConditionTemplateNode | ../nodes/ConditionTemplateNode | カスタムノード |
| ResultTemplateNode | ../nodes/ResultTemplateNode | カスタムノード |
| TransitionNode | ../nodes/TransitionNode | カスタムノード |

### 8.3. ユーティリティ

| ユーティリティ | パス | 役割 |
|--------------|------|------|
| parseMaimlToPetriNet | ../../utils/maimlParser | MAIMLパース |
| convertToReactFlow | ../../utils/reactFlowConverter | ReactFlow変換 |

### 8.4. 依存ライブラリ

| ライブラリ | バージョン | 用途 |
|-----------|----------|------|
| reactflow | 11.11.4 | Petri Net表示 |
| antd | 6.x | UIコンポーネント |
| @ant-design/icons | 5.x | アイコン |
| html-to-image | - | 画像エクスポート |

---

## 9. 既知の課題・TODO

- [ ] DOTデータ対応（現在未使用）
- [ ] SVGダウンロード機能の完全実装
- [ ] 大規模Petri Net（1000ノード以上）のパフォーマンス最適化
- [ ] タッチデバイス対応の改善
- [ ] アニメーション機能（オプション）

---

## 10. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2026-01-21 | 初版作成 | Cline |

---

## 11. 使用例

### 11.1. 基本的な使用方法

```typescript
import PetriNetViewer from '@/components/viewer/PetriNetViewer';

function MyComponent() {
  const [maimlData, setMaimlData] = useState<string | null>(null);

  return (
    <PetriNetViewer
      maimlData={maimlData}
      propertyDisplayMode="modal"
      containerElementId="petri-net-container"
    />
  );
}
```

### 11.2. 複数メソッド対応

```typescript
<PetriNetViewer
  maimlData={maimlData}
  selectedMethodId="method_002"  // 特定メソッドを表示
  propertyDisplayMode="drawer"
/>
```

### 11.3. サブネットビューアー連携

```typescript
const handleOpenSubNet = (subnetData) => {
  // サブネットビューアーを開く処理
  console.log('Opening subnet:', subnetData.transitionName);
};

<PetriNetViewer
  maimlData={maimlData}
  onOpenSubNetViewer={handleOpenSubNet}
/>
```

---

## 12. パフォーマンス最適化

### 12.1. メモ化

- useMemo()でノード・エッジの変換結果をキャッシュ
- useCallback()でイベントハンドラーをメモ化

### 12.2. 遅延レンダリング

- 大規模Petri Netでは、ビューポート外のノードは簡略表示
- ReactFlowのデフォルト最適化を活用

### 12.3. 推奨されるノード数

- 最適: 〜100ノード
- 許容: 〜500ノード
- 注意: 500ノード以上（パフォーマンス低下の可能性）

---

## 13. アクセシビリティ

### 13.1. キーボード操作

- +/-: ズームイン/アウト
- 0: ビューリセット
- Space + ドラッグ: パン操作

### 13.2. スクリーンリーダー対応

- ノードにaria-labelを設定
- ツールバーボタンにaria-labelを設定
