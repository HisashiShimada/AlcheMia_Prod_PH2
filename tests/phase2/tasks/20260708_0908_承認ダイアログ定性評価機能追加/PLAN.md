# タスク計画書: 承認処理ダイアログへの定性評価機能追加

## メタデータ
- **作成日時**: 2026-07-08 09:08
- **タスクID**: approval-dialog-qualitative-evaluation
- **優先度**: 高
- **推定工数**: 8時間

## 1. タスク概要

実験指示タブの「承認処理」ダイアログに定性評価セクションを追加する。
承認と同時に、プロジェクト・メソッド・タスク・トランジション単位の定性評価を入力し、
評価結果をDBに保存するとともに `<Uncertainty>` タグに変換してMAIML（JSONB形式）へ書き出す。

## 2. 目的と期待される成果

### 目的
- 承認ワークフローに評価プロセスを組み込み、データの信頼性を記録できるようにする
- 既存の一覧テーブルのレイアウトは変更せず、承認ダイアログ内で完結させる

### 期待される成果
- [ ] 承認処理ダイアログに定性評価セクションが追加される
- [ ] 評価単位（プロジェクト/メソッド/タスク/トランジション）を切り替えられる
- [ ] `uncertainty_criteria`・`intuition_selector` テーブルから評価基準・選択肢を取得できる
- [ ] 評価結果が新規DBテーブル `experiment_evaluation` に保存される
- [ ] 評価結果が `<Uncertainty>` タグに変換されてMAIML（JSONB）に書き出される

## 3. UIデザイン

### ダイアログ構成：2ステップ（ウィザード形式）（width: 860px）

**フロー：Step 1（定性評価入力）→ Step 2（承認/NG選択）→ 実行**

---

#### Step 1: 定性評価

```
┌─────────────────────────────────────────────────────────────────────┐
│  承認処理                                                    [×]    │
├─────────────────────────────────────────────────────────────────────┤
│   ●━━━━━━━━━━━━━━━━━━━━━━○                                        │
│  Step 1: 定性評価        Step 2: 承認 / NG                          │
├─────────────────────────────────────────────────────────────────────┤
│  評価単位: ○ プロジェクト全体  ● メソッド  ○ タスク               │
│            ○ トランジション（メソッド別）  ○ トランジション（タスク別）│
│                                                                     │
│  不確かさ基準: [基準名を選択 ▾]  ← uncertainty_criteriaから取得    │
│                                                                     │
│  ┌─────────────────────┬──────────────────────┬────────────────┐  │
│  │ メソッド名           │ 定性評価              │ コメント        │  │
│  ├─────────────────────┼──────────────────────┼────────────────┤  │
│  │ method_001          │ [■確か           ▾] │ [__________]  │  │
│  │ method_002          │ [□未評価         ▾] │ [__________]  │  │
│  └─────────────────────┴──────────────────────┴────────────────┘  │
│                                                                     │
│  ※ 評価はオプションです。スキップして承認/NGへ進むことも可能です。     │
├─────────────────────────────────────────────────────────────────────┤
│                     [キャンセル]  [次へ：承認/NG を選択 →]           │
└─────────────────────────────────────────────────────────────────────┘
```

#### Step 2: 承認 / NG

```
┌─────────────────────────────────────────────────────────────────────┐
│  承認処理                                                    [×]    │
├─────────────────────────────────────────────────────────────────────┤
│   ✓━━━━━━━━━━━━━━━━━━━━━━●                                        │
│  Step 1: 定性評価 ✓      Step 2: 承認 / NG                         │
├─────────────────────────────────────────────────────────────────────┤
│  メソッド名: [method_001 ▾]    タスク番号: [#1 ▾]                  │
│                                                                     │
│  操作を選択:                                                         │
│  ● 承認する  ○ NG にする                                           │
│  （NG選択時）NG理由: [___________________________________]          │
│                                                                     │
│  ▼ Step1 の評価サマリー（確認用）                                    │
│  method_001: ■確か  method_002: □未評価                            │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│               [← 戻る]  [キャンセル]  [実行（承認 & 評価を保存）]    │
└─────────────────────────────────────────────────────────────────────┘
```

### 評価単位ごとのテーブル列構成（Step 1）

| 評価単位 | 識別列 | 評価列 | コメント列 |
|---------|--------|--------|-----------|
| プロジェクト全体 | プロジェクト名（1行固定） | 定性評価Select | テキスト入力 |
| メソッド | メソッド名 | 定性評価Select | テキスト入力 |
| タスク | タスクNo + ステータス | 定性評価Select | テキスト入力 |
| トランジション（メソッド別） | メソッドSelect + トランジション名 | 定性評価Select | テキスト入力 |
| トランジション（タスク別） | タスクSelect + トランジション名 | 定性評価Select | テキスト入力 |

