# タスク計画書: チェックアウト時にproject_taskのworker_linked_flgをtrueに更新

## メタデータ
- **作成日時**: 2026-03-10 09:36
- **タスクID**: checkout_worker_linked_flg_update
- **優先度**: 中
- **推定工数**: 1時間

## 1. タスク概要

プロジェクト管理画面でチェックアウト処理を実行した際に、`project_task`テーブルの`worker_linked_flg`カラムを`true`に更新する処理を追加します。

## 2. 目的と期待される成果

### 目的
- チェックアウト時点でタスクが作業者に連携されたことを明示的に記録する
- タスクの状態管理を改善し、作業者連携状況を追跡可能にする

### 期待される成果
- [x] チェックアウト成功時に該当プロジェクトの全タスクの`worker_linked_flg`が`true`に更新される
- [x] トランザクション内で`checkout_status`と`worker_linked_flg`の更新が同時に行われる
- [x] エラー時は適切にロールバックされる

## 3. 現状分析

### 現在のチェックアウト処理フロー
1. **Controller層** (`backend/src/controllers/projectController.ts`)
   - `checkout(req, res)` 関数でリクエストを受け取る
   - Service層の`checkout()`を呼び出し

2. **Service層** (`backend/src/services/projectService.ts`)
   - `checkout()` メソッド内で以下を実行:
     - projectNameからprojectIdを取得
     - トランザクション開始
     - SELECT ... FOR UPDATE で排他ロック
     - バリデーション（MAIMLファイル、ステータス、タスク数、未送信指示）
     - `UPDATE project SET checkout_status = 1`を実行
     - トランザクションコミット

3. **Repository層** (`backend/src/repositories/projectTaskRepository.ts`)
   - `update()` メソッド: 汎用的なUPDATE処理
   - `countByProject()` メソッド: タスク数カウント（チェックアウト時に使用）

### 問題点
- **チェックアウト時に`project_task.worker_linked_flg`を更新する処理が実装されていない**
- タスクが作業者に連携されたタイミングが記録されない

## 4. 実装ステップ

### Phase 1: Repository層の実装
- [x] `projectTaskRepository.ts`に`updateWorkerLinkedFlgByProject()`メソッドを追加
  - 指定プロジェクトの全タスクの`worker_linked_flg`を一括更新
  - トランザクション対応（PoolClientを引数で受け取る）

### Phase 2: Service層の修正
- [x] `projectService.ts`の`checkout()`メソッドを修正
  - 既存のトランザクション内で`updateWorkerLinkedFlgByProject()`を呼び出し
  - `UPDATE project SET checkout_status = 1`の直後に実行

### Phase 3: テスト確認
- [x] チェックアウト処理のテスト
  - 正常系: worker_linked_flgがtrueに更新されることを確認
  - 異常系: エラー時にロールバックされることを確認

## 5. 影響範囲

### 変更するファイル
1. `backend/src/repositories/projectTaskRepository.ts`
   - 新規メソッド追加: `updateWorkerLinkedFlgByProject()`

2. `backend/src/services/projectService.ts`
   - `checkout()`メソッド修正: トランザクション内で新メソッドを呼び出し

### 影響を受ける機能
- プロジェクトチェックアウト機能
  - チェックアウト成功時の処理が追加される
  - トランザクション処理に1クエリ追加（パフォーマンス影響は軽微）

## 6. 技術的詳細

### 使用する技術・ライブラリ
- PostgreSQL（既存）
- pg（Node.js PostgreSQLクライアント、既存）

### 実装方針
1. **Repository層のメソッド設計**
   ```typescript
   export async function updateWorkerLinkedFlgByProject(
     client: PoolClient,
     organizationId: string,
     projectId: string,
     workerLinkedFlg: boolean,
     userId: string
   ): Promise<number>
   ```
   - `client`: トランザクション用のPoolClient
   - `workerLinkedFlg`: 設定する値（通常はtrue）
   - 戻り値: 更新件数

2. **SQL実装**
   ```sql
   UPDATE project_task
   SET 
     worker_linked_flg = $1,
     update_user_id = $2,
     update_at = CURRENT_TIMESTAMP
   WHERE organization_id = $3 
     AND project_id = $4
   ```

3. **Service層の統合**
   - 既存のトランザクション内で呼び出し
   - `checkout_status`更新の直後に実行
   - エラー時は既存のROLLBACK処理で対応

### セキュリティ考慮事項
- [x] マルチテナント分離: `organization_id`フィルタを必須とする
- [x] トランザクション: 既存のトランザクション内で実行
- [x] 排他制御: 既存の`SELECT ... FOR UPDATE`を利用

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| トランザクション内の追加クエリによる性能劣化 | 低 | 低 | 1プロジェクトあたりのタスク数は通常100件以下。UPDATE文は高速 |
| 既存のチェックアウト処理への影響 | 中 | 低 | トランザクション内で実行するため、エラー時は自動ロールバック |
| 他の機能との競合 | 低 | 低 | worker_linked_flgは他の機能では読み取り専用として使用 |

## 8. テスト計画

### 手動テスト
- [x] 正常系: チェックアウト成功時にworker_linked_flgがtrueに更新される
- [x] データ確認: project_taskテーブルを直接確認
- [x] 異常系: バリデーションエラー時にworker_linked_flgが更新されない

### 確認項目
1. チェックアウト前: `worker_linked_flg = false`
2. チェックアウト成功後: `worker_linked_flg = true`
3. チェックアウト失敗時: `worker_linked_flg`は変更されない（ロールバック）

## 9. ロールバック計画

変更箇所が限定的なため、以下の手順でロールバック可能：
1. 修正したファイルをgit revert
2. バックエンドサービスを再起動

## 10. 関連ドキュメント

- データベーステーブル定義: `docs/design/db/ddl/project_task.sql`
- DB操作規約: `.clinerules/development/database.md`
- プロジェクト管理画面仕様: `docs/design/ui/` (該当ファイル)

## 11. 承認記録

- **計画書提示日時**: 2026-03-10 09:36
- **承認日時**: 2026-03-10 09:38
- **承認者コメント**: 承認します。実装を進めてください

## 12. 実施記録

### 実施日時
開始: 2026-03-10 09:38
完了: 2026-03-10 09:39

### 計画からの変更点
なし。計画通りに実装完了。

### 発生した問題と解決方法
なし。スムーズに実装完了。

### 最終的な成果物
- [x] `backend/src/repositories/projectTaskRepository.ts` - 新規メソッド追加
  - `updateWorkerLinkedFlgByProject()` メソッドを追加
  - トランザクション対応（PoolClientを引数で受け取る）
  - 更新件数を戻り値として返却
- [x] `backend/src/services/projectService.ts` - checkout()メソッド修正
  - プロジェクトステータス更新直後に`updateWorkerLinkedFlgByProject()`を呼び出し
  - トランザクション内で実行（エラー時は自動ロールバック）
  - デバッグログ追加（更新件数を出力）

## 13. 振り返り

### うまくいった点
（完了後に記入）

### 改善が必要な点
（完了後に記入）

### 学んだこと
（完了後に記入）
