# タスク計画書: タスク登録タブ保存ボタンバリデーション修正

## メタデータ
- **作成日時**: 2026-03-09 13:46
- **タスクID**: task-validation-fix
- **優先度**: 高
- **推定工数**: 1時間

## 1. タスク概要

タスク登録タブの保存ボタンで、`instruction_status=0`の指示が存在するにもかかわらず「プロジェクト指示またはタスク指示を最低1つ設定してください」というバリデーションエラーが発生し、保存ができない問題を修正します。

## 2. 目的と期待される成果

### 目的
チェックされたメソッドに対応する未送信指示（`instruction_status=0`）が存在する場合に、正常に保存が完了できるようにする。

### 期待される成果
- [x] 問題の根本原因を特定
- [ ] バリデーションロジックを修正
- [ ] 適切なエラーメッセージを表示
- [ ] 保存処理が正常に動作することを確認

## 3. 現状の問題分析

### ユーザーから報告された実際の問題フロー

1. **プロジェクト指示設定**（instruction_status=0）
2. **タスク情報を保存（成功）**
3. **メソッドの順序を変更**
4. **タスク情報を保存しようとする** → 「指示が設定されていない」警告が出力される

### 開発者ツールのログから判明した事実

タスク登録タブ表示時のログ：
```
[DEBUG] TaskRegistrationTab - Instructions loaded: 
{instructionCount: 1, unsentCount: 0}
```

- `instructionCount: 1` → 指示は1件存在している
- `unsentCount: 0` → しかし、`instruction_status=0`の未送信指示は0件

### 根本原因を特定（Backend/Frontendの型不一致）

**Backend側（projectInstructionService.ts）:**
```typescript
const instructionData: InstructionData[] = instructions.map(inst => ({
  id: inst.experiment_instruction_id || '',
  content: inst.instructions || '',
  priority: inst.priority ?? 1,
  type: inst.type ?? 0,
  methodId: inst.method_id || '',
  transitionId: inst.transition_id || '',
  taskNumber: inst.task_no ?? undefined,
  isSent: inst.instruction_status === 1  // ★ isSentのみ返している
  // instruction_statusプロパティが存在しない！
}));
```

**Frontend側（TaskRegistrationTab.tsx）:**
```typescript
// 指示存在チェック（FE）- instruction_status=0の指示が存在するかチェック
const unsentInstructions = instructions.filter(inst => inst.instruction_status === 0);
```

**問題点:**
- **Backend**: `isSent: boolean`プロパティのみを返す
- **Frontend**: `instruction_status: number`プロパティを期待している
- **結果**: `instruction_status`プロパティが`undefined`となり、フィルタリングで0件になる

### コード上の問題箇所

**Backend（projectInstructionService.ts）:**
```typescript
// getInstructions関数のレスポンス生成部分
const instructionData: InstructionData[] = instructions.map(inst => ({
  id: inst.experiment_instruction_id || '',
  content: inst.instructions || '',
  priority: inst.priority ?? 1,
  type: inst.type ?? 0,
  methodId: inst.method_id || '',
  transitionId: inst.transition_id || '',
  taskNumber: inst.task_no ?? undefined,
  isSent: inst.instruction_status === 1  // ★ 問題: instruction_statusプロパティがない
}));
```

**Frontend（TaskRegistrationTab.tsx）:**
```typescript
// 指示存在チェック（FE）- instruction_status=0の指示が存在するかチェック
const unsentInstructions = instructions.filter(inst => inst.instruction_status === 0);
// ★ instruction_statusプロパティが存在しないため、常に0件になる

if (unsentInstructions.length === 0) {
  message.warning('プロジェクト指示またはタスク指示を最低1つ設定してください');
  return;
}
```

**問題の流れ:**
1. Backend: DBから取得した`instruction_status=0`の指示を`isSent: false`に変換して返す
2. Frontend: `instruction_status`プロパティを期待してフィルタリング
3. `instruction_status`が`undefined`のため、`inst.instruction_status === 0`が常に`false`
4. `unsentInstructions.length === 0`となり、バリデーションエラー

## 4. 修正方針

### 修正内容

**Backend側で`instruction_status`プロパティをレスポンスに追加します：**

