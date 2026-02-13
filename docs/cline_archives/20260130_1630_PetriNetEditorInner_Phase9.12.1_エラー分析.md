# PetriNetEditorInner Phase9.12.1 エラー分析

## 発生したエラー

### Line 387修正後の新しいエラー

```
Line 387: const [methods, setMethods] = useState<MethodData[]>([]);
```

この修正により、19件の新しい型エラーが発生：

**エラー内容:**
```
型 'MethodData' には 型 'Method' からの次のプロパティがありません: 
methodIndex, name, nodes, edges, viewport
```

## 原因分析

### MethodData型の定義（types/index.ts Line 145）
```typescript
export interface MethodData {
  methodId: string;
  places?: PlaceData[];
  transitions?: TransitionData[];
  arcs?: ArcData[];
}
```

### 実際に必要なMethod型のプロパティ
```typescript
// 実際の使用箇所から推測される型
interface Method {
  methodId: string;
  methodIndex: number;
  name: string;
  nodes: Node<NodeData>[];
  edges: Edge<EdgeData>[];
  viewport: { x: number; y: number; zoom: number };
}
```

## 解決策

### Option 1: Method型を定義する（推奨）

`types/index.ts`に新しい型を追加：

```typescript
export interface Method {
  methodId: string;
  methodIndex: number;
  name: string;
  nodes: Node<NodeData>[];
  edges: Edge<EdgeData>[];
  viewport: { x: number; y: number; zoom: number };
}
```

そして、Line 387を修正：
```typescript
const [methods, setMethods] = useState<Method[]>([]);
```

### Option 2: MethodDataを拡張する（非推奨）

`MethodData`型を変更するのは、APIレスポンスとして使われている可能性があるため非推奨。

## 影響範囲

以下の箇所でMethod型が使用されている：

1. Line 387: `useState<Method[]>`
2. Line 524, 537: `convertMultipleMethodsToMaiML`への引数
3. Line 2370-2450: Method配列の操作
4. Line 2683, 2693: Method配列の操作
5. Line 2853, 2862: Method配列の操作
6. Line 3171, 3190: Method配列の代入

合計: 約19箇所

## 次のアクション

### Phase9.12.1-A: Method型定義の追加

1. `types/index.ts`にMethod型を定義
2. Line 387を`useState<Method[]>`に修正
3. エラー数を確認（19件が解消されるはず）

### 推定所要時間

約5分

## 注意事項

- `MethodData`型はAPIレスポンスとして使用されているため、変更しない
- 新しい`Method`型は、エディタ内部での状態管理専用
- `multiMethodConverter.ts`も`Method`型を期待している可能性あり

## 完了条件

- [ ] Method型定義の追加
- [ ] Line 387の修正
- [ ] 型エラーが19件減少
- [ ] ビルドが成功

---

**次のセッションでPhase9.12.1-Aから再開してください。**