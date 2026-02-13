# タスク計画書: PetriNetEditorInner型エラー完全解消

## メタデータ
- **作成日時**: 2026-01-30 11:45
- **タスクID**: PetriNetEditorInner_型エラー完全解消
- **優先度**: 高
- **推定工数**: 2時間

## 1. タスク概要

`frontend/src/components/editorv2/PetriNetEditorInner.tsx`で検出された200+件のTypeScript/ESLintエラーを系統的に解消し、型安全性を確保します。

## 2. 目的と期待される成果

### 目的
- TypeScriptの型安全性を完全に確保
- ESLintルール違反を解消
- 暗黙的な`any`型を排除

### 期待される成果
- [ ] TypeScriptエラー0件
- [ ] ESLintエラー0件
- [ ] 全ての変数・パラメータに明示的な型定義
- [ ] 型定義の整合性確保

## 3. 実装ステップ

### Phase 1: 型定義の追加・整理（20%）
- [ ] Props型定義の完全化
- [ ] State型定義の追加（DocumentData, Method, ValidationResult等）
- [ ] イベントハンドラの型定義
- [ ] ユーティリティ関数の型定義

### Phase 2: State変数の型修正（30%）
- [ ] `documentData`をnullable型に修正
- [ ] `validationResult`をnullable型に修正
- [ ] `selectedNode`/`selectedEdge`をnullable型に修正
- [ ] `methods`配列の型定義
- [ ] `clipboard`の型定義
- [ ] その他State変数の型修正

### Phase 3: イベントハンドラの型修正（25%）
- [ ] キーボードイベントの型定義
- [ ] マウスイベントの型定義
- [ ] React Flow イベントの型定義
- [ ] カスタムハンドラの型定義

### Phase 4: エラーハンドリングの型修正（15%）
- [ ] try-catchのエラー型定義
- [ ] API レスポンスの型定義
- [ ] バリデーション結果の型定義

### Phase 5: その他の型エラー修正（10%）
- [ ] `any`型の排除
- [ ] 型アサーションの追加
- [ ] ジェネリクスの使用
- [ ] Union型の活用

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/components/editorv2/PetriNetEditorInner.tsx` - 型定義の完全修正

### 影響を受けるコンポーネント
- なし（内部実装の型修正のみ）

## 5. 技術的詳細

### 主要な型定義

```typescript
// DocumentData型（nullable対応）
interface DocumentData {
  id?: string;
  protocolId?: string;
  methodId?: string;
  pnmlId?: string;
  programId?: string;
  name: string;
  description?: string;
  date?: string;
  uuid?: string;
  creator?: { id: string; name: string };
  vendor?: { id: string; name: string };
  owner?: { id: string; name: string };
  instrument?: { id: string; name: string };
}

// ValidationResult型
interface ValidationResult {
  success: boolean;
  errors?: ValidationError[];
  warnings?: ValidationError[];
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

### イベントハンドラの型

```typescript
// キーボードイベント
const handleKeyDown = (event: KeyboardEvent) => { ... }

// マウスイベント
const handlePaneClick = (event: React.MouseEvent) => { ... }

// React Flow イベント
const handleNodeClick = (event: React.MouseEvent, node: Node) => { ... }
```

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 型定義の不整合 | 中 | 中 | 段階的に修正し、各Phase後にビルド確認 |
| 実行時エラー | 高 | 低 | 型ガードとnullチェックを適切に配置 |
| パフォーマンス低下 | 低 | 低 | 型定義はコンパイル時のみ影響 |

## 7. テスト計画

### ビルド確認
- [ ] TypeScriptコンパイルエラー0件
- [ ] ESLint実行エラー0件

### 動作確認
- [ ] ファイル読み込み
- [ ] ノード追加・編集
- [ ] 保存機能
- [ ] バリデーション機能

## 8. ロールバック計画

- Git commitごとにPhaseを分割
- 問題発生時は該当Phaseを`git revert`

## 9. 関連ドキュメント

- [TypeScript公式ドキュメント](https://www.typescriptlang.org/docs/)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)

## 10. 承認記録

- **計画書提示日時**: 2026-01-30 11:45
- **承認待ち**

## 11. 実施記録

（実施後に記入）