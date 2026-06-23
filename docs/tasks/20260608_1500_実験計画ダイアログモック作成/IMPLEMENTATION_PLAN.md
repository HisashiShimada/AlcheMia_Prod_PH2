# ExperimentPlanDialog 本実装計画書

> 作成日: 2026-06-09  
> 最終更新: 2026-06-09（Phase 1 フロント実装完了）  
> 対象ファイル: `frontend/src/components/project/ExperimentPlanDialog.tsx`  
> 方針: **案3（タブ切替レイアウト）をベースに本実装を進める**

---

## 1. 現状整理

### 現在のファイル構成

| ファイル | 状態 | 内容 |
|---------|------|------|
| `frontend/src/components/project/ExperimentPlanDialog.tsx` | モック実装済み | UIレイアウト（案1/2/3切替）、Ref選択肢はprops受け取りに切り替え済み |
| `frontend/src/types/experimentPlan.ts` | 更新済み | `TemplateDef`, `TemplateField`, `TemplateFieldType` 型を追加。`ExperimentPlanDialogProps` にRef/テンプレートprops追加 |
| `frontend/src/services/experimentPlanApiService.ts` | モック実装済み | `saveExperimentPlan`のみ残存（getXxxRefs系は削除済み） |
| `frontend/src/components/project/TaskRegistrationTab.tsx` | 更新済み | `maimlRoot`を解析してRef選択肢・テンプレート一覧を生成し、`ExperimentPlanDialog`にpropsで渡す |

### 現在の実装状況サマリ

| 項目 | 状態 | 詳細 |
|------|------|------|
| トランジション一覧 | ✅ 実装済み | `maimlRoot.protocol.methods[methodId].pnml.transitions`から取得 |
| CreatorRef選択肢 | ✅ 実装済み（仮） | `maimlRoot.document.creators[].name`から生成してpropsで渡す |
| InstrumentRef選択肢 | ✅ 実装済み（仮） | `maimlRoot.document.instruments[].name`から生成してpropsで渡す |
| OwnerRef選択肢 | ✅ 実装済み（仮） | `maimlRoot.document.owners[].name`から生成してpropsで渡す |
| テンプレート入力 | ⚠️ モック残存 | `SAMPLE_TEMPLATES`（ハードコード）を使用中。`methodTemplates` propsを受け取る口は存在するが未接続 |
| 保存 | ⚠️ モック残存 | `saveExperimentPlan`はモック（ハードコード返却） |
| UIパターン切替（案1/2/3） | ⚠️ 削除未実施 | `layoutPattern` state・RadioGroup・案1/2 JSXブロックが残存 |

---

## 2. 決定が必要な事項

### 2-1. 【✅ 解決済み】CreatorRef / InstrumentRef / OwnerRef の取得元

**決定内容**: MAIMLファイルのパース済みデータ（ProjectMaimlContext）から取得  
- `maimlRoot.document.creators[].name` → CreatorRef選択肢  
- `maimlRoot.document.instruments[].name` → InstrumentRef選択肢  
- `maimlRoot.document.owners[].name` → OwnerRef選択肢  
- `TaskRegistrationTab` で `useMemo` を使って解析し、`ExperimentPlanDialog` にpropsで渡す  
- バックエンドAPIは新設しない（フロントのみで解決）

---

### 2-2. 【✅ 解決済み】テンプレート入力の取得元とデータ構造

**決定内容**: MAIMLファイルのパース済みデータ（ProjectMaimlContext）から取得  
- `maimlRoot.protocol.methods[methodId].materialTemplates / conditionTemplates / resultTemplates`を使用  
- `TemplateDef` / `TemplateField` 型として `experimentPlan.ts` に定義済み  
- `TaskRegistrationTab` で `useMemo` を使って変換し、`ExperimentPlanDialog` にpropsで渡す  
- `SAMPLE_TEMPLATES`（ハードコード）はまだ残存しているため、次フェーズで削除して `methodTemplates` propsに切り替える  

> **残課題**: `ExperimentPlanDialog` 内の `TemplateInputSample` コンポーネントがまだ `SAMPLE_TEMPLATES` を参照している。  
> `methodTemplates` props を使った `TemplateDef` ベースのレンダリングに切り替えが必要。

