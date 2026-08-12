# タスク計画書: Alchemia共通名前空間追加とmgr-instruction廃止

## メタデータ
- **作成日時**: 2026-08-12 15:30
- **タスクID**: 20260812_1530_alchemia-system-namespace
- **優先度**: 高
- **推定工数**: 4時間

---

## 1. タスク概要

以下3つの方針を追加・実装する。

1. **システム共通グローバル名前空間の新設**
   - prefix: `Alchemia`、URI: `https://Alchemia.co.jp`
   - 固定UUID（`00000000-0000-0000-0000-000000000000`）を `SYSTEM_ORGANIZATION_ID` としてコード定数定義
   - organization テーブルにはレコードを作らない
   - namespace / prefix / namespace_term テーブルに上記 UUID で1セットだけ INSERT

2. **システムが共通的に付与するキー（6件）を Alchemia 名前空間に登録**

3. **Alchemia は確認のみ可能・修正不可**
   - 判定方法: `namespace.uri === SYSTEM_NAMESPACE_URI`（is_systemフラグは追加しない）
   - バックエンド: 対象 URI がシステム URI と一致する場合 403 エラー
   - フロントエンド: prefix=`Alchemia` の行は編集・削除ボタンを無効化

合わせて `mgr-instruction` プレフィックスを廃止し、旧キーを新キーに置き換える。

---

## 2. キー対応表

| 旧キー | 新キー | 表示名 |
|--------|--------|--------|
| `SupervisorDirectiveContent` | `Alchemia:SupervisorDirectiveContent` | 通常指示 |
| `mgr-instruction:caution` | `Alchemia:SupervisorDirectiveCaution` | 安全上の注意事項 |
| `mgr-instruction:operationNote` | `Alchemia:SupervisorDirectiveOperationNote` | 操作手順上の注記 |
| `mgr-instruction:checkItem` | `Alchemia:SupervisorDirectiveCheckItem` | 実施前後の確認事項 |
| `mgr-instruction:prohibitedAction` | `Alchemia:SupervisorDirectiveProhibitedAction` | 禁止事項 |
| `mgr-instruction:OtherNotes` | `Alchemia:SupervisorDirectiveOtherNotes` | その他注意事項 |

---

## 3. 期待される成果

- [ ] 固定UUID の organization_id で Alchemia 名前空間・prefix・用語（6件）が1セット存在すること
- [ ] 全組織のプロジェクトスコープ参照（findDeclarationsByProjectScope 等）に Alchemia が含まれること
- [ ] DBスキーマ変更なし（is_system フラグは追加しない）
- [ ] URI 一致による保護で Alchemia のレコードは変更・削除できないこと
- [ ] フロントエンドで prefix=`Alchemia` の行は編集・削除ボタンが無効化されていること
- [ ] 旧キーが新キーに置き換わること
- [ ] TypeScriptビルドエラーがないこと

---

## 4. 実装ステップ

### Phase 1: 初期データ INSERT（マイグレーションSQL）

- [ ] `backend/migrations/20260812_1530_add_alchemia_system_namespace.sql` 新規作成
  - **DBスキーマ変更なし**（is_system カラムは追加しない）
  - 固定UUID `00000000-0000-0000-0000-000000000000` の organization_id で以下を INSERT
    - `namespace`: namespace_id=`NS0001`, uri=`https://Alchemia.co.jp`, global_flg=NULL, scope_key=NULL
    - `prefix`: prefix=`Alchemia`, is_active=TRUE
    - `namespace_term`: 6件（SupervisorDirectiveContent 〜 SupervisorDirectiveOtherNotes）
  - `project_instruction.instruction_key` の旧キー → 新キーに UPDATE（6件）
  - 全 INSERT は ON CONFLICT DO NOTHING で冪等

### Phase 2: バックエンド定数定義

- [ ] `backend/src/constants/systemNamespace.ts` 新規作成
  - `SYSTEM_ORGANIZATION_ID = '00000000-0000-0000-0000-000000000000'`
  - `SYSTEM_NAMESPACE_PREFIX = 'Alchemia'`
  - `SYSTEM_NAMESPACE_URI = 'https://Alchemia.co.jp'`
  - `SYSTEM_INSTRUCTION_KEYS`（6件）, `SYSTEM_INSTRUCTION_KEY_LABELS`

### Phase 3: 参照 SQL の修正（固定UUID を含める）

- [ ] `backend/src/sql/queries/namespace_terms/findDeclarationsByProjectScope.sql`
  - 修正: UNION ALL 方式で固定UUID のシステム namespace も常に含める
  - （既存クエリの組織スコープ条件は変更しない）

- [ ] `backend/src/sql/queries/namespace_terms/findNamespacesByOrganization.sql`
  - 修正: UNION ALL で固定UUID の Alchemia prefix / namespace も含める
  - MAIMLファイルへの xmlns 注入時に `Alchemia` prefix も書き込まれるようにする

- [ ] `backend/src/sql/queries/namespace_terms/findAllByOrganization.sql`
  - 修正: UNION ALL で固定UUID の Alchemia 用語も含める
  - 名前空間管理画面の用語一覧に Alchemia の用語も表示される

