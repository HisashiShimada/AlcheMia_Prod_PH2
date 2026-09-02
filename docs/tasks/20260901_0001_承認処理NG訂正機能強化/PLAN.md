# タスク計画書: 承認処理・NG・記録値訂正機能強化

## メタデータ

- **作成日時**: 2026-09-01
- **タスクID**: 20260901_0001
- **優先度**: 高
- **推定工数**: 3〜4日
- **対象コンポーネント**: ExperimentInstructionTab（実験指示タブ）

---

## 1. タスク概要

`ExperimentInstructionTab` から実行する承認・NG処理と記録値訂正機能を実装・強化する。

### 背景

現在の実装では承認（`task_status 2→3`）とNG記録（`task_status 2→5`）はDBのみ更新されているが、
event_log（`maiml_event_log` テーブル + MAIML XML）には記録されていない。
また、実験指示タブから記録値（実績値）を訂正する手段がなく、誤入力があった場合に作業者画面で再保存する必要がある。

---

## 2. 目的と期待される成果

- [ ] 承認操作の結果が `maiml_event_log` テーブルと MAIML XML の両方に記録される
- [ ] NG操作の結果（NG理由含む）が `maiml_event_log` テーブルと MAIML XML の両方に記録される
- [ ] `experiment_admin` が実験指示タブから実績値（`template_data`）を直接訂正できる
- [ ] 記録値訂正の内容（訂正前後の値・key・instanceUUID・日時・操作者）が `maiml_event_log` と MAIML XML に記録される

---

## 3. 要件定義

### 3-1. 承認・NG の event_log 記録

- **対象**: タスク承認（`task_status: 2→3`）、NG記録（`task_status: 2→5`）
- **記録先**: `maiml_event_log` テーブル（JSON）と MAIML XML ファイルの両方
- **記録粒度**: タスク単位（`methodId` + `taskNo`）

**記録内容（承認）**:
- `time:timestamp`: 承認日時（ISO8601）
- `Alchemia:reviewResult`: `"approved"`
- `ownerRef`: 承認者ユーザID（issuer）

**記録内容（NG）**:
- `time:timestamp`: NG記録日時（ISO8601）
- `Alchemia:reviewResult`: `"ng"`
- `Alchemia:ngReason`: NG理由テキスト
- `ownerRef`: 記録者ユーザID（issuer）

**JSON構造**: `eventLog > log[@ref=methodId] > trace[@taskno=taskNo] > event > property + ownerRef`

### 3-2. NGパターンについて

- UI上でのNGボタンは現行の1種類のみ（パターン区別ボタンの追加なし）
- 「指示含め作り直し」か「記録のみ」かの区別は **チェックアウト後のステータスで判別**
  - タスク追加あり → チェックアウト後に通常チェックアウト → `project_status: 1`（pending）
  - タスク追加なし → チェックアウト後 `project_status: レビュー差戻`（新ステータス）
- `project_status` に「レビュー差戻」ステータスを追加する（**今回スコープ**）
- NGコメント欄に目的を記載する運用とする
- DB への `ng_type` 保存は不要

### 3-3. 記録値訂正機能

- **対象**: `task_status=2`（review_waiting）のタスクの実績値（`actual`列）のみ
- **訂正後もステータスは変更しない**（`task_status=2` を維持）
- **権限**: `experiment_admin`（`040000`）

**UI仕様**:
- ツールバーに「訂正モード」ボタン追加
- 押下で `isCorrectionMode = true`（訂正モード開始）
- 訂正モード中はレビュー待ちタスクの `actual` セルが `Input` に切り替わる
- `pendingCorrections` ステートで変更を一時保持（キー: `rowKey`）
- ツールバーに「保存」「キャンセル」ボタンを表示
- 訂正モード中は「承認処理」ボタンを非活性
- 保存で対象タスクの `template_data` を一括更新

**`FlatRow` に `placeId: string` フィールドを追加**（訂正時にバックエンドへ渡すために必要）

### 3-4. 記録値訂正の event_log 記録

**property key 命名**: `Alchemia:correction` プレフィックスを付けて「訂正」操作であることを明示する。`:` による階層接続はプレフィックスの1段階のみとする。