---

### 2-3. 【✅ 決定済み】保存先テーブルとデータ設計

**決定内容**: 新規テーブル `experiment_plan` を作成する（`project_instruction` とは完全分離）

**理由**: project_instruction（作業指示・コメント）と experiment_plan（実験計画の構造化データ）は用途・データ内容が大きく異なるため、分離して管理する

**テーブル設計**:

| カラム | 型 | 説明 |
|-------|-----|------|
| organization_id | uuid | 組織ID（マルチテナント） |
| project_id | varchar(20) | プロジェクトID |
| method_id | varchar | メソッドID |
| task_number | integer | タスク番号（全体=0、タスクN=N） |
| selected_transitions | text[] | 選択されたトランジションID一覧 |
| creator_refs | text[] | CreatorRef一覧 |
| instrument_refs | text[] | InstrumentRef一覧 |
| owner_refs | text[] | OwnerRef一覧 |
| notes | jsonb | 注意事項一覧（NoteItem[]） |
| template_values | jsonb | テンプレート入力値（ネスト形式: `{templateId: {fieldKey: value}}`） |
| create_user_id / create_at | — | 管理カラム |
| update_user_id / update_at | — | 管理カラム |

- **主キー**: `(organization_id, project_id, method_id, task_number)`
- **保存方法**: UPSERT（同一PKがあれば上書き）
- **詳細設計**: `docs/20260608_1500_実験計画ダイアログモック作成/db_design_draft.md` 参照

**エンドポイント設計（仮）**:

| メソッド | URL | 説明 |
|---------|-----|------|
| GET | `/api/v1/projects/:projectId/experiment-plans?methodId=xxx` | 指定メソッドの全タブデータ一括取得 |
| PUT | `/api/v1/projects/:projectId/experiment-plans/:methodId/:taskNumber` | 1タブ分を保存（UPSERT） |
| DELETE | `/api/v1/projects/:projectId/experiment-plans/:methodId` | 指定メソッドの実験計画を全削除 |

**確認待ち事項**:
- [ ] `selectedTransitions` は単体選択のまま固定か、複数選択も許容するか（現状UI: 単体選択）
- [ ] 認可制御（誰が保存できるか：Manager以上？）

---

### 2-4. 【✅ 決定済み】「全体」タブと「タスクNタブ」の意味の整理

**決定内容**: **案C（継承）** を採用

- 「全体」タブで設定した内容は、その他すべてのタスクNタブに反映される（デフォルト値として継承）
- 各「タスクN」タブでは、全体の設定を引き継ぎつつ、そのタスク回のみの値を個別に上書き可能
- 保存粒度: `methodId + taskNumber` で1件ずつ（全体 = taskNumber 0 or "all" として扱う）

**UIの動作イメージ**:
```
全体タブで「試薬A: 10ml」と設定
  → タスク1タブ: 「試薬A: 10ml」として反映（継承）
  → タスク2タブ: 「試薬A: 10ml」として反映（継承）
  → タスク2タブで「試薬A: 12ml」に変更 → タスク2だけ上書き
  → タスク1タブは「試薬A: 10ml」のまま
```

**実装時の注意点**:
- 全体タブの値変更時に、各タスクタブへ反映する（ただし個別上書き済みの項目は保護するか要検討）
- 保存は「全体」と各「タスクN」を個別レコードで保存する設計を推奨

---

### 2-5. 【確認待ち】パターン切替UIの削除

**現状**: 比較用のRadioGroup（案1/2/3切替）がダイアログ右上に表示中

**確認事項**:
- [ ] 案3（タブ切替）に固定してよいか、または別のレイアウトを採用するか
  - 案1（折りたたみ）: 画面スペースを節約したい場合向き
  - 案2（横並び）: Ref情報を一目で確認したい場合向き
  - **案3（タブ切替）**: 基本情報・テンプレート入力を切り替えて使う場合向き

**レイアウトを確認するには**: 実際のダイアログを開いて3案を切り替えてみてください。

> 決定後の作業（コードから削除）は1〜2時間程度

---

### 2-6. 【確認待ち】基本情報タブのデフォルト表示

