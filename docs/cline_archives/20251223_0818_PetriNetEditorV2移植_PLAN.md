# タスク計画書: PetriNetEditorV2移植

## メタデータ
- **作成日時**: 2025-12-23 08:18
- **タスクID**: PetriNetEditorV2移植
- **優先度**: 高
- **推定工数**: 8-12時間

## 1. タスク概要

reference配下の完成度の高いMAIML編集画面（PetriNetEditorV2）を、現在のプロジェクト（frontend/src/components/viewer/）に移植する。

## 2. 目的と期待される成果

### 目的
- 既存のPetriNetEditor.tsxを完全な機能を持つPetriNetEditorV2に置き換える
- 高度な編集機能（Undo/Redo、複数Method対応、Draft管理等）を提供する
- ユーザビリティの高いMAIML編集体験を実現する

### 期待される成果
- [x] PetriNetEditorV2の画面構成分析完了
- [ ] Material-UI → Ant Design v6 変換
- [ ] JSX → TypeScript 変換
- [ ] モックAPI実装
- [ ] 既存のPetriNetEditor.tsxとの統合
- [ ] 動作確認・テスト

## 3. 実装ステップ

### Phase 1: 準備・分析
- [x] reference配下のPetriNetEditorV2の構成分析
- [ ] 既存のfrontend/src/components/viewer/PetriNetEditor.tsxの確認
- [ ] 移植対象ファイルのリストアップ
- [ ] 依存関係の分析

### Phase 2: ユーティリティ・フック移植
- [ ] utils/converters/ の移植
  - [ ] reactFlowToMaiml.ts（React Flow → MaiML変換）
  - [ ] multiMethodConverter.ts（複数Method → MaiML変換）
- [ ] utils/documentParser.ts の移植
- [ ] hooks/ の移植
  - [ ] useHistory.ts（Undo/Redo）
  - [ ] useWorkflow.ts（ワークフロー追加）
  - [ ] useDraftManager.ts（Draft管理）

### Phase 3: サブコンポーネント移植
- [ ] EditorToolbar.tsx（Material-UI → Ant Design）
- [ ] PropertyPanel.tsx（Material-UI → Ant Design）
- [ ] MethodTabPanel.tsx（Material-UI → Ant Design）
- [ ] TemplateEditorDialog.tsx（Material-UI → Ant Design）
- [ ] DocumentEditDialog.tsx（Material-UI → Ant Design）
- [ ] SaveConfirmDialog.tsx（Material-UI → Ant Design）
- [ ] ValidationPanel.tsx（Material-UI → Ant Design）
- [ ] WorkflowSelectorDialog.tsx（Material-UI → Ant Design）
- [ ] DraftManager.tsx（Material-UI → Ant Design）

### Phase 4: メインコンポーネント移植
- [ ] PetriNetEditorInner.tsx の移植（約1800行）
  - [ ] JSX → TypeScript 変換
  - [ ] Material-UI → Ant Design 変換
  - [ ] State管理の実装
  - [ ] イベントハンドラーの実装

### Phase 5: モックAPI実装
- [ ] apiClient.ts にモックAPI追加
  - [ ] POST /api/worker/multiple-methods-structure-from-content
  - [ ] POST /api/worker/petri-net-structure-from-content
  - [ ] POST /api/s3/validate-maiml-content
  - [ ] POST /api/s3/maiml-auto-correct-realtime
  - [ ] POST /api/s3/save
  - [ ] GET /api/s3/files
  - [ ] GET /api/s3/file-content
  - [ ] POST /api/s3/maiml-drafts
  - [ ] GET /api/s3/maiml-drafts
- [ ] モックデータの作成（frontend/mock/data/）

### Phase 6: 統合・テスト
- [ ] 既存のPetriNetEditor.tsxとの統合
- [ ] 動作確認
  - [ ] ノード追加・編集・削除
  - [ ] エッジ接続・削除
  - [ ] Undo/Redo動作確認
  - [ ] 複数Method切り替え
  - [ ] 保存機能（ローカル）
  - [ ] Draft管理
- [ ] バグ修正

### Phase 7: 最適化・ドキュメント
- [ ] パフォーマンス最適化
- [ ] コードレビュー
- [ ] 使い方ドキュメント作成

## 4. 影響範囲

### 新規作成するファイル

#### hooks/
1. `frontend/src/hooks/useHistory.ts`
2. `frontend/src/hooks/useWorkflow.ts`
3. `frontend/src/hooks/useDraftManager.ts`

#### utils/
4. `frontend/src/utils/converters/reactFlowToMaiml.ts`
5. `frontend/src/utils/converters/multiMethodConverter.ts`
6. `frontend/src/utils/documentParser.ts`

#### components/viewer/PetriNetEditor/（新規ディレクトリ）
7. `frontend/src/components/viewer/PetriNetEditor/index.tsx`（エントリーポイント）
8. `frontend/src/components/viewer/PetriNetEditor/PetriNetEditorInner.tsx`
9. `frontend/src/components/viewer/PetriNetEditor/components/EditorToolbar.tsx`
10. `frontend/src/components/viewer/PetriNetEditor/components/PropertyPanel.tsx`
11. `frontend/src/components/viewer/PetriNetEditor/components/MethodTabPanel.tsx`
12. `frontend/src/components/viewer/PetriNetEditor/components/TemplateEditorDialog.tsx`
13. `frontend/src/components/viewer/PetriNetEditor/components/DocumentEditDialog.tsx`
14. `frontend/src/components/viewer/PetriNetEditor/components/SaveConfirmDialog.tsx`
15. `frontend/src/components/viewer/PetriNetEditor/components/ValidationPanel.tsx`
16. `frontend/src/components/viewer/PetriNetEditor/components/WorkflowSelectorDialog.tsx`
17. `frontend/src/components/viewer/PetriNetEditor/components/DraftManager.tsx`