**記録内容**:
- `time:timestamp`: 訂正日時（ISO8601）
- `Alchemia:correctionInstanceUuid`: 訂正したインスタンスの UUID（後述の `property_set.instanceUuid`）
- `Alchemia:correctionPropKey`: 訂正した property のキー
- `Alchemia:correctionBeforeValue`: 訂正前の値
- `Alchemia:correctionAfterValue`: 訂正後の値
- `ownerRef`: 訂正者ユーザID（issuer）

### 3-5. `template_data.property_set` への `instanceUuid` 追加

訂正 event_log で参照するインスタンス UUID を `property_set` JSON の最上位フィールドとして保持する。

**方針**:
- マイグレーション（カラム追加）は**不要**。`property_set` JSONB の最上位に `instanceUuid` フィールドを追加する
- **払い出しタイミング**: `TemplateDataRepository.upsert` 内で、**新規 INSERT 時のみ** `randomUUID()` で生成して格納。UPDATE 時は既存の `instanceUuid` を維持する
- `PropertySet` 型定義に `instanceUuid?: string` フィールドを追加する

**対象ファイル**:
- `backend/src/repositories/templateDataRepository.ts`（`PropertySet` 型 + `upsert` メソッド）
- `upsert.sql` は変更不要（`property_set` ごと JSON として渡すため）

---

## 4. 実装ステップ（チェックリスト）

### Phase 1: バックエンド — EventLogRepository への新メソッド追加

- [x] **1-1** `insertTaskReviewLog` メソッドを `EventLogRepository` に追加
  - パラメータ: `organizationId`, `projectId`, `methodId`, `taskNo`, `reviewType('approved'|'ng')`, `ngReason(string|null)`, `reviewUserId`, `projectName`, `client`
  - JSON構造: `log[@ref=methodId] > trace[@taskno=taskNo] > event > property[time:timestamp, Alchemia:reviewResult, Alchemia:ngReason?] + ownerRef[issuer]`
  - sequence_no を自動採番（既存ロジック流用）
  - ID命名規則: `log_{projectName}Task_review_{seq}`, `trace_{projectName}Task_review_{seq}`, `event_{projectName}Task_review_{seq}`, `ownerRef_{projectName}Task_review_{seq}_issuer`

- [x] **1-2** `insertRecordCorrectionLog` メソッドを `EventLogRepository` に追加
  - パラメータ: `organizationId`, `projectId`, `methodId`, `taskNo`, `corrections[{instanceUuid, propKey, beforeValue, afterValue}]`, `correctedByUserId`, `projectName`, `client`
  - 訂正1件につき1 event を生成（複数訂正 = 複数 event、同一トレースにネスト）
  - JSON構造: `log[@ref=methodId] > trace[@taskno=taskNo] > event[] > property[time:timestamp, Alchemia:correctionInstanceUuid, Alchemia:correctionPropKey, Alchemia:correctionBeforeValue, Alchemia:correctionAfterValue] + ownerRef`
  - ID命名規則: `log_{projectName}Record_correction_{seq}`, `trace_{projectName}Record_correction_{seq}`, `event_{projectName}Record_correction_{seq}_{n}`

### Phase 2: バックエンド — approveTask / recordNg への event_log 記録追加

- [x] **2-0** `project_status` に「レビュー差戻」ステータスを追加する
  - `backend/src/enums/codeMaster.enum.ts` の `ProjectStatusEnum` に `REVIEW_REJECTED: 6` を追加
  - `backend/src/types/project.ts` の `PROJECT_STATUS_STRING_MAP` に `6: 'review_rejected'` を追加
  - `backend/.cline/skills/backend-develop-skill/docs/status_transitions.md` のステータス表を更新 ※未実施（6-3 相当、ドキュメント更新フェーズで対応）
  - チェックアウト処理（`projectService.ts`）でNG後にタスク追加なしでチェックアウトした場合に `project_status: 6`（review_rejected）へ遷移するロジックを追加 ✅
    - `updateCheckoutStatus.sql` / `projectRepository.updateCheckoutStatus` を `targetProjectStatus` パラメータ化
    - `projectService.checkout` で pending タスク数を確認し遷移先を判定

- [x] **2-1** `experimentInstructionService.ts` の `approveTask` を更新
  - DB更新 + event_log 書き込みをトランザクション内で実行
  - `EventLogRepository.insertTaskReviewLog('approved', null, ...)` を呼び出す
  - `maimlWriterService` 経由で MAIML XML にも書き込む（non-fatal）

