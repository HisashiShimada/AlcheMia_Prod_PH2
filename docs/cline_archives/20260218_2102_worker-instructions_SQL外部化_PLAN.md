# タスク計画書: worker-instructions API SQL外部ファイル化

## メタデータ
- **作成日時**: 2026-02-18 21:02
- **タスクID**: worker-instructions_sql_refactoring
- **優先度**: 中
- **推定工数**: 2時間

## 1. タスク概要

指示一覧取得（実験作業者用）API（GET /api/v1/projects/:projectName/worker-instructions）で使用されているSQLクエリを外部ファイル化し、pg-promiseライブラリを使用するように修正します。

## 2. 目的と期待される成果

### 目的
- SQLクエリをコードから分離してメンテナンス性を向上
- pg-promiseの機能を活用してクエリ管理を統一
- 既存のSQLファイルとの共通化によるコード重複の削減

### 期待される成果
- [ ] projectService.tsのgetWorkerInstructionsメソッドで使用されているSQLクエリの洗い出し完了
- [ ] 外部SQLファイルの作成完了
- [ ] pg-promiseを使用したクエリ実行への修正完了
- [ ] 既存SQLファイルとの共通化確認完了

## 3. 実装ステップ

### Phase 1: SQLクエリの洗い出し
- [ ] projectService.tsのgetWorkerInstructionsメソッドを分析
- [ ] 使用されているSQLクエリを特定
- [ ] 既存の類似SQLファイルを確認（共通化の可能性）

### Phase 2: 外部SQLファイルの作成
- [ ] backend/src/sql/queries/instructions/ディレクトリ配下に新規SQLファイルを作成
- [ ] クエリのパラメータ化（$1, $2, ...形式）
- [ ] コメントの追加（クエリの目的、パラメータの説明）

### Phase 3: projectService.tsの修正
- [ ] getPgp()の使用追加（既にimport済みか確認）
- [ ] loadSqlFile()を使用してSQLファイルを読み込み
- [ ] pgp.any()またはpgp.manyOrNone()を使用してクエリ実行
- [ ] エラーハンドリングの実装

### Phase 4: 動作確認
- [ ] 修正箇所のコンパイルエラーがないことを確認
- [ ] SQLファイルのパスが正しいことを確認
- [ ] パラメータのバインディングが正しいことを確認

## 4. 影響範囲

### 変更するファイル
1. `backend/src/services/projectService.ts` - getWorkerInstructionsメソッドの修正

### 新規作成するファイル
1. `backend/src/sql/queries/instructions/findWorkerInstructions.sql` - メインの指示一覧取得クエリ

### 影響を受ける機能
- 指示一覧取得API（実験作業者用）

## 5. 技術的詳細

### 対象クエリの概要

**getWorkerInstructionsメソッド内のクエリ:**

```sql
SELECT 
  pi.id,
  pi.project_id,
  p.project_name,
  pi.method_id,
  pi.transition_id,
  pi.task_no,
  pi.instruction_target,
  pi.instructions,
  pi.priority,
  pi.type,
  pi.create_at,
  pi.created_by,
  ua.user_name as created_by_name,
  CASE 
    WHEN iah.history_id IS NOT NULL THEN true 
    ELSE false 
  END as is_acknowledged
FROM project_instruction pi
INNER JOIN project p ON p.id = pi.project_id
LEFT JOIN user_authentication ua ON ua.user_id = pi.created_by
LEFT JOIN instruction_acknowledged_history iah 
  ON iah.instruction_id = pi.id
  AND iah.organization_id = pi.organization_id
  AND iah.acknowledged_user_id = $1
[動的WHERE句]
ORDER BY pi.create_at DESC
```

**パラメータ:**
- $1: userId (acknowledged_user_id用)
- $2以降: 動的条件（userRole, organizationId, projectName, projectId等）

### 実装方針

1. **SQLファイルの構造**
   - ベースクエリをSQLファイルに格納
   - 動的WHERE句はTypeScriptコード側で構築
   - パラメータは$1, $2, ...形式で記述

2. **pg-promise使用方法**
   ```typescript
   const pgp = getPgp();
   const sqlQuery = await loadSqlFile('instructions/findWorkerInstructions.sql');
   const result = await pgp.any<InstructionRow>(sqlQuery, params);
   ```

3. **既存SQLファイルとの共通化**
   - instructions/ディレクトリ内の既存ファイルを確認
   - 重複するクエリがあれば共通化を検討

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 動的WHERE句の構築ロジックが複雑化 | 中 | 中 | 段階的にWHERE条件を追加するロジックを維持 |
| パラメータバインディングのミス | 高 | 低 | パラメータインデックスを慎重に管理 |
| SQLファイル読み込みエラー | 中 | 低 | エラーハンドリングを適切に実装 |

## 7. テスト計画

### 手動テスト
- [ ] APIエンドポイントへのリクエストが正常に処理されるか確認
- [ ] 実験作業者ロールでのフィルタリングが正しく動作するか確認
- [ ] projectNameフィルタが正しく適用されるか確認
- [ ] 確認済み/未確認のフラグが正しく取得されるか確認

### エッジケース
- [ ] projectNameに該当するプロジェクトが存在しない場合
- [ ] ユーザーに割り当てられたタスクがない場合（実験作業者）
- [ ] 指示が1件も存在しない場合

## 8. ロールバック計画

変更は1ファイル（projectService.ts）の1メソッドのみのため、Git revertで即座にロールバック可能。

## 9. 関連ドキュメント

- [departmentRepository.ts](../../backend/src/repositories/departmentRepository.ts) - pg-promise使用の参考実装
- [db.ts](../../backend/src/database/db.ts) - getPgp()の定義
- [loader.ts](../../backend/src/sql/loader.ts) - loadSqlFile()の定義

## 10. 承認記録

- **計画書提示日時**: 2026-02-18 21:02
- **承認日時**: （承認後に記入）
- **承認者コメント**: （ユーザーからのフィードバック）

## 11. 実施記録

### 実施日時
開始: 2026-02-18 21:05
完了: 2026-02-18 21:07

### 計画からの変更点
- なし（計画通りに実装完了）

### 発生した問題と解決方法
1. **TypeScriptコンパイルエラー（未使用変数）**
   - 問題: `pgp.tx(async (t) => {})` の引数 `t` が未使用
   - 解決: `pgp.tx(async () => {})` に修正

### 最終的な成果物
- [x] 外部SQLファイルの作成（findWorkerInstructions.sql）
- [x] projectService.tsの修正（pg-promise使用）
- [x] コンパイルエラー修正完了

## 12. 振り返り

### うまくいった点
（成功要因を記録）

### 改善が必要な点
（今後の改善点を記録）

### 学んだこと
（このタスクから得られた知見を記録）
