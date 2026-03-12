# 実験管理者（Experiment Admin）UI仕様書 - 索引

## 📋 概要

このディレクトリには、実験管理者（Experiment Admin）ロール向けの全画面・コンポーネントのUI仕様書が格納されています。

**対象ロール:** Experiment Admin（実験管理者）  
**総コンポーネント数:** 58コンポーネント（実装ベースで再作成完了）  
**最終更新日:** 2026-03-12

---

## 🗂️ ディレクトリ構造

```
experiment_admin/
├── 00_menu/                    # メニュー（2ファイル）
├── 01_project_management/      # プロジェクト管理（16ファイル）
├── 02_format_management/       # フォーマット管理（9ファイル）
├── 03_progress_monitoring/     # 進捗確認（5ファイル）
├── 04_maiml_editor/           # MAIML編集（16ファイル）
│   ├── petri_net/             # Petri Netエディタ（13ファイル）
│   └── document/              # ドキュメント編集（4ファイル）
└── 05_viewer/                 # ビューアコンポーネント（10ファイル）
```

---

## 📁 カテゴリ別UI仕様書

### 0. メニュー（1ファイル）

**ディレクトリ:** `00_menu/`

| # | ファイル名 | 画面名 | 説明 |
|---|-----------|--------|------|
| 1 | [ExperimentAdminMenu.md](00_menu/ExperimentAdminMenu.md) | 実験管理者メニュー | 4つの主要機能へのナビゲーション |

**詳細:** [00_menu/README.md](00_menu/README.md)

---

### 1. プロジェクト管理（8ファイル）

**ディレクトリ:** `01_project_management/`

| # | ファイル名 | 画面名 | 説明 |
|---|-----------|--------|------|
| 1 | [ProjectManagement.md](01_project_management/ProjectManagement.md) | プロジェクト管理画面 | メイン画面 |
| 2 | [ProjectFolderTree.md](01_project_management/ProjectFolderTree.md) | プロジェクトフォルダツリー | 階層表示 |
| 3 | [FileListTable.md](01_project_management/FileListTable.md) | ファイル一覧テーブル | ファイルリスト |
| 4 | [CreateProjectModal.md](01_project_management/CreateProjectModal.md) | プロジェクト作成モーダル | 新規作成 |
| 5 | [ProjectDetailModal.md](01_project_management/ProjectDetailModal.md) | プロジェクト詳細モーダル | 詳細表示 |
| 6 | [ProjectSearchModal.md](01_project_management/ProjectSearchModal.md) | プロジェクト検索モーダル | 高度な検索 |
| 7 | [BulkUploadDialog.md](01_project_management/BulkUploadDialog.md) | 一括アップロードダイアログ | 複数ファイル |
| 8 | [CheckoutStatusDialog.md](01_project_management/CheckoutStatusDialog.md) | チェックアウト状態ダイアログ | 編集ロック |

**詳細:** [01_project_management/README.md](01_project_management/README.md)

---

### 2. フォーマット管理（8ファイル）

**ディレクトリ:** `02_format_management/`

| # | ファイル名 | 画面名 | 説明 |
|---|-----------|--------|------|
| 1 | [FormatManagement.md](02_format_management/FormatManagement.md) | フォーマット管理画面 | メイン画面 |
| 2 | [FormatFolderTree.md](02_format_management/FormatFolderTree.md) | フォーマットフォルダツリー | プレフィックス管理 |
| 3 | [FormatFileListTable.md](02_format_management/FormatFileListTable.md) | フォーマットファイル一覧 | ファイルリスト |
| 4 | [CreateFormatFileModal.md](02_format_management/CreateFormatFileModal.md) | フォーマットファイル作成 | 新規作成 |
| 5 | [CreateFormatFolderModal.md](02_format_management/CreateFormatFolderModal.md) | フォーマットフォルダ作成 | プレフィックス作成 |
| 6 | [FormatFileDetailModal.md](02_format_management/FormatFileDetailModal.md) | フォーマット詳細 | 詳細表示 |
| 7 | [FormatSearchModal.md](02_format_management/FormatSearchModal.md) | フォーマット検索 | 高度な検索 |
| 8 | [FormatUploadDialog.md](02_format_management/FormatUploadDialog.md) | フォーマットアップロード | ファイル選択 |

