# タスク計画書: projectController リファクタリング

## メタデータ
- **作成日時**: 2026-02-25 10:01
- **タスクID**: projectController_refactoring
- **優先度**: 高
- **推定工数**: 4時間

## 1. タスク概要

`backend/src/controllers/projectController.ts`の以下5メソッドを規約に従ってリファクタリングする：
1. `create`
2. `getProjectTasks`
3. `checkout`
4. `getProjectFiles`
5. `list`

## 2. 目的と期待される成果

### 目的
- TypeScript型定義規約への準拠
- データベース操作規約への準拠
- Controller層の責務を明確化し、保守性を向上

### 期待される成果
- [ ] すべてのインライン型定義を型定義ファイルに移動
- [ ] Controller内のDB操作をRepository層に移動
- [ ] リクエスト/レスポンスの型定義を作成
- [ ] コードの重複を削減
- [ ] 既存の機能を維持（破壊的変更なし）

## 3. 現状の問題点

### 問題1: Controller内でのDB操作（規約違反）
**該当メソッド**: `getProjectTasks`, `getProjectFiles`

```typescript
// ❌ 現状: Controller内でDB操作
const { getPool } = require('../database/db');
const pool = getPool();
const projectQuery = 'SELECT project_id FROM project WHERE organization_id = $1 AND project_name = $2';
const projectResult = await pool.query(projectQuery, [organizationId, projectName]);
```

**問題点**:
- Controller層がDB操作の責務を持っている
- Service層を経由していない
- テスト困難
- コードの重複（同じロジックが複数箇所に存在）

### 問題1-2: Service層内の直接DB操作（規約違反）
**該当メソッド**: `getProjectTasks`, `getProjectFiles`（Service層）

```typescript
// ❌ 現状: Service層で直接pool.queryを実行
const pool = getPool();
const projectQuery = `SELECT ...`;
const projectResult = await pool.query(projectQuery, [organizationId, projectId]);
```

**問題点**:
- Service層が直接DBアクセスしている
- Repository層を使用していない
- SQLクエリがService層に散在
- テスト困難

### 問題2: インライン型定義の欠如（規約違反）
**該当**: 全メソッド

```typescript
// ❌ 現状: 型定義なし
const { projectName, description } = req.body; // any型
```

**問題点**:
- リクエストボディの型が不明確
- レスポンスの型が不明確
- 型安全性の欠如

### 問題3: バリデーションロジックの混在
**該当メソッド**: `create`

```typescript
// ❌ 現状: Controller内でバリデーション
if ((req.user as any).role === 'experiment_worker') {
  res.status(403).json({ ... });
  return;
}
```

**問題点**:
- バリデーションはミドルウェアで行うべき
- ただし、現在はミドルウェア実装がないため、今回は**対象外**とする

### ✅ 正しいアーキテクチャ（目指すべき姿）

```
Controller層: リクエスト受付 → Service層呼び出し → レスポンス返却
    ↓
Service層: ビジネスロジック → Repository層呼び出し
    ↓
Repository層: DB操作（SQLクエリ実行）
```

## 4. 実装ステップ

### Phase 1: 型定義の作成
- [ ] `backend/src/types/api.ts`にリクエスト/レスポンス型を追加
  - CreateProjectRequest
  - GetProjectTasksParams
  - CheckoutParams
  - GetProjectFilesParams
  - ListProjectsParams
  - ProjectResponse (共通)
  - ProjectListResponse
  - ProjectTasksResponse
  - ProjectFilesResponse

### Phase 2: Repository層の拡張
- [ ] `backend/src/repositories/projectRepository.ts`に以下メソッドを追加
  - `findProjectIdByName(organizationId, projectName)` - 既に存在（確認のみ）
  - `findProjectWithName(organizationId, projectId)` - プロジェクト情報取得
  - `countProjectTasks(organizationId, projectId, status?)` - タスク統計取得
  - `findProjectTasks(organizationId, projectId, status?)` - タスク一覧取得

### Phase 3: Service層のリファクタリング
- [ ] `getProjectTasks`メソッド
  - 直接SQL実行をRepository層に移動
  - Repository経由でデータ取得
  - `require`を`import`に変更
  
- [ ] `getProjectFiles`メソッド
  - 直接SQL実行をRepository層に移動
  - Repository経由でプロジェクト情報取得
  - `require`を`import`に変更
  
- [ ] 既存のrequire使用箇所を修正
  - Service層全体でrequireをimportに置き換え

### Phase 4: Controller層のリファクタリング
- [ ] `create`メソッド
  - 型定義を適用
  - req.bodyの型アノテーション追加
  
- [ ] `getProjectTasks`メソッド
  - Controller内のDB操作をService層に移動（完全にService経由に）
  - 型定義を適用
  
- [ ] `checkout`メソッド
  - 型定義を適用
  
- [ ] `getProjectFiles`メソッド
  - Controller内のDB操作をService層に移動（完全にService経由に）
  - 型定義を適用
  
- [ ] `list`メソッド
  - 型定義を適用

### Phase 5: テスト確認
- [ ] 既存の動作が維持されていることを確認
- [ ] 型エラーがないことを確認
- [ ] ビルドが成功することを確認

## 5. 影響範囲

