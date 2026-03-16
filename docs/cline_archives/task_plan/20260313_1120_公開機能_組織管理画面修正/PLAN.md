# タスク計画書: 公開機能実装に伴う組織管理画面修正

## メタデータ
- **作成日時**: 2026-03-13 11:20
- **タスクID**: 公開機能_組織管理画面修正
- **優先度**: 高
- **推定工数**: 4〜6時間

---

## 1. タスク概要

MaiML OpenData Pipeline（公開機能）の実装に伴い、組織管理画面に `default_retention_days`（公開期限デフォルト日数）フィールドを追加する。

spec.md セクション4.3 の確定仕様に従い、以下を対応する：
- `organization` テーブルに `default_retention_days` カラムを追加（NOT NULL・正の整数）
- 組織追加・編集ダイアログに入力項目を追加
- 組織作成時に環境変数 `RETENTION_DAYS_DEFAULT`（デフォルト: 30）から初期値を自動設定
- API・Service・Repository・型定義を更新

---

## 2. 背景と根拠

### 参照資料

| 資料 | 対象箇所 | 要点 |
|------|---------|------|
| `docs/MaiML_OpenData_Pipeline/spec.md` | セクション4.3 | `default_retention_days` の仕様・バリデーションルール |
| `docs/MaiML_OpenData_Pipeline/db.md` | セクション8.1 | organization テーブルへの追加カラム定義 |
| `docs/MaiML_OpenData_Pipeline/pending.md` | #8 ✅ 確定 | NULL不許可・正の整数必須が確定済み |

### 前提条件

**組織スキーマの自動作成（既に実装済み）**

- 組織新規追加時に自動的に組織専用スキーマ（`{organization_id}`）が作成される
- スキーマ内に `maiml_asset` 等の公開機能用テーブルが作成される
- 実装箇所: `organizationService.ts` の `createOrganization()`
- Repository: `maimlAssetRepository.ts` の `createSchemaIfNotExists()` / `createSchemaTables()`

このため、本タスクでは**スキーマ作成処理の追加は不要**です。  
`default_retention_days` フィールド追加 および **公開 Worker のフォールバック処理削除** を対応します。

---

### 確定仕様（spec.md セクション4.3 より）

```
organization.default_retention_days は必ず正の整数（NULL 不許可）。
組織登録時に環境変数 RETENTION_DAYS_DEFAULT（デフォルト: 30日）から初期値を設定する。
```

**バリデーションルール：**

| 値 | 扱い |
|----|------|
| 正の整数（1以上） | ✅ 許可 |
| 0・負の値・NULL | ❌ 不許可（バリデーションエラー） |

**公開 Worker での利用方法（参考）：**
```typescript
// 公開 Worker 内で retention_until を決定
const retentionDays = org.default_retention_days; // 必ず正の整数
const retentionUntil = new Date();
retentionUntil.setDate(retentionUntil.getDate() + retentionDays);
```

---

## 3. 目的と期待される成果

### 目的
公開機能（bullmq Worker）が組織の `default_retention_days` を参照して `maiml_asset.retention_until` を算出できるようにする。

### 期待される成果
- [ ] `organization` テーブルに `default_retention_days INT NOT NULL` が追加されている
- [ ] 組織追加ダイアログに `default_retention_days` 入力欄が表示され、保存できる
- [ ] 組織編集ダイアログに `default_retention_days` 入力欄が表示され、更新できる
- [ ] 組織作成時にデフォルト値（環境変数 or 30）が自動設定される
- [ ] バリデーション（1以上の整数必須）が機能する
- [ ] CSVアップロード・ダウンロードにも `default_retention_days` が対応している

---

## 4. 実装ステップ

### Phase 1: DBマイグレーション
- [ ] `backend/migrations/20260313_add_default_retention_days_to_organization.sql` を作成
  - `ALTER TABLE organization ADD COLUMN IF NOT EXISTS default_retention_days INT NOT NULL DEFAULT 30;`
  - 既存レコードには環境変数 `RETENTION_DAYS_DEFAULT`（デフォルト30）を適用

### Phase 2: バックエンド型定義・Repository更新
- [ ] `backend/src/types/database.ts`（または相当ファイル）の `Organization` 型に `default_retention_days: number` を追加
- [ ] `backend/src/repositories/organizationManagementRepository.ts` の `update()` メソッドが `default_retention_days` を受け取れるよう更新
- [ ] `backend/src/sql/queries/organizations/create.sql` に `default_retention_days` を追加（INSERT対応）