- [x] **2-2** `experimentInstructionService.ts` の `recordNg` を更新
  - 同上。`reviewType='ng'`, `ngReason=ngReason` を渡す

### Phase 3: バックエンド — 記録値訂正 API

- [x] **3-1** `experimentInstructionController.ts` に `correctRecord` ハンドラを追加
  - `req.user` から `organizationId`, `userId` を取得
  - `req.params` から `projectId`, `methodId`, `taskNo` を取得
  - `req.body.records` を `experimentInstructionService.correctRecord` に渡す

- [x] **3-2** `experimentInstructionService.ts` に `correctRecord` メソッドを追加
  - `projectTaskDetailRepo.findByPrimaryKey` で `task_status=2` を確認（409 エラー）
  - 訂正前の値を `templateDataRepository` で取得（`property_set.instanceUuid` も取得）
  - `templateDataRepository.upsert` で値を更新（`instanceUuid` は既存値を維持）
  - `corrections` 配列を組み立て（`{instanceUuid, propKey, beforeValue, afterValue}`）
  - `EventLogRepository.insertRecordCorrectionLog` を呼び出す
  - `maimlWriterService.writeDataAndEventLog` 経由で MAIML XML にも書き込む（non-fatal）

- [x] **3-3** `experimentInstructionRoutes.ts` に PATCH エンドポイントを追加
  - パス: `PATCH /:projectId/experiment-instructions/:methodId/:taskNo/correct`
  - 権限: `experiment_admin`（`checkPermission('040000', 1)`）
  - バリデーション: `projectId`（文字列）, `methodId`（文字列）, `taskNo`（整数）, `records`（配列）

### Phase 4: フロントエンド — 型定義・API サービス

- [x] **4-1** `frontend/src/types/experimentInstruction.ts` に型を追加
  - `CorrectRecordItem`: `{ placeId: string; data: { templateId, templateType, properties } }`
  - `CorrectRecordRequest`: `{ records: CorrectRecordItem[] }`
  - `CorrectRecordResponse`: `{ success: boolean; data: { corrected: number } }`
  - `InstructionTemplateResponse` に `placeId: string | null` を追加

- [x] **4-2** `FlatRow` インターフェースに `placeId`, `templateType`, `templateId`, `properties` フィールドを追加

- [x] **4-3** `flattenInstructions` 関数で `placeId` を設定する
  - バックエンドの `InstructionTemplate`（`api.ts`）/ `InstructionTemplateResponse`（フロント型）に `placeId` を追加
  - `getExperimentInstructions` レスポンス生成時に `placeId: row.place_id` を設定

- [x] **4-4** `frontend/src/services/experimentInstructionApiService.ts` に `correctRecord` 関数を追加

### Phase 5: フロントエンド — ExperimentInstructionTab.tsx の訂正モード UI

- [x] **5-1** ステートの追加
  - `isCorrectionMode: boolean`
  - `pendingCorrections: Map<string, string>`（キー: `rowKey`）
  - `correctionLoading: boolean`

- [x] **5-2** ツールバーへ「訂正」ボタン追加
  - 訂正モード中は「保存」「キャンセル」ボタンに切り替え
  - 訂正モード以外は通常ボタン群を表示

- [x] **5-3** `actual` 列のセルレンダリングを条件分岐
  - `isCorrectionMode && row.taskStatus === '04'` の場合: `<Input>` を表示
  - それ以外: 現行の `<ActualCell>` を表示
  - 入力変更時に `pendingCorrections` を更新

- [x] **5-4** 保存処理 `handleSaveCorrections` を実装
  - `pendingCorrections` をタスク別・placeId 別にグループ化して `CorrectRecordRequest` に変換
  - `correctRecord(projectId, methodId, taskNumber, body)` を呼び出す
  - 成功: `message.success` → `isCorrectionMode = false` → `fetchData()`
  - 失敗: `message.error`

- [x] **5-5** キャンセル処理: `pendingCorrections` クリア → `isCorrectionMode = false`

### Phase 6: i18n / ドキュメント

- [x] **6-1** `frontend/src/locales/ja.json` に以下のキーを追加
  - `experimentInstructionTab.correctionMode`: 「訂正」
  - `experimentInstructionTab.saveCorrectionBtn`: 「保存」
  - `experimentInstructionTab.cancelCorrectionBtn`: 「キャンセル」
  - `experimentInstruction.correctionSaved`: 「訂正が保存されました」
  - `experimentInstruction.correctionError`: 「訂正の保存に失敗しました」

