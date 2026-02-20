# PetriNetVisualization UI仕様書

## 1. 概要

### 1.1. コンポーネントの目的

MAIMLファイルからPlace、Transition、Arcを抽出し、Petri Net形式で視覚的に表示するコンポーネント。実験ワークフローの構造、進捗状態、実験記録を可視化します。ReactFlowライブラリを使用し、インタラクティブな操作が可能です。

### 1.2. 使用場面

- ProgressMonitoring画面で実験フローを表示する場合
- WorkProgressDetailDialogで詳細な進捗を確認する場合
- 実験記録タブでワークフロー全体を把握する場合

### 1.3. アクセス権限

- **対象ロール**: Experiment Admin（実験管理者）、Experiment Worker（実験作業者）
- **必須認証**: JWT認証必須
- **テナント分離**: organization_id によるマルチテナント分離

---

## 2. 画面構成

### 2.1. レイアウト構造

```
┌─────────────────────────────────────────────────────┐
│ [リロード]                        [タブ切替]         │
│ ┌─────────────────────────────────────────────────┐ │
│ │ ReactFlow表示エリア                             │ │
│ │                                                 │ │
│ │   ◯─────→ [T1] ─────→ ◯                      │ │
│ │  Material  Transition  Result                  │ │
│ │   [空円]    [長方形]   [二重円]                │ │
│ │                                                 │ │
│ │   進行中: 🔵  完了: ✅  待機: ⚪                │ │
│ │                                                 │ │
│ │ [ミニマップ] [ズーム±] [フィット] [ロック]      │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ℹ️ ロード中... / エラー表示 / データなし           │
└─────────────────────────────────────────────────────┘
```

### 2.2. 主要UI要素

#### 2.2.1. ReactFlow設定

| 項目 | 値 |
|------|-----|
| fitView | true（初期表示時） |
| minZoom | 0.1 |
| maxZoom | 2 |
| defaultEdgeOptions | animated, MarkerType.ArrowClosed |

#### 2.2.2. ノードタイプ

| ノードタイプ | 形状 | サイズ（縮小30%） | 色 | 説明 |
|------------|------|------------------|-----|------|
| MaterialTemplate | 空円 | 35×35px | border: colorText | Material（材料）Place |
| ConditionTemplate | 空円 | 35×35px | border: colorText | Condition（条件）Place |
| ResultTemplate | 二重円 | 35×35px | border: colorText | Result（結果）Place |
| Transition | 長方形 | 70×35px | background: colorPrimary | Transitionノード |

#### 2.2.3. ノード状態の色分け

| 状態 | 色 | 説明 |
|------|-----|------|
| 待機中 | colorText（黒） | デフォルト状態 |
| 進行中 | colorPrimary（青） | isInProgress: true |
| 完了 | colorSuccess（緑） | isCompleted: true |
| 発火済み | colorSuccess | isFired: true（影付き） |

#### 2.2.4. エッジ（Arc）設定

| 項目 | 値 |
|------|-----|
| type | 'default' |
| animated | true（進行中の場合） |
| style | { stroke: colorPrimary } |
| markerEnd | ArrowClosed |

#### 2.2.5. コントロール要素

| 要素 | 説明 |
|------|------|
| MiniMap | 右下に配置、ノード全体のミニマップ |
| Controls | ズームイン、ズームアウト、フィット、ロック |
| Background | ドット背景（variant: 'dots', gap: 16） |

#### 2.2.6. タブ切替（メソッド別表示）

**表示条件:** 複数メソッドがある場合

| タブ | 内容 |
|------|------|
| メソッド1 | 1つ目のメソッドのPetri Net |
| メソッド2 | 2つ目のメソッドのPetri Net |
| ... | ... |

#### 2.2.7. リロードボタン

| 項目 | 値 |
|------|-----|
| タイプ | default |
| アイコン | ReloadOutlined |
| テキスト | 「リロード」 |
| 位置 | 左上 |

### 2.3. 画面遷移

- なし（表示専用コンポーネント）

---

## 3. 機能仕様

### 3.1. 主要機能の詳細

#### 3.1.1. Petri Net構造の取得

**処理フロー:**
1. useEffect()でfileKeyを監視
2. fetchPetriNetStructure()でMAIMLファイルをパース
3. Place、Transition、Arcのデータを抽出
4. ReactFlowのノード・エッジ形式に変換
5. レイアウトアルゴリズムで座標を計算

**レイアウトアルゴリズム:**
- 階層構造でノードを配置
- 横方向の間隔: 200px
- 縦方向の間隔: 100px
- 始点: (50, 50)

#### 3.1.2. トランジション状態の取得

