# タスク計画書: PetriNetEditorInner 型定義完全修正

## メタデータ
- **作成日時**: 2026-01-30 11:43
- **タスクID**: PetriNetEditorInner_型定義完全修正
- **優先度**: 高
- **推定工数**: 2時間

## 1. タスク概要

PetriNetEditorInner.tsxで発生している大量のTypeScriptエラーとESLintエラーを完全に解消します。

**検出されたエラー数**: 
- TypeScriptエラー: 約200件
- ESLintエラー: 1件

## 2. 目的と期待される成果

### 目的
- 型安全性を確保し、ランタイムエラーのリスクを低減
- ESLintルールに準拠したコードに修正
- 開発効率の向上（型推論・補完の改善）

### 期待される成果
- [ ] すべてのTypeScriptエラーが解消される
- [ ] すべてのESLintエラーが解消される
- [ ] 型定義が明示的になる
- [ ] コードの保守性が向上する

## 3. 実装ステップ

### Phase 1: インポートと型定義の修正
- [ ] `Edge`型のインポート追加（reactflowから）
- [ ] `ValidationError`インターフェースを明示的に定義
- [ ] `ValidationResult`インターフェースを明示的に定義
- [ ] `DocumentData`インターフェースを明示的に定義
- [ ] `Method`インターフェースを明示的に定義
- [ ] `ClipboardData`インターフェースを明示的に定義
- [ ] `TemplateRef`インターフェースを明示的に定義
- [ ] `NodeData`インターフェースを明示的に定義
- [ ] `EdgeData`インターフェースを明示的に定義

### Phase 2: State定義の型修正
- [ ] `validationResult`のstate型を`ValidationResult | null`に変更
- [ ] `documentData`のstate型を`DocumentData | null`に変更
- [ ] `methods`のstate型を`Method[]`に変更
- [ ] `selectedNode`のstate型を修正
- [ ] `selectedEdge`のstate型を修正
- [ ] `clipboard`のstate型を修正
- [ ] `pendingClickPosition`のstate型を修正
- [ ] `savedPetriNetViewport`のstate型を修正

### Phase 3: イベントハンドラーの型定義
- [ ] すべてのパラメーターに明示的な型注釈を追加
- [ ] `handleKeyDown`, `handleKeyUp`のevent型を`KeyboardEvent`に
- [ ] `handlePaneClick`のevent型を`React.MouseEvent`に
- [ ] `handleNodeClick`, `handleEdgeClick`の型定義
- [ ] その他すべてのイベントハンドラーの型定義

### Phase 4: ユーティリティ関数の型定義
- [ ] `extractAffectedElements`の戻り値型を定義
- [ ] `convertNestedPropertiesToArray`の型定義
- [ ] その他ユーティリティ関数の型定義

### Phase 5: catchブロックのエラー型修正
- [ ] すべてのcatchブロックで`err: unknown`を明示
- [ ] エラーハンドリングで型ガードを使用

### Phase 6: Props型定義の修正
- [ ] `PetriNetEditorInnerProps`の`[key: string]: unknown`を削除
- [ ] `PetriNetEditorInnerUI`のPropsインターフェースを定義
- [ ] すべてのコンポーネントPropsを明示的に型定義

### Phase 7: ESLintエラーの修正
- [ ] Line 3576の`any`型を具体的な型に置き換え

### Phase 8: 動作確認
- [ ] TypeScriptコンパイルエラーがないことを確認
- [ ] ESLintエラーがないことを確認
- [ ] 開発サーバーでの動作確認
- [ ] 主要機能のテスト

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/components/editorv2/PetriNetEditorInner.tsx` - 型定義の全面的な修正

### 影響を受ける機能
- なし（内部的な型定義のみの変更）

## 5. 技術的詳細

### 主要な型定義の例

```typescript
// Edge型のインポート
import type { Node, Edge } from 'reactflow';

// ValidationError型
interface ValidationError {
  type: string;
  message: string;
  severity?: 'error' | 'warning';
  xpath?: string;
  ref?: string;
  duplicateId?: string;
  paths?: string[];
  details?: string;
}

// ValidationResult型
interface ValidationResult {
  success: boolean;
  errors?: ValidationError[];
  warnings?: ValidationError[];
}

// DocumentData型
interface DocumentData {
  id: string;
  protocolId: string;
  methodId: string;
  pnmlId: string;
  programId: string;
  name: string;
  description?: string;
  date?: string;
  uuid?: string;
  creator?: { id: string; name: string };
  vendor?: { id: string; name: string };
  owner?: { id: string; name: string };
  instrument?: { id: string; name: string };
}

// Method型
interface Method {
  methodId: string;
  methodIndex: number;
  name: string;
  nodes: Node[];
  edges: Edge[];
  viewport: { x: number; y: number; zoom: number };
}
```

### State定義の修正例

```typescript
// Before
const [documentData, setDocumentData] = useState(null);
const [validationResult, setValidationResult] = useState(null);
const [methods, setMethods] = useState([]);

// After
const [documentData, setDocumentData] = useState<DocumentData | null>(null);
const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
const [methods, setMethods] = useState<Method[]>([]);
```

### イベントハンドラーの修正例

```typescript
// Before
const handleKeyDown = (event) => { ... }

// After
const handleKeyDown = (event: KeyboardEvent) => { ... }
```

### catchブロックの修正例

```typescript
// Before
} catch (err) {
  console.error('エラー:', err);
  alert(err.message);
}

// After
} catch (err: unknown) {
  console.error('エラー:', err);
  const message = err instanceof Error ? err.message : 'Unknown error';
  alert(message);
}
```

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 型定義の誤りによる実行時エラー | 高 | 低 | 段階的に修正し、各Phase後に動作確認 |
| 既存の動作への影響 | 中 | 低 | ロジックは変更せず、型定義のみを修正 |
| 修正時間の超過 | 低 | 中 | 優先度の高いエラーから順に対応 |

## 7. テスト計画

### コンパイル確認
- [ ] `npm run build`でビルドエラーがないことを確認
- [ ] `npm run lint`でESLintエラーがないことを確認

### 動作確認
- [ ] 開発サーバーが正常に起動することを確認
- [ ] PetriNetEditorコンポーネントが正常に表示されることを確認
- [ ] ノード追加・削除・編集が正常に動作することを確認
- [ ] バリデーション機能が正常に動作することを確認
- [ ] 保存機能が正常に動作することを確認

## 8. ロールバック計画

問題が発生した場合:
1. Gitで直前のコミットに戻す
2. TypeScriptエラーの原因を特定
3. 該当箇所のみを修正して再試行

## 9. 関連ドキュメント

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
- [ReactFlow TypeScript Guide](https://reactflow.dev/learn/advanced-use/typescript)

## 10. 承認記録

- **計画書提示日時**: 2026-01-30 11:43
- **承認待ち**

## 11. 実施記録

### 実施日時
開始: (承認後に記入)
完了: (完了後に記入)

### 計画からの変更点
(実施中に発生した変更を記録)

### 発生した問題と解決方法
(実施中に発生した問題とその解決方法を記録)

### 最終的な成果物
- [ ] すべてのTypeScriptエラー解消
- [ ] すべてのESLintエラー解消
- [ ] 型安全性の向上

## 12. 振り返り

### うまくいった点
(完了後に記入)

### 改善が必要な点
(完了後に記入)

### 学んだこと
(完了後に記入)