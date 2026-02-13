# タスク計画書: PetriNetEditor TemplateViewer統合

## メタデータ
- **作成日時**: 2026-01-27 17:00
- **タスクID**: PetriNetEditor_TemplateViewer統合
- **優先度**: 高
- **推定工数**: 4時間

## 1. タスク概要

reference側の高機能なTemplateViewer（TemplateList.jsx）を現行のPetriNetEditor.tsxに統合し、ペトリネット編集とテンプレート編集の切り替え機能を改善します。

## 2. 目的と期待される成果

### 目的
- reference側の高機能なTemplateViewerを現行に統合
- ペトリネット編集モードとテンプレート編集モードの統一的な切り替え
- 共通テンプレート管理機能の追加
- TemplateProviderによる状態管理の改善

### 期待される成果
- [x] reference側のTemplateViewer機能が現行で使用可能
- [x] viewMode管理の統一
- [x] 共通テンプレート管理機能の実装
- [x] TemplateProviderの導入
- [x] テンプレートCRUD操作の実装

## 3. 実装ステップ

### Phase 1: 差異分析とファイル構成確認
- [x] reference側と現行側のPetriNetEditorを比較
- [x] TemplateListItem.jsxとTemplateListView.tsxの差異を確認
- [x] TemplateViewer/TemplateList.jsxの機能を確認
- [x] 必要なファイル移植の特定

### Phase 2: TemplateViewerコンポーネントの移植
- [ ] `reference/TemplateViewer/TemplateList.jsx`を`frontend/src/components/editor/TemplateList.tsx`に移植
- [ ] `reference/TemplateViewer/TemplateItem.jsx`を`frontend/src/components/editor/TemplateItem.tsx`に移植
- [ ] TypeScript化とAnt Design v6対応
- [ ] 削除機能とエラー表示強調機能の統合

### Phase 3: TemplateProviderの実装
- [ ] `frontend/src/contexts/TemplateContext.tsx`を作成
- [ ] テンプレート状態管理（material, condition, result）
- [ ] テンプレートエラー管理
- [ ] CRUD操作（add, update, delete）の実装
- [ ] バリデーション結果との連携

### Phase 4: PetriNetEditor.tsxの修正
- [ ] viewMode管理の追加（'petriNet' | 'templates'）
- [ ] editorModeの削除（重複を避ける）
- [ ] TemplateProviderでラップ
- [ ] TemplateListの統合
- [ ] 共通テンプレート表示切替の実装

### Phase 5: EditorToolbarの修正
- [ ] ビューモード切替ボタンの追加
- [ ] 共通テンプレート切替ボタンの追加
- [ ] アイコンとツールチップの改善

### Phase 6: テンプレート操作機能の統合
- [ ] テンプレート選択ハンドラーの実装
- [ ] テンプレート追加ハンドラーの実装
- [ ] テンプレート削除ハンドラーの実装
- [ ] TemplateEditorDialogとの連携

### Phase 7: テスト・検証
- [ ] ペトリネットモードとテンプレートモードの切り替え
- [ ] テンプレート一覧表示
- [ ] テンプレートCRUD操作
- [ ] 共通テンプレート表示切替
- [ ] エラー表示

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/components/editor/PetriNetEditor.tsx` - viewMode管理追加
2. `frontend/src/components/editor/EditorToolbar.tsx` - ビューモード切替ボタン追加
3. `frontend/src/components/editor/TemplateListView.tsx` - 削除（TemplateListに置き換え）
4. `frontend/src/components/editor/TemplateListItem.tsx` - 削除（TemplateItemに置き換え）

### 新規作成するファイル
1. `frontend/src/components/editor/TemplateList.tsx` - reference版を移植
2. `frontend/src/components/editor/TemplateItem.tsx` - reference版を移植
3. `frontend/src/contexts/TemplateContext.tsx` - 新規作成

### 削除するファイル
1. `frontend/src/components/editor/TemplateListView.tsx` - TemplateListに置き換え
2. `frontend/src/components/editor/TemplateListItem.tsx` - TemplateItemに置き換え

### 影響を受ける機能
- ペトリネット編集モード
- テンプレート一覧表示
- テンプレート編集
- 共通テンプレート管理

## 5. 技術的詳細

### reference側の主要機能

#### TemplateList.jsx
- **3カラムGridレイアウト**: material, condition, result
- **TemplateContext統合**: useTemplates()フック使用
- **共通テンプレート切替**: チェックボックス
- **テンプレート追加**: AddIconボタン
- **テンプレート削除**: onTemplateDeleteコールバック
- **スクロール制御**: カラムごとに独立スクロール
- **ローディング表示**: CircularProgress

#### TemplateItem.jsx
- **削除機能**: DeleteIconボタン、onDelete、showDeleteプロパティ
- **エラー警告バッジ**: 左上に絶対位置で赤い警告バッジ
- **エラー時の背景色**: hasErrors時に`#fff3e0`（オレンジ系）
- **エラー時のボーダー**: hasErrors時に左ボーダーが`4px solid #f44336`（赤）

