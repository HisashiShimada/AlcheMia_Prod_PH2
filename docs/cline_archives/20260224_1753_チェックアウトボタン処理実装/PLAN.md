# タスク計画書: チェックアウトボタン処理実装

## メタデータ
- **作成日時**: 2026-02-24 17:53
- **タスクID**: checkout-button-implementation
- **優先度**: 高
- **推定工数**: 6時間

## 1. タスク概要

プロジェクト管理画面のチェックアウトボタン押下時に、以下の4つの条件をチェックし、すべて満たす場合のみチェックアウトステータスを1に更新する処理を実装する。また、チェックアウト中（checkout_status = 1）の場合、タスク登録タブと指示送信タブの操作を制限する。

## 2. 目的と期待される成果

### 目的
- プロジェクトのチェックアウト処理に適切なバリデーションを実装する
- チェックアウト中のプロジェクトでデータの不整合を防ぐ

### 期待される成果
- [x] チェックアウト前の4つの条件チェックが実装される
- [x] 条件を満たす場合のみcheckout_statusが1に更新される
- [x] チェックアウト中はタスク登録タブ・指示送信タブが非活性化される
- [x] 適切なエラーメッセージがユーザーに表示される

## 3. 実装ステップ

### Phase 1: バックエンド - エンドポイント変更
- [ ] projectRoutes.tsのチェックアウトエンドポイントを/:projectName/checkoutに変更
- [ ] projectController.tsのcheckoutメソッドをprojectName受け取りに変更
  - [ ] projectNameからprojectIdを取得するロジック追加

### Phase 2: バックエンド - バリデーション機能追加
- [ ] projectService.tsのcheckoutメソッドに4つの条件チェックを追加
  - [ ] MAIMLファイル存在チェック（project_maiml_flg = true）
  - [ ] プロジェクトステータスチェック（project_status = 1：タスク実行待ち）
  - [ ] タスク登録完了チェック（project_taskテーブルにレコード存在）
  - [ ] 未送信指示チェック（project_instructionでinstruction_status = 0のレコードなし）
- [ ] 各チェックで失敗した場合の適切なエラーコードとメッセージを返す
- [ ] チェックアウト成功時のレスポンス形式を統一

### Phase 3: バックエンド - Repository層実装
- [ ] projectRepository.tsに必要なメソッドを追加
  - [ ] タスク登録数を取得するメソッド（countProjectTasks）
  - [ ] 未送信指示の存在をチェックするメソッド（hasUnsentInstructions）

### Phase 4: フロントエンド - チェックアウトボタン処理
- [ ] ProjectManagement.tsxのhandleToggleCheckoutを実装
  - [ ] projectApiService.tsにチェックアウトAPI呼び出しメソッドを追加
  - [ ] エラーハンドリングと適切なメッセージ表示
  - [ ] チェックアウト成功時のプロジェクト一覧更新

### Phase 5: フロントエンド - タブの制御ロジック
- [ ] タスク登録タブの非活性化制御
  - [ ] チェックアウト中（isCheckedOut = true）の場合、タブを非活性化
  - [ ] 非活性化時のツールチップメッセージ追加
- [ ] 指示送信タブの非活性化制御
  - [ ] チェックアウト中の場合、タブを非活性化
  - [ ] 非活性化時のツールチップメッセージ追加

### Phase 6: テスト実装
- [ ] バックエンドユニットテスト
  - [ ] projectService.checkout の各バリデーションテスト
  - [ ] エラーケースのテスト
- [ ] 統合テスト
  - [ ] チェックアウトAPI呼び出しテスト
  - [ ] タブ制御のテスト

## 4. 影響範囲

### 変更するファイル
1. `backend/src/routes/projectRoutes.ts` - チェックアウトエンドポイントをprojectNameパラメータに変更
2. `backend/src/controllers/projectController.ts` - checkoutメソッドをprojectName受け取りに変更
3. `backend/src/services/projectService.ts` - checkoutメソッドにバリデーション追加
4. `backend/src/repositories/projectRepository.ts` - タスク数カウント、未送信指示チェックメソッド追加
5. `frontend/src/services/projectApiService.ts` - チェックアウトAPI呼び出しメソッド追加
6. `frontend/src/components/project/ProjectManagement.tsx` - チェックアウトボタン処理、タブ制御実装