**処理フロー:**
1. useEffect()でfileKeyを監視
2. fetchTransitionStatus()でトランジションの進捗を取得
3. 各トランジションのステータスを更新:
   - isCompleted: 完了フラグ
   - isInProgress: 進行中フラグ
   - progressPercentage: 進捗率
4. ノードの色とスタイルを更新

**更新間隔:** リアルタイム（親コンポーネントからのPropsで制御）

#### 3.1.3. 実験記録の取得

**処理フロー:**
1. fetchExperimentRecords()で実験記録を取得
2. トランジションごとの記録数をカウント
3. ツールチップに記録情報を表示

#### 3.1.4. ノードのクリック処理

**処理フロー:**
1. onNodeClick()イベントをキャプチャ
2. ノードの種類を判定:
   - Transition: onTransitionClick(id)コールバックを実行
   - Place: 何もしない（表示専用）
3. 親コンポーネントで詳細情報を表示

#### 3.1.5. ノードのホバー処理

**処理フロー:**
1. onNodeMouseEnter()でホバー開始
2. Tooltipを表示:
   - ノード名
   - ステレオタイプ
   - 進捗情報
   - 実験記録数
3. onNodeMouseLeave()でTooltip非表示

#### 3.1.6. レイアウトの自動調整

**処理フロー:**
1. fitView()で全ノードが表示されるように調整
2. 初回ロード時に自動実行
3. リロードボタンクリック時にも実行

#### 3.1.7. ズーム操作

**処理フロー:**
1. Controlsコンポーネントでズームイン/アウト
2. マウスホイールでズーム
3. minZoom: 0.1、maxZoom: 2の範囲で制限

#### 3.1.8. パン操作（移動）

**処理フロー:**
1. 背景をドラッグしてPetri Net全体を移動
2. ノードをドラッグしてノード単体を移動（無効化可能）

#### 3.1.9. ミニマップ

**処理フロー:**
1. 右下にミニマップを表示
2. 現在の表示範囲を強調表示
3. ミニマップ上でクリックして移動

#### 3.1.10. リロード処理

**処理フロー:**
1. リロードボタンをクリック
2. loading: true
3. Petri Net構造を再取得
4. トランジション状態を再取得
5. 実験記録を再取得
6. fitView()で表示を調整
7. loading: false

#### 3.1.11. タブ切替（複数メソッド対応）

**処理フロー:**
1. 複数メソッドがある場合、Tabsコンポーネントを表示
2. タブをクリックしてメソッドを切り替え
3. selectedMethodIdを更新
4. 該当メソッドのPetri Netを表示

### 3.2. ボタン・操作の動作

| 操作 | 動作 | 状態変更 |
|------|------|---------|
| リロードボタン | Petri Net再取得 | loading: true → false |
| ノードクリック（Transition） | コールバック実行 | 親で制御 |
| ノードホバー | Tooltip表示 | - |
| 背景ドラッグ | Petri Net移動 | viewport更新 |
| マウスホイール | ズーム | zoom更新 |
| ズームイン/アウトボタン | ズーム | zoom更新 |
| フィットボタン | 全体表示 | viewport更新 |
| ミニマップクリック | 表示位置移動 | viewport更新 |
| タブクリック | メソッド切替 | selectedMethodId更新 |

### 3.3. バリデーションルール

- なし（表示専用）

---

## 4. データ仕様

### 4.1. Props型定義

```typescript
interface PetriNetVisualizationProps {
  fileKey: string;                               // MAIMLファイルキー
  onTransitionClick?: (transitionId: string) => void; // トランジションクリックコールバック
  showProgress?: boolean;                        // 進捗表示フラグ
  experimentRecords?: ExperimentRecordsData[];   // 実験記録データ
  methods?: MethodData[];                        // メソッドデータ（複数対応）
}
```

### 4.2. PetriNetData型定義

```typescript
interface PetriNetData {
  places: PlaceData[];          // Placeノード配列
  transitions: TransitionData[]; // Transitionノード配列
  arcs: ArcData[];              // Arc（エッジ）配列
}
```

### 4.3. PlaceData型定義

```typescript
interface PlaceData {
  id: string;              // PlaceID
  label: string;           // 表示名
  stereotype: string;      // ステレオタイプ（Material, Condition, Result）
  x?: number;              // X座標（レイアウト計算後）
  y?: number;              // Y座標（レイアウト計算後）
}
```

### 4.4. TransitionData型定義

```typescript
interface TransitionData {
  id: string;              // TransitionID
  label: string;           // 表示名
  category?: string;       // カテゴリ
  x?: number;              // X座標
  y?: number;              // Y座標
}
```

### 4.5. TransitionProgress型定義

```typescript
interface TransitionProgress {
  transitionId: string;         // TransitionID
  isCompleted: boolean;         // 完了フラグ
  isInProgress: boolean;        // 進行中フラグ
  progressPercentage: number;   // 進捗率（0-100）
  experimentCount: number;      // 実験記録数
}
```

