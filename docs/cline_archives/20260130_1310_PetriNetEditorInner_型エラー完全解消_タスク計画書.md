# タスク計画書: PetriNetEditorInner型エラー完全解消

## メタデータ
- **作成日時**: 2026-01-30 13:10
- **タスクID**: PetriNetEditorInner_型エラー完全解消
- **優先度**: 高
- **推定工数**: 2-3時間

## 1. タスク概要

PetriNetEditorInner.tsxに存在する156件の型エラー（TypeScript + ESLint）を体系的に解消します。

## 2. 目的と期待される成果

### 目的
- すべてのTypeScriptコンパイルエラーを解消
- ESLintの`any`型警告をすべて解消
- 型安全性を確保し、実行時エラーを防止

### 期待される成果
- [ ] TypeScriptエラー: 0件
- [ ] ESLintエラー: 0件
- [ ] 型安全なコード
- [ ] 保守性の向上

## 3. エラー分類と解決策

### カテゴリA: any型の明示的型付け（12件）
**問題箇所:**
- Line 3220, 3221, 3228, 3234, 3291, 3319, 3325, 3330-3332, 3716

**解決策:**
```typescript
// 修正前
const handleMethodChange = useCallback((newIndex) => {

// 修正後
const handleMethodChange = useCallback((newIndex: number) => {
```

### カテゴリB: undefined/null安全性（40件）
**問題箇所:**
- Line 256-262 (placeRef関連)
- Line 753 (methodId)
- Line 2069-2073 (tempNode.data.template)
- Line 2441, 2469, 2475, 2481 (clipboard)

**解決策:**
```typescript
// 修正前
const placeId = getPlaceId(placeRefs[0]);

// 修正後
const placeId = placeRefs[0] ? getPlaceId(placeRefs[0]) : null;
```

### カテゴリC: 型定義の不一致（60件）
**主要な問題:**
1. **DocumentData型の不一致**
   - 内部定義とimport定義が異なる
   - `id`が`string | undefined`と`string`で不一致

2. **NodeData型の不一致**
   - `description`が`string | undefined`と`string`で不一致
   - `nodeType`が`string`と`NodeType`で不一致

3. **TemplateRef型の不一致**
   - `properties`が`Property[]`と`Record<string, unknown>`で不一致
   - `placeRefs`が`string[]`と`(string | object)[]`で不一致

**解決策:**
```typescript
// types/index.tsで統一的な型定義を使用
import type { 
  DocumentData,
  NodeData as BaseNodeData,
  ValidationResult
} from './types';

// ローカル拡張が必要な場合のみ型エイリアス
type NodeData = BaseNodeData & {
  isNewTemplate?: boolean;
  templateCategory?: string;
  methodId?: string | null;
};
```

### カテゴリD: 暗黙的any（40件）
**問題パターン:**
1. イベントハンドラのパラメータ
2. Array.map/filter/forEach のコールバック
3. エラーハンドリングのcatch

**解決策:**
```typescript
// イベントハンドラ
const handleNodeClick = useCallback((event: React.MouseEvent, node: Node<NodeData>) => {

// Array操作
methods.map((method: Method, index: number) => 

// エラーハンドリング
} catch (err: unknown) {
  const error = err instanceof Error ? err : new Error(String(err));
```

### カテゴリE: React Flow型の不一致（4件）
**問題:**
- `selectionMode="partial"` が型エラー
- `BackgroundVariant="dots"` が型エラー

**解決策:**
```typescript
// React Flowのバージョン確認と正しい型使用
import { SelectionMode, BackgroundVariant } from 'reactflow';

selectionMode={SelectionMode.Partial}
variant={BackgroundVariant.Dots}
```

## 4. 実装ステップ

### Phase 1: 型定義の統一化（30分）
- [ ] types/index.tsの型定義を確認
- [ ] ローカル型定義を整理
- [ ] 型エイリアスを適切に設定

### Phase 2: any型の解消（40分）
- [ ] すべての関数パラメータに型を明示
- [ ] イベントハンドラの型を修正
- [ ] Array操作のコールバックに型を追加

### Phase 3: undefined/null安全性（50分）
- [ ] optional chainingを追加
- [ ] 型ガードを実装
- [ ] デフォルト値を設定

### Phase 4: 型の不一致解消（50分）
- [ ] DocumentData型を統一
- [ ] NodeData型を統一
- [ ] TemplateRef型を統一
- [ ] その他の型不一致を解消

### Phase 5: 検証（10分）
- [ ] TypeScriptコンパイル
- [ ] ESLint実行
- [ ] エラー0件を確認

## 5. 影響範囲

### 変更するファイル
1. `frontend/src/components/editorv2/PetriNetEditorInner.tsx` - 型定義の修正

### 影響を受けるファイル
なし（内部実装の修正のみ）

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 型修正による動作変更 | 中 | 低 | 段階的に修正し、各Phaseでコンパイル確認 |
| 他コンポーネントへの影響 | 低 | 極低 | 内部実装のみの変更 |
| 修正漏れ | 低 | 中 | Phase 5で完全チェック |

## 7. テスト計画

### コンパイルチェック
```bash
cd frontend
npm run type-check
```

### Lintチェック
```bash
npm run lint src/components/editorv2/PetriNetEditorInner.tsx
```

### 目標
- TypeScriptエラー: 0件
- ESLintエラー: 0件

## 8. 承認記録

- **計画書提示日時**: 2026-01-30 13:10
- **承認待ち**

## 9. 主要な修正パターン

### パターン1: 関数パラメータの型付け
```typescript
// Before
const handleMethodChange = useCallback((newIndex) => {

// After
const handleMethodChange = useCallback((newIndex: number) => {
```

### パターン2: オブジェクトプロパティのundefined対策
```typescript
// Before
const placeId = ref.getAttribute('ref');

// After
const placeId = ref.getAttribute('ref') ?? undefined;
if (!placeId) return;
```

### パターン3: 型ガードの実装
```typescript
// Before
} catch (err) {
  console.error(err.message);

// After
} catch (err: unknown) {
  const error = err instanceof Error ? err : new Error(String(err));
  console.error(error.message);
```

### パターン4: 型アサーション
```typescript
// Before
const template = node.data.template;

// After
const template = node.data.template as TemplateRef | undefined;
if (!template) return;
```

## 10. 完了条件

- [ ] TypeScriptコンパイルエラー: 0件
- [ ] ESLint エラー: 0件
- [ ] すべてのany型が解消
- [ ] 実行時エラーなし
- [ ] コードレビュー完了

## 11. 備考

- 型エラーが156件と多いため、段階的に修正
- 各Phaseでコンパイル確認を実施
- 型定義の統一化が最優先事項