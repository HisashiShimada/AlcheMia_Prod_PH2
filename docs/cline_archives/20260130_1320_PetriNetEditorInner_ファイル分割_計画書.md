# タスク計画書: PetriNetEditorInner.tsx ファイル分割

## メタデータ
- **作成日時**: 2026-01-30 13:20
- **タスクID**: PetriNetEditorInner_ファイル分割
- **優先度**: 高
- **推定工数**: 8時間

## 1. タスク概要

`frontend/src/components/editorv2/PetriNetEditorInner.tsx` は約2000行を超える巨大なファイルとなっており、以下の問題が発生しています：

- コンテキストサイズの肥大化
- コード修正時のエラー発生頻度の増加
- 可読性・保守性の低下
- 再利用性の欠如

このファイルを機能別に複数のファイルに分割し、保守性・可読性・再利用性を向上させます。

## 2. 目的と期待される成果

### 目的
- ファイルサイズを各500行以内に抑える
- 関心の分離を実現する
- コード修正時のエラーを減少させる
- コンテキストサイズを削減する

### 期待される成果
- [x] メインファイルが800行以内に収まる
- [x] カスタムフックが独立したファイルになる
- [x] 型定義が独立したファイルになる
- [x] ハンドラー関数が論理的にグループ化される
- [x] 各ファイルが単一責任原則に従う

## 3. 実装ステップ

### Phase 1: 現状分析と設計
- [x] ファイルの依存関係を分析
- [x] 分割可能な部品を特定
- [x] 分割戦略を策定
- [x] ディレクトリ構造を設計

### Phase 2: 型定義の分離
- [ ] `types/editorTypes.ts` を作成
  - NodeData型
  - DocumentData型
  - Method型
  - ClipboardData型
  - EdgeData型
  - その他の型定義
- [ ] 既存のimportから型定義をマージ

### Phase 3: カスタムフックの分離
- [ ] `hooks/useEditorState.ts` を作成
  - nodes, edges, selectedNode, selectedEdge等の状態管理
- [ ] `hooks/useEditorActions.ts` を作成
  - ノード追加、削除、更新等のアクション
- [ ] `hooks/useClipboard.ts` を作成
  - コピー、ペースト機能
- [ ] `hooks/useKeyboard.ts` を作成
  - キーボードショートカット処理
- [ ] `hooks/useValidation.ts` を作成
  - バリデーション関連の状態とロジック
- [ ] `hooks/useMethodManager.ts` を作成
  - 複数method管理

### Phase 4: ハンドラー関数の分離
- [ ] `handlers/nodeHandlers.ts` を作成
  - handleNodeClick
  - handleNodesDelete
  - handleAddNode
  - handleUpdateNodeProperty
  - handleUpdateNodeId
  - handleDeleteNode
- [ ] `handlers/edgeHandlers.ts` を作成
  - handleEdgeClick
  - handleEdgesDelete
  - handleConnect
  - handleUpdateEdgeProperty
  - handleDeleteEdge
- [ ] `handlers/templateHandlers.ts` を作成
  - handleOpenTemplateEditor
  - handleSaveTemplate
  - handleTemplateSelect
  - handleTemplateAdd
  - handleTemplateDelete
- [ ] `handlers/dialogHandlers.ts` を作成
  - handleOpenSaveConfirmDialog
  - handleOpenValidationPanel
  - handleOpenDocumentEditor
  - handleOpenDraftManager
- [ ] `handlers/clipboardHandlers.ts` を作成
  - handleCopy
  - handlePaste

### Phase 5: ユーティリティ関数の分離
- [ ] `utils/editorUtils.ts` を作成
  - convertNestedPropertiesToArray
  - extractAffectedElements
  - その他のヘルパー関数

### Phase 6: データローディングロジックの分離
- [ ] `loaders/maimlLoader.ts` を作成
  - MaiMLデータ読み込みロジック
  - ペトリネット構造変換
  - バリデーション自動実行

### Phase 7: UIコンポーネントの分離（オプション）
- [ ] `components/ReactFlowCanvas.tsx` を作成
  - React Flowキャンバス部分
- [ ] `components/ErrorBanner.tsx` を作成
  - エラー警告バナー
- [ ] `components/LoadingView.tsx` を作成
  - ローディング表示