#### TemplateProvider
- **状態管理**: material, condition, resultテンプレート
- **エラー管理**: templateErrors
- **CRUD操作**: addTemplate, updateTemplate, deleteTemplate
- **バリデーション連携**: validationResultからエラーマッピング

### 現行側の主要機能

#### PetriNetEditor.tsx
- **editorMode**: 'petri-net' | 'template'（削除予定）
- **showTemplateList**: テンプレート一覧表示フラグ
- **categorizedTemplates**: ノードから抽出したテンプレート
- **convertNodeToTemplateData**: ノード→テンプレート変換

#### EditorToolbar.tsx
- **ビューモード切替**: editMode, onEditModeChange
- **テンプレート一覧切替**: showTemplateList, onToggleTemplateList

### 統合方針

1. **viewMode管理**: reference側のviewMode（'petriNet' | 'templates'）を採用
2. **TemplateProvider**: reference側のTemplateProviderを移植
3. **TemplateList**: reference側のTemplateListを移植（TypeScript化）
4. **EditorToolbar**: ビューモード切替ボタンを統合

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| reference版とAnt Design v6の互換性 | 高 | 中 | MUIコンポーネントをAnt Design v6に置き換え |
| TemplateProviderの状態管理が複雑 | 中 | 中 | 段階的に実装、各機能を個別にテスト |
| 既存のeditorModeとviewModeの衝突 | 中 | 低 | editorModeを削除、viewModeに統一 |
| テンプレートCRUD操作のバグ | 高 | 中 | ユニットテストを追加、操作ログを詳細化 |

## 7. テスト計画

### ユニットテスト
- [ ] TemplateProvider: addTemplate
- [ ] TemplateProvider: updateTemplate
- [ ] TemplateProvider: deleteTemplate
- [ ] TemplateList: テンプレート一覧表示
- [ ] TemplateItem: 削除機能

### 統合テスト
- [ ] ペトリネットモード→テンプレートモード切替
- [ ] テンプレートモード→ペトリネットモード切替
- [ ] テンプレート追加→一覧反映
- [ ] テンプレート削除→一覧反映
- [ ] エラー表示（バリデーション結果連携）

### 手動テスト
- [ ] ペトリネット編集中にテンプレートモード切替
- [ ] テンプレート編集中にペトリネットモード切替
- [ ] 共通テンプレート切替
- [ ] テンプレートCRUD操作
- [ ] エラー表示の確認

## 8. ロールバック計画

問題が発生した場合:
1. TemplateProviderの導入を一時的に無効化
2. 現行のTemplateListViewに戻す
3. editorModeを残す
4. コミットを戻す

## 9. 関連ドキュメント

- [reference/frontend/src/components/PetriNetEditorV2/PetriNetEditorInner.jsx](../../reference/frontend/src/components/PetriNetEditorV2/PetriNetEditorInner.jsx)
- [reference/frontend/src/components/PetriNetEditorV2/components/TemplateViewer/TemplateList.jsx](../../reference/frontend/src/components/PetriNetEditorV2/components/TemplateViewer/TemplateList.jsx)
- [reference/frontend/src/components/PetriNetEditorV2/components/TemplateViewer/TemplateItem.jsx](../../reference/frontend/src/components/PetriNetEditorV2/components/TemplateViewer/TemplateItem.jsx)
- [frontend/src/components/editor/PetriNetEditor.tsx](../../frontend/src/components/editor/PetriNetEditor.tsx)
- [frontend/src/components/editor/TemplateListView.tsx](../../frontend/src/components/editor/TemplateListView.tsx)
- [frontend/src/components/editor/TemplateListItem.tsx](../../frontend/src/components/editor/TemplateListItem.tsx)

## 10. 承認記録

- **計画書提示日時**: 2026-01-27 17:00
- **承認日時**: （ユーザーの承認待ち）
- **承認者コメント**: （承認後に記入）

## 11. 実施記録

### 実施日時
開始: （承認後に記入）
完了: （完了後に記入）

### 計画からの変更点
（実施中に発生した変更を記録）

### 発生した問題と解決方法
（実施中に発生した問題を記録）

### 最終的な成果物
- [ ] TemplateList.tsx（移植完了）
- [ ] TemplateItem.tsx（移植完了）
- [ ] TemplateContext.tsx（新規作成）
- [ ] PetriNetEditor.tsx（viewMode統合）
- [ ] EditorToolbar.tsx（ビューモード切替ボタン追加）

## 12. 振り返り

### うまくいった点
（完了後に記入）

### 改善が必要な点
（完了後に記入）

### 学んだこと
（完了後に記入）