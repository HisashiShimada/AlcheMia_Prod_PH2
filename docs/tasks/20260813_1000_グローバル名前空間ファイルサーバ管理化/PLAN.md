# タスク計画書: グローバル名前空間ファイルサーバ管理化・global_flg 廃止

## メタデータ

- **作成日時**: 2026-08-13 10:00
- **タスクID**: 20260813_1000
- **優先度**: 高
- **推定工数**: 3〜4日

---

## 1. タスク概要

### 背景

`ProviderMenu` の「名前空間管理（グローバル）」タブでは、現在 `namespace` テーブルの `global_flg=TRUE` レコードを DB に保存して管理している。

方針変更により以下のように変更する：

1. **グローバル名前空間（prefix + URI）の宣言部はファイルサーバで管理する**
   - 保存先: `system/namespaces/global-declarations.csv`（バケットルート直下・全システム共通1ファイル）
2. **インポート/エクスポート機能でファイルを更新できるようにする**
3. **一覧画面でファイルの内容（prefix + URI）を確認できるようにする**
4. **`namespace` テーブルの `global_flg` カラムを廃止する**（DB からグローバル管理を完全撤廃）

### グローバル用語（Term）について

グローバル用語はシステム上で管理しない方針のため、`ProviderMenu` の「用語管理」サブタブも削除する。

---

## 2. 目的と期待される成果

- [x] グローバル名前空間（prefix + URI）がファイルサーバ上の CSV で管理される
- [x] `storageService` が `system/` パス（organization_id プレフィックスなし）にアクセスできる
- [x] ProviderMenu タブ3 でグローバル宣言の一覧を確認できる
- [x] CSV インポートでファイルサーバのファイルを更新できる
- [x] CSV エクスポートでファイルサーバのファイルをダウンロードできる
- [ ] `namespace.global_flg` カラムが DB から削除される（マイグレーション実行待ち）
- [x] `global_flg` / `globalFlg` / `isGlobal` 参照がコードから除去される
- [x] MAIML 保存時のグローバル名前空間注入がファイルサーバから取得するよう変更される

---

## 3. アーキテクチャ概要

### ファイルパス設計

```
{bucket}/
├── system/                               ← 組織 ID なし・システム共通領域（新設）
│   └── namespaces/
│       └── global-declarations.csv       ← グローバル名前空間宣言ファイル
└── {organization_id}/                    ← 既存の組織別領域（変更なし）
    ├── projects/
    ├── formats/
    └── certificates/
```

### CSV フォーマット

```csv
prefix,uri
maiml,http://www.maiml.org/schemas
xsi,http://www.w3.org/2001/XMLSchema-instance
```

### MAIML 保存時の名前空間注入フロー（変更後）

```
maimlWriterService
  ├── findNamespacesByOrganization()  → DB（組織固有のみ）
  └── readGlobalDeclarations()        → ファイルサーバ
        ↓ マージ
  injectNamespaceDeclarations()       → MAIML <maiml> タグに注入
```

---

## 4. 実装ステップ（詳細チェックリスト）

### Phase 1: storageService 拡張

**`backend/src/services/storageService.ts`**

- [x] `uploadSystemFile(filePath: string, content: Buffer | string, options?: UploadOptions): Promise<string>` 追加
  - `filePath` が `system/` で始まることを必須バリデーション
  - `buildKey()` を使わず `filePath` を直接キーとして使用
- [x] `downloadSystemFile(filePath: string): Promise<Buffer>` 追加
  - `filePath` が `system/` で始まることを必須バリデーション
- [x] `systemFileExists(filePath: string): Promise<boolean>` 追加
  - `filePath` が `system/` で始まることを必須バリデーション

### Phase 2: globalNamespaceFileService 新規作成

**`backend/src/services/globalNamespaceFileService.ts`（新規）**