## 4. 実装ステップ

### Phase 1: DBテーブル作成（DDL + マイグレーション）
- [ ] `experiment_evaluation` テーブルのDDL作成
- [ ] マイグレーションファイル作成

### Phase 2: バックエンド実装
- [ ] `experimentEvaluationRepository.ts` 作成（insert/update/findByProject）
- [ ] SQLファイル作成（`backend/src/sql/queries/experiment_evaluation/`）
- [ ] `experimentEvaluationController.ts` 作成
- [ ] `experimentEvaluationRoutes.ts` 作成
- [ ] `backend/src/server.ts` にルート追加
- [ ] 承認API（`approveTask`）を拡張して評価保存・MAIML書き出しを追加

### Phase 3: フロントエンド実装
- [ ] `experimentEvaluationApiService.ts` 作成（API呼び出し）
- [ ] 承認処理ダイアログに評価セクションを追加（`ExperimentInstructionTab.tsx`）
  - 評価単位ラジオボタン
  - 不確かさ基準Select（`uncertainty_criteria`から取得）
  - 評価テーブル（選択肢は`intuition_selector`から動的取得）

### Phase 4: MAIML書き出し
- [ ] `<Uncertainty>` タグへの変換ロジック実装
- [ ] MAIMLのJSONBカラムへの書き出し処理

## 5. 変更ファイル

### 新規作成
1. `docs/design/db/ddl/experiment_evaluation.sql` - DDL定義
2. `backend/migrations/YYYYMMDD_create_experiment_evaluation.sql` - マイグレーション
3. `backend/src/sql/queries/experiment_evaluation/insert.sql`
4. `backend/src/sql/queries/experiment_evaluation/findByProject.sql`
5. `backend/src/repositories/experimentEvaluationRepository.ts`
6. `backend/src/controllers/experimentEvaluationController.ts`
7. `backend/src/routes/experimentEvaluationRoutes.ts`
8. `frontend/src/services/experimentEvaluationApiService.ts`
9. `frontend/src/types/experimentEvaluation.ts`

### 修正
1. `frontend/src/components/project/ExperimentInstructionTab.tsx` - 承認ダイアログに評価セクション追加
2. `backend/src/server.ts` - ルート追加

## 6. データ構造

### `experiment_evaluation` テーブル設計

```sql
CREATE TABLE experiment_evaluation (
    organization_id     UUID            NOT NULL,
    project_name        VARCHAR(100)    NOT NULL,
    evaluation_unit     VARCHAR(20)     NOT NULL,  -- 'project'|'method'|'task'|'transition_method'|'transition_task'
    method_id           VARCHAR(100),
    task_no             INTEGER,
    transition_id       VARCHAR(100),
    name_space_id       VARCHAR(50)     NOT NULL,  -- 使用した不確かさ基準の名前空間
    uncertainty_key     VARCHAR(50)     NOT NULL,  -- 使用した不確かさ基準Key
    uc_version          INTEGER         NOT NULL,  -- 不確かさ基準バージョン
    evaluation_value    VARCHAR(100),              -- 選択したvalue（intuition_selector.value）
    comment             VARCHAR(500),
    uncertainty_xml     JSONB,                     -- <Uncertainty>タグのXML構造
    evaluated_by        VARCHAR(50),
    evaluated_at        TIMESTAMP,
    create_at           TIMESTAMP,
    update_at           TIMESTAMP,
    PRIMARY KEY (organization_id, project_name, evaluation_unit,
                 COALESCE(method_id,''), COALESCE(task_no::text,''),
                 COALESCE(transition_id,''), uncertainty_key)
);
```

### MAIMLへのUncertaintyタグ書き出しイメージ

```xml
<Method id="method_001">
  <Uncertainty key="ヤング率:評価" value="確か" evaluationUnit="method"
               evaluatedBy="山田 太郎" evaluatedAt="2026-07-08T09:00:00">
    <Comment>全体的に測定値が安定している</Comment>
  </Uncertainty>
</Method>
```

## 7. リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| トランジションIDがMAIMLパース未統合 | 中 | 高 | Phase1ではtrend_idをプレースホルダーとして実装、パース統合後に対応 |
| MAIML書き出しの整合性 | 高 | 中 | 承認処理とMAIML書き出しをトランザクションで包む |
| ダイアログが縦に長くなりすぎる | 低 | 中 | 評価セクションをCollapse（折りたたみ）にする |

## 8. テスト計画

- [ ] 評価なし承認（既存動作の維持確認）
- [ ] メソッド単位評価 + 承認
- [ ] タスク単位評価 + 承認
- [ ] 評価データのDB保存確認
- [ ] MAIMLファイルへの書き出し確認

## 9. 承認記録

- **計画書提示日時**: 2026-07-08 09:08
- **承認日時**: 
- **承認者コメント**: 
