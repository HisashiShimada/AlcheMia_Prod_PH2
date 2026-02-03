# PetriNetEditorV2移植 Phase 14 計画書

## メタデータ
- **作成日時**: 2026-01-29 16:10
- **タスクID**: PetriNetEditorV2_Phase14_WorkflowSelectorDialog
- **優先度**: 中
- **推定工数**: 30分

## 1. タスク概要

Phase 14では、WorkflowSelectorDialog.tsx を移植します。

**確認結果:**
- ✅ WorkflowSelectorDialog.jsx → reference版に存在、PetriNetEditorInner.jsxで使用されている
- ❌ ProjectSelectorDialog.jsx → reference版に存在しない（移植不要）

## 2. 目的と期待される成果

### 目的
- ワークフロー追加機能のダイアログを移植
- 既存ワークフローファイルの選択UI

### 期待される成果
- [x] WorkflowSelectorDialog.tsx の移植完了
- [x] TypeScriptエラーなし
- [x] Material-UI → Ant Design 変換完了

## 3. 実装ステップ

### Phase 14.1: WorkflowSelectorDialog.tsx 移植 (20分)
- [ ] reference版の確認
- [ ] TypeScript型定義の作成
- [ ] Material-UI → Ant Design 変換
- [ ] ファイル一覧表示の実装
- [ ] ファイル選択処理の実装

### Phase 14.2: 動作確認 (10分)
- [ ] TypeScriptコンパイル確認
- [ ] ESLintエラー確認

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/components/editorv2/components/WorkflowSelectorDialog.tsx` - 新規作成

### 依存関係
- **なし** (単独コンポーネント)

## 5. 技術的詳細

### Material-UI → Ant Design 変換

| Material-UI | Ant Design | 備考 |
|------------|-----------|------|
| Dialog | Modal | タイトル・フッター・コンテンツ |
| List + ListItem | Table または List | ファイル一覧表示 |
| CircularProgress | Spin | ローディング |
| TextField | Input | 検索機能 |
| Button | Button | 選択・キャンセル |

### WorkflowSelectorDialog の主要機能
1. **ファイル一覧表示**: S3から取得した.maimlファイル一覧
2. **検索機能**: ファイル名でフィルタリング
3. **ファイル選択**: クリックで選択してワークフローに追加

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| reference版との仕様差異 | 中 | 低 | PetriNetEditorInner.jsxの使用方法を確認 |

## 7. 次のステップ

Phase 14完了後：
- **全Phase完了確認**
- **最終統合ドキュメント更新**

---

**Phase 14 開始** 🚀