### Phase 8: メインファイルのリファクタリング
- [ ] 分離したモジュールをimport
- [ ] PetriNetEditorContentをシンプル化
- [ ] PetriNetEditorInnerUIをシンプル化
- [ ] 不要なコードを削除

### Phase 9: テストと検証
- [ ] 各分割ファイルの動作確認
- [ ] 既存機能の動作確認
- [ ] TypeScriptエラーの解消
- [ ] バンドルサイズの確認

### Phase 10: ドキュメント更新
- [ ] README更新
- [ ] コメント追加
- [ ] 完了報告書作成

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/components/editorv2/PetriNetEditorInner.tsx` - メインファイル（大幅リファクタ）

### 新規作成するファイル
2. `frontend/src/components/editorv2/types/editorTypes.ts` - 型定義
3. `frontend/src/components/editorv2/hooks/useEditorState.ts` - 状態管理フック
4. `frontend/src/components/editorv2/hooks/useEditorActions.ts` - アクションフック
5. `frontend/src/components/editorv2/hooks/useClipboard.ts` - クリップボードフック
6. `frontend/src/components/editorv2/hooks/useKeyboard.ts` - キーボードフック
7. `frontend/src/components/editorv2/hooks/useValidation.ts` - バリデーションフック
8. `frontend/src/components/editorv2/hooks/useMethodManager.ts` - Method管理フック
9. `frontend/src/components/editorv2/handlers/nodeHandlers.ts` - ノードハンドラー
10. `frontend/src/components/editorv2/handlers/edgeHandlers.ts` - エッジハンドラー
11. `frontend/src/components/editorv2/handlers/templateHandlers.ts` - テンプレートハンドラー
12. `frontend/src/components/editorv2/handlers/dialogHandlers.ts` - ダイアログハンドラー
13. `frontend/src/components/editorv2/handlers/clipboardHandlers.ts` - クリップボードハンドラー
14. `frontend/src/components/editorv2/utils/editorUtils.ts` - ユーティリティ
15. `frontend/src/components/editorv2/loaders/maimlLoader.ts` - データローダー

### 影響を受ける機能
- すべてのエディター機能（影響範囲は大きいが、インターフェースは維持）

## 5. 技術的詳細

### ディレクトリ構造
```
frontend/src/components/editorv2/
├── PetriNetEditorInner.tsx          # メインファイル（800行以内）
├── types/
│   └── editorTypes.ts               # 型定義
├── hooks/
│   ├── useEditorState.ts            # 状態管理
│   ├── useEditorActions.ts          # アクション
│   ├── useClipboard.ts              # クリップボード
│   ├── useKeyboard.ts               # キーボード
│   ├── useValidation.ts             # バリデーション
│   └── useMethodManager.ts          # Method管理
├── handlers/
│   ├── nodeHandlers.ts              # ノードハンドラー
│   ├── edgeHandlers.ts              # エッジハンドラー
│   ├── templateHandlers.ts          # テンプレートハンドラー
│   ├── dialogHandlers.ts            # ダイアログハンドラー
│   └── clipboardHandlers.ts         # クリップボードハンドラー
├── utils/
│   └── editorUtils.ts               # ユーティリティ
└── loaders/
    └── maimlLoader.ts               # データローダー
