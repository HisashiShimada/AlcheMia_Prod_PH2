# ビューアのオブジェクト配置ロジック仕様

## 概要

Petri Netビューアでは、MAIMLファイルから読み込んだノード（Place、Transition）をReact Flowキャンバス上に配置します。このドキュメントでは、現在の配置ロジックと問題点を整理します。

## 配置フロー

```
MAIML XML
   ↓
[maimlParser.ts] XMLパース
   ↓
PetriNetStructure (places, transitions, arcs, templates)
   ↓
[reactFlowConverter.ts] React Flow形式に変換
   ↓
nodes[], edges[]
   ↓
[PetriNetEditor.tsx] React Flowで表示
```

## 1. maimlParser.ts

### 役割
MAIML XMLをパースして、ペトリネット構造（PetriNetStructure）を抽出します。

### 座標の取得

```typescript
// graphics position要素から座標を取得
const graphicsEl = placeEl.querySelector('graphics position');
const x = graphicsEl ? parseFloat(graphicsEl.getAttribute('x') || '0') : undefined;
const y = graphicsEl ? parseFloat(graphicsEl.getAttribute('y') || '0') : undefined;
```

#### XMLでの座標定義例

```xml
<place id="p1">
  <name>Material A</name>
  <graphics>
    <position x="100" y="200"/>
  </graphics>
</place>
```

### 出力
- **座標あり**: `{ id: 'p1', name: 'Material A', x: 100, y: 200 }`
- **座標なし**: `{ id: 'p1', name: 'Material A', x: undefined, y: undefined }`

---

## 2. reactFlowConverter.ts

### 役割
PetriNetStructure を React Flow 形式（nodes, edges）に変換します。

### 現在の配置ロジック

#### Placesの変換

```typescript
const node: Node = {
  id: place.id,
  type: nodeType,
  position: {
    x: place.x !== undefined ? place.x * 2 : Math.random() * 500,
    y: place.y !== undefined ? place.y * 2 : Math.random() * 500,
  },
  data: { ... }
};
```

- **座標あり**: `place.x * 2`（スケーリング）
- **座標なし**: `Math.random() * 500`（ランダム配置）

#### Transitionsの変換

```typescript
const node: Node = {
  id: transition.id,
  type: 'transition',
  position: {
    x: transition.x !== undefined ? transition.x * 2 : Math.random() * 500,
    y: transition.y !== undefined ? transition.y * 2 : Math.random() * 500,
  },
  data: { ... }
};
```

同様に、座標があれば使用、なければランダム配置。

### autoLayout関数

#### 目的
ノードが重ならないように自動配置します。

#### 現在の実装

```typescript
function autoLayout(nodes: Node[], edges: Edge[]): Node[] {
  // 位置情報がない場合のみ自動配置
  const hasPositions = nodes.every(
    (node) => node.position.x !== undefined && node.position.y !== undefined
  );

  if (hasPositions) {
    // 既に位置情報がある場合はそのまま返す
    return nodes;
  }

  // 簡易的な階層レイアウト（BFS）
  // ...
}
```

#### 問題点

**問題1: hasPositionsの判定が厳格すぎる**

`nodes.every(...)` は「**すべて**のノードに座標がある場合のみ true」を返します。

- **シナリオ1**: すべてのノードに座標がある → `hasPositions = true` → autoLayoutスキップ ✅ OK
- **シナリオ2**: すべてのノードに座標がない → `hasPositions = false` → autoLayout実行 ✅ OK
- **シナリオ3**: 一部のノードに座標がある → `hasPositions = false` → autoLayout実行 ⚠️ 問題

**問題2: ランダム配置後のautoLayout**

座標がないノードは `Math.random() * 500` で配置されます。その時点で `node.position.x !== undefined` になるため、**後続のautoLayoutが実行されない**可能性があります。

```typescript
// Step 1: 座標なしのノードをランダム配置
position: {
  x: place.x !== undefined ? place.x * 2 : Math.random() * 500,
  //                                       ↑ この時点でxは数値
  y: place.y !== undefined ? place.y * 2 : Math.random() * 500,
}

// Step 2: autoLayoutの判定
const hasPositions = nodes.every(
  (node) => node.position.x !== undefined && node.position.y !== undefined
);
// → hasPositions = true（すべてのノードに座標がある）

// Step 3: autoLayoutがスキップされる
if (hasPositions) {
  return nodes;  // ランダム配置のまま返される
}
```