### 新規作成するファイル
1. `backend/tests/services/projectService.checkout.test.ts` - checkoutメソッドのテスト

### 影響を受ける機能
- プロジェクト管理画面のチェックアウト機能
- タスク登録タブ（チェックアウト中は非活性化）
- 指示送信タブ（チェックアウト中は非活性化）

## 5. 技術的詳細

### データベーススキーマ

**projectテーブル:**
```sql
- project_maiml_flg: BOOLEAN（MAIMLファイル有無）
- project_status: numeric(2,0)（プロジェクトステータス）
  - 0: プロジェクト計画中
  - 1: タスク実行待ち ← チェックアウト可能
  - 2: タスク実行中
  - 3: タスク結果レビュー待ち
  - 4: プロジェクト完了
  - 5: タスク異常終了
- checkout_status: numeric(2,0)（チェックアウトステータス）
  - 0: チェックイン中
  - 1: チェックアウト済 ← 更新対象
```

**project_taskテーブル:**
```sql
- organization_id: uuid
- project_id: uuid
- method_id: character varying
- task_name: character varying
- （その他のカラム）
```

**project_instructionテーブル:**
```sql
- organization_id: uuid
- project_id: uuid
- experiment_instruction_id: character varying
- instruction_status: numeric(1,0) ← 0:未送信、1:送信済（2026-02-24追加）
- instruction_date: timestamp
- （その他のカラム）
```

### チェックアウトバリデーション条件

1. **MAIMLファイル存在チェック**
   - `project.project_maiml_flg = true`
   - エラーコード: `CHECKOUT_NO_MAIML_FILE`
   - メッセージ: 「MAIMLファイルが存在しません」

2. **プロジェクトステータスチェック**
   - `project.project_status = 1`（タスク実行待ち）
   - エラーコード: `CHECKOUT_INVALID_STATUS`
   - メッセージ: 「プロジェクトステータスがタスク実行待ちではありません」

3. **タスク登録完了チェック**
   - `COUNT(*) FROM project_task WHERE organization_id = ? AND project_id = ? > 0`
   - エラーコード: `CHECKOUT_NO_TASKS`
   - メッセージ: 「タスクが登録されていません」

4. **未送信指示チェック**
   - `COUNT(*) FROM project_instruction WHERE organization_id = ? AND project_id = ? AND instruction_status = 0 = 0`
   - エラーコード: `CHECKOUT_UNSENT_INSTRUCTIONS`
   - メッセージ: 「未送信の指示が存在します」
   - 備考: instruction_status = 0 が未送信、1 が送信済（2026-02-24のマイグレーションで追加）

### API仕様

**既存エンドポイント（改修）:**
```
POST /api/v1/projects/:projectName/checkout
```

**リクエスト:**
```typescript
// パラメータのみ（ボディなし）
params: {
  projectName: string; // プロジェクト名
}
```

**レスポンス（成功）:**
```json
{
  "success": true,
  "data": {
    "projectId": "uuid",
    "projectName": "project_name",
    "checkoutStatus": 1,
    "checkoutUserId": "user_id",
    "checkoutAt": "2026-02-24T17:53:00.000Z"
  },
  "meta": {
    "timestamp": "2026-02-24T17:53:00.000Z",
    "requestId": "uuid"
  }
}
```

**レスポンス（エラー）:**
```json
{
  "success": false,
  "error": {
    "code": "CHECKOUT_NO_MAIML_FILE",
    "message": "MAIMLファイルが存在しません",
    "details": {
      "projectId": "uuid",
      "maimlFlg": false
    }
  },
  "meta": {
    "timestamp": "2026-02-24T17:53:00.000Z",
    "requestId": "uuid"
  }
}
```

