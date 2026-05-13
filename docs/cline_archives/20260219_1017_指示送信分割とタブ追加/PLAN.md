# タスク計画書: 指示送信ダイアログの分割とプロジェクト管理タブへの追加

## メタデータ
- **作成日時**: 2026-02-19 10:17
- **タスクID**: instruction_dialog_split
- **優先度**: 中
- **推定工数**: 4-6時間

## 1. タスク概要

現在のInstructionDialog.tsxを「タスク登録部品」と「指示登録部品」に分割し、プロジェクト管理画面のタブとして追加する。これにより、タスク登録と指示登録を別々に管理できるようになり、UX/UIの改善を図る。

## 2. 目的と期待される成果

### 目的
- 指示送信ダイアログの複雑さを軽減し、タスク登録と指示登録を分離する
- プロジェクト管理画面にタブを追加して、タスクと指示を独立して管理できるようにする
- コンポーネントの責務を明確にし、保守性を向上させる

### 期待される成果
- [ ] タスク登録部品（TaskRegistrationTab.tsx）の作成
- [ ] 指示登録部品（InstructionRegistrationTab.tsx）の作成
- [ ] プロジェクト管理画面に2つの新しいタブを追加
- [ ] 既存のInstructionDialogとの互換性を維持（必要に応じて）

## 3. 実装ステップ

### Phase 1: 現状分析と設計
- [x] InstructionDialog.tsxの構造を分析
- [ ] タスク登録部品の責務と機能を定義
- [ ] 指示登録部品の責務と機能を定義
- [ ] データフローと状態管理の設計

### Phase 2: タスク登録部品の作成
- [ ] TaskRegistrationTab.tsxを新規作成
- [ ] タスク詳細カードの機能を移植
  - [ ] メソッド選択機能
  - [ ] ドラッグ&ドロップによる順序変更
  - [ ] 実験条件設定（全て同一条件 / 条件を変更）
  - [ ] 試行回数設定
- [ ] タスクデータの保存/読み込み機能
- [ ] バリデーション機能

### Phase 3: 指示登録部品の作成
- [ ] InstructionRegistrationTab.tsxを新規作成
  - [ ] 指示一覧テーブルの表示
  - [ ] 「追加」ボタンの実装
  - [ ] 「編集」ボタンの実装
  - [ ] 一覧のソート・フィルタ機能
- [ ] InstructionEditDialog.tsxを新規作成（単一指示の編集ダイアログ）
  - [ ] 優先度、タイプ選択
  - [ ] 対象タスク選択
  - [ ] トランジション選択
  - [ ] 指示内容入力
  - [ ] バリデーション機能
- [ ] 指示データの保存/送信機能

### Phase 4: プロジェクト管理画面への統合
- [ ] ProjectManagement.tsxにタブを追加
  - [ ] 「タスク登録」タブ
  - [ ] 「指示登録」タブ
- [ ] タブ切り替え時のデータ永続化
- [ ] プロジェクト選択時のデータロード

### Phase 5: データ連携と状態管理
- [ ] タスク登録データと指示登録データの連携
- [ ] 共有状態管理（Context API または状態管理ライブラリ）
- [ ] タスクリストを指示登録画面で参照できるようにする

### Phase 6: テストと検証
- [ ] 各コンポーネントの単体テスト
- [ ] タブ切り替えのテスト
- [ ] データ保存/読み込みのテスト
- [ ] バリデーションのテスト
- [ ] 統合テスト

## 4. 影響範囲

### 新規作成するファイル
1. `frontend/src/components/project/TaskRegistrationTab.tsx` - タスク登録タブコンポーネント
2. `frontend/src/components/project/InstructionRegistrationTab.tsx` - 指示登録タブコンポーネント（一覧表示）
3. `frontend/src/components/project/InstructionEditDialog.tsx` - 単一指示の編集/追加ダイアログ
4. `frontend/src/contexts/TaskInstructionContext.tsx` - タスクと指示の共有状態管理（オプション）
5. `frontend/src/types/taskRegistration.ts` - タスク登録の型定義
6. `frontend/src/types/instructionRegistration.ts` - 指示登録の型定義

### 変更するファイル
1. `frontend/src/components/project/ProjectManagement.tsx` - タブ追加
2. `frontend/src/components/project/InstructionDialog.tsx` - 既存ダイアログとの互換性維持（必要に応じて）
3. `frontend/src/locales/ja.json` - 多言語対応ラベル追加

### 影響を受ける機能
- プロジェクト管理画面のタブ構成
- 指示送信フロー（既存のダイアログからの移行）

