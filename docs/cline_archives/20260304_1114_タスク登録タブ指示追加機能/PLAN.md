# タスク計画書: タスク登録タブ指示追加機能

## メタデータ
- **作成日時**: 2026-03-04 11:14
- **タスクID**: task-registration-instruction-add
- **優先度**: 高
- **推定工数**: 3時間

## 1. タスク概要

プロジェクト管理画面のタスク登録タブにおいて、各タスク行に配置された「指示追加」ボタンから新規指示を追加する機能を実装します。タスク登録タブから追加された指示は即時DB保存せず、ローカルstateで管理し、「タスク情報を保存」ボタン押下時にタスクと指示を**1つのトランザクションで一括保存**します。

**実装方針**: バックエンドAPI拡張により、トランザクション処理でデータ整合性を保証します。

## 2. 目的と期待される成果

### 目的
- タスク登録時に同時に指示を登録できるようにする
- 指示追加時に対象メソッドを自動設定し、ユーザーの入力負担を軽減する
- **1つのトランザクションで**タスクと指示を一括保存し、データの整合性を保証する

### 期待される成果
- [ ] 「指示追加」ボタンから新規指示追加ダイアログが開く
- [ ] 対象メソッドがボタン押下時の行のメソッドで固定される
- [ ] 指示が即時DB保存されず、ローカルstateで管理される
- [ ] 「タスク情報を保存」ボタン押下時にタスクと指示が1つのトランザクションで一括保存される
- [ ] トランザクション失敗時は全てロールバックされる

## 3. 実装ステップ

### Phase 1: バックエンドAPI拡張（既存トランザクションに指示保存を追加）
- [ ] `backend/src/types/taskRegistration.ts` - SaveTaskRegistrationRequest型拡張（instructions追加）
- [ ] `backend/src/services/taskRegistrationService.ts` - saveTaskRegistration関数拡張
  - [ ] ✅ トランザクション処理は既存実装済み（BEGIN/COMMIT/ROLLBACK）
  - [ ] ✅ タスク保存処理は既存実装済み
  - [ ] 指示保存処理を追加（instructions配列がある場合のみ）
  - [ ] ✅ エラー時の全ロールバック処理は既存実装済み
  - [ ] **必須バリデーション**: 各メソッドに最低1つの指示が設定されているかチェック
- [ ] `backend/src/repositories/instructionRepository.ts` - 一括Insert処理の確認・追加
- [ ] バックエンドのバリデーション追加
  - [ ] instructions配列の存在チェック
  - [ ] **各メソッドに対して最低1つの指示が存在するかチェック**

### Phase 2: フロントエンド状態管理
- [ ] `TaskRegistrationTab.tsx` - 指示リストのstate追加（`pendingInstructions`）
- [ ] 指示追加ダイアログの開閉状態管理（`isInstructionDialogOpen`, `selectedTaskForInstruction`）

### Phase 3: InstructionEditDialog連携
- [ ] `InstructionEditDialog.tsx` - Props型定義拡張
  - [ ] `fixedMethodId?: string` 追加
  - [ ] `saveMode?: 'immediate' | 'local'` 追加
- [ ] メソッド選択UI制御（fixedMethodId指定時は無効化）
- [ ] 保存処理の分岐実装（saveMode='local'時はonSaveコールバックのみ）
- [ ] 「指示追加」ボタンのクリックハンドラ実装（TaskRegistrationTab側）

### Phase 4: フロントエンド一括保存処理
- [ ] `TaskRegistrationTab.tsx` - handleSave関数の拡張
  - [ ] **保存前バリデーション**: 各メソッドに最低1つの指示が設定されているかチェック
  - [ ] バリデーションエラー時はユーザーにエラーメッセージを表示
  - [ ] タスクデータ + pendingInstructions を1つのリクエストで送信
  - [ ] 保存成功時にpendingInstructionsをクリア
  - [ ] エラー時のユーザー通知
- [ ] `frontend/src/types/taskRegistration.ts` - SaveTaskRegistrationRequest型拡張（instructions追加）

### Phase 5: テストと動作確認
- [ ] バックエンド単体テスト（トランザクション処理）
- [ ] フロントエンド統合テスト
  - [ ] 指示追加フロー
  - [ ] 一括保存
  - [ ] トランザクション失敗時のロールバック
- [ ] 手動テスト
  - [ ] チェックアウトロック時の動作
  - [ ] 複数指示追加
  - [ ] エラーケース

## 4. 影響範囲

### 変更するファイル

#### バックエンド
1. `backend/src/types/taskRegistration.ts`
   - SaveTaskRegistrationRequest型拡張（instructions追加）

2. `backend/src/services/projectService.ts`
   - saveTaskRegistration関数拡張（トランザクション処理追加）
   - タスク + 指示の一括保存処理

3. `backend/src/repositories/instructionRepository.ts`（必要に応じて）
   - 一括Insert処理追加

#### フロントエンド
4. `frontend/src/types/taskRegistration.ts`
   - SaveTaskRegistrationRequest型拡張（instructions追加）