### Phase 3: バックエンド Service 更新
- [ ] `backend/src/services/organizationService.ts` の `OrganizationResponse` 型に `defaultRetentionDays: number` を追加
- [ ] `createOrganization()` で `default_retention_days` を設定
  - リクエストボディに含まれていれば使用
  - 含まれていなければ環境変数 `RETENTION_DAYS_DEFAULT`（デフォルト: 30）を使用
- [ ] `updateOrganization()` で `defaultRetentionDays` を受け取り更新できるよう修正
- [ ] `getOrganizations()` / `getOrganizationById()` のレスポンスマッピングに `defaultRetentionDays` を追加
- [ ] `uploadOrganizationsCsv()` の CSVバリデーション・変換処理に `default_retention_days` 対応を追加

### Phase 4: バックエンド Controller・Route・Validation 更新
- [ ] `backend/src/controllers/organizationController.ts` の `createOrganization()` / `updateOrganization()` にて `defaultRetentionDays` をサービスに渡す
- [ ] `backend/src/routes/organizationRoutes.ts` のバリデーション定義に `defaultRetentionDays` を追加（整数・1以上）
- [ ] システム設定値取得 API エンドポイントを追加（汎用的な設計）
  - `GET /api/v1/provider/system-config`
  - クエリパラメータ `keys` で取得する設定キーをカンマ区切りで指定可能
    - 例: `GET /api/v1/provider/system-config?keys=defaultRetentionDays`
    - `keys` 省略時は公開対象の全設定を返す
  - レスポンス形式: `{ [key: string]: string | number | boolean }`
    - 例: `{ defaultRetentionDays: 30 }`
  - 公開する環境変数は**ホワイトリスト方式**で管理（機密情報を誤って返さないよう制御）
  - 実装場所: 専用の `systemConfigController.ts` + `systemConfigRoutes.ts` を作成
  - **ホワイトリスト定義例（将来の拡張も考慮）:**
    ```typescript
    const SYSTEM_CONFIG_WHITELIST: Record<string, () => string | number | boolean> = {
      defaultRetentionDays: () => parseInt(process.env.RETENTION_DAYS_DEFAULT ?? '30', 10),
      // 将来の追加設定はここに追記
    };
    ```

### Phase 5: フロントエンド 追加ダイアログ更新
- [ ] 組織追加ダイアログコンポーネントに `defaultRetentionDays` 入力欄を追加
  - `<InputNumber>` コンポーネント、min=1、整数のみ、必須
  - ラベル: 「公開保持日数（日）」
  - デフォルト値: 組織管理画面の初期表示時に `GET /api/v1/provider/system-config` から取得した値
  - 説明テキスト: 「MaiMLデータ公開時のデフォルト保持日数（1日以上の整数）」
- [ ] API リクエストボディに `defaultRetentionDays` を含める

### Phase 6: フロントエンド 編集ダイアログ更新
- [ ] 組織編集ダイアログコンポーネントに `defaultRetentionDays` 入力欄を追加
  - 追加ダイアログと同仕様
  - 既存値を取得してフォームに設定

### Phase 7: 設計書・ドキュメント更新
- [ ] `docs/design/ui/ui_organization_add_dialog.md` に `defaultRetentionDays` 入力項目を追記
- [ ] `docs/design/ui/ui_organization_edit_dialog.md` に `defaultRetentionDays` 入力項目を追記
- [ ] `docs/design/api/api_organization_management.md` のリクエスト/レスポンス定義を更新

### Phase 8: 公開 Worker のフォールバック処理削除
- [ ] `backend/src/workers/maimlPublishWorker.ts` の修正
  - スキーマ存在チェック後、スキーマが**存在しない場合はエラーを投げる**（作成処理は削除）
  - 現在の冪等フォールバック処理（`createSchemaIfNotExists` / `createSchemaTables` 呼び出し）を削除
  - エラーメッセージ例: 「組織スキーマが存在しません。組織作成時の初期化に失敗している可能性があります。organizationId=...」
  - これにより Worker 処理がシンプルになり、異常状態（スキーマ未作成）を早期検知できる

**修正前（現状）:**
```typescript
const schemaExists = await assetRepo.schemaExists(organizationId);
if (!schemaExists) {
  await assetRepo.createSchemaIfNotExists(organizationId, org.organization_cd);
  await assetRepo.createSchemaTables(organizationId);
}
```

**修正後:**
```typescript
const schemaExists = await assetRepo.schemaExists(organizationId);
if (!schemaExists) {
  throw new Error(
    `組織スキーマが存在しません。組織作成時の初期化に失敗している可能性があります。` +
    ` organizationId=${organizationId}`
  );
}
```

