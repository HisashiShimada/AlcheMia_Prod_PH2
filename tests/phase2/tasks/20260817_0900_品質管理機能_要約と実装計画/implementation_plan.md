# Alchemia 品質管理機能 — 実装計画書

> 原典: `docs/design/Alchemia品質管理機能_基本設計書.md`（初版 2026-08-03）
> 実装計画作成: 2026-08-17

---

## 1. 実装概要

### 対象機能

1. **MaiMLプロジェクト全体評価** — 既存「評価登録確認」タブへの階層別サマリー・要注意項目セクション追加
2. **階層別サマリー算出** — 集計ロジックのバックエンドサービス実装
3. **全体評価結果のMaiML記録** — 断面スナップショット凍結記録

### 既存コードとの関係

| 既存資産 | 位置づけ |
|---|---|
| `experiment_evaluation` テーブル・Repository・Service・Controller | 下位評価（メソッド別・タスク別・トランジション別）の既存実装。今回の集計入力として**読み取り専用で活用** |
| `EvaluationRegistrationTabContent.tsx` | 評価登録タブ（既存）。今回は上部に階層別サマリー・要注意項目セクションを**拡張追加**する |
| `experimentEvaluationRoutes.ts` | 既存ルート。今回のAPIは新規ルートファイルに分離して追加 |

---

## 2. フェーズ構成

```
Phase 1: DB スキーマ・集約ルール基盤
Phase 2: 集計ロジック（バックエンド）
Phase 3: フロントエンド画面（既存「評価登録確認」タブ拡張・集約ルール設定）
Phase 4: MaiML 記録・品質保証
```

---

## 3. Phase 1: DB スキーマ・集約ルール基盤

### 3.1 新規テーブル: `aggregation_rules`

```sql
-- テナント共通の集約ルール
CREATE TABLE {schema}.aggregation_rules (
  rule_id              UUID        NOT NULL DEFAULT gen_random_uuid(),
  organization_id      TEXT        NOT NULL,
  version              INTEGER     NOT NULL DEFAULT 1,
  status               TEXT        NOT NULL DEFAULT 'ACTIVE',
  score_good           INTEGER     NOT NULL DEFAULT 100,
  score_caution        INTEGER     NOT NULL DEFAULT 50,
  score_bad            INTEGER     NOT NULL DEFAULT 0,
  target_rollup        TEXT        NOT NULL DEFAULT 'WORST_CASE',
  level_status_rule    TEXT        NOT NULL DEFAULT 'WORST_CASE',
  level_score_rule     TEXT        NOT NULL DEFAULT 'MEAN',
  missing_handling     TEXT        NOT NULL DEFAULT 'SEPARATE_COUNT',
  transition_hierarchy TEXT        NOT NULL DEFAULT 'MERGE',
  created_by           TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organization_id, rule_id, version)
);
-- status=ACTIVE は同時に1版のみ（アプリ側で制御）
```

### 3.2 新規テーブル: `project_overall_evaluations`

```sql
-- プロジェクト全体評価レコード（MaiML記録・断面凍結）
CREATE TABLE {schema}.project_overall_evaluations (
  evaluation_id         UUID        NOT NULL DEFAULT gen_random_uuid(),
  organization_id       TEXT        NOT NULL,
  project_id            TEXT        NOT NULL,
  evaluation_scope      TEXT        NOT NULL DEFAULT 'MAIML_PROJECT',
  evaluated_by          TEXT,
  evaluated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  overall_digital       TEXT,           -- 良好 | 要確認 | 不良
  overall_score         INTEGER,        -- 任意スコア
  overall_analog        TEXT,           -- アナログ評価（自由文章）
  applied_rule_id       UUID        NOT NULL,
  applied_rule_version  INTEGER     NOT NULL,
  applied_rule_snapshot JSONB       NOT NULL,  -- ルールパラメータの凍結値
  aggregation_snapshot  JSONB       NOT NULL,  -- levels / sourceEvaluations / attentionItems
  create_user_id        TEXT,
  create_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organization_id, evaluation_id)
);
```

### 3.3 集約ルール CRUD API

| メソッド | パス | 概要 |
|---|---|---|
| GET | `/api/v1/aggregation-rules/active` | テナントの ACTIVE ルールを取得 |
| GET | `/api/v1/aggregation-rules` | ルール履歴一覧を取得 |
| POST | `/api/v1/aggregation-rules` | 新版を作成して ACTIVE に設定（旧版は DEPRECATED） |
| POST | `/api/v1/aggregation-rules/preview` | 登録済みデータに対するプレビュー算出 |

### 3.4 Phase 1 実装チェックリスト

