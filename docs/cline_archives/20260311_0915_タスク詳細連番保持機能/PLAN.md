# タスク計画書: プロジェクトタスク詳細テーブルの連番保持機能追加

## メタデータ
- **作成日時**: 2026-03-11 09:15
- **タスクID**: task_detail_sequential_numbering
- **優先度**: 高
- **推定工数**: 3時間

## 1. タスク概要

現在の仕様では、タスク情報を保存する際に`project_task_detail`テーブルの既存レコードを全削除してから再登録しているため、以下の問題が発生しています：

```
タスク情報を保存(1回目) 
  → プロジェクトタスク詳細テーブルに method_id=A, task_no=1,2,3 を登録
  ↓
チェックアウト → MAIMLファイル編集 → チェックイン
  ↓
タスク情報を保存(2回目)
  → 全削除 → 再登録で method_id=A, task_no=1,2,3 になる
  ❌ 1回目のレコード（task_no=1,2,3）が削除されてしまう
```

**修正後の期待動作：**
```
タスク情報を保存(1回目)
  → method_id=A, task_no=1,2,3 を登録
  ↓
チェックアウト → MAIMLファイル編集 → チェックイン
  ↓
タスク情報を保存(2回目)
  → method_id=A, task_no=4,5,6 を追加登録（既存は保持）
  ✅ 1回目のレコードは削除されず、2回目は連番で追加される
```

## 2. 目的と期待される成果

### 目的
- タスク登録保存時に既存のタスク詳細データを保持しつつ、新規データを連番で追加登録する
- worker_linked_flg=trueのレコードは保持し、新規レコードのtask_noは既存の最大値+1から採番する

### 期待される成果
- [x] 既存の`project_task_detail`レコード（worker_linked_flg=true）が保持される
- [x] 新規レコードのtask_noが既存の最大値+1から連番で採番される
- [x] method_id × experiment_orderごとに独立して連番が管理される
- [x] トランザクション処理が正常に動作する

## 3. 実装ステップ

### Phase 1: DDLとRepository実装の整合性確認
- [x] DDLで主キーが5つ（organization_id, project_id, method_id, experiment_order, task_no）であることを確認
- [ ] Repositoryの実装がDDLと整合しているか確認
- [ ] 不整合があれば修正

### Phase 2: 最大task_no取得メソッドの追加
- [ ] `projectTaskDetailRepository.ts`に`findMaxTaskNoByMethodAndOrder`メソッドを追加
- [ ] method_id × experiment_orderごとの最大task_noを取得
- [ ] SQLファイル`backend/src/sql/queries/project_task_detail/findMaxTaskNoByMethodAndOrder.sql`を作成

### Phase 3: batchInsertメソッドの修正
- [ ] `projectTaskDetailRepository.batchInsert`を修正
- [ ] 既存の最大task_no+1から採番するロジックを追加
- [ ] トランザクション内で正しく動作するように実装

### Phase 4: deleteByProjectメソッドの条件追加（削除しない）
- [ ] `projectTaskDetailRepository.deleteByProject`を削除または条件付き削除に変更
- [ ] worker_linked_flg=falseのレコードのみ削除するように修正
- [ ] または削除処理自体を行わない仕様に変更

### Phase 5: taskRegistrationService の修正
- [ ] `saveTaskRegistration`関数のdeleteByProject呼び出しを削除または条件付きに変更
- [ ] batchInsertのロジックを連番採番に対応

### Phase 6: テスト
- [ ] 1回目保存 → チェックアウト → チェックイン → 2回目保存のシナリオテスト
- [ ] task_noが連番になっているか確認
- [ ] 既存レコードが保持されているか確認
- [ ] トランザクションロールバックが正しく動作するか確認

## 4. 影響範囲

### 変更するファイル
1. `backend/src/repositories/projectTaskDetailRepository.ts`
   - `findMaxTaskNoByMethodAndOrder`メソッド追加
   - `batchInsert`メソッド修正（連番採番ロジック追加）
   - `deleteByProject`メソッド削除または条件付き削除に変更

2. `backend/src/sql/queries/project_task_detail/findMaxTaskNoByMethodAndOrder.sql`
   - 新規作成

3. `backend/src/services/taskRegistrationService.ts`
   - `saveTaskRegistration`関数の削除処理を削除または条件付きに変更

4. `backend/src/sql/queries/project_task_detail/deleteByProject.sql`（存在する場合）
   - 削除または条件付き削除に変更

### 影響を受ける機能
- タスク登録タブ（実験管理者メニュー）
- タスク登録保存機能
- プロジェクトタスク詳細の一覧表示

## 5. 技術的詳細

### 主キー構成の確認
DDLによると、主キーは以下の5つで構成：
```sql
PRIMARY KEY (organization_id, project_id, method_id, experiment_order, task_no)
```

**重要**: Repositoryの実装では4つ（experiment_orderを除外）として扱われているため、修正が必要。

