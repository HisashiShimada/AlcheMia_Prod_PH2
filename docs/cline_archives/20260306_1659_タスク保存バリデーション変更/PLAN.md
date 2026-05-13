# タスク計画書: タスク保存時のバリデーション変更

## メタデータ
- **作成日時**: 2026-03-06 16:59
- **タスクID**: task_save_validation_change
- **優先度**: 高
- **推定工数**: 2時間

## 1. タスク概要

プロジェクト管理画面のタスク情報保存ボタン押下時のバリデーションを変更します。

**現在の仕様:**
- 各メソッドに対して、最低1つの指示が必要

**変更後の仕様:**
- 複数件のメソッドの中で、以下のいずれかを満たせば保存可能
  - プロジェクト指示（methodId = ""）が1つ以上存在する
  - いずれかのメソッドに対して追加指示（methodId != ""）が1つ以上存在する
- **重要**: 初回保存時も2回目以降も同じバリデーションを適用

## 2. 目的と期待される成果

### 目的
- プロジェクト指示のみが設定されている場合でもタスクを保存できるようにする
- より柔軟な指示登録フローを実現する

### 期待される成果
- [ ] フロントエンドのバリデーションロジックを変更
  - [ ] プロジェクト指示またはタスク指示の存在チェック
  - [ ] DB保存済みの指示も考慮したバリデーション
- [ ] バックエンドのバリデーションロジックを変更
  - [ ] プロジェクト指示またはタスク指示の存在チェック
  - [ ] DB保存済みの指示も考慮したバリデーション
- [ ] エラーメッセージを適切に修正
- [ ] 両方のバリデーションが一貫性を持つ

## 3. 現状の問題点

### 問題1: 各メソッドに指示が必要
**現状のロジック:**
```typescript
// フロントエンド (TaskRegistrationTab.tsx: 378-393)
const methodsWithoutInstructions: string[] = [];
for (const task of checkedTasks) {
  const hasInstruction = pendingInstructions.some(
    inst => inst.methodId === task.methodId
  );
  
  if (!hasInstruction) {
    const method = availableMethods.find(m => m.id === task.methodId);
    methodsWithoutInstructions.push(method?.displayName || task.methodId);
  }
}

if (methodsWithoutInstructions.length > 0) {
  message.error(
    `以下のメソッドには指示が設定されていません: ${methodsWithoutInstructions.join(', ')}`
  );
  return;
}
```

**問題点:**
- プロジェクト指示（methodId = ""）が設定されている場合も、各メソッドに個別の指示がないとエラーになる
- プロジェクト指示は全メソッドに共通の指示であるため、各メソッドに個別指示は不要なはず

### 問題2: バックエンドも同様の制約
**現状のロジック:**
```typescript
// バックエンド (taskRegistrationService.ts: 105-121)
if (requestData.instructions) {
  const taskMethodIds = requestData.tasks.map(t => t.methodId);
  const methodsWithoutInstructions: string[] = [];
  
  for (const methodId of taskMethodIds) {
    const hasInstruction = requestData.instructions.some(
      inst => inst.methodId === methodId
    );
    
    if (!hasInstruction) {
      methodsWithoutInstructions.push(methodId);
    }
  }
  
  if (methodsWithoutInstructions.length > 0) {
    throw new Error(
      `The following methods have no instructions: ${methodsWithoutInstructions.join(', ')}`
    );
  }
}
```

**問題点:**
- フロントエンドと同じ制約がバックエンドにも存在
- プロジェクト指示を考慮していない

## 4. 解決方針

### バリデーションルールの変更
**変更前:**
```
各チェックされたメソッドに対して、必ず1つ以上の指示が必要
→ method1に指示、method2に指示、method3に指示... （すべて必須）
```

