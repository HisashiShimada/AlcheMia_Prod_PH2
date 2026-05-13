# タスク計画書: プロジェクト指示ボタン処理統一

## メタデータ
- **作成日時**: 2026-03-05 16:54
- **タスクID**: project-instruction-state-unification
- **優先度**: 中
- **推定工数**: 1時間

## 1. タスク概要

プロジェクト管理画面のプロジェクト指示ボタン押下時の処理を変更します。現在は即時DB保存していますが、指示追加ボタンと同様にローカルstate（pendingInstructions）で管理し、タスク情報を保存ボタン押下時にまとめて1つのトランザクションで保存するようにします。

## 2. 目的と期待される成果

### 目的
- 指示追加ボタンとプロジェクト指示ボタンの処理を統一
- 保存処理をトランザクション化し、データの一貫性を向上
- ユーザビリティの向上（保存タイミングの統一）

### 期待される成果
- [x] プロジェクト指示ボタン押下時もpendingInstructionsに追加される
- [x] 指示追加ボタンとプロジェクト指示ボタンが同じstateを使用
- [x] タスク情報を保存ボタンで指示とタスクを一括保存
- [x] 処理フローが統一され、コードの保守性が向上

## 3. 実装ステップ

### Phase 1: 現状分析（完了）
- [x] TaskRegistrationTab.tsxの現在の実装を確認
- [x] handleProjectInstructionSaveが即時DB保存していることを確認
- [x] handleInstructionSaveがローカルstate保存していることを確認
- [x] InstructionEditDialogのsaveModeプロパティを確認

### Phase 2: コンポーネント修正
- [ ] TaskRegistrationTab.tsxを修正
  - [ ] handleProjectInstructionSave関数を削除
  - [ ] プロジェクト指示ダイアログのonSaveをhandleInstructionSaveに変更
  - [ ] プロジェクト指示ダイアログのsaveModeを'local'に変更
  - [ ] プロジェクト指示ダイアログのfixedMethodIdを空文字列''に設定
- [ ] InstructionEditDialog.tsxを修正
  - [ ] 指示対象カードの表示を修正
  - [ ] methodIdが空文字列の場合「ファイル全体」→「プロジェクト全体」に変更

### Phase 3: 動作確認
- [ ] プロジェクト指示ボタン押下時の動作確認
  - [ ] ダイアログが開く
  - [ ] methodIdが空文字列（ファイル全体）になっている
  - [ ] 保存時にpendingInstructionsに追加される
  - [ ] ダイアログが閉じる
  - [ ] 即時DB保存されない
- [ ] 指示追加ボタン押下時の動作確認（既存機能）
  - [ ] 正常に動作する
  - [ ] pendingInstructionsに追加される
