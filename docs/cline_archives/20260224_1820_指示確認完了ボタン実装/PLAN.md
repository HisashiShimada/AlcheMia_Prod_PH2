# タスク計画書: 指示確認完了ボタン実装

## メタデータ
- **作成日時**: 2026-02-24 18:20
- **タスクID**: instruction-confirm-button-implementation
- **優先度**: 高
- **推定工数**: 3時間

## 1. タスク概要

`InstructionConfirmationTab`の「確認完了」ボタン押下後の処理を実装します。現在はモック実装（`alert()`のみ）となっているため、実際のAPI呼び出しに変更します。

## 2. 目的と期待される成果

### 目的
実験作業者が作業指示を確認完了する機能を実装し、指示管理のワークフローを完結させる

### 期待される成果
- [x] バックエンドAPI: `PUT /api/v1/projects/:projectName/instructions/:instructionId/confirm` ✅ 実装済み
- [x] フロントエンドサービス: `projectApiService.confirmInstruction()` ✅ 実装済み
- [ ] プロジェクト指示グループの確認完了ボタンが動作する
- [ ] 全指示の確認完了ボタンが動作する
- [ ] 確認完了後、指示一覧が自動更新される
- [ ] エラーハンドリングが適切に実装される

## 3. 実装ステップ

### Phase 1: useInstructionsフックの修正
- [ ] `refetchInstructions()`関数を追加
- [ ] 戻り値に`refetchInstructions`、`loading`、`error`を追加
- [ ] 手動で指示一覧を再取得できるようにする

### Phase 2: ExperimentWorkerMenuの修正
- [ ] `useInstructions`から`refetchInstructions`を取得
- [ ] `InstructionConfirmationTab`に`onInstructionsUpdated`コールバックを渡す

### Phase 3: InstructionConfirmationTabの修正（基本構造）
- [ ] Ant Designの`Modal`をimport
- [ ] `confirmInstruction`をimport
- [ ] `confirmLoading`状態を追加
- [ ] propsに`onInstructionsUpdated`を追加

### Phase 4: 確認完了処理の実装
- [ ] `confirmInstructions()`共通処理関数を実装
  - [ ] プロジェクト名のチェック
  - [ ] ローディング表示開始
  - [ ] 各指示を順番にAPI呼び出し
  - [ ] エラーハンドリング（個別/全体）
  - [ ] 成功・失敗カウント
  - [ ] 結果メッセージ表示
  - [ ] 指示一覧の再取得

### Phase 5: プロジェクト指示グループ確認完了ハンドラー実装
- [ ] `handleConfirmProjectInstructions()`を実装
- [ ] プロジェクト指示（`targetType === 'file'`）の未読をフィルタ
- [ ] 確認ダイアログを表示
- [ ] `confirmInstructions()`を呼び出し

### Phase 6: 全指示確認完了ハンドラー実装
- [ ] `handleConfirmAllInstructions()`を修正
- [ ] 全未読指示をフィルタ
- [ ] 確認ダイアログを表示
- [ ] `confirmInstructions()`を呼び出し

### Phase 7: UIの更新
- [ ] プロジェクト指示グループの確認完了ボタンにハンドラー設定
- [ ] ローディング状態を反映（`loading`、`disabled`）
- [ ] 全指示の確認完了ボタンにハンドラー設定
- [ ] ローディング状態を反映