```typescript
// backend/src/services/projectInstructionService.ts
const instructionData: InstructionData[] = instructions.map(inst => ({
  id: inst.experiment_instruction_id || '',
  content: inst.instructions || '',
  priority: inst.priority ?? 1,
  type: inst.type ?? 0,
  methodId: inst.method_id || '',
  transitionId: inst.transition_id || '',
  taskNumber: inst.task_no ?? undefined,
  isSent: inst.instruction_status === 1,
  instruction_status: inst.instruction_status ?? 0  // ★ これを追加
}));
```

### 修正の根拠

1. **Backend/Frontend間の型整合性を確保**
   - Frontendは`instruction_status: number`を期待
   - Backendは`isSent: boolean`のみ返していた
   - 両方を返すことで互換性を確保

2. **既存コードへの影響最小化**
   - `isSent`プロパティは残す（他の箇所で使用している可能性）
   - `instruction_status`を追加するのみ

### メリット
- Backend側の1行追加のみで解決（最小限の変更）
- Frontend側は変更不要
- 型定義も変更不要（InstructionData型に`instruction_status`は既に定義済み）
- 指示送信タブなど他の機能への影響なし

## 5. 実装ステップ

### Phase 1: Backend修正
- [ ] `backend/src/services/projectInstructionService.ts`の`getInstructions`関数を修正
- [ ] レスポンスに`instruction_status`プロパティを追加（1行追加）

### Phase 2: 動作確認
- [ ] 各シナリオでの動作を確認
  - シナリオ1: 初回保存 - プロジェクト指示あり（正常系）
  - シナリオ2: 2回目の保存 - メソッド順序変更（正常系）★今回の問題
  - シナリオ3: 初回保存 - 指示なし（異常系）

## 6. 影響範囲

### 変更するファイル
1. `backend/src/services/projectInstructionService.ts`
   - `getInstructions`関数のレスポンス生成部分（1行追加）

### 影響を受ける機能
- タスク登録タブの指示チェック（修正対象）
- 指示送信タブ（影響なし - `isSent`プロパティを使用）

### 破壊的変更
なし（プロパティを追加するのみ、既存プロパティは削除しない）

## 7. 技術的詳細

### 修正前のコード（Backend）

```typescript
// backend/src/services/projectInstructionService.ts
export async function getInstructions(
  organizationId: string,
  projectId: string
): Promise<InstructionData[]> {
  const instructions = await projectInstructionRepository.findByProject(
    organizationId,
    projectId
  );
  
  // DB型から画面型に変換
  const instructionData: InstructionData[] = instructions.map(inst => ({
    id: inst.experiment_instruction_id || '',
    content: inst.instructions || '',
    priority: inst.priority ?? 1,
    type: inst.type ?? 0,
    methodId: inst.method_id || '',
    transitionId: inst.transition_id || '',
    taskNumber: inst.task_no ?? undefined,
    isSent: inst.instruction_status === 1  // ★ instruction_statusプロパティがない
  }));
  
  return instructionData;
}
```

**問題**:
- `instruction_status`プロパティが存在しない
- Frontendで`inst.instruction_status === 0`が常に`false`になる

### 修正後のコード（Backend）

```typescript
// backend/src/services/projectInstructionService.ts
export async function getInstructions(
  organizationId: string,
  projectId: string
): Promise<InstructionData[]> {
  const instructions = await projectInstructionRepository.findByProject(
    organizationId,
    projectId
  );
  
  // DB型から画面型に変換
  const instructionData: InstructionData[] = instructions.map(inst => ({
    id: inst.experiment_instruction_id || '',
    content: inst.instructions || '',
    priority: inst.priority ?? 1,
    type: inst.type ?? 0,
    methodId: inst.method_id || '',
    transitionId: inst.transition_id || '',
    taskNumber: inst.task_no ?? undefined,
    isSent: inst.instruction_status === 1,
    instruction_status: inst.instruction_status ?? 0  // ★ 追加
  }));
  
  return instructionData;
}
```

**改善点**:
- `instruction_status`プロパティを追加
- Frontendの`inst.instruction_status === 0`が正しく動作するようになる
- `isSent`も残すことで既存機能への影響を最小化

## 8. テストシナリオ

### シナリオ1: プロジェクト指示のみ存在（正常系）
**前提条件**:
- メソッドA、Bが存在
- プロジェクト指示（methodId=""）が1件存在、instruction_status=0
- メソッドBのみをチェック

