# 不確かさ機能改修 方針レポート

> 作成日: 2026-08-21  
> 更新日: 2026-08-21（判定トリガー・繰り返し測定設計・キー方針を確定）
> 本レポートは会話中に整理された改修方針を文書化したもの

---

## 1. 改修の背景と目的

### 現状の課題
- `uncertainty_criteria` に不確かさ基準を登録できるが、**判定ロジックが存在しない**
- 不確かさの「種類（何を計算するか）」がシステム上定義されておらず、自由形式で入力している
- `experiment_instruction_detail` に `uncertainty_assigned_value` を保存しているが、
  その値が OK か NG かの**自動判定が行われていない**
- 品質評価（`project_overall_evaluations`）は現状すべて**手動入力**に依存している

### 改修の目的
- 標準的な不確かさ指標（JIS K 0200）に基づく**自動判定ロジック**を実装する
- 判定結果を**MAiML の `<uncertainty>` タグ**に記録し、エビデンスとして保存する
- 判定結果を既存の**品質評価サマリー**に連携させる

---

## 2. 基本方針（5本柱）

### 方針 1: 標準キーの計算式はソース側で一元管理する

> DB にはキーの「定義情報（許容値等）」のみを持ち、**計算式のロジックはソースコードで管理する。**

- 計算式はシステムの `uncertaintyCalculator.ts`（新規）に実装する
- DB に計算式を文字列で保存する方式（eval 実行等）は採用しない
- キーの追加・変更はソースコード修正でリリース管理する

**理由:** 計算式はバリデーション・型安全・テスト可能性が必要なため、ソース管理が適切。

---

### 方針 2: 標準キーをベースに個別の不確かさ基準を作成する

> `uncertainty_criteria` 作成時、6 つの標準キーのどれかを **ベース** として選択し、
> そのベースに **許容値** を設定する。

```
標準キー（システム定義、ソース管理）
  └── uncertainty_criteria（組織ごとの不確かさ基準）
        ├── formula_key    = "Bias"      ← ベースとなる標準キー
        ├── tolerance_value = 0.05       ← 許容値（組織が設定）
        └── tolerance_type = "ABSOLUTE"  ← ABSOLUTE / RELATIVE
```

- ベースの標準キーが計算式を決定する
- 許容値は組織・用途ごとに柔軟に設定できる
- 既存の `uncertainty_criteria` テーブルに `formula_key` / `tolerance_value` / `tolerance_type` カラムを追加する

---

### 方針 3: 自動判定を実行し結果をテーブルに保存する

> 判定実行時、計算結果と OK/NG 判定を新規テーブル（`experiment_uncertainty_judge`）に保存する。

```
experiment_uncertainty_judge（新規テーブル）
  ├── judge_result      OK / NG / SKIP
  ├── calculated_value  実際の計算値（Bias値、標準偏差値 等）
  ├── tolerance_value   適用した許容値（凍結値）
  ├── formula_key       使用した計算式キー（凍結値）
  └── judge_reason      判定根拠の説明文字列
```

- 判定実行のたびに INSERT（履歴として蓄積）
- 再判定時は最新レコードを「有効判定」として使用する

#### 判定実行トリガー（確定）

| キー種別 | トリガー | 理由 |
|---|---|---|
| **Bias** | WorkRecordPanel で実績値を**保存したタイミング** | expected_value / actual_value が揃った時点で即計算可能 |
| **StandardDeviation / SampleRange / Precision / StandardUncertainty** | プロジェクトの**承認依頼を送信したタイミング** | 全タスクの実績値が揃ってから集計するため |

承認依頼送信時（`requestApproval`）に `task_status: IN_PROGRESS → REVIEW_WAITING` の一括更新が走るため、
このタイミングで繰り返し系の計算をトリガーする。

---

### 方針 4: MAiML の `<uncertainty>` タグに判定結果を記載する

> MAiML エクスポート時、各プロパティの `<uncertainty>` タグに自動判定結果と計算値を書き込む。

```xml
<!-- 書き込みイメージ -->
<property key="measurement:Temperature" xsi:type="floatType">
  <value>100.3</value>
  <uncertainty key="uncertainty:Bias">
    <value>0.3</value>
    <description>OK: Bias=0.3 ≤ tolerance=0.5</description>
  </uncertainty>
</property>
```

