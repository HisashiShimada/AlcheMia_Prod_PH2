# タスク計画書: 指示統計表示データ修正

## メタデータ
- **作成日時**: 2026-02-24 15:44
- **タスクID**: instruction_stats_display_fix
- **優先度**: 高
- **推定工数**: 0.5時間

## 1. タスク概要

指示確認タブの指示統計コンポーネント（InstructionStats）において、表示されるデータが正しくない問題を修正します。

### 問題の詳細

**現在の表示（誤り）:**
- 全体指示: 4
- プロジェクト指示: 1
- タスク指示: 2
- トランジション指示: 1

**正しい表示（期待値）:**
- 全体指示: 5
- プロジェクト指示: 3
- タスク指示: 1
- トランジション指示: 1

**APIレスポンスの実際のデータ:**
```json
{
  "data": [
    { "instruction_target": 3 },  // トランジション指示
    { "instruction_target": 2 },  // タスク指示
    { "instruction_target": 1 },  // プロジェクト指示
    { "instruction_target": 1 },  // プロジェクト指示
    { "instruction_target": 1 }   // プロジェクト指示
  ]
}
```

## 2. 目的と期待される成果

### 目的
バックエンドAPIレスポンスの`instruction_target`数値をフロントエンドの`targetType`文字列に正しく変換する

### 期待される成果
- [x] instruction_target変換マッピングの修正
- [ ] 指示統計が正しく表示される（プロジェクト指示: 3, タスク指示: 1, トランジション指示: 1）
- [ ] 各グループの件数表示が正しくなる

## 3. 実装ステップ

### Phase 1: 問題の原因特定
- [x] APIレスポンスの確認
- [x] convertApiToInstruction関数の確認
- [x] targetTypeMapのマッピング誤りを特定

### Phase 2: 修正実装
- [x] projectApiService.tsのconvertApiToInstruction関数を修正
  - targetTypeMapのマッピングを修正（0→1, 1→2, 2→3）

### Phase 3: 動作確認
- [ ] ブラウザで指示確認タブを開く
- [ ] 指示統計の表示を確認
- [ ] 各グループの展開・件数を確認

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/services/projectApiService.ts` - convertApiToInstruction関数のtargetTypeMap修正

### 影響を受ける機能
- 指示確認タブの指示統計表示
- 指示グループの件数表示
- フィルタリング後の統計計算

## 5. 技術的詳細

### 修正前のコード
```typescript
const targetTypeMap: Record<number, TargetType> = {
  0: 'file',
  1: 'task',
  2: 'transition'
};
```

### 修正後のコード
```typescript
const targetTypeMap: Record<number, TargetType> = {
  1: 'file',       // プロジェクト指示
  2: 'task',       // タスク指示
  3: 'transition'  // トランジション指示
};
```

### バックエンド仕様（参照）
- `instruction_target = 1`: プロジェクト指示（ファイル全体）
- `instruction_target = 2`: タスク指示
- `instruction_target = 3`: トランジション指示

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 他の画面での指示表示への影響 | 低 | 低 | convertApiToInstruction関数は指示確認タブでのみ使用されている |
| キャッシュによる表示更新遅延 | 低 | 低 | ブラウザのハードリフレッシュを実施 |

## 7. テスト計画

### 動作確認テスト
- [ ] 指示統計の数値が正しく表示される
  - 全体指示: 5
  - プロジェクト指示: 3
  - タスク指示: 1
  - トランジション指示: 1
- [ ] プロジェクト指示グループを展開して3件表示されることを確認
- [ ] タスク指示グループを展開して1件表示されることを確認
- [ ] トランジション指示グループを展開して1件表示されることを確認

### 回帰テスト
- [ ] 他のプロジェクトを選択しても正しく表示される
- [ ] メソッド・タスク選択によるフィルタリングが正しく動作する

## 8. ロールバック計画

修正箇所は1行のみのため、問題が発生した場合は以下の手順で即座にロールバック可能：
1. `frontend/src/services/projectApiService.ts`の該当行を元に戻す
2. ブラウザをリロード

## 9. 関連ドキュメント

- [指示確認タブ UI設計書](../design/ui/ui_instruction_confirmation_tab.md)
- [指示統計コンポーネント UI設計書](../design/ui/ui_instruction_stats.md)
- バックエンドAPI仕様: `GET /api/v1/projects/:projectName/worker-instructions`

## 10. 承認記録

- **計画書提示日時**: 2026-02-24 15:44
- **承認日時**: 2026-02-24 15:44
- **承認者コメント**: Act modeに切り替えて実行

## 11. 実施記録

### 実施日時
開始: 2026-02-24 15:44
完了: 2026-02-24 17:36（コード修正完了、動作確認待ち）

### 計画からの変更点
- **追加修正1**: バックエンドAPIが`instruction_target`/`priority`/`type`を文字列型で返していたため、型定義とマッピングの両方を修正
- **追加修正2**: `task_no`も文字列型またはnullであることが判明し、型定義を修正
- **追加修正3**: taskIdフォーマット不一致により、タスク指示がフィルタで除外される問題を発見・修正

### 発生した問題と解決方法

**問題1**: 最初の修正後も「タスク指示が0件」と表示された
- **原因**: APIレスポンスの値が文字列型（`"1"`, `"2"`, `"3"`）だったが、型定義が数値型を期待し、マッピングも数値キーを使用していた
- **解決**: `WorkerInstruction`型定義を文字列型に変更し、マッピングも文字列キー（`'1'`, `'2'`, `'3'`）に変更

**問題2**: さらに確認しても「タスク指示が0件」のまま（APIレスポンスは5件だが表示は4件）
- **原因**: `convertApiToInstruction`関数でのtaskId生成が`task_1`形式だったが、親コンポーネント（ExperimentWorkerMenu）のselectedTaskIdは`{projectId}-{methodId}-{taskNo}`形式だったため、フィルタリングで不一致となり除外されていた
- **解決**: taskId生成ロジックを`${apiData.project_id}-${apiData.method_id}-${apiData.task_no}`に修正し、完全なフォーマットに統一

**デバッグプロセス**:
1. デバッグログで変換処理が正しく動作していることを確認
2. フィルタリングロジックにデバッグログを追加
3. taskIdとselectedTaskIdの不一致を発見
4. taskId生成ロジックを修正

### 最終的な成果物
- [x] WorkerInstruction型定義修正（instruction_target, priority, type, task_noを文字列型に変更）
- [x] convertApiToInstruction関数のマッピング修正（文字列キーに変更）
- [x] convertApiToInstruction関数のtaskId生成修正（完全なフォーマットに統一）
- [x] デバッグログ削除
- [ ] 動作確認完了（ユーザーによるブラウザ確認待ち）

## 12. 振り返り

### うまくいった点
（作業完了後に記入）

### 改善が必要な点
（作業完了後に記入）

### 学んだこと
（作業完了後に記入）
