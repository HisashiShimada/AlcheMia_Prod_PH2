# タスク計画書: PetriNetEditorInner.tsx 型定義明確化・TSエラー解消

## メタデータ
- **作成日時**: 2026-01-30 13:07
- **タスクID**: PetriNetEditorInner_型定義明確化
- **優先度**: 高
- **推定工数**: 2時間

## 1. タスク概要

`frontend/src/components/editorv2/PetriNetEditorInner.tsx`の型定義を明確化し、TypeScriptエラーを完全に解消します。

## 2. 目的と期待される成果

### 目的
- TypeScript型チェックを通過させる
- 型安全性を向上させる
- IDEの型推論を正常に動作させる

### 期待される成果
- [ ] 全てのTSエラーが解消される
- [ ] 型定義が明確化される
- [ ] 型推論が正しく機能する

## 3. 実装ステップ

### Phase 1: 型エラーの特定
- [ ] TypeScript型チェックを実行
- [ ] エラー箇所を特定
- [ ] エラー原因を分析

### Phase 2: 基本型定義の修正
- [ ] `NodeData` 型を明確化
- [ ] `EdgeData` 型を明確化
- [ ] `ValidationResult` 型を明確化
- [ ] `DocumentData` 型を明確化

### Phase 3: Props型の修正
- [ ] `PetriNetEditorInnerProps` を明確化
- [ ] `PetriNetEditorInnerUIProps` を明確化
- [ ] オプショナルプロパティを適切に設定

### Phase 4: Hooks型引数の修正
- [ ] `useNodesState<NodeData>` の型引数を修正
- [ ] `useEdgesState<EdgeData>` の型引数を修正
- [ ] その他のHooksの型を修正

### Phase 5: イベントハンドラー型の修正
- [ ] React.MouseEventの型を正確に指定
- [ ] コールバック関数の引数型を明確化
- [ ] 戻り値の型を明確化

### Phase 6: 型検証
- [ ] TypeScript型チェックを再実行
- [ ] 全エラーが解消されたことを確認
- [ ] 型推論が正常に動作することを確認

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/components/editorv2/PetriNetEditorInner.tsx` - 型定義の明確化

### 影響を受ける機能
- PetriNetエディタ全体の型安全性

## 5. 技術的詳細

### 修正予定の型定義箇所

#### 1. NodeData型の拡張
```typescript
type NodeData = ImportedNodeData & {
  isNewTemplate?: boolean;
  templateCategory?: string;
  methodId?: string | null;
  // 不足しているプロパティを追加
};
```

#### 2. EdgeData型の定義
```typescript
interface EdgeData {
  id?: string;
  hasError?: boolean;
  errors?: ValidationError[];
}
```

#### 3. PetriNetEditorInnerProps型
```typescript
interface PetriNetEditorInnerProps {
  maimlData: string | null;
  onError?: (error: Error) => void;
  editingFileName?: string;
  editMode?: string;
  originalFileName?: string;
  sourceS3Key?: string;
  [key: string]: unknown; // その他の追加props
}
```

#### 4. React Flow Hooks型引数
```typescript
const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>([]);
const [edges, setEdges, onEdgesChange] = useEdgesState<EdgeData>([]);
```

### セキュリティ考慮事項
- [ ] 型定義による実行時エラーの防止
- [ ] 型安全性による脆弱性の低減

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 型定義変更による実行時エラー | 中 | 低 | 段階的に修正し、各段階で動作確認 |
| React Flow型の不一致 | 低 | 低 | 公式ドキュメントを参照 |
| 既存コードとの互換性 | 低 | 低 | 既存の動作を維持する型定義 |

## 7. テスト計画

### 型チェック
- [ ] `npm run type-check` または `tsc --noEmit` を実行
- [ ] エラーが0件になることを確認

### 動作確認
- [ ] コンポーネントが正常にレンダリングされる
- [ ] イベントハンドラーが正常に動作する
- [ ] 型推論が正しく機能する

## 8. ロールバック計画

問題が発生した場合：
1. Git履歴から元の状態に戻す
2. 型定義を段階的に適用し直す

## 9. 関連ドキュメント

- [TypeScript公式ドキュメント](https://www.typescriptlang.org/docs/)
- [React Flow型定義](https://reactflow.dev/learn/advanced-use/typescript)
- [frontend.md](../../.clinerules/development/frontend.md)

## 10. 承認記録

- **計画書提示日時**: 2026-01-30 13:07
- **承認日時**: (承認待ち)
- **承認者コメント**: (承認待ち)

## 11. 実施記録

### 実施日時
開始: (承認後)
完了: (作業完了後)

### 計画からの変更点
(実施中に記録)

### 発生した問題と解決方法
(実施中に記録)

### 最終的な成果物
(作業完了後に記録)

## 12. 振り返り

### うまくいった点
(作業完了後に記録)

### 改善が必要な点
(作業完了後に記録)

### 学んだこと
(作業完了後に記録)