- 既存の `qualityEvaluationMaimlService.ts` / `maimlQualityWriter.ts` に処理を追加
- Bias 値等の「偏りの数値」は `<uncertainty>` の `value` に格納

---

### 方針 5: 判定結果を品質評価サマリーに連携させる

> `experiment_uncertainty_judge` の OK/NG 結果を品質評価の集計ソースとして活用する。

```
experiment_uncertainty_judge（判定結果）
      ↓
project_overall_evaluations（品質評価）
      ↓
aggregationCalculatorService（集計）
      ↓
MAiML eventLog（最終記録）
```

---

## 3. データ構造の変更概要

### `uncertainty_criteria` へのカラム追加

| カラム名 | 型 | 説明 |
|---|---|---|
| `formula_key` | VARCHAR(50) NULL | ベースとなる標準キー（`Bias`, `StandardDeviation` 等） |
| `tolerance_upper` | NUMERIC(20,10) NULL | 許容上限値（formula_key 設定時は必須） |
| `tolerance_lower` | NUMERIC(20,10) NULL | 許容下限値（formula_key 設定時は必須） |

> `formula_key` が NULL の場合は tolerance_upper / lower もすべて NULL。  
> `formula_key` を設定する場合は tolerance_upper / lower 両方必須。  
> 判定は常に絶対値比較（`tolerance_lower ≤ calculated_value ≤ tolerance_upper`）。  
> 例: Bias ±0.5 → upper=0.5 / lower=-0.5、StandardDeviation 上限0.02 → upper=0.02 / lower=0.0

### `experiment_uncertainty_judge`（新規テーブル）

| カラム名 | 型 | 説明 |
|---|---|---|
| `judge_seq` | SERIAL PK | 判定連番 |
| `organization_id` | UUID NOT NULL | マルチテナント分離 |
| `project_id` | VARCHAR NOT NULL | プロジェクトID |
| `method_id` | VARCHAR NOT NULL | メソッドID（付帯・絞り込み用） |
| `task_no` | NUMERIC NULL | 対象タスク番号（Bias判定時のみ設定・繰り返し系はNULL） |
| `transition_id` | VARCHAR NOT NULL | トランジションID（付帯・絞り込み用） |
| `prop_key` | VARCHAR NOT NULL | MAiML プロパティキー（付帯・どのプロパティか） |
| `name_space_id` | VARCHAR NOT NULL | 名前空間ID（不確かさ基準FK） |
| `uncertainty_key` | VARCHAR NOT NULL | 不確かさ基準キー（不確かさ基準FK） |
| `version` | INTEGER NOT NULL | 判定時の不確かさ基準バージョン（凍結） |
| `formula_key` | VARCHAR NOT NULL | 使用した計算式キー（凍結） |
| `calculated_value` | NUMERIC(20,10) NULL | 計算結果値（MAiML `<uncertainty><value>` に使用） |
| `judge_result` | VARCHAR(10) NOT NULL | `OK` / `NG` / `SKIP` |
| `judged_at` | TIMESTAMPTZ NOT NULL | 判定実行日時 |
| `create_user_id` | VARCHAR NULL | 実行ユーザID（監査） |
| `create_at` | TIMESTAMPTZ NOT NULL | 作成日時（監査） |

> **設計方針**:
> - 主キーは `judge_seq`（SERIAL連番）。`organization_id` / `project_id` は必須検索条件として NOT NULL。
> - `task_no` は Bias 判定時のみ設定（N回目のどのタスクを判定したか）。繰り返し系（StandardDeviation等）は複数タスクをまとめた1レコードのため NULL。
> - 計算根拠（tolerance_value等）は `name_space_id` + `uncertainty_key` + `version` で `uncertainty_criteria` を参照すれば取得可能なため、このテーブルには持たない。

---

## 4. フェーズ別実装スコープ

### フェーズ 1: Bias のみ（最優先・即実装可能）
```
対象キー: Bias
必要データ: expected_value / actual_value（既存の experiment_instruction_detail）
判定トリガー: WorkRecordPanel で実績値を保存したタイミング
実装内容:
  - uncertainty_criteria に formula_key / tolerance_value / tolerance_type 追加
  - experiment_uncertainty_judge テーブル新設
  - uncertaintyCalculator.ts に Bias 計算実装
  - uncertaintyJudgeService.ts に判定ロジック
  - MAiML 書き込み処理に Bias 判定結果を追加
```

