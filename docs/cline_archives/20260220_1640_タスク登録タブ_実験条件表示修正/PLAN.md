# タスク計画書: タスク登録タブ_実験条件表示修正

## メタデータ
- **作成日時**: 2026-02-20 16:40
- **タスクID**: タスク登録タブ_実験条件表示修正
- **優先度**: 高
- **推定工数**: 3時間

## 1. タスク概要

**プロジェクト管理画面のタスク登録タブ**にて、タスク登録後にDBからタスク情報を取得した際に、実験条件のドロップダウンリストにDBに登録されたコード値（数値）が初期値として正しく表示されない問題を修正する。

## 2. 目的と期待される成果

### 目的
タスク登録後、DBから取得した実験条件の値がドロップダウンリストの初期値として正しく選択された状態で表示されるようにする

### 期待される成果
- [x] 原因特定：DBから取得したexperimentConditionとSelectコンポーネントのoptions値の型不一致
- [ ] DBから取得したexperimentCondition値の型を確認
- [ ] Selectコンポーネントのoptions値の型を確認  
- [ ] 型の不一致を解消し、初期値が正しく表示されるように修正

## 3. 実装ステップ

### Phase 1: 原因調査と特定
- [x] TaskRegistrationTab.tsxの実装確認
- [x] DBから取得したexperimentConditionの値と型の確認
- [x] コードマスターAPIから取得したoptionsの値と型の確認
- [ ] バックエンドのタスク登録取得APIの実装確認
- [ ] 型の不一致箇所の特定

### Phase 2: 修正実装
- [ ] バックエンド：タスク登録取得APIでexperimentConditionを適切な型で返すように修正
- [ ] フロントエンド：DBから取得した値とSelectのoptions値の型を一致させる
- [ ] 必要に応じて型変換処理を追加

### Phase 3: テスト
- [ ] タスク登録後、画面をリロードしてドロップダウンの初期値が正しく表示されることを確認
- [ ] 実験条件を変更して保存→リロードし、変更後の値が正しく表示されることを確認
- [ ] 既存機能（タスク登録、保存、ドラッグ&ドロップ等）が正常に動作することを確認

## 4. 影響範囲

### 変更するファイル
1. `backend/src/controllers/taskRegistrationController.ts` - タスク登録取得APIの型変換処理
2. `frontend/src/components/project/TaskRegistrationTab.tsx` - experimentConditionの型処理
3. `backend/src/types/taskRegistration.ts`（存在する場合） - TaskDetail型定義の確認・修正

### 新規作成するファイル
なし

### 削除するファイル
なし

### 影響を受ける機能
- プロジェクト管理画面 > タスク登録タブ
- タスク登録機能（実験条件の保存・取得・表示）

## 5. 技術的詳細

### 問題の原因

**発見事項:**
1. プロジェクト管理画面のタスク登録タブ（`TaskRegistrationTab.tsx`）で実験条件のドロップダウンを表示
2. DBの`project_task`テーブルの`experiment_condition`カラムは`numeric(2,0)`型（数値）
3. コードマスターAPI（`codeMasterService.ts`）は数値に変換して返す:
   ```typescript
   value: isNaN(Number(cm.code_value)) ? cm.code_value : Number(cm.code_value)
   ```
4. TaskRegistrationTab.tsxでDBから取得した値をそのまま`experimentCondition`に設定:
   ```typescript
   experimentCondition: task.experimentCondition,
   ```
5. Selectコンポーネントで初期値として表示:
   ```typescript
   <Select
     value={record.experimentCondition}
     options={experimentConditionSelectOptions}
   />
   ```

**問題点:**
- DBから取得した`experimentCondition`の値（数値または文字列）とコードマスターAPIから取得した`options`の`value`の型が一致していない可能性
- 型が一致しないため、Selectコンポーネントが初期値を認識できず、ドロップダウンに数値（コード値）が表示されてしまう

**調査が必要な箇所:**
1. バックエンドのタスク登録取得API（`getTaskRegistration`）が返す`experimentCondition`の型
2. フロントエンドでDBから取得した値をSelectコンポーネントに渡す際の型変換処理

### 実装方針

1. バックエンドのタスク登録取得APIでexperimentConditionを**数値型**で返すことを保証
2. フロントエンドでexperimentConditionを**数値型**として扱うことを保証
3. Selectコンポーネントのvalueとoptionsのvalueの型を一致させる（両方とも数値型）

