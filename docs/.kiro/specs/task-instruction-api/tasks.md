# 実装タスク: 指示送信（タスク作成）API実装

## タスク概要

本ドキュメントは、指示送信（タスク作成）APIの実装タスクを定義します。既存のプロジェクト管理システムに対する新規エンドポイント追加として、4つのデータベーステーブル（project、project_instruction、project_task、project_task_detail）に対するトランザクション管理機能を実装します。

**総タスク数**: 7メジャータスク、17サブタスク  
**推定工数**: 約45時間  
**並列実行**: 一部タスクは並列実行可能 (P)

---

## 実装タスク

### - [ ] 1. 型定義の作成

#### - [x] 1.1 (P) リクエスト・レスポンス型の定義
- InstructionInput、TaskInput、CreateInstructionRequest型を定義
- InstructionCreationSummary、CreateInstructionResponse型を定義
- targetType、priority、type、experimentConditionの列挙型を定義
- 各フィールドのJSDocコメントを追加
- _Requirements: 1, 4, 11_

#### - [x] 1.2 (P) ドメインモデル型の定義
- Project、Instruction、Task、TaskDetail型を定義
- データベーステーブルのカラムと型の対応を確認
- organization_id、project_id等の複合キー型を定義
- _Requirements: 7, 8, 9, 10_

---

### - [ ] 2. リポジトリ層の実装

#### - [x] 2.1 ProjectRepositoryの拡張
- findById()メソッドを実装（organization_idフィルタ必須）
- updateStatus()メソッドを実装（トランザクション対応）
- pgモジュール + Parameterized Queryを使用
- Parameterized Queryを確認
- _Requirements: 3, 5, 10, 13_

#### - [x] 2.2 InstructionRepositoryの作成
- createInstructions()メソッドを実装
- UUID v4生成ロジックを実装（crypto.randomUUID使用）
- 一括INSERT処理を実装
- instruction_date、instruction_user_idの自動設定
- トランザクション引数を受け取る設計
- _Requirements: 3, 7, 13_

#### - [x] 2.3 TaskRepositoryの作成
- upsertTasks()メソッドを実装（INSERT ... ON CONFLICT UPDATE）
- createTaskDetails()メソッドを実装（一括INSERT）
- task_no連番生成ロジックを実装（1から連番）
- task_statusのデフォルト値（0）を設定
- trialCountのデフォルト値（1）を設定
- トランザクション引数を受け取る設計
- _Requirements: 3, 8, 9, 13_

---

### - [x] 3. サービス層の実装

#### - [x] 3.1 InstructionServiceの作成
- createInstruction()メインメソッドを実装
- プロジェクト存在・ステータス確認ロジックを実装（トランザクション開始前）
- project_status = 0の検証を実装
- PostgreSQL PoolClientを使用したトランザクション管理（BEGIN/COMMIT/ROLLBACK）
- 4テーブルへの操作を順次実行（instruction → task → task_detail → project）
- エラー時の自動ロールバック処理（finally句でclient.release()）
- 作成サマリー（totalTasks, createdTasks）の生成
- 全9テスト成功（正常系2件、異常系6件、順序確認1件）
- _Requirements: 5, 6, 7, 8, 9, 10, 14_

---

### - [x] 4. コントローラ層の実装

#### - [x] 4.1 InstructionControllerの作成
- create()メソッドを実装
- リクエストパラメータ（projectId）の抽出と検証
- リクエストボディのバリデーション実装
- InstructionServiceの呼び出し
- 201 Createdレスポンスの生成
- エラーの適切な伝播
- 全12テスト成功（正常系2件、異常系8件、メタデータ確認2件）
- _Requirements: 1, 4, 11_

---

### - [ ] 5. バリデーション層の実装

#### - [ ] 5.1 バリデーションロジックの実装
- projectIdのUUID形式チェック
- tasks配列の必須チェック（最低1件）
- instructions配列の必須チェック（最低1件）
- methodIdの長さチェック（255文字以内）
- experimentConditionの範囲チェック（0または1）
- trialCountの範囲チェック（1〜999）
- contentの長さチェック（1〜1000文字）
- priority、type、targetTypeの範囲チェック
- targetType別の必須フィールドチェック（transitionId、taskNumber）
- バリデーションエラー時の詳細メッセージ生成
- _Requirements: 4_

---

### - [ ] 6. ルーティングとミドルウェアの統合

#### - [ ] 6.1 ルート定義の追加
- projectRoutes.tsにPOST /projects/:projectId/instructionsを追加
- ミドルウェアチェーン（auth → tenantIsolation → permissionCheck['manager', 'admin']）を適用
- InstructionControllerをマウント
- _Requirements: 1, 2, 3_

---

### - [ ] 7. テストの実装

#### - [ ] 7.1 (P) ユニットテストの作成
- InstructionServiceのビジネスロジックテスト
- トランザクション成功・失敗ケースのテスト
- プロジェクトステータス検証ロジックのテスト
- Repository層のモックを使用
- _Requirements: 5, 6, 7, 8, 9, 10_

#### - [ ] 7.2 (P) 統合テストの作成
- 正常系: 認証済みManagerによる指示送信テスト
- 正常系: 複数タスク・複数指示の一括作成テスト
- 異常系: 未認証ユーザーによるアクセステスト（401）
- 異常系: 権限不足ユーザー（Worker）によるアクセステスト（403）
- 異常系: 存在しないprojectIdのテスト（404）
- 異常系: project_status != 0のテスト（409）
- 異常系: tasks配列が空のテスト（400）
- 異常系: トランザクションエラーのロールバック確認（500）
- _Requirements: 1, 2, 3, 4, 5, 6, 12_

#### - [ ] 7.3 (P) バリデーションテストの作成
- 各バリデーションルールのテスト
- エラーメッセージの確認
- details配列の内容検証
- _Requirements: 4, 12_

---

## タスク依存関係

```
1. 型定義 (P)
   ↓
2. リポジトリ層
   2.1 → 2.2 → 2.3 (順次実行、トランザクション設計共有のため)
   ↓
3. サービス層 (全リポジトリ完了後)
   ↓
4. コントローラ層 (サービス層完了後)
   ↓
5. バリデーション層 (コントローラ層と並行可能だが、統合のため後)
   ↓
6. ルーティング統合 (全コンポーネント完了後)
   ↓
7. テスト (コア実装完了後、7.1, 7.2, 7.3は並列実行可能)
```

---

## パフォーマンス目標

- レスポンスタイム: 通常時 < 1000ms、10件以下のタスク < 500ms
- トランザクションタイムアウト: 30秒
- タスク数上限: 100件/リクエスト

---

## 品質基準

- ✅ 全15要件をタスクにマッピング完了
- ✅ 単体テストカバレッジ: 80%以上
- ✅ 統合テスト: 主要フロー100%
- ✅ Parameterized Query必須（SQLインジェクション対策）
- ✅ organization_idフィルタ必須（マルチテナント分離）
- ✅ エラーハンドリング完備

---

## 実装時の注意事項

### セキュリティ
- 全SQLクエリでParameterized Query使用
- 全テーブル操作でorganization_idフィルタ適用
- JWTトークン・セッション検証必須
- Manager以上の権限チェック必須

### データ整合性
- 4テーブルへの操作を単一トランザクションで実行
- エラー時は必ず全ロールバック
- project_status = 0の検証をトランザクション開始前に実施

### パフォーマンス
- 一括INSERT使用（project_instruction、project_task_detail）
- UPSERT使用（project_task）
- トランザクション範囲を最小化
- タスク数上限100件でリソース保護

---

## 完了基準

- [ ] 全タスクのチェックボックスが完了
- [ ] 全テストが成功
- [ ] コードレビュー完了
- [ ] APIドキュメント更新
- [ ] デプロイ準備完了

---

## 参照ドキュメント

- [要件定義](requirements.md)
- [設計書](design.md)
- [調査ログ](research.md)
- [バックエンド規約](../../../.clinerules/development/backend.md)
- [API設計ポリシー](../../../.clinerules/development/api.md)
- [セキュリティ規約](../../../.clinerules/development/security.md)