---

## 5. 影響範囲

### 変更するファイル

| ファイル | 変更内容 |
|---------|---------|
| `backend/src/services/organizationService.ts` | `OrganizationResponse` 型追加、`createOrganization` / `updateOrganization` / マッピング処理の修正 |
| `backend/src/repositories/organizationManagementRepository.ts` | `update()` 引数型の拡張 |
| `backend/src/sql/queries/organizations/create.sql` | `default_retention_days` カラム追加 |
| `backend/src/controllers/organizationController.ts` | `defaultRetentionDays` パラメータの受け渡し |
| `backend/src/routes/organizationRoutes.ts` | バリデーション定義追加 |
| `frontend/src/components/Provider/OrganizationAddDialog.tsx`（または相当ファイル） | `defaultRetentionDays` 入力欄追加 |
| `frontend/src/components/Provider/OrganizationEditDialog.tsx`（または相当ファイル） | `defaultRetentionDays` 入力欄追加 |
| `docs/design/ui/ui_organization_add_dialog.md` | 設計書更新 |
| `docs/design/ui/ui_organization_edit_dialog.md` | 設計書更新 |
| `docs/design/api/api_organization_management.md` | API仕様更新 |
| `backend/src/workers/maimlPublishWorker.ts` | スキーマ存在チェック時のフォールバック処理削除（スキーマ未存在時はエラーを投げるよう変更） |

### 新規作成するファイル

| ファイル | 目的 |
|---------|------|
| `backend/migrations/20260313_add_default_retention_days_to_organization.sql` | DBマイグレーション |
| `backend/src/controllers/systemConfigController.ts` | system-config API ハンドラ（ホワイトリスト方式で環境変数を公開） |
| `backend/src/routes/systemConfigRoutes.ts` | `GET /api/v1/provider/system-config` ルート定義 |

### 影響を受ける機能

| 機能 | 影響の詳細 |
|------|-----------|
| 組織追加ダイアログ | 新フィールド追加（API・フォーム） |
| 組織編集ダイアログ | 新フィールド追加（API・フォーム） |
| 組織一覧 API | レスポンスに `defaultRetentionDays` 追加 |
| 組織CSV ダウンロード | `default_retention_days` 列追加 |
| 組織CSV アップロード | `default_retention_days` 列のバリデーション・処理追加 |
| 公開 Worker（将来実装） | `org.default_retention_days` 参照で `retention_until` を算出 |

---

## 6. 技術詳細

### マイグレーション方針

```sql
-- 既存テーブルへの追加
ALTER TABLE organization
  ADD COLUMN IF NOT EXISTS default_retention_days INT NOT NULL DEFAULT 30;

COMMENT ON COLUMN organization.default_retention_days IS 'MaiMLデータ公開時のデフォルト保持日数（日）。公開 Worker が retention_until 算出時に参照する。';
```

> **注意:** `DEFAULT 30` は既存レコードへの初期値付与のためのもの。本来は環境変数 `RETENTION_DAYS_DEFAULT` の値を使うべきだが、マイグレーション時点で環境変数値を動的に適用するのは困難なため、SQLレベルでは 30 をデフォルトとする。

### createOrganization 実装イメージ

```typescript
// backend/src/services/organizationService.ts

export async function createOrganization(data: { ..., defaultRetentionDays?: number }, userId: string) {
  // default_retention_days: リクエストから指定があれば使用、なければ環境変数から取得
  const defaultRetentionDays = data.defaultRetentionDays
    ?? parseInt(process.env.RETENTION_DAYS_DEFAULT ?? '30', 10);

  // バリデーション（サービス層）
  if (!Number.isInteger(defaultRetentionDays) || defaultRetentionDays < 1) {
    const error: any = new Error('公開保持日数は1以上の整数で指定してください');
    error.statusCode = 400;
    error.code = 'INVALID_DEFAULT_RETENTION_DAYS';
    throw error;
  }
  // ... INSERT に defaultRetentionDays を含める
}
```

### フロントエンド UI イメージ（追加ダイアログ）

```
公開保持日数（日） *
┌──────────────────────┐
│  30                  │
└──────────────────────┘
MaiMLデータ公開時のデフォルト保持日数（1日以上の整数）
```

**バリデーション:**
- 必須入力
- 1 以上の整数
- エラーメッセージ: 「公開保持日数は1以上の整数で入力してください」

---

## 7. セキュリティ考慮事項