**詳細:** [02_format_management/README.md](02_format_management/README.md)

---

### 3. 進捗確認（5ファイル）

**ディレクトリ:** `03_progress_monitoring/`

| # | ファイル名 | 画面名 | 説明 |
|---|-----------|--------|------|
| 1 | [ProgressMonitoring.md](03_progress_monitoring/ProgressMonitoring.md) | 進捗確認画面 | メイン画面 |
| 2 | [WorkProgressDetailDialog.md](03_progress_monitoring/WorkProgressDetailDialog.md) | 作業進捗詳細ダイアログ | 詳細表示 |
| 3 | [TaskResultsTable.md](03_progress_monitoring/TaskResultsTable.md) | タスク結果テーブル | 結果一覧 |
| 4 | [InstructionDialog.md](03_progress_monitoring/InstructionDialog.md) | 指示確認ダイアログ | 指示内容 |
| 5 | [PetriNetVisualization.md](03_progress_monitoring/PetriNetVisualization.md) | Petri Net可視化 | フロー表示 |

**詳細:** [03_progress_monitoring/README.md](03_progress_monitoring/README.md)

---

### 4. MAIML編集（13ファイル）

**ディレクトリ:** `04_maiml_editor/`

#### 4-1. Petri Netエディタ（7ファイル）

**サブディレクトリ:** `04_maiml_editor/petri_net/`

| # | ファイル名 | 画面名 | 説明 |
|---|-----------|--------|------|
| 1 | [PetriNetEditorScreen.md](04_maiml_editor/petri_net/PetriNetEditorScreen.md) | Petri Netエディタ画面 | メイン画面 |
| 2 | [PetriNetEditor.md](04_maiml_editor/petri_net/PetriNetEditor.md) | Petri Netエディタコア | エディタ本体 |
| 3 | [PetriNetViewer.md](04_maiml_editor/petri_net/PetriNetViewer.md) | Petri Netビューア | 閲覧専用 |
| 4 | [EditorToolbar.md](04_maiml_editor/petri_net/EditorToolbar.md) | エディタツールバー | 操作パネル |
| 5 | [PropertyPanel.md](04_maiml_editor/petri_net/PropertyPanel.md) | プロパティパネル | 詳細設定 |
| 6 | [ValidationPanel.md](04_maiml_editor/petri_net/ValidationPanel.md) | バリデーションパネル | エラー表示 |
| 7 | [MethodTabPanel.md](04_maiml_editor/petri_net/MethodTabPanel.md) | メソッドタブパネル | メソッド切替 |

**詳細:** [04_maiml_editor/petri_net/README.md](04_maiml_editor/petri_net/README.md)

#### 4-2. ドキュメント編集（7ファイル）

**サブディレクトリ:** `04_maiml_editor/document/`

| # | ファイル名 | 画面名 | 説明 |
|---|-----------|--------|------|
| 1 | [DocumentEditDialog.md](04_maiml_editor/document/DocumentEditDialog.md) | ドキュメント編集ダイアログ | メイン編集 |
| 2 | [TemplateEditor.md](04_maiml_editor/document/TemplateEditor.md) | テンプレートエディタ | テンプレート編集 |
| 3 | [PropertyViewer.md](04_maiml_editor/document/PropertyViewer.md) | プロパティビューア | プロパティ表示 |
| 4 | [StructuredPropertySelector.md](04_maiml_editor/document/StructuredPropertySelector.md) | 構造化プロパティセレクタ | プロパティ選択 |
| 5 | [ImageViewer.md](04_maiml_editor/document/ImageViewer.md) | 画像ビューア | JPG/PNG表示 |
| 6 | [TiffViewer.md](04_maiml_editor/document/TiffViewer.md) | TIFFビューア | TIFF表示 |
| 7 | [DraftManager.md](04_maiml_editor/document/DraftManager.md) | 下書き管理 | Draft管理 |

**詳細:** [04_maiml_editor/document/README.md](04_maiml_editor/document/README.md)

---

## 🔗 関連ドキュメント

### 設計ドキュメント

- [画面構成定義](../../../.clinerules/references/ui_structure.md)
- [画面一覧詳細](../ui_screen_list.md)
- [UIポリシー](../../../.clinerules/references/ui_policy.md)
- [フロントエンド規約](../../../.clinerules/development/frontend.md)