### Phase 4: Repository / Service への定数渡し

- [ ] `backend/src/repositories/namespaceTermRepository.ts`
  - 各 find 関数が SQL に `SYSTEM_ORGANIZATION_ID` を渡す形に修正
  （SQL の UNION ALL 内でハードコードするか、パラメータ渡しかは実装時に判断）

- [ ] `backend/src/services/namespaceService.ts`
  - 保護判定用ヘルパー `isSystemNamespaceUri(uri)` を追加

### Phase 5: バックエンド保護ロジック

- [ ] `backend/src/services/namespaceService.ts`
  - `deleteNamespace()`: 対象 namespace の uri が `SYSTEM_NAMESPACE_URI` と一致する場合 403 エラー
  - `createTerm()` / `updateTerm()` / `deleteTerm()` / `toggleTermActive()`:
    prefix が `SYSTEM_NAMESPACE_PREFIX` の場合 403 エラー

### Phase 6: mgr-instruction 廃止（バックエンド）

- [ ] `backend/src/services/projectInstructionService.ts`: デフォルト値 → `SYSTEM_INSTRUCTION_KEYS.GENERAL`
- [ ] `backend/src/services/experimentInstructionService.ts`: `NOTE_KEYS` → `SYSTEM_INSTRUCTION_KEYS` に変更
- [ ] `backend/src/services/maimlWriterService.ts`
  - `_injectExperimentPlanProps()`: `key="mgr-instruction:${escapedKey}"` → `key="${escapedKey}"`
  - クリーニング正規表現に `Alchemia:SupervisorDirective` パターンも追加

### Phase 7: フロントエンド定数・型の変更

- [ ] `frontend/src/constants/systemNamespace.ts` 新規作成（`SYSTEM_NAMESPACE_PREFIX`, `SYSTEM_NAMESPACE_URI`）
- [ ] `frontend/src/types/experimentPlan.ts`: `NoteType` 値を `Alchemia:SupervisorDirectiveXxx` に変更
- [ ] `frontend/src/types/instructionRegistration.ts`: `INSTRUCTION_KEY` 値を `Alchemia:SupervisorDirectiveXxx` に変更
- [ ] `frontend/src/services/experimentPlanApiService.ts`: TransitionPlanValues / NOTE_TYPE_KEYS / reservedKeys を新形式に変更

### Phase 8: フロントエンド UI 制御

- [ ] `frontend/src/components/namespace/NamespaceMain.tsx`
  - prefix テーブル: `prefix === SYSTEM_NAMESPACE_PREFIX` の行は削除ボタンを無効化
  - 用語テーブル: `prefix === SYSTEM_NAMESPACE_PREFIX` の行は編集・削除・アクティブ切替を無効化
  - 🔒 アイコンまたは「システム」バッジを表示

---

## 5. 注意事項・スコープ外

- **DBスキーマ変更なし**（is_system カラムは追加しない）
- **組織作成時の自動追加は不要**（固定UUID の1セットのみ）
- **organization テーブルへのレコード追加なし**（FK 制約がないことをDDLで確認済み）
- **既存MAIMLファイルの `mgr-instruction:xxx` タグは変更しない**（書き込みのみ新形式）
- `mgr-instruction:requiredCreatorUUID` 等のUUID系キーは今回スコープ外
- `experiment_plan.planned_values` JSON内の旧キーは別タスク扱い

---

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 固定UUID が organization テーブルに存在しないため FK 制約違反 | 高 | 中 | namespace テーブルに organization_id の FK 制約がないことをDDLで確認済み |
| findDeclarationsByProjectScope SQL 修正で既存動作が変わる | 中 | 中 | UNION ALL 方式でシステム分を追加し、既存クエリ条件を変更しない |
| instruction_key UPDATE で未マッチレコードが残る | 中 | 低 | 旧キー全件を明示的に列挙して UPDATE |
| NoteType 値変更で実験計画の既存データが復元されない | 中 | 高 | planned_values JSON 変換は別タスク扱いとして記録 |
| フロントエンドのビルドエラー | 中 | 中 | tsc --noEmit で確認必須 |

---

## 7. テスト計画

- [ ] `cd backend && npx tsc --noEmit` がエラーなし
- [ ] `cd frontend && npx tsc --noEmit` がエラーなし
- [ ] DBに固定UUID の organization_id で Alchemia の namespace / prefix / namespace_term が存在することを確認
- [ ] 名前空間管理画面で Alchemia 行が操作不可（🔒）になっていることを確認
- [ ] 指示登録ドロップダウンで「通常指示」が `Alchemia:SupervisorDirectiveContent` で保存されることを確認
- [ ] プロジェクトスコープの名前空間取得 API のレスポンスに `Alchemia` prefix が含まれることを確認

---

## 8. 変更ファイル一覧（18件）