**変更後:**
```
以下のいずれかを満たせばOK:
1. プロジェクト指示（methodId = ""）が1つ以上存在する（DB保存済みを含む）
   → 全メソッドに共通の指示とみなす
2. いずれかのメソッドに追加指示（methodId != ""）が1つ以上存在する（DB保存済みを含む）
   → 少なくとも1つのメソッドに指示がある

【重要】初回保存時も2回目以降も同じバリデーションを適用
→ ただし、DB保存済みの指示も考慮する必要がある
```

### 実装方針
1. **フロントエンド**: 
   - 指示のバリデーションは実施しない
   - 理由: DB保存済みの指示を取得するコストが高く、最終判定はバックエンドで行うため
   - **重要**: 現在のバリデーションロジック（行378-393）を削除する
   
2. **バックエンド**: 
   - `requestData.instructions`（今回送信された指示）の内容をチェック
   - DB保存済みのプロジェクト指示・タスク指示を取得
   - **両方を合わせて**以下をチェック
     - プロジェクト指示（methodId = ""）が1つ以上存在するか
     - または、タスク指示（methodId != ""）が1つ以上存在するか
   - 初回も2回目以降も同じバリデーションを適用

## 5. 実装ステップ

### Phase 1: フロントエンドのバリデーション変更

#### Step 1-1: TaskRegistrationTab.tsx のバリデーションロジック削除
```typescript
// 変更前（行378-393）
const methodsWithoutInstructions: string[] = [];
for (const task of checkedTasks) {
  const hasInstruction = pendingInstructions.some(
    inst => inst.methodId === task.methodId
  );
  
  if (!hasInstruction) {
    const method = availableMethods.find(m => m.id === task.methodId);
    methodsWithoutInstructions.push(method?.displayName || task.methodId);
  }
}

if (methodsWithoutInstructions.length > 0) {
  message.error(
    `以下のメソッドには指示が設定されていません: ${methodsWithoutInstructions.join(', ')}`
  );
  return;
}

// 変更後
// 指示のバリデーションを削除
// 理由: DB保存済みの指示があるかどうかをフロントエンドで判定できないため、
//       バックエンドで最終的な判定を行う
// （この部分のコードを削除）
```

**注**: 
- フロントエンドでは指示のバリデーションを行いません
- DB保存済みの指示も含めた判定はバックエンドで実施
- 2回目以降の保存時（指示追加なし）もエラーにならないようにする

### Phase 2: バックエンドのバリデーション変更

#### Step 2-1: instructionRepository.ts に指示取得メソッドを追加

プロジェクトに紐づく全指示を取得するメソッドを追加します。

```typescript
/**
 * プロジェクトの全指示を取得（プロジェクト指示 + タスク指示）
 * 
 * @param organizationId - 組織ID
 * @param projectId - プロジェクトID
 * @returns 指示一覧
 */
export async function findByProject(
  organizationId: string,
  projectId: string
): Promise<Instruction[]> {
  const pool = getPool();
  
  const query = `
    SELECT * FROM instruction
    WHERE organization_id = $1
      AND project_id = $2
      AND instruction_status = 0
    ORDER BY create_at DESC
  `;
  
  const result = await pool.query(query, [organizationId, projectId]);
  return result.rows;
}
```

#### Step 2-2: taskRegistrationService.ts のバリデーションロジック修正

```typescript
// 変更前（行105-121）
if (requestData.instructions) {
  const taskMethodIds = requestData.tasks.map(t => t.methodId);
  const methodsWithoutInstructions: string[] = [];
  
  for (const methodId of taskMethodIds) {
    const hasInstruction = requestData.instructions.some(
      inst => inst.methodId === methodId
    );
    
    if (!hasInstruction) {
      methodsWithoutInstructions.push(methodId);
    }
  }
  
  if (methodsWithoutInstructions.length > 0) {
    throw new Error(
      `The following methods have no instructions: ${methodsWithoutInstructions.join(', ')}`
    );
  }
}

// 変更後（バリデーションロジックの位置: 行105-121）
// DB保存済みのプロジェクト指示・タスク指示を取得
const existingInstructions = await instructionRepository.findByProject(
  organizationId,
  project.project_id
);

// 今回送信された指示 + DB保存済み指示を合わせてチェック
const allInstructions = [
  ...(requestData.instructions || []),
  ...existingInstructions.map(inst => ({
    methodId: inst.method_id || ''
  }))
];

// バリデーション：プロジェクト指示またはタスク指示が最低1つ存在するか
const hasProjectInstruction = allInstructions.some(inst => inst.methodId === '');
const hasTaskInstruction = allInstructions.some(inst => inst.methodId !== '');

if (!hasProjectInstruction && !hasTaskInstruction) {
  throw new Error('At least one project instruction or task instruction is required');
}
```

