# タスク計画書: タスク一覧取得API（実験作業者用）をprogress配下に移行

## メタデータ
- **作成日時**: 2026-02-18 16:03
- **タスクID**: task-progress-api-migration
- **優先度**: 高
- **推定工数**: 3時間

## 1. タスク概要

現在`backend/src/routes/taskRoutes.ts`の`GET /api/v1/tasks`に実装されている「タスク一覧取得API」を、仕様書（`docs/design/api/api_progress_monitoring.md`）に基づいて`progress`配下に移行します。

**変更内容**:
- エンドポイント: `GET /api/v1/tasks` → `GET /api/v1/progress/projects/:projectName/worker-tasks`
- パスパラメータ: projectIdをprojectName（プロジェクト名）に変更
- レスポンス構造: メソッドごとにグループ化
- 権限: `experiment_worker`（読取専用）

## 2. 目的と期待される成果

### 目的
- API仕様書に合わせた実装に統一する
- 進捗確認関連のAPIを`progress`配下に集約する
- 実験作業者用に最適化されたエンドポイントを提供する

### 期待される成果
- [x] タスク計画書の作成
- [ ] 新規ルートファイルの作成（`progressRoutes.ts`）
- [ ] 新規コントローラーの作成（`progressController.ts`）
- [ ] バリデーション実装
- [ ] DBクエリ実装（メソッドごとのグループ化）
- [ ] MAIMLファイルからメソッド情報取得の実装
- [ ] エラーハンドリング実装
- [ ] ルートの登録（`server.ts`）
- [ ] 旧エンドポイントの削除または非推奨化
- [ ] テストコード作成（必要に応じて）

## 3. 実装ステップ

### Phase 1: 新規ファイル作成と基本構造実装
- [ ] `backend/src/routes/progressRoutes.ts` を作成
- [ ] `backend/src/controllers/progressController.ts` を作成
- [ ] 基本的なルート定義とバリデーションを実装

### Phase 2: コントローラーロジック実装
- [ ] プロジェクト情報取得の実装
- [ ] タスク一覧取得のDBクエリ実装
- [ ] MAIMLファイルからメソッド情報取得
- [ ] メソッドごとのグループ化処理実装
- [ ] レスポンス整形

### Phase 3: エラーハンドリングとバリデーション
- [ ] バリデーションエラー処理
- [ ] 404エラー処理（プロジェクト存在確認）
- [ ] 権限エラー処理
- [ ] その他エラーハンドリング

### Phase 4: 統合とテスト
- [ ] `backend/src/server.ts` にルート登録
- [ ] 旧エンドポイント（`/api/v1/tasks`）の削除または非推奨化
- [ ] 動作確認

## 4. 影響範囲

### 新規作成するファイル
1. `backend/src/routes/progressRoutes.ts` - 進捗確認API用ルート定義
2. `backend/src/controllers/progressController.ts` - 進捗確認API用コントローラー

### 変更するファイル
1. `backend/src/server.ts` - 新規ルートの登録
2. `backend/src/routes/taskRoutes.ts` - 旧エンドポイントの削除または非推奨化

### 影響を受ける機能
- 実験作業者画面：タスク一覧表示機能
- フロントエンドのAPI呼び出し（エンドポイント変更が必要）

## 5. 技術的詳細

### 使用する技術・ライブラリ
- Express.js: ルーティング、コントローラー
- express-validator: バリデーション
- Kysely: DBクエリビルダー
- storageService: S3/Swift ファイル操作
- maimlParser: MAIMLファイル解析

### 新エンドポイント仕様

**エンドポイント**: `GET /api/v1/progress/projects/:projectName/worker-tasks`

**パスパラメータ**:
- `projectName` (string): プロジェクト名

**クエリパラメータ**:
- `status` (optional): タスクステータスフィルタ
- `assignedTo` (optional): 担当者フィルタ
- `sortBy` (optional): ソート基準（デフォルト: `task_no`）
- `order` (optional): ソート順（デフォルト: `asc`）

**レスポンス構造**:
```json
{
  "success": true,
  "data": {
    "project_id": "uuid",
    "project_name": "Sample Project",
    "methods": [
      {
        "method_id": "method1",
        "method_name": "合成実験",
        "experiment_order": 1,
        "tasks": [
          {
            "task_no": 1,
            "status": "completed",
            "experiment_user_id": "uuid",
            "experiment_user_name": "Worker Name",
            "created_at": "ISO8601",
            "updated_at": "ISO8601",
            "progress": 100
          }
        ]
      }
    ]
  },
  "meta": {
    "timestamp": "ISO8601",
    "requestId": "req_xxx"
  }
}
```

