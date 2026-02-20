# タスク計画書: API仕様書更新（route反映）

## メタデータ
- **作成日時**: 2026-02-19 16:58
- **タスクID**: api-spec-route-reflection
- **優先度**: 中
- **推定工数**: 2-3時間

## 1. タスク概要

backend/src/routes/の以下3つのrouteファイルに定義されている各エンドポイントの処理内容を、対応するAPI仕様書に反映します。

**対象routeファイル**:
1. `backend/src/routes/projectRoutes.ts` (15エンドポイント)
2. `backend/src/routes/maimlRoutes.ts` (20+エンドポイント)
3. `backend/src/routes/fileAccessRoutes.ts` (8エンドポイント)

**対象API仕様書**:
1. `docs/design/api/api_project_management.md`
2. `docs/design/api/api_maiml_editor.md`
3. 新規作成: `docs/design/api/api_file_access.md`

## 2. 目的と期待される成果

### 目的
- routeファイルに実装されている実際のエンドポイントとAPI仕様書の内容を同期させる
- 実装状況（実装済み/未実装）を正確に更新する
- 実装ファイルへの参照を明記する

### 期待される成果
- [ ] api_project_management.md: projectRoutes.tsの全エンドポイントを反映
- [ ] api_maiml_editor.md: maimlRoutes.tsの全エンドポイントを反映
- [ ] api_file_access.md: fileAccessRoutes.tsの全エンドポイントを反映（新規作成）
- [ ] api_list.md: API一覧の更新
- [ ] ui_screen_list.md: 必要に応じて更新
- [ ] 実装状況サマリーを更新
- [ ] 実装ファイルへの参照を追加

## 3. 実装ステップ

### Phase 1: projectRoutes.ts → api_project_management.md
- [ ] projectRoutes.tsの全エンドポイントをリスト化
- [ ] api_project_management.mdの既存エンドポイントと照合
- [ ] 実装済みエンドポイントのマーク更新（🔴→✅）
- [ ] 実装ファイル情報の追加
- [ ] 実装状況サマリーの更新

### Phase 2: maimlRoutes.ts → api_maiml_editor.md
- [ ] maimlRoutes.tsの全エンドポイントをリスト化
- [ ] api_maiml_editor.mdの既存エンドポイントと照合
- [ ] 実装済みエンドポイントのマーク更新
- [ ] 新規エンドポイントの追加（Draft機能等）
- [ ] 実装ファイル情報の追加
- [ ] 実装状況サマリーの更新

### Phase 3: fileAccessRoutes.ts → api_file_access.md（新規作成）
- [ ] fileAccessRoutes.tsの全エンドポイントをリスト化
- [ ] api_file_access.md新規作成（テンプレート使用）
- [ ] 各エンドポイントの詳細仕様を記述
- [ ] バリデーション・エラー処理を記述
- [ ] 実装ファイル情報の追加

### Phase 4: api_list.mdの更新
- [ ] 追加・更新されたAPIをapi_list.mdに反映
- [ ] API総数の更新
- [ ] 実装状況の統計更新

### Phase 5: ui_screen_list.mdの確認と更新
- [ ] ui_screen_list.mdの現状確認
- [ ] 各画面で使用されているAPIの参照確認
- [ ] 必要に応じてAPI参照リンクの更新

## 4. 影響範囲

### 更新するファイル
1. `docs/design/api/api_project_management.md`
   - 実装状況サマリー更新
   - エンドポイント詳細更新（約15エンドポイント）

2. `docs/design/api/api_maiml_editor.md`
   - 実装状況サマリー更新
   - エンドポイント詳細更新（約20エンドポイント）
   - Draft機能の追加

3. `docs/design/api/api_file_access.md`（新規作成）
   - ファイルアップロード
   - フォルダZIPダウンロード
   - 署名付きURL取得
   - バッチ管理
   - 約8エンドポイント

4. `docs/design/api/api_list.md`
   - API総数の更新
   - 新規追加APIの反映
   - 実装状況統計の更新

5. `docs/design/ui/ui_screen_list.md`（必要に応じて）
   - API参照リンクの確認・更新

### 影響を受ける機能
- API仕様書を参照する開発者
- フロントエンド実装時の参照資料

## 5. 技術的詳細

### routeファイルの分析項目
```typescript
// 各エンドポイントから抽出する情報
- HTTPメソッド（GET/POST/PUT/DELETE）
- パス（例: /api/v1/projects）
- パスパラメータ（例: :projectId）
- クエリパラメータ（query()）
- ボディパラメータ（body()）
- バリデーション（express-validator）
- ミドルウェア（authMiddleware, tenantIsolation等）
- コントローラー関数
```

### API仕様書の記述項目
- エンドポイント定義
- 説明
- 認証・権限要件
- リクエストパラメータ（パス/クエリ/ボディ）
- バリデーション
- レスポンス形式（成功/エラー）
- 実装ファイル
- ビジネスルール

## 6. リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| routeとコントローラーの実装が不完全 | 中 | 中 | 実装状況を「部分実装」と明記 |
| エンドポイントの重複・整合性の問題 | 低 | 低 | 照合時に詳細確認 |
| 仕様書の記述量が膨大 | 低 | 高 | 段階的に更新、必要最小限を記述 |

## 7. 承認記録

- **計画書提示日時**: 2026-02-19 16:58
- **承認日時**: （承認待ち）
- **承認者コメント**: （承認待ち）

## 8. 実施記録

### 実施日時
開始: （承認後）
完了: （未定）

### 計画からの変更点
（実施後に記録）

### 発生した問題と解決方法
（実施後に記録）

### 最終的な成果物
- [ ] api_project_management.md更新
- [ ] api_maiml_editor.md更新
- [ ] api_file_access.md新規作成
- [ ] api_list.md更新
- [ ] ui_screen_list.md更新（必要に応じて）