- [x] `backend/src/sql/ddl/aggregation_rules.sql`
- [x] `backend/src/sql/ddl/project_overall_evaluations.sql`
- [x] `backend/src/sql/queries/aggregation_rules/findActive.sql`
- [x] `backend/src/sql/queries/aggregation_rules/findAll.sql`
- [x] `backend/src/sql/queries/aggregation_rules/insert.sql`
- [x] `backend/src/sql/queries/aggregation_rules/deprecateOld.sql`
- [x] `backend/src/repositories/aggregationRuleRepository.ts`
- [x] `backend/src/services/aggregationRuleService.ts`
- [x] `backend/src/controllers/aggregationRuleController.ts`
- [x] `backend/src/routes/aggregationRuleRoutes.ts`
- [x] `backend/src/types/aggregationRule.ts`

---

## 4. Phase 2: 集計ロジック（バックエンド）

### 4.1 階層別サマリー算出ロジック

集計は既存の `experiment_evaluation` テーブルのデータを読み取り、集約ルールを適用して算出する。

#### 算出フロー

```
1. findByProject() で下位評価データを取得（既存Repository流用）
2. evaluation_unit ごとにグループ化
   - 'method'                          → メソッド別
   - 'task'                            → タスク別
   - 'transition_method'/'transition_task' → トランジション別（MERGE/SPLIT に従う）
3. 多基準ロールアップ（第1段）
   - 同一対象に複数評価基準がある場合、target_rollup ルールで代表値を決定
   - WORST_CASE: 最悪値採用 / MAJORITY: 多数決 / AVERAGE: 平均スコアで決定
4. 階層代表ステータス・スコア決定（第2段）
   - level_status_rule: WORST_CASE（最悪値） or MAJORITY（多数決）
   - level_score_rule:  MEAN（平均） or MIN（最小値）
5. 未評価の処理
   - SEPARATE_COUNT: 別カウント（既定）/ EXCLUDE_DENOMINATOR: 除外 / TREAT_AS_GOOD: 良好扱い
6. 要注意項目抽出: evaluation_value が '良好' 以外を severity（不良>要確認）でソート
```

#### 型定義（`backend/src/types/aggregationRule.ts` に追加）

```typescript
export interface LevelSummary {
  level: 'method' | 'task' | 'transition';
  total: number;
  good: number;
  caution: number;
  bad: number;
  missing: number;
  statusRepresentative: '良好' | '要確認' | '不良' | null;
  scoreAverage: number | null;
}

export interface AttentionItem {
  evaluationUnit: string;
  methodId: string | null;
  taskNo: number | null;
  transitionId: string | null;
  evaluationValue: '要確認' | '不良';
  comment: string | null;
  severity: 'bad' | 'caution';
}

export interface AggregationSnapshot {
  levels: LevelSummary[];
  sourceEvaluations: unknown[];  // ExperimentEvaluationRow[] の凍結値
  attentionItems: AttentionItem[];
}
```

### 4.2 全体評価 CRUD API

| メソッド | パス | 概要 |
|---|---|---|
| GET | `/api/v1/project-overall-evaluations/:projectId` | プロジェクトの全体評価取得（最新） |
| POST | `/api/v1/project-overall-evaluations` | 全体評価を登録（断面を凍結して保存） |
| GET | `/api/v1/project-overall-evaluations/:projectId/summary` | 階層別サマリーのプレビュー（未登録の動的算出） |

### 4.3 Phase 2 実装チェックリスト

- [ ] `backend/src/services/aggregationCalculatorService.ts`（集計ロジック中核）
  - [ ] `calculateLevelSummaries(evaluations, rule)` — 階層別サマリー算出
  - [ ] `extractAttentionItems(evaluations)` — 要注意項目抽出
  - [ ] `applyTargetRollup(items, rule)` — 多基準ロールアップ
  - [ ] `resolveNumericScore(value, mapping)` — 数値スコア写像
- [ ] `backend/src/sql/queries/project_overall_evaluations/findByProject.sql`
- [ ] `backend/src/sql/queries/project_overall_evaluations/insert.sql`
- [ ] `backend/src/repositories/projectOverallEvaluationRepository.ts`
- [ ] `backend/src/services/projectOverallEvaluationService.ts`
- [ ] `backend/src/controllers/projectOverallEvaluationController.ts`
- [ ] `backend/src/routes/projectOverallEvaluationRoutes.ts`
- [ ] `backend/src/types/projectOverallEvaluation.ts`
- [ ] `backend/src/__tests__/aggregationCalculatorService.test.ts`（ユニットテスト）

---

## 5. Phase 3: フロントエンド画面

### 5.1 方針：新規タブ不要・既存タブを拡張