```

### 分割の原則

#### 1. 単一責任の原則
- 各ファイルは1つの責任のみを持つ
- 関連する機能をグループ化

#### 2. 依存関係の最小化
- 循環依存を避ける
- 明確な依存方向を維持

#### 3. 再利用性の向上
- 汎用的な関数は独立させる
- コンポーネント固有のロジックは分離

#### 4. テスタビリティの向上
- 純粋関数を推奨
- 副作用を明確に分離

### 命名規則

#### カスタムフック
- `use` プレフィックス必須
- 機能を明確に表す名前
- 例: `useEditorState`, `useClipboard`

#### ハンドラー関数
- `handle` プレフィックス
- イベント駆動の命名
- 例: `handleNodeClick`, `handleSaveTemplate`

#### 型定義
- PascalCase
- 意味のある名前
- 例: `NodeData`, `EditorState`

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 循環依存の発生 | 高 | 中 | 依存関係を明確に設計、事前に依存グラフを作成 |
| 型エラーの増加 | 中 | 高 | 段階的に分割、各ステップで型チェック |
| 既存機能の破壊 | 高 | 中 | 各Phase完了後に動作確認、段階的なcommit |
| パフォーマンスの劣化 | 低 | 低 | 不要な再レンダリングを防ぐ、useMemo/useCallbackの適切な使用 |
| 過度な分割 | 中 | 中 | 各ファイルを300-500行に保つ、論理的なまとまりを維持 |

## 7. テスト計画

### 単体テスト（推奨）
- [ ] カスタムフックのテスト
- [ ] ハンドラー関数のテスト
- [ ] ユーティリティ関数のテスト

### 統合テスト
- [ ] ノード追加・削除機能
- [ ] エッジ接続機能
- [ ] テンプレート編集機能
- [ ] 保存機能
- [ ] バリデーション機能
- [ ] Undo/Redo機能
- [ ] コピー&ペースト機能

### 手動テスト
- [ ] 全機能の動作確認
- [ ] エラーハンドリングの確認
- [ ] パフォーマンスの確認

## 8. ロールバック計画

### バックアップ
- Git commitを細かく行う
- 各Phase完了時にタグを付ける

### ロールバック手順
1. 問題のあるPhaseを特定
2. 該当するcommitに戻す
3. 問題を修正
4. 再度実装

## 9. 関連ドキュメント

- [PetriNetEditorInner 現状分析](../docs/20260130_1320_PetriNetEditorInner_現状分析.md)（作成予定）
- [コーディング規約](../.clinerules/development/config.md)
- [フロントエンド規約](../.clinerules/development/frontend.md)

## 10. 承認記録

- **計画書提示日時**: 2026-01-30 13:20
- **承認日時**: （承認時に記入）
- **承認者コメント**: （ユーザーからのフィードバック）

## 11. 実施記録

### 実施日時
開始: （作業開始時に記入）
完了: （作業完了時に記入）

### 計画からの変更点
（実施中に発生した計画からの変更や追加作業）

### 発生した問題と解決方法
（実施中に発生した問題とその解決方法）

### 最終的な成果物
- [ ] 型定義ファイル作成
- [ ] カスタムフック作成（6ファイル）
- [ ] ハンドラーファイル作成（5ファイル）
- [ ] ユーティリティファイル作成
- [ ] ローダーファイル作成
- [ ] メインファイルのリファクタリング完了
- [ ] 全機能の動作確認完了
- [ ] ドキュメント更新完了

## 12. 振り返り

### うまくいった点
（タスク完了後に記入）

### 改善が必要な点
（タスク完了後に記入）

### 学んだこと
（タスク完了後に記入）

## 13. 実装優先順位

### 最優先（Phase 2-4）
1. **型定義の分離** - 他の分離作業の基礎となる
2. **カスタムフックの分離** - 状態管理とロジックを整理
3. **ハンドラー関数の分離** - イベント処理を整理

### 次点（Phase 5-6）
4. **ユーティリティ関数の分離** - ヘルパー関数を再利用可能に
5. **データローディングロジックの分離** - 初期化処理を整理

### オプション（Phase 7）
6. **UIコンポーネントの分離** - 必要に応じて実施

## 14. 成功基準

### 必須条件
- ✅ メインファイルが800行以内
- ✅ TypeScriptエラーがゼロ
- ✅ 既存機能がすべて動作
- ✅ コンテキストサイズが50%削減

### 望ましい条件
- ✅ 各分割ファイルが500行以内
- ✅ テストカバレッジ50%以上
- ✅ ビルド時間が増加していない
- ✅ コードレビューでの承認

## 15. 注意事項

### 重要なポイント
- **段階的な実装**: 一度にすべてを変更せず、Phase単位で確認
- **動作確認**: 各Phase完了後に必ず動作確認
- **型安全性**: TypeScriptの型チェックを活用
- **後方互換性**: 既存のインターフェースを維持

### 避けるべきこと
- ❌ 過度な分割（1ファイル50行未満）
- ❌ 循環依存の作成
- ❌ グローバル変数の使用
- ❌ 型定義の不足

---

**次のアクション**: ユーザーの承認を待ち、Phase 2から実装を開始します。