# タスク計画書: プロジェクト指示ボタン実装

## メタデータ
- **作成日時**: 2026-03-05 10:04
- **タスクID**: project-instruction-button
- **優先度**: 中
- **推定工数**: 2時間

## 1. タスク概要

プロジェクト管理画面のタスク登録タブにある「プロジェクト指示」ボタンから新規指示の追加ダイアログを開く機能を実装します。このボタンから追加された指示は、連続指示や保存を押下すると**即時DB保存**されます。また、指示対象には「ファイル全体」と表示するために多言語対応を実装します。

## 2. 目的と期待される成果

### 目的
- プロジェクト全体に対する指示を登録できるようにする
- 特定のメソッドに限定しない全体的な指示を管理する
- 即時DB保存により、タスク情報保存と独立した指示登録を実現

### 期待される成果
- [ ] プロジェクト指示ボタンをクリックすると新規指示の追加ダイアログが開く
- [ ] fixedMethodIdを指定せずにダイアログを開く
- [ ] 指示対象に「ファイル全体」と表示される（多言語対応）
- [ ] 保存または連続指示押下時に即時DB保存される（saveMode='immediate'）
- [ ] 保存成功時にメッセージを表示

## 3. 実装ステップ

### Phase 1: 多言語対応の追加
- [ ] `frontend/src/locales/ja.json` - 「ファイル全体」の翻訳キー追加
- [ ] `frontend/src/locales/en.json` - 英語翻訳追加

### Phase 2: TaskRegistrationTabの実装
- [ ] プロジェクト指示ボタンのクリックハンドラ実装
- [ ] 指示ダイアログの状態管理（プロジェクト指示用）
- [ ] InstructionEditDialogを saveMode='immediate' で開く
- [ ] 指示保存ハンドラの実装（saveInstruction API呼び出し）

### Phase 3: InstructionEditDialogの表示改善
- [ ] fixedMethodIdが未指定の場合に「ファイル全体」を表示
- [ ] 多言語対応キーを使用

### Phase 4: テストと動作確認
- [ ] プロジェクト指示ボタンのクリック動作確認
- [ ] ダイアログの表示確認（ファイル全体表示）
- [ ] 保存処理の動作確認（即時DB保存）
- [ ] 連続指示の動作確認
- [ ] エラーハンドリングの確認

## 4. 影響範囲

### 変更するファイル

#### フロントエンド
1. `frontend/src/locales/ja.json`
   - 「ファイル全体」の翻訳キー追加

2. `frontend/src/locales/en.json`
   - 英語翻訳追加

3. `frontend/src/components/project/TaskRegistrationTab.tsx`
   - プロジェクト指示ボタンのクリックハンドラ追加
   - プロジェクト指示用ダイアログの状態管理
   - 指示保存ハンドラの実装

4. `frontend/src/components/project/InstructionEditDialog.tsx`
   - 指示対象表示のロジック改善（fixedMethodId未指定時）
   - 多言語対応の適用

### 新規作成するファイル
なし（既存ファイルの拡張のみ）

### 影響を受ける機能
- タスク登録機能：プロジェクト指示ボタンから指示を即時登録可能に

## 5. 技術的詳細

### 実装の違い（タスク指示 vs プロジェクト指示）

#### タスク指示（既存機能）
- 各タスク行の「指示追加」ボタンから起動
- `fixedMethodId` を指定
- `saveMode='local'`（ローカルstateに保存）
- 「タスク情報を保存」ボタンでタスクと一緒にDB保存

#### プロジェクト指示（新規実装）
- 上部の「プロジェクト指示」ボタンから起動
- `fixedMethodId` を指定しない（undefined）
- `saveMode='immediate'`（即時DB保存）
- 保存または連続指示押下時に即時DB保存

### データ構造

```typescript
// プロジェクト指示用のダイアログ状態
const [isProjectInstructionDialogOpen, setIsProjectInstructionDialogOpen] = useState<boolean>(false);

// 指示データ
interface InstructionData {
  id: number;
  content: string;
  priority: number;
  type: number;
  targetType: number; // FILE=0 の場合はプロジェクト全体
  methodId: string; // 空文字列の場合はプロジェクト全体
  transitionId?: string;
  taskNumber?: number;
}
```

### API呼び出し

```typescript
// 即時DB保存（saveMode='immediate'）
import { saveInstruction } from '@/services/projectApiService';

const handleProjectInstructionSave = async (instruction: InstructionData) => {
  try {
    await saveInstruction(projectName, instruction);
    message.success('指示を保存しました');
  } catch (error) {
    message.error('指示の保存に失敗しました');
  }
};
```

### 多言語対応キー

```json
{
  "instructionRegistration": {
    "target": {
      "wholeFile": "ファイル全体"
    }
  }
}
```

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| InstructionEditDialogの既存動作への影響 | 中 | 低 | Props拡張は後方互換性を保つ |
| 多言語キーの重複 | 低 | 低 | キー名を明確にする |
| チェックアウトロック状態の考慮漏れ | 中 | 中 | isCheckoutLockedでボタンを無効化 |

**✅ 確認済み**: `saveInstruction` API（`POST /api/v1/projects/:projectName/instructions`）は既に実装済みのため、新規API実装は不要です。

## 7. テスト計画

### 統合テスト
- [ ] プロジェクト指示ボタンのクリック
- [ ] ダイアログの開閉
- [ ] 指示対象の表示確認（「ファイル全体」）
- [ ] 保存処理（即時DB保存）
- [ ] 連続指示の動作

### 手動テスト
- [ ] プロジェクト指示の追加
- [ ] 複数指示の連続追加
- [ ] 保存成功時のメッセージ表示
- [ ] エラー時のメッセージ表示
- [ ] チェックアウトロック時の動作

## 8. 実装の注意点

### InstructionEditDialogの動作モード

InstructionEditDialogは以下の3つのモードで動作します：

1. **指示登録タブ（デフォルト）**
   - saveMode='immediate'（デフォルト値）
   - fixedMethodId未指定
   - methodIdを選択可能
   - 保存時に即時DB保存

2. **タスク登録タブ - タスク指示**
   - saveMode='local'
   - fixedMethodIdを指定
   - methodId固定
   - 保存時にローカルstateに保存

3. **タスク登録タブ - プロジェクト指示（新規）**
   - saveMode='immediate'
   - fixedMethodId未指定
   - methodId未指定（空文字列）
   - 保存時に即時DB保存

### 指示対象の表示ロジック

```typescript
// InstructionEditDialog内での表示判定
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
    <FileTextOutlined /> {t('instructionRegistration.target.wholeFile')}
  </Text>
)}
```

## 9. 関連ドキュメント

- [既存タスク計画書](../20260304_1114_タスク登録タブ指示追加機能/PLAN.md)
- [InstructionEditDialog実装](frontend/src/components/project/InstructionEditDialog.tsx)
- [TaskRegistrationTab実装](frontend/src/components/project/TaskRegistrationTab.tsx)

## 10. 承認記録

- **計画書提示日時**: 2026-03-05 10:04
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
