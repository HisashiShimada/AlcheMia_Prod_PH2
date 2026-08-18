# タスク計画書: 多言語対応 ハードコード日本語修正

## メタデータ
- **作成日時**: 2026-07-29 16:18
- **タスクID**: 多言語対応_ハードコード日本語修正
- **優先度**: 中
- **推定工数**: 3時間

## タスク概要
対象ファイル内にコンソール以外でハードコーディングされている日本語（部品名・エラーメッセージ等）を多言語対応する。

## 変更ファイル一覧

### フロントエンド
| ファイル | 変更内容 |
|---------|---------|
| `frontend/src/locales/ja.json` | termManagement, namespace, prefixManagement, namespaceMain, createProject キー追加 |
| `frontend/src/locales/en.json` | 同上（英語） |
| `frontend/src/components/namespace/TermManagement.tsx` | react-i18next→useLanguage、全日本語文字列をt()化 |
| `frontend/src/components/namespace/DuplicateSuggestModal.tsx` | react-i18next→useLanguage |
| `frontend/src/components/namespace/NamespaceMain.tsx` | useLanguage追加、日本語文字列をt()化（フィルター・列ヘッダー・ボタン・メッセージ系約40キー） |
| `frontend/src/components/namespace/PrefixManagement.tsx` | useLanguage追加、全日本語文字列をt()化（約25キー） |
| `frontend/src/components/project/CreateProjectModal.tsx` | チーム選択ラベル/placeholderをt()化 |

### バックエンド（エラーメッセージを英語化）
| ファイル | 変更内容 |
|---------|---------|
| `backend/src/controllers/namespaceController.ts` | 日本語エラーメッセージを英語化 |
| `backend/src/controllers/organizationGroupController.ts` | 日本語エラーメッセージを英語化 |
| `backend/src/controllers/projectController.ts` | 日本語エラーメッセージを英語化 |
| `backend/src/services/organizationGroupService.ts` | 日本語エラーメッセージを英語化 |
| `backend/src/services/organizationService.ts` | 日本語エラーメッセージを英語化（該当箇所のみ） |

## 実装ステップ
- [x] 対象ファイル調査
- [ ] ja.json / en.json に新規キー追加
- [ ] TermManagement.tsx 修正（react-i18next撤廃 + 全日本語t()化）
- [ ] DuplicateSuggestModal.tsx 修正（react-i18next撤廃）
- [ ] NamespaceMain.tsx 修正（日本語文字列t()化）
- [ ] CreateProjectModal.tsx 修正（チーム選択t()化）
- [ ] バックエンドファイル修正（英語エラーメッセージ化）

## 承認記録
- **計画書提示日時**: 2026-07-29 16:18