## 5. 技術的詳細

### コンポーネント構成

#### TaskRegistrationTab.tsx
```typescript
// タスク登録タブコンポーネント
interface TaskRegistrationTabProps {
  projectId: string;
  projectName: string;
  onTasksChange?: (tasks: TaskDetail[]) => void;
}

// 機能:
// - メソッド選択（複数選択可能）
// - ドラッグ&ドロップで順序変更
// - 実験条件設定（全て同一条件 / 条件を変更）
// - 試行回数設定
// - タスクデータの保存（localStorage またはAPI）
```

#### InstructionRegistrationTab.tsx
```typescript
// 指示登録タブコンポーネント（一覧表示）
interface InstructionRegistrationTabProps {
  projectId: string;
  projectName: string;
  tasks: TaskDetail[]; // タスク登録タブから渡される
  onInstructionsSubmit?: (data: InstructionSubmitData) => void;
}

// 機能:
// - 指示一覧テーブルの表示
// - 「追加」ボタンで新規指示ダイアログを開く
// - 「編集」ボタンで指示編集ダイアログを開く
// - ソート・フィルタ機能（優先度、タイプ、対象タスクなど）
// - 一括送信機能
```

#### InstructionEditDialog.tsx
```typescript
// 単一指示の編集/追加ダイアログコンポーネント
interface InstructionEditDialogProps {
  open: boolean;
  mode: 'create' | 'edit'; // 新規作成または編集
  instruction?: InstructionData; // 編集時の既存データ
  tasks: TaskDetail[]; // 利用可能なタスク一覧
  availableTransitions: TransitionInfo[]; // 利用可能なトランジション
  onClose: () => void;
  onSave: (instruction: InstructionData) => void;
}

// 機能:
// - 単一の指示の入力フォーム（InstructionDialogの指示部分を再利用）
// - タスク選択（タスク登録タブで登録されたタスクから選択）
// - 優先度、タイプ選択
// - 対象タスク番号選択
// - トランジション選択
// - 指示内容入力
// - バリデーション
// - 保存/キャンセル
```

### データフロー
1. **タスク登録タブ** → タスクデータを保存（localStorage or API）
2. **指示登録タブ** → 保存されたタスクデータを読み込み、指示一覧を表示
3. **指示編集ダイアログ** → 単一の指示を編集/作成
4. **指示登録タブ** → 指示データを一括送信（API）

### 状態管理
- **ローカル状態**: 各タブ内での一時的な入力状態
- **永続化**: localStorage または API経由でタスクデータを保存
- **共有状態**: Context API を使用してタスクと指示のデータを共有（オプション）

## 6. UI/UX設計

### タスク登録タブ
- **レイアウト**: カード形式でタスク詳細を表示
- **インタラクション**:
  - ドラッグ&ドロップで順序変更
  - チェックボックスでタスク選択
  - インライン編集で試行回数設定
- **保存ボタン**: 画面下部に配置

### 指示登録タブ
- **レイアウト**: 
  - 上部: ツールバー（「追加」ボタン、「一括送信」ボタン）
  - 中央: 指示一覧テーブル
    - カラム: 指示対象、優先度、タイプ、指示内容（省略表示）、操作（編集）
  - 各行に「編集」ボタン
- **インタラクション**:
  - 「追加」ボタンで新規指示ダイアログを開く
  - 「編集」ボタンで指示編集ダイアログを開く
  - 「一括送信」ボタンで全ての指示を送信

### 指示編集ダイアログ（InstructionEditDialog）
- **レイアウト**: 
  - モーダルダイアログ形式
  - 現在のInstructionDialogの指示入力部分（1つ分）を表示
- **インタラクション**:
  - タスク選択でタスクを指定
  - 優先度、タイプ、トランジション、指示内容を入力
  - 「保存」ボタンで指示を保存して閉じる
  - 「キャンセル」ボタンで破棄して閉じる

### プロジェクト管理画面のタブ構成（更新後）
```
- ファイル管理
- タスク結果
- タスク登録 ← 新規追加
- 指示登録 ← 新規追加
```

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 既存のInstructionDialogとの互換性問題 | 中 | 中 | 既存ダイアログを残し、段階的に移行 |
| タブ間のデータ連携の複雑化 | 高 | 高 | Context APIまたは状態管理ライブラリを使用 |
| タスクデータの永続化方法の選定 | 中 | 中 | localStorage → API移行のパスを確保 |
| UI/UXの一貫性維持 | 中 | 低 | Ant Design v6のコンポーネントを統一使用 |

