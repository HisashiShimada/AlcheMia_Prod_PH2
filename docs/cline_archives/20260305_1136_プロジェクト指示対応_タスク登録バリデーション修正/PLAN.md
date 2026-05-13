# タスク計画書: プロジェクト指示対応 - タスク登録バリデーション修正

## メタデータ
- **作成日時**: 2026-03-05 11:36
- **タスクID**: project_instruction_validation_fix
- **優先度**: 高
- **推定工数**: 2時間

## 1. タスク概要

プロジェクト指示ボタンから追加された指示は即時DB保存されるため、`pendingInstructions` State には含まれません。現状のバリデーションロジックでは、プロジェクト指示のみを追加した場合に「各メソッドには指示が設定されていません」というエラーが発生し、タスク情報を保存できない問題があります。

この問題を解決するため、バリデーションロジックを修正し、プロジェクト指示も考慮した判定に変更します。

## 2. 現状の問題点

### 問題1: プロジェクト指示のみの場合に保存できない

```typescript
// 現状のバリデーションロジック
const methodsWithoutInstructions: string[] = [];
for (const task of taskDetails) {
  const hasInstruction = pendingInstructions.some(
    inst => inst.methodId === task.methodId
  );
  // プロジェクト指示（methodId=""）は即時DB保存されているため
  // pendingInstructions には含まれない
  // → hasInstruction = false になる
  
  if (!hasInstruction) {
    methodsWithoutInstructions.push(...);
  }
}
```

### 問題2: プロジェクト指示の重複保存

プロジェクト指示は即時DB保存されているにも関わらず、タスク保存時に `instructions` 配列に含めると、重複して保存される可能性があります。

## 3. 解決方針

### 方針A: プロジェクト指示の存在確認APIを追加（推奨）

1. DB保存済みのプロジェクト指示を確認するAPIを追加
2. バリデーション時に「State + DB」の両方をチェック
3. タスク保存時は `pendingInstructions`（タスク指示のみ）を送信

**メリット:**
- 正確な指示存在チェックが可能
- データ整合性を保証
- プロジェクト指示の重複保存を防止

**デメリット:**
- API追加が必要（実装コスト増）

### 方針B: バリデーションを緩和（簡易版）

1. 「各メソッドに最低1つの指示」という要件を削除
2. プロジェクト指示またはタスク指示のいずれかがあればOK
3. 完全なチェックはバックエンドで実施

**メリット:**
- 実装が簡単
- API追加不要

**デメリット:**
- フロントエンドでの事前チェックが不完全
- ユーザーが保存ボタンを押してからエラーが判明

### 採用方針: **方針B（バリデーション緩和）** + バックエンド強化

- フロントエンドのバリデーションは「最低1つの指示（プロジェクトまたはタスク）があるか」のみチェック
- バックエンドで完全なチェックを実施（DB保存済み指示も含めて）

## 4. 実装ステップ

### Phase 1: フロントエンドのバリデーション修正

#### Step 1-1: TaskRegistrationTab.tsx のバリデーション修正
```typescript
// 修正前
const methodsWithoutInstructions: string[] = [];
for (const task of taskDetails) {
  const hasInstruction = pendingInstructions.some(
    inst => inst.methodId === task.methodId
  );
  if (!hasInstruction) {
    methodsWithoutInstructions.push(...);
  }
}

// 修正後
// プロジェクト指示またはタスク指示が最低1つ存在するかチェック
if (pendingInstructions.length === 0) {
  message.warning('プロジェクト指示またはタスク指示を最低1つ設定してください');
  return;
}
```

#### Step 1-2: リクエストデータの修正
```typescript
// 修正前
const instructionSaveItems: InstructionSaveItem[] = pendingInstructions.map(...);

// 修正後
// タスク指示のみを送信（プロジェクト指示は既にDB保存済み）
const instructionSaveItems: InstructionSaveItem[] = pendingInstructions
  .filter(inst => inst.methodId !== '') // methodIdが空でない指示のみ
  .map(inst => ({
    methodId: inst.methodId,
    content: inst.content,
    priority: inst.priority,
    type: inst.type,
    targetType: inst.targetType,
    transitionId: inst.transitionId || null,
    taskNumber: inst.taskNumber || null,
  }));
```

### Phase 2: バックエンドのバリデーション強化

#### Step 2-1: taskRegistrationService.ts の修正
```typescript
// 指示バリデーションを強化
// 1. リクエストの instructions 配列をチェック
// 2. DB保存済みのプロジェクト指示を取得
// 3. 両方を合わせて各メソッドに指示があるかチェック

// DB保存済みの指示を取得
const existingInstructions = await instructionRepository.findByProject(
  organizationId,
  project.project_id,
  client
);

// リクエストの指示 + DB保存済み指示を合わせてチェック
const allInstructions = [
  ...(requestData.instructions || []),
  ...existingInstructions.map(inst => ({
    methodId: inst.method_id || ''
  }))
];

// 各メソッドに最低1つの指示があるかチェック
const taskMethodIds = requestData.tasks.map(t => t.methodId);
const methodsWithoutInstructions: string[] = [];

for (const methodId of taskMethodIds) {
  // プロジェクト指示（methodId=""）またはタスク指示を確認
  const hasProjectInstruction = allInstructions.some(inst => inst.methodId === '');
  const hasTaskInstruction = allInstructions.some(inst => inst.methodId === methodId);
  
  if (!hasProjectInstruction && !hasTaskInstruction) {
    methodsWithoutInstructions.push(methodId);
  }
}

if (methodsWithoutInstructions.length > 0) {
  throw new Error(
    `The following methods have no instructions: ${methodsWithoutInstructions.join(', ')}`
  );
}
```

