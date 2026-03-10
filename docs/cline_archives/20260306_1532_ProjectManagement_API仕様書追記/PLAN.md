# タスク計画書: ProjectManagement画面 API仕様書追記

## メタデータ
- **作成日時**: 2026-03-06 15:32
- **タスクID**: ProjectManagement_API仕様書追記
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

`frontend/src/components/project/ProjectManagement.tsx` およびその配下コンポーネントが呼び出すAPIのうち、API仕様書に未記載のものを特定して追記する。

## 調査結果

### 呼び出し元コンポーネントと使用サービス

| コンポーネント | 使用サービス |
|---|---|
| ProjectManagement.tsx | projectApiService.ts, fileAccessService.ts |
| TaskRegistrationTab.tsx | projectApiService.ts |
| InstructionRegistrationTab.tsx | projectApiService.ts |

### 既存仕様書

- `docs/design/api/api_project_management.md` - プロジェクト管理API（v2.7.0）
- `docs/design/api/api_file_access.md` - ファイルアクセスAPI（v1.1.0）

---

## 未記載API一覧

### api_project_management.md への追記対象

| # | API名 | メソッド | エンドポイント | 呼び出し元 |
|---|------|---------|---------------|-----------|
| A | レビュー待ちタスク一括完了 | POST | `/api/v1/projects/:projectName/tasks/complete-review` | ProjectManagement.tsx（タスク確認完了ボタン） |
| B | タスク登録状況取得 | GET | `/api/v1/projects/:projectName/instructions/status` | InstructionRegistrationTab.tsx |
| C | 指示更新 | PUT | `/api/v1/projects/:projectName/instructions/:instructionId` | InstructionRegistrationTab.tsx |
| D | 指示削除 | DELETE | `/api/v1/projects/:projectName/instructions/:instructionId` | InstructionRegistrationTab.tsx |
| E | 指示一括送信 | POST | `/api/v1/projects/:projectName/instructions/send` | InstructionRegistrationTab.tsx |

#### 補足：既存エントリとの差異

- **指示送信（#7, 旧仕様）**: 仕様書の#7「指示送信（タスク作成）」は実際の実装とは異なる（タスク情報なし、エンドポイントも `/instructions/send`）。実装に合わせて整合させる必要あり
- **指示一覧取得（#8）**: 仕様書に既存記載あり（`GET /instructions`）。実装と一致。レスポンス形式（`data.instructions`配列）を確認・更新
- **MAIMLファイル取得（#13）**: 仕様書は`/:projectId/maiml`だが実装は`/:projectName/maiml` → エンドポイント修正も行う
- **指示保存（POST /instructions）**: 仕様書の#7と実装の`saveInstruction`が混在している状況を整理

### api_file_access.md への追記対象

| # | API名 | メソッド | エンドポイント | 呼び出し元 |
|---|------|---------|---------------|-----------|
| F | ファイルテキスト内容取得 | POST | `/api/v1/files/content-as-text` | fileAccessService.ts |
| G | ファイル削除 | DELETE | `/api/v1/files/delete` | fileAccessService.ts |

### 新規仕様書作成: api_semantic_search.md（全て未記載）

`semanticSearchService.ts` が呼び出すエンドポイントは `api_list.md` にも記載がなく、専用の仕様書が存在しない。

| # | API名 | メソッド | エンドポイント | 呼び出し元 |
|---|------|---------|---------------|-----------|
| H | セマンティック検索 | POST | `/api/v1/semantic-search/search` | TransitionSetSearchModal（検索実行） |
| I | クエリ分解（AI4軸分解） | POST | `/api/v1/semantic-search/decompose` | TransitionSetSearchModal（buildRequest） |
| J | ファイルインデックス登録 | POST | `/api/v1/semantic-search/index` | semanticSearchService.ts |
| K | インデックス統計取得 | GET | `/api/v1/semantic-search/stats` | semanticSearchService.ts |
| L | ヘルスチェック | GET | `/api/v1/semantic-search/health` | semanticSearchService.ts |
| M | バッチ処理開始 | POST | `/api/v1/semantic-search/batch` | TransitionSetBatchProcessingPanel（handleStart） |
| N | バッチジョブ一覧取得 | GET | `/api/v1/semantic-search/batch` | TransitionSetBatchProcessingPanel（fetchData） |
| O | バッチ統計取得 | GET | `/api/v1/semantic-search/batch/stats` | TransitionSetBatchProcessingPanel（fetchData） |
| P | バッチジョブキャンセル | DELETE | `/api/v1/semantic-search/batch/:jobId` | TransitionSetBatchProcessingPanel（handleCancel） |

---

## 実装ステップ

### Phase 1: api_project_management.md への追記
- [ ] A. レビュー待ちタスク一括完了 API を追記
- [ ] B. タスク登録状況取得 API を追記
- [ ] C. 指示更新 API を追記
- [ ] D. 指示削除 API を追記
- [ ] E. 指示一括送信 API を追記
- [ ] 既存エントリ（#7 指示送信、#13 MAIMLファイル取得）の実装差異を修正
- [ ] API一覧テーブル・実装状況サマリー・総API数を更新

### Phase 2: api_file_access.md への追記
- [ ] F. ファイルテキスト内容取得 API を追記
- [ ] G. ファイル削除 API を追記
- [ ] API一覧テーブル・実装状況サマリー・総API数を更新

### Phase 3: api_semantic_search.md の新規作成（H〜P）
- [ ] H. セマンティック検索 API
- [ ] I. クエリ分解 API
- [ ] J. ファイルインデックス登録 API
- [ ] K. インデックス統計取得 API
- [ ] L. ヘルスチェック API
- [ ] M. バッチ処理開始 API
- [ ] N. バッチジョブ一覧取得 API
- [ ] O. バッチ統計取得 API
- [ ] P. バッチジョブキャンセル API
- [ ] api_list.md にセマンティック検索APIセクションを追加

## 変更ファイル
1. `docs/design/api/api_project_management.md` - 追記・修正
2. `docs/design/api/api_file_access.md` - 追記
3. `docs/design/api/api_semantic_search.md` - 新規作成
4. `docs/design/api/api_list.md` - セマンティック検索APIセクション追加

## テスト計画
- 追記後、仕様書とフロントエンドのservice関数を突き合わせて齟齬がないか確認

## 承認記録
- **計画書提示日時**: 2026-03-06 15:32
- **承認日時**: 
- **承認者コメント**: 
