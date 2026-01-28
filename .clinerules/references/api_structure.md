# API構成定義

## 概要

このドキュメントは、API構成を理解するための参照ルールです。
詳細なAPI一覧は別ファイルで管理されています。

## 📚 参照ドキュメント

### API一覧の詳細
**ファイル**: `docs/design/api/api_list.md`

このファイルには以下の情報が含まれています：
- 全APIの一覧（HTTPメソッド、エンドポイント、説明）
- ルートファイルパス
- コントローラー名
- 実装状態（実装済み/未実装）
- API設計書へのリンク

**重要**: 新規APIを追加した際やAPIを変更した際は、必ず `docs/design/api/api_list.md` も更新してください。

### API設計書
**ディレクトリ**: `docs/design/api/`

各API機能の詳細な設計書が格納されています。

---

## 🎯 使用ガイドライン

### API調査時のワークフロー（重要）

**ユーザーからAPIに関する質問や調査依頼があった場合、必ず以下の順序で進めてください：**

#### Step 1: このファイル（api_structure.md）を確認
1. まず `.clinerules/references/api_structure.md`（このファイル）を読む
2. APIカテゴリのセクションで該当するAPIの概要を把握
3. APIが属するカテゴリ（認証、プロジェクト管理、ファイル操作）を特定

#### Step 2: 詳細なAPI一覧を確認
4. `docs/design/api/api_list.md` を読んで詳細情報を取得
5. HTTPメソッド、エンドポイント、ルートファイルパスを確認
6. 実装状態（実装済み/未実装）を確認

#### Step 3: 必要に応じて設計書を確認
7. より詳細な仕様が必要な場合は `docs/design/api/` 内の設計書を参照
8. リクエスト/レスポンス形式、ビジネスロジック、バリデーションを確認

#### Step 4: ソースファイルを確認
9. 実装内容を確認する必要がある場合のみ、ソースファイルを読む
10. ルートファイル → コントローラー → サービス の順に調査

**このワークフローに従うことで：**
- ✅ 効率的に情報を取得できる
- ✅ 不要なファイル読み込みを避けられる
- ✅ APIの全体像を把握してから詳細に入れる

### バックエンド実装時

1. **APIの特定**
   - まず `.clinerules/references/api_structure.md`（このファイル）で概要を確認
   - `docs/design/api/api_list.md` でAPIをエンドポイントから特定
   - ルートファイルパスとコントローラー名を確認

2. **新規API追加時**
   - API設計書を作成（`docs/design/api/api_*.md`）
   - `api_list.md` にエントリを追加
   - ルートファイル、コントローラー、サービスを実装
   - テストケースを追加

3. **API設計書参照**
   - `docs/design/api/` 内の該当設計書を確認
   - リクエスト/レスポンス仕様を把握
   - ビジネスロジックとバリデーションを確認

### API変更時

1. **設計書の更新**
   - 該当する設計書ファイルを更新

2. **API一覧の更新（必須）**
   - `docs/design/api/api_list.md` を更新
   - 変更内容を記録

3. **実装の更新**
   - ルート、コントローラー、サービスを更新
   - テストケースを更新

---

## 📊 APIカテゴリ

**全6カテゴリで37エンドポイントを管理**（実装率: 62%）

詳細は `docs/design/api/api_list.md` を参照してください。

### 1. 認証API（Authentication）
**設計書**: [api_auth.md](../../docs/design/api/api_auth.md)  
**ルートファイル**: `backend/src/routes/authRoutes.ts`

- ログイン（PINコード方式）
- PINコード検証
- PINコード再送信
- パスワードリセット要求
- パスワードリセット実行
- ログアウト
- **6エンドポイント（✅ 100%実装済み）**

### 2. プロジェクト管理API（Project Management）
**設計書**: [api_project_management.md](../../docs/design/api/api_project_management.md)  
**ルートファイル**: `backend/src/routes/projectRoutes.ts`

- プロジェクト一覧取得
- プロジェクト作成
- プロジェクト詳細取得
- チェックアウト/チェックイン
- チェックアウト状態取得
- ファイル一覧取得
- タスク一覧取得
- 指示送信（未実装）
- 指示一覧取得（未実装）
- プロジェクト詳細検索（未実装）
- プロジェクト公開（未実装）
- **12エンドポイント（8実装済み、4未実装 - 67%）**

### 3. 共通API（Common / File Operations）
**設計書**: [api_common.md](../../docs/design/api/api_common.md)  
**ルートファイル**: `backend/src/routes/fileRoutes.ts`

- ファイルアップロード（汎用）
- ファイル/フォルダダウンロード
- **2エンドポイント（未実装 - 0%）**

### 4. フォーマット管理API（Format Management）
**設計書**: [api_format_management.md](../../docs/design/api/api_format_management.md)  
**ルートファイル**: `backend/src/routes/formatRoutes.ts`

- フォーマット一覧取得
- フォーマットファイル一覧取得
- 新規ファイル作成
- 新規フォルダ作成
- ファイル編集（保存）
- **5エンドポイント（未実装 - 0%）**

### 5. Maiml編集API（MAIML Editor）
**設計書**: [api_maiml_editor.md](../../docs/design/api/api_maiml_edit.md)  
**ルートファイル**: `backend/src/routes/maimlRoutes.ts`

