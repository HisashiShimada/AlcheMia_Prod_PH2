# PetriNetEditor Reference版との詳細比較分析

## メタデータ
- **作成日時**: 2025-12-23 13:00
- **タスクID**: PetriNetEditor_Reference比較
- **優先度**: 高
- **推定工数**: 1時間

## 1. タスク概要

reference版（React + Material-UI）と現行版（Next.js + Ant Design）のPetriNetEditorを詳細に比較し、カクつきの原因がNext.js移植によるものかを特定する。

## 2. 目的と期待される成果

### 目的
- reference版と現行版の差異を完全に把握
- Next.js移植による影響を特定
- カクつきの根本原因を発見

### 期待される成果
- [ ] reference版と現行版の詳細な差分リスト
- [ ] Next.js移植による影響の分析
- [ ] カクつき原因の特定
- [ ] 具体的な解決策の提示

## 3. 比較項目

### Phase 1: アーキテクチャ比較
- [ ] フレームワーク（React vs Next.js）
- [ ] UIライブラリ（Material-UI vs Ant Design）
- [ ] ビルドツール（Webpack vs Next.js）
- [ ] ReactFlowバージョン

### Phase 2: コンポーネント構造比較
- [ ] PetriNetEditorInner.jsx vs PetriNetEditor.tsx
- [ ] useHistory hooks
- [ ] useWorkflow hooks
- [ ] useDraftManager hooks

### Phase 3: イベントハンドラ比較
- [ ] handleNodeDragStop
- [ ] handleNodeClick
- [ ] handleConnect
- [ ] handleNodesDelete
- [ ] useEffect依存配列

### Phase 4: React Flow設定比較
- [ ] nodesDraggable
- [ ] selectionOnDrag
- [ ] panOnDrag
- [ ] その他の設定項目

### Phase 5: パフォーマンス関連比較
- [ ] useCallback依存配列
- [ ] useMemo使用箇所
- [ ] Re-render頻度
- [ ] console.log出力量

### Phase 6: 環境設定比較
- [ ] package.jsonの依存関係
- [ ] next.config.js設定
- [ ] TypeScript設定
- [ ] ビルド最適化設定

## 4. 影響範囲

### 変更が必要なファイル（予想）
1. `frontend/src/components/viewer/PetriNetEditor/PetriNetEditor.tsx`
2. `frontend/src/hooks/useHistory.ts`
3. `frontend/next.config.ts`
4. `frontend/package.json`

### 影響を受ける機能
- ノードドラッグ操作
- Undo/Redo機能
- 全体的なレスポンス性能

## 5. 比較結果記録フォーマット

### 差分項目テンプレート
```markdown
## [カテゴリ]: [項目名]

### Reference版
```jsx/js
// コード
```

### 現行版（Next.js）
```tsx/ts
// コード
```

### 差異
- 差異1の説明
- 差異2の説明

### 影響
- パフォーマンスへの影響
- 機能への影響

### 推奨対応
- 対応方針
```

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| Next.js特有の問題 | 高 | 中 | Next.js公式ドキュメント参照 |
| ReactFlowバージョン差異 | 高 | 低 | バージョン統一を検討 |
| TypeScript型定義の問題 | 中 | 低 | 適切な型定義を追加 |

## 7. テスト計画

### 確認項目
- [ ] ノードドラッグのスムーズさ
- [ ] 連続ドラッグ時の挙動
- [ ] Undo/Redoの速度
- [ ] 初期表示速度
- [ ] メモリ使用量

### テスト環境
- ブラウザ: Chrome最新版
- OS: Linux
- ノード数: 10〜20個程度

## 8. 承認記録

- **計画書提示日時**: 2025-12-23 13:00
- **承認日時**: （承認待ち）
- **承認者コメント**: （未記入）

## 9. 実施記録

### 実施日時
開始: 2025-12-23 13:00
完了: （作業中）

### 発見事項
（随時更新）

### 最終的な結論
（作業完了後に記入）
