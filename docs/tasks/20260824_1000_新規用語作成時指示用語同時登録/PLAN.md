# タスク計画書: 新規用語作成時の実験計画指示用語同時登録機能

## メタデータ

- **作成日時**: 2026-08-24 10:00
- **タスクID**: 20260824_1000
- **優先度**: 中
- **推定工数**: 6〜8時間

---

## 1. タスク概要

`NamespaceMain` で新規用語を作成する際に、実験計画指示用（PetriNetEditor の `TemplateEditorDialog` で使う）用語を同時登録できる機能を追加する。

### 具体的な動作

1. 新規用語入力行の末尾列に「指示用語同時登録」チェックボックスを追加する
2. チェックON で保存すると、元の用語（例: `MyCompany:SampleTemperature`）と同時に、`localName` の先頭に `SupervisorDirective` を付けた用語（例: `MyCompany:SupervisorDirectiveSampleTemperature`）を同一 prefix に登録する
3. 元の用語レコードに `has_directive_term` フラグカラム（`BOOLEAN DEFAULT FALSE`）を追加し、指示用語が登録されている場合は `TRUE` にする
4. `TemplateEditorDialog`（PetriNetEditor の用語選択 Select）の用語一覧を `hasDirectiveTerm = TRUE` の用語のみに絞り込む

### 失敗時の挙動

- 元の用語と指示用語のどちらかの INSERT が失敗した場合は **トランザクションロールバック**（両方登録されない）

---

## 2. 背景・前提

| 項目 | 内容 |
|-----|-----|
| 対象テーブル | `namespace_term`（`organization_id`, `namespace_id`, `prefix`, `localname`, `is_active` 等） |
| 指示用語の命名規則 | `SupervisorDirective` + 元の `localName`（例: `SupervisorDirectiveSampleTemperature`） |
| PetriNetEditor での用語選択 | `TemplateEditorDialog.tsx` の `getAllTermsAsMap()` で全件取得し `<Select>` に表示（2151行付近） |
| 既存のシステム固定指示用語 | `Alchemia:SupervisorDirective*` は別管理（今回のマイグレーションで `has_directive_term=TRUE` に更新） |

---

## 3. 実装ステップ

### Phase 1: DB マイグレーション

- [x] **新規ファイル**: `backend/migrations/20260824_1000_add_has_directive_term_to_namespace_term.sql`
  - `namespace_term` に `has_directive_term BOOLEAN NOT NULL DEFAULT FALSE` を追加
  - `ADD COLUMN IF NOT EXISTS` で冪等性確保
  - 既存の `Alchemia:SupervisorDirective*` 用語を `has_directive_term = TRUE` に UPDATE

### Phase 2: DDL 参照ファイル更新

- [x] `docs/design/db/ddl/namespace_term.sql` に `has_directive_term` カラムを追記

### Phase 3: バックエンド SQL ファイル修正

- [x] `createTerm.sql` — `has_directive_term`（`$9`）を INSERT 列に追加
- [x] `findTermByKey.sql` — `t.has_directive_term AS "hasDirectiveTerm"` を SELECT に追加
- [x] `findAllByOrganization.sql` — UNION ALL の両側に `hasDirectiveTerm` を追加
- [x] `findAllByScopeKey.sql` — `has_directive_term AS "hasDirectiveTerm"` を SELECT に追加
- [x] `findAllGlobal.sql` — `has_directive_term AS "hasDirectiveTerm"` を SELECT に追加
- [x] `updateTerm.sql` — `has_directive_term`（`$8`）を UPDATE 対象に追加

### Phase 4: Repository 層修正

- [x] `backend/src/repositories/namespaceTermRepository.ts`
  - `NamespaceTerm` に `has_directive_term: boolean` 追加
  - `NamespaceTermRow` に `hasDirectiveTerm: boolean` 追加
  - `create()` の引数に `hasDirectiveTerm?: boolean` 追加
  - **`createInTx()` 新規追加**：`ITask` を第一引数に受け取るトランザクション内専用 INSERT メソッド
  - `update()` の引数に `hasDirectiveTerm?: boolean` 追加

### Phase 5: Service 層修正（トランザクション化）

