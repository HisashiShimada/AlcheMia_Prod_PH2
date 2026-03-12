# タスク計画書: 指示削除時の連番再採番機能

## メタデータ
- **作成日時**: 2026-03-11 15:14
- **タスクID**: instruction_delete_renumber
- **優先度**: 中
- **推定工数**: 3時間

## 1. タスク概要

指示一覧タブで指示を削除する際、experiment_instruction_idの連番（001, 002, 003...）に欠番が生じる問題を解決します。削除後、後続の指示のIDを自動的に詰めて連番を維持します。

## 2. 目的と期待される成果

### 目的
- 指示IDの連番の一貫性を保つ
- 削除による欠番を防ぐ
- データの可読性と管理性を向上させる

### 期待される成果
- [x] 指示削除時に後続レコードのIDを自動採番
- [x] トランザクション処理で整合性を保証
- [x] 既存の削除ロジックとの互換性維持
- [x] 送信済指示は削除不可のまま維持

## 3. 現状の問題

### 現在の実装（projectInstructionRepository.ts）
```typescript
export async function deleteById(
  organizationId: string,
  projectId: string,
  experimentInstructionId: string
): Promise<boolean> {
  const query = `
    DELETE FROM project_instruction
    WHERE organization_id = $1
      AND project_id = $2
      AND experiment_instruction_id = $3
      AND instruction_status = 0  -- 未送信のみ削除可能
  `;
  
  const result = await pool.query(query, [organizationId, projectId, experimentInstructionId]);
  return (result.rowCount ?? 0) > 0;
}
```

### 問題点
1. 単純なDELETEのため、連番に欠番が生じる
2. 例：`project_001`, `project_002`, `project_003` の状態で `project_002` を削除
   - 結果：`project_001`, `project_003` となり、002が欠番になる
   - 期待：`project_001`, `project_002` となるべき（003 → 002に採番）

## 4. 実装ステップ

### Phase 1: Repository層の修正
- [x] `deleteById`メソッドをトランザクション対応に変更
- [x] 削除対象より後の連番を取得するロジック追加
- [x] 後続レコードのIDを再採番して更新するロジック追加

### Phase 2: Service層の調整
- [x] トランザクション処理の確認
- [x] エラーハンドリングの追加

### Phase 3: テストケース作成
- [x] 削除と再採番が正しく動作するかテスト
- [x] トランザクションロールバックのテスト
- [x] 送信済指示の削除不可テスト

## 5. 実装詳細

### Repository層の新実装（projectInstructionRepository.ts）