- [x] 定数 `GLOBAL_DECLARATIONS_PATH = 'system/namespaces/global-declarations.csv'` を定義
- [x] `readGlobalDeclarations(): Promise<Array<{ prefix: string; uri: string }>>` を実装
  - ファイル不在時（NoSuchKey 等）は空配列を返す
  - CSV パース: ヘッダー行 `prefix,uri` を除いた各行を `{prefix, uri}` に変換
- [x] `writeGlobalDeclarations(declarations: Array<{ prefix: string; uri: string }>): Promise<void>` を実装
  - `{prefix, uri}[]` → CSV 文字列に変換（ヘッダー行付き）
  - `storageService.uploadSystemFile()` で書き込み

### Phase 3: バックエンド API エンドポイント追加

**`backend/src/controllers/namespaceController.ts`**

- [x] `getGlobalDeclarations` ハンドラ追加（`readGlobalDeclarations()` → JSON レスポンス）
- [x] `importGlobalDeclarations` ハンドラ追加（CSV アップロード → パース → `writeGlobalDeclarations()`）
- [x] `exportGlobalDeclarations` ハンドラ追加（`readGlobalDeclarations()` → CSV ダウンロードレスポンス）

**`backend/src/routes/namespaceRoutes.ts`**

- [x] `GET  /api/v1/namespaces/global-declarations` ルート追加
- [x] `POST /api/v1/namespaces/global-declarations/import` ルート追加（multer ミドルウェア）
- [x] `GET  /api/v1/namespaces/global-declarations/export` ルート追加

**`backend/src/middleware/namespaceValidation.ts`**

- [x] `validateImportGlobalDeclarations` バリデーションルール追加

### Phase 4: maimlWriterService の修正

**`backend/src/services/maimlWriterService.ts`**

- [x] `readGlobalDeclarations()` をインポート
- [x] `writeDataAndEventLog()` 内: `findNamespacesByOrganization()` と `readGlobalDeclarations()` を並列実行し、マージして注入
- [x] `writeEventLogOnly()` も同様に修正

**`backend/src/services/namespaceService.ts`**

- [ ] `getDeclarationsByProject()` に `readGlobalDeclarations()` のマージ処理を追加（未実施・要対応）

### Phase 5: SQL から global_flg を除去

- [x] `findAllByScopeKey.sql` — `OR n.global_flg = TRUE` 条件を削除
- [x] `findDeclarationsByProjectScope.sql` — `global_flg` 条件・`"globalFlg"` カラム出力を削除
- [x] `findNamespacesByOrganization.sql` — `"isGlobal"` カラム出力を削除
- [x] `findNamespacesByScopeKey.sql` — `"isGlobal"` カラム出力を削除
- [x] `createNamespace.sql` — `global_flg` カラムを INSERT から削除
- [x] `createNamespaceUri.sql` — `global_flg` カラムを INSERT から削除
- [x] `updateNamespace.sql` — `global_flg` カラムを RETURNING から削除（追加対応）

### Phase 6: Repository から global_flg を除去

**`backend/src/repositories/namespaceTermRepository.ts`**

- [x] `updateNamespace()` 戻り値型から `globalFlg: boolean` を削除
- [x] `findDeclarationsByProjectScope()` 戻り値型から `globalFlg: boolean` を削除
- [x] `findNamespacesByScopeKey()` 戻り値型から `isGlobal?: boolean` を削除

### Phase 7: Service / Controller から global_flg を除去

**`backend/src/services/namespaceService.ts`**

- [x] `UpdateNamespaceResult` 型から `globalFlg: boolean` を削除
- [x] `ProjectScopeDeclaration` 型から `globalFlg: boolean` を削除
- [x] `getTermsGlobal()` 関数を**削除**
- [x] `getNamespacesByScopeKey()` 戻り値型から `isGlobal?` を削除

**`backend/src/controllers/namespaceController.ts`**

- [x] `getTerms` の `?globalFlg=true` パスを削除
- [x] `createNamespace` の `isGlobal` パラメータ受け取りと伝達を削除（元から実装なし）
- [x] `updateNamespace` レスポンスから `globalFlg` フィールドを削除（型変更により反映）