- [x] `backend/src/services/namespaceService.ts`
  - `CreateTermInput` に `createDirectiveTerm?: boolean` 追加
  - `createTerm()` を修正：
    - `createDirectiveTerm === true` の場合、`getPgp().tx()` でトランザクション開始
      1. 元の用語を `hasDirectiveTerm: true` で INSERT
      2. `SupervisorDirective${localName}` を同一 `prefix` で INSERT（`hasDirectiveTerm: false`）
    - 失敗時はロールバック（例外を上位に re-throw）
    - `createDirectiveTerm !== true` の場合は従来通り
  - **バリデーション追加**：`SupervisorDirective` (17文字) + `localName` が 255 文字超の場合 HTTP 422（コード `E6006`）

### Phase 6: Controller 層修正

- [x] `backend/src/controllers/namespaceController.ts`
  - `createTerm()` で `req.body.createDirectiveTerm` を受け取り Service に渡す

### Phase 7: バックエンド API 型定義修正

- [x] `backend/src/types/api.ts`
  - `CreateTermBody` に `createDirectiveTerm?: boolean` 追加

### Phase 8: フロントエンド 型定義修正

- [x] `frontend/src/types/namespace.ts`
  - `Term` に `hasDirectiveTerm?: boolean` 追加
  - `NewTermRow` に `createDirectiveTerm?: boolean` 追加

### Phase 9: フロントエンド API Service 修正

- [x] `frontend/src/services/namespaceApiService.ts`
  - `NamespaceTermRow` に `hasDirectiveTerm?: boolean` 追加
  - `TermUpsertRequest` に `createDirectiveTerm?: boolean` 追加

### Phase 10: NamespaceMain.tsx 修正

- [x] `frontend/src/components/namespace/NamespaceMain.tsx`
  - テーブルの末尾列に「指示用語同時登録」Checkbox 列を追加
    - ヘッダー: `t('namespaceMain.colCreateDirectiveTerm')` + Tooltip
    - 新規入力行: Checkbox（`localName` 未入力時は `disabled`）
    - 既存用語行: `hasDirectiveTerm === true` の場合に「指示あり」Tag、それ以外は空
  - `updateNewTerm()` で `createDirectiveTerm` フィールドの更新に対応
  - `handleAddSave()` の `createTerm()` 呼び出しに `createDirectiveTerm: row.createDirectiveTerm` を追加

### Phase 11: TemplateEditorDialog.tsx 修正

- [x] `frontend/src/components/editorv2/TemplateEditorDialog.tsx`
  - `getAllTermsAsMap()` 呼び出し後の `termMap` 構築ブロックで `hasDirectiveTerm !== true` のエントリを除外するフィルタリングを追加

### Phase 12: i18n 追加

- [x] `frontend/src/locales/ja.json`（`namespaceMain` セクション）
  - `colCreateDirectiveTerm`: `"指示用語"`
  - `createDirectiveTermTooltip`: `"チェックすると SupervisorDirective{用語名} の指示用語を同時に登録します"`
  - `hasDirectiveTermBadge`: `"指示あり"`
  - `createDirectiveTermSuccess`: `"指示用語も同時に登録しました"`
  - `directiveTermLocalNameTooLong`: `"用語名が長すぎます（SupervisorDirective を付けると255文字を超えます）"`
- [x] `frontend/src/locales/en.json`（`namespaceMain` セクション）
  - `colCreateDirectiveTerm`: `"Directive Term"`
  - `createDirectiveTermTooltip`: `"Check to also register a directive term prefixed with 'SupervisorDirective'"`
  - `hasDirectiveTermBadge`: `"Has directive"`
  - `createDirectiveTermSuccess`: `"Directive term also registered"`
  - `directiveTermLocalNameTooLong`: `"Term name is too long (adding 'SupervisorDirective' would exceed 255 characters)"`

---

## 4. 変更ファイル一覧