#### Step 2-2: instructionRepository.ts に検索メソッド追加
```typescript
/**
 * プロジェクトの全指示を取得
 * 
 * @param organizationId - 組織ID
 * @param projectId - プロジェクトID
 * @param client - PostgreSQLクライアント（トランザクション内）
 * @returns 指示一覧
 */
export async function findByProject(
  organizationId: string,
  projectId: string,
  client?: PoolClient
): Promise<Instruction[]> {
  const executor = client || getPool();
  
  const query = `
    SELECT * FROM instruction
    WHERE organization_id = $1
      AND project_id = $2
      AND instruction_status = 0
    ORDER BY create_at DESC
  `;
  
  const result = await executor.query(query, [organizationId, projectId]);
  return result.rows;
}
```

### Phase 3: プロジェクト指示の重複保存防止

#### Step 3-1: batchInsert メソッドの修正
```typescript
// 修正前
export async function batchInsert(
  client: PoolClient,
  organizationId: string,
  projectId: string,
  userId: string,
  instructions: InstructionSaveItem[]
): Promise<void> {
  for (const instruction of instructions) {
    await insert(/* ... */);
  }
}

// 修正後
export async function batchInsert(
  client: PoolClient,
  organizationId: string,
  projectId: string,
  userId: string,
  instructions: InstructionSaveItem[]
): Promise<void> {
  // プロジェクト指示（methodId=""）は既にDB保存済みなのでスキップ
  const taskInstructions = instructions.filter(inst => inst.methodId !== '');
  
  for (const instruction of taskInstructions) {
    await insert(/* ... */);
  }
}
```

## 5. 影響範囲

### 変更するファイル
1. `frontend/src/components/project/TaskRegistrationTab.tsx` - バリデーションロジック修正
2. `backend/src/services/taskRegistrationService.ts` - バリデーション強化
3. `backend/src/repositories/instructionRepository.ts` - findByProject メソッド追加

### 新規作成するファイル
なし

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| プロジェクト指示の重複保存 | 中 | 中 | batchInsertでプロジェクト指示をフィルタリング |
| バリデーション緩和による品質低下 | 低 | 低 | バックエンドで厳密にチェック |
| 既存の保存済みタスクへの影響 | 低 | 低 | トランザクション管理で対応 |

## 7. テスト計画

### ユニットテスト
- [ ] フロントエンド: pendingInstructions が空の場合のバリデーション
- [ ] バックエンド: DB保存済み指示を含めたバリデーション
- [ ] バックエンド: プロジェクト指示のフィルタリング

### 統合テスト
- [ ] プロジェクト指示のみ追加 → タスク保存成功
- [ ] タスク指示のみ追加 → タスク保存成功
- [ ] プロジェクト指示 + タスク指示 → タスク保存成功
- [ ] 指示なし → タスク保存失敗
- [ ] プロジェクト指示の重複保存がないことを確認

### 手動テスト
- [ ] プロジェクト指示ボタンで指示追加
- [ ] タスク登録タブで保存ボタン押下
- [ ] エラーメッセージが表示されないことを確認
- [ ] DBに指示が重複保存されていないことを確認

## 8. 実装の補足説明

### Q1: プロジェクト指示はなぜ即時DB保存されるのか？

**理由:**
- プロジェクト指示は全メソッドに共通の指示
- タスク登録の保存とは独立して管理される
- ユーザーが「プロジェクト指示」ボタンから追加した時点で確定情報とみなす

### Q2: タスク指示はなぜState管理なのか？

**理由:**
- タスク指示は各メソッドに紐づく指示
- タスク登録情報（メソッド、試行回数など）とセットで保存される
- タスク登録全体の保存タイミングでまとめてDB保存

### Q3: プロジェクト指示の重複保存を防ぐ必要があるのか？

**回答: はい、必要です**

プロジェクト指示は `handleProjectInstructionSave` で即時DB保存されます：
```typescript
await saveInstruction(projectName, instructionRequest);
```

その後、タスク保存時に `pendingInstructions` に含まれていると、`batchInsert` で再度INSERTされてしまいます。

**対策:**
- `pendingInstructions` にはプロジェクト指示を含めない（既に実装済み）
- `batchInsert` でもプロジェクト指示（`methodId === ''`）をフィルタリング（念のため二重防止）

### Q4: バリデーションロジックの変更点まとめ

**変更前:**
```
各メソッドに最低1つのタスク指示が必要
→ プロジェクト指示のみでは保存できない
```

**変更後:**
```
プロジェクト指示 または タスク指示が最低1つあればOK
→ プロジェクト指示のみでも保存可能
→ バックエンドで詳細チェック（DB保存済み指示を含む）
```

## 9. 承認記録

- **計画書提示日時**: 2026-03-05 11:36
- **承認日時**: （承認後記入）
- **承認者コメント**: （承認後記入）

## 10. 実施記録

### 実施日時
開始: （作業開始時記入）
完了: （作業完了時記入）

### 最終的な成果物
- [ ] フロントエンドバリデーション修正
- [ ] バックエンドバリデーション強化
- [ ] プロジェクト指示重複防止
- [ ] テスト完了