既存の「評価登録確認」タブ（`EvaluationRegistrationTab.tsx`）は、実験管理者が各階層の評価を確認し `evaluation_unit = 'project'` の全体評価を入力する画面として既に実装されている。設計書が想定する「全体評価」の操作主体・目的と完全に一致しているため、**新規タブは作成しない**。

代わりに既存タブの上部に**階層別サマリーセクションと要注意項目セクションを追加**することで、設計書の画面要件を満たす。

### 5.2 拡張後の画面構成イメージ

```
┌─────────────────────────────────────────────┐  ← 既存タブ（拡張）
│ [階層別サマリー]  ← 新規追加セクション        │
│   メソッド別:      [■■■□□] 良好1 要確認1 不良0 │
│   タスク別:        [■□■□□] 良好1 要確認0 不良1 │
│   トランジション別: [■■■□□] 良好2 要確認1 不良0 │
├─────────────────────────────────────────────┤
│ [要注意項目]  ← 新規追加セクション            │
│   ● 不良  METHOD-A  コメント: ...            │
│   ▲ 要確認 TRANSITION-T001  コメント: ...    │
├─────────────────────────────────────────────┤
│ [既存の評価入力ボタン・一覧テーブル]           │  ← 既存のまま
│   ✏️ 評価を入力                              │
│   ┌────┬──────┬────────┐                   │
│   │評価単位│評価値│コメント│ ...               │
│   └────┴──────┴────────┘                   │
└─────────────────────────────────────────────┘
```

### 5.3 Phase 3 実装チェックリスト

#### 新規作成コンポーネント

- [ ] `frontend/src/components/project/subcomponents/EvaluationSummaryBar.tsx`
  - LevelSummary を受け取り、N で正規化した度数分布バーを描画
- [ ] `frontend/src/components/project/subcomponents/AttentionItemList.tsx`
  - AttentionItem[] を受け取り、severity 順（不良 → 要確認）で表示
- [ ] `frontend/src/hooks/project/useOverallEvaluation.ts`
  - `GET /project-overall-evaluations/:projectId/summary` を呼び出し LevelSummary を取得

#### 既存ファイルの修正

- [ ] `frontend/src/components/project/EvaluationRegistrationTab.tsx`
  - 上部に `EvaluationSummaryBar` を追加（`GET /summary` で動的取得）
  - 上部に `AttentionItemList` を追加（サマリーデータから生成）
  - タブ新設・ルーティング変更は**不要**

#### 集約ルール設定画面（管理画面）

- [ ] `frontend/src/components/SystemManagement/AggregationRuleSettings.tsx`
- [ ] `frontend/src/hooks/useAggregationRule.ts`

---

## 6. Phase 4: MaiML 記録・品質保証

### 6.1 断面スナップショット凍結記録

全体評価登録時に `aggregation_snapshot` JSONB に以下を凍結保存する。

```json
{
  "levels": [],
  "sourceEvaluations": [],
  "attentionItems": []
}
```

`applied_rule_snapshot` にはルールパラメータをそのまま凍結する。集約ルールが後日変更されても過去エビデンスが独立して再現可能になる。

### 6.2 既存 `exportToMaiml` との連携

全体評価レコードの MaiML への書き込みは、**MaiML スキーマ設計後に別途実装**する（本フェーズでは DB 記録のみ確定）。

### 6.3 テスト計画

#### ユニットテスト（`aggregationCalculatorService.test.ts`）

| テストケース | 期待結果 |
|---|---|
| 全件良好（7件） | 全階層 代表ステータス=良好、スコア=100 |
| 設計書サンプル7件（既定ルール） | メソッド:要確認/75、タスク:不良/50、トランジション:要確認/83.3 |
| 多基準ロールアップ WORST_CASE | 最悪値が代表値になる |
| 多基準ロールアップ MAJORITY | 多数決で代表値が決まる |
| 未評価 SEPARATE_COUNT | 未評価が別カウント・分母に含まれない |
| 未評価 EXCLUDE_DENOMINATOR | 分母から除外されてスコア算出 |
| 未評価 TREAT_AS_GOOD | 良好として集計される |
| スコア写像カスタマイズ（100/70/30） | カスタム値で正しく算出 |

#### 統合テスト

- [ ] 集約ルール CRUD API（GET/POST/preview）
- [ ] 全体評価 POST → 断面が凍結されて取得できること
- [ ] ルール変更後も過去レコードが旧ルールの断面を保持していること

#### 手動テスト

- [ ] 「評価登録確認」タブの上部に階層別サマリーバーが表示されること
- [ ] 集計バーが設計書算出例（メソッド:75、タスク:50、トランジション:83.3）と一致
- [ ] 集約ルール設定画面のプレビューが即時反映されること
- [ ] 全体評価（`evaluation_unit='project'`）登録後、評価一覧に1行として追記されること
- [ ] 登録済み評価レコードが凍結されており、ルール変更後も変わらないこと

