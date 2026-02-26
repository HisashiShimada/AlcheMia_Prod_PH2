# タスク計画書: タスク登録時トランジション実績・テンプレート実績登録

## メタデータ
- **作成日時**: 2026-02-26 11:23
- **タスクID**: task-registration-transition-template
- **優先度**: 高
- **推定工数**: 3時間

## 1. タスク概要

プロジェクト管理画面のタスク登録タブで「保存」ボタンを押した際、現在は `project_task` と `project_task_detail` テーブルへの登録のみ行われている。これに加えて、以下2テーブルへの初期レコード登録も行う必要がある。

- **`transition_data`（トランジション実績）**: project_task_detail の各レコード（method_id × task_no）に対して、MAIMLファイルから抽出した各トランジション分のレコードを初期状態で登録する
- **`template_data`（テンプレート実績）**: project_task_detail の各レコード（method_id × task_no）に対して、MAIMLファイルから抽出した各プレース（Place）分のレコードを初期状態で登録する

---

## 2. 目的と期待される成果

### 目的
タスク登録保存時に、実験作業で使用するトランジション実績・テンプレート実績の初期レコードを自動生成する。これにより、実験作業者が実験を開始した際にレコードが存在することが保証され、後続の実験記録・進捗管理機能が正常に動作する。

### 期待される成果
- [ ] タスク登録保存時に `transition_data` テーブルへ初期レコードが登録される
- [ ] タスク登録保存時に `template_data` テーブルへ初期レコードが登録される
- [ ] 既存の `project_task` / `project_task_detail` 登録処理が引き続き正常動作する
- [ ] 再保存（上書き）時は既存レコードを削除して再登録する
- [ ] トランザクション内で一括処理される（途中失敗時はロールバック）

---

## 3. 現状の実装フロー

```
POST /api/v1/projects/:projectName/task-registration
  ↓
taskRegistrationService.saveTaskRegistration()
  ↓
  ├─ (1) project_task テーブルへ UPSERT  ← 実装済み
  ├─ (2) project_task_detail テーブルを DELETE → INSERT  ← 実装済み
  ├─ (3) transition_data テーブルへ DELETE → INSERT  ← ❌ 未実装
  └─ (4) template_data テーブルへ DELETE → INSERT  ← ❌ 未実装
```

---

## 4. 修正内容の詳細設計

### 4.1 transition_data への登録

**トリガー**: タスク登録保存時

**登録データの生成ロジック**:
1. プロジェクトのMAIMLファイルをSwift/S3から取得
2. `MaimlParserTyped` でパース
3. 各メソッドのトランジション一覧を取得 (`getMethodList()` を活用)
4. `project_task_detail` の各レコード（method_id × task_no）×  MAIMLのトランジション数 分のレコードを生成

**初期値**:
| カラム | 値 |
|--------|-----|
| `organization_id` | リクエストの組織ID |
| `project_id` | プロジェクトID |
| `method_id` | タスクのメソッドID |
| `task_no` | タスク番号（1〜試行回数） |
| `transition_id` | MAIMLから取得したトランジションID |
| `status` | `0`（初期状態） |
| `progress_rate` | `0` |
| `create_user_id` | ログインユーザーID |
| `create_at` | CURRENT_TIMESTAMP |
| `update_user_id` | ログインユーザーID |
| `update_at` | CURRENT_TIMESTAMP |

**削除→再登録**: 再保存時は organization_id + project_id で既存レコードを一括削除してから再登録

### 4.2 template_data への登録

**トリガー**: タスク登録保存時

**テーブル構造**（DDL: `docs/design/db/ddl/template_data.sql` を正として使用）:
| カラム | 型 | 説明 |
|--------|-----|------|
| `organization_id` | UUID | 組織ID |
| `project_id` | UUID | プロジェクトID |
| `method_id` | VARCHAR | メソッドID |
| `task_no` | NUMERIC(3,0) | タスク連番 |
| `place_id` | VARCHAR | プレースID |
| `property_set` | JSONB | テンプレートのプロパティ情報（JSON形式） |
| `create_user_id` | VARCHAR | 作成者ユーザID |
| `create_at` | TIMESTAMP | 作成日時 |
| `update_user_id` | VARCHAR | 更新者ユーザID |
| `update_at` | TIMESTAMP | 更新日時 |

**注意**: 既存の `TemplateDataRepository` の `TemplateDataRow` 型（`template_type`, `template_id`, `data` 等）はDDLと乖離しているため、新規実装ではDDLのカラムのみを使用する。

---

**登録データの生成ロジック**:
1. MAIMLファイルをパース（transition_data と同じファイル取得を再利用）
2. `MaimlParserTyped.getTemplates()` でカテゴリ別テンプレート情報を取得
   - 戻り値: `{ material: Template[], condition: Template[], result: Template[] }`
   - 各 `Template` は `placeRefs` 配列を持ち、`placeRefs[i].ref` が対応する Place の ID