**注**: DB保存済みの指示も含めて判定するため、`instructionRepository.findByProject`を追加実装します。

## 6. 影響範囲

### 変更するファイル
1. `frontend/src/components/project/TaskRegistrationTab.tsx`
   - handleSave関数内のバリデーションロジック（行378-393）
   - `pendingInstructions`のみをチェック（DB保存済み指示は考慮しない）
   
2. `backend/src/repositories/instructionRepository.ts`
   - `findByProject`メソッドを追加（プロジェクト全体の指示を取得）
   
3. `backend/src/services/taskRegistrationService.ts`
   - saveTaskRegistration関数内のバリデーションロジック（行105-121）
   - DB保存済み指示 + 今回送信された指示を合わせてバリデーション

### 新規作成するファイル
なし

### 影響を受ける機能
- プロジェクト管理画面のタスク登録タブ
  - タスク保存ボタン押下時の処理
  - エラーメッセージ表示

## 7. 技術的詳細

### フロントエンドとバックエンドのバリデーションの違い

**フロントエンド:**
- 指示のバリデーションは実施しない
- 理由: DB保存済みの指示を考慮できないため、誤ったエラーを表示する可能性がある
- 例: 2回目の保存時（指示追加なし）に、DB保存済み指示があるにも関わらずエラーになる

**バックエンド:**
- `requestData.instructions`（今回送信された指示）をチェック
- DB保存済みの指示も取得して合わせてチェック
- 両方を合わせて最低1つの指示が存在するか判定
- 理由: DB保存済み指示も含めた完全なバリデーションを実施
- エラー時は適切なメッセージを返す

### プロジェクト指示とタスク指示の違い

**プロジェクト指示（methodId = ""）:**
- 全メソッドに共通の指示
- 「プロジェクト指示」ボタンから登録
- 即時DB保存される
- `pendingInstructions`には含まれるが、`saveMode="local"`のため即時保存される

**タスク指示（methodId != ""）:**
- 特定メソッドに紐づく指示
- 「指示追加」ボタンから登録
- `pendingInstructions` Stateで管理
- タスク保存時にまとめてDB保存される

### バリデーションのタイミング

1. **フロントエンド**: 保存ボタン押下時
   - 指示のバリデーションは実施しない
   - 他のバリデーション（メソッド選択、試行回数等）のみ実施
   - API呼び出しを実行

2. **バックエンド**: API受信時
   - `instructionRepository.findByProject`でDB保存済み指示を取得
   - 今回送信された指示 + DB保存済み指示を合わせてチェック
   - プロジェクト指示 OR タスク指示が最低1つ存在するか判定
   - エラーがあればトランザクション開始前に中断し、適切なエラーメッセージを返す

## 8. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| プロジェクト指示のみで保存した場合の動作確認不足 | 中 | 中 | テスト計画で網羅的にテスト |
| DB保存済み指示の取得パフォーマンス影響 | 中 | 低 | バリデーション前に1回だけ取得 |
| エラーメッセージが不適切 | 低 | 低 | ユーザーフレンドリーなメッセージに変更 |
| バックエンドのバリデーション漏れ | 高 | 低 | フロントエンドとバックエンド両方で実装 |
| フロントエンドとバックエンドの判定が不一致 | 中 | 中 | バックエンドを最終判定とする |

