# Research & Design Decisions

---
**Purpose**: プロジェクトMAIMLファイル取得API実装のための調査結果と設計判断を記録

**Usage**: 既存プロジェクトAPI拡張のため、軽量な発見プロセスを実施
---

## Summary
- **Feature**: `project-maiml-retrieval-api`
- **Discovery Scope**: Extension（既存プロジェクト管理APIへのエンドポイント追加）
- **Key Findings**:
  - 既存のprojectRoutesパターンに準拠したルート定義が必要
  - projectService.getProjectFiles()の実装パターンを参考に、S3からXMLコンテンツを取得
  - storageService.downloadFile()を使用したファイル取得が確立されている

## Research Log

### Topic 1: 既存プロジェクトAPIパターンの分析

**Context**: 新しいエンドポイントを既存のプロジェクト管理APIに統合する必要がある

**Sources Consulted**:
- `backend/src/routes/projectRoutes.ts`
- `backend/src/controllers/projectController.ts`
- `backend/src/services/projectService.ts`

**Findings**:
- **ルート定義パターン**: 
  - パスパラメータに`:projectId`（UUID形式）を使用
  - 認証ミドルウェア（`authMiddleware`）を必須適用
  - バリデーションミドルウェアで入力検証
- **コントローラパターン**:
  - UUID形式バリデーション（正規表現: `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`）
  - `req.user`から`organizationId`と`userId`を取得
  - `organization_prefix`取得のためのDBクエリ実行
  - Service層呼び出しとエラーハンドリング
  - HTTPステータスコードマッピング（400/401/403/404/500）
- **サービス層パターン**:
  - `ServiceResult<T>`型でラップされたレスポンス
  - `organization_id`フィルタリングの必須化
  - PostgreSQL Parameterized Queriesの使用
  - エラー時の詳細なエラーコード（`RESOURCE_NOT_FOUND`, `SYSTEM_DATABASE_ERROR`等）

**Implications**:
- 新しいエンドポイント`GET /api/v1/projects/:projectId/maiml`は既存パターンに準拠
- 認証・認可・マルチテナント分離は既存ミドルウェアで実現可能
- エラーハンドリング戦略は統一されている

### Topic 2: S3ファイル取得パターン

**Context**: プロジェクトの最新MAIMLファイルをS3から取得する必要がある

**Sources Consulted**:
- `backend/src/services/storageService.ts`
- `.clinerules/references/s3_structure.md`
- `backend/src/services/projectService.ts` (getProjectFiles実装)

**Findings**:
- **S3パス構造**: `org_{organization_prefix}/projects/{project_name}/{project_name}.maiml`
- **storageServiceメソッド**:
  - `downloadFile(organizationPrefix, filePath)`: Bufferでファイル内容を取得
  - マルチテナント分離が自動適用される（`buildKey()`内部でプレフィックス付与）
- **既存実装パターン** (projectService.getProjectFiles):
  - organization_prefixは`organizationId`をそのまま使用
  - グレースフルエラーハンドリング（S3エラー時は空配列返却）
  - 署名付きURL生成はgetSignedUrl()を使用

**Implications**:
- storageService.downloadFile()でXML内容をBuffer形式で取得
- BufferをUTF-8文字列に変換してレスポンス
- S3ファイル不在時は404エラー（FILE_NOT_FOUND）
- パスは`projects/${projectName}/${projectName}.maiml`

### Topic 3: データベースクエリパターン

**Context**: プロジェクト情報とorganization_prefixの取得が必要

**Sources Consulted**:
- 既存のprojectController.getById実装
- 既存のprojectService実装

**Findings**:
- **プロジェクト存在確認クエリ**:
  ```sql
  SELECT project_id, project_name
  FROM project
  WHERE organization_id = $1 AND project_id = $2
  ```
- **organization_prefix取得クエリ**:
  ```sql
  SELECT organization_prefix 
  FROM organization 
  WHERE organization_id = $1
  ```
- **Parameterized Queries**: すべてのクエリで`$1`, `$2`等のプレースホルダーを使用
- **organization_idフィルタ**: すべてのクエリで必須（マルチテナント分離）

**Implications**:
- プロジェクト存在確認は必須ステップ
- organization_idフィルタで他組織へのアクセスを防止
- クエリ失敗時はデータベースエラーとして処理

### Topic 4: レスポンス形式の統一

**Context**: 既存APIとの一貫性を保つ必要がある

**Sources Consulted**:
- requirements.md（Requirement 5）
- 既存のprojectController実装