**現状**: 「基本情報」タブが初期表示（案3選択時）

**確認事項**:
- [ ] ダイアログを開いた時のデフォルト表示（現状: 「基本情報」タブ）
  - このままでよいか
  - 「テンプレート入力」タブをデフォルトにするか
- [ ] トランジション選択後の動作
  - 現状: タブは自動切替しない
  - 変更案: トランジション選択時に「テンプレート入力」タブへ自動切替する

---

## 3. 実装ステップ

### Phase 1: モックから本実装への準備（フロントのみ）

| # | 作業内容 | 状態 | 懸念・備考 |
|---|---------|------|----------|
| 1 | CreatorRef/InstrumentRef/OwnerRef選択肢を `maimlRoot.document` から取得 | ✅ 完了 | — |
| 2 | `ExperimentPlanDialogProps` にRef/テンプレートpropsを追加 | ✅ 完了 | — |
| 3 | `TaskRegistrationTab` で解析しpropsで渡す | ✅ 完了 | — |
| 4 | `TemplateInputSample` を `SAMPLE_TEMPLATES` → `methodTemplates` propsベースに切り替え | ✅ 完了（2026-06-09） | `SAMPLE_TEMPLATES`・`SampleTemplate`・`SampleField`を削除し、新コンポーネント `TemplateInputPanel` に置き換え |
| 5 | 比較用UI（案1/2/3切替）を削除し案3固定に整理 | ✅ 完了（2026-06-09） | RadioGroup・layoutPattern state・案1/2 JSXブロックを全削除。案3（タブ切替）固定に統一 |
| 6 | `tabDataMap` を `{ data, overrideFlags }` 構造に拡張し、全体→タスクN継承ロジックを実装 | ✅ 完了（2026-06-09） | `overrideMap` stateを追加。全体タブ変更時にoverride未登録タスクNへリアルタイム伝播。タスクN直接編集でoverride登録 |
| 7 | 保存処理を「アクティブタブのみ」→「全tabDataMap一括保存」に変更 | ✅ 完了（2026-06-09） | `Promise.all` で全体+各タスクNを一括 `saveExperimentPlan` 呼び出し |

**Phase 1 追加の懸念点**:

| 懸念 | 優先度 | 内容 |
|------|--------|------|
| 継承ロジック（#6） | ✅ 解消 | `overrideMap` で全体→タスクN伝播を実装済み |
| 全タブ一括保存（#7） | ✅ 解消 | `Promise.all` による全タブ一括保存に変更済み |
| SAMPLE_TEMPLATES 残存（#4） | ✅ 解消 | `TemplateInputPanel` コンポーネントに置き換え済み |
| RadioGroup 残存（#5） | ✅ 解消 | 削除済み・案3固定 |
| selectedTransitions 単体 vs 複数（2-3残課題） | 🟡 中 | UIは単体選択だがリクエスト型は配列。仕様確認が必要 |

---

### Phase 2: バックエンドAPI実装

**前提**: `db_design_draft.md` の仮設計に基づく。詳細はそちらを参照。

| # | 作業内容 | 詳細 |
|---|---------|------|
| 1 | マイグレーション作成 | `experiment_plan` テーブルを新規作成。主キー: `(organization_id, project_id, method_id, task_number)` |
| 2 | Repository作成 | `experimentPlanRepository.ts` — upsert / findByMethod / deleteByMethod |
| 3 | Service作成 | `experimentPlanService.ts` — upsertPlan / getPlans / deletePlans（認可チェック含む） |
| 4 | Controller + Route作成 | `GET /experiment-plans?methodId=xxx` / `PUT /experiment-plans/:methodId/:taskNumber` / `DELETE /experiment-plans/:methodId` |
| 5 | フロント接続 | `experimentPlanApiService.ts` の `saveExperimentPlan` をモックから実API呼び出しに変更 |