## 9. テスト計画

### ユニットテスト
- [ ] フロントエンド: バリデーションロジック削除の確認
- [ ] バックエンド: 新規指示のみの場合のバリデーション
- [ ] バックエンド: DB保存済み指示のみの場合のバリデーション
- [ ] バックエンド: 新規 + DB保存済み指示の場合のバリデーション
- [ ] バックエンド: 指示が全くない場合のバリデーション（エラー）
- [ ] バックエンド: プロジェクト指示のみの場合のバリデーション
- [ ] バックエンド: タスク指示のみの場合のバリデーション

### 統合テスト
- [ ] 初回保存: プロジェクト指示のみ追加 → タスク保存成功
- [ ] 初回保存: タスク指示のみ追加 → タスク保存成功
- [ ] 初回保存: プロジェクト指示 + タスク指示 → タスク保存成功
- [ ] 初回保存: 指示なし → タスク保存失敗（エラーメッセージ確認）
- [ ] 2回目: DB保存済み指示あり + 新規指示なし → タスク保存成功
- [ ] 2回目: DB保存済み指示あり + 新規指示追加 → タスク保存成功
- [ ] 2回目: DB保存済み指示削除後、新規指示なし → タスク保存失敗

### 手動テスト
- [ ] 初回保存: プロジェクト指示ボタンで指示追加 → 保存成功
- [ ] 初回保存: 特定メソッドに指示追加ボタンで指示追加 → 保存成功
- [ ] 初回保存: 指示なしで保存ボタン押下 → エラーメッセージ確認
- [ ] 2回目: DB保存済み指示あり、新規指示なし、作業順序のみ変更 → 保存成功
- [ ] 2回目: DB保存済み指示あり、新規指示なし、試行回数のみ変更 → 保存成功
- [ ] 2回目: すべての指示を削除後、新規指示なし → 保存失敗確認
- [ ] エラーメッセージが日本語で適切に表示されるか確認

## 10. ロールバック計画

### ロールバック手順
1. Gitで変更前のコミットに戻す
2. フロントエンド・バックエンドを再ビルド
3. 動作確認

### ロールバック判定基準
- 保存が正常に動作しない場合
- 想定外のバリデーションエラーが発生する場合
- 既存の保存済みタスクに影響が出る場合

## 11. 承認記録

- **計画書提示日時**: 2026-03-06 16:59
- **承認日時**: （承認後記入）
- **承認者コメント**: （承認後記入）

## 12. 実施記録

### 実施日時
開始: 2026-03-06 21:22
完了: 2026-03-06 21:26

### 計画からの変更点
**重要な発見:**
計画書では「フロントエンドのバリデーションを削除」としていましたが、実際の問題は**プロジェクト指示がバックエンドに送信されていない**ことでした。

**実施した変更:**
- フロントエンド：プロジェクト指示（`methodId === ""`）も含めて送信するように修正
- バックエンド：既に正しく実装されていたため変更なし

### 発生した問題と解決方法
**問題:**
1回目の保存時、プロジェクト指示を追加してもバリデーションエラーが発生する。

**原因:**
フロントエンドの`handleSave`関数で、チェックされたメソッドの指示のみをフィルタリングしていたため、プロジェクト指示（`methodId === ""`）が除外されていました。

```typescript
// 修正前（問題のコード）
const checkedInstructions = pendingInstructions.filter(inst =>
  checkedMethodIds.has(inst.methodId)  // プロジェクト指示（""）は除外される
);
```

**解決方法:**
プロジェクト指示も含めるように条件を修正：

```typescript
// 修正後
const checkedInstructions = pendingInstructions.filter(inst =>
  inst.methodId === '' || checkedMethodIds.has(inst.methodId)
);
```

### 最終的な成果物
- [x] フロントエンド修正完了（プロジェクト指示の送信）
- [x] バックエンドは既に正しく実装済み
- [ ] 動作確認（ユーザー確認待ち）
- [x] ドキュメント更新
