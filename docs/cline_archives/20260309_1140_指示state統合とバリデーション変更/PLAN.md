# タスク計画書: 指示state統合とバリデーション変更

## メタデータ
- **作成日時**: 2026-03-09 11:40
- **タスクID**: instruction_state_refactor
- **優先度**: 中
- **推定工数**: 1.5時間

## 1. タスク概要

タスク登録タブの指示管理を以下のように変更します：

1. **state統合**: `pendingInstructions`と`existingInstructions`を1つのstateに統合
2. **バリデーション変更**: `instruction_status=0`（未送信）のデータが存在するかチェック

## 2. 目的と期待される成果

### 目的
- 指示データの管理を簡素化し、state管理を統一する
- バリデーションロジックをより明確にする

### 期待される成果
- [ ] pendingInstructionsとexistingInstructionsを1つのstate（`instructions`）に統合
- [ ] APIから取得した指示データをそのまま保持（instruction_statusを含む）
- [ ] バリデーション：`instruction_status=0`のデータが1件以上存在するかチェック
- [ ] 新規追加された指示も`instruction_status=0`として統合stateに追加

## 3. 実装ステップ

### Phase 1: 型定義の確認
- [ ] InstructionData型に`instruction_status`フィールドが存在するか確認
- [ ] 存在しない場合は型定義を追加

### Phase 2: state統合
- [ ] `pendingInstructions`と`existingInstructions`を削除
- [ ] 新しい`instructions` stateを追加
- [ ] APIから取得した指示データを`instructions`に保存
- [ ] 新規追加時も`instructions`に追加（instruction_status=0として）

### Phase 3: バリデーション変更
- [ ] `handleSave`関数のバリデーションを修正
- [ ] `instructions.filter(inst => inst.instruction_status === 0).length > 0`でチェック

### Phase 4: 指示追加処理の修正
- [ ] `handleInstructionSave`で新規指示を`instructions`に追加
- [ ] `instruction_status=0`を明示的に設定

### Phase 5: 保存処理の修正
- [ ] `instruction_status=0`の指示のみをフィルタリングしてAPIに送信

### Phase 6: テスト
- [ ] 指示が0件の状態でバリデーション確認
- [ ] instruction_status=1（送信済）のみの状態でバリデーション確認
- [ ] instruction_status=0が存在する状態で保存成功を確認

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/types/instructionRegistration.ts`（または該当の型定義ファイル）
   - InstructionData型に`instruction_status`フィールドを追加（存在しない場合）

2. `frontend/src/components/project/TaskRegistrationTab.tsx`
   - state定義を変更（統合）
   - バリデーションロジックを変更
   - 指示追加処理を変更
   - 保存処理を変更

### 使用する既存API
1. `getInstructions(projectName)` - 指示一覧取得（instruction_statusを含む）

## 5. 技術的詳細

### 新しいstate構造
```typescript
// 変更前
const [pendingInstructions, setPendingInstructions] = useState<InstructionData[]>([]);
const [existingInstructions, setExistingInstructions] = useState<InstructionData[]>([]);

// 変更後
const [instructions, setInstructions] = useState<InstructionData[]>([]);
```

### InstructionData型（想定）
```typescript
export interface InstructionData {
  id: string | number;
  content: string;
  priority: number;
  type: number;
  targetType: number;
  methodId: string;
  transitionId: string;
  taskNumber?: number;
  instruction_status?: number; // 0: 未送信, 1: 送信済
  isSent?: boolean; // 後方互換性のため残す可能性
}
```

### バリデーションロジック
```typescript
// 変更前
const totalInstructions = pendingInstructions.length + existingInstructions.length;
if (totalInstructions === 0) {
  message.error('プロジェクト指示またはタスク指示を最低1つ設定してください');
  return;
}

// 変更後
const unsent

Instructions = instructions.filter(inst => inst.instruction_status === 0);
if (unsentInstructions.length === 0) {
  message.error('プロジェクト指示またはタスク指示を最低1つ設定してください');
  return;
}
```

### データフロー
```
1. タブアクティブ
   ↓
2. Promise.all([getTaskRegistration(), getInstructions()])
   ↓
3. setInstructions(instructionsData) ← instruction_statusを含む
   ↓
4. ユーザーが指示を追加
   ↓
5. setInstructions([...instructions, { ...newInstruction, instruction_status: 0 }])
   ↓
6. 保存ボタン押下
   ↓
7. FEチェック: instructions.filter(inst => inst.instruction_status === 0).length > 0
   ↓
8-a. 0件 → エラーメッセージ表示、処理中断
8-b. 1件以上 → 未送信指示のみをフィルタリングしてAPI呼び出し
   ↓
9. 保存成功
```

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| instruction_statusフィールドが存在しない | 高 | 中 | APIレスポンスを確認し、型定義を追加 |
| 既存の指示追加ダイアログとの互換性 | 中 | 低 | instruction_status=0をデフォルト値として設定 |
| 保存後のstate更新 | 中 | 中 | 保存成功後にgetInstructions()で再取得 |

## 7. テスト計画

### 手動テスト
- [ ] 指示0件の状態で保存ボタンを押下 → エラーメッセージ表示
- [ ] instruction_status=1（送信済）のみの状態で保存ボタンを押下 → エラーメッセージ表示
- [ ] instruction_status=0の指示を追加して保存 → 保存成功
- [ ] DB保存済みの未送信指示（instruction_status=0）がある状態で保存 → 保存成功
- [ ] タブを切り替えて再度開く → 指示データが再取得される

### 確認項目
- [ ] APIから取得した指示にinstruction_statusが含まれているか
- [ ] 新規追加された指示にinstruction_status=0が設定されているか
- [ ] バリデーションが正しく動作するか
- [ ] 送信済み指示が保存処理から除外されるか

## 8. ロールバック計画

問題が発生した場合は、以下の手順でロールバック：

1. `instructions` stateを削除
2. `pendingInstructions`と`existingInstructions`を復元
3. バリデーションロジックを元に戻す

## 9. 関連ドキュメント

- [前回のタスク計画書](../20260309_0955_タスク保存指示チェックFE実装/PLAN.md)
- [instruction_statusフィールド追加マイグレーション](../../backend/migrations/20260224_add_instruction_status.sql)
- [タスク実行ワークフロー](.clinerules/core/workflow.md)

## 10. 承認記録

- **計画書提示日時**: 2026-03-09 11:40
- **承認日時**: （承認待ち）
- **承認者コメント**: （承認後記入）

## 11. 実施記録

### 実施日時
開始: （承認後記入）
完了: （実施後記入）

### 計画からの変更点
（実施中に発生した変更を記録）

### 発生した問題と解決方法
（実施中に発生した問題を記録）

### 最終的な成果物
- [ ] `InstructionData`型定義更新
- [ ] `TaskRegistrationTab.tsx` - state統合とバリデーション変更
- [ ] 手動テスト完了
- [ ] 動作確認完了

## 12. 振り返り

### うまくいった点
（実施後記入）

### 改善が必要な点
（実施後記入）

### 学んだこと
（実施後記入）