### 4.6. ArcData型定義

```typescript
interface ArcData {
  id: string;              // ArcID
  source: string;          // 始点ノードID
  target: string;          // 終点ノードID
  label?: string;          // ラベル（オプション）
}
```

### 4.7. ReactFlow Node型定義

```typescript
interface CustomNode extends Node {
  id: string;
  type: 'MaterialTemplate' | 'ConditionTemplate' | 'ResultTemplate' | 'Transition';
  position: { x: number; y: number };
  data: CustomNodeData;
}
```

### 4.8. ReactFlow Edge型定義

```typescript
interface CustomEdge extends Edge {
  id: string;
  source: string;
  target: string;
  type: 'default';
  animated?: boolean;
  style?: { stroke: string };
  markerEnd?: { type: MarkerType };
}
```

---

## 5. API連携

### 5.1. 現在の実装状況

このコンポーネントで必要なAPIは、現時点ではAPI仕様書に定義されていません。

**必要な機能:**
1. MAIMLファイルからPetri Net構造を取得
2. トランジションの進捗状態を取得
3. 実験記録データを取得

**現在の実装:**
- 全てモックデータで動作
- `parseMultipleMethodsStructure()` で MAIMLファイルをローカルでパース
- モックデータから進捗情報を取得

### 5.2. 将来のAPI実装（参考）

将来的に以下のAPIが実装される可能性があります：

**Option 1: Maiml編集APIを拡張**
- [Maiml編集API仕様書](../../api/api_maiml_edit.md)の `POST /api/v1/maiml/parse` を使用
- レスポンスにPetri Net構造情報を含める

**Option 2: 進捗確認APIを活用**
- [進捗確認API仕様書](../../api/api_progress_monitoring.md)の以下のAPIを組み合わせる：
  - `GET /api/v1/projects/:projectId/methods/:methodId/tasks` - メソッド別タスク一覧取得
  - `GET /api/v1/tasks/:taskId` - タスク詳細取得
- タスク進捗情報からトランジションの状態を推測

**Option 3: プロジェクト管理APIを拡張**
- [プロジェクト管理API仕様書](../../api/api_project_management.md)の `GET /api/v1/projects/:projectId/tasks` を拡張
- タスク一覧と合わせてPetri Net構造を返す

### 5.3. 現在の代替実装

**MAIMLパース:**
```typescript
// フロントエンドでMAIMLファイルをパース
import { parseMultipleMethodsStructure } from '@/utils/maimlParser';

const maimlContent = await fetch(maimlFileUrl).then(res => res.text());
const methods = parseMultipleMethodsStructure(maimlContent);
const petriNetData = methods[0].petriNet; // Petri Net構造を取得
```

**進捗情報:**
```typescript
// モックデータから進捗を取得
const mockProgress = {
  transitions: [
    {
      transition_id: 't1',
      is_completed: true,
      is_in_progress: false,
      progress_percentage: 100
    }
  ]
};
```

**注意:** API実装時は、この代替実装を適切なAPI呼び出しに置き換える必要があります。

---

## 6. エラーハンドリング

### 6.1. エラーケース

| エラーケース | 処理 | 表示 |
|------------|------|------|
| MAIMLファイル取得失敗 | error設定 | Alertでエラー表示 |
| Petri Net構造パースエラー | error設定 | Alertでエラー表示 |
| トランジション状態取得失敗 | console.error | 進捗表示なし（構造のみ） |
| 実験記録取得失敗 | console.error | 記録数表示なし |
| レイアウト計算失敗 | デフォルト座標 | 警告表示 |

### 6.2. エラーメッセージ

**Alert表示:**
- type: error
- message: 「Petri Net構造の読み込みに失敗しました」
- description: エラー詳細

**データなし:**
- type: info
- message: 「Petri Netデータがありません」

---

## 7. UI/UXポリシー準拠

### 7.1. Ant Designコンポーネント使用

| コンポーネント | 使用箇所 | props |
|--------------|---------|-------|
| Card | 全体のコンテナ | - |
| Typography | テキスト表示 | Text |
| Alert | エラー・情報表示 | message, description, type, showIcon |
| Spin | ローディング | tip, size |
| Tag | ステータス表示 | color |
| Tooltip | ホバー情報 | title, placement |
| Button | リロード | type, icon, onClick |
| Space | 要素の配置 | direction, size |
| Flex | フレックスレイアウト | gap, align, justify |
| Divider | 区切り線 | - |
| Tabs | メソッド切替 | items, activeKey, onChange |

### 7.2. ReactFlow使用

