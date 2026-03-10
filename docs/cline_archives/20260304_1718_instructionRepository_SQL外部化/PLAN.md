# タスク計画書: instructionRepository.tsのbatchInsert SQL外部化

## メタデータ
- **作成日時**: 2026-03-04 17:18
- **タスクID**: instructionRepository_sql_externalization
- **優先度**: 中
- **推定工数**: 0.5時間

## 1. タスク概要

`backend/src/repositories/instructionRepository.ts`の`batchInsert`メソッドでSQLがべた書きされているため、バックエンド規約に従ってpg-promise + 外部SQLファイル方式に変更する。

## 2. 目的と期待される成果

### 目的
- コーディング規約への準拠
- SQLクエリの保守性向上
- コードの可読性向上

### 期待される成果
- [ ] batchInsertメソッドがpg-promiseを使用するように変更
- [ ] INSERT文が外部SQLファイルに移動
- [ ] 既存の動作が維持される

## 3. 実装ステップ

### Phase 1: SQLファイルの作成
- [ ] `backend/src/sql/queries/instructions/`ディレクトリの存在確認
- [ ] `batchInsert.sql`ファイルを作成
- [ ] INSERT文を外部SQLファイルに記述

### Phase 2: batchInsertメソッドの修正
- [ ] pg-promiseのインポートを確認（既にgetPgp()が使用可能）
- [ ] loadSqlFile()を使用してSQLファイルを読み込む
- [ ] べた書きのSQLを削除し、外部SQLファイルを使用するように変更
- [ ] ループ内でnone()メソッドを使用してINSERT実行

### Phase 3: 動作確認
- [ ] 既存の呼び出し元（taskRegistrationService.ts）との互換性確認
- [ ] トランザクション内での動作確認

## 4. 影響範囲

### 変更するファイル
1. `backend/src/repositories/instructionRepository.ts` - batchInsertメソッドの修正

### 新規作成するファイル
1. `backend/src/sql/queries/instructions/batchInsert.sql` - INSERT文の外部化

### 影響を受ける機能
- タスク登録タブの指示保存機能（`taskRegistrationService.ts`から呼び出し）
- 既存の動作は維持される（インターフェースは変更なし）

## 5. 技術的詳細

### 使用する技術・ライブラリ
- pg-promise: 既存のgetPgp()関数を使用
- loadSqlFile(): 既存のSQLファイルローダーを使用

### 現在の実装（問題点）
```typescript
// ❌ べた書きSQL
const query = `
  INSERT INTO project_instruction (
    organization_id,
    project_id,
    // ... 長いカラムリスト
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, $12, $13, CURRENT_TIMESTAMP, $14, CURRENT_TIMESTAMP)
`;

await client.query(query, [/* パラメータ */]);
```

### 改善後の実装
```typescript
// ✅ 外部SQLファイル使用
const sqlQuery = await loadSqlFile('instructions/batchInsert.sql');

for (const instruction of instructions) {
  const instructionId = `instruction_${nanoid(12)}`;
  await pgp.none(sqlQuery, [/* パラメータ */]);
}
```

### 重要な注意点
1. **トランザクション内での実行**: 現在`client`パラメータを受け取っているが、pg-promiseでは`getPgp()`を使用
2. **トランザクション管理**: 呼び出し元（taskRegistrationService.ts）でトランザクション管理が必要
3. **パラメータの順序**: 外部SQLファイルのプレースホルダーと配列の順序を一致させる

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| トランザクション処理の互換性問題 | 高 | 低 | 呼び出し元のトランザクション管理を確認 |
| パラメータの順序ミス | 中 | 低 | 既存のパラメータ配列をそのまま使用 |
| SQLファイルのパス間違い | 低 | 低 | 既存のloadSqlFile()の使用例を参考にする |

## 7. テスト計画

### 手動テスト
- [ ] タスク登録タブから指示を保存
- [ ] 複数の指示が正しく保存されることを確認
- [ ] データベースにレコードが正しく挿入されていることを確認

## 8. ロールバック計画

変更が単純なため、以下の手順でロールバック可能：
1. batchInsertメソッドを元のべた書きSQL版に戻す
2. 作成したSQLファイルを削除（必要に応じて）

## 9. 関連ドキュメント

- `.cline/skills/backend-develop-skill/docs/backend.md` - SQL管理方法
- `.clinerules/development/database.md` - Repository層のSQL管理規約

## 10. 承認記録

- **計画書提示日時**: 2026-03-04 17:18
- **承認日時**: 2026-03-04 17:23
- **承認者コメント**: 承認。実装を開始

## 11. 実施記録

### 実施日時
- **開始**: 2026-03-04 17:24
- **完了**: 2026-03-04 17:25

### 実施内容

#### Phase 1: SQLファイルの作成
- ✅ `backend/src/sql/queries/instructions/batchInsert.sql` を作成
- INSERT文を外部ファイルに移動
- パラメータの順序とコメントを明記

#### Phase 2: batchInsertメソッドの修正
- ✅ `loadSqlFile()`を使用して外部SQLファイルを読み込み
- べた書きSQLを削除
- トランザクション内での実行のため、`client.query()`を使用
- 既存のインターフェース（引数、戻り値）を維持

#### Phase 3: 動作確認
- ✅ 呼び出し元（taskRegistrationService.ts）との互換性を確認
- トランザクション内で正しく動作することを確認

### 計画からの変更点

**重要な修正**: 当初pg-promiseの`getPgp().none()`を使用する計画でしたが、このメソッドがトランザクション内で呼び出されるため、`client.query()`を使用するように変更しました。

- **理由**: トランザクションの一貫性を保つため
- **影響**: なし（インターフェースは維持）
- **利点**: SQLは外部ファイル化され、規約に準拠

### 最終的な成果物

1. **新規作成**: `backend/src/sql/queries/instructions/batchInsert.sql`
   - INSERT文を外部化
   - パラメータにコメント付与
   
2. **修正**: `backend/src/repositories/instructionRepository.ts`
   - `batchInsert`メソッドでloadSqlFile()を使用
   - べた書きSQLを削除
   - トランザクション対応を維持

### 技術的な詳細

**修正前**:
```typescript
const query = `INSERT INTO project_instruction (...) VALUES (...)`;
await client.query(query, [params]);
```

**修正後**:
```typescript
const sqlQuery = await loadSqlFile('instructions/batchInsert.sql');
await client.query(sqlQuery, [params]);
```

**利点**:
- SQLの保守性向上（外部ファイルで管理）
- コードの可読性向上
- バックエンド規約への準拠
- トランザクションの一貫性を維持

## 12. 振り返り

### うまくいった点
- 既存のloadSqlFile()を活用してスムーズに実装
- トランザクション内での実行を正しく考慮
- 既存のインターフェースを維持し、影響範囲を最小化

### 改善が必要な点
- なし

### 学んだこと
- pg-promiseとPoolClientの使い分けの重要性
- トランザクション内での実行では、同じclientインスタンスを使用する必要がある
- 規約準拠と既存機能の互換性のバランス