### セキュリティ考慮事項
- [x] JWT認証ミドルウェア適用（authMiddleware）
- [x] マルチテナント分離（organization_id フィルタ）
- [x] 権限チェック（experiment_worker読取専用）
- [x] SQLインジェクション対策（Parameterized Queries）

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| フロントエンドのAPI呼び出し変更漏れ | 高 | 中 | エンドポイント変更の影響を確認し、フロントエンドも同時に修正 |
| MAIMLファイル解析エラー | 中 | 低 | エラーハンドリングを適切に実装 |
| DBクエリのパフォーマンス問題 | 中 | 低 | インデックスの確認とクエリ最適化 |
| メソッドグループ化ロジックの複雑化 | 低 | 中 | ユニットテストで検証 |

## 7. テスト計画

### 単体テスト
- [ ] バリデーションテスト（パスパラメータ、クエリパラメータ）
- [ ] プロジェクト存在確認テスト
- [ ] メソッドグループ化ロジックテスト

### 統合テスト
- [ ] 正常系：タスク一覧が正しく取得できる
- [ ] 異常系：存在しないプロジェクト名でリクエスト
- [ ] 異常系：権限不足（experiment_worker以外）
- [ ] フィルタリング動作確認（status, assignedTo）

### 手動テスト
- [ ] Postmanでエンドポイント動作確認
- [ ] 実験作業者画面での表示確認

## 8. ロールバック計画

問題が発生した場合：
1. 新規追加したルート登録をコメントアウト
2. 旧エンドポイント（`/api/v1/tasks`）を復活
3. フロントエンドのAPI呼び出しを旧エンドポイントに戻す

## 9. 関連ドキュメント

- [API仕様書: 進捗確認API](docs/design/api/api_progress_monitoring.md)
- [バックエンド規約](.clinerules/development/backend.md)
- [セキュリティ規約](.clinerules/development/security.md)

## 10. 承認記録

- **計画書提示日時**: 2026-02-18 16:03
- **承認日時**: （承認後に記入）
- **承認者コメント**: （ユーザーからのフィードバック）

## 11. 実施記録

### 実施日時
開始: 2026-02-18 16:05
完了: 2026-02-18 16:09

### 計画からの変更点
1. **MAIMLパーサー関数の変更**
   - 当初: `parseMultipleMethodsStructure`関数を使用予定
   - 実際: 該当関数が存在しないため、XMLParser（fast-xml-parser）を直接使用
   - 理由: maimlParser.tsには該当関数が未実装だったため

2. **server.tsへのルート登録**
   - 当初: 新規登録作業が必要と想定
   - 実際: 既に`app.use('/api/v1/progress', progressRoutes)`が登録済み
   - 理由: 事前に登録されていた

### 発生した問題と解決方法

#### 問題1: parseMultipleMethodsStructure関数が存在しない
**症状**: TypeScriptコンパイルエラー
```
モジュール '"../utils/maimlParser"' にエクスポートされたメンバー 'parseMultipleMethodsStructure' がありません。
```

**解決方法**: 
- fast-xml-parserのXMLParserを直接インポート
- MAIMLファイルをパースして`parsedXML.maiml.protocol.method`からメソッド情報を抽出
- method要素が単一の場合は配列化して処理

### 最終的な成果物
- [x] progressRoutes.ts 作成完了
- [x] progressController.ts 作成完了
- [x] server.ts への登録完了（既に登録済みを確認）
- [x] 旧エンドポイント削除完了

## 12. 振り返り

### うまくいった点
1. **段階的な実装アプローチ**
   - Phase 1-4に分けた計画により、スムーズに実装できた
   - 各ステップで確認を取りながら進められた

2. **既存コードの再利用**
   - taskController.tsの構造を参考にできた
   - バリデーションミドルウェアの活用

3. **エラーハンドリングの充実**
   - プロジェクト未検出時の404レスポンス
   - MAIMLファイル解析失敗時のフォールバック処理

### 改善が必要な点
1. **MAIMLパーサーの共通化**
   - parseMultipleMethodsStructure関数の実装が望ましい
   - 複数箇所でXMLParser直接使用は保守性が低い

2. **型定義の整備**
   - メソッド情報の型定義（MethodInfo interface等）
   - レスポンスデータの型定義

3. **テストコードの追加**
   - 今回は実装のみでテストは未実装
   - ユニットテスト・統合テストの追加が必要

### 学んだこと
1. **fast-xml-parserの使い方**
   - isArray関数でmethod要素を配列化する設定
   - attributeNamePrefixで属性アクセス方法の制御

2. **プロジェクト名ベースのAPI設計**
   - UUIDではなく人間が読める名前をパラメータに使用
   - より直感的で使いやすいAPI

3. **メソッドグループ化の実装パターン**
   - Map構造でメソッドを先に登録
   - タスクを後からマッピング
   - experiment_order順でソート

### 次のステップ
1. フロントエンドのAPI呼び出し変更
2. 統合テストの実施
3. 実環境での動作確認