### Phase 8: テスト
- [ ] プロジェクト指示の確認完了が動作するか確認
- [ ] 全指示の確認完了が動作するか確認
- [ ] エラーケースの動作確認
- [ ] 指示一覧の自動更新を確認

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/hooks/useInstructions.ts` - refetchInstructions関数追加
2. `frontend/src/components/menus/ExperimentWorkerMenu.tsx` - コールバック追加
3. `frontend/src/components/ExperimentWorker/InstructionConfirmationTab.tsx` - API呼び出し実装

### 新規作成するファイル
なし

### 削除するファイル
なし

### 影響を受ける機能
- 指示確認タブ: 確認完了機能が実際に動作するようになる
- 指示一覧: 確認完了後に自動更新される

## 5. 技術的詳細

### 使用する技術・ライブラリ
- React 18.2.0: フック、状態管理
- Ant Design v6: Modal.confirm()、message
- projectApiService: confirmInstruction() API

### アーキテクチャ上の考慮事項
- **状態管理**: useInstructionsフックで指示一覧を一元管理
- **コールバックパターン**: 子→親への通知で再取得をトリガー
- **エラーハンドリング**: 個別の指示確認でエラーが発生しても、他の指示は処理を継続

### データフロー
```
確認完了ボタン押下
  ↓
InstructionConfirmationTab
  ↓ Modal.confirm() → OK
  ↓ confirmInstructions()
  ↓ confirmInstruction() API呼び出し（各指示）
バックエンド（指示確認完了）
  ↓ 成功
InstructionConfirmationTab
  ↓ onInstructionsUpdated() コールバック
ExperimentWorkerMenu
  ↓ refetchInstructions() 呼び出し
useInstructions フック
  ↓ getWorkerInstructions() API再呼び出し
指示一覧を再取得 → 画面更新
```

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| API呼び出しが失敗する | 中 | 中 | エラーハンドリングを実装、一部失敗でも続行 |
| 複数指示の確認に時間がかかる | 低 | 中 | ローディング表示、進捗メッセージ |
| 再取得のタイミングでエラー | 中 | 低 | try-catchで捕捉、エラーメッセージ表示 |
| 確認完了後の画面更新が遅い | 低 | 低 | 楽観的UI更新（オプション） |

## 7. テスト計画

### 動作確認
- [ ] プロジェクト指示グループの確認完了ボタンが正常に動作する
- [ ] 全指示の確認完了ボタンが正常に動作する
- [ ] 確認完了後、指示一覧が自動更新される
- [ ] 未読指示がない場合のメッセージ表示

### エラーケース
- [ ] API呼び出しが失敗した場合のエラーメッセージ
- [ ] 一部の指示確認が失敗した場合の警告メッセージ
- [ ] プロジェクトが選択されていない場合のエラー

### UI/UX
- [ ] ローディング中はボタンが無効化される
- [ ] 確認ダイアログが正しく表示される
- [ ] メッセージが適切なタイミングで表示される

## 8. ロールバック計画

問題が発生した場合:
1. Git commitを戻す（`git revert`）
2. モック実装（`alert()`）に戻す
3. バックエンドAPIは実装済みなので影響なし

## 9. 関連ドキュメント

- [指示確認タブ UI設計書](../design/ui/ui_instruction_confirmation_tab.md)
- [プロジェクト管理API仕様書](../design/api/api_project_management.md)
- [API一覧（実験作業者画面）](../design/api/API一覧_実験作業者画面.md)
- [コーディング規約](../../.clinerules/development/config.md)
- [TypeScript型定義規約](../../.clinerules/development/typescript.md)

## 10. 承認記録

- **計画書提示日時**: 2026-02-24 18:20
- **承認日時**: 2026-02-24 18:20
- **承認者コメント**: ACT MODEに切り替え、実装開始

## 11. 実施記録

### 実施日時
開始: 2026-02-24 18:20
完了: （作業完了時に記入）

### 計画からの変更点
（実施中に発生した計画からの変更や追加作業を記録）

### 発生した問題と解決方法
（実施中に発生した問題とその解決方法を記録）

### 最終的な成果物
- [ ] useInstructions.ts - refetchInstructions関数追加
- [ ] ExperimentWorkerMenu.tsx - コールバック追加
- [ ] InstructionConfirmationTab.tsx - API呼び出し実装

## 12. 振り返り

### うまくいった点
（作業完了後に記入）

### 改善が必要な点
（作業完了後に記入）

### 学んだこと
（作業完了後に記入）