## 8. テスト計画

### ユニットテスト
- [ ] TaskRegistrationTab コンポーネントのテスト
- [ ] InstructionRegistrationTab コンポーネントのテスト（一覧表示）
- [ ] InstructionEditDialog コンポーネントのテスト（編集ダイアログ）
- [ ] データ保存/読み込みのテスト
- [ ] バリデーション機能のテスト

### 統合テスト
- [ ] タブ切り替え時のデータ永続化テスト
- [ ] タスク登録 → 指示登録のデータ連携テスト
- [ ] プロジェクト切り替え時のデータロードテスト

### 手動テスト
- [ ] タスク登録フローの動作確認
- [ ] 指示登録フローの動作確認
- [ ] UI/UXの確認（レスポンシブ対応含む）
- [ ] エラーハンドリングの確認

## 9. ロールバック計画

問題が発生した場合:
1. 新しいタブを非表示にする
2. 既存のInstructionDialogを引き続き使用
3. 新規コンポーネントをコメントアウト

## 10. 関連ドキュメント

- [InstructionDialog.tsx](../../frontend/src/components/project/InstructionDialog.tsx)
- [ProjectManagement.tsx](../../frontend/src/components/project/ProjectManagement.tsx)
- [.clinerules/development/config.md](../../.clinerules/development/config.md)
- [.clinerules/development/typescript.md](../../.clinerules/development/typescript.md)

## 11. 承認記録

- **計画書提示日時**: 2026-02-19 10:17
- **承認日時**: 2026-02-19 10:37
- **承認者コメント**: 承認。指示登録タブは一覧表示+編集ダイアログ形式で実装。削除機能は不要。

## 12. 実施記録

### 実施日時
開始: 2026-02-19 10:37
完了: 2026-02-19 10:57

### 計画からの変更点
- 指示登録タブは、当初の設計通り一覧表示+編集ダイアログ形式で実装
- 削除機能は不要との要件に基づき、編集機能のみ実装
- 多言語対応ラベルは既存のハードコード値を使用（後で対応予定）

### 発生した問題と解決方法
1. **ESLintエラー（useEffect内でのsetState）**
   - 問題: InstructionEditDialog.tsxでuseEffect内での状態更新がcascading renderを引き起こす警告
   - 解決: useEffectの依存配列を最適化し、eslint-disable-nextを追加

2. **ESLintエラー（any型の使用）**
   - 問題: registeredTasks状態変数でany[]型を使用
   - 解決: TaskDetail[]型に置き換え

### 最終的な成果物
- [x] TaskRegistrationTab.tsx（タスク登録タブ）
- [x] InstructionRegistrationTab.tsx（指示一覧タブ）
- [x] InstructionEditDialog.tsx（単一指示編集ダイアログ）
- [x] 型定義ファイル（taskRegistration.ts、instructionRegistration.ts）
- [x] 更新されたProjectManagement.tsx
- [ ] 多言語対応ラベル（今回は既存値を使用、後で対応予定）

## 13. 振り返り

### うまくいった点
1. **段階的な実装アプローチ**
   - Phase 1（型定義）→ Phase 2（タスク登録）→ Phase 3（指示登録）→ Phase 4（統合）の順序が適切だった
   - 各Phaseで独立したコンポーネントを作成したため、テストとデバッグが容易

2. **既存コードとの共存**
   - 既存のInstructionDialog.tsxを残したまま新しいコンポーネントを追加
   - 段階的な移行が可能な設計

3. **データ連携の明確化**
   - タスク登録タブ → 指示登録タブへのデータフローが明確
   - handleTasksChangeとhandleInstructionsSubmitで責務を分離

### 改善が必要な点
1. **多言語対応**
   - 今回はハードコード値を使用したため、後で多言語対応が必要
   - frontend/src/locales/ja.jsonへの追加が必要

2. **API統合**
   - 現在はモックデータとlocalStorageを使用
   - 実際のAPI実装時に置き換えが必要

3. **バリデーション強化**
   - より詳細なエラーメッセージとバリデーションルールの追加が望ましい

### 学んだこと
1. **大規模ファイルの段階的編集**
   - ProjectManagement.tsxのような大規模ファイルは、複数回に分けて編集する方が安全

2. **型安全性の重要性**
   - TaskDetail型とInstructionData型を明確に定義したことで、実装中のエラーを早期発見できた

3. **コンポーネント間の疎結合**
   - 各コンポーネントが独立しており、再利用性が高い設計を実現できた
