# Implementation Tasks: 問題一覧取得API

## Metadata
- **Feature**: issue-list-retrieval-api
- **Language**: ja
- **Generated**: 2026-02-05T19:08:00+09:00
- **Total Requirements**: 9
- **Parallel Execution**: Enabled

## Overview

本実装タスクは、実験作業者画面における問題一覧取得APIのバックエンド機能を実装します。プロジェクト、メソッド、タスク、トランジション単位で発生した問題を取得し、関連するコメントを親子関係として含めて表示する機能を提供します。

既存の問題管理システム（4エンドポイント実装済み）に問題一覧取得機能を追加することで、5エンドポイント中5エンドポイントが完全に実装され、問題管理機能が完成します。

## Implementation Tasks

### Phase 1: API層の実装

- [ ] 1. ルート層の実装 (P)
- [ ] 1.1 (P) 問題一覧取得エンドポイントの定義
  - GET /api/v1/issuesのルート定義を追加
  - 既存のミドルウェアチェーン（auth → tenantIsolation → permissionCheck）を適用
  - Worker以上のロール（Worker, Manager, Admin）のみアクセス可能に設定
  - _Requirements: 4_

- [ ] 1.2 (P) クエリパラメータのバリデーションルール定義
  - project_id（UUID形式、必須）のバリデーション
  - method_id（空文字列不可、必須）のバリデーション
  - task_no（正の整数、必須）のバリデーション
  - transition_id（空文字列不可、必須）のバリデーション
  - status（オプション）、issue_type（オプション）のバリデーション
  - handleValidationErrorsミドルウェアでエラー処理を実装
  - _Requirements: 3_

- [ ] 2. コントローラー層の実装 (P)
- [ ] 2.1 (P) リクエスト処理とレスポンス変換の実装
  - クエリパラメータを抽出してサービス層に渡す処理を実装
  - サービス層から返された問題一覧をApiResponse形式に変換
  - meta情報（timestamp、requestId）を含むレスポンスを生成
  - 200 OKステータスでレスポンスを返す
  - _Requirements: 1, 6_

- [ ] 2.2 (P) エラーハンドリングの実装
  - サービス層のエラーをnext()に渡して統一的に処理
  - データベースエラー時に500 Internal Server Errorを返す
  - バリデーションエラー詳細を含む400 Bad Requestを返す
  - エラーメッセージに機密情報を含めないように制御
  - Winston構造化ログでエラーを記録
  - _Requirements: 8_

### Phase 2: ビジネスロジック層の実装

- [ ] 3. サービス層の実装
- [ ] 3.1 問題一覧取得ロジックの実装
  - issue_target（project/task/transition）に基づく動的フィルタリング条件の構築
  - 問題一覧を取得するSQLクエリ（Query 1）を実装（JOINでprojects、organization_user）
  - created_at降順でソートして問題一覧を取得
  - すべてのクエリでorganization_idフィルタを適用（マルチテナント分離）
  - Parameterized Queriesを使用してSQLインジェクション対策を実施
  - _Requirements: 1, 2, 5, 9_

- [ ] 3.2 コメント一括取得と親子関係構築の実装
  - 取得した問題のissue_idを配列化してコメント一括取得（Query 2）を実装
  - コメント取得SQLクエリ（JOINでorganization_user）を実装
  - sequence_no昇順でソートしてコメントを取得
  - アプリケーション層でissue_idをキーにコメントをグループ化
  - 各問題のcommentsプロパティにコメント配列を設定
  - N+1問題を回避するための2段階クエリを実装
  - _Requirements: 1, 7_

- [ ] 3.3 パフォーマンス最適化の実装
  - JOINクエリを使用してデータベースアクセス回数を最小化（2回のみ）
  - 適切なインデックス（organization_id, project_id, status）を活用
  - 100件以下の問題を1秒以内に取得できることを確認
  - メモリ効率的なデータ処理を実装
  - _Requirements: 7_

### Phase 3: テストの実装

- [ ] 4. ユニットテストの実装 (P)
- [ ] 4.1 (P) サービス層のユニットテスト
  - issue_targetが'project'の場合のフィルタリング条件テスト
  - issue_targetが'task'の場合のフィルタリング条件テスト
  - issue_targetが'transition'の場合のフィルタリング条件テスト
  - オプショナルフィルタ（status、issue_type）の動作テスト
  - コメントの親子関係構築ロジックのテスト
  - organization_idフィルタが常に適用されることを確認
  - created_at降順、sequence_no昇順のソート動作テスト
  - _Requirements: 1, 2, 5_

- [ ] 4.2 (P) コントローラー層のユニットテスト
  - バリデーションエラー時の400エラーレスポンステスト
  - サービス層エラー時の500エラーレスポンステスト
  - 成功時のApiResponse形式レスポンステスト
  - meta情報（timestamp、requestId）が含まれることを確認
  - _Requirements: 6, 8_

- [ ] 5. 統合テストの実装 (P)
- [ ] 5.1 (P) 認証・認可の統合テスト
  - 認証なしでアクセスした場合の401エラーテスト
  - Worker未満の権限でアクセスした場合の403エラーテスト
  - Worker以上の権限で正常にアクセスできることを確認
  - JWTトークン検証が正しく動作することを確認
  - _Requirements: 4_