**期待結果**:
- ✅ 保存成功（プロジェクト指示は全メソッド対象）

### シナリオ2: チェックされたメソッドの指示あり（正常系）
**前提条件**:
- メソッドA、Bが存在
- メソッドAの指示が1件存在、instruction_status=0
- メソッドBの指示が1件存在、instruction_status=0
- メソッドBのみをチェック

**期待結果**:
- ✅ 保存成功（メソッドBの指示が保存される）

### シナリオ3: チェックされていないメソッドの指示のみ（異常系）
**前提条件**:
- メソッドA、Bが存在
- メソッドAの指示が1件存在、instruction_status=0
- メソッドBのみをチェック

**期待結果**:
- ❌ バリデーションエラー「選択されたメソッドに対するプロジェクト指示またはタスク指示を設定してください」

### シナリオ4: 指示が全く存在しない（異常系）
**前提条件**:
- メソッドA、Bが存在
- 指示が1件も存在しない
- メソッドBをチェック

**期待結果**:
- ❌ バリデーションエラー「選択されたメソッドに対するプロジェクト指示またはタスク指示を設定してください」

## 9. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 既存の保存処理に影響 | 中 | 低 | バリデーションロジックのみ変更、保存処理は変更しない |
| エラーメッセージが分かりにくい | 低 | 低 | 具体的なメッセージに変更済み |
| 想定外のケースがある | 中 | 低 | 複数シナリオでテストを実施 |

## 10. 関連ドキュメント

- `docs/20260309_1140_指示state統合とバリデーション変更/PLAN.md` - 前回の関連修正
- `docs/20260306_1659_タスク保存バリデーション変更/PLAN.md` - 以前のバリデーション修正

## 11. 承認記録

- **計画書提示日時**: 2026-03-09 13:46
- **承認日時**: 2026-03-09 15:03
- **承認者コメント**: 承認（修正実施）

## 12. 実施記録

### 実施日時
- **開始**: 2026-03-09 15:03
- **完了**: 2026-03-09 15:03

### 実施内容

**変更ファイル:**
- `backend/src/services/projectInstructionService.ts`

**変更箇所:**
```typescript
// getInstructions関数内のDB型→画面型変換部分
const instructionData: InstructionData[] = instructions.map(inst => ({
  id: inst.experiment_instruction_id || '',
  content: inst.instructions || '',
  priority: inst.priority ?? 1,
  type: inst.type ?? 0,
  methodId: inst.method_id || '',
  transitionId: inst.transition_id || '',
  taskNumber: inst.task_no ?? undefined,
  isSent: inst.instruction_status === 1,
  instruction_status: inst.instruction_status ?? 0  // ★ 追加（1行）
}));
```

### 計画からの変更点

なし（計画通りに実施）

### 発生した問題と解決方法

問題なし（計画通りに修正完了）

### 最終的な成果物
- [x] Backend修正完了（`instruction_status`プロパティ追加）
- [ ] 動作確認（ユーザーによる確認待ち）

### 動作確認手順

以下の手順で動作確認をお願いします：

1. **バックエンドを再起動**
   ```bash
   # Dockerの場合
   docker restart mmdpf-backend-1
   
   # または
   docker-compose restart backend
   ```

2. **フロントエンドでブラウザをリロード**
   - ブラウザのキャッシュをクリア（Ctrl+Shift+R または Cmd+Shift+R）

3. **動作確認**
   - プロジェクト指示を設定
   - タスク情報を保存（1回目）
   - メソッドの順序を変更
   - タスク情報を保存（2回目）★ここでエラーが出ないことを確認

4. **開発者ツールで確認**
   - F12キーで開発者ツールを開く
   - Consoleタブで以下のログを確認：
   ```
   [DEBUG] TaskRegistrationTab - Instructions loaded: 
   {instructionCount: 1, unsentCount: 1}
   ```
   - `unsentCount: 1`になっていることを確認（以前は0だった）

### 期待される動作

- ✅ プロジェクト指示設定後、1回目の保存が成功
- ✅ メソッド順序変更後、2回目の保存が成功（エラーが出ない）
- ✅ 開発者ツールで`unsentCount`が正しくカウントされる