| 機能 | 説明 |
|------|------|
| ReactFlow | Petri Net表示のコアライブラリ |
| useNodesState | ノード状態管理 |
| useEdgesState | エッジ状態管理 |
| MiniMap | ミニマップ表示 |
| Controls | ズーム・フィットコントロール |
| Background | 背景パターン |
| Handle | ノード接続ポイント |

### 7.3. デザイントークン使用

```typescript
import { theme } from 'antd';
const { token } = theme.useToken();

// 使用箇所
borderRadius: token.borderRadius
colorPrimary: token.colorPrimary
colorSuccess: token.colorSuccess
colorSuccessBg: token.colorSuccessBg
colorText: token.colorText
colorTextSecondary: token.colorTextSecondary
colorBgContainer: token.colorBgContainer
colorBorder: token.colorBorder
```

### 7.4. カラーパレット

**ノード状態:**
- 待機中: colorText（黒）
- 進行中: colorPrimary（青）
- 完了: colorSuccess（緑）

**エッジ:**
- 通常: colorBorder
- 進行中: colorPrimary（アニメーション）

### 7.5. レスポンシブ対応

- ReactFlowは自動的にコンテナサイズに追従
- fitView()で画面サイズに合わせて最適化
- ミニマップとコントロールは固定配置

---

## 8. 実装ファイル

### 8.1. ソースファイルパス

```
frontend/src/components/progress/PetriNetVisualization.tsx
```

### 8.2. 関連コンポーネント

- MaterialTemplateNode: Material Place用カスタムノード
- ConditionTemplateNode: Condition Place用カスタムノード
- ResultTemplateNode: Result Place用カスタムノード
- TransitionNode: Transition用カスタムノード

### 8.3. 依存ライブラリ

| ライブラリ | バージョン | 用途 |
|-----------|----------|------|
| reactflow | 11.11.4 | Petri Net可視化 |
| antd | 6.x | UIコンポーネント |
| @ant-design/icons | 5.x | アイコン |

### 8.4. カスタムフック

- なし（useState、useEffect、useCallbackのみ使用）

### 8.5. 型定義

| 型 | パス | 役割 |
|----|------|------|
| PetriNetData | @/types/progress | Petri Net構造 |
| TransitionProgress | @/types/progress | トランジション進捗 |
| MethodData | @/types/progress | メソッドデータ |
| ExperimentRecordsData | @/types/progress | 実験記録データ |

---

## 9. 既知の課題・TODO

### 実装待ち

- [ ] ノードのドラッグ&ドロップ編集機能（現在は表示専用）
- [ ] エッジの追加・削除機能
- [ ] レイアウトアルゴリズムの改善（自動整列）
- [ ] サブネットワークの折りたたみ機能
- [ ] エクスポート機能（PNG、SVG）

### 改善提案

- [ ] パフォーマンス最適化（大規模Petri Net対応）
- [ ] アンドゥ・リド機能
- [ ] カスタムテーマ対応
- [ ] アクセシビリティ改善（キーボード操作）
- [ ] 検索機能（ノード名、トランジション名）
- [ ] フィルタリング機能（完了済み非表示など）
- [ ] アニメーション設定（ON/OFF切替）
- [ ] スナップショット機能（状態の保存・復元）
- [ ] 比較機能（2つのPetri Netを並べて表示）
- [ ] コメント・注釈機能

---

## 10. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2026-01-21 | 初版作成 | Cline |

---

## 11. パフォーマンス最適化

### 11.1. メモ化

- CustomNodeコンポーネントをmemo()でラップ
- useCallback()でイベントハンドラーをメモ化
- useMemo()で計算結果をキャッシュ

### 11.2. 仮想化

- 大規模Petri Net（100ノード以上）の場合、表示範囲外のノードをレンダリングしない（ReactFlowの機能）

### 11.3. レンダリング最適化

- ノード状態の変更時、変更されたノードのみ再レンダリング
- エッジのアニメーションは必要最小限に制限

---

## 12. アクセシビリティ

### 12.1. キーボード操作

- Tab: ノード間の移動
- Enter: ノードの選択
- Escape: 選択解除
- +/-: ズームイン/アウト
- 矢印キー: Petri Netの移動

### 12.2. スクリーンリーダー対応

- ノードにaria-labelを設定
- 進捗状態をaria-describedbyで説明
- Tooltipの内容をaria-labelledbyで関連付け

---

## 13. テスト

### 13.1. ユニットテスト

- ノードの生成ロジック
- エッジの生成ロジック
- レイアウト計算アルゴリズム
- 状態更新ロジック

### 13.2. 統合テスト

- APIからのデータ取得
- ノードクリック時のコールバック
- リロード処理
- タブ切替

### 13.3. E2Eテスト

- Petri Net表示の確認
- ノードのホバー・クリック操作
- ズーム・パン操作
- エラー表示の確認