---

## 3. PetriNetEditor.tsx

### 新規ノード追加（handleAddNode）

```typescript
const newNode: Node = {
  id: `${nodeType}-${Date.now()}`,
  type: ...,
  position: {
    x: Math.random() * 400 + 100,
    y: Math.random() * 400 + 100,
  },
  data: { ... }
};
```

- ランダム配置（100〜500の範囲）
- これは正しい動作（エディタで新規追加時）

---

## 問題の整理

### 問題1: 一部座標ありの場合の挙動

**ケース**: MAIMLファイル内で、一部のノードのみに座標が定義されている

```xml
<place id="p1">
  <graphics><position x="100" y="200"/></graphics>
</place>
<place id="p2">
  <!-- 座標なし -->
</place>
```

**現在の動作**:
1. `p1` → `position: { x: 200, y: 400 }` （x2スケーリング）
2. `p2` → `position: { x: 250, y: 350 }` （ランダム）
3. `hasPositions = true` （すべてのノードに座標がある）
4. autoLayoutがスキップされる
5. **結果**: `p2`がランダム配置のまま、`p1`と重なる可能性あり

**期待される動作**:
- 座標がないノードは、座標があるノードを基準に適切に配置される
- または、すべてのノードが階層レイアウトで再配置される

### 問題2: autoLayoutの階層レイアウトロジック

**現在の実装**:
- BFS（幅優先探索）で階層を構築
- エッジの接続関係から階層を決定
- 水平間隔: 250px、垂直間隔: 200px

**問題点**:
- 中央揃えの計算が複雑
- 大量のノードがある場合、画面外に配置される可能性

---

## 解決策の提案

### 案1: autoLayout判定ロジックの修正（推奨）

**変更内容**: 
- 座標がないノードが1つでもあれば、autoLayoutを実行する

```typescript
function autoLayout(nodes: Node[], edges: Edge[]): Node[] {
  // すべてのノードに座標がある場合のみスキップ
  const allHavePositions = nodes.every(
    (node) => 
      node.position.x !== undefined && 
      node.position.y !== undefined &&
      node.position.x !== 0 &&  // 初期値0は「座標なし」とみなす（オプション）
      node.position.y !== 0
  );

  if (allHavePositions) {
    return nodes;  // すべて座標ありならそのまま
  }

  // 座標がないノード、または座標が不適切なノードを再配置
  // ...
}
```

**メリット**:
- 一部座標ありの場合も対応可能
- ランダム配置を防げる

**デメリット**:
- すべてのノードが再配置される（座標ありのノードも移動）

### 案2: 座標なしノードのみを自動配置

**変更内容**:
- 座標があるノードはそのまま
- 座標がないノードのみを適切に配置

```typescript
function autoLayout(nodes: Node[], edges: Edge[]): Node[] {
  const nodesWithPosition: Node[] = [];
  const nodesWithoutPosition: Node[] = [];

  nodes.forEach(node => {
    if (node.position.x !== undefined && node.position.y !== undefined) {
      nodesWithPosition.push(node);
    } else {
      nodesWithoutPosition.push(node);
    }
  });

  if (nodesWithoutPosition.length === 0) {
    return nodes;  // すべて座標あり
  }

  // 座標なしノードを配置
  const layoutedNodes = layoutNodesWithoutPosition(
    nodesWithPosition,
    nodesWithoutPosition,
    edges
  );

  return [...nodesWithPosition, ...layoutedNodes];
}

function layoutNodesWithoutPosition(
  existingNodes: Node[],
  newNodes: Node[],
  edges: Edge[]
): Node[] {
  // 既存ノードの範囲を計算
  const minX = Math.min(...existingNodes.map(n => n.position.x));
  const maxX = Math.max(...existingNodes.map(n => n.position.x));
  const maxY = Math.max(...existingNodes.map(n => n.position.y));

  // 新しいノードを既存ノードの下に配置
  return newNodes.map((node, index) => ({
    ...node,
    position: {
      x: minX + (index % 5) * 250,  // 5列で折り返し
      y: maxY + 300 + Math.floor(index / 5) * 200,
    }
  }));
}
```

**メリット**:
- 座標ありのノードは元の位置を維持
- 座標なしノードのみを追加配置

**デメリット**:
- エッジの接続関係を考慮していない
- レイアウトが最適でない可能性

### 案3: ランダム配置を削除（最も単純）

