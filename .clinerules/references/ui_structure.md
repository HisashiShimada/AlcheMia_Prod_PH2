# 画面構成定義

## 概要

このドキュメントは、画面構成を理解するための参照ルールです。
詳細な画面一覧は別ファイルで管理されています。

## 📚 参照ドキュメント

### 画面一覧の詳細
**ファイル**: `docs/design/ui/ui_screen_list.md`

このファイルには以下の情報が含まれています：
- 全画面の物理名（ファイル名）・論理名（画面名）
- ファイルパス
- 画面の用途・説明
- 使用する主要なAPI
- 関連コンポーネント
- アクセス権限（ロール）

**重要**: 新規画面を追加した際や画面を変更した際は、必ず `docs/design/ui/ui_screen_list.md` も更新してください。

### UI設計書
**ディレクトリ**: `docs/design/ui/`

各画面の詳細な設計書が格納されています。

---

## 🎯 使用ガイドライン

### フロントエンド実装時

1. **画面ファイルの特定**
   - `docs/design/ui/ui_screen_list.md` で画面名からファイルパスを確認
   - 物理名と論理名の対応を把握
   - 関連コンポーネントを確認

2. **新規画面作成時**
   - 適切なカテゴリ（ディレクトリ）に配置
   - 命名規則に従う（PascalCase）
   - `ui_screen_list.md` に追加登録

3. **画面設計書参照**
   - `docs/design/ui/` 内の該当設計書を確認
   - UI/UX仕様を把握
   - API仕様を確認

### 画面変更時

1. **ファイルの更新**
   - 該当するコンポーネントファイルを更新

2. **画面一覧の更新（必須）**
   - `docs/design/ui/ui_screen_list.md` を更新
   - 変更内容を記録

3. **設計書の更新**
   - 必要に応じて `docs/design/ui/` 内の設計書を更新

---

## 📊 画面カテゴリ

### 1. 認証関連（auth/）
- LoginForm, PasswordResetRequest, PasswordResetExecute
- PINCodeForm, AuthContainer

### 2. 共通コンポーネント（common/）
- Header, SubHeader, MenuCard
- DebugLoginPanel

### 3. エディタ関連（editor/）
- PetriNetEditor, DocumentEditDialog, TemplateEditorDialog
- PropertyPanel, ValidationPanel, EditorToolbar
- MethodTabPanel, MultiObjectEditor, DraftManager

### 4. 実験作業者画面（ExperimentWorker/）
- ExperimentRecordTab - 実験記録タブ
- ProgressCheckTab - 進捗確認タブ
- InstructionConfirmationTab - 指示確認タブ
- DataRecordDialog - データ記録ダイアログ
- 各種選択モーダル（プロジェクト、メソッド、タスク）

### 5. メニュー（menus/）
- ProviderMenu - プロバイダメニュー
- SystemAdminMenu - システム管理メニュー
- DataAdminMenu - データ管理メニュー
- ExperimentAdminMenu - 実験管理メニュー
- ExperimentWorkerMenu - 実験作業メニュー

### 6. ノード（nodes/）
- TransitionNode - トランジションノード
- MaterialTemplateNode, ConditionTemplateNode, ResultTemplateNode

### 7. 進捗管理（progress/）
- ProgressMonitoring - 進捗モニタリング
- PetriNetVisualization - PetriNet可視化
- WorkProgressDetailDialog - 作業進捗詳細ダイアログ

### 8. プロジェクト管理（project/）
- ProjectManagement - プロジェクト管理
- FormatManagement - フォーマット管理
- 各種モーダル（作成、詳細、検索、アップロード）
- フォルダツリー、ファイル一覧テーブル

### 9. ビューア（viewer/）
- PetriNetViewer - PetriNetビューア
- PetriNetEditorScreen - PetriNetエディタ画面
- ViewRenderer, ViewRendererDialog
- PropertyViewer, PropertyViewerWithSelection
- ImageViewer, TiffViewer

---

## ⚠️ 重要な設計原則

### コンポーネント命名規則
```typescript
// ✅ 良い例（PascalCase）
LoginForm.tsx
ProjectManagement.tsx
DataRecordDialog.tsx

// ❌ 悪い例
loginForm.tsx
project-management.tsx
data_record_dialog.tsx
```

### ディレクトリ配置
- 機能・ロールごとにディレクトリを分ける
- 共通コンポーネントは `common/` に配置
- ダイアログやモーダルは親コンポーネントと同じディレクトリに配置

### インポートパス
```typescript
// ✅ 良い例（相対パス）
import LoginForm from '@/components/auth/LoginForm';
import Header from '@/components/common/Header';

// プロジェクト内のコンポーネント
import DataRecordDialog from './DataRecordDialog';
```

---

## 🔗 関連ドキュメント

- [画面一覧詳細](../../docs/design/ui/ui_screen_list.md) - 全画面の詳細情報
- [UI設計書ディレクトリ](../../docs/design/ui/) - 各画面の詳細設計
- [フロントエンド規約](../development/frontend.md) - コンポーネント記述ルール
- [UIポリシー](./ui_policy.md) - Ant Design使用規約

---

## 📝 更新履歴

| 日付 | 変更内容 | 担当者 |
|------|----------|--------|
| 2026-01-09 | 初版作成 | Cline |