- [ ] バリデーション（1以上の整数）はバックエンドの Route バリデーションで強制する
- [ ] `default_retention_days` は Provider のみが変更可能（既存の認証ミドルウェアで担保）
- [ ] SQLインジェクション対策: Parameterized Query を使用（既存パターンに準拠）
- [ ] マルチテナント分離: `organization_id` による分離は既存実装が対応済み

---

## 8. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 既存組織レコードへの DEFAULT 値適用 | 低 | 低 | マイグレーションで `DEFAULT 30` を設定。既存レコードは30日で初期化される |
| フロントエンドのコンポーネント名が設計書と異なる | 中 | 中 | 実装前にソースコードの実際のコンポーネントファイルを確認する |
| CSVアップロードの後方互換性 | 低 | 低 | `default_retention_days` 列は任意列とし、省略時は環境変数デフォルト値を使用する |

---

## 9. テスト計画

### バックエンド
- [ ] マイグレーション実行後、既存レコードに `default_retention_days = 30` が設定されていること
- [ ] 組織作成 API で `defaultRetentionDays` を指定しない場合、環境変数デフォルト値（30）が設定されること
- [ ] 組織作成 API で `defaultRetentionDays = 60` を指定した場合、60 が設定されること
- [ ] バリデーション: `defaultRetentionDays = 0` → 400エラー
- [ ] バリデーション: `defaultRetentionDays = -1` → 400エラー
- [ ] バリデーション: `defaultRetentionDays = null` → 400エラー
- [ ] 組織更新 API で `defaultRetentionDays` が正しく更新されること
- [ ] 組織一覧 API のレスポンスに `defaultRetentionDays` が含まれること

### フロントエンド（手動確認）
- [ ] 組織追加ダイアログに「公開保持日数」欄が表示される
- [ ] デフォルト値が 30 で表示される
- [ ] 0 を入力するとバリデーションエラーが表示される
- [ ] 保存後、編集ダイアログで入力値が反映されている
- [ ] 組織編集ダイアログで値を変更して保存できる

---

## 10. 関連ドキュメント

- [MaiML OpenData Pipeline 仕様書](../../MaiML_OpenData_Pipeline/spec.md) - セクション4.3
- [MaiML OpenData Pipeline DB設計書](../../MaiML_OpenData_Pipeline/db.md) - セクション8.1
- [MaiML OpenData Pipeline 未確定事項](../../MaiML_OpenData_Pipeline/pending.md) - #8 ✅ 確定
- [組織管理API設計書](../../design/api/api_organization_management.md)
- [組織追加ダイアログUI設計書](../../design/ui/ui_organization_add_dialog.md)
- [組織編集ダイアログUI設計書](../../design/ui/ui_organization_edit_dialog.md)
- [organizationテーブルDDL](../../design/db/ddl/organization.sql)

---

## 11. 承認記録

- **計画書提示日時**: 2026-03-13 11:20
- **承認日時**: 2026-03-13 11:47
- **承認者コメント**: 承認。system-config API は汎用ホワイトリスト方式で共通化すること。

---

## 12. 実施記録

### 実施日時
- 開始: 2026-03-13 11:47
- 完了: 2026-03-13 12:05

### 完了した成果物

- [x] `organization` テーブルに `default_retention_days INT NOT NULL DEFAULT 30` が追加されている
  - `backend/migrations/20260313_add_default_retention_days_to_organization.sql`
- [x] バックエンド SQL クエリ（create/update/findAll/findById）に `default_retention_days` を反映
- [x] Repository・Service・Route・Controller を更新
- [x] `GET /api/v1/provider/system-config` エンドポイント追加（ホワイトリスト方式）
- [x] 組織追加ダイアログに `defaultRetentionDays` 入力欄を追加
- [x] 組織編集ダイアログに `defaultRetentionDays` 入力欄を追加
- [x] 画面初期表示時に `system-config` API からデフォルト値を取得してフォームに設定
- [x] 翻訳キー追加（`ja.json` / `en.json`）
- [x] 公開 Worker の `default_retention_days ?? 30` フォールバック削除
- [x] Phase 8: スキーマ存在チェック時のフォールバック（`createSchemaIfNotExists` / `createSchemaTables`）削除 → スキーマ未存在時はエラーを投げるよう変更済み

### 計画からの変更点

**フロントエンドコンポーネント:**
設計書では `OrganizationAddDialog.tsx` / `OrganizationEditDialog.tsx` として記載していたが、
実際には `OrganizationManagement.tsx` 内の Modal に両ダイアログが統合されていたため、
同ファイルを直接修正した。

### 発生した問題と解決方法

特になし。