3. `MaimlParserTyped.getMethods()` でメソッド別のテンプレートとプレースの対応を構築
   - 各メソッドの `materialTemplates` / `conditionTemplates` / `resultTemplates` から、そのメソッドに属するテンプレートを抽出
   - テンプレートの `placeRefs[i].ref` から place_id を取得
4. `project_task_detail` の各レコード（method_id × task_no）× そのメソッドに属するテンプレートの place_id 数 分のレコードを生成
5. `property_set` フィールドには、テンプレートの Property 定義情報（key・units等）をJSON形式で登録

**`property_set` に登録するJSONデータの構造**:
```json
{
  "templateId": "template_001",
  "templateType": "material",
  "properties": [
    { "key": "SampleName", "xsiType": "stringType", "value": null, "units": null },
    { "key": "Concentration", "xsiType": "numericType", "value": null, "units": "mol/L" }
  ]
}
```
※ 初期登録時は `value` は `null`（未入力）。テンプレートのプロパティ定義（key / xsiType / units 等）のみ保持し、実験作業時に value が埋められる想定。

**テンプレートとplace_idの対応マップ構築例**:
```typescript
// getMethods() でメソッドごとにテンプレート情報を取得
const methods = parser.getMethods();
for (const method of methods) {
  const allTemplates = [
    ...(method.materialTemplates ? [method.materialTemplates].flat() : []),
    ...(method.conditionTemplates ? [method.conditionTemplates].flat() : []),
    ...(method.resultTemplates ? [method.resultTemplates].flat() : []),
  ];
  for (const template of allTemplates) {
    for (const placeRef of (template.placeRefs || [])) {
      const placeId = placeRef.ref;
      const propertySet = {
        templateId: template.id,
        templateType: ..., // materialTemplates由来ならmaterial, 等
        properties: (template.properties || []).map(p => ({
          key: p.key,
          xsiType: p.xsiType,
          value: null,
          units: p.units || null,
        })),
      };
      // → template_data に INSERT (method_id, task_no, place_id, property_set)
    }
  }
}
```

**初期値**:
| カラム | 値 |
|--------|-----|
| `organization_id` | リクエストの組織ID |
| `project_id` | プロジェクトID |
| `method_id` | タスクのメソッドID |
| `task_no` | タスク番号（1〜試行回数） |
| `place_id` | MAIMLのTemplate.placeRefs[i].ref |
| `property_set` | テンプレートプロパティ定義JSON（上記構造） |
| `create_user_id` | ログインユーザーID |
| `create_at` | CURRENT_TIMESTAMP |
| `update_user_id` | ログインユーザーID |
| `update_at` | CURRENT_TIMESTAMP |

**削除→再登録**: 再保存時は organization_id + project_id で既存レコードを一括削除してから再登録

---

## 5. 実装ステップ

### Phase 1: Repository層の修正・追加

- [ ] **`TransitionDataRepository` に `insert` メソッドを追加**
  - ファイル: `backend/src/repositories/transitionDataRepository.ts`
  - 内容: 単一レコードのINSERT（DDL準拠のカラム構成で実装）
  - 既存クラスに `insert(data, client: PoolClient)` メソッドを追加

- [ ] **`TransitionDataRepository` に `deleteByProject` メソッドを追加**
  - 内容: organization_id + project_id 条件で全レコードを削除

- [ ] **`TemplateDataRepository` の型定義を DDL に合わせて修正確認**
  - DDLの実カラム（`property_set` のみ）と `TemplateDataRow` 型の整合性を確認
  - 必要であれば型定義を修正（`backend/src/types/database.ts` も確認）

- [ ] **`TemplateDataRepository` に `deleteByProject` メソッドを追加**
  - 内容: organization_id + project_id 条件で全レコードを削除

- [ ] **`TemplateDataRepository` に `insert` メソッドを追加（DDL準拠）**
  - 内容: 単一レコードのINSERT（`property_set` は null で初期登録）

### Phase 2: Service層の修正

- [ ] **`taskRegistrationService.ts` の `saveTaskRegistration` を修正**
  - ファイル: `backend/src/services/taskRegistrationService.ts`
  - 修正内容:
    1. MAIMLファイルをSwift/S3から取得する処理を追加（`storageService` を使用）
    2. `MaimlParserTyped` でMAIMLをパースしてメソッド別のトランジション・プレース情報を取得
    3. `deleteAndInsertTransitionData()` プライベート関数を追加
    4. `deleteAndInsertTemplateData()` プライベート関数を追加
    5. 既存のトランザクション内でこれらを呼び出す

- [ ] **MAIMLが存在しない場合のエラーハンドリング確認**
  - `project_maiml_flg` チェックは既に実装済みなので、MAIMLファイルが存在しない場合のエラーは既存コードで対処済み

### Phase 3: SQL ファイルの追加

- [ ] **`backend/src/sql/queries/transition_data/insert.sql` を追加**
  - transition_data テーブルへの INSERT 文

- [ ] **`backend/src/sql/queries/transition_data/deleteByProject.sql` を追加**
  - organization_id + project_id 条件での DELETE 文