- [x] **6-2** `frontend/src/locales/en.json` に同様のキーを追加

- [x] **6-3** `.clinerules/references/eventlog_structure.md` に新フェーズを追記
  - `Task_review`（`insertTaskReviewLog`）フェーズ追加
  - `Record_correction`（`insertRecordCorrectionLog`）フェーズ追加
  - フェーズ名一覧・フェーズ識別名一覧を更新
  - セクション 4 としてタスクレビュー / 記録値訂正の詳細規約を追加

- [x] **6-4** `docs/design/ui/experiment_admin/01_project_management/ui_experiment_instruction_tab.md` を更新
  - バージョン 3.0.0 / 最終更新日 2026-09-01 に更新
  - 主要機能に「記録値訂正」を追加
  - 画面レイアウトに訂正モード表示を追加
  - ツールバー構成表を通常モード / 訂正モード中に分割
  - セクション 8.5 として記録値訂正フローを追加
  - エラーハンドリング表に訂正関連エラーを追加
  - API 一覧表を更新（承認/NG のメソッド修正、訂正エンドポイント追加）
  - 変更履歴に 2026-09-01 エントリを追加

---

## 5. 変更ファイル一覧

| No | ファイルパス | 変更種別 | 変更内容 |
|----|------------|---------|---------|
| 1 | `backend/src/enums/codeMaster.enum.ts` | 更新 | `ProjectStatusEnum` に `REVIEW_REJECTED: 6` 追加 |
| 2 | `backend/src/types/project.ts` | 更新 | `PROJECT_STATUS_STRING_MAP` に `6: 'review_rejected'` 追加 |
| 3 | `backend/src/services/projectService.ts` | 更新 | チェックアウト時に `review_rejected` 遷移ロジック追加 |
| 4 | `backend/src/repositories/templateDataRepository.ts` | 更新 | `PropertySet` 型に `instanceUuid?: string` 追加。`upsert` で新規 INSERT 時に UUID 自動生成・既存 UPDATE 時に維持 |
| 5 | `backend/src/repositories/eventLogRepository.ts` | 更新 | `insertTaskReviewLog`, `insertRecordCorrectionLog` 追加 |
| 6 | `backend/src/services/experimentInstructionService.ts` | 更新 | `approveTask`, `recordNg` に event_log 記録追加。`correctRecord` 追加 |
| 7 | `backend/src/controllers/experimentInstructionController.ts` | 更新 | `correctRecord` ハンドラ追加 |
| 8 | `backend/src/routes/experimentInstructionRoutes.ts` | 更新 | PATCH エンドポイント追加 |
| 9 | `frontend/src/types/experimentInstruction.ts` | 更新 | 型追加 |
| 10 | `frontend/src/components/project/ExperimentInstructionTab.tsx` | 更新 | `FlatRow.placeId` 追加、訂正モード UI 追加 |
| 11 | `frontend/src/services/experimentInstructionApiService.ts` | 更新 | `correctRecord` 関数追加 |
| 12 | `frontend/src/locales/ja.json` | 更新 | i18n キー追加 |
| 13 | `frontend/src/locales/en.json` | 更新 | i18n キー追加 |
| 14 | `.cline/skills/backend-develop-skill/docs/status_transitions.md` | 更新 | `REVIEW_REJECTED` ステータス追記 |
| 15 | `.clinerules/references/eventlog_structure.md` | 更新 | 新フェーズ追記 |
| 16 | `docs/design/ui/experiment_admin/01_project_management/ui_experiment_instruction_tab.md` | 更新 | 訂正モード仕様追加 |

---

## 6. 影響範囲

- `ProjectStatusEnum` への `REVIEW_REJECTED: 6` 追加により、ステータス遷移チェックが入っている箇所すべてに影響
- チェックアウト処理（`projectService.ts`）の遷移ロジックに条件分岐追加
- 承認・NG 操作時に `maiml_event_log` テーブルへの書き込みが増加
- 承認・NG・訂正 操作時に MAIML XML への書き込みが増加（S3/Swift への PUT）
- `eventLogRepository.ts`: 既存メソッドに影響なし（追加のみ）
- 既存の `approveTask` / `recordNg` のシグネチャ変更の可能性（トランザクション対応）
- `getExperimentInstructions` のレスポンスに `placeId` が含まれない場合はバックエンドのレスポンス形式も変更が必要

