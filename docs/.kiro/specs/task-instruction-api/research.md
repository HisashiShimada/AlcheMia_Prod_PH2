# Research Log: 指示送信（タスク作成）API実装

## 概要

**機能分類**: Extension（既存システムの拡張）  
**Discovery タイプ**: Light Discovery  
**作成日**: 2026-01-15

この機能は既存のプロジェクト管理システムに対する新規エンドポイントの追加であり、既存のアーキテクチャパターンとデータベース構造を活用します。

---

## Discovery Scope

### 実施した調査
1. **既存API仕様の分析** (`docs/design/api/api_project_management.md`)
   - セクション2.4に仕様が既に記載されていることを確認
   - リクエスト/レスポンス形式、バリデーション要件を確認
2. **既存テーブル構造の確認**
   - project, project_instruction, project_task, project_task_detail の4テーブル
   - 複合主キー構造とorganization_id必須制約を確認
3. **既存ミドルウェアチェーンの確認**
   - auth → tenantIsolation → permissionCheck の標準パターン
4. **既存バックエンド規約の確認**
   - Kysely使用、Parameterized Query必須
   - トランザクション管理の標準パターン

### スキップした調査
- 外部APIの調査（不要）
- 新規技術スタックの検討（既存スタックを使用）
- アーキテクチャパターンの評価（既存パターンを踏襲）

---

## Research Log

### 1. Integration Points（統合ポイント）

**既存エンドポイントとの関係:**
- プロジェクト作成API（POST /api/v1/projects）の次のステップとして機能
- プロジェクト詳細取得API（GET /api/v1/projects/:projectId）で作成結果を確認

**使用する既存ミドルウェア:**
- `auth`: JWT + Session Hybrid認証
- `tenantIsolation`: organization_id検証とreq.organizationIdへの格納
- `permissionCheck`: Manager以上の権限チェック

**使用する既存サービス:**
- データベース接続プール（Kysely経由）
- エラーハンドリングミドルウェア
- ロギングサービス（Winston）

### 2. Database Schema Integration（データベース統合）

**使用するテーブル（既存）:**

1. **project** - ステータス更新のみ
   - project_status: 0 → 1 に更新（プロジェクト計画中 → タスク実行待ち）

2. **project_instruction** - 新規レコード作成
   - 主キー: (organization_id, project_id, experiment_instruction_id)
   - experiment_instruction_id: UUID v4生成
   - instruction_target: 数値型（0: ファイル全体, 1: タスク, 2: トランジション）
   - priority: 数値型（0: 低, 1: 通常, 2: 中, 3: 高）
   - type: 数値型（0: 一般, 1: セットアップ, 2: 測定, 3: 安全, 4: 清掃）

3. **project_task** - メソッドごとにUPSERT
   - 主キー: (organization_id, project_id, method_id)
   - experiment_condition: 数値型（0: 全て同一条件, 1: 実験ごとに変更）
   - attempts_count: 試行回数（1〜999）

4. **project_task_detail** - タスクごとに新規作成
   - 主キー: (organization_id, project_id, method_id, task_no)
   - task_status: 0固定（実行待ち）
   - task_no: タスクごとに連番（1から開始）

**トランザクション境界:**
- 4テーブルへの操作を単一トランザクションで実行
- いずれか失敗時は全てロールバック

### 3. Existing Patterns to Follow（既存パターンの踏襲）

**ルート定義パターン:**
```typescript
router.post('/projects/:projectId/instructions',
  auth,
  tenantIsolation,
  permissionCheck(['manager', 'admin']),
  instructionController.create
);
```

**バリデーションパターン:**
- express-validatorまたはマニュアルバリデーション
- バリデーションエラー時は400 Bad Request
- 詳細なエラーメッセージをdetails配列で返却

**エラーハンドリングパターン:**
```typescript
try {
  // ビジネスロジック
} catch (error) {
  if (error instanceof ValidationError) {
    throw error; // エラーハンドリングミドルウェアが処理
  }
  throw new DatabaseError('Transaction failed', error);
}
```

**レスポンス形式:**
```typescript
{
  success: true,
  data: { summary: { totalTasks: 2, createdTasks: 2 } },
  meta: { timestamp: string, requestId: string }
}
```

### 4. Technology Alignment（技術スタック整合性）

**使用する技術（すべて既存）:**
- TypeScript 4.x
- Express.js 4.18.3
- Kysely（PostgreSQL用Query Builder）
- PostgreSQL 18+
- UUID v4（uuid package）

**変更なし:**
- 新規ライブラリの追加なし
- 既存のバージョンを維持

