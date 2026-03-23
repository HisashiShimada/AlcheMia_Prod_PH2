# タスク計画書: 実験データ関連API仕様書修正

## メタデータ
- **作成日時**: 2026-03-12 18:20
- **タスクID**: 実験データAPI仕様書修正
- **優先度**: 中
- **推定工数**: 1時間

## 1. タスク概要

`API一覧_実験作業者画面.md` の「3. 実験データ関連 API」に記載されている API について、
実際のソースコード実装に合わせて以下の仕様書を修正する。

- `docs/design/api/api_experiment_data.md`
- `docs/design/api/api_progress_monitoring.md`

---

## 2. 調査結果

### 調査対象ソースコード

| ファイル | 内容 |
|--------|------|
| `backend/src/controllers/experimentController.ts` | 実験データAPI コントローラー |
| `backend/src/controllers/progressController.ts` | 進捗/トランジションAPI コントローラー |
| `backend/src/services/experimentDataService.ts` | 実験データ ビジネスロジック |
| `backend/src/services/progressService.ts` | 進捗・トランジション ビジネスロジック |
| `backend/src/repositories/templateDataRepository.ts` | template_data テーブルアクセス |
| `backend/src/repositories/transitionDataRepository.ts` | transition_data テーブルアクセス |
| `backend/src/routes/experimentRoutes.ts` | 実験データ ルート定義 |
| `backend/src/routes/progressRoutes.ts` | 進捗/トランジション ルート定義 |

---

### api_experiment_data.md との差分

#### 差分1: 実装状況（最重要）
- **現在の仕様書**: 「⏳ 未実装」
- **実際**: **実装済み**
  - Controller: `backend/src/controllers/experimentController.ts`
  - Service: `backend/src/services/experimentDataService.ts`
  - Repository: `backend/src/repositories/templateDataRepository.ts`
  - Routes: `backend/src/routes/experimentRoutes.ts`

#### 差分2: 実装ファイルパス（コントローラー名）
- **現在の仕様書**: `experimentDataController.ts`
- **実際**: `experimentController.ts`

#### 差分3: POSTのエンドポイント名（路線統一）
- **現在の仕様書**: POST は `/data`、GET も `/data`
- **実際**: 両方とも `/data` ← 一致している（差分なし）

#### 差分4: POST API の編集可能プロジェクトステータス
- **現在の仕様書**: `draft/active/waiting_approval` が編集可能
- **実際 (`experimentDataService.ts`)**: `editableStatuses = [2]`（**project_status=2（タスク実行中）のみ**）

```typescript
// experimentDataService.ts L88-92
const editableStatuses = [2];
if (!editableStatuses.includes(projectStatus)) {
  throw new ProjectNotEditableError(projectStatus);
}
```

#### 差分5: POST API のリクエストボディ形式
- **現在の仕様書**: `records[].data` に `templateId`, `templateType`, `properties` を含む
- **実際**: 実装と一致（差分なし）

#### 差分6: GET API のレスポンス `data` フィールド（DBありの場合）
- **現在の仕様書**: `data` の内容が不明瞭（`{ "key": "value" }` のような例示）
- **実際**: DB の `property_set` カラムの値がそのまま返る（`PropertySet` 型: `{ templateId, templateType, properties: [{ key, xsiType, value, units }] }`）

```typescript
// experimentDataService.ts L161-171
return {
  placeId: dbRecord.place_id,
  templateType: ps?.templateType ?? '',
  templateId: ps?.templateId ?? '',
  data: ps as unknown as Record<string, unknown> ?? {},  // property_set がそのまま
  recordedBy: dbRecord.update_user_id ?? null,           // update_user_id を使用
  recordedAt: dbRecord.update_at instanceof Date
    ? dbRecord.update_at.toISOString()
    : ...
} as TemplateDataItem;
```

#### 差分7: GET API のフォールバック処理の詳細
- **現在の仕様書**: 「0件の場合にフォールバック」という記述
- **実際**: `adjacentPlaceIds.map()` で **各 placeId ごとに個別判定**（一部のみ保存済みでも対応）

```typescript
// experimentDataService.ts L155-175
const templates: TemplateDataItem[] = adjacentPlaceIds.map(placeId => {
  const dbRecord = filteredRecords.find((r) => r.place_id === placeId);
  if (dbRecord) {
    // DB実績データを返す
  } else {
    // フォールバック（MAIMLテンプレート定義から）
  }
}).filter(...);
```

#### 差分8: GET API のフォールバック時 `data.value` の初期値
- **現在の仕様書**: `value: null`
- **実際**: MAIMLの `p.value` があれば使用、なければ `null`
  ```typescript
  value: p.value ?? null,
  ```

#### 差分9: テンプレートカテゴリの取得元（フォールバック処理）
- **現在の仕様書**: `method.materialTemplates` / `method.conditionTemplates` / `method.resultTemplates` のみ
- **実際**: **method直下 + program配下** を統合して使用
  ```typescript
  const allMaterialTemplates = [
    ...method.materialTemplates,
    ...method.program.flatMap(p => p.materialTemplates),
  ];
  ```

---

### api_progress_monitoring.md との差分（API #6 トランジションステータス更新）

#### 差分A: 実装状況
- **現在の仕様書**: 🔴（未実装）
- **実際**: ✅ **実装済み**

#### 差分B: ステータス遷移バリデーション（重要）
- **現在の仕様書**: 遷移バリデーション未記載
- **実際**: `progressService.ts` の `ALLOWED_TRANSITIONS` により遷移バリデーションが実装済み
  - INITIAL(0) → INITIAL, PREPARING, COMPLETED, ERROR
  - PREPARING(1) → PREPARING, READY, COMPLETED, ERROR
  - READY(2) → READY, IN_PROGRESS, COMPLETED, ERROR
  - IN_PROGRESS(3) → IN_PROGRESS, PAUSED, COMPLETED, ERROR
  - PAUSED(4) → PAUSED, IN_PROGRESS, COMPLETED, ERROR
  - COMPLETED(5) → COMPLETED（変更不可）
  - ERROR(6) → ERROR（変更不可）
- 無効遷移時: `400 INVALID_STATUS_TRANSITION`

#### 差分C: taskNo の処理フロー
- **現在の仕様書**: taskNo でトランジションを特定する記載
- **実際**: `findByTransitionId.sql` で `organization_id + project_id + method_id + transition_id` から `task_no` をDBから取得する（リクエストボディの taskNo はログ/レスポンスにのみ使用）

#### 差分D: completedステータス時の自動100%
- **現在の仕様書**: `progressRate` が `5=completed` の場合は自動で100に記載
- **実際**: 実装と一致（差分なし）

#### 差分E: イベントログのステータスラベル
- **現在の仕様書**: 不明瞭
- **実際**: 数値 → 文字列マッピングを使用
  ```typescript
  const transitionStatusLabelMap = {
    0: 'initial', 1: 'preparing', 2: 'ready',
    3: 'running', 4: 'paused', 5: 'completed', 6: 'error'
  };
  ```

#### 差分F: 実装済みの実装ファイル情報
- コントローラー: `backend/src/controllers/progressController.ts` - `updateTransitionStatus()`
- サービス: `backend/src/services/progressService.ts` - `ProgressService.updateTransitionStatus()`
- リポジトリ: `backend/src/repositories/transitionDataRepository.ts` - `updateStatus()`
- ルート定義: `backend/src/routes/progressRoutes.ts`

---

## 3. 修正計画

### Phase 1: タスク計画書作成
- [x] 本ファイル (PLAN.md) の作成

### Phase 2: api_experiment_data.md の修正
- [ ] Step 1: 実装状況を「⏳ 未実装」→「✅ 実装済み」に変更（API一覧テーブル・概要）
- [ ] Step 2: 実装ファイルパスを修正（`experimentDataController.ts` → `experimentController.ts`）
- [ ] Step 3: POST API のプロジェクト編集可能ステータスを修正（`[1,2,3]`→`[2]`のみ）
- [ ] Step 4: GET API のレスポンス `data` フィールド説明を修正（DBありの場合のPropertySet形式を明記）
- [ ] Step 5: GET API のフォールバック処理説明を修正（placeId 個別判定に修正）
- [ ] Step 6: GET API のフォールバック `data.value` 説明を修正（MAIMLのvalue優先に修正）
- [ ] Step 7: フォールバック処理のテンプレートカテゴリ取得元を修正（program配下も含む旨を追記）
- [ ] Step 8: 変更履歴を追記

### Phase 3: api_progress_monitoring.md の修正（API #6）
- [ ] Step 1: API一覧テーブルで API #6 を🟢実装済みに変更
- [ ] Step 2: 実装状況サマリーを更新
- [ ] Step 3: ビジネスロジックにステータス遷移バリデーションを追記
- [ ] Step 4: taskNo の処理フロー説明を修正
- [ ] Step 5: イベントログのステータスラベルマッピングを追記
- [ ] Step 6: 実装状況セクションに実装ファイル情報を追記
- [ ] Step 7: 変更履歴を追記

---

## 4. 変更ファイル

1. `docs/design/api/api_experiment_data.md` - 上記 Phase 2 の修正
2. `docs/design/api/api_progress_monitoring.md` - 上記 Phase 3 の修正

---

## 5. リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| 仕様書修正による既存フロントエンドとの不整合 | 低 | 実装済みコードを正として修正するため影響なし |

---

## 6. 承認記録
- **計画書提示日時**: 2026-03-12 18:20
- **承認日時**: 2026-03-12 18:20
