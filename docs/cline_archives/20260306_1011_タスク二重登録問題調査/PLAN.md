# タスク計画書: タスク二重登録問題調査

## メタデータ
- **作成日時**: 2026-03-06 10:11
- **タスクID**: task-duplicate-insert-investigation
- **優先度**: 高
- **推定工数**: 2時間

## 1. タスク概要

TaskRegistrationTabで「指示追加⇒タスク情報を保存⇒タブ変更⇒指示追加⇒タスク情報を保存」の操作を行うと、project_taskテーブルに二度insert処理が走り、メソッドの数が二倍になる問題を調査・修正する。

## 2. 目的と期待される成果

### 目的
- project_taskテーブルへの二重insert処理の原因を特定する
- メソッド数が二倍になる原因を解明する
- 問題を修正し、正しい動作を保証する

### 期待される成果
- [ ] 二重insert処理の原因を特定
- [ ] 問題箇所を特定し、修正方針を決定
- [ ] 修正を実装し、テストで検証

## 3. 調査ステップ

### Phase 1: 現状分析
- [ ] TaskRegistrationTabコンポーネントの確認
- [ ] タスク情報保存処理の流れを追跡
- [ ] バックエンドのproject_task関連エンドポイントを確認
- [ ] 二重insert処理が発生する条件を特定

### Phase 2: 原因特定
- [ ] フロントエンドの状態管理を確認
- [ ] 保存処理のトリガー条件を確認
- [ ] タブ変更時の副作用を確認
- [ ] useEffectやイベントハンドラの重複実行を確認

### Phase 3: 修正実装
- [ ] 問題箇所を修正
- [ ] 二重insert処理を防ぐ処理を追加
- [ ] 動作確認テスト

## 4. 影響範囲

### 確認が必要なファイル
1. `frontend/src/components/project/TaskRegistrationTab.tsx` - タスク登録タブコンポーネント
2. `backend/src/controllers/projectTaskController.ts` - プロジェクトタスクコントローラー
3. `backend/src/repositories/projectTaskRepository.ts` - プロジェクトタスクリポジトリ
4. `backend/src/services/projectTaskService.ts` - プロジェクトタスクサービス

## 5. 技術的詳細

### 調査観点
- フロントエンド側の状態管理（useState, useEffect）
- タブ変更時のコンポーネントライフサイクル
- 保存処理のトリガー条件
- バックエンドのinsert処理の重複実行チェック

## 6. 調査結果記録

### 発見した問題

**タスク二重登録問題の原因を特定:**

1. **フロントエンド（TaskRegistrationTab.tsx）**:
   - `handleSave`関数で、`pendingInstructions`配列の指示データを`instructionRepository.batchInsert`で保存
   - 保存成功後、`setPendingInstructions([])` でローカルステートをクリア

2. **バックエンド（taskRegistrationService.ts）**:
   - `saveTaskRegistration`関数内で以下を実行:
     - `upsertProjectTasks`: `ON CONFLICT ... DO UPDATE`で既存データを更新（✅ 正常）
     - `deleteAndInsertTaskDetails`: 既存データを削除してから再INSERT（✅ 正常）
     - `deleteAndInsertTransitionData`: 既存データを削除してから再INSERT（✅ 正常）
     - `deleteAndInsertTemplateData`: 既存データを削除してから再INSERT（✅ 正常）
     - **`instructionRepository.batchInsert`: 単純なINSERTのみ（❌ 問題）**

3. **二重登録が発生するフロー**:
   ```
   1回目: 指示追加 → タスク情報を保存
      → API呼び出し → instruction が DB に INSERT される
      → pendingInstructions がクリアされる
   
   タブ変更 → タブ復帰
      → useEffect 再実行 → getTaskRegistration API 呼び出し
      → instruction データは取得されない（pendingInstructions は空のまま）
   
   2回目: 指示追加 → タスク情報を保存
      → API呼び出し → 新しい instruction が DB に INSERT される
      → ❌ 既存の instruction は削除されずに残る
      → 結果: メソッド数 × 2 の instruction レコードが存在
   ```

### 原因（修正）

**`upsertProjectTasks`が`ON CONFLICT ... DO UPDATE`を使用しているが、削除されるべき古いレコードが残るため**

`taskRegistrationService.ts`の`upsertProjectTasks`関数の問題点：

```typescript
// 現在の実装
for (let i = 0; i < tasks.length; i++) {
  const task = tasks[i];
  
  const query = `
    INSERT INTO project_task (...)
    VALUES ($1, $2, $3, $4, ...)
    ON CONFLICT (organization_id, project_id, method_id, experiment_order)
    DO UPDATE SET ...
  `;
  
  await client.query(query, [
    organizationId,
    projectId,
    task.methodId,
    i + 1, // experiment_order ← これが問題
    ...
  ]);
}
```