#### nodes/（カスタムノード - 既存のPetriNetViewerノードを再利用可能か検討）
18. `frontend/src/components/viewer/PetriNetEditor/nodes/EditablePlaceNode.tsx`（必要に応じて）
19. `frontend/src/components/viewer/PetriNetEditor/nodes/EditableTransitionNode.tsx`（必要に応じて）

#### モックデータ
20. `frontend/mock/data/petri-net-structure.json`
21. `frontend/mock/data/maiml-validation-result.json`
22. `frontend/mock/data/maiml-drafts.json`

### 変更するファイル
1. `frontend/src/utils/apiClient.ts` - モックAPI追加
2. `frontend/src/components/viewer/PetriNetEditor.tsx` - 既存ファイルをバックアップして新版に置き換え

### 削除するファイル
なし（既存のPetriNetEditor.tsxはバックアップとして残す）

### 影響を受ける機能
- 実験管理者メニュー: MAIML編集画面
- ViewRendererでのPetriNetEditor呼び出し

## 5. 技術的詳細

### 使用する技術・ライブラリ
- React Flow 11.11.4: ペトリネット描画
- Ant Design v6: UIコンポーネント（Material-UIから変換）
- TypeScript: 型安全性確保
- ReactFlow Provider: React Flow状態管理

### Material-UI → Ant Design 変換マッピング

| Material-UI | Ant Design v6 |
|-------------|---------------|
| Box | div + style |
| Button | Button |
| IconButton | Button (shape="circle", type="text") |
| Tooltip | Tooltip |
| Dialog | Modal |
| TextField | Input |
| Switch | Switch |
| Divider | Divider |
| CircularProgress | Spin |
| Alert | Alert |
| Typography | Typography.Text / Typography.Title |

### アーキテクチャ上の考慮事項
- React Flowの既存実装を活用（PetriNetViewerと共通）
- 既存のノードコンポーネント（MaterialTemplateNode等）を再利用
- カスタムフックで機能を分離（useHistory, useWorkflow, useDraftManager）
- モックAPIは既存のapiClient.tsパターンに従う

### セキュリティ考慮事項
- [x] モックデータに機密情報を含めない
- [x] XSS対策（Ant Design標準機能）
- [x] ファイル保存時の検証（バリデーション機能）

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| Material-UI → Ant Design変換の互換性問題 | 中 | 中 | 段階的に移植し、都度動作確認 |
| 約1800行のメインコンポーネント移植の複雑さ | 高 | 高 | Phase分割、サブコンポーネントから先に移植 |
| React Flowバージョン差異 | 中 | 低 | 既存のPetriNetViewerと同じバージョン使用 |
| モックAPI実装漏れ | 中 | 中 | API一覧を作成し、チェックリストで管理 |
| 既存機能との統合時のバグ | 高 | 中 | 段階的テスト、既存PetriNetEditor.tsxをバックアップ |

## 7. テスト計画

### ユニットテスト
- [ ] useHistory フックのテスト
- [ ] useWorkflow フックのテスト
- [ ] documentParser ユーティリティのテスト
- [ ] reactFlowToMaiml 変換関数のテスト

### 統合テスト
- [ ] ノード追加・編集・削除のフロー
- [ ] エッジ接続・削除のフロー
- [ ] Undo/Redo動作
- [ ] 複数Method切り替え
- [ ] 保存処理（モック）

### 手動テスト
- [ ] UI/UX確認（Ant Design変換後）
- [ ] キーボードショートカット動作確認
- [ ] レスポンシブ対応確認
- [ ] エラーハンドリング確認

## 8. ロールバック計画

問題が発生した場合:
1. 既存のPetriNetEditor.tsxをバックアップから復元
2. 新規作成したファイルを削除
3. apiClient.tsの変更を元に戻す

バックアップファイル名: `PetriNetEditor.tsx.backup_20251223`

## 9. 関連ドキュメント

- [reference配下のMAIML編集画面構成分析](./20251223_0814_reference_PetriNetEditorV2_画面構成分析.md)
- [フロントエンド規約](.clinerules/frontend.md)
- [UIポリシー](.clinerules/ui_policy.md)

## 10. 承認記録

- **計画書提示日時**: 2025-12-23 08:18
- **承認日時**: （承認待ち）
- **承認者コメント**: 

## 11. 実施記録

### 実施日時
開始: （作業開始時に記入）
完了: （作業完了時に記入）

### 計画からの変更点
（実施中に発生した計画からの変更や追加作業）

### 発生した問題と解決方法
（実施中に発生した問題とその解決方法）

### 最終的な成果物
- [ ] PetriNetEditorV2完全移植
- [ ] モックAPI実装
- [ ] 動作確認完了

## 12. 振り返り

### うまくいった点
（成功要因）

### 改善が必要な点
（今後の改善点）

### 学んだこと
（このタスクから得られた知見）