### API仕様

- [API構成定義](../../../.clinerules/references/api_structure.md)
- [API一覧](../../api/api_list.md)
- [API設計ポリシー](../../../.clinerules/development/api.md)

### データベース

- [データベース構造定義](../../../.clinerules/references/db_structure.md)
- [テーブル一覧](../../db/db_table_list.md)

---

## 📊 統計情報

### カテゴリ別ファイル数

| カテゴリ | ファイル数 | 割合 |
|---------|----------|------|
| メニュー | 2 | 3% |
| プロジェクト管理 | 16 | 28% |
| フォーマット管理 | 9 | 16% |
| 進捗確認 | 5 | 9% |
| MAIML編集 - Petri Net | 13 | 22% |
| MAIML編集 - ドキュメント | 4 | 7% |
| Viewer | 10 | 17% |
| **合計** | **58** | **100%** |

### 実装状態

| 状態 | ファイル数 | 割合 |
|------|----------|------|
| 実装ベースで再作成完了 | 58 | 100% |
| 未実装 | 0 | 0% |

---

## 🎯 使い方

### UI仕様書の検索

1. **画面名から探す**: 上記の表から該当する画面を探す
2. **機能から探す**: カテゴリ別に分類されているため、機能別に探す
3. **コンポーネント名から探す**: ファイル名で検索

### UI仕様書の読み方

各UI仕様書は以下の構成で記述されています：

1. **概要**: コンポーネントの目的と使用場面
2. **画面構成**: レイアウト構造とUI要素
3. **機能仕様**: 主要機能の詳細と処理フロー
4. **データ仕様**: Props、State、API連携
5. **UI/UXポリシー準拠**: Ant Designコンポーネント使用
6. **実装ファイル**: ソースコードの場所
7. **使用例**: 実装コード例

---

## ✅ 仕様書作成ガイドライン

新規画面を追加する際は、以下のガイドラインに従ってください：

### 1. ファイル配置

適切なカテゴリディレクトリに配置：
```
docs/design/ui/experiment_admin/
  └── [カテゴリ]/
      └── [ComponentName].md
```

### 2. 命名規則

- ファイル名: `PascalCase.md`
- 例: `ProjectManagement.md`, `CreateProjectModal.md`

### 3. 必須セクション

すべてのUI仕様書に以下のセクションを含める：
- 概要（目的、使用場面、アクセス権限）
- 画面構成（レイアウト、UI要素）
- 機能仕様（処理フロー、ボタン動作）
- データ仕様（Props、State）
- UI/UXポリシー準拠
- 実装ファイル（パス、関連コンポーネント）
- 変更履歴

### 4. 索引の更新

新規画面追加時は以下を更新：
- このファイル（README.md）
- カテゴリ別README.md
- `docs/design/ui/ui_screen_list.md`

---

## 🚀 開発ワークフロー

### 1. UI仕様書確認

実装前に該当するUI仕様書を確認：
```bash
# 例: プロジェクト管理画面の仕様確認
cat docs/design/ui/experiment_admin/01_project_management/ProjectManagement.md
```

### 2. 実装ファイル特定

UI仕様書の「6. 実装ファイル」セクションでパスを確認：
```
frontend/src/pages/ExperimentAdminMenu/ProjectManagement.tsx
```

### 3. API仕様確認

「10. APIエンドポイント」セクションでAPI仕様を確認

### 4. コンポーネント実装

UI仕様書に従ってコンポーネントを実装

### 5. テスト

機能仕様の「使用シナリオ」に従ってテスト

---

## 📝 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 2.0.0 | 2026-03-12 | 実装ベースで全58ファイルを再作成完了（Phase 1-8完了） | Cline |
| 1.0.0 | 2026-01-21 | 初版作成（35ファイル完成） | Cline |

---

## 🙋 サポート

### 質問・問題報告

- UI仕様に関する質問: 各UI仕様書のコメント欄
- 実装上の問題: GitLabのIssue
- 設計変更提案: 設計レビュー会議

### 連絡先

- 開発チーム: development-team@example.com
- プロジェクトマネージャー: pm@example.com
