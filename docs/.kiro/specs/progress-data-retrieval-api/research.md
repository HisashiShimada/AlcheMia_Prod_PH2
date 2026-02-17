# Research & Design Decisions

---
**Feature**: progress-data-retrieval-api
**Discovery Scope**: Extension (既存システムへの機能拡張)
**Key Findings**:
- 既存のMAIMLパーサーは検証機能のみで、構造抽出機能が不足
- 新規にMAIML構造抽出ユーティリティの設計が必要
- 既存のstorageService、authMiddleware、標準レスポンス形式を活用可能
---

## Summary

本APIは、既存の進捗監視システムに対するデータ取得機能の拡張です。主な技術的課題は、MAIMLファイルからメソッド構造とトランジション情報を抽出する機能の設計です。

## Research Log

### MAIML構造抽出機能の調査

**Context**: 要件では`parseMultipleMethodsStructure`関数の使用が想定されているが、既存コードベースに存在しない

**Sources Consulted**:
- `backend/src/utils/maimlParser.ts` - 既存のMAIML検証パーサー
- `backend/src/utils/maimlTypeConverter.ts` - XML型変換ユーティリティ
- 要件定義書の実装例

**Findings**:
- 既存の`maimlParser.ts`は**検証(validation)機能のみ**を提供
- fast-xml-parserを使用してXMLをパース済み
- メソッド構造抽出機能は**新規実装が必要**
- パースオプションで`method`要素を配列として扱う設定が存在

**Implications**:
- 新規ユーティリティ関数`parseMultipleMethodsStructure`を設計
- 既存のfast-xml-parserインフラを再利用
- メソッド情報(methodId, methodName, petriNet構造)を抽出
- トランジション配列(id, name)を返却

### データベーススキーマ分析

**Context**: project_taskとexperiment_recordテーブルの関係性

**Sources Consulted**:
- `backend/src/types/task.ts` - タスク型定義
- `backend/src/repositories/taskRepository.ts` - タスクリポジトリ
- `backend/src/services/taskService.ts` - タスクサービス

**Findings**:
- `project_task`: タスク基本情報（task_id, project_id, method_id, task_no, organization_id）
- `experiment_record`: 実験記録データ（task_id, transition_id, status, progressと関連）
- organization_idによるマルチテナント分離が必須
- Kysely風のクエリビルダーを使用（`.selectFrom()`, `.where()`, `.select()`, `.execute()`）

**Implications**:
- すべてのクエリにorganization_idフィルタを含める
- JOIN操作でprojectテーブルからproject_nameを取得
- トランジション単位の進捗はexperiment_recordテーブルから取得

### 認証・認可ミドルウェアパターン

**Context**: 既存の認証フローの理解

**Sources Consulted**:
- `backend/src/middleware/authMiddleware.ts`
- `backend/src/controllers/instructionController.ts`
- API仕様書

**Findings**:
- `authMiddleware`: JWTトークン検証、req.userにユーザー情報格納
- `permissionCheck`: ロールベース権限チェック（別途実装）
- `tenantIsolation`: req.organizationIdを設定（既存実装から推測）
- ミドルウェアチェーン: auth → tenantIsolation → permissionCheck

**Implications**:
- ルート定義で標準ミドルウェアチェーンを適用
- コントローラーで`req.user.organizationId`を使用
- experiment_admin, experiment_worker, system_adminロールを許可

### ストレージサービス統合

**Context**: MAIMLファイルのダウンロード方法

**Sources Consulted**:
- `backend/src/services/storageService.ts`
- S3/Swiftフォルダ構成仕様

**Findings**:
- `storageService.downloadFile(organizationId, filePath)`: Buffer形式で返却
- ファイルパス: `projects/{project_name}/{project_name}.maiml`
- organization_prefixは内部で自動付与（`org_{organizationId}/`）
- エラーハンドリング: ファイル不存在時は例外スロー

**Implications**:
- project_nameをDBから取得後、storageServiceを呼び出し
- ダウンロードしたBufferを文字列変換してパーサーに渡す
- エラー時は500 Internal Server Errorを返却

### 進捗計算ロジック

**Context**: トランジション単位の進捗率とステータスの算出方法

**Sources Consulted**:
- API仕様書の実装例
- 要件定義書のAcceptance Criteria

**Findings**:
- 個別進捗率: 0～100の整数値
- 全体進捗率: 全トランジションの進捗率平均値（小数点第1位）
- ステータス分類: not_started (0%), in_progress (1-99%), completed (100%)
- データ有無: experiment_recordテーブルのレコード存在チェック