### 新規作成するファイル
なし（既存ファイルに追加）

### 修正するファイル
1. `backend/src/types/api.ts` - 型定義追加
2. `backend/src/repositories/projectRepository.ts` - メソッド追加
3. `backend/src/services/projectService.ts` - Repository層経由に変更
4. `backend/src/controllers/projectController.ts` - Service層経由に変更

### 影響を受ける機能
- プロジェクト作成API
- プロジェクトタスク一覧取得API
- プロジェクトチェックアウトAPI
- プロジェクトファイル一覧取得API
- プロジェクト一覧取得API

**影響範囲**: フロントエンドからの呼び出しには影響なし（レスポンス形式は維持）

## 6. 技術的詳細

### 使用する規約
- `.clinerules/development/typescript.md` - 型定義規約
- `.clinerules/development/database.md` - Repository層規約
- `.clinerules/development/config.md` - コーディング規約

### アーキテクチャ上の考慮事項
- Controller層は薄くし、ビジネスロジックはService層、DB操作はRepository層に委譲
- **重要**: Service層も直接DB操作せず、必ずRepository層を経由する
- 型定義は`types/`ディレクトリに集約
- 階層構造: Controller → Service → Repository → Database
- **import規約**: Repositoryの使用は`import`文を使用（`require`は使わない）

### セキュリティ考慮事項
- [ ] organization_idの検証を維持
- [ ] マルチテナント分離を維持
- [ ] Parameterized Queriesを使用（Repository層で保証）

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 既存機能の破壊 | 高 | 低 | ・段階的にリファクタリング<br>・各メソッドを個別にテスト |
| 型定義の不整合 | 中 | 中 | ・既存のレスポンス形式を詳細に確認<br>・フロントエンド呼び出し箇所を確認 |
| Repository層の影響 | 中 | 低 | ・新規メソッドのみ追加<br>・既存メソッドは変更しない |

## 8. テスト計画

### ユニットテスト
- [ ] Repository層の新規メソッドをテスト
  - `findProjectIdByName`の正常系・異常系

### 統合テスト
- [ ] 各APIエンドポイントの動作確認
  - POST /api/v1/projects
  - GET /api/v1/projects/:projectName/tasks
  - POST /api/v1/projects/:projectName/checkout
  - GET /api/v1/projects/:projectName/files
  - GET /api/v1/projects

### 手動テスト
- [ ] フロントエンドからのAPI呼び出しが正常に動作することを確認
- [ ] エラーケースのレスポンスが適切であることを確認

## 9. ロールバック計画

変更内容は以下の順序でロールバック可能：
1. Controller層の変更を元に戻す
2. Repository層の新規メソッドを削除
3. 型定義ファイルの追加分を削除

Gitコミットは各Phaseごとに分けて実施。

## 10. 関連ドキュメント

- [TypeScript型定義規約](.clinerules/development/typescript.md)
- [データベース操作規約](.clinerules/development/database.md)
- [コーディング規約](.clinerules/development/config.md)

## 11. 承認記録

- **計画書提示日時**: 2026-02-25 10:01
- **承認日時**: （承認待ち）
- **承認者コメント**: （承認後記入）

## 12. 実施記録

### 実施日時
開始: （承認後記入）
完了: （完了後記入）

### 計画からの変更点
（実施中に発生した変更を記録）

### 発生した問題と解決方法
（実施中に発生した問題を記録）

### 最終的な成果物
- [ ] 型定義の作成完了
- [ ] Repository層の拡張完了
- [ ] Service層のリファクタリング完了（Repository層経由に変更）
- [ ] Controller層のリファクタリング完了（Service層経由に変更）
- [ ] テスト確認完了

## 13. 補足事項

### バリデーションについて
現在、`create`メソッド内にバリデーションロジック（Worker権限チェック）が存在しますが、これはミドルウェアで処理すべきです。ただし、ミドルウェアの実装は別タスクとし、今回は**対象外**とします。

### 既存コードの保持
以下のメソッドは今回のリファクタリング対象外：
- `getProjectMaiml` - 既にRepository経由で実装済み
- `getCheckoutStatus` - 既にRepository経由で実装済み
- `requestApproval` - 既にRepository経由で実装済み
- `getWorkerInstructions` - 既にRepository経由で実装済み
- `checkin` - 既にRepository経由で実装済み
- `confirmInstruction` - 既にRepository経由で実装済み

これらのメソッドは既に正しいアーキテクチャ（Controller→Service→Repository）で実装されています。

### アーキテクチャの方針
**ユーザー要望**: DBアクセスはService層からRepositoryを呼んで実行する

**実装方針**:
1. Controller内の直接DB操作を削除 → Service層を呼ぶ
2. Service層内の直接DB操作を削除 → Repository層を呼ぶ
3. Repository層でのみSQLクエリを実行

**階層構造の徹底**:
```
Controller層: req/res処理のみ
    ↓ Service層を呼び出し
Service層: ビジネスロジック
    ↓ Repository層を呼び出し（import使用）
Repository層: SQLクエリ実行
```

**import規約の追加**:
```typescript
// ❌ 悪い例: require使用
const projectRepository = require('../repositories/projectRepository');

// ✅ 良い例: import使用
import * as projectRepository from '../repositories/projectRepository';
```
