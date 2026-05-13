# タスク計画書: template_data スキーマ不整合修正

## メタデータ
- **作成日時**: 2026-02-27 21:45
- **タスクID**: template_data_schema_fix
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

`GET /api/v1/experiments/projects/:projectName/methods/:methodId/tasks/:taskNo/data` が
500 Internal Server Error を返す問題を修正する。

原因は `template_data` テーブルのスキーマと、SQLファイル・TypeScript型定義の不整合。
SQLファイル・Repository・Service が「新スキーマ」前提で書かれているが、
実際のDBは「旧スキーマ」（`property_set` JSONB）のままである。

---

## 原因詳細

### 実際のDB スキーマ（正）
```
template_data テーブル
  organization_id   UUID           (PK)
  project_id        VARCHAR(20)    (PK)
  method_id         CHARACTER VARYING (PK)
  task_no           NUMERIC(3,0)   (PK)
  place_id          CHARACTER VARYING (PK)
  property_set      JSONB          ← データ本体
  create_user_id    VARCHAR(50)
  update_user_id    VARCHAR(50)
  create_at         TIMESTAMP
  update_at         TIMESTAMP
```

### `property_set` JSONB の格納構造（taskRegistrationService.ts より）
```json
{
  "templateId": "template_001",
  "templateType": "material",
  "properties": [
    { "key": "prop_key", "xsiType": "stringType", "value": null, "units": null }
  ]
}
```

### 問題のあるファイルと内容

| ファイル | 問題 |
|---------|------|
| `sql/queries/template_data/findByTaskNo.sql` | `id`, `template_type`, `template_id`, `data`, `status`, `comment`, `recorded_by`, `recorded_at`, `created_at`, `updated_at` など存在しないカラムを参照 → **500エラーの直接原因** |
| `sql/queries/template_data/findByPlaceId.sql` | 同上 |
| `sql/queries/template_data/countActualByPlaceIds.sql` | `template_type` カラムが存在しない |
| `sql/queries/template_data/upsert.sql` | 存在しないカラムへ INSERT/UPDATE |
| `repositories/templateDataRepository.ts` | `TemplateDataRow` / `TemplateDataRecord` 型が新スキーマ前提 |
| `services/experimentDataService.ts` | `getTemplateData()` のマッピング処理が新スキーマ前提 |

---

## 目的と期待される成果

- [ ] GET API が正常に 200 を返すようになる
- [ ] `template_data` テーブルの旧スキーマに合わせた SQL・型定義・サービス実装になる
- [ ] `property_set` JSONB から `templateType`, `templateId`, `properties` を正しく取り出してレスポンスを返す

---

## 実装ステップ

### Phase 1: SQLファイルの修正

- [ ] Step 1-1: `findByTaskNo.sql` を旧スキーマのカラムに修正
- [ ] Step 1-2: `findByPlaceId.sql` を旧スキーマのカラムに修正
- [ ] Step 1-3: `upsert.sql` を旧スキーマのカラムに修正
- [ ] Step 1-4: `countActualByPlaceIds.sql` を `property_set->>'templateType'` に修正

### Phase 2: Repository の修正

- [ ] Step 2-1: `TemplateDataRow` 型を旧スキーマに合わせて修正
- [ ] Step 2-2: `TemplateDataRecord` 型を旧スキーマに合わせて修正
- [ ] Step 2-3: `upsert()` メソッドの引数・実装を修正
- [ ] Step 2-4: `findByTaskNo()` メソッドの型を修正
- [ ] Step 2-5: `findByPlaceId()` メソッドの型を修正

### Phase 3: Service の修正

- [ ] Step 3-1: `TemplateDataItem` インターフェースの見直し
- [ ] Step 3-2: `getTemplateData()` の `filteredRecords` マッピング処理を修正（`property_set` から取り出す）
- [ ] Step 3-3: `buildFallbackTemplates()` の返却形式の整合性確認
- [ ] Step 3-4: `saveBatchData()` の `TemplateDataRecord` 型変更対応

---

## 変更ファイル

1. `backend/src/sql/queries/template_data/findByTaskNo.sql` - 旧スキーマカラムに修正
2. `backend/src/sql/queries/template_data/findByPlaceId.sql` - 旧スキーマカラムに修正
3. `backend/src/sql/queries/template_data/upsert.sql` - 旧スキーマカラムに修正
4. `backend/src/sql/queries/template_data/countActualByPlaceIds.sql` - `property_set->>'templateType'` に修正
5. `backend/src/repositories/templateDataRepository.ts` - 型定義・メソッド修正
6. `backend/src/services/experimentDataService.ts` - マッピング処理修正

---

## 修正の詳細設計

### findByTaskNo.sql（修正後）
```sql
SELECT
  organization_id,
  project_id,
  method_id,
  task_no,
  place_id,
  property_set,
  create_user_id,
  update_user_id,
  create_at,
  update_at
FROM template_data
WHERE organization_id = $1
  AND project_id = $2
  AND method_id = $3
  AND task_no = $4
ORDER BY place_id;
```

### TemplateDataRow（修正後）
```typescript
export interface TemplateDataRow {
  organization_id: string;
  project_id: string;
  method_id: string;
  task_no: number;
  place_id: string;
  property_set: {
    templateId: string;
    templateType: 'material' | 'condition' | 'result';
    properties: Array<{
      key: string;
      xsiType: string;
      value: unknown;
      units: string | null;
    }>;
  } | null;
  create_user_id: string | null;
  update_user_id: string | null;
  create_at: Date;
  update_at: Date;
}
```

### getTemplateData() マッピング（修正後）
`property_set` JSONB から `templateType`, `templateId`, `properties` を取り出してレスポンスを構築する。

```typescript
templates = filteredRecords.map((r: TemplateDataRow) => ({
  placeId: r.place_id,
  templateType: r.property_set?.templateType ?? '',
  templateId: r.property_set?.templateId ?? '',
  data: r.property_set ?? {},
  recordedBy: r.create_user_id ?? null,
  recordedAt: r.create_at instanceof Date
    ? r.create_at.toISOString()
    : (r.create_at != null ? String(r.create_at) : null),
}));
```

---

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `upsert.sql` 修正後に saveBatchData の挙動が変わる | 中 | 低 | ExperimentDataService.saveBatchData の引数変更も合わせて修正 |
| `countActualByPlaceIds.sql` の JSONB 参照が正しくない | 低 | 低 | template_type不要ならカラム除外も検討 |

---

## 承認記録

- **計画書提示日時**: 2026-02-27 21:45
- **承認日時**: 2026-02-27 21:36（Act Mode 切り替えにより承認）
