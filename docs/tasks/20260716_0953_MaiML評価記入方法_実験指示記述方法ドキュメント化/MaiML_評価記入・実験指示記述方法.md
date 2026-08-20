# MaiML 評価記入・実験指示記述方法 仕様書

> **対象仕様書**
> - `20260701 評価記入方法_Rev3.docx`
> - `20260630_実験指示のMaiML記述方法_修正版.docx`
>
> **準拠規格**: JIS K 0200:2024

---

## 目次

1. [概要](#1-概要)
2. [用語・要素の定義](#2-用語要素の定義)
3. [評価記入方法（Rev.3）](#3-評価記入方法rev3)
   - [3.1 統一ルール（6ルール）](#31-統一ルール6ルール)
   - [3.2 owner要素の定義（記入者マスタ）](#32-owner要素の定義記入者マスタ)
   - [3.3 data層の評価記入](#33-data層の評価記入)
   - [3.4 eventLog層：event単位の評価（ルール1）](#34-eventlog層event単位の評価ルール1)
   - [3.5 eventLog層：trace単位の評価（ルール2）](#35-eventlog層trace単位の評価ルール2)
   - [3.6 eventLog層：log単位の評価（ルール3）](#36-eventlog層log単位の評価ルール3)
   - [3.7 多重評価の記載](#37-多重評価の記載)
   - [3.8 評価記載箇所と評価者明示方法の対応表](#38-評価記載箇所と評価者明示方法の対応表)
   - [3.9 移行チェックリスト](#39-移行チェックリスト)
4. [実験指示の記述方法](#4-実験指示の記述方法)
   - [4.1 event記載 vs condition記載の得失比較](#41-event記載-vs-condition記載の得失比較)
   - [4.2 ライフサイクルの種類と使い分け](#42-ライフサイクルの種類と使い分け)
   - [4.3 指示の分類マトリクス（範囲×対象）](#43-指示の分類マトリクス範囲対象)
   - [4.4 ケース別記述方法](#44-ケース別記述方法)
   - [4.5 全体構造まとめ](#45-全体構造まとめ)

---

## 1. 概要

本ドキュメントは、MaiML（Materials Informatics Markup Language）形式のXMLファイルにおける以下の2つのテーマを詳述する。

| テーマ | 内容 | Rev |
|--------|------|-----|
| **評価記入方法** | 実験結果・評価値をどの層（data/event/trace/log）に記載し、誰が評価したか（ownerRef）をどのように明示するか | Rev.3 |
| **実験指示の記述方法** | 実験管理者から作業者への指示事項（注意事項・許容誤差等）をどの要素に記載するか、event記載とcondition記載の使い分け | 修正版 |

### MaiMLの階層構造（概要）

```
document                          ← owner定義（記入者マスタ）
├── protocol層
│   ├── method / program / instruction
│   └── conditionTemplate / resultTemplate
├── data層
│   ├── material / condition / result
│   └── results コンテナ
└── eventLog層
    └── log
        └── trace
            └── event
```

---

## 2. 用語・要素の定義

| 用語 / 要素 | 説明 |
|-------------|------|
| `<owner>` | 評価者・記入者本体の定義。`<document>`直下で一元管理 |
| `<ownerRef>` | `<owner>`への参照。`ref`属性でownerのidを指定。event/trace/logに付与 |
| `<resultsRef>` | resultsコンテナへの参照。どのresultsグループに属するかを示す |
| `concept:instance` | 個々のresultのUUIを指定するproperty。特定のresult要素を一意に追跡するために使用 |
| `lifecycle:transition` | eventのライフサイクル状態。`schedule` / `assign` / `start` / `complete` / `ate_abort` / `pi_abort` 等 |
| `<log>` | 複数のtraceをまとめる最上位ログ単位。methodに対応 |
| `<trace>` | 1回の一連の工程全体。programに対応 |
| `<event>` | 特定instructionに対する行為記録。instructionにrefで対応 |
| `<result>` | 実験結果・評価値を格納するdata層要素 |
| `<condition>` | 実験条件・パラメータを格納するdata層要素 |
| `<uncertainty>` | 測定値の不確かさを格納。`<property>`の子要素として記載 |

---

## 3. 評価記入方法（Rev.3）

### 3.1 統一ルール（6ルール）

評価値を記載するすべての箇所に以下のルールを適用する。  
根拠：JIS K 0200:2024 6.5.2 / 6.5.3 / 6.5.4 / 6.5.7

---

#### ルール1：event単位の評価には `<ownerRef>` を必須とする

> 評価用の `<property>`（PassFail、JudgementResult等）を1つ以上含む `<event>` 要素には、対応する評価者を示す `<ownerRef>` 要素を **必ず1つ以上** 子要素として付与する。

**根拠**: K0200 6.5.4, 6.5.7

---

#### ルール2：trace単位（工程全体）の評価には `<ownerRef>` を必須とする

> `<trace>` 要素自身に工程全体の評価用 `<property>`（OverallPassFail等）を記載する場合、その `<trace>` 要素にも対応する `<ownerRef>` 要素を **必ず付与する**。

**根拠**: K0200 6.5.3, 6.5.7

---

#### ルール3：log単位（複数trace集約）の評価には `<ownerRef>` を必須とする

> 複数の `<trace>` をまとめて評価する場合、評価用 `<property>` を `<log>` 要素に記載し、`<ownerRef>` を `<log>` 要素の **子要素として直接付与する**。

**根拠**: K0200 6.5.2, 6.5.7

> ✅ **Rev.3での修正ポイント**: Rev.2では「`<log>`への直接付与例がガイドラインにない」として集約評価専用のtrace/eventを新設していたが、K0200 6.5.7の本文により`<log>`への直接付与が正式に許可されていることが確認された。架空のtrace/programを新設する回避策は**不要**。

---

#### ルール4：data層の評価値にはownerRefを直接付与しない（event経由で追跡）

> `<result>/<property>` で記載される評価値には `<ownerRef>` を**直接付与しない**。  
> 代わりに、その評価値を参照する `<event>` 要素が持つ以下の3点の組み合わせで追跡する：
> 1. `concept:instance`（対象resultのUUID）
> 2. `<resultsRef>`（対象resultsコンテナのID）
> 3. `<ownerRef>`（誰が評価したか）

**根拠**: K0200 7.7

---

#### ルール5：`<owner>` 要素の一元管理

> `<owner>` 要素は `<document>` 要素直下で **一度だけ定義** する。  
> 以降のすべての参照は `<ownerRef>` 要素（ref属性による参照）で行い、同一評価者の情報を複数箇所に重複して記載しない。

**根拠**: K0200 6.2.5

---

#### ルール6：参照要素の記載形式・命名規則を統一する

> - `<ownerRef>` · `<resultsRef>` は、**原則として自己完結タグ**（id・ref属性のみ）として記載する  
>   （`<uuid>` · `<name>` · `<description>` 子要素は任意。必要な場合のみ追加）
> - `<ownerRef>` のid属性の接頭辞 "ownerRef" に続く添字は、**親要素（event / trace / log）の識別用添字と揃える**

---

### 3.2 owner要素の定義（記入者マスタ）

評価者は `<document>` 要素の直下で `<owner>` 要素として定義する（K0200 6.2.5）。

```xml
<document>

  <owner id="owner_xxxOperator">
    <uuid>...</uuid>
    <name>xxx:MeasurementOperator</name>
    <description>計測を実施したオペレーター</description>
  </owner>

  <owner id="owner_xxxSupervisor">
    <uuid>...</uuid>
    <name>xxx:Supervisor</name>
    <description>後日評価を行った実験管理者</description>
  </owner>

</document>
```

> ⚠️ **注記**: `<owner>` 要素はUUIDにより個人・組織を一意に識別するグローバル要素。個人を特定できる情報（PII/PID）を名前空間修飾名に含める場合は、組織外への公開範囲に十分注意すること（K0200 6.2.5、ガイドライン9.13.1節参照）。

#### ownerRefの記載形式（標準形式 vs 詳細形式）

```xml
<!-- ✅ 標準形式（本仕様における基本）：自己完結タグ -->
<ownerRef id="ownerRef_xxxOperator_complete_i01" ref="owner_xxxOperator"/>

<!-- 任意：詳細形式（自己文書化が必要な場合のみ使用） -->
<ownerRef id="ownerRef_xxxOperator_complete_i01" ref="owner_xxxOperator">
  <name>xxx:MeasurementOperatorReference</name>
  <description>計測完了を判定した作業者への参照</description>
</ownerRef>
```

---

### 3.3 data層の評価記入

`<material>` · `<condition>` · `<result>` における評価値の記載方法。

#### 定量評価（数値＋不確かさ）

```xml
<data id="data_Measurement">
  <uuid>22dabd47-9a8c-4d63-a639-93f1aa141630</uuid>

  <results id="results_Measurement_i01">
    <uuid>...</uuid>

    <result id="result_Measurement_output" ref="resultTemplate_Measurement">
      <uuid>c1d6c085-e13c-4a67-aa24-b460051af46b</uuid>

      <property xsi:type="doubleType" key="ns:MeanConcentration"
                formatString="0.000" units="mol/L" scaleFactor="1.0">
        <value>1.234</value>

        <!-- 定量評価：標準偏差による不確かさ -->
        <uncertainty xsi:type="doubleType" key="ns:StandardDeviation"
                     formatString="0.000" units="mol/L">
          <value>0.012</value>
        </uncertainty>
      </property>
    </result>
  </results>
</data>
```

> ✅ **Rev.3での修正ポイント**: `<data>` → `<results>` → `<result>` の入れ子構造を明示。
> `resultsRef`（id="results_Measurement_i01"）と `concept:instance`（UUID="c1d6c085-..."）がそれぞれ何を指すかを明確化。

#### 定性評価（合否・グレード）

```xml
<result id="result_VisualCheck_output" ref="resultTemplate_VisualCheck">
  <uuid>...</uuid>

  <property xsi:type="booleanType" key="ns:PassFail">
    <value>true</value>
  </property>

  <property xsi:type="stringType" key="ns:QualityGrade">
    <value>A</value>
  </property>
</result>
```

#### 評価者の追跡方法（ルール4）

`<result>` 要素自体には `ownerRef` を付与**しない**。この結果を参照する `<event>` 要素において、以下を記載することで「誰がどのeventで確定したか」を一意に追跡する。

```xml
<event id="event_Measurement_complete_i01" ref="instruction_Measurement">
  <uuid>aa272823-1ca4-4bcb-9110-4c020730b40c</uuid>

  <property xsi:type="stringType" key="lifecycle:transition">
    <value>complete</value>
  </property>

  <!-- ★ どのresultかを直接指し示す（K0200 7.7の主たる追跡方法） -->
  <property xsi:type="uuidType" key="concept:instance">
    <value>c1d6c085-e13c-4a67-aa24-b460051af46b</value>
    <!-- result_Measurement_output の uuid -->
  </property>

  <property xsi:type="dateType" key="time:timestamp">
    <value>2024-05-20T14:30:00+09:00</value>
  </property>

  <!-- ★ どのresultsコンテナに属するかを補助的に示す -->
  <resultsRef id="resultsRef_Measurement_complete_i01"
              ref="results_Measurement_i01"/>

  <!-- ★ 評価者を必須で明示（ルール1・ルール4） -->
  <ownerRef id="ownerRef_xxxOperator_complete_i01" ref="owner_xxxOperator"/>
</event>
```

> 📌 **ポイント**: `concept:instance` と `resultsRef` を**併記**することで：
> - `concept:instance` → **個々のresult**を特定
> - `resultsRef` → **resultsコンテナ**を特定  
> 両方の粒度で追跡可能になる。`resultsRef` のみでは、コンテナ内に複数のresultがある場合にどのresultを評価したか一意に決まらない場合がある。

---

### 3.4 eventLog層：event単位の評価（ルール1）

`<event>` 要素は `ref` 属性で対応する `<instruction>` を参照し、`<property>` で評価を記載する。

#### 正常終了（OK）の場合

```xml
<eventLog id="eventLog_Measurement"
  xmlns:concept="http://www.xes-standard.org/concept.xesext#"
  xmlns:lifecycle="http://www.xes-standard.org/lifecycle.xesext#"
  xmlns:time="http://www.xes-standard.org/time.xesext#"
  xmlns:ns="http://www.example.com/maiml/eval#">

  <uuid>ee539080-3e68-400b-b406-bcab56dc9e27</uuid>

  <log id="log_i01" ref="method_Measurement">
    <uuid>b735f967-a198-443a-abff-4dbf310eb627</uuid>

    <trace id="trace_i01" ref="program_Measurement">
      <uuid>d0553c31-a897-4dc3-bb8a-65599e4b3231</uuid>

      <event id="event_Measurement_complete_i01"
             ref="instruction_Measurement">
        <uuid>aa272823-1ca4-4bcb-9110-4c020730b40c</uuid>
        <name>ns:MeasurementEvent</name>
        <description>Measurement Event</description>

        <property xsi:type="stringType" key="lifecycle:transition">
          <value>complete</value>
        </property>
        <property xsi:type="uuidType" key="concept:instance">
          <value>c1d6c085-e13c-4a67-aa24-b460051af46b</value>
        </property>
        <property xsi:type="dateType" key="time:timestamp">
          <value>2024-05-20T14:30:00+09:00</value>
        </property>

        <!-- OK/NG評価 -->
        <property xsi:type="booleanType" key="ns:PassFail">
          <value>true</value>  <!-- true = OK -->
        </property>
        <property xsi:type="stringType" key="ns:JudgementResult">
          <value>OK</value>
        </property>

        <resultsRef id="resultsRef_Measurement_complete_i01"
                    ref="results_Measurement_i01"/>

        <!-- ★ 評価者を必須で明示（ルール1） -->
        <ownerRef id="ownerRef_xxxOperator_complete_i01"
                  ref="owner_xxxOperator"/>
      </event>
    </trace>
  </log>
</eventLog>
```

#### 異常終了（NG）の場合

ライフサイクル遷移を `ate_abort`（例外による中断）または `pi_abort`（システム終了）に変更し、ownerRefを必須で付与する。

```xml
<event id="event_Measurement_abort_i01"
       ref="instruction_Measurement">
  <uuid>bb383934-2b05-4dcd-a221-5d131841cd34</uuid>

  <property xsi:type="stringType" key="lifecycle:transition">
    <value>ate_abort</value>
    <!-- pi_abort：処理中のシステム終了の場合はこちら -->
  </property>
  <property xsi:type="uuidType" key="concept:instance">
    <value>c1d6c085-e13c-4a67-aa24-b460051af46b</value>
  </property>
  <property xsi:type="dateType" key="time:timestamp">
    <value>2024-05-20T14:15:00+09:00</value>
  </property>
  <property xsi:type="booleanType" key="ns:PassFail">
    <value>false</value>  <!-- false = NG -->
  </property>
  <property xsi:type="stringType" key="ns:JudgementResult">
    <value>NG</value>
  </property>
  <property xsi:type="stringType" key="ns:ErrorDescription">
    <value>測定中に温度が管理範囲を超過。データ無効。</value>
  </property>
  <property xsi:type="stringType" key="ns:RiskLevel">
    <value>High</value>
  </property>

  <!-- ★ 異常終了と判定した評価者を必須で明示（ルール1） -->
  <ownerRef id="ownerRef_xxxOperator_abort_i01"
            ref="owner_xxxOperator"/>
</event>
```

#### complete＋NG（正常終了したが判定はNG）の場合

プロセスは正常完了（`complete`）したが、評価値が規格外でNG判定となる場合。

```xml
<event id="event_Measurement_complete_ng_i01"
       ref="instruction_Measurement">
  <uuid>...</uuid>

  <property xsi:type="stringType" key="lifecycle:transition">
    <value>complete</value>
  </property>
  <property xsi:type="dateType" key="time:timestamp">
    <value>2024-05-20T14:45:00+09:00</value>
  </property>
  <property xsi:type="booleanType" key="ns:PassFail">
    <value>false</value>
  </property>
  <property xsi:type="stringType" key="ns:JudgementResult">
    <value>NG</value>
  </property>
  <property xsi:type="stringType" key="ns:OutOfSpecReason">
    <value>測定値が上限閾値を超過（測定値: 1.85 mol/L、上限: 1.50 mol/L）</value>
  </property>

  <resultsRef id="resultsRef_Measurement_complete_ng_i01"
              ref="results_Measurement_i01"/>

  <!-- ★ NG判定を行った評価者を必須で明示（ルール1） -->
  <ownerRef id="ownerRef_xxxOperator_complete_ng_i01"
            ref="owner_xxxOperator"/>
</event>
```

---

### 3.5 eventLog層：trace単位の評価（ルール2）

1回の一連の工程全体（1タスク）に対する評価は `<trace>` 要素自身に `<property>` を追加して記載し、同じ `<trace>` に `<ownerRef>` を必ず付与する。

```xml
<trace id="trace_xxxExperiment" ref="program_xxx">
  <uuid>...</uuid>
  <name>xxx:ExperimentTrace</name>
  <description>一連の実験のtrace</description>

  <!-- 一連の実験全体に対する評価 -->
  <property xsi:type="booleanType" key="ns:OverallPassFail">
    <value>true</value>
  </property>
  <property xsi:type="stringType" key="ns:OverallJudgement">
    <value>OK</value>
  </property>
  <property xsi:type="stringType" key="ns:OverallComment">
    <value>全工程を通じて異常なし。規格内の値を得た。</value>
  </property>
  <property xsi:type="dateType" key="time:timestamp">
    <value>2024-05-20T17:00:00+09:00</value>
  </property>

  <!-- ★ 工程全体の評価者を明示（ルール2）
       id添字は親traceの識別添字(xxxExperiment)と揃える -->
  <ownerRef id="ownerRef_xxxExperiment" ref="owner_xxxSupervisor"/>
</trace>
```

> ✅ **Rev.3での修正ポイント**: ownerRefのidを `"ownerRef_xxxSupervisor_trace"` → `"ownerRef_xxxExperiment"` に修正。  
> ガイドライン9.13.1注記1の規則「ownerRefのid添字は親要素の識別添字と揃える」に準拠。

> 📌 **注記**: 工程全体を評価した者と、個々のinstructionを評価した者が異なる場合は、それぞれ別の `<owner>` を参照する `ownerRef` となる（K0200 6.5.7）。

---

### 3.6 eventLog層：log単位の評価（ルール3）

複数の `<trace>`（複数バッチの実験）をまとめて評価する場合、評価用 `<property>` を `<log>` 要素に記載し、`<ownerRef>` を `<log>` の子要素として直接付与する。

```xml
<log id="log_xxxBatch" ref="method_xxx">
  <uuid>...</uuid>

  <!-- 複数バッチを含む全体の評価 -->
  <property xsi:type="stringType" key="ns:BatchOverallJudgement">
    <value>OK</value>
  </property>
  <property xsi:type="stringType" key="ns:BatchSummary">
    <value>5バッチ中5バッチが規格内。再測定不要。</value>
  </property>
  <property xsi:type="dateType" key="time:timestamp">
    <value>2024-05-23T10:00:00+09:00</value>
  </property>

  <!-- ★ 複数バッチ全体を評価した者を直接明示（ルール3）
       id添字は親logの識別添字(xxxBatch)と揃える -->
  <ownerRef id="ownerRef_xxxBatch" ref="owner_xxxSupervisor"/>

  <trace id="trace_xxx_i01" ref="program_xxx"> <!-- 1回目の実験 --> </trace>
  <trace id="trace_xxx_i02" ref="program_xxx"> <!-- 2回目の実験 --> </trace>
</log>
```

> ✅ **Rev.3での修正ポイント**: Rev.2では `<log>` への直接付与を避けるため「集約評価専用のtrace（架空のprotocol/program）を新設」する回避策を採用していたが、JIS K 0200:2024 6.5.7の本文により `<log>` への直接付与が正式に許可されていることを確認。架空のtrace/programを新設する回避策は**撤回・不要**。

---

### 3.7 多重評価の記載

実験者がリアルタイムで記載した評価と、実験管理者が後日追記した評価が両方存在する場合は、独自キーの `<property>` と対応する `<ownerRef>` を並べて記載する。

```xml
<event id="event_xxxMeasurement_complete_i01"
       ref="instruction_xxxMeasurement">
  <uuid>...</uuid>

  <property xsi:type="stringType" key="lifecycle:transition">
    <value>complete</value>
  </property>
  <property xsi:type="dateType" key="time:timestamp">
    <value>2024-05-20T14:30:00+09:00</value>
  </property>

  <!-- ① 実験者自身がその場で記載した評価 -->
  <property xsi:type="booleanType" key="ns:OperatorPassFail">
    <value>true</value>
  </property>
  <property xsi:type="dateType" key="ns:OperatorEvaluationTimestamp">
    <value>2024-05-20T14:30:00+09:00</value>
  </property>

  <!-- ② 管理者が後日付けた評価 -->
  <property xsi:type="booleanType" key="ns:SupervisorPassFail">
    <value>false</value>
  </property>
  <property xsi:type="stringType" key="ns:SupervisorComment">
    <value>再現性に疑義あり。再測定を推奨。</value>
  </property>
  <property xsi:type="dateType" key="ns:SupervisorEvaluationTimestamp">
    <value>2024-05-22T09:15:00+09:00</value>
  </property>

  <!-- ★ 評価の記載者をそれぞれownerRefで参照 -->
  <ownerRef id="ownerRef_xxxOperator_i01" ref="owner_xxxOperator"/>
  <ownerRef id="ownerRef_xxxSupervisor_i01" ref="owner_xxxSupervisor"/>

  <resultsRef id="resultsRef_xxxMeasurement_complete_i01"
              ref="results_xxxMeasurement_i01"/>
</event>
```

> 📌 **ポイント**: 評価者ごとに独自のpropertyキー（例：`ns:OperatorPassFail` / `ns:SupervisorPassFail`）を分けることで、誰がどの評価を行ったかを明確に区別する。

---

### 3.8 評価記載箇所と評価者明示方法の対応表

| 評価記載箇所 | 評価者の明示方法 | 根拠 | ownerRefの付与先 |
|---|---|---|---|
| data層 `<result>/<property>`（定量・定性評価） | `concept:instance` / `resultsRef` と `ownerRef` を持つ `<event>` 経由で追跡（ルール4） | K0200 7.7 | `<event>`（**間接**） |
| eventLog層 `<trace>`（工程全体評価） | `<trace>` の子要素として `<ownerRef>` を必須付与（ルール2） | K0200 6.5.7 | `<trace>`（**直接**） |
| eventLog層 `<log>`（複数trace集約評価） | `<log>` の子要素として `<ownerRef>` を必須付与（ルール3） | K0200 6.5.7 | `<log>`（**直接**） |
| eventLog層 `<event>`（instruction単位のOK/NG評価） | `<event>` の子要素として `<ownerRef>` を必須付与（ルール1） | K0200 6.5.7 | `<event>`（**直接**） |
| eventLog層 `<event>`（実験者/管理者の多重評価） | 評価者ごとに独自propertyキー＋`<ownerRef>` で書き分け | ガイドライン9.13 | `<event>`（**直接**） |

> 📌 **Rev.3の設計原則**: data層以外の全ての評価記載箇所（event / trace / log）において、ownerRefをそれぞれの要素に「直接」付与する統一的な設計。data層のみ、評価値自体ではなくそれを参照するeventを介した「間接」的な追跡方式（ルール4）。

---

### 3.9 移行チェックリスト

既存の実装・データを本仕様に基づいて見直す際の確認項目。

- [ ] 評価用propertyを含むすべての `<event>` 要素に `<ownerRef>` が付与されているか（**ルール1**）
- [ ] `<trace>` 要素に工程全体評価のpropertyを記載している場合、同じ `<trace>` に `ownerRef` が付与されているか（**ルール2**）
- [ ] `<log>` 要素に複数バッチ集約評価のpropertyを記載している場合、同じ `<log>` に `ownerRef` が**直接**付与されているか（**ルール3**。架空のtrace/eventを新設する必要はない）
- [ ] `<result>` を参照するeventに、`concept:instance`（対象resultのUUID）・`resultsRef`（対象resultsコンテナ）・`ownerRef`（評価者）が揃っているか（**ルール4**）
- [ ] `<owner>` 要素が `<document>` 直下で重複なく一元管理され、すべての参照が `ownerRef` で行われているか（**ルール5**）
- [ ] `<ownerRef>` · `<resultsRef>` の記載形式（自己完結タグ）とid命名規則（親要素の識別添字と一致）が統一されているか（**ルール6**）
- [ ] 複数の評価者が存在する場合、評価者ごとに独自propertyキーと `ownerRef` のペアが明確に分離されているか

---

## 4. 実験指示の記述方法

### 4.1 event記載 vs condition記載の得失比較

実験管理者から作業者への指示（注意事項、パラメータ変更指示等）を記載する場所として、`<event>` と `<condition>` の2つの選択肢がある。

| 観点 | `<event>` 内に記載 | `<condition>` 内に記載 |
|------|--------------------|------------------------|
| **意味的な位置づけ** | 「いつ・誰が・何を指示・記録したか」という**行為のログ**。ペトリネットのtransition（操作）に対応 | 「実験条件・パラメータ」として記載。ペトリネットのplace（ノード）に対応 |
| **owner（誰が）の表現** | `<ownerRef>` で記載者を直接紐付け可能。複数のowner（実験者・管理者）を時系列の別eventで明確に区別できる | `<condition>` 自体にはownerを直接結びつける標準要素がない。独自propertyで記載するしかない |
| **時刻（いつ）の表現** | `time:timestamp` が必須級の標準キーとして用意されており、行為発生時刻を厳密に記録できる | `<condition>` には標準の時刻キーがない。独自に `ns:SupervisorDirectiveTimestamp` 等を追加する必要がある |
| **ライフサイクル状態の表現** | `lifecycle:transition`（schedule/assign/start/complete等）で「指示はどの段階のものか」を明示できる | ライフサイクルの概念がそもそも存在しない。conditionはあくまで静的な値の集合 |
| **再利用性（テンプレート機構）** | eventはprotocol層のinstructionに1対1で対応するログであり、テンプレート上書き機構の対象外 | conditionTemplateの値を継承し、変更がない場合は省略できる（6.4.5の上書き規定）。「いつもの指示」を毎回書かずに済む |
| **機械判読時の分離のしやすさ** | 「指示ログ」「評価ログ」をeventのプロパティ・lifecycle種別で機械的に分離しやすい | conditionの中に指示・実条件・評価が混在すると、用途別の抽出が複雑になる |
| **検索・トレーサビリティ** | `event[ref=instruction][lifecycle:transition=assign]` というXPathで一意に絞り込める | conditionはresults内に埋もれるため、「指示だけ」を取り出すには独自keyでの検索が必要 |
| **仕様上の正当性** | 6.5節で「ログ」として正式に位置づけられた要素であり、追跡可能性の趣旨に合致 | 6.4.5では「操作のためのパラメータ」と定義されており、指示事項を条件として書くのは仕様の定義からは外れた拡張的な使い方 |

> ✅ **結論**: 実験指示の記述には原則として `<event>` を使用する。`<condition>` への記載は許容誤差等の「値」を格納する場合に限定し、指示の「文脈・理由・担当者・時刻」は常に `<event>` で記載する。

---

### 4.2 ライフサイクルの種類と使い分け

| lifecycle:transition | 使用場面 |
|----------------------|----------|
| `schedule` | 実験の予定だけが通知された段階（具体的な実施指示はまだ確定していない） |
| `assign` | 実験者に対して具体的な作業指示・注意事項が**割り当てられた**段階 |
| `start` | 実験者が実際に作業を**開始した**段階 |
| `complete` | 実験者が作業を**完了**し、その場での評価を記録する段階 |
| `ate_abort` | 例外による**中断**（異常終了） |
| `pi_abort` | 処理中のシステム終了による**中断** |

#### 全体の時系列イメージ

```
schedule（予定通知）  →  assign（指示事項の割当て）  →  start（実験開始）
  ↓ owner: Supervisor    ↓ owner: Supervisor           ↓ owner: Operator

→  complete（実験完了・実験者評価）  →  review（管理者の後日評価、独自拡張）
     ↓ owner: Operator                  ↓ owner: Supervisor
```

---

### 4.3 指示の分類マトリクス（範囲×対象）

指示の記載場所は「**指示の範囲**（全体共通 vs 特定task）」と「**指示の対象**（手順全体 / 特定transition / 特定material・condition）」の2軸で決定する。

|  | 対象＝手順全体／実験全体 | 対象＝特定transition | 対象＝特定material/condition |
|--|--------------------------|----------------------|------------------------------|
| **範囲＝全体共通** | ①`<log>` 直下 property（instruction不要） | ⑤`<log>` 直下 property＋UUID参照で対象特定 | ⑥`<log>` 直下 property＋conditionTemplate |
| **範囲＝特定task** | ②`<trace>` 直下 property（instruction不要） | ③`<event>`（instructionをref） | ④`<condition>/<material>` + `<event>`（resultsRef経由） |

#### 各ケースのinstruction参照の要否

| ケース | 記載場所 | instruction参照の要否 |
|--------|----------|-----------------------|
| ① 全体共通・実験全体 | `<log>` 直下に `<property>` | **不要** |
| ② 特定task・手順全体 | `<trace>` 直下に `<property>` | **不要** |
| ③ 特定task・特定transition | 該当instructionをrefする `<event>`（assign） | **必要**（自然な対応） |
| ④ 特定task・特定material/condition | `<condition>/<material>` + 対応する `<event>` | **必要**（resultsRef経由） |
| ⑤ 全体共通・特定transition | 関係する各traceの `<event>` に同一内容を複製 | **必要**（各taskごとに対応） |
| ⑥ 全体共通・特定material/condition | `<*Template>` のデフォルト値 + `<log>` 直下の `<property>` | **不要**（Template機構で十分） |

> 📌 **判別ルール（最重要）**: 指示が1つの特定taskの特定instruction実行に**直接紐づく**場合（③④）のみ `<event>` を使い、それ以外（①②⑤⑥）は `<log>/<trace>` への直接property記載に統一する。  
> これにより、実際には存在しない「指示のための仮想transition」をprotocol層に追加する必要が**一切なくなる**。

---

### 4.4 ケース別記述方法

#### ケース①：実験全体への指示 → `<log>` に直接記載

```xml
<eventLog xmlns:ns="http://www.example.co.jp/maiml/ns#" ...>
  <log id="log_xxxMethod" ref="method_xxx">
    <uuid>...</uuid>
    <name>xxx:MethodLog</name>

    <!-- ★ 実験開始前の管理者メッセージをlog自体のpropertyとして記載 -->
    <!-- eventを介さないため、instructionへの参照は不要 -->
    <property xsi:type="dateType" key="ns:SupervisorDirectiveTimestamp">
      <value>2024-05-19T09:00:00+09:00</value>
    </property>
    <property xsi:type="stringType" key="ns:SupervisorDirectiveScope">
      <value>AllTasks</value>
    </property>
    <property xsi:type="stringType" key="ns:SupervisorDirectiveContent">
      <value>本日は室内湿度が高いため、全工程において静電気対策（接地リストバンド着用）を徹底すること。</value>
    </property>
    <ownerRef id="ownerRef_xxxMethod" ref="owner_xxxSupervisor"/>

    <trace id="trace_xxxPreparation" ref="program_xxxPreparation"> ... </trace>
    <trace id="trace_xxxMeasurement" ref="program_xxxMeasurement"> ... </trace>
  </log>
</eventLog>
```

---

#### ケース②：特定タスク（手順全体）への指示 → `<trace>` に直接記載

```xml
<trace id="trace_xxxMeasurement" ref="program_xxxMeasurement">
  <uuid>...</uuid>
  <name>xxx:MeasurementTrace</name>

  <!-- ★ Measurementタスク開始前の管理者メッセージをtrace自体に記載 -->
  <property xsi:type="dateType" key="ns:SupervisorDirectiveTimestamp">
    <value>2024-05-19T17:00:00+09:00</value>
  </property>
  <property xsi:type="stringType" key="ns:SupervisorDirectiveContent">
    <value>計測工程全体を通じて、前処理から計測完了まで2時間以内に終えること。</value>
  </property>
  <ownerRef id="ownerRef_xxxMeasurement" ref="owner_xxxSupervisor"/>

  <!-- 以降、通常のevent（個々のinstructionに対応するもの）が続く -->
  <event id="event_xxxMeasurement_start_i01" ref="instruction_xxxMeasurement"> ... </event>
  <event id="event_xxxMeasurement_complete_i01" ref="instruction_xxxMeasurement"> ... </event>
</trace>
```

---

#### ケース③：特定タスク・特定transitionへの注意事項 → `assign` eventとして記載

特定のinstruction（特定transitionに対応）に対するassignイベントとして記載する。

```xml
<event id="event_xxxMeasurement_assign_i01"
       ref="instruction_xxxMeasurement">
  <uuid>...</uuid>
  <property xsi:type="stringType" key="lifecycle:transition">
    <value>assign</value>
  </property>
  <property xsi:type="dateType" key="time:timestamp">
    <value>2024-05-19T17:00:00+09:00</value>
  </property>
  <property xsi:type="stringType" key="ns:InstructionReason">
    <value>前回測定でベースラインドリフトを観測したため。</value>
  </property>
  <property xsi:type="stringType" key="ns:SupervisorDirectiveContent">
    <value>測定開始前に必ず光源の点灯確認を行うこと。</value>
  </property>
  <ownerRef id="ownerRef_xxxMeasurement_assign_i01" ref="owner_xxxSupervisor"/>
</event>
```

---

#### ケース④：特定タスク・特定material/conditionへの量的指示（許容誤差含む）

`<condition>` に許容値そのものを書き、`<event>` に指示の文脈を書く**2層構造**。  
許容誤差は `<uncertainty>` のkey属性（`StandardUncertainty` 等の標準語彙）を使用する。

```xml
<!-- data層：条件値＋許容誤差（パラメータ層） -->
<condition id="condition_xxxMeasurementSettings_i01"
           ref="conditionTemplate_xxxMeasurementSettings">
  <uuid>...</uuid>
  <property xsi:type="doubleType" key="ns:StabilizationTime" units="min">
    <value>30.0</value>
    <!-- ★ 許容誤差の上限を標準語彙で記載 -->
    <uncertainty xsi:type="doubleType" key="ns:StandardUncertainty" units="min">
      <value>2.0</value>
    </uncertainty>
  </property>
</condition>

<!-- eventLog層：指示の文脈（行為層） -->
<event id="event_xxxMeasurement_assign_i01"
       ref="instruction_xxxMeasurement">
  <uuid>...</uuid>
  <property xsi:type="stringType" key="lifecycle:transition">
    <value>assign</value>
  </property>
  <property xsi:type="dateType" key="time:timestamp">
    <value>2024-05-19T17:00:00+09:00</value>
  </property>
  <property xsi:type="stringType" key="ns:InstructionedParameter">
    <value>ns:StabilizationTime</value>
  </property>
  <property xsi:type="stringType" key="ns:InstructionReason">
    <value>前回ドリフト観測のため、安定化時間を厳格化。</value>
  </property>
  <ownerRef id="ownerRef_xxxMeasurement_assign_i01" ref="owner_xxxSupervisor"/>
  <resultsRef id="resultsRef_xxxMeasurement_assign_i01" ref="results_xxxMeasurement_i01"/>
</event>
```

---

#### ケース⑤：複数タスク共通・特定transitionへの注意事項

特定transitionが複数taskに共通して存在する場合（例：複数の分析手順すべてで使う「秤量」transition）。

```xml
<log id="log_xxxMethod" ref="method_xxx">
  <uuid>...</uuid>
  <name>xxx:MethodLog</name>

  <!-- ★ 複数task共通・特定transitionへの注意事項 -->
  <property xsi:type="dateType" key="ns:SupervisorDirectiveTimestamp">
    <value>2024-05-19T09:00:00+09:00</value>
  </property>
  <property xsi:type="stringType" key="ns:SupervisorDirectiveScope">
    <value>SpecificTransition</value>
  </property>
  <!-- 既存のinstruction id（すでにprotocol層に実在するもの）を列挙 -->
  <property xsi:type="stringType" key="ns:TargetInstructions">
    <value>instruction_xxxWeighing_inPreparation</value>
    <value>instruction_xxxWeighing_inAnalysis</value>
  </property>
  <property xsi:type="stringType" key="ns:SupervisorDirectiveContent">
    <value>秤量作業は全て、天秤のゼロ点校正後3分以内に行うこと。</value>
  </property>
  <ownerRef id="ownerRef_xxxMethod" ref="owner_xxxSupervisor"/>

  <trace id="trace_xxxPreparation" ref="program_xxxPreparation"> ... </trace>
  <trace id="trace_xxxAnalysis" ref="program_xxxAnalysis"> ... </trace>
</log>
```

---

#### ケース⑥：複数タスク共通・特定material/conditionへの量的指示・誤差条件

3ステップで構成される。

**Step 1：protocol層 — conditionTemplateにUUIDを明示**

```xml
<protocol xmlns:ns="http://www.example.co.jp/maiml/ns#">
  <conditionTemplate id="conditionTemplate_xxxCommonTolerance">
    <uuid>f47ac10b-58cc-4372-a567-0e02b2c3d479</uuid>  <!-- このUUIDを参照する -->
    <name>xxx:CommonToleranceTemplate</name>
    <placeRef id="placeRef_xxxToleranceSettings_input1" ref="place_xxxToleranceSettings_input1"/>

    <property xsi:type="doubleType" key="ns:AllowedErrorUpperLimit" units="%">
      <value>3.0</value>
    </property>
  </conditionTemplate>
</protocol>
```

> ⚠️ **注記**: `units="%"` は無次元の比率を表す慣用記号であり、JIS Z 8000群が定める正式な単位記号体系には含まれていない。厳密な単位管理を行う場合は、社内規程として "%"の使用可否を明文化するか、無次元量であることを `<description>` 要素等に明記することを推奨。

**Step 2：eventLog層 — 指示の記載**

```xml
<log id="log_xxxMethod" ref="method_xxx">
  <uuid>...</uuid>

  <property xsi:type="dateType" key="ns:SupervisorDirectiveTimestamp">
    <value>2024-05-19T09:00:00+09:00</value>
  </property>
  <property xsi:type="stringType" key="ns:SupervisorDirectiveScope">
    <value>AllTasks_CommonTolerance</value>
  </property>

  <!-- ★ 対象テンプレートをUUID型のpropertyで一意に指定（idやkey名の文字列一致に依存しない） -->
  <property xsi:type="uuidType" key="ns:TargetTemplate">
    <value>f47ac10b-58cc-4372-a567-0e02b2c3d479</value>
  </property>
  <property xsi:type="stringType" key="ns:InstructionedParameter">
    <value>ns:AllowedErrorUpperLimit</value>
  </property>
  <property xsi:type="stringType" key="ns:SupervisorDirectiveContent">
    <value>本ロットでは全工程共通で誤差許容上限を5%に設定する（通常は3%）。</value>
  </property>
  <ownerRef id="ownerRef_xxxMethod" ref="owner_xxxSupervisor"/>
</log>
```

**Step 3：data層 — 実際の値（各taskが指示を反映して上書き）**

```xml
<data id="data_xxx">
  <results id="results_xxxPreparation_i01">
    <condition id="condition_xxxPrep_i01" ref="conditionTemplate_xxxCommonTolerance">
      <uuid>...</uuid>
      <!-- ★ 指示に従い、デフォルト3.0%を5.0%に上書き -->
      <property xsi:type="doubleType" key="ns:AllowedErrorUpperLimit" units="%">
        <value>5.0</value>
      </property>
    </condition>
  </results>

  <results id="results_xxxMeasurement_i01">
    <condition id="condition_xxxMeas_i01" ref="conditionTemplate_xxxCommonTolerance">
      <uuid>...</uuid>
      <!-- 同様に5.0%へ上書き -->
      <property xsi:type="doubleType" key="ns:AllowedErrorUpperLimit" units="%">
        <value>5.0</value>
      </property>
    </condition>
  </results>
</data>
```

---

### 4.5 全体構造まとめ

#### 指示記述の判断フロー

```
指示の記述が必要
  ↓
指示の「範囲」は？
  ├── 全体共通（全taskに適用）
  │     ↓
  │   指示の「対象」は？
  │     ├── 手順全体       → ①<log>直下 property（ownerRef必須）
  │     ├── 特定transition → ⑤<log>直下 property + ns:TargetInstructions で対象instruction列挙
  │     └── 特定condition  → ⑥conditionTemplate のデフォルト値 + <log>直下 property でUUID参照
  │
  └── 特定task のみ
        ↓
      指示の「対象」は？
        ├── 手順全体       → ②<trace>直下 property（ownerRef必須）
        ├── 特定transition → ③<event>（ref=instruction, lifecycle:transition=assign）
        └── 特定condition  → ④<condition>に値+uncertainty、<event>に指示の文脈（resultsRef）
```

#### ケース別使用要素まとめ表

| ケース | 記載場所 | 必要なownerRef | instructionへの参照 |
|--------|----------|----------------|---------------------|
| ① 全体共通・実験全体 | `<log>` 直下 property | `<log>` に付与 | 不要 |
| ② 特定task・手順全体 | `<trace>` 直下 property | `<trace>` に付与 | 不要 |
| ③ 特定task・特定transition | `<event>` (assign) | `<event>` に付与 | 必要（refで指定） |
| ④ 特定task・特定condition | `<condition>` + `<event>` | `<event>` に付与 | 必要（resultsRef経由） |
| ⑤ 全体共通・特定transition | `<log>` 直下 property + ns:TargetInstructions | `<log>` に付与 | 不要（ただしidを列挙推奨） |
| ⑥ 全体共通・特定condition | conditionTemplate + `<log>` 直下 property | `<log>` に付与 | 不要 |

---

## 付録：よく使う独自propertyキー一覧

以下は本仕様書のサンプルで使用されている独自名前空間キーの一覧。実際の実装では組織の名前空間URIで定義すること。

| キー | 型 | 使用場面 |
|------|----|---------|
| `ns:PassFail` | booleanType | OK/NG評価（true=OK, false=NG） |
| `ns:JudgementResult` | stringType | 判定結果文字列（"OK" / "NG"） |
| `ns:OverallPassFail` | booleanType | 工程全体のOK/NG（trace単位） |
| `ns:OverallJudgement` | stringType | 工程全体の判定文字列（trace単位） |
| `ns:OverallComment` | stringType | 工程全体のコメント（trace単位） |
| `ns:BatchOverallJudgement` | stringType | 複数バッチ全体の判定（log単位） |
| `ns:BatchSummary` | stringType | 複数バッチのサマリー（log単位） |
| `ns:ErrorDescription` | stringType | 異常終了の説明 |
| `ns:RiskLevel` | stringType | リスクレベル（"High"/"Medium"/"Low"） |
| `ns:OutOfSpecReason` | stringType | 規格外の理由 |
| `ns:OperatorPassFail` | booleanType | 実験者自身の評価（多重評価用） |
| `ns:SupervisorPassFail` | booleanType | 管理者の評価（多重評価用） |
| `ns:SupervisorComment` | stringType | 管理者のコメント |
| `ns:OperatorEvaluationTimestamp` | dateType | 実験者の評価時刻 |
| `ns:SupervisorEvaluationTimestamp` | dateType | 管理者の評価時刻 |
| `ns:SupervisorDirectiveTimestamp` | dateType | 管理者からの指示時刻 |
| `ns:SupervisorDirectiveScope` | stringType | 指示の適用範囲（"AllTasks"等） |
| `ns:SupervisorDirectiveContent` | stringType | 指示の内容 |
| `ns:InstructionReason` | stringType | 指示の理由 |
| `ns:InstructionedParameter` | stringType | 指示対象のパラメータキー名 |
| `ns:TargetInstructions` | stringType | 対象instructionのid一覧（複数列挙） |
| `ns:TargetTemplate` | uuidType | 対象conditionTemplateのUUID |
| `ns:AllowedErrorUpperLimit` | doubleType | 誤差許容上限値 |
| `ns:StabilizationTime` | doubleType | 安定化時間 |

---

## 付録B：Excel参照資料

本ドキュメントの内容を表形式で整理したExcelファイルを同フォルダに同梱しています。

**ファイル名**: `MaiML_評価記入・実験指示記述方法.xlsx`

| シート名 | 内容 |
|---------|------|
| `1_用語定義` | MaiML主要要素（owner/ownerRef/resultsRef/concept:instance等）の定義一覧 |
| `2_評価統一ルール` | 統一ルール1〜6の詳細・根拠条文・Rev.3修正内容 |
| `3_評価記載対応表` | 評価記載箇所とownerRef付与先の対応表（§3.8相当） |
| `4_移行チェックリスト` | 既存データ・実装の移行確認チェックリスト（§3.9相当） |
| `5_event_vs_condition比較` | event記載 vs condition記載の得失比較表（§4.1相当） |
| `6_ライフサイクル` | lifecycle:transitionの種類・使い分け・時系列フロー（§4.2相当） |
| `7_指示分類マトリクス` | 範囲×対象の2軸分類マトリクスとケース別一覧（§4.3相当） |
| `8_ケース別記述方法` | ケース①〜⑥の記載場所・ownerRef・instruction参照要否まとめ（§4.4相当） |
| `9_propertyキー一覧` | 独自propertyキー（ns:*）の型・使用場面一覧（付録A相当） |

> **生成スクリプト**: `generate_excel.js`（同フォルダ）  
> **再生成方法**: `node generate_excel.js` を実行する

---

> **作成日**: 2026-07-16  
> **対象文書**: 20260701 評価記入方法_Rev3.docx / 20260630_実験指示のMaiML記述方法_修正版.docx  
> **準拠規格**: JIS K 0200:2024