**Findings**:
- **成功レスポンス形式**:
  ```json
  {
    "success": true,
    "data": { ... },
    "meta": {
      "timestamp": "ISO8601",
      "requestId": "UUID"
    }
  }
  ```
- **エラーレスポンス形式**:
  ```json
  {
    "success": false,
    "error": {
      "code": "ERROR_CODE",
      "message": "メッセージ"
    },
    "meta": {
      "timestamp": "ISO8601",
      "requestId": "UUID"
    }
  }
  ```
- **requestId生成**: `uuidv4()`を使用
- **Content-Type**: `application/json`

**Implications**:
- 既存パターンに準拠したレスポンス形式
- MAIMLファイル内容（XML）はdata.content内に文字列として格納
- メタ情報（file_size, loaded_at等）も含める

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| RESTful Extension | 既存プロジェクトAPIに新エンドポイント追加 | 既存パターンとの一貫性、実装コスト低 | なし | ✅ 選択 |
| 独立サービス | MAIMLファイル専用のマイクロサービス化 | 独立したスケーリング可能 | オーバーエンジニアリング、複雑性増加 | ❌ 却下 |

## Design Decisions

### Decision: RESTful Extension Pattern

- **Context**: 既存のプロジェクト管理APIに新しいエンドポイントを追加する必要がある
- **Alternatives Considered**:
  1. **RESTful Extension**: 既存のprojectRoutesにエンドポイント追加
  2. **独立サービス**: MAIMLファイル専用のマイクロサービス
- **Selected Approach**: RESTful Extension（Option 1）
- **Rationale**: 
  - プロジェクトリソースの一部としてMAIMLファイルを扱うのが自然
  - 既存の認証・認可・マルチテナント分離機構を再利用可能
  - 実装コストが低く、保守性が高い
  - オーバーエンジニアリングを回避
- **Trade-offs**: 
  - **Benefits**: 一貫性、実装速度、保守性
  - **Compromises**: 独立スケーリングは不可（現時点では不要）
- **Follow-up**: なし

### Decision: storageService.downloadFile()の使用

- **Context**: S3からMAIMLファイルを取得する方法
- **Alternatives Considered**:
  1. **downloadFile()**: Buffer形式でファイル内容を取得
  2. **getSignedUrl()**: 署名付きURLを生成してフロントエンドが直接取得
- **Selected Approach**: downloadFile()（Option 1）
- **Rationale**:
  - バックエンドでXML内容を検証・加工可能
  - セキュリティ: S3への直接アクセスを制限
  - 将来的なキャッシング実装が容易
- **Trade-offs**:
  - **Benefits**: セキュリティ、柔軟性、検証可能性
  - **Compromises**: バックエンドのメモリ消費（10MB以下なので問題なし）
- **Follow-up**: 将来的にキャッシング層を追加する可能性

### Decision: UTF-8文字列でXMLを返却

- **Context**: MAIMLファイル（XML）の返却形式
- **Alternatives Considered**:
  1. **UTF-8文字列**: `data.content`内に文字列として格納
  2. **Base64エンコード**: バイナリデータとして返却
  3. **JSONパース**: XMLをJSONに変換して返却
- **Selected Approach**: UTF-8文字列（Option 1）
- **Rationale**:
  - フロントエンドのXMLパーサーと互換性が高い
  - データサイズが小さい（Base64は不要）
  - XML構造をそのまま保持（JSON変換は情報損失のリスク）
- **Trade-offs**:
  - **Benefits**: シンプル、互換性、情報保持
  - **Compromises**: なし
- **Follow-up**: なし

## Risks & Mitigations

- **Risk 1: S3接続タイムアウト** — 10秒のタイムアウトを設定（非機能要件）、エラー時は500エラーを返却
- **Risk 2: 大容量ファイル** — 10MB以下を推奨、それ以上はパフォーマンス劣化の可能性（要件に記載済み）
- **Risk 3: organization_id漏洩** — Parameterized Queriesとorganization_idフィルタで防止、既存パターンで実証済み

## References

- [S3構造定義](.clinerules/references/s3_structure.md) — マルチテナント分離とファイルパス規約
- [セキュリティ規約](.clinerules/development/security.md) — 認証・認可・マルチテナント分離
- [バックエンド規約](.clinerules/development/backend.md) — レイヤードアーキテクチャとエラーハンドリング
- [API設計ポリシー](.clinerules/development/api.md) — RESTful API設計原則
- [既存実装] backend/src/services/projectService.ts — getProjectFiles()の実装パターン