### フロントエンド実装

**タブの非活性化制御:**
```typescript
const isCheckoutDisabled = selectedProject?.isCheckedOut === true;

// Tabsコンポーネントのitemsプロパティ
items={[
  {
    key: 'task_registration',
    label: 'タスク登録',
    disabled: isCheckoutDisabled,
    children: <TaskRegistrationTab ... />
  },
  {
    key: 'instruction_registration',
    label: '指示送信',
    disabled: isCheckoutDisabled,
    children: <InstructionRegistrationTab ... />
  }
]}
```

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 既存のcheckoutメソッドの実装と競合 | 高 | 中 | 既存実装を確認し、バリデーション追加のみに留める |
| チェックアウト中のタブ切り替えでエラー | 中 | 低 | タブ切り替え時のガード処理を追加 |
| 未送信指示の判定ロジックの不整合 | 高 | 低 | instruction_status = 0であることを明確に条件化 |
| プロジェクト一覧の更新タイミングのズレ | 中 | 中 | チェックアウト成功後に必ずrefetchProjectsを実行 |

## 7. テスト計画

### ユニットテスト

**projectService.checkout:**
- [ ] MAIMLファイルなし → エラー
- [ ] プロジェクトステータスが0（計画中） → エラー
- [ ] プロジェクトステータスが2（実行中） → エラー
- [ ] タスク登録なし → エラー
- [ ] 未送信指示あり → エラー
- [ ] すべての条件を満たす → 成功

**projectRepository:**
- [ ] countProjectTasks - レコードあり
- [ ] countProjectTasks - レコードなし
- [ ] hasUnsentInstructions - 未送信あり
- [ ] hasUnsentInstructions - 未送信なし

### 統合テスト
- [ ] チェックアウトAPIの正常系テスト
- [ ] チェックアウトAPIの異常系テスト（各バリデーションエラー）
- [ ] タブの非活性化テスト
- [ ] チェックアウト後のプロジェクト一覧更新テスト

### 手動テスト
- [ ] チェックアウトボタン押下 → 条件不足でエラー表示
- [ ] すべての条件を満たしてチェックアウト → 成功
- [ ] チェックアウト後にタスク登録タブをクリック → 非活性化
- [ ] チェックアウト後に指示送信タブをクリック → 非活性化

## 8. ロールバック計画

チェックアウト処理でエラーが発生した場合：
1. データベースの変更がない（バリデーション失敗のため）
2. フロントエンドは既存の状態を維持
3. エラーメッセージをユーザーに表示

実装後に問題が発生した場合：
1. バックエンド: checkoutメソッドのバリデーション処理をコメントアウト
2. フロントエンド: handleToggleCheckoutをTODOコメント状態に戻す
3. タブの非活性化制御を削除

## 9. 関連ドキュメント

- [プロジェクト管理画面設計書](../../design/ui/ui_project_management.md)（存在する場合）
- [データベーステーブル定義](../../design/db/ddl/project.sql)
- [コードマスター定義](../../design/db/code_master/public.code_master.csv)
- [既存チェックアウトAPI実装](../../../backend/src/controllers/projectController.ts)

## 10. 承認記録

- **計画書提示日時**: 2026-02-24 17:53
- **承認日時**: （承認時の日時を記入）
- **承認者コメント**: （ユーザーからのフィードバック）

## 11. 実施記録

### 実施日時
開始: （作業開始時の日時を記入）
完了: （作業完了時の日時を記入）

### 計画からの変更点
（実施中に発生した計画からの変更や追加作業）

### 発生した問題と解決方法
（実施中に発生した問題とその解決方法）

### 最終的な成果物
- [ ] バックエンドバリデーション実装
- [ ] フロントエンドチェックアウト処理実装
- [ ] タブ制御実装
- [ ] テスト実装

## 12. 振り返り

### うまくいった点
（成功要因）

### 改善が必要な点
（今後の改善点）

### 学んだこと
（このタスクから得られた知見）