- [ ] タスク情報を保存ボタン押下時の動作確認
  - [ ] pendingInstructions内のすべての指示が保存される
  - [ ] タスク情報も保存される
  - [ ] 保存成功後にpendingInstructionsがクリアされる

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/components/project/TaskRegistrationTab.tsx`
   - handleProjectInstructionSave関数を削除
   - プロジェクト指示ダイアログのプロパティを変更

2. `frontend/src/components/project/InstructionEditDialog.tsx`
   - 指示対象カードの表示を修正
   - methodIdが空文字列の場合「ファイル全体」→「プロジェクト全体」に変更

### 影響を受ける機能
- プロジェクト指示ボタンの動作
  - 変更前: 保存時に即時DB保存
  - 変更後: ローカルstateに保存、タスク情報を保存ボタンで一括保存

### 影響を受けないファイル
- projectApiService.ts（変更不要）
- バックエンドAPI（変更不要）

## 5. 技術的詳細

### 現在の実装
```typescript
// プロジェクト指示保存ハンドラ（即時DB保存）
const handleProjectInstructionSave = useCallback(async (instruction: InstructionData, keepDialogOpen?: boolean) => {
  try {
    // API用の指示データを作成
    const instructionRequest = {
      methodId: '', // プロジェクト指示はmethodIdを空文字列に
      content: instruction.content,
      priority: instruction.priority,
      type: instruction.type,
      targetType: instruction.targetType,
      transitionId: instruction.transitionId || null,
      taskNumber: instruction.taskNumber || null,
    };

    // 即時DB保存
    await saveInstruction(projectName, instructionRequest);
    message.success('指示を保存しました');

    if (!keepDialogOpen) {
      setIsProjectInstructionDialogOpen(false);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '指示の保存に失敗しました';
    message.error(errorMessage);
    console.error('Failed to save project instruction:', error);
  }
}, [projectName]);
```

### 変更後の実装

**TaskRegistrationTab.tsx:**
```typescript
// handleProjectInstructionSaveは削除し、handleInstructionSaveを共用
// プロジェクト指示ダイアログの定義を変更：
<InstructionEditDialog
  open={isProjectInstructionDialogOpen}
  mode="create"
  tasks={taskDetails}
  availableTransitions={availableTransitions}
  onClose={handleProjectInstructionDialogClose}
  onSave={handleInstructionSave}  // handleProjectInstructionSaveから変更
  fixedMethodId=""                 // 空文字列でプロジェクト全体を指定
  saveMode="local"                 // immediateからlocalに変更
/>
```

**InstructionEditDialog.tsx:**
```typescript
// 指示対象カードの表示部分を修正
{selectedMethodId ? (
  <>
    <Text strong style={{ fontSize: '16px' }}>
      <AimOutlined /> {selectedMethod?.displayName || selectedMethodId}
    </Text>
    {selectedMethod?.description && (
      <Text type="secondary" style={{ fontSize: '12px' }}>
        {selectedMethod.description}
      </Text>
    )}
  </>
) : (
  <Text>
    <FileTextOutlined /> プロジェクト全体  {/* ← 「ファイル全体」から変更 */}
  </Text>
)}
```

### データフロー（変更後）

```
[指示追加ボタン] → InstructionEditDialog (fixedMethodId=methodId, saveMode='local')
                                    ↓
                          handleInstructionSave
                                    ↓
                          pendingInstructions.push()

[プロジェクト指示ボタン] → InstructionEditDialog (fixedMethodId='', saveMode='local')
                                    ↓
                          handleInstructionSave
                                    ↓
                          pendingInstructions.push()

[タスク情報を保存ボタン] → handleSave
                                    ↓
                          saveTaskRegistration({
                            tasks: [...],
                            instructions: pendingInstructions
                          })
                                    ↓
                          DB一括保存（トランザクション）
                                    ↓
                          pendingInstructions.clear()
```

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| プロジェクト指示が即時保存されないことへのユーザー混乱 | 中 | 低 | UIメッセージで「保存ボタンを押して確定してください」と明示 |
| 保存前にページを離れた場合のデータ損失 | 中 | 低 | 既存のバリデーションで保存を促す（すでに実装済み） |
| 連続指示機能との整合性 | 低 | 低 | 連続指示は両ダイアログで同じ実装のため問題なし |

## 7. テスト計画

### 手動テスト
- [ ] プロジェクト指示ボタン → 指示入力 → 保存
  - pendingInstructionsに追加されることを確認
- [ ] 指示追加ボタン → 指示入力 → 保存
  - pendingInstructionsに追加されることを確認（既存機能）
- [ ] プロジェクト指示と指示追加を複数回実行
  - pendingInstructionsに両方の指示が蓄積されることを確認
- [ ] タスク情報を保存ボタン押下
  - すべての指示がDB保存されることを確認
  - pendingInstructionsがクリアされることを確認
- [ ] 連続指示機能（両ダイアログ）
  - ダイアログが開いたまま次の指示を入力できることを確認

## 8. 関連ドキュメント

- [プロジェクト指示ボタン実装](../20260305_1004_プロジェクト指示ボタン実装/PLAN.md)
- [タスク登録タブ指示追加機能](../20260304_1114_タスク登録タブ指示追加機能/PLAN.md)
- [プロジェクト指示対応_タスク登録バリデーション修正](../20260305_1136_プロジェクト指示対応_タスク登録バリデーション修正/PLAN.md)

## 9. 承認記録

- **計画書提示日時**: 2026-03-05 16:54
- **承認日時**: 2026-03-05 17:46
- **承認者コメント**: 承認。表示文言「ファイル全体」→「プロジェクト全体」の修正を追加

## 10. 実施記録

### 実施日時
開始: 2026-03-05 17:47
完了: 2026-03-05 18:09

### 計画からの変更点
- experiment_instruction_idの形式を指示送信タブと統一
  - 変更前: `instruction_{nanoid(12)}` (例: `instruction_V1StGXR8_Z5j`)
  - 変更後: `{projectName}_{連番}` (例: `sample_project_001`)

### 発生した問題と解決方法
1. **問題**: タスク登録タブから保存する指示のexperiment_instruction_idがnanoid形式だった
   - **解決**: 指示送信タブと同じ形式({projectName}_{連番})に統一
   - **実装**: pg-promiseを使用してプロジェクト名取得と指示数カウントを実装

### 最終的な成果物
- [x] TaskRegistrationTab.tsxの修正完了
- [x] InstructionEditDialog.tsxの修正完了
- [x] instructionRepository.tsの修正完了（experiment_instruction_id形式統一）
- [x] SQLファイル作成完了
  - getProjectName.sql
  - getInstructionCount.sql
- [ ] 動作確認完了（ユーザーによる確認待ち）

## 11. 振り返り

### うまくいった点
（完了後記入）

### 改善が必要な点
（完了後記入）

### 学んだこと
（完了後記入）