| # | ファイル | 種別 |
|---|---------|------|
| 1 | `backend/migrations/20260812_1530_add_alchemia_system_namespace.sql` | 新規 |
| 2 | `backend/src/constants/systemNamespace.ts` | 新規 |
| 3 | `backend/src/sql/queries/namespace_terms/findDeclarationsByProjectScope.sql` | 更新 |
| 4 | `backend/src/sql/queries/namespace_terms/findNamespacesByOrganization.sql` | 更新 |
| 5 | `backend/src/sql/queries/namespace_terms/findAllByOrganization.sql` | 更新 |
| 6 | `backend/src/repositories/namespaceTermRepository.ts` | 更新 |
| 7 | `backend/src/services/namespaceService.ts` | 更新 |
| 8 | `backend/src/services/projectInstructionService.ts` | 更新 |
| 9 | `backend/src/services/experimentInstructionService.ts` | 更新 |
| 10 | `backend/src/services/maimlWriterService.ts` | 更新 |
| 11 | `frontend/src/constants/systemNamespace.ts` | 新規 |
| 12 | `frontend/src/types/experimentPlan.ts` | 更新 |
| 13 | `frontend/src/types/instructionRegistration.ts` | 更新 |
| 14 | `frontend/src/services/experimentPlanApiService.ts` | 更新 |
| 15 | `frontend/src/components/namespace/NamespaceMain.tsx` | 更新 |

※ DBスキーマ変更なし（DDLファイルの修正不要）

---

## 9. 承認記録

- **計画書提示日時**: 2026-08-12 15:30
- **承認日時**: ―
- **承認者コメント**: ―

---

## 10. 実施記録

開始: 2026-08-13　完了: 2026-08-13

### 計画からの変更点
- Phase 5 のエラー実装を `(err as any).status` → `err.statusCode` に修正（errorHandlerMiddleware が `statusCode` を参照するため）
- `namespaceService.ts` の各関数に `lang: string = 'ja'` 引数を追加し、`getMessage()` で多言語化
- `namespaceController.ts` でも `Accept-Language` ヘッダーから `lang` を取り出して Service に渡す方式を採用
- `messages.ts` に `namespace.systemProtected` キーを ja/en 両方に追加
- `messages.ts` の `master.duplicateAttributeName` も同時に追加（型定義との整合）
- フロントエンド locales（ja.json / en.json）に `namespaceMain.systemNamespaceBadge` / `systemNamespaceTooltip` および `prefixManagement.systemNamespaceBadge` / `systemNamespaceTooltip` / `systemNamespaceDeleteError` を追加
- `PrefixManagement.tsx` でも `SYSTEM_NAMESPACE_PREFIX` によるシステム行保護を実装

### 最終的な成果物
- [x] `backend/migrations/20260812_1530_add_alchemia_system_namespace.sql` 作成
- [x] `backend/src/constants/systemNamespace.ts` 作成
- [x] `backend/src/utils/messages.ts` — `namespace.systemProtected` キー追加（ja/en）
- [x] `backend/src/sql/queries/namespace_terms/findDeclarationsByProjectScope.sql` — UNION ALL で Alchemia を常に含める
- [x] `backend/src/sql/queries/namespace_terms/findNamespacesByOrganization.sql` — UNION ALL で Alchemia を常に含める
- [x] `backend/src/sql/queries/namespace_terms/findAllByOrganization.sql` — UNION ALL で Alchemia を常に含める
- [x] `backend/src/services/namespaceService.ts` — 5 関数に 403 保護 + `getMessage()` 多言語化
- [x] `backend/src/controllers/namespaceController.ts` — `lang` を各 Service 呼び出しに渡す
- [x] `backend/src/services/projectInstructionService.ts` — デフォルトキーを `Alchemia:SupervisorDirectiveContent` に変更
- [x] `backend/src/services/experimentInstructionService.ts` — `NOTE_KEYS` を新形式に変更（旧キー後方互換あり）
- [x] `backend/src/services/maimlWriterService.ts` — property key から `mgr-instruction:` プレフィックス除去、クリーニング正規表現に Alchemia パターン追加
- [x] `frontend/src/constants/systemNamespace.ts` 作成
- [x] `frontend/src/types/experimentPlan.ts` — `NoteType` 値を新形式に変更
- [x] `frontend/src/types/instructionRegistration.ts` — `INSTRUCTION_KEY` 値を新形式に変更
- [x] `frontend/src/services/experimentPlanApiService.ts` — `TransitionPlanValues` / `NOTE_TYPE_KEYS` / `reservedKeys` を新形式に変更
- [x] `frontend/src/components/namespace/NamespaceMain.tsx` — `actionCell` にシステム名前空間保護（🔒 バッジ表示）を追加
- [x] `frontend/src/components/namespace/PrefixManagement.tsx` — 操作列にシステム名前空間保護を追加
- [x] `frontend/src/locales/ja.json` — システム名前空間関連キー追加
- [x] `frontend/src/locales/en.json` — システム名前空間関連キー追加
- [x] バックエンド TypeScript ビルド: エラーなし
- [x] フロントエンド TypeScript ビルド: 今回追加ファイルに関するエラーなし（既存エラーのみ）