- [ ] 5.2 (P) バリデーションの統合テスト
  - 必須パラメータが欠けている場合の400エラーテスト
  - 不正なUUID形式のproject_idの場合の400エラーテスト
  - task_noが正の整数でない場合の400エラーテスト
  - method_idが空文字列の場合の400エラーテスト
  - transition_idが空文字列の場合の400エラーテスト
  - バリデーションエラーの詳細が含まれることを確認
  - _Requirements: 3_

- [ ] 5.3 (P) マルチテナント分離の統合テスト
  - 存在しないプロジェクトの場合に空配列を返すことを確認
  - 他組織のプロジェクトIDを指定した場合に空配列を返すことを確認
  - 自組織の問題のみが取得されることを確認
  - organization_idフィルタが正しく動作することを確認
  - _Requirements: 5_

- [ ] 5.4 (P) 正常系の統合テスト
  - 正常なリクエストで問題一覧とコメントが返されることを確認
  - statusフィルタが正しく動作することを確認
  - issue_typeフィルタが正しく動作することを確認
  - プロジェクト名、報告者名、投稿者名が含まれることを確認
  - コメントがsequence_no昇順でソートされることを確認
  - 問題がcreated_at降順でソートされることを確認
  - _Requirements: 1, 2_

- [ ] 5.5 (P) パフォーマンステスト
  - 問題10件・コメント50件の場合に500ms以内でレスポンスすることを確認
  - 問題100件・コメント500件の場合に1秒以内でレスポンスすることを確認
  - クエリ実行回数が2回のみであることを確認（N+1問題回避）
  - メモリ使用量が100MB以下であることを確認
  - _Requirements: 7_

## Requirements Coverage

| Requirement | Summary | Covered By Tasks |
|------------|---------|------------------|
| 1 | 問題一覧の取得 | 2.1, 3.1, 3.2, 4.1, 5.4 |
| 2 | 問題対象種別に基づくフィルタリング | 3.1, 4.1, 5.4 |
| 3 | 入力パラメータのバリデーション | 1.2, 2.1, 5.2 |
| 4 | 認証と認可 | 1.1, 5.1 |
| 5 | マルチテナント分離 | 3.1, 4.1, 5.3 |
| 6 | レスポンス形式の統一 | 2.1, 4.2 |
| 7 | パフォーマンス | 3.2, 3.3, 5.5 |
| 8 | エラーハンドリング | 2.2, 4.2 |
| 9 | セキュリティ | 3.1 |

**Coverage Status**: ✅ All 9 requirements covered

## Task Summary

- **Total Major Tasks**: 5
- **Total Sub-tasks**: 14
- **Parallel-capable Tasks**: 12 (marked with (P))
- **Sequential Tasks**: 2 (3.1-3.3 must be completed sequentially)
- **Estimated Total Effort**: 21-42 hours

## Notes

### Implementation Order Recommendations

1. **Start with Phase 1 (Tasks 1-2)**: API層の実装は並列実行可能です（タスク1とタスク2を同時に開始可能）
2. **Phase 2 (Task 3)**: サービス層の実装はPhase 1完了後に開始。タスク3.1 → 3.2 → 3.3の順で実装
3. **Phase 3 (Tasks 4-5)**: テストの実装はPhase 2完了後に開始可能。すべてのサブタスクは並列実行可能

### Critical Success Factors

- **マルチテナント分離の徹底**: すべてのDBクエリでorganization_idフィルタを適用
- **Parameterized Queriesの使用**: SQLインジェクション対策を必須実施
- **N+1問題の回避**: 2段階クエリ（問題一覧 + コメント一括取得）でパフォーマンスを保証
- **既存パターンの踏襲**: 既存の問題管理API（4エンドポイント）と統一されたインターフェースを維持

### Testing Focus Areas

- **マルチテナント分離**: 他組織のデータへのアクセスが完全にブロックされることを確認
- **issue_target条件分岐**: project/task/transitionの3パターンすべてを徹底的にテスト
- **パフォーマンス**: 100件以下の問題を1秒以内に取得できることを検証

### Integration Points

- **既存ファイル**: `backend/src/routes/issueRoutes.ts`, `backend/src/controllers/issueController.ts`, `backend/src/services/issueService.ts`
- **既存テーブル**: `issue`, `issue_comment`, `projects`, `organization_user`
- **既存ミドルウェア**: `auth`, `tenantIsolation`, `permissionCheck`, `handleValidationErrors`

### Risk Mitigation

- **複雑な条件分岐**: issue_target別フィルタリングは十分なユニットテストでカバー（タスク4.1）
- **パフォーマンス懸念**: 統合テスト時に実測してボトルネックを特定（タスク5.5）
- **マルチテナント漏洩**: 統合テストで他組織データへのアクセスを徹底検証（タスク5.3）

---

**Generated by**: Kiro spec-tasks workflow
**Next Steps**: Review and approve tasks, then execute with `/spec-impl issue-list-retrieval-api`

