# タスク計画書: 実験記録タブのメソッド・タスク表示修正

## メタデータ
- **作成日時**: 2026-02-25 09:31
- **タスクID**: experiment-record-tab-display-fix
- **優先度**: 高
- **推定工数**: 1時間

## 1. タスク概要

実験記録タブ（ExperimentRecordTab）でメソッド・タスク選択時に、メソッドIDとタスクIDが表示されている問題を修正します。正しくはメソッド名とタスク番号が表示されるべきです。

## 2. 目的と期待される成果

### 目的
- 実験記録タブのAPI呼び出しを修正し、正しいデータを取得する
- メソッド選択欄にメソッド名を表示する
- タスク選択欄にタスク番号を表示する

### 期待される成果
- [x] 原因分析完了（プロジェクトID vs プロジェクト名の問題）
- [ ] ExperimentRecordTab.tsxの修正
- [ ] ExperimentWorkerMenu.tsxの修正
- [ ] 動作確認（実験記録タブでの表示が正しいこと）

## 3. 実装ステップ

### Phase 1: ExperimentRecordTab.tsx の修正
- [ ] Props定義に `selectedProjectName: string` を追加
- [ ] 関数定義の引数に `selectedProjectName` を追加
- [ ] API呼び出しを `getWorkerTasks(selectedProjectName)` に変更
- [ ] `useEffect`の依存配列に `selectedProjectName` を追加
- [ ] 条件分岐を `if (!selectedProjectName)` に変更
- [ ] デバッグログに `selectedProjectName` を追加

### Phase 2: ExperimentWorkerMenu.tsx の修正
- [ ] ExperimentRecordTabの呼び出しに `selectedProjectName={selectedProjectName}` を追加

### Phase 3: 動作確認
- [ ] ブラウザで実験記録タブを開く
- [ ] プロジェクトを選択する
- [ ] API呼び出しが成功することを確認（Network タブ）
- [ ] メソッド選択欄にメソッド名が表示されることを確認
- [ ] タスク選択欄にタスク番号が表示されることを確認

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx` - Props追加、API呼び出し修正
2. `frontend/src/components/menus/ExperimentWorkerMenu.tsx` - Props渡し修正

### 新規作成するファイル
なし

### 削除するファイル
なし

### 影響を受ける機能
- 実験記録タブのメソッド・タスク選択機能
- 指示確認タブは既に正しく動作しているため影響なし

## 5. 技術的詳細

### 問題の原因
ExperimentRecordTabでは、API呼び出し時にプロジェクトID（UUID）を使用していましたが、APIはプロジェクト名を期待していました。

```typescript
// ❌ 現状（誤り）
const result = await getWorkerTasks(selectedProject);  // プロジェクトID

// ✅ 修正後（正しい）
const result = await getWorkerTasks(selectedProjectName);  // プロジェクト名
```

### API仕様
- エンドポイント: `GET /api/v1/progress/projects/:projectName/worker-tasks`
- パラメータ: `:projectName` - プロジェクト名（文字列）
- 戻り値: メソッド一覧とタスク一覧

### InstructionConfirmationTab との比較
指示確認タブは既に正しく実装されており、`selectedProjectName` を受け取ってAPI呼び出しに使用しています。実験記録タブも同様の実装にします。

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 既存のAPI呼び出しが失敗する | 低 | 低 | InstructionConfirmationTabと同じ実装なので問題なし |
| 型定義の不整合 | 低 | 低 | TypeScriptのコンパイルエラーで検出可能 |
| 他のタブへの影響 | 低 | 低 | Props追加のみなので他のタブには影響なし |

## 7. テスト計画

### ユニットテスト
不要（既存のAPI呼び出しロジックのテストは存在しない）

### 統合テスト
不要

### 手動テスト
- [ ] プロジェクト未選択時の動作確認
- [ ] プロジェクト選択後のAPI呼び出し確認
- [ ] メソッド選択欄の表示確認（メソッド名が表示される）
- [ ] タスク選択欄の表示確認（タスク番号が表示される）
- [ ] 他のタブ（指示確認タブ、進捗確認タブ）への影響がないこと

## 8. ロールバック計画

1. Git で変更前のコミットに戻す
2. ブラウザのキャッシュをクリアして再読み込み

## 9. 関連ドキュメント

- `frontend/src/components/ExperimentWorker/InstructionConfirmationTab.tsx` - 正しい実装例
- `frontend/src/components/ExperimentWorker/MethodTaskSelector.tsx` - 共通コンポーネント
- `frontend/src/services/projectApiService.ts` - API呼び出し定義

## 10. 承認記録

- **計画書提示日時**: 2026-02-25 09:31
- **承認日時**: （承認時に記入）
- **承認者コメント**: （ユーザーからのフィードバック）

## 11. 実施記録

### 実施日時
開始: （作業開始時に記入）
完了: （作業完了時に記入）

### 計画からの変更点
（実施中に発生した計画からの変更や追加作業）

### 発生した問題と解決方法
（実施中に発生した問題とその解決方法）

### 最終的な成果物
- [ ] ExperimentRecordTab.tsx の修正完了
- [ ] ExperimentWorkerMenu.tsx の修正完了
- [ ] 動作確認完了

## 12. 振り返り

### うまくいった点
（作業完了後に記入）

### 改善が必要な点
（作業完了後に記入）

### 学んだこと
（作業完了後に記入）