| # | ファイル | 変更種別 |
|---|--------|---------|
| 1 | `backend/migrations/20260824_1000_add_has_directive_term_to_namespace_term.sql` | **新規** |
| 2 | `docs/design/db/ddl/namespace_term.sql` | 修正 |
| 3 | `backend/src/sql/queries/namespace_terms/createTerm.sql` | 修正 |
| 4 | `backend/src/sql/queries/namespace_terms/findTermByKey.sql` | 修正 |
| 5 | `backend/src/sql/queries/namespace_terms/findAllByOrganization.sql` | 修正 |
| 6 | `backend/src/sql/queries/namespace_terms/findAllByScopeKey.sql` | 修正 |
| 7 | `backend/src/sql/queries/namespace_terms/findAllGlobal.sql` | 修正 |
| 8 | `backend/src/sql/queries/namespace_terms/updateTerm.sql` | 修正 |
| 9 | `backend/src/repositories/namespaceTermRepository.ts` | 修正 |
| 10 | `backend/src/services/namespaceService.ts` | 修正 |
| 11 | `backend/src/controllers/namespaceController.ts` | 修正 |
| 12 | `backend/src/types/api.ts` | 修正 |
| 13 | `frontend/src/types/namespace.ts` | 修正 |
| 14 | `frontend/src/services/namespaceApiService.ts` | 修正 |
| 15 | `frontend/src/components/namespace/NamespaceMain.tsx` | 修正 |
| 16 | `frontend/src/components/editorv2/TemplateEditorDialog.tsx` | 修正 |
| 17 | `frontend/src/locales/ja.json` | 修正 |
| 18 | `frontend/src/locales/en.json` | 修正 |

---

## 5. 影響範囲

| 区分 | 詳細 |
|-----|-----|
| DBスキーマ | `namespace_term` に `has_directive_term BOOLEAN NOT NULL DEFAULT FALSE` 追加。既存レコードはすべて `FALSE` |
| 既存API | `POST /api/v1/namespaces/terms`：`createDirectiveTerm` 追加（省略可・後方互換あり） |
| **TemplateEditorDialog（要注意）** | 用語 Select が `hasDirectiveTerm = TRUE` の用語のみに絞り込まれる。マイグレーションで `Alchemia:SupervisorDirective*` を `TRUE` に更新することで既存動作を維持 |

---

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `findAllByOrganization.sql` の UNION ALL 片側への追加漏れ | 中 | 高 | SQL修正後に列数・型を確認 |
| `TemplateEditorDialog` フィルタで Alchemia 用語が消える | 高 | 高 | マイグレーションで `has_directive_term = TRUE` に更新 |
| `SupervisorDirective` + localName が 255 文字超 | 低 | 低 | Service 層でバリデーション（HTTP 422） |
| `createInTx()` 内クエリが `ITask` コンテキスト外になる | 中 | 中 | `createInTx()` 内のすべてのクエリを `t.oneOrNone / t.none` で実行 |

---

## 7. テスト計画

- [x] チェックON 保存 → DB に2件（元の用語 + `SupervisorDirective{localName}`）が挿入されること
- [x] チェックOFF 保存 → DB に1件のみ挿入されること
- [x] `SupervisorDirective{localName}` が重複する場合 → 両方ロールバックされること
- [x] `has_directive_term = TRUE` の用語に「指示あり」バッジが表示されること
- [x] `localName` 空の場合 Checkbox が `disabled` であること
- [x] 255 文字超の localName でバリデーションエラーが表示されること
- [x] `TemplateEditorDialog` の Select に `hasDirectiveTerm = TRUE` の用語のみ表示されること
- [x] 既存の `Alchemia:SupervisorDirective*` 用語が TemplateEditorDialog に表示されること

---

## 8. 承認記録

- **計画書提示日時**: 2026-08-24 10:00
- **承認日時**: 2026-08-24 10:00
- **承認者コメント**: 実装開始

## 9. 実施記録

### 実施日時
開始: 2026-08-24
完了: 2026-08-24

### 計画からの変更点
- `backend/src/constants/httpStatus.ts` に `UNPROCESSABLE_ENTITY: 422` を追加（httpStatus 定数が未定義だったため）
- `backend/src/utils/messages.ts` に `namespace.directiveLocalNameTooLong` キーを ja/en 両方に追加（Phase 5 の一部として実施）
- `handleAddSave` にて指示用語登録時の成功メッセージ出し分けを追加

### 最終的な成果物
- [x] DBマイグレーションファイル作成
- [x] DDL参照ファイル更新
- [x] バックエンドSQL 6ファイル修正
- [x] Repository層修正（`createInTx` 新規追加含む）
- [x] Service層修正（トランザクション化・バリデーション追加）
- [x] Controller層修正
- [x] Backend API型定義修正
- [x] Frontend型定義修正
- [x] Frontend API Service修正
- [x] NamespaceMain.tsx 修正（Checkbox列追加）
- [x] TemplateEditorDialog.tsx 修正（hasDirectiveTerm フィルタ追加）
- [x] i18n追加（ja.json / en.json）