**Implications**:
- experiment_recordから最新レコードを取得（ORDER BY update_at DESC LIMIT 1）
- データ件数はCOUNT集計で取得
- ステータスがnullの場合はnot_startedとして扱う

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Controller-Service-Repository | 既存パターン踏襲 | コード一貫性、保守性、テスト容易性 | 新規レイヤー追加なし | ✅ 採用：既存プロジェクトの標準パターン |
| Direct Controller-DB | コントローラーで直接DB操作 | シンプル、高速 | テスト困難、ビジネスロジック分離不可 | ❌ 不採用：保守性低下 |
| Microservice分離 | 進捗API専用サービス | スケーラビリティ | 複雑性増加、通信オーバーヘッド | ❌ 不採用：過剰設計 |

## Design Decisions

### Decision: MAIML構造抽出の実装方式

**Context**: MAIMLファイルからメソッドとトランジション構造を抽出する必要があるが、既存の`parseMultipleMethodsStructure`関数は存在しない

**Alternatives Considered**:
1. 既存maimlParserを拡張して構造抽出機能を追加
2. 新規ユーティリティ関数を別ファイルで作成
3. サービス層に直接XMLパース処理を実装

**Selected Approach**: オプション2 - 新規ユーティリティ関数の作成

**Rationale**:
- 既存maimlParserは検証に特化しており、責任分離の原則に従う
- 再利用可能なユーティリティとして独立化
- fast-xml-parserのパース結果を変換する軽量な関数として実装
- テスト容易性の確保

**Trade-offs**:
- **Benefits**: 関心の分離、テスト容易性、再利用性
- **Compromises**: ファイル数の増加、既存コードとの統合作業

**Follow-up**:
- 実装時にXMLパースエラーハンドリングを適切に実装
- メソッドIDの一意性検証を追加検討
- パフォーマンステスト（大規模MAIMLファイル）

### Decision: 並列処理によるパフォーマンス最適化

**Context**: 複数トランジションの実験記録を取得する際のパフォーマンス懸念

**Alternatives Considered**:
1. 順次処理（forループ + await）
2. Promise.all並列処理
3. データベース側でのJOIN集計

**Selected Approach**: オプション2 - Promise.all並列処理

**Rationale**:
- 各トランジションのデータ取得は独立しており並列化可能
- データベースコネクションプールで並列クエリをサポート
- レスポンス時間の大幅短縮（N回のクエリを並列実行）

**Trade-offs**:
- **Benefits**: レスポンス時間短縮、スループット向上
- **Compromises**: データベース接続数の一時的増加

**Follow-up**:
- トランジション数が多い場合（100+）はバッチ処理を検討
- データベース接続プール設定の確認

### Decision: レスポンスデータ構造

**Context**: API仕様書に定義されたレスポンス構造と既存パターンの統合

**Alternatives Considered**:
1. 既存の統一レスポンス形式（success, data, meta）を踏襲
2. API仕様書の独自形式を採用
3. GraphQL風のネストされたデータ構造

**Selected Approach**: オプション1 - 既存の統一レスポンス形式

**Rationale**:
- プロジェクト全体で一貫したレスポンス形式
- クライアント側のエラーハンドリングが統一可能
- メタデータ（timestamp, requestId）の標準化

**Trade-offs**:
- **Benefits**: 一貫性、保守性、エラーハンドリング統一
- **Compromises**: API仕様書との微調整が必要

## Risks & Mitigations

### Risk 1: MAIMLファイルの大規模化によるパフォーマンス劣化
**Mitigation**: 
- ファイルサイズ制限（10MB推奨）の設定
- パースタイムアウト実装（30秒）
- キャッシュ戦略の導入検討

### Risk 2: experiment_recordテーブルのデータ量増加
**Mitigation**:
- インデックス設定（task_id, transition_id, organization_id）
- ページネーションの将来的な導入
- アーカイブ戦略の検討

### Risk 3: トランジションIDの不一致（MAIMLとDB）
**Mitigation**:
- エラーハンドリングで不一致を検出
- ログ記録で調査可能に
- トランジションが見つからない場合はnot_startedとして扱う

### Risk 4: organization_idフィルタ漏れによるデータ漏洩
**Mitigation**:
- すべてのクエリでorganization_idチェックを必須化
- コードレビューチェックリスト項目として明示
- 統合テストで異なる組織からのアクセスをテスト

## References

### 内部ドキュメント
- [API進捗監視仕様書](../../../docs/design/api/api_progress_monitoring.md)
- [セキュリティ規約](../../../.clinerules/development/security.md)
- [バックエンド規約](../../../.clinerules/development/backend.md)
- [データベース構造](../../../.clinerules/references/db_structure.md)

### 技術リファレンス
- [fast-xml-parser Documentation](https://github.com/NaturalIntelligence/fast-xml-parser)
- [Express.js Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)
- [PostgreSQL Performance Tips](https://wiki.postgresql.org/wiki/Performance_Optimization)