**DDL（確定予定）**:
```sql
CREATE TABLE experiment_plan (
  organization_id    uuid NOT NULL,
  project_id         character varying(20) NOT NULL,
  method_id          character varying NOT NULL,
  task_number        integer NOT NULL DEFAULT 0,
  selected_transitions text[],
  creator_refs         text[],
  instrument_refs      text[],
  owner_refs           text[],
  notes              jsonb,
  template_values    jsonb,
  create_user_id     character varying(50),
  create_at          timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_user_id     character varying(50),
  update_at          timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT experiment_plan_PKC PRIMARY KEY (organization_id, project_id, method_id, task_number)
);
```

---

### Phase 3: データ復元・UX改善

| # | 作業内容 |
|---|---------|
| 1 | ダイアログオープン時に GET API でデータ取得→各タブに復元 |
| 2 | 取得データがある場合の `overrideFlags` 初期化（DB保存済み = 全体と差分あり → override扱い） |
| 3 | バリデーション実装（必須項目チェック等） |
| 4 | 保存成功/失敗のフィードバック改善 |
| 5 | 読み込みスケルトン表示 |

---

## 4. 既存コードとの関連

### 参照すべき既存実装

| ファイル | 参照目的 |
|---------|---------|
| `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` | テンプレート入力のrenderProperty/renderContentField実装 |
| `frontend/src/components/project/InstructionEditDialog.tsx` | 同様の指示入力ダイアログのUXパターン |
| `frontend/src/contexts/ProjectMaimlContext.tsx` | MAIMLデータ取得方法 |

### 型定義の拡張が必要な箇所

```typescript
// frontend/src/types/experimentPlan.ts

// 追加が必要な型（本実装時）
interface ExperimentPlanFetchResponse {
  // 保存済みデータの取得レスポンス
}

interface TemplateDataItem {
  // MAIMLテンプレートデータ（DataRecordDialogのTemplateDataItemと統一/共用を検討）
}
```

---

## 5. 確認事項チェックリスト

### 仕様確認
- [x] CreatorRef / InstrumentRef / OwnerRefはMAIMLのどの要素か → `maimlRoot.document.creators/instruments/owners[].name`（2-1 決定済み）
- [x] テンプレート入力はどのMAIML要素を使うか → `materialTemplates / conditionTemplates / resultTemplates`（2-2 決定済み）
- [ ] トランジション1つに対してテンプレートは1つか複数か（未確認）
- [x] 「全体」タブと「タスクN」タブのデータの関係性 → 全体→各タスクへ継承、タスクNで上書き可（2-4 決定済み）
- [ ] ダイアログを開いた時のデフォルト表示（2-6 確認待ち）

### API設計確認
- [ ] 保存先テーブル（案A: 新規テーブル / 案B: 既存instruction拡張）← **要決定**
- [ ] 保存粒度: `methodId + taskNumber` で1件ずつ（2-4 決定済み）→ エンドポイント設計はテーブル決定後
- [ ] 認可制御（誰が保存できるか：Manager以上？）← **要確認**

### UI/UX確認
- [ ] 比較用の案1/2/3切替ボタンは削除してよいか（案3固定）← **要確認**（2-5 確認待ち）
- [ ] テンプレート未設定時のメッセージ（未定義）
- [ ] 保存ボタンの活性条件（現在：トランジション選択済みのみ）← **要確認**
- [ ] 全体タブ変更時の各タスクタブへの反映動作（個別上書き済み項目の保護有無）

---

## 6. ファイル変更予定

### フロントエンド

| ファイル | 変更種別 | 内容 |
|---------|---------|------|
| `ExperimentPlanDialog.tsx` | 修正 | モック→本実装へ移行 |
| `experimentPlan.ts` | 修正・追加 | 型定義の追加・拡張 |
| `experimentPlanApiService.ts` | 修正 | 実APIへの接続 |

### バックエンド（Phase 2以降）

| ファイル | 変更種別 | 内容 |
|---------|---------|------|
| `migrations/YYYYMMDD_add_experiment_plan.sql` | 新規 | テーブル追加 |
| `backend/src/controllers/experimentPlanController.ts` | 新規 | 保存/取得API |
| `backend/src/services/experimentPlanService.ts` | 新規 | ビジネスロジック |
| `backend/src/repositories/experimentPlanRepository.ts` | 新規 | DB操作 |
| `backend/src/routes/experimentPlanRoutes.ts` | 新規 | ルーティング |