**変更内容**:
- 座標がない場合は、Math.random()ではなく初期値0を設定
- autoLayoutで必ず再配置

```typescript
const node: Node = {
  id: place.id,
  type: nodeType,
  position: {
    x: place.x !== undefined ? place.x * 2 : 0,  // ランダム削除
    y: place.y !== undefined ? place.y * 2 : 0,
  },
  data: { ... }
};
```

```typescript
function autoLayout(nodes: Node[], edges: Edge[]): Node[] {
  // 座標が0のノードがあれば再配置
  const needsLayout = nodes.some(
    (node) => node.position.x === 0 && node.position.y === 0
  );

  if (!needsLayout) {
    return nodes;
  }

  // 階層レイアウト実行
  // ...
}
```

**メリット**:
- シンプル
- 確実にautoLayoutが実行される

**デメリット**:
- すべてのノードが再配置される

---

## 推奨する修正方針

**案1の修正版**: autoLayout判定ロジックを改善

1. **座標なしノードが存在する場合のみautoLayoutを実行**
2. **ランダム配置を削除** → 座標なしは `0` または `null` に統一
3. **autoLayoutで全体を再配置**

### 修正後のコード

#### reactFlowConverter.ts

```typescript
// Placesの変換
position: {
  x: place.x !== undefined ? place.x * 2 : 0,  // 座標なしは0
  y: place.y !== undefined ? place.y * 2 : 0,
}

// autoLayout
function autoLayout(nodes: Node[], edges: Edge[]): Node[] {
  // 座標が0のノード（座標なし）があるかチェック
  const needsLayout = nodes.some(
    (node) => node.position.x === 0 || node.position.y === 0
  );

  if (!needsLayout) {
    // すべてのノードに座標があればそのまま
    return nodes;
  }

  // 階層レイアウト実行（全ノード対象）
  // ...（既存のBFSロジック）
}
```

### メリット
- ✅ 一部座標ありのケースに対応
- ✅ ランダム配置を排除
- ✅ autoLayoutが確実に実行される
- ✅ 既存のBFSロジックを活用

### デメリット
- ⚠️ 座標ありのノードも再配置される（元の配置が失われる）

---

## reference版との比較

### reference版の配置ロジック（WorkerDashboard準拠）

reference版（`reference/frontend/src/components/PetriNetViewer/utils/reactFlowConverter.js`）では、より洗練された配置アルゴリズムを採用しています。

#### 主な特徴

**1. XML座標を無視**
```javascript
// reference版では、places/transitionsのposition情報を無視
// 常に自動レイアウトを実行
const nodePositions = calculateSimpleLayout(places, transitions, arcs);
```

**2. トポロジカルソートベースの階層レイアウト**
```javascript
const calculateSimpleLayout = (places, transitions, arcs) => {
  // Transition間の依存関係を計算（Place経由）
  // BFSでレベル（階層）を決定
  // レベルごとに配置
  
  const horizontalSpacing = 250;  // 階層間の水平間隔
  const nodeSpacing = 80;         // ノード間の垂直間隔
  const startX = 50;              // 開始X座標
}
```

**3. 配置ステップ**

1. **Transition階層の決定**
   - 入力次数（inDegree）を計算
   - BFSでTransitionをレベル分け
   - レベル0: 入力なしTransition（開始ノード）
   - レベル1以降: 依存関係に基づいて配置

2. **Place配置**
   - **従属Place**: 他のTransitionの出力であるPlaceは、親Transitionの近くに配置
   - **独立Place**: 入力専用のPlaceは、出力先Transitionの左側に配置
   - 衝突回避ロジックあり

3. **座標計算**
   ```
   TransitionX = startX + (level * horizontalSpacing) + (horizontalSpacing * 0.5)
   PlaceX = startX + (level * horizontalSpacing)
   PlaceY = 入力Placeの平均Y座標 ± nodeSpacing
   ```

#### reference版のメリット

✅ **エッジの接続関係を考慮**: トポロジカルソートで正しい階層を保証
✅ **重複を回避**: 衝突検出と回避ロジック
✅ **見やすいレイアウト**: 左から右への流れが明確
✅ **スケーラブル**: 大量のノードでも対応可能

#### reference版のデメリット

❌ **XML座標を無視**: graphics/position要素が保存されても使用されない
❌ **毎回再配置**: ユーザーが手動で配置した座標が失われる
❌ **複雑なアルゴリズム**: デバッグが困難

### 現在版との違い