**`backend/src/middleware/namespaceValidation.ts`**

- [x] `validateGetTerms` から `globalFlg` クエリバリデーションを削除
- [x] `validateCreateNamespace` から `isGlobal` ボディバリデーションを削除（存在しなかった）

### Phase 8: DB マイグレーション作成

**`backend/migrations/20260813_drop_global_flg.sql`（新規）**

- [x] `ALTER TABLE namespace DROP COLUMN IF EXISTS global_flg;` を記述
- [x] 実施前の注意事項をコメントで記載
- [ ] **実行待ち**（コードデプロイ・データ移行後に実施）

### Phase 9: フロントエンド 型定義・APIサービス

**`frontend/src/types/namespace.ts`**

- [x] `GlobalNamespaceEntry` 型を追加（`{ prefix: string; uri: string }`）
- [x] `GlobalNamespaceViewProps` 型を追加

**`frontend/src/services/namespaceApiService.ts`**

- [x] `CreateNamespaceRequest` から `isGlobal?: boolean` を削除
- [x] `UpdateNamespaceResponse` から `globalFlg: boolean` を削除
- [x] `getNamespaceList()` の `options.globalFlg` パラメータを削除
- [x] `getTerms()` の `options.globalFlg` パラメータを削除
- [x] `getPersonalNamespaces()` 戻り値型から `global_flg: boolean` を削除
- [x] `getGlobalDeclarations(): Promise<GlobalNamespaceEntry[]>` を追加
- [x] `importGlobalDeclarations(file: File): Promise<void>` を追加
- [x] `exportGlobalDeclarations(): Promise<void>` を追加

**`frontend/src/utils/namespaceInjector.ts`**

- [x] `NamespaceEntry` 型から `isGlobal?: boolean` フィールドを削除

### Phase 10: フロントエンド コンポーネント修正

**`frontend/src/components/namespace/NamespaceMain.tsx`**

- [x] `fetchTerms({ globalFlg: true })` を `fetchTerms()` に変更
- [x] `GLOBAL_KEYS` に反応する `globalFlg: true` 送信ロジックを削除
- [x] スコープ列の `isGlobal` 判定（`getGlobalPrefixes()` 利用箇所）を削除

**`frontend/src/components/namespace/PrefixManagement.tsx`**

- [x] `createNamespace()` 呼び出しから `isGlobal: globalOnly` を削除（2か所）

**`frontend/src/components/namespace/TermManagement.tsx`**

- [x] `accessiblePrefixes` ステート・`getAncestorGroupCds` 依存を削除
- [x] 重複チェックを全件対象に変更

**`frontend/src/components/namespace/GlobalNamespaceView.tsx`（新規）**

- [x] マウント時に `getGlobalDeclarations()` で prefix + URI 一覧をテーブル表示
- [x] 「📥 インポート」ボタン: ファイル選択 → 上書き確認モーダル → `importGlobalDeclarations()` → 再フェッチ
- [x] 「📤 エクスポート」ボタン: `exportGlobalDeclarations()` → CSV ダウンロード
- [x] ローディング・エラーハンドリング

### Phase 11: ProviderMenu の変更

**`frontend/src/components/menus/ProviderMenu.tsx`**

- [x] `PrefixManagement` / `TermManagement` の dynamic import を削除
- [x] `GlobalNamespaceView` の dynamic import を追加
- [x] タブ3 コンテンツを `<GlobalNamespaceView />` のみに変更（サブタブ廃止）

---

## 5. 変更ファイル一覧

### バックエンド（15ファイル）

| # | ファイル | 種別 | 変更内容 |
|---|---------|------|---------|
| 1 | `backend/src/services/storageService.ts` | 修正 | `uploadSystemFile` / `downloadSystemFile` / `systemFileExists` 追加 |
| 2 | `backend/src/services/globalNamespaceFileService.ts` | **新規** | `system/namespaces/global-declarations.csv` 読み書き |
| 3 | `backend/src/controllers/namespaceController.ts` | 修正 | 3ハンドラ追加、`globalFlg` / `isGlobal` 関連削除 |
| 4 | `backend/src/routes/namespaceRoutes.ts` | 修正 | 3エンドポイント追加 |
| 5 | `backend/src/middleware/namespaceValidation.ts` | 修正 | import バリデーション追加、`globalFlg` バリデーション削除 |
| 6 | `backend/src/services/namespaceService.ts` | 修正 | `getTermsGlobal()` 削除、各型から `globalFlg` / `isGlobal` 削除 |
| 7 | `backend/src/services/maimlWriterService.ts` | 修正 | グローバル宣言をファイルサーバから取得してマージ |
| 8 | `backend/src/repositories/namespaceTermRepository.ts` | 修正 | 各戻り値型から `globalFlg` / `isGlobal` 削除 |
| 9 | `backend/src/sql/queries/namespace_terms/findAllByScopeKey.sql` | 修正 | `global_flg` 条件削除 |
| 10 | `backend/src/sql/queries/namespace_terms/findDeclarationsByProjectScope.sql` | 修正 | `global_flg` 条件・カラム削除 |
| 11 | `backend/src/sql/queries/namespace_terms/findNamespacesByOrganization.sql` | 修正 | `isGlobal` カラム削除 |
| 12 | `backend/src/sql/queries/namespace_terms/findNamespacesByScopeKey.sql` | 修正 | `isGlobal` カラム削除 |
| 13 | `backend/src/sql/queries/namespace_terms/createNamespace.sql` | 修正 | `global_flg` カラム削除 |
| 14 | `backend/src/sql/queries/namespace_terms/createNamespaceUri.sql` | 修正 | `global_flg` カラム削除 |
| 15 | `backend/migrations/20260813_drop_global_flg.sql` | **新規** | `namespace.global_flg` カラム DROP |

### フロントエンド（8ファイル）

| # | ファイル | 種別 | 変更内容 |
|---|---------|------|---------|
| 16 | `frontend/src/types/namespace.ts` | 修正 | `GlobalNamespaceEntry` / `GlobalNamespaceViewProps` 追加 |
| 17 | `frontend/src/services/namespaceApiService.ts` | 修正 | 3関数追加、`globalFlg` / `isGlobal` 関連削除 |
| 18 | `frontend/src/utils/namespaceInjector.ts` | 修正 | `isGlobal` フィールド削除 |
| 19 | `frontend/src/components/namespace/GlobalNamespaceView.tsx` | **新規** | 一覧表示 + インポート/エクスポート |
| 20 | `frontend/src/components/namespace/NamespaceMain.tsx` | 修正 | `globalFlg` 関連ロジック削除 |
| 21 | `frontend/src/components/namespace/PrefixManagement.tsx` | 修正 | `isGlobal` パラメータ削除 |
| 22 | `frontend/src/components/namespace/TermManagement.tsx` | 修正 | `isGlobal` 関連ロジック削除 |
| 23 | `frontend/src/components/menus/ProviderMenu.tsx` | 修正 | タブ3 を `GlobalNamespaceView` に置き換え |

---

## 6. 影響範囲の分析

### 認証・認可への影響
- 新規エンドポイント（`/api/v1/namespaces/global-declarations*`）には既存の `authMiddleware` + `tenantIsolation` を適用
- グローバル宣言の書き込み（import）は provider ロールのみ許可を検討

### データ保護への影響
- `system/` パスへのアクセスは `uploadSystemFile` / `downloadSystemFile` を通じてのみ行い、直接 S3Client 操作は禁止
- `system/` プレフィックス必須バリデーションでセキュリティを担保

### マルチテナント分離への影響
- グローバル宣言はシステム共通（テナント横断）のため、意図的に `organization_id` なしで管理
- 既存の組織別データ（`{organization_id}/` 配下）には一切影響なし

