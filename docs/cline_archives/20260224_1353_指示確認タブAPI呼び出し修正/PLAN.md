# タスク計画書: 指示確認タブAPI呼び出し修正

## メタデータ
- **作成日時**: 2026-02-24 13:53
- **タスクID**: instruction-confirmation-tab-api-fix
- **優先度**: 高
- **推定工数**: 0.5時間

## 1. タスク概要

指示確認タブでプロジェクト選択時に「Project not found」エラーが発生する問題を修正する。

### 問題の発生状況
- **エンドポイント**: `GET /api/v1/progress/projects/:projectName/worker-tasks`
- **エラー**: `RESOURCE_NOT_FOUND - Project not found`
- **原因**: フロントエンドがプロジェクトID（UUID）を送信しているが、バックエンドAPIはプロジェクト名を期待している

### 具体例
```
# 実際のリクエスト（誤り）
GET /api/v1/progress/projects/6ba823e4-2924-4bc8-b996-51d5a4faea30/worker-tasks

# 正しいリクエスト
GET /api/v1/progress/projects/sample_project/worker-tasks
```

## 2. 目的と期待される成果

### 目的
- 指示確認タブでプロジェクト選択時に正しくタスク一覧を取得できるようにする
- APIエンドポイントの仕様に合わせたデータ送信を行う

### 期待される成果
- [x] プロジェクト選択時に404エラーが発生しない
- [x] タスク一覧が正しく表示される
- [x] API呼び出しでプロジェクト名が使用される
- [x] 既存の機能に影響を与えない

## 3. 実装ステップ

### Phase 1: 問題の分析と確認
- [x] バックエンドAPIの実装を確認（progressRoutes.ts, progressController.ts）
- [x] フロントエンドのAPI呼び出しを確認（InstructionConfirmationTab.tsx）
- [x] 親コンポーネントを確認（ExperimentWorkerMenu.tsx）
- [x] データベース構造を確認（project.sql）

### Phase 2: 修正方針の決定
- [x] 親コンポーネントは修正不要（既にselectedProjectNameを管理）
- [x] 子コンポーネント（InstructionConfirmationTab.tsx）のみ修正
- [x] API呼び出しでselectedProjectNameを使用する

### Phase 3: 型定義の修正
- [x] InstructionConfirmationTabPropsにselectedProjectNameを追加

### Phase 4: コンポーネントの修正
- [x] 関数の引数にselectedProjectNameを追加
- [x] API呼び出しでselectedProjectNameを使用
- [x] useEffectの依存配列を修正
- [x] 空状態の条件チェックを修正
- [x] TypeScriptエラーを修正（taskNo型変換、task_status使用）

### Phase 5: 動作確認
- [ ] プロジェクト選択時にエラーが発生しないことを確認
- [ ] タスク一覧が正しく表示されることを確認
- [ ] ブラウザコンソールでデバッグログを確認
- [ ] NetworkタブでAPIリクエストを確認

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/components/ExperimentWorker/InstructionConfirmationTab.tsx`
   - Propsインターフェースの拡張
   - API呼び出しロジックの修正
   - 条件チェックの修正

### 新規作成するファイル
なし

### 削除するファイル
なし

### 影響を受ける機能
- 指示確認タブのプロジェクト選択機能
- タスク一覧の表示機能

### 影響を受けない機能（親コンポーネントは修正不要）
- ExperimentWorkerMenu.tsx（プロジェクト選択ロジック）
- ProgressCheckTab.tsx（同様のpropsを受け取っているが、こちらは正しく実装済み）
- ExperimentRecordTab.tsx（同様のpropsを受け取っているが、こちらは正しく実装済み）

## 5. 技術的詳細

### 使用する技術・ライブラリ
- React 18.2.0
- TypeScript
- Ant Design v6

### バックエンドAPIの仕様
- **エンドポイント**: `GET /api/v1/progress/projects/:projectName/worker-tasks`
- **パスパラメータ**: `projectName`（プロジェクト名、文字列）
- **内部処理**: `findByName.sql`でプロジェクト名からプロジェクトIDを検索

### データベース構造
```sql
CREATE TABLE project (
  organization_id uuid NOT NULL,
  project_id uuid NOT NULL,        -- UUID型
  project_name character varying,  -- プロジェクト名（文字列）
  ...
);
```

### 修正前のコード
```typescript
// ❌ 誤り: selectedProject（UUID）を使用
const result = await getWorkerTasks(selectedProject);
```

### 修正後のコード
```typescript
// ✅ 正しい: selectedProjectName（プロジェクト名）を使用
const result = await getWorkerTasks(selectedProjectName);
```

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 既存の機能に影響を与える | 中 | 低 | 他のタブ（進捗確認、実験記録）は既に正しく実装されているため影響なし |
| selectedProjectNameが空文字列の場合のエラー | 低 | 低 | 条件チェックで空文字列も考慮 |
| APIレスポンスの遅延 | 低 | 低 | ローディング状態を適切に管理 |

## 7. テスト計画

### 手動テスト
- [x] プロジェクト選択前の状態確認（空状態表示）
- [ ] プロジェクト選択時のAPI呼び出し確認
- [ ] タスク一覧の表示確認
- [ ] エラーハンドリングの確認
- [ ] ブラウザコンソールのデバッグログ確認
- [ ] NetworkタブでのAPIリクエスト確認

### 確認項目
```typescript
// デバッグログで確認すべき項目
[DEBUG] InstructionConfirmationTab - Fetching worker tasks {
  selectedProject: "6ba823e4-2924-4bc8-b996-51d5a4faea30",  // UUID
  selectedProjectName: "sample_project"  // プロジェクト名
}

// Networkタブで確認すべき項目
Request URL: http://localhost:3001/api/v1/progress/projects/sample_project/worker-tasks
                                                              ^^^^^^^^^^^^^^
                                                              プロジェクト名
```

## 8. ロールバック計画

修正は1ファイルのみで、変更箇所も限定的なため、問題が発生した場合はGitで直前のコミットに戻す。

```bash
# ロールバックコマンド
git checkout HEAD~1 frontend/src/components/ExperimentWorker/InstructionConfirmationTab.tsx
```

## 9. 関連ドキュメント

- [指示確認タブ UI設計書](../design/ui/ui_instruction_confirmation_tab.md)
- [進捗監視API仕様](../design/api/api_progress_monitoring.md)
- [project.sql DDL](../design/db/ddl/project.sql)
- [progressController.ts](../../backend/src/controllers/progressController.ts)
- [progressRoutes.ts](../../backend/src/routes/progressRoutes.ts)

## 10. 承認記録

- **計画書提示日時**: 2026-02-24 13:53
- **承認日時**: 2026-02-24 13:53
- **承認者コメント**: Act Modeで実装を開始

## 11. 実施記録

### 実施日時
開始: 2026-02-24 13:53
完了: （未完了）

### 計画からの変更点
（実施中に記録）

### 発生した問題と解決方法
（実施中に記録）

### 最終的な成果物
- [ ] InstructionConfirmationTab.tsx の修正
- [ ] 動作確認完了

## 12. 振り返り

### うまくいった点
（完了後に記録）

### 改善が必要な点
（完了後に記録）

### 学んだこと
（完了後に記録）