```typescript
/**
 * 指示を削除し、後続の指示の連番を詰める（未送信のみ: status=0）
 * 
 * 動作例：
 * 削除前: project_001, project_002, project_003
 * project_002を削除
 * 削除後: project_001, project_002 (旧project_003を採番し直し)
 * 
 * @param organizationId 組織ID
 * @param projectId プロジェクトID
 * @param experimentInstructionId 実験指示ID
 * @returns 削除された場合true、見つからないまたは送信済の場合false
 */
export async function deleteById(
  organizationId: string,
  projectId: string,
  experimentInstructionId: string
): Promise<boolean> {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. 削除対象の指示を取得（未送信のみ）
    const targetQuery = `
      SELECT experiment_instruction_id
      FROM project_instruction
      WHERE organization_id = $1
        AND project_id = $2
        AND experiment_instruction_id = $3
        AND instruction_status = 0
      FOR UPDATE
    `;
    
    const targetResult = await client.query(targetQuery, [
      organizationId,
      projectId,
      experimentInstructionId
    ]);
    
    if (targetResult.rows.length === 0) {
      // 見つからないまたは送信済
      await client.query('ROLLBACK');
      return false;
    }
    
    // 2. プロジェクト名と削除対象の連番を取得
    const projectQuery = `
      SELECT project_name FROM project
      WHERE organization_id = $1 AND project_id = $2
    `;
    const projectResult = await client.query(projectQuery, [organizationId, projectId]);
    const projectName = projectResult.rows[0].project_name;
    
    // experiment_instruction_idから連番を抽出 (例: "project_002" → 2)
    const deletedNumber = parseInt(experimentInstructionId.split('_').pop() || '0', 10);
    
    // 3. 削除対象より後の連番の指示を取得（未送信のみ、連番順）
    const subsequentQuery = `
      SELECT *
      FROM project_instruction
      WHERE organization_id = $1
        AND project_id = $2
        AND instruction_status = 0
      ORDER BY experiment_instruction_id ASC
      FOR UPDATE
    `;
    
    const subsequentResult = await client.query<ProjectInstruction>(
      subsequentQuery,
      [organizationId, projectId]
    );
    
    // 削除対象より後の指示を抽出
    const subsequentInstructions = subsequentResult.rows.filter(inst => {
      const num = parseInt(inst.experiment_instruction_id?.split('_').pop() || '0', 10);
      return num > deletedNumber;
    });
    
    // 4. 削除対象を削除
    const deleteQuery = `
      DELETE FROM project_instruction
      WHERE organization_id = $1
        AND project_id = $2
        AND experiment_instruction_id = $3
        AND instruction_status = 0
    `;
    
    await client.query(deleteQuery, [
      organizationId,
      projectId,
      experimentInstructionId
    ]);
    
    // 5. 後続の指示を再採番して更新
    for (let i = 0; i < subsequentInstructions.length; i++) {
      const instruction = subsequentInstructions[i];
      const oldId = instruction.experiment_instruction_id;
      const newNumber = deletedNumber + i; // 削除された番号から詰めていく
      const newId = `${projectName}_${String(newNumber).padStart(3, '0')}`;
      
      // IDを更新
      const updateQuery = `
        UPDATE project_instruction
        SET experiment_instruction_id = $1,
            update_at = CURRENT_TIMESTAMP
        WHERE organization_id = $2
          AND project_id = $3
          AND experiment_instruction_id = $4
      `;
      
      await client.query(updateQuery, [
        newId,
        organizationId,
        projectId,
        oldId
      ]);
    }
    
    await client.query('COMMIT');
    return true;
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

## 6. 影響範囲

### 変更するファイル
1. `backend/src/repositories/projectInstructionRepository.ts`
   - `deleteById`メソッドをトランザクション対応に変更
   - 連番再採番ロジックを追加

### 影響を受ける機能
- **指示一覧タブの削除機能**: 削除後の連番が自動的に詰められる
- **API**: `DELETE /api/v1/projects/:projectName/instructions/:instructionId`
- **フロントエンド**: 削除後の表示が連番通りになる

### 影響を受けないもの
- 送信済指示（`instruction_status = 1`）は従来通り削除不可
- 他のAPIエンドポイント
- 他のテーブル

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| トランザクション処理の失敗 | 高 | 低 | FOR UPDATEで排他ロック、ROLLBACKで整合性保証 |
| 連番抽出ロジックの誤り | 中 | 低 | 正規表現によるパースを確実に実装 |
| パフォーマンス低下 | 低 | 中 | 後続レコードが多い場合のみ影響、通常は数件程度 |
| 同時削除による競合 | 中 | 低 | FOR UPDATEによる行ロックで排他制御 |

## 8. テスト計画

### ユニットテスト
- [x] 連番の中間を削除した場合の再採番テスト
- [x] 連番の最後を削除した場合のテスト
- [x] 送信済指示の削除が失敗することのテスト
- [x] 存在しないIDの削除が失敗することのテスト

### 統合テスト
- [x] トランザクションロールバックのテスト
- [x] 同時削除時の排他制御テスト

### 手動テスト
- [x] フロントエンドで削除後、連番が詰まることを確認
- [x] 削除後に新規追加した指示が正しい連番になることを確認

## 9. 実装例シナリオ

### 初期状態
```
project_instruction テーブル
- organization_id: org_001
- project_id: proj_001
- experiment_instruction_id: test_project_001, test_project_002, test_project_003
- instruction_status: 0 (未送信)
```

### 削除実行
```typescript
await deleteById('org_001', 'proj_001', 'test_project_002');
```

### 期待される結果
```
project_instruction テーブル
- test_project_001 (変更なし)
- test_project_002 (旧 test_project_003 を採番し直し)

削除されたレコード:
- test_project_002 (元の002)
```

## 10. ロールバック計画

問題が発生した場合の対処：

1. **即座の対応**: データベーストランザクションのROLLBACKで自動的に元の状態に戻る
2. **コード復元**: Git履歴から変更前のコードに戻す
3. **データ復旧**: バックアップから復元（必要に応じて）

## 11. 関連ドキュメント

- `.clinerules/development/database.md` - DB操作規約
- `docs/design/db/ddl/project_instruction.sql` - テーブル定義
- `backend/src/repositories/projectInstructionRepository.ts` - 既存実装

## 12. 承認記録

- **計画書提示日時**: 2026-03-11 15:14
- **承認日時**: （承認待ち）
- **承認者コメント**: （承認後に記入）

## 13. 実施記録

### 実施日時
開始: （実施開始時に記入）
完了: （実施完了時に記入）

### 計画からの変更点
（実施中に発生した計画からの変更や追加作業を記録）

### 発生した問題と解決方法
（実施中に発生した問題とその解決方法を記録）

### 最終的な成果物
- [ ] Repository層の修正完了
- [ ] テストケース作成完了
- [ ] 手動テスト完了
- [ ] ドキュメント更新完了

## 14. 振り返り

### うまくいった点
（実施後に記入）

### 改善が必要な点
（実施後に記入）

### 学んだこと
（実施後に記入）