### MAIML 保存への影響
- `maimlWriterService` が DB（組織固有）+ ファイルサーバ（グローバル）の2ソースをマージして注入
- ファイルサーバにファイルが存在しない場合は空配列扱いのため既存の動作に支障なし

---

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `global_flg` カラム DROP 前にコードをデプロイすると型不整合が起きる | 高 | 中 | Phase 5〜7 でコードから `global_flg` 参照を先に削除してから DB DROP を実施 |
| `findDeclarationsByProjectScope` の `global_flg` 条件削除で MAIML 注入内容が変わる | 高 | 低 | `maimlWriterService` / `getDeclarationsByProject` でファイルサーバのグローバル宣言をマージして補完 |
| `findAllByScopeKey.sql` 変更で用語絞り込みが変わる | 中 | 低 | グローバル用語は DB 管理外になる方針のため、スコープ用語のみ返す動作が正しい |
| ファイルサーバにファイル不在（初回・削除時）| 中 | 中 | `readGlobalDeclarations()` はファイル不在時に空配列を返す安全設計 |
| `system/` パスのバリデーション不備によるセキュリティホール | 高 | 低 | system メソッド内で `system/` 始まり必須チェックを徹底 |
| インポート CSV の不正フォーマット | 低 | 中 | バリデーションミドルウェアで事前チェック |

---

## 8. テスト計画

### ユニットテスト
- [ ] `globalNamespaceFileService.ts` — CSV パース（正常・空・不正フォーマット）
- [ ] `globalNamespaceFileService.ts` — CSV シリアライズ
- [ ] `storageService.ts` — `uploadSystemFile` / `downloadSystemFile` の `system/` バリデーション

### 統合テスト
- [ ] `GET /api/v1/namespaces/global-declarations` — ファイルあり・ファイルなし
- [ ] `POST /api/v1/namespaces/global-declarations/import` — 正常 CSV・不正 CSV
- [ ] `GET /api/v1/namespaces/global-declarations/export` — CSV ダウンロード確認

### 手動テスト
- [ ] ProviderMenu タブ3 → グローバル名前空間一覧が表示される
- [ ] CSV インポート → ファイルサーバ更新 → 一覧に反映される
- [ ] CSV エクスポート → ダウンロードされた CSV の内容が正しい
- [ ] MAIML 保存 → `<maiml>` タグにグローバル宣言が注入されている
- [ ] `TermManagement`（実験管理画面）が `global_flg` 削除後も正常動作する
- [ ] `PrefixManagement`（実験管理画面）が `global_flg` 削除後も正常動作する
- [ ] DB マイグレーション実行後にエラーが発生しないこと

---

## 9. 実施手順（デプロイ順序）

```
1. Phase 1〜2  : storageService 拡張・globalNamespaceFileService 作成
2. Phase 3     : バックエンド API エンドポイント追加
3. Phase 4     : maimlWriterService 修正（ファイルサーバ取得をマージ）
4. Phase 5〜7  : SQL / Repository / Service / Controller から global_flg 参照を削除
5. Phase 9〜11 : フロントエンド修正
   ──── ここまでコードデプロイ ────
6. 既存の global_flg=TRUE データをエクスポートしてファイルサーバへ配置
   （importGlobalDeclarations API を使用）
7. Phase 8     : DB マイグレーション実行（global_flg カラム DROP）
```

---

## 10. 承認記録

- **計画書提示日時**: 2026-08-13 10:00
- **承認日時**: 2026-08-13 10:30
- **承認者コメント**: 承認します。

---

## 11. 実施記録

### 実施日時
開始: 2026-08-13 10:30
完了: 2026-08-13 12:00（コード実装完了。DBマイグレーション実行は別途）

### 計画からの変更点

1. **`updateNamespace.sql` の修正が追加対応に**
   - 計画では未記載だったが、`RETURNING` 句に `global_flg` が含まれており同様に除去が必要だったため対応