- MAIML解析（基本）
- ペトリネット構造解析（複数method対応・強化版）
- MAIMLファイル保存
- MAIMLファイル読込
- MAIMLファイル一覧取得
- MAIMLバリデーション
- MAIML自動補正（スタブ実装）
- 編集セッション開始
- 編集セッション終了
- ヘルスチェック
- **10エンドポイント（9実装済み、1スタブ - 90%）**

**実装完了日**: 2026-01-27
- Phase 4: サービス層実装完了
- Phase 6: API接続完全統合
- 複数メソッド対応、Petri Net構造解析、ステレオタイプ自動抽出
- XMLバリデーション、バックアップ機能、storageService統合

### 6. 進捗確認API（Progress Monitoring）
**設計書**: [api_progress_monitoring.md](../../docs/design/api/api_progress_check.md)  
**ルートファイル**: `backend/src/routes/progressRoutes.ts`

- メソッド別タスク一覧取得
- タスク詳細取得
- **2エンドポイント（未実装 - 0%）**

---

## ⚠️ 重要な設計原則

### エンドポイント命名規則
```
✅ 良い例（RESTful）
GET    /api/v1/projects
POST   /api/v1/projects
GET    /api/v1/projects/:projectId
PATCH  /api/v1/projects/:projectId/checkout-status

❌ 悪い例
GET    /api/v1/getProjects
POST   /api/v1/createProject
GET    /api/v1/project-detail/:id
```

### ミドルウェアチェーン
すべての認証付きAPIで以下の順序を厳守：
```typescript
router.get('/projects',
  auth,                        // 1. JWT認証
  tenantIsolation,            // 2. テナント分離
  permissionCheck(['manager']), // 3. 権限チェック
  projectController.list       // 4. ルートハンドラ
);
```

### レスポンス形式
統一されたレスポンス形式を使用：
```typescript
// 成功時
{
  "success": true,
  "data": { ... },
  "pagination": { ... },  // オプショナル
  "meta": {
    "timestamp": "2026-01-20T09:00:00Z",
    "requestId": "req_abc123"
  }
}

// エラー時
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "...",
    "details": [ ... ]
  },
  "meta": { ... }
}
```

---

## 🔗 関連ドキュメント

- [API一覧詳細](../../docs/design/api/api_list.md) - 全APIの詳細情報
- [API設計書ディレクトリ](../../docs/design/api/) - 各APIの詳細設計
- [API設計ポリシー](../development/api.md) - API設計の統一ルール
- [バックエンド規約](../development/backend.md) - 実装規約
- [セキュリティ規約](../development/security.md) - セキュリティ要件

---

## 📝 更新履歴

| 日付 | 変更内容 | 担当者 |
|------|----------|--------|
| 2026-01-20 | 初版作成（17エンドポイント管理開始） | Cline |

---

## ✅ ベストプラクティス

### DO（推奨）
✅ API調査時は必ず `api_structure.md` → `api_list.md` → 設計書の順で確認
✅ 新規API追加時は必ず `api_list.md` を更新
✅ エンドポイント命名はRESTful原則に従う
✅ ミドルウェアチェーンを正しく適用
✅ レスポンス形式を統一する
✅ organization_id フィルタを必ず含める
✅ Parameterized Queries を使用する
✅ API設計書には必ずバリデーションとセキュリティチェックリストを含める

### DON'T（非推奨）
❌ `docs/cline_archives/` のファイルを参照しない（過去のタスク記録）
❌ API一覧を更新せずに実装しない
❌ organization_id フィルタなしでクエリを実行しない
❌ ミドルウェアチェーンを省略しない
❌ 独自のレスポンス形式を作らない
❌ 文字列連結でSQLクエリを構築しない

---

## 🚨 トラブルシューティング

### よくある問題

#### 問題1: APIが見つからない
**症状**: 実装されているはずのAPIが見つからない

**解決策**:
1. `docs/design/api/api_list.md` で実装状態を確認
2. エンドポイント名が正しいか確認（大文字小文字、複数形）
3. ルートファイルを直接確認

#### 問題2: 権限エラー（403 Forbidden）
**症状**: APIを呼び出すと403エラーが返る

**解決策**:
1. `api_list.md` でミドルウェアチェーンを確認
2. ユーザーのロールが必要な権限を持っているか確認
3. `permissionCheck` の設定を確認

#### 問題3: テナント分離エラー
**症状**: 他組織のデータが取得できる/できない

**解決策**:
1. すべてのクエリに `organization_id` フィルタがあるか確認
2. `tenantIsolation` ミドルウェアが適用されているか確認
3. リクエストに `X-Organization-Id` ヘッダーが含まれているか確認

---

## 📚 学習リソース

### 初めてAPIを実装する場合

1. **基本を学ぶ**:
   - [API設計ポリシー](../development/api.md) を読む
   - [バックエンド規約](../development/backend.md) を読む

2. **既存のAPIを参考にする**:
   - 認証API（`authRoutes.ts`）を参考に基本構造を理解
   - プロジェクト管理API（`projectRoutes.ts`）を参考に実装パターンを学ぶ

3. **テストコードを確認**:
   - `backend/tests/` 内のテストケースを確認
   - テストの書き方を学ぶ

### API設計のチェックポイント

実装前に以下を確認：
- [ ] エンドポイント名はRESTfulか？
- [ ] HTTPメソッドは適切か？
- [ ] リクエスト/レスポンス形式は統一されているか？
- [ ] バリデーションは十分か？
- [ ] セキュリティチェックリストを満たしているか？
- [ ] マルチテナント分離は実装されているか？
- [ ] エラーハンドリングは適切か？
- [ ] テストケースは十分か？