### フェーズ 2: 繰り返し測定型（追加テーブル不要・既存構造で対応可能）
```
対象キー: StandardDeviation / SampleRange / Precision / StandardUncertainty(A型)
前提条件: 追加テーブル不要（既存の template_data + project_task_detail を活用）
判定トリガー: 承認依頼送信時（requestApproval）

集計ロジック:
  同一 (method_id, transition_id, place_id, prop_key) かつ
  expected_value が一致するタスクのうち
  task_status が REVIEW_WAITING(2) または COMPLETED(3) の actual_value を収集
  → attempts_count 分のタスクが全て揃っていれば計算実行
  → 揃っていない場合は SKIP

Precision の扱い:
  StandardDeviation と計算式は同一（Sr = s）だが、
  MAiML キーとして「uncertainty:Precision」と「uncertainty:StandardDeviation」を
  独立して保持する（概念的区別を維持）
```

### フェーズ 3: 拡張対応（要追加検討）
```
対象キー: StandardUncertainty(B型)
対応方式: 半幅 a の手動入力フォームを追加
※ CombinedStandardUncertainty は対象外
   → 複数の Uncertainty を選択する形で代替する（既存の AssignPayload[] 複数選択で対応）
```

---

## 5. 確定事項・未決定事項

### 確定事項

| # | 論点 | 決定内容 |
|---|---|---|
| 1 | CombinedStandardUncertainty の扱い | **対象外**。複数の Uncertainty を選択する形で代替 |
| 2 | Bias の利用可能場面 | **Template 付与** と **ExperimentPlanDialog の想定値** 両方で使用可能 |
| 3 | 繰り返し系の利用可能場面 | **Template 付与のみ**（想定値に対するばらつき判定は Bias のスコープ） |
| 4 | 繰り返し測定の「繰り返し」の単位 | **解釈A**：同一メソッドを複数タスクで繰り返した結果を横断集計 |
| 5 | 同一条件の識別方法 | `expected_value` が一致するタスクのみ集計対象とする |
| 6 | 全タスク完了の確認方法 | `project_task.attempts_count` と `task_status` の組み合わせで判定 |
| 7 | 繰り返し系の判定トリガー | **承認依頼送信時**（`requestApproval`）|
| 8 | Bias の判定トリガー | **WorkRecordPanel で実績値を保存したタイミング** |
| 9 | Precision の扱い | StandardDeviation と計算式は同一だが**独立キーとして保持**（概念的区別） |
| 10 | フェーズ2の前提条件 | **追加テーブル不要**（既存の template_data + project_task_detail で対応） |

### 未決定事項

| # | 論点 | 選択肢 |
|---|---|---|
| 1 | StandardUncertainty B型 の対応 | A: 半幅 a の手動入力フォームを用意 / B: A型のみ対応 |

---

## 6. 影響ファイル一覧

| ファイル | 変更種別 | 概要 |
|---|---|---|
| `docs/design/db/ddl/uncertainty_criteria.sql` | 変更 | formula_key 等カラム追加 |
| `docs/design/db/ddl/migrations/YYYYMMDD_extend_uncertainty_criteria.sql` | 新規 | マイグレーション |
| `docs/design/db/ddl/experiment_uncertainty_judge.sql` | 新規 | 判定結果テーブル DDL |
| `backend/src/utils/uncertaintyCalculator.ts` | 新規 | 計算式実装 |
| `backend/src/utils/uncertaintyJudge.ts` | 新規 | 判定ロジック |
| `backend/src/repositories/uncertaintyCriteriaRepository.ts` | 変更 | formula_key 等対応 |
| `backend/src/repositories/experimentUncertaintyJudgeRepository.ts` | 新規 | 判定結果 CRUD |
| `backend/src/services/uncertaintyJudgeService.ts` | 新規 | 判定オーケストレーション |
| `backend/src/routes/uncertaintyJudgeRoutes.ts` | 新規 | API エンドポイント |
| `backend/src/utils/maimlQualityWriter.ts` | 変更 | 判定結果の MAiML 書き込み追加 |
| `backend/src/services/qualityEvaluationMaimlService.ts` | 変更 | 判定結果の連携 |
| `frontend/src/components/uncertainty/` | 変更 | 不確かさ基準作成フォームに formula_key 等追加 |

---

> 作成者: Cline  
> 作成日: 2026-08-21  
> 更新日: 2026-08-21  
> ステータス: ほぼ確定（未決定事項: StandardUncertainty B型 の対応方式のみ）