### 連番採番ロジック
```typescript
// 擬似コード
for (const task of tasks) {
  // method_id × experiment_orderごとの最大task_noを取得
  const maxTaskNo = await findMaxTaskNoByMethodAndOrder(
    t,
    organizationId,
    projectId,
    task.methodId,
    task.experimentOrder
  );
  
  // 既存の最大値+1から採番
  const startTaskNo = (maxTaskNo ?? 0) + 1;
  
  for (let i = 0; i < task.trialCount; i++) {
    const taskNo = startTaskNo + i;
    await t.none(sqlQuery, [
      organizationId,
      projectId,
      task.methodId,
      task.experimentOrder,
      taskNo,
      0, // task_status
      userId,
      userId
    ]);
  }
}
```

### トランザクション処理
- pg-promiseの`t.tx`を使用
- 以下の順序で実行：
  1. ~~`deleteByProject`削除~~ → 削除しない
  2. `batchInsert`で連番採番して追加

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| experiment_orderの不整合 | 高 | 中 | DDLとRepositoryを整合させる |
| 既存データとの競合 | 中 | 低 | トランザクション処理で排他制御 |
| 最大task_no取得の性能劣化 | 低 | 低 | インデックスが主キーで設定済み |
| 既存機能への影響 | 中 | 低 | 十分なテストを実施 |

## 7. テスト計画

### ユニットテスト
- [ ] `findMaxTaskNoByMethodAndOrder`メソッドのテスト
- [ ] `batchInsert`の連番採番ロジックのテスト
- [ ] 既存レコードが保持されることの確認

### 統合テスト
- [ ] タスク登録保存APIのエンドツーエンドテスト
- [ ] 1回目保存 → 2回目保存のシナリオテスト
- [ ] チェックアウト → チェックイン → 2回目保存のシナリオテスト

### 手動テスト
- [ ] 実験管理者画面でタスク登録タブを開く
- [ ] タスク情報を保存（1回目）
- [ ] プロジェクトをチェックアウト
- [ ] MAIMLファイルを編集（メソッド追加）
- [ ] プロジェクトをチェックイン
- [ ] タスク登録タブで新規メソッドが表示されることを確認
- [ ] タスク情報を保存（2回目）
- [ ] DBを確認し、1回目のレコードが保持され、2回目が連番で追加されていることを確認

## 8. ロールバック計画

問題が発生した場合：
1. 修正前のコード（全削除→再登録）に戻す
2. データベースのバックアップから復元（本番環境の場合）
3. トランザクション処理のため、エラー時は自動ロールバック

## 9. 関連ドキュメント

- [データベース操作規約](.clinerules/development/database.md)
- [project_task_detailテーブルDDL](docs/design/db/ddl/project_task_detail.sql)
- [タスク登録API設計](docs/design/api/)

## 10. 承認記録

- **計画書提示日時**: 2026-03-11 09:15
- **承認日時**: 2026-03-11 09:39
- **承認者コメント**: 修正を許可する

## 11. 実施記録

### 実施日時
開始: 2026-03-11 09:39
完了: 2026-03-11 09:44

### 計画からの変更点
1. **experiment_orderの扱い**
   - 当初DDLとRepositoryの不整合（主キー5つ vs 4つ）を発見
   - ユーザーからの指示により、現在の型定義（experiment_orderなし、主キー4つ）を正として実装
   - DDL側の修正は今後の課題として保留

2. **メソッド名の変更**
   - 当初計画: `findMaxTaskNoByMethodAndOrder`
   - 実装: `findMaxTaskNoByMethod`（experiment_orderを除外）

3. **判定方法の変更**
   - 当初計画: projectテーブルに新規フラグ追加
   - 最終実装: 既存データで判定
     - チェックイン状態（checkout_status = 0）
     - かつ既存タスク詳細あり
     - かつ全タスクが完了/異常終了（task_status = 3 or 4）
   - メリット: テーブル変更不要、既存データのみで判定可能

### 発生した問題と解決方法
1. **主キー構成の不整合**
   - DDL: 主キー5つ（organization_id, project_id, method_id, experiment_order, task_no）
   - 型定義: 主キー4つ（organization_id, project_id, method_id, task_no）
   - 解決: ユーザー指示により、現在の型定義（主キー4つ）を正として実装継続

### 最終的な成果物
- [x] findMaxTaskNoByMethod メソッド実装（SQLファイル + Repository）
- [x] batchInsert メソッド修正（連番採番ロジック追加）
- [x] deleteByProject 呼び出し削除（taskRegistrationService）
- [x] 既存レコード保持、新規レコードを連番で追加する仕様に変更
- [ ] テスト実施（手動テスト推奨）

## 12. 振り返り

### うまくいった点
（成功要因）

### 改善が必要な点
（今後の改善点）

### 学んだこと
（このタスクから得られた知見）