### 5. Architecture Pattern & Boundary（アーキテクチャとバウンダリ）

**適用パターン:**
- Layered Architecture（既存）
  - Routes → Middleware → Controller → Service → Repository

**コンポーネント境界:**
```
InstructionController
  ↓ 呼び出し
InstructionService (トランザクション管理)
  ↓ 呼び出し
ProjectRepository (project_statusの更新)
InstructionRepository (project_instructionへの挿入)
TaskRepository (project_task, project_task_detailへの挿入)
```

**バウンダリの責務:**
- Controller: リクエスト/レスポンス処理、バリデーション
- Service: ビジネスロジック、トランザクション管理
- Repository: DB操作のみ

### 6. Security & Authorization（セキュリティと認可）

**既存のセキュリティ機構を使用:**
- JWT + Session Hybrid認証（既存）
- organization_idフィルタ必須（既存）
- permissionCheck: Manager以上必須（既存）
- Parameterized Query必須（Kysely自動対応）

**追加のセキュリティ考慮事項:**
- プロジェクトステータスの事前確認（project_status = 0のみ許可）
- トランザクション中のロールバック処理

### 7. Performance Considerations（パフォーマンス考慮）

**目標レスポンスタイム:**
- 通常時: < 1000ms
- 10件以下のタスク: < 500ms

**最適化手法:**
- トランザクションを最小限の範囲に制限
- project_task_detailの一括挿入（複数行INSERT）
- 適切なインデックス使用（既存インデックスで対応可能）

### 8. Open Questions（未解決の質問）

要件書で既に明確化されているため、現時点で未解決の質問なし。

---

## Risks & Mitigation（リスクと対策）

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| トランザクション中のタイムアウト | 高 | 低 | タイムアウト設定、リトライロジック |
| 大量タスク登録時のパフォーマンス低下 | 中 | 中 | 一括INSERT、タスク数上限（100件）設定 |
| project_statusの競合更新 | 中 | 低 | 楽観的ロック、トランザクション分離レベルREAD COMMITTED |
| 割り当てユーザーの検証漏れ | 高 | 低 | サービス層での厳密な検証 |

---

## Design Decisions（設計決定事項）

### 決定1: トランザクション管理
**決定**: Kyselyのtransaction()メソッドを使用し、4テーブルへの操作を単一トランザクションで実行

**理由:**
- データ整合性の保証
- 部分的な更新の防止
- ロールバックの簡潔性

### 決定2: バリデーション層
**決定**: Controller層で基本バリデーション、Service層でビジネスロジックバリデーション

**理由:**
- 関心の分離
- テスタビリティ
- エラーメッセージの明確化

### 決定3: エラーハンドリング
**決定**: カスタムエラークラス（ValidationError, BusinessLogicError, DatabaseError）を使用

**理由:**
- 統一されたエラーレスポンス
- HTTPステータスコードの自動設定
- ログ記録の容易性

### 決定4: project_task_detailのレコード生成
**決定**: タスクごとにtrialCount分のレコードを生成（task_no連番）

**理由:**
- 各試行の個別管理
- 進捗追跡の粒度
- 実験作業者への明確な割り当て

---

## Implementation Notes（実装メモ）

### ファイル構成
```
backend/src/
├── routes/
│   └── projectRoutes.ts (既存ファイルに追加)
├── controllers/
│   └── instructionController.ts (新規)
├── services/
│   └── instructionService.ts (新規)
├── repositories/
│   ├── projectRepository.ts (既存、updateStatus追加)
│   ├── instructionRepository.ts (新規)
│   └── taskRepository.ts (既存または新規)
└── types/
    └── instruction.ts (新規、型定義)
```

### 依存関係
- 既存のauth, tenantIsolation, permissionCheckミドルウェア
- 既存のデータベース接続プール
- 既存のエラーハンドリングミドルウェア
- 既存のロギングサービス

### テスト戦略
- ユニットテスト: Service層のビジネスロジック
- 統合テスト: トランザクション全体の動作確認
- エラーケース: 各種バリデーションエラー、ロールバックシナリオ

---

## References（参考資料）

1. [既存API仕様](../../design/api/api_project_management.md#24-指示送信タスク作成)
2. [バックエンド規約](../../../.clinerules/development/backend.md)
3. [API設計ポリシー](../../../.clinerules/development/api.md)
4. [セキュリティ規約](../../../.clinerules/development/security.md)
5. [データベース設計](../../design/db/)

---

## 更新履歴

| 日付 | 変更内容 | 担当者 |
|------|----------|--------|
| 2026-01-15 | 初版作成（Light Discovery完了） | System |
