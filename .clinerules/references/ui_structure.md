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

### 画面調査時のワークフロー（重要）

**ユーザーから画面に関する質問や調査依頼があった場合、必ず以下の順序で進めてください：**

#### Step 1: このファイル（ui_structure.md）を確認
1. まず `.clinerules/references/ui_structure.md`（このファイル）を読む
2. 画面カテゴリ（ロール別）のセクションで該当する画面の概要を把握
3. 画面が属するカテゴリ（認証関連、共通、プロバイダ、システム管理者、データ管理者、実験管理者、実験作業者）を特定

#### Step 2: 詳細な画面一覧を確認
4. `docs/design/ui/ui_screen_list.md` を読んで詳細情報を取得
5. 物理名（ファイル名）、論理名（画面名）、ファイルパス、用途を確認
6. 使用するAPIや関連コンポーネントを把握

#### Step 3: 必要に応じて設計書を確認
7. より詳細な仕様が必要な場合は `docs/design/ui/` 内の設計書を参照

#### Step 4: ソースファイルを確認
8. 実装内容を確認する必要がある場合のみ、ソースファイルを読む

**このワークフローに従うことで：**
- ✅ 効率的に情報を取得できる
- ✅ 不要なファイル読み込みを避けられる
- ✅ 画面の全体像を把握してから詳細に入れる

### フロントエンド実装時

1. **画面ファイルの特定**
   - まず `.clinerules/references/ui_structure.md`（このファイル）で概要を確認
   - `docs/design/ui/ui_screen_list.md` で画面名からファイルパスを確認
   - 物理名と論理名の対応を把握
   - 関連コンポーネントを確認

2. **新規画面作成時**
   - 適切なカテゴリ（ディレクトリ）に配置
   - 命名規則に従う（PascalCase）
   - `ui_screen_list.md` に追加登録
   - このファイル（`ui_structure.md`）のカテゴリセクションも更新

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

## 📊 画面カテゴリ（ロール別）

**全7ロールカテゴリで110+コンポーネントを管理**

詳細は `docs/design/ui/ui_screen_list.md` を参照してください。

### 1. 認証関連（ログイン前）
- LoginPage, AuthContainer, LoginForm
- PasswordResetRequest, PasswordResetExecute, PINCodeForm
- **6コンポーネント**

### 2. 共通コンポーネント（全ユーザー）
- Header, SubHeader, MenuCard, DebugLoginPanel
- ViewRenderer, ImageViewer, TiffViewer, ErrorBoundary
- PropertyViewer, StructuredPropertySelector, SubNetViewer
- TransitionNode, MaterialTemplateNode, ConditionTemplateNode, ResultTemplateNode
- PetriNetVisualization
- **18コンポーネント**

### 3. プロバイダ用画面（Provider）
**メニュー:** ProviderMenu
**機能画面:**
- 組織管理（OrganizationManagementMock）
- 情報ダウンロード（InformationDownloadMock）
- **3コンポーネント**

### 4. システム管理者用画面（System Admin）
**メニュー:** SystemAdminMenu
**機能画面:**
- システム概要、組織統計情報
- ユーザー管理、セッション管理
- マスタ管理（部署、ロール）
- **6コンポーネント**

### 5. データ管理者用画面（Data Admin）
**メニュー:** DataAdminMenu
**機能画面:**
- マスタ管理、組織管理
- 情報ダウンロード
- **4コンポーネント**

### 6. 実験管理者用画面（Experiment Admin）
**メニュー:** ExperimentAdminMenu
**機能画面:**
- プロジェクト管理（7コンポーネント）
- フォーマット管理（8コンポーネント）
- PetriNetエディタ（7コンポーネント）
- ドキュメント編集（7コンポーネント）
- 進捗管理（3コンポーネント）
- 作業指示（1コンポーネント）
- **46コンポーネント**

### 7. 実験作業者用画面（Experiment Worker）
**メニュー:** ExperimentWorkerMenu
**機能画面:**
- メインタブ（実験記録、進捗確認、指示確認）
- 実験記録関連（3コンポーネント）
- 進捗確認関連（2コンポーネント）
- 指示確認関連（4コンポーネント）
- 問題管理（2コンポーネント）
- 選択ダイアログ（10コンポーネント）
- 操作ボタン（1コンポーネント）
- **28コンポーネント**

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
| 2026-01-09 | ロール別画面カテゴリを完成版に更新（110+コンポーネント） | Cline |