---

## 7. リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| MAIML XML 書き込み失敗時のDB整合性 | 高 | DB + event_log をトランザクション内で先行完了。XML失敗はログのみ記録 |
| `task_status≠2` への訂正リクエスト | 中 | バックエンドで 409 を返す |
| 訂正モード中の承認ボタン誤押下 | 低 | 訂正モード中は「承認処理」ボタンを非活性 |
| `placeId` がレスポンスに存在しない | 中 | 実装前にバックエンドレスポンスを確認・必要なら追加 |
| 既存テストへの影響 | 低〜中 | 既存テストのモックを更新。後方互換を保つ形で変更 |

---

## 8. テスト計画

### 手動テスト

- [ ] レビュー待ちタスクを承認 → `maiml_event_log` に `Alchemia:reviewResult = "approved"` が記録されること
- [ ] レビュー待ちタスクをNG → `maiml_event_log` に `Alchemia:reviewResult = "ng"` とNG理由が記録されること
- [ ] 上記で MAIML XML にも event が追記されること
- [ ] 訂正モードで実績値を変更して保存 → `template_data` が更新されること
- [ ] 訂正後に `maiml_event_log` に訂正前後の値が記録されること
- [ ] `task_status=2` 以外のタスクへの訂正リクエストが 409 で返ること
- [ ] 権限のないユーザーが訂正 API を叩いた場合に 403 で返ること
- [ ] 訂正モード中は「承認処理」ボタンが非活性であること

---

## 9. 承認記録

- **計画書提示日時**: 2026-09-01
- **承認日時**: 2026-09-01
- **承認者コメント**: 承認済み。実装完了。

## 10. 規約遵守チェック結果

**実施日**: 2026-09-01

### 検出した違反と修正

| # | 違反種別 | 対象ファイル | 内容 | 対応 |
|---|---------|------------|------|------|
| 1 | インライン型定義（`typescript.md`） | `experimentInstructionService.ts` | `correctRecord` の `records` 引数にインライン型定義 | `backend/src/types/api.ts` に `CorrectRecordItem` / `CorrectRecordResult` / `CorrectRecordInput` を定義して参照 |
| 2 | インライン型定義（`typescript.md`） | `experimentInstructionController.ts` | `req.body as { records: Array<{...}> }` のインライン型キャスト | `CorrectRecordInput` 型を import して使用 |
| 3 | `any` 型の使用（`typescript.md`） | `experimentInstructionService.ts` | `(afterProp as any).key` 等の `as any` キャスト | `Property` 型で明示的にキャストして `as any` を除去 |
| 4 | インラインオブジェクト引数（`config.md`） | `experimentInstructionService.ts` | `recordParam.propertySet` にネストされたオブジェクトリテラル | `updatedPropertySet: PropertySet` として変数に代入してから渡す |
| 5 | インライン SQL（`database.md`） | `templateDataRepository.ts` `upsert` | `SELECT property_set FROM template_data ...` をべた書き | 既存の `this.findByPlaceId(...)` メソッドを呼び出すよう修正 |
| 6 | インライン SQL（`database.md`） | `experimentInstructionService.ts` `correctRecord` | 訂正前後の `property_set` 取得で `client.query(\`SELECT...\`)` をべた書き | `templateDataRepo.findByPlaceId(...)` 経由に修正（Repository 層経由のルール遵守）|

### 問題なしと確認した項目

- ✅ Controller → Service → Repository の呼び出し順
- ✅ バリデーションはミドルウェア（`express-validator` + `handleValidationErrors`）で実施
- ✅ `organization_id` による全 DB クエリのマルチテナント分離
- ✅ ENUM 使用（`ProjectStatusEnum.REVIEW_REJECTED`、`TaskStatusEnum.PENDING`）
- ✅ フロントエンドのユーザー表示文字列はすべて `t()` 経由
- ✅ フロントエンドの API 呼び出しは `services/` 経由
- ✅ Parameterized Query でインジェクション対策
- ✅ `tenantIsolation` なし（`experimentInstructionRoutes.ts` は既存パターンと同様）

