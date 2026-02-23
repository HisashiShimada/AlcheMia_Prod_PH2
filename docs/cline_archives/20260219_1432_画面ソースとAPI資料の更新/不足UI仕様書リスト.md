# 不足UI仕様書リスト

## 作成日時
2026-02-19 15:12

## 概要
実装ファイル（.tsx）は存在するが、UI仕様書（.md）が存在しないファイルのリスト

---

## プロジェクト管理関連（5ファイル）

| # | 実装ファイル | UI仕様書 | 状態 | 優先度 |
|---|-------------|----------|------|--------|
| 1 | InstructionDialog.tsx | InstructionDialog.md | ❌ 不足 | ⭐⭐⭐ 高 |
| 2 | InstructionEditDialog.tsx | InstructionEditDialog.md | ❌ 不足 | ⭐⭐⭐ 高 |
| 3 | InstructionRegistrationTab.tsx | InstructionRegistrationTab.md | ❌ 不足 | ⭐⭐⭐ 高 |
| 4 | TaskRegistrationTab.tsx | TaskRegistrationTab.md | ❌ 不足 | ⭐⭐⭐ 高 |
| 5 | TaskResultsTable.tsx | TaskResultsTable.md | ❌ 不足 | ⭐⭐ 中 |

**実装ディレクトリ**: `frontend/src/components/project/`
**仕様書ディレクトリ**: `docs/design/ui/experiment_admin/01_project_management/`

---

## フォーマット管理関連（8ファイル）

| # | 実装ファイル | UI仕様書 | 状態 | 優先度 |
|---|-------------|----------|------|--------|
| 6 | FormatManagement.tsx | FormatManagement.md | ❌ 不足 | ⭐⭐⭐ 高 |
| 7 | CreateFormatFileModal.tsx | CreateFormatFileModal.md | ❌ 不足 | ⭐⭐ 中 |
| 8 | CreateFormatFolderModal.tsx | CreateFormatFolderModal.md | ❌ 不足 | ⭐⭐ 中 |
| 9 | FormatFileDetailModal.tsx | FormatFileDetailModal.md | ❌ 不足 | ⭐⭐ 中 |
| 10 | FormatFileListTable.tsx | FormatFileListTable.md | ❌ 不足 | ⭐⭐ 中 |
| 11 | FormatFolderTree.tsx | FormatFolderTree.md | ❌ 不足 | ⭐⭐ 中 |
| 12 | FormatSearchModal.tsx | FormatSearchModal.md | ❌ 不足 | ⭐⭐ 中 |
| 13 | FormatUploadDialog.tsx | FormatUploadDialog.md | ❌ 不足 | ⭐⭐ 中 |

**実装ディレクトリ**: `frontend/src/components/project/`
**仕様書ディレクトリ**: `docs/design/ui/experiment_admin/02_format_management/` （作成要）

---

## 合計
- **不足ファイル数**: 13ファイル
- **高優先度**: 5ファイル
- **中優先度**: 8ファイル

---

## 作業計画

### Phase 1: 高優先度（プロジェクト管理関連5ファイル）
1. InstructionRegistrationTab.md
2. TaskRegistrationTab.md
3. InstructionDialog.md
4. InstructionEditDialog.md
5. TaskResultsTable.md

### Phase 2: 中優先度（フォーマット管理関連8ファイル）
6. FormatManagement.md
7-13. その他フォーマット管理系モーダル・テーブル

---

## 次のアクション
1. 実装ファイルを読み込んで内容を確認
2. UI仕様書テンプレートに従って作成
3. 既存の類似ファイルを参考に記載
