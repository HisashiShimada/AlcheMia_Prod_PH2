# タスク計画書: タスク保存時の指示存在チェックをFEで実装

## メタデータ
- **作成日時**: 2026-03-09 09:55
- **タスクID**: fe_instruction_validation
- **優先度**: 中
- **推定工数**: 1時間

## 1. タスク概要

プロジェクト管理画面（タスク登録タブ）のタスク保存ボタン押下時、指示存在チェックをフロントエンドで実装します。

現在、指示存在チェックはバックエンドのみで実施されており、保存ボタンを押してからエラーが返ってくるまでに時間がかかります。これをフロントエンドで事前チェックすることで、ユーザーエクスペリエンスを向上させます。

## 2. 目的と期待される成果

### 目的
- フロントエンドで指示存在チェックを実施し、API通信前にエラーを検出する
- ユーザーに即座にフィードバックを提供する

### 期待される成果
- [ ] DB保存済み指示をタブアクティブ時に取得してstateに保存
- [ ] 保存ボタン押下時に `pendingInstructions + existingInstructions` の合計でチェック
- [ ] 指示が0件の場合はエラーメッセージを表示
- [ ] バックエンドの指示存在チェックを削除（FEで完結）

## 3. 実装ステップ

### Phase 1: state追加とデータ取得
- [ ] `existingInstructions` stateを追加
- [ ] `useEffect`でタブアクティブ時に`getInstructions` APIを呼び出し
- [ ] `Promise.all`でタスクデータと指示データを並行取得

### Phase 2: バリデーション実装
- [ ] `handleSave`関数に指示存在チェックを追加
- [ ] `pendingInstructions.length + existingInstructions.length`でチェック
- [ ] 0件の場合はエラーメッセージを表示して処理を中断

### Phase 3: バックエンドのチェック削除
- [ ] `taskRegistrationService.ts`から指示存在チェックのコードを削除（約95-125行目）

### Phase 4: エラーハンドリング
- [ ] 指示取得APIのエラー時は空配列で初期化
- [ ] エラーメッセージはユーザーフレンドリーな内容にする

### Phase 5: テスト
- [ ] 指示が0件の状態で保存ボタンを押下 → エラーメッセージ表示を確認
- [ ] 指示が1件以上の場合は保存が実行されることを確認
- [ ] タブの切り替え時に指示が再取得されることを確認

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/components/project/TaskRegistrationTab.tsx`
   - `existingInstructions` state追加
   - `useEffect`修正（指示データ取得を追加）
   - `handleSave`修正（指示存在チェック追加）

2. `backend/src/services/taskRegistrationService.ts`
   - 指示存在チェックのコードブロックを削除（約95-125行目）

### 使用する既存API
1. `frontend/src/services/projectApiService.ts`
   - `getInstructions(projectName)` - 既に実装済み

### 影響を受ける機能
- タスク登録タブの保存処理
- 指示送信タブ（影響なし - 別のコンポーネント）

## 5. 技術的詳細

### 使用する技術・ライブラリ
- React Hooks: `useState`, `useEffect`, `useCallback`
- Ant Design: `message`（エラー表示）
- 既存API: `getInstructions`, `getTaskRegistration`

### データフロー
```
1. タブアクティブ
   ↓
2. Promise.all([getTaskRegistration(), getInstructions()])
   ↓
3. setTaskDetails(), setExistingInstructions()
   ↓
4. ユーザーが指示を追加 → setPendingInstructions()
   ↓
5. 保存ボタン押下
   ↓
6. FEチェック: pendingInstructions + existingInstructions の合計
   ↓
7-a. 0件 → エラーメッセージ表示、処理中断
7-b. 1件以上 → API呼び出し
   ↓
8. BE: その他のバリデーション（チェックアウト状態、MAIML登録状態など）
   ↓
9. 保存成功
```

### セキュリティ考慮事項
- [x] 指示存在チェックはFEのみで実施（BEのチェックは削除）
- [x] BEの他のバリデーションは維持（チェックアウト状態、MAIML登録状態、試行回数範囲など）
- [x] ルーティング層のexpress-validatorは維持

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 指示取得APIのエラー | 中 | 低 | try-catchで空配列を設定、処理は継続 |
| 既存の保存処理への影響 | 高 | 低 | 既存ロジックの前にチェックを追加、既存処理は変更しない |
| データ同期のズレ | 中 | 中 | タブアクティブ時に必ず再取得 |

## 7. テスト計画

### 手動テスト
- [x] 指示0件の状態で保存ボタンを押下 → エラーメッセージ表示を確認
- [x] 指示1件追加後に保存ボタンを押下 → 保存成功を確認
- [x] DB保存済み指示がある状態で保存ボタンを押下 → 保存成功を確認
- [x] タブを切り替えて再度開く → 指示データが再取得されることを確認

### エラーケース
- [x] 指示取得APIがエラーを返す場合 → 空配列で初期化、エラーログ出力
- [x] タスク取得APIがエラーを返す場合 → 既存のエラーハンドリングで対応

## 8. ロールバック計画

問題が発生した場合は、以下の手順でロールバック：

1. `existingInstructions` stateの削除
2. `useEffect`から指示取得処理を削除
3. `handleSave`から指示存在チェックを削除

元の状態（BEチェックのみ）に戻る。

## 9. 関連ドキュメント

- [タスク実行ワークフロー](.clinerules/core/workflow.md)
- [フロントエンド規約](.cline/skills/frontend-develop-skill/docs/frontend.md)
- [projectApiService.ts](frontend/src/services/projectApiService.ts) - `getInstructions` API

## 10. 承認記録

- **計画書提示日時**: 2026-03-09 09:55
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
- [ ] `TaskRegistrationTab.tsx` - 指示存在チェック実装
- [ ] 手動テスト完了
- [ ] 動作確認完了

## 12. 振り返り

### うまくいった点
（実施後記入）

### 改善が必要な点
（実施後記入）

### 学んだこと
（実施後記入）