5. `frontend/src/components/project/TaskRegistrationTab.tsx`
   - pendingInstructions state追加
   - 指示追加ダイアログの開閉状態管理
   - 指示追加ボタンのハンドラ実装
   - InstructionEditDialog統合
   - handleSave関数拡張（一括保存）

6. `frontend/src/components/project/InstructionEditDialog.tsx`
   - Props型定義拡張（fixedMethodId, saveMode追加）
   - 固定methodIdの場合のUI制御
   - 保存処理の分岐（immediate vs local）

### 新規作成するファイル
なし（既存ファイルの拡張のみ）

### 影響を受ける機能
- タスク登録機能：指示情報を含む保存処理に変更
- 指示登録機能：TaskRegistrationTabからも呼び出されるように拡張

## 5. 技術的詳細

### 使用する技術・ライブラリ
- React Hooks: useState, useCallback, useMemo
- Ant Design: Modal, Button, Badge（指示カウント表示）
- 既存コンポーネント: InstructionEditDialog

### データ構造

```typescript
// タスクに紐づく指示データ
interface PendingInstructionData extends InstructionData {
  methodId: string; // 対象メソッドID（固定）
}

// TaskRegistrationTabのstate
const [pendingInstructions, setPendingInstructions] = useState<PendingInstructionData[]>([]);
const [isInstructionDialogOpen, setIsInstructionDialogOpen] = useState<boolean>(false);
const [selectedTaskForInstruction, setSelectedTaskForInstruction] = useState<TaskDetail | null>(null);
```

### InstructionEditDialogのProps拡張

```typescript
interface InstructionEditDialogProps {
  // 既存props
  open: boolean;
  mode: 'create' | 'edit';
  instruction?: InstructionData;
  tasks: TaskDetail[];
  availableMethods: MethodInfo[];
  availableTransitions: TransitionInfo[];
  onClose: () => void;
  onSave: (instruction: InstructionData, keepDialogOpen?: boolean) => void;
  
  // 新規追加props
  fixedMethodId?: string; // 固定するメソッドID（指定時はメソッド選択を無効化）
  saveMode?: 'immediate' | 'local'; // 保存モード（デフォルト: immediate）
}
```

### 一括保存APIリクエスト形式

```typescript
interface SaveTaskRegistrationRequest {
  tasks: {
    methodId: string;
    experimentCondition: number;
    trialCount: number;
  }[];
  instructions?: InstructionData[]; // 新規追加
}
```

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| InstructionEditDialogの既存動作への影響 | 中 | 低 | Props拡張は後方互換性を保つ（デフォルト値設定） |
| バックエンドAPIの変更が必要 | 高 | 中 | フロントエンド先行実装、API変更は別タスク化も検討 |
| 指示データの検証不足 | 中 | 中 | フロントエンド側で十分なバリデーション実装 |
| state管理の複雑化 | 低 | 中 | 明確なstate構造設計、コメント充実 |

## 7. テスト計画

### ユニットテスト
- [ ] pendingInstructions stateの更新ロジック
- [ ] 指示カウント計算ロジック
- [ ] バリデーション処理

### 統合テスト
- [ ] 指示追加ダイアログ開閉
- [ ] 指示データのローカル保存
- [ ] 一括保存処理
- [ ] エラーハンドリング

### 手動テスト
- [ ] タスク登録タブから指示追加
- [ ] 複数指示の追加
- [ ] 連続指示機能の動作
- [ ] 一括保存の動作
- [ ] チェックアウトロック時の動作
- [ ] エラーケースの確認

## 8. 実装の注意点

### InstructionEditDialogの互換性
- 既存の指示登録タブからの呼び出しに影響を与えないこと
- Props拡張は全てoptionalにする
- デフォルト動作は現状維持（即時保存）

### methodId固定時のUI
- メソッド選択ドロップダウンを無効化
- 固定されたメソッドを表示
- ユーザーに固定されていることを明示

### 一括保存の実装
- タスクデータと指示データを同時に送信
- トランザクション処理の検討（バックエンド側）
- 保存成功時にpendingInstructionsをクリア
- 保存失敗時のロールバック処理

### チェックアウトロック
- ロック時は指示追加ボタンも無効化
- 既存のisCheckoutLockedチェックを活用

## 9. 関連ドキュメント

- [InstructionEditDialog実装](frontend/src/components/project/InstructionEditDialog.tsx)
- [TaskRegistrationTab実装](frontend/src/components/project/TaskRegistrationTab.tsx)
- [指示登録型定義](frontend/src/types/instructionRegistration.ts)
- [タスク登録型定義](frontend/src/types/taskRegistration.ts)

## 10. 承認記録

- **計画書提示日時**: 2026-03-04 11:14
- **承認日時**: （ユーザー承認待ち）
- **承認者コメント**: （承認後に記入）

## 11. 実施記録

### 実施日時
開始: （実装開始時に記入）
完了: （実装完了時に記入）

### 計画からの変更点
（実施中に発生した計画からの変更や追加作業を記録）

### 発生した問題と解決方法
（実施中に発生した問題とその解決方法を記録）

### 最終的な成果物
（実装完了後に記入）

## 12. 振り返り

### うまくいった点
（実装完了後に記入）

### 改善が必要な点
（実装完了後に記入）

### 学んだこと
（実装完了後に記入）