| 項目 | 現在版（frontend/src） | reference版 |
|------|----------------------|-------------|
| XML座標の使用 | ✅ 使用（`place.x * 2`） | ❌ 無視（常に自動レイアウト） |
| 座標なしの処理 | ⚠️ ランダム配置 | ✅ トポロジカルソート |
| autoLayoutの判定 | ⚠️ `nodes.every(...)` | N/A（常に実行） |
| アルゴリズム | BFS（簡易版） | BFS（完全版）+ トポロジカルソート |
| 衝突回避 | ❌ なし | ✅ あり |
| 水平間隔 | 250px | 250px |
| 垂直間隔 | 200px | 80px（より密） |

### 推奨する修正案（改訂版）

reference版のアルゴリズムを参考にしつつ、XML座標も尊重する**ハイブリッドアプローチ**を提案します。

#### 案4: ハイブリッドアプローチ（最も柔軟）

**変更内容**:
1. **XML座標の判定を改善**
   - すべてのノードに座標がある → そのまま使用（スケーリングのみ）
   - 一部または全部に座標がない → reference版のトポロジカルソートを実行

2. **reference版のレイアウトアルゴリズムを移植**
   - `calculateSimpleLayout` 関数をTypeScriptに移植
   - トポロジカルソート + BFS
   - 衝突回避ロジック

3. **ユーザー選択可能に（将来的）**
   - 設定で「XML座標を使用」「自動レイアウト」を切り替え可能

**実装例**:

```typescript
// reactFlowConverter.ts

export function convertToReactFlow(structure: PetriNetStructure): {
  nodes: Node[];
  edges: Edge[];
} {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // 1. 座標の有無をチェック
  const allHavePositions = structure.places.every(
    (place) => place.x !== undefined && place.y !== undefined
  ) && structure.transitions.every(
    (transition) => transition.x !== undefined && transition.y !== undefined
  );

  let nodePositions: Map<string, { x: number; y: number }>;

  if (allHavePositions) {
    // すべてに座標がある → XML座標を使用（スケーリングのみ）
    console.log('📍 [convertToReactFlow] XML座標を使用');
    nodePositions = new Map();
    structure.places.forEach(place => {
      nodePositions.set(place.id, { x: place.x! * 2, y: place.y! * 2 });
    });
    structure.transitions.forEach(transition => {
      nodePositions.set(transition.id, { x: transition.x! * 2, y: transition.y! * 2 });
    });
  } else {
    // 座標なし、または一部のみ → トポロジカルソートで自動配置
    console.log('🔄 [convertToReactFlow] トポロジカルソートで自動配置');
    nodePositions = calculateTopologicalLayout(
      structure.places,
      structure.transitions,
      structure.arcs
    );
  }

  // 2. ノード・エッジを生成（既存のロジック）
  // ...

  return { nodes, edges };
}

/**
 * トポロジカルソートベースのレイアウト計算
 * reference版のcalculateSimpleLayoutを移植
 */
function calculateTopologicalLayout(
  places: Place[],
  transitions: Transition[],
  arcs: Arc[]
): Map<string, { x: number; y: number }> {
  // reference版のロジックをTypeScriptに移植
  // ...
}
```

**メリット**:
- ✅ XML座標がある場合は尊重
- ✅ 座標がない場合は美しい自動レイアウト
- ✅ reference版の洗練されたアルゴリズムを活用
- ✅ 一部座標ありのケースにも対応

**デメリット**:
- ⚠️ 実装がやや複雑
- ⚠️ reference版のコードをTypeScriptに移植する必要

---

## 次のステップ

### 1. 修正方針の選択

以下から選択してください：

- **案1**: autoLayout判定ロジックの修正（シンプル、座標は失われる）
- **案2**: 座標なしノードのみ自動配置（座標を維持、レイアウトは最適でない）
- **案3**: ランダム配置を削除（最もシンプル、すべて再配置）
- **案4**: ハイブリッドアプローチ（推奨、柔軟、実装コスト高）

### 2. 実装

選択した案に基づいて：
- reactFlowConverter.ts の修正
- autoLayout関数の改善（または新規実装）
- reference版のコード移植（案4の場合）

### 3. テスト

- 座標なしMAIMLファイル
- 一部座標ありMAIMLファイル
- すべて座標ありMAIMLファイル
- 大量ノード（100+）のMAIMLファイル

### 4. ドキュメント更新

- README.mdに配置ロジックの説明を追加
- コード内のコメントを充実