**問題のシナリオ:**
1. 最初に3つのメソッド（method1, method2, method3）を保存
   - project_task: (method1, order=1), (method2, order=2), (method3, order=3)

2. タブを切り替えて戻ってきた後、再度保存（同じ3つのメソッド）
   - `ON CONFLICT ... DO UPDATE`により、既存の3レコードが更新される
   - しかし、**`experiment_order`が`i + 1`で計算されるため、順序が変わると新しいレコードが追加される**

3. もし`method_id`の順序が変わったり、メソッドが増減すると：
   - 古い`experiment_order`のレコードが残る
   - 新しい`experiment_order`でレコードが追加される
   - 結果：メソッド数が二倍になる

**具体例:**
```
1回目保存:
- (method1, order=1)
- (method2, order=2)
- (method3, order=3)

2回目保存（順序変更）:
- (method2, order=1) ← 新規INSERT（method2, order=2 とは別）
- (method1, order=2) ← 新規INSERT（method1, order=1 とは別）
- (method3, order=3) ← UPDATE（一致）

結果: 5レコード（古い order=1,2 + 新しい order=1,2 + order=3）
```

### 解決策

**`upsertProjectTasks`を「削除→INSERT」パターンに変更:**

```typescript
async function upsertProjectTasks(
  client: PoolClient,
  organizationId: string,
  projectId: string,
  userId: string,
  tasks: SaveTaskRegistrationRequest['tasks']
): Promise<void> {
  // ✅ 1. 既存のproject_taskレコードを全削除
  const deleteQuery = `
    DELETE FROM project_task
    WHERE organization_id = $1
      AND project_id = $2
  `;
  await client.query(deleteQuery, [organizationId, projectId]);
  
  // ✅ 2. 新規にINSERT
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    
    const insertQuery = `
      INSERT INTO project_task (
        organization_id,
        project_id,
        method_id,
        experiment_order,
        experiment_condition,
        attempts_count,
        create_user_id,
        create_at,
        update_user_id,
        update_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, $8, CURRENT_TIMESTAMP)
    `;
    
    await client.query(insertQuery, [
      organizationId,
      projectId,
      task.methodId,
      i + 1, // experiment_order
      task.experimentCondition,
      task.trialCount,
      userId,
      userId
    ]);
  }
}
```

これにより、他のテーブル（`project_task_detail`, `transition_data`, `template_data`）と同様の「削除→INSERT」パターンになり、古いレコードが残らなくなります。

## 7. 承認記録

- **計画書提示日時**: 2026-03-06 10:11
- **承認日時**: （承認待ち）

## 8. 追加調査（ソース変更後）

### 変更内容の確認

**フロントエンド（TaskRegistrationTab.tsx）の主な変更:**

1. **チェックボックス機能の追加**:
   ```typescript
   const [checkedMethodIds, setCheckedMethodIds] = useState<Set<string>>(new Set());
   ```
   - メソッドごとにチェックボックスで保存対象を選択可能に

2. **保存処理の変更**:
   ```typescript
   // 初回保存かどうかを判定（API取得データを再取得して確認）
   const currentData = await getTaskRegistration(projectName);
   const isFirstSave = !currentData.tasks || currentData.tasks.length === 0;
   
   // チェックされたメソッドのみをフィルタリング
   const checkedTasks = taskDetails.filter(task => 
     checkedMethodIds.has(task.methodId)
   );
   ```
   - 保存時に毎回`getTaskRegistration`を呼び出し
   - チェックされたメソッドのみを保存

### 新しい問題の可能性

**変更後も二重登録が発生する理由:**

1. **バックエンドの`upsertProjectTasks`は変更されていない**
   - 依然として`ON CONFLICT ... DO UPDATE`を使用
   - `experiment_order`が配列インデックスで決定される

2. **問題のシナリオ（変更後）**:
   ```
   1回目保存: method1, method2, method3 をチェックして保存
      → DB: (method1, order=1), (method2, order=2), (method3, order=3)
   
   タブ切替・復帰: useEffect再実行
      → checkedMethodIds が既存メソッドIDで初期化される
   
   2回目保存: method1, method3 のみチェックして保存
      → checkedTasks = [method1, method3]
      → ループ: method1=order=1, method3=order=2
      → DB: (method1, order=1) UPDATE, (method3, order=2) 新規INSERT
      → ❌ 古い (method2, order=2), (method3, order=3) が残る
      → 結果: 4レコード
   ```

3. **フロントエンドの`getTaskRegistration`呼び出しの影響**:
   ```typescript
   const currentData = await getTaskRegistration(projectName);
   ```
   - この呼び出し自体は問題ではない
   - しかし、保存のたびにAPI呼び出しが増える（パフォーマンス懸念）

### 結論

**フロントエンドの変更は問題の原因ではない。根本原因は依然としてバックエンドの`upsertProjectTasks`にある。**

**解決策は変わらず:**
- `upsertProjectTasks`を「削除→INSERT」パターンに変更する必要がある