### セキュリティ考慮事項
- [ ] マルチテナント分離：既存のAPIは`organization_id`フィルタを適用済み
- [ ] 型安全性：TypeScriptの型定義を正しく適用し、型エラーを防ぐ

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 型変換処理でデータが欠損する | 中 | 低 | 既存の値を保持しつつ型変換を行う |
| 他の箇所でexperimentConditionを使用している | 中 | 中 | 全体検索で影響範囲を確認 |
| コードマスターAPIが文字列を返す場合がある | 低 | 低 | 型ガードで数値・文字列の両方に対応 |
| 既存のテストが失敗する | 低 | 低 | 型変更のみなので影響は最小限 |

## 7. テスト計画

### ユニットテスト
- [ ] バックエンドのタスク登録取得APIのレスポンス型テスト
- [ ] フロントエンドのexperimentCondition値の型テスト

### 統合テスト
- [ ] GET /api/v1/projects/:projectName/task-registration APIのテスト
  - レスポンスのexperimentConditionが数値型であることを確認

### 手動テスト
- [ ] プロジェクト管理画面 > タスク登録タブを開く
- [ ] 実験条件を設定してタスクを保存
- [ ] 画面をリロードして、ドロップダウンに選択した実験条件が正しく表示されることを確認（コード値ではなく表示名）
- [ ] 実験条件を変更して保存→リロードし、変更後の値が正しく表示されることを確認
- [ ] ドラッグ&ドロップ、作業順序変更、試行回数変更などの既存機能が正常に動作することを確認

## 8. ロールバック計画

万が一問題が発生した場合は、以下の手順でロールバックします：

1. 変更したファイルをGitでrevertする
2. バックエンドサーバーを再起動
3. フロントエンドをリビルド
4. 既存機能が正常に動作することを確認

## 9. 関連ドキュメント

- [DBテーブル定義](../../design/db/ddl/project_task.sql)
- [TypeScript型定義規約](../../../.clinerules/development/typescript.md)
- [データベース操作規約](../../../.clinerules/development/database.md)
- [コーディング規約](../../../.clinerules/development/config.md)

## 10. 承認記録

- **計画書提示日時**: 2026-02-20 16:40
- **承認日時**: （ユーザー承認待ち）
- **承認者コメント**: （承認後に記入）

## 11. 実施記録

### 実施日時
開始: 2026-02-20 16:40
完了: 2026-02-20 16:52

### 計画からの変更点
- 当初はバックエンドAPIの修正を検討していたが、フロントエンドでの型変換で解決できた
- SQLクエリの修正は不要だった（experiment_conditionは正しく取得されていた）

### 発生した問題と解決方法
**問題:** DBから取得したexperimentConditionの値（数値型）が、Selectコンポーネントのoptions.valueと型不一致を起こしていた

**原因:** APIレスポンスのJSONシリアライゼーション時に数値が文字列に変換されていた可能性、またはフロントエンドでの型変換が不足していた

**解決方法:** フロントエンドのTaskRegistrationTab.tsxで、DBから取得した値を`Number()`で明示的に数値型に変換することで、Selectコンポーネントのvalueとoptions.valueの型を一致させた

### 最終的な成果物
- [x] フロントエンド実装完了（TaskRegistrationTab.tsx修正）
- [x] 型変換処理追加（experimentConditionを明示的に数値型に変換）
- [x] デバッグログ追加（開発時の確認用）
- [x] テスト実施完了（ユーザーによる動作確認済み）
- [x] 問題解決確認（表示名が正しく表示されることを確認）

## 12. 振り返り

### うまくいった点
- ユーザーとの対話を通じて、問題の真の原因（ドロップダウンに数値が表示される）を正しく理解できた
- フロントエンドでの型変換という最小限の修正で問題を解決できた
- デバッグログを追加することで、今後同様の問題が発生した際の調査が容易になった

### 改善が必要な点
- 初期調査で問題の本質を誤認識し、SQLクエリやバックエンドAPIを調査する方向に進んでしまった
- ユーザーからの問題報告を最初から正しく理解できれば、より早く解決できた
- APIレスポンスとフロントエンドでの型の扱いについて、事前に確認すべきだった

### 学んだこと
- JSONシリアライゼーション時に数値型が文字列に変換される可能性があることを再認識
- Ant DesignのSelectコンポーネントは、valueとoptions.valueの型が厳密に一致しないと初期値を認識できない
- フロントエンドで外部APIから取得した数値は、明示的に`Number()`で変換するべき
- ユーザーからの問題報告は、「何が期待されているか」と「実際に何が表示されているか」を具体的に確認することが重要