2. **`namespaceService.getDeclarationsByProject()` のマージ処理が未実施**
   - Phase 4 に記載したが、この関数の現在の実装を確認したところ対応が必要であることが判明
   - 次タスクで対応予定

3. **`organizationService.ts` の既存バグを修正**
   - `namespaceTermRepository` を直接使用しているが `import` が欠落していた既存バグを発見・修正

### 発生した問題と解決方法

- **`maimlWriterService.ts` に2箇所同じパターンが存在**: `writeDataAndEventLog()` と `writeEventLogOnly()` の両方に注入箇所があり、変数名を `orgNamespaces1/2` と `globalDeclarations1/2` で区別して個別修正

### 最終的な成果物

#### バックエンド（16ファイル）
- [x] `storageService.ts` — `uploadSystemFile` / `downloadSystemFile` / `systemFileExists` 追加
- [x] `globalNamespaceFileService.ts` — 新規作成（CSV 読み書き）
- [x] `namespaceController.ts` — 3ハンドラ追加・globalFlg 関連削除
- [x] `namespaceRoutes.ts` — 3エンドポイント追加・multer 設定追加
- [x] `namespaceValidation.ts` — import バリデーション追加・globalFlg バリデーション削除
- [x] `namespaceService.ts` — `getTermsGlobal()` 削除・各型から globalFlg/isGlobal 削除
- [x] `maimlWriterService.ts` — グローバル宣言をファイルサーバから取得してマージ
- [x] `namespaceTermRepository.ts` — 各戻り値型から globalFlg/isGlobal 削除
- [x] `findAllByScopeKey.sql` — global_flg 条件削除
- [x] `findDeclarationsByProjectScope.sql` — global_flg 条件・カラム削除
- [x] `findNamespacesByOrganization.sql` — isGlobal カラム削除
- [x] `findNamespacesByScopeKey.sql` — isGlobal カラム削除
- [x] `createNamespace.sql` — global_flg カラム削除
- [x] `createNamespaceUri.sql` — global_flg カラム削除
- [x] `updateNamespace.sql` — global_flg カラム削除（追加対応）
- [x] `20260813_drop_global_flg.sql` — 新規作成（実行待ち）
- [x] `organizationService.ts` — namespaceTermRepository の import 追加（既存バグ修正）

#### フロントエンド（8ファイル）
- [x] `namespace.ts` — GlobalNamespaceEntry / GlobalNamespaceViewProps 型追加
- [x] `namespaceApiService.ts` — 3関数追加・globalFlg/isGlobal 関連削除
- [x] `namespaceInjector.ts` — isGlobal フィールド削除
- [x] `GlobalNamespaceView.tsx` — 新規作成（一覧表示・インポート・エクスポート）
- [x] `NamespaceMain.tsx` — globalFlg 関連ロジック削除
- [x] `PrefixManagement.tsx` — isGlobal パラメータ削除
- [x] `TermManagement.tsx` — accessiblePrefixes・isGlobal 関連削除
- [x] `ProviderMenu.tsx` — タブ3 を GlobalNamespaceView に置き換え

### ビルド確認

- **バックエンド `tsc --noEmit`**: ✅ エラーなし（EXIT:0）
- **フロントエンド `tsc --noEmit`**: ✅ 今回変更ファイルに起因するエラーなし（既存エラー3件は別ファイルの既存問題）

### 残タスク（次回対応）

1. ~~`namespaceService.getDeclarationsByProject()` にグローバル宣言のマージ処理を追加~~ → ✅ 完了
2. **DBマイグレーション実行**（`20260813_drop_global_flg.sql`）
   - DB接続不可のため未実行（外部DBサーバ `10.1.1.219` へ接続タイムアウト）
   - 前提: コードデプロイ完了 + 既存 global_flg=TRUE データをインポート機能でファイルサーバへ移行後に手動実行
3. ~~i18n キーの追加（`globalNamespace.*` キーを `ja.json` / `en.json` に追加）~~ → ✅ 完了