---

## 7. 新規ファイル一覧（全体）

### バックエンド

```
backend/src/sql/ddl/
├── aggregation_rules.sql
└── project_overall_evaluations.sql

backend/src/sql/queries/aggregation_rules/
├── findActive.sql / findAll.sql / insert.sql / deprecateOld.sql

backend/src/sql/queries/project_overall_evaluations/
├── findByProject.sql / insert.sql

backend/src/repositories/
├── aggregationRuleRepository.ts
└── projectOverallEvaluationRepository.ts

backend/src/services/
├── aggregationRuleService.ts
├── aggregationCalculatorService.ts
└── projectOverallEvaluationService.ts

backend/src/controllers/
├── aggregationRuleController.ts
└── projectOverallEvaluationController.ts

backend/src/routes/
├── aggregationRuleRoutes.ts
└── projectOverallEvaluationRoutes.ts

backend/src/types/
├── aggregationRule.ts
└── projectOverallEvaluation.ts

backend/src/__tests__/
└── aggregationCalculatorService.test.ts
```

### フロントエンド

```
frontend/src/components/project/subcomponents/
├── EvaluationSummaryBar.tsx     ← 新規
└── AttentionItemList.tsx        ← 新規

frontend/src/components/SystemManagement/
└── AggregationRuleSettings.tsx  ← 新規

frontend/src/hooks/
├── useAggregationRule.ts        ← 新規
└── project/useOverallEvaluation.ts  ← 新規
```

> `OverallEvaluationTabContent.tsx`・`OverallEvaluationForm.tsx`・`overallEvaluation.ts` は不要（既存タブを拡張するため）。タブ切り替えコンポーネントへの変更も不要。

---

## 8. 影響範囲

### 変更が必要な既存ファイル

| ファイル | 変更内容 |
|---|---|
| `frontend/src/components/project/EvaluationRegistrationTab.tsx` | 上部に階層別サマリー・要注意項目セクションを追加 |
| `backend/src/routes/index.ts` または `app.ts` | 新規ルートを登録 |

> タブ切り替えコンポーネント（`ProjectManagementInner.tsx`）への変更は**不要**。新規タブは追加しない。

### 変更しない既存資産（読み取り専用で活用）

| ファイル | 用途 |
|---|---|
| `experimentEvaluationRepository.ts` | `findByProject()` で下位評価を取得 |
| `experiment_evaluation` テーブル | 集計の入力データソース・全体評価（`evaluation_unit='project'`）の保存先 |

---

## 9. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|---|---|---|---|
| 集計ロジックが設計書の算出例と一致しない | 高 | 中 | Phase 2 完了後に設計書サンプル7件でユニットテストを実施 |
| 断面凍結の実装が不完全 | 高 | 低 | JSONB 完全凍結を統合テストで確認 |
| マルチテナント分離の漏れ | 高 | 低 | 全APIで `organization_id` を WHERE 条件に必ず含める |
| 多基準ロールアップのテストデータ不足 | 中 | 高 | Phase 4 で多基準対象を含む検証データを別途用意 |
| 特許との整合性 | 中 | 低 | 数値スコア写像の既定値（100/50/0）を変更しない |

---

## 10. 依存関係・前提条件

| 前提 | 状態 |
|---|---|
| 下位評価の登録機能 | ✅ 実装済み（`experiment_evaluation` テーブル） |
| テナント（organization_id）管理 | ✅ 実装済み |
| ユーザー認証・ロール管理 | ✅ 実装済み |
| MaiMLスキーマへの全体評価記録 | 🔲 Phase 4 以降で別途設計 |

---

## 11. 実装順序（推奨スケジュール）

| 週 | 内容 |
|---|---|
| Week 1 | Phase 1: DDL作成・集約ルールRepository/Service/Controller/Routes/API テスト |
| Week 2 | Phase 2: aggregationCalculatorService + ユニットテスト + 全体評価API |
| Week 3 | Phase 3: フロントエンドコンポーネント + タブ追加 + 管理画面 |
| Week 4 | Phase 4: 断面凍結統合テスト + 多基準テストデータ + 手動テスト |

---

## 12. 関連ドキュメント

| ドキュメント | パス |
|---|---|
| 基本設計書（原典） | `docs/design/Alchemia品質管理機能_基本設計書.md` |
| 機能要約資料 | `docs/tasks/20260817_0900_品質管理機能_要約と実装計画/feature_summary.md` |
| DB操作規約 | `.clinerules/development/database.md` |
| TypeScript型定義規約 | `.clinerules/development/typescript.md` |
| エラーコード一覧 | `.clinerules/references/error_codes.md` |
