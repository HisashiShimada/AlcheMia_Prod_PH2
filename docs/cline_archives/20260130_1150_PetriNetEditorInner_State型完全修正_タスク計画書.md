# PetriNetEditorInner State型完全修正タスク計画書

## メタデータ
- **作成日時**: 2026-01-30 11:50
- **タスクID**: PetriNetEditorInner_State型完全修正
- **優先度**: 高
- **推定工数**: 2時間

## 1. タスク概要

PetriNetEditorInner.tsxで発生している大量の型エラーを解消します。主な問題は、State変数の型推論が不正確なことです。

## 2. 主要な問題点

### 問題1: methods Stateが`never[]`型と推論されている
```typescript
// ❌ 現状: never[]型と推論される
const [methods, setMethods] = useState([]);

// ✅ 修正: Method[]型を明示
const [methods, setMethods] = useState<Method[]>([]);
```

### 問題2: documentData Stateが`null`型と推論されている
```typescript
// ❌ 現状: null型と推論される
const [documentData, setDocumentData] = useState(null);

// ✅ 修正: DocumentData | null型を明示
const [documentData, setDocumentData] = useState<DocumentData | null>(null);
```

### 問題3: 各種State変数の型が明示されていない
- selectedNode, selectedEdge, clipboard, pendingClickPosition など

### 問題4: PetriNetEditorInnerUIのProps型がすべてany
```typescript
// ❌ 現状: すべてanyで型安全性がない
const PetriNetEditorInnerUI = ({ nodes, edges, ... }) => { ... }

// ✅ 修正: interface定義して型を明示
interface PetriNetEditorInnerUIProps { ... }
const PetriNetEditorInnerUI: React.FC<PetriNetEditorInnerUIProps> = ({ ... }) => { ... }
```

## 3. 実装ステップ

### Phase 1: State型の明示化
- [ ] methods State: `Method[]`型を明示
- [ ] documentData State: `DocumentData | null`型を明示
- [ ] selectedNode State: `Node<NodeData> | null`型を明示
- [ ] selectedEdge State: `Edge<EdgeData> | null`型を明示
- [ ] clipboard State: `ClipboardData | null`型を明示
- [ ] その他のState変数の型を明示

### Phase 2: PetriNetEditorInnerUIProps型定義
- [ ] interfaceを作成
- [ ] 全Props項目に正しい型を設定
- [ ] React.FCで型を適用

### Phase 3: ハンドラ関数のパラメータ型修正
- [ ] extractAffectedElementsのerrorsパラメータ型
- [ ] handleKeyDown/handleKeyUpのeventパラメータ型
- [ ] その他の関数パラメータ型

### Phase 4: エラー型の正確な処理
- [ ] try-catchのerr変数をunknown型として扱う
- [ ] 型ガードで適切に型を絞り込む

## 4. 期待される成果

- [ ] TypeScriptエラーがすべて解消される
- [ ] 型安全性が向上し、リファクタリングが容易になる
- [ ] ESLintエラーが解消される

## 5. 完了条件

- TypeScriptコンパイルエラー: 0件
- ESLintエラー: 0件
- ファイルが正常に保存できる