- [ ] **`backend/src/sql/queries/template_data/insert.sql` を追加**
  - template_data テーブルへの INSERT 文

- [ ] **`backend/src/sql/queries/template_data/deleteByProject.sql` を追加**
  - organization_id + project_id 条件での DELETE 文

---

## 6. 影響範囲

### 変更するファイル
1. `backend/src/services/taskRegistrationService.ts` - メイン修正対象
2. `backend/src/repositories/transitionDataRepository.ts` - insert/deleteByProject メソッド追加
3. `backend/src/repositories/templateDataRepository.ts` - deleteByProject/insert メソッド追加（DDL整合確認）

### 新規作成するファイル
1. `backend/src/sql/queries/transition_data/insert.sql`
2. `backend/src/sql/queries/transition_data/deleteByProject.sql`
3. `backend/src/sql/queries/template_data/insert.sql`
4. `backend/src/sql/queries/template_data/deleteByProject.sql`

### 影響を受ける機能
- **タスク登録保存 API** (`POST /api/v1/projects/:projectName/task-registration`): 保存処理の追加
- **実験記録機能**: transition_data / template_data に初期レコードが存在することが前提となっている可能性あり（影響なし・むしろ改善）
- **進捗管理機能**: transition_data の存在を参照している可能性あり（影響なし・むしろ改善）

---

## 7. 技術的詳細

### MAIMLからのデータ取得方法

```typescript
// storageService でMAIMLを取得
const organizationPrefix = await getOrganizationPrefix(organizationId);
const maimlBuffer = await storageService.downloadFile(
  organizationPrefix,
  `projects/${projectName}/${projectName}.maiml`
);
const maimlContent = maimlBuffer.toString('utf-8');

// MaimlParserTyped でパース
const parser = new MaimlParserTyped(maimlContent);
const methodList = parser.getMethodList(); 
// methodList[i].methodId, methodList[i].transitions[j].id

const places = parser.getPlaces();
// places[k].id → place_id に使用
// ただし、places はメソッドをまたがって全て返ってくるため、
// method_id との対応付けが必要 → getMethods() を使い method × places の対応を構築
```

### トランジションとメソッドの対応

`MaimlParserTyped.getMethodList()` はメソッドごとのトランジション一覧を返すため、これを活用する:

```typescript
const methodList = parser.getMethodList();
// methodList = [
//   { methodId: 'method_001', transitions: [{id: 'tr1', name: '...'}, ...] },
//   { methodId: 'method_002', transitions: [{id: 'tr3', name: '...'}, ...] },
// ]
```

### プレースとメソッドの対応

`getMethods()` でメソッドオブジェクトを取得し、各メソッドの `pnml.places` から place_id を取得する:

```typescript
const methods = parser.getMethods();
for (const method of methods) {
  const places = method.pnml.places || [];
  for (const place of places) {
    // place.id → place_id
  }
}
```

### トランザクション処理の追加箇所

既存の `saveTaskRegistration` 内のトランザクションブロックに追加:

```typescript
// 既存処理
await upsertProjectTasks(client, ...);
await deleteAndInsertTaskDetails(client, ...);

// 追加処理 ← ここに追加
await deleteAndInsertTransitionData(client, organizationId, projectId, userId, requestData.tasks, parser);
await deleteAndInsertTemplateData(client, organizationId, projectId, userId, requestData.tasks, parser);
```

---

## 8. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| MAIMLにトランジションが定義されていない | 中 | 低 | エラーをスローせず空配列として処理（insert スキップ） |
| MAIMLにプレースが定義されていない | 中 | 低 | エラーをスローせず空配列として処理（insert スキップ） |
| 大量レコードによるタイムアウト | 低 | 低 | 現実的な規模では問題なし（試行回数max999×トランジション数） |
| TemplateDataRepositoryの型とDDLの乖離 | 高 | 中 | 実装前にDDLと既存コードの両方を精査して確認 |

---

## 9. テスト計画

### 手動テスト
- [ ] タスク登録保存後、`transition_data` テーブルに期待するレコード数が登録されること
- [ ] タスク登録保存後、`template_data` テーブルに期待するレコード数が登録されること
- [ ] 再保存（2回目の保存）時に、既存レコードが削除されて再登録されること
- [ ] MAIMLにトランジションが存在しない場合でもエラーにならないこと
- [ ] MAIMLにプレースが存在しない場合でもエラーにならないこと

### 確認クエリ例
```sql
-- transition_data の確認
SELECT method_id, task_no, transition_id, status, progress_rate
FROM transition_data
WHERE organization_id = '<org_id>' AND project_id = '<project_id>'
ORDER BY method_id, task_no, transition_id;

-- template_data の確認  
SELECT method_id, task_no, place_id, property_set
FROM template_data
WHERE organization_id = '<org_id>' AND project_id = '<project_id>'
ORDER BY method_id, task_no, place_id;
```

---

## 10. 承認記録

- **計画書提示日時**: 2026-02-26 11:23
- **承認日時**: 2026-02-26 11:46
- **承認者コメント**: 承認
