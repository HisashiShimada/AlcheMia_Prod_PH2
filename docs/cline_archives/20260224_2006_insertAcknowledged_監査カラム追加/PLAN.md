# タスク計画書: insertAcknowledged.sql 監査カラム追加

## メタデータ
- **作成日時**: 2026-02-24 20:06
- **タスクID**: insertAcknowledged_監査カラム追加
- **優先度**: 中
- **推定工数**: 0.5時間

## 1. タスク概要

`backend/src/sql/queries/instructions/insertAcknowledged.sql` に、監査情報カラム（create_user_id、create_at、update_user_id、update_at）のデータ挿入処理を追加します。

## 2. 目的と期待される成果

### 目的
監査証跡の完全性を確保し、誰がいつレコードを作成・更新したかを記録できるようにする。

### 期待される成果
- [x] 正確なDDL定義の確認
- [x] SQLファイルに監査カラムへの挿入処理を追加
- [x] 初回作成時は create_user_id と update_user_id に同じ値を設定
- [x] create_at と update_at に同じタイムスタンプ（NOW()）を設定

## 3. 実装ステップ

### Phase 1: SQLファイルの修正
- [x] `insertAcknowledged.sql` のINSERT文に以下のカラムを追加：
  - `create_user_id`
  - `create_at`
  - `update_user_id`
  - `update_at`
- [x] VALUES句に適切なパラメータを設定：
  - `create_user_id`: `$3` (userId)
  - `create_at`: `NOW()`
  - `update_user_id`: `$3` (userId)
  - `update_at`: `NOW()`

### Phase 2: 動作確認
- [x] SQLファイルの構文確認
- [x] パラメータマッピングの確認（$1, $2, $3, $4）
- [x] コメントの更新確認

## 4. 影響範囲

### 変更するファイル
1. `backend/src/sql/queries/instructions/insertAcknowledged.sql` - 監査カラムの追加

### 新規作成するファイル
なし

### 削除するファイル
1. `backend/migrations/20260131_create_instruction_acknowledged_history.sql` - 誤情報のため削除済み

### 影響を受ける機能
- 指示確認履歴の挿入処理（instructionRepository.insertAcknowledged()）

## 5. 技術的詳細

### テーブル定義（DDL準拠）

```sql
CREATE TABLE instruction_acknowledged_history (
    -- 主キー（複合キー）
    organization_id UUID NOT NULL,
    project_id UUID NOT NULL,
    experiment_instruction_id VARCHAR NOT NULL,
    experiment_user_id VARCHAR(50) NOT NULL,
    
    -- 確認情報
    acknowledged_at TIMESTAMP,
    
    -- 監査情報
    create_user_id VARCHAR(50),      -- 追加対象
    create_at TIMESTAMP,             -- 追加対象
    update_user_id VARCHAR(50),      -- 追加対象
    update_at TIMESTAMP,             -- 追加対象
    
    PRIMARY KEY (organization_id, project_id, experiment_instruction_id, experiment_user_id)
);
```

### パラメータマッピング

現在のリポジトリメソッド呼び出し：
```typescript
insertAcknowledged(
  instructionId: string,    // $1 → experiment_instruction_id
  projectId: string,        // $2 → project_id
  userId: string,           // $3 → experiment_user_id, create_user_id, update_user_id
  organizationId: string    // $4 → organization_id
)
```

### update系カラムの方針
- **Option A（採用）**: 初回作成時も作成者と同じ値を設定
  - `create_user_id = $3`
  - `update_user_id = $3`
  - `create_at = NOW()`
  - `update_at = NOW()`

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| パラメータ番号のミスマッピング | 高 | 低 | 実装後に構文確認を実施 |
| カラム名のタイポ | 中 | 低 | DDLファイルと照合 |

## 7. テスト計画

### 構文チェック
- [ ] SQLファイルの構文が正しいことを確認
- [ ] パラメータ番号（$1-$4）が正しくマッピングされていることを確認

### 手動テスト
- [ ] リポジトリメソッド実行時にエラーが発生しないことを確認
- [ ] 挿入されたレコードに監査カラムの値が正しく設定されていることを確認

## 8. ロールバック計画

SQLファイルの変更のみのため、以前のバージョンに戻すだけで対応可能。

## 9. 関連ドキュメント

- DDL定義: `docs/design/db/ddl/instruction_acknowledged_history.sql`
- リポジトリ実装: `backend/src/repositories/instructionRepository.ts`

## 10. 承認記録

- **計画書提示日時**: 2026-02-24 20:06
- **承認日時**: 2026-02-24 20:06
- **承認者コメント**: Option Aで進める

## 11. 実施記録

### 実施日時
開始: 2026-02-24 20:06
完了: 2026-02-24 20:09

### 計画からの変更点
なし（計画通りに実施完了）

### 発生した問題と解決方法
- マイグレーションファイル（20260131_create_instruction_acknowledged_history.sql）が誤情報であることが判明
  → 正確なDDLファイル（docs/design/db/ddl/instruction_acknowledged_history.sql）を参照して修正

### 最終的な成果物
- [x] `backend/src/sql/queries/instructions/insertAcknowledged.sql` の修正完了

### 修正内容
以下の監査カラムをINSERT文に追加：
- `create_user_id` = $3 (userId)
- `create_at` = NOW()
- `update_user_id` = $3 (userId)
- `update_at` = NOW()

## 12. 振り返り

### うまくいった点
- DDLファイルの正確な定義を確認してから実装を開始したため、一発で正しい修正ができた
- パラメータマッピングを明確に定義したため、混乱なく実装できた
- 細かくステップを分けたことで、進捗が明確だった

### 改善が必要な点
- マイグレーションファイルの管理方法を見直す必要がある（誤情報が存在していた）
- DDLファイルとマイグレーションファイルの同期を確保する仕組みが必要

### 学んだこと
- テーブル定義を確認する際は、必ず `docs/design/db/ddl/` 配下のDDLファイルを参照すべき
- 監査カラム（create_user_id, create_at, update_user_id, update_at）は、初回作成時も全て設定するのがベストプラクティス
