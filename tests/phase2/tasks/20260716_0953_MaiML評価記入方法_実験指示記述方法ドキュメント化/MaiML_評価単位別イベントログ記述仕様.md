# MaiML 評価単位別 イベントログ記述仕様

> **準拠規格**: JIS K 0200:2024  
> **関連ドキュメント**: `MaiML_評価記入・実験指示記述方法.md`（統一ルール詳細）  
> **作成日**: 2026-07-17

---

## 目次

1. [評価単位の定義と階層対応](#1-評価単位の定義と階層対応)
2. [プロジェクト単位の評価](#2-プロジェクト単位の評価)
3. [メソッド（log）単位の評価](#3-メソッドlog単位の評価)
4. [タスク（trace）単位の評価](#4-タスクtrace単位の評価)
5. [トランジション（メソッド共通）の評価](#5-トランジションメソッド共通の評価)
6. [トランジション（タスクごと）の評価](#6-トランジションタスクごとの評価)
7. [評価単位別 一覧比較表](#7-評価単位別-一覧比較表)
8. [全単位を網羅したフルXMLサンプル](#8-全単位を網羅したフルxmlサンプル)

---

## 1. 評価単位の定義と階層対応

### 1.1 MaiML階層構造と評価単位の対応

```
document
├── <owner id="owner_xxxSupervisor">  ← 評価者マスタ（一元管理）
├── <owner id="owner_xxxOperator">
│
├── protocol層
│   ├── <method id="method_xxx">          ← メソッド定義
│   │   └── <program id="program_xxx">    ← タスク（手順）定義
│   │       └── <instruction id="instruction_xxx"> ← トランジション定義
│
└── eventLog層
    └── <eventLog>                         ← プロジェクト単位（MaiML上は複数logの集合）
        ├── <log ref="method_xxx">         ← メソッド単位の評価
        │   ├── <trace ref="program_xxx">  ← タスク単位の評価
        │   │   ├── <event ref="instruction_xxx"> ← トランジション（タスクごと）の評価
        │   │   └── <event ref="instruction_yyy"> ← 同上
        │   └── <trace ref="program_xxx"> ← 2回目の同一タスク
        └── <log ref="method_yyy">         ← 別メソッド単位の評価
```

### 1.2 評価単位とMaiML要素の対応表

| 評価単位 | 対応するMaiML要素 | ownerRef付与先 | 適用ルール | 備考 |
|---------|-----------------|---------------|-----------|------|
| **プロジェクト** | `<eventLog>`（複数`<log>`の集合） | 各`<log>`に個別付与 | ルール3の集約 | MaiMLに直接対応する「プロジェクト」要素なし。各logの評価をシステム側で集約 |
| **メソッド** | `<log>` | `<log>`直下 | **ルール3** | `ref="method_xxx"` で対応methodを参照 |
| **タスク** | `<trace>` | `<trace>`直下 | **ルール2** | `ref="program_xxx"` で対応programを参照 |
| **トランジション（メソッド共通）** | `<log>`直下property + `ns:TargetInstructions` | `<log>`直下 | **ケース⑤** | 複数taskに共通するtransitionの評価。instructionのidを列挙して対象を特定 |
| **トランジション（タスクごと）** | `<event>` | `<event>`直下 | **ルール1** | `ref="instruction_xxx"` で対応instructionを参照 |

---

## 2. プロジェクト単位の評価

### 2.1 MaiML上の位置づけ

MaiMLの規格上、「プロジェクト」に直接対応する要素は存在しない。`<eventLog>` が最上位のログ構造であり、その内部に複数の `<log>`（メソッド単位）が含まれる。

**設計方針**: プロジェクト単位の評価は、以下のいずれかのアプローチで対応する。

| アプローチ | 内容 | 適用場面 |
|-----------|------|---------|
| **A. 専用logによる集約** | `<log ref="method_ProjectSummary">` という集約専用のlogを設け、プロジェクト全体の評価を記録する | プロジェクト完了時の総合評価 |
| **B. 各logの評価をシステム側で集約** | 各`<log>`に記録された評価をアプリケーション側でまとめてプロジェクト評価とする | リアルタイム集計・ダッシュボード |
| **C. `<eventLog>`要素直下への記録（独自拡張）** | `<eventLog>` 要素に直接評価propertyを付与する（規格上の定義は要確認） | 軽量な実装 |

> 📌 **推奨**: アプローチ **A（専用logによる集約）** が最も規格準拠の度合いが高く、ownerRefの付与・トレーサビリティの観点からも明確。

### 2.2 XMLサンプル（アプローチA：専用logによるプロジェクト集約評価）

```xml
<eventLog id="eventLog_Project_xxx"
  xmlns:concept="http://www.xes-standard.org/concept.xesext#"
  xmlns:lifecycle="http://www.xes-standard.org/lifecycle.xesext#"
  xmlns:time="http://www.xes-standard.org/time.xesext#"
  xmlns:ns="http://www.example.com/maiml/eval#">

  <uuid>xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx</uuid>

  <!-- ★ プロジェクト全体の集約評価専用log -->
  <!-- method_xxxProjectSummary はprotocol層に定義された集約評価用メソッド -->
  <log id="log_xxxProjectSummary" ref="method_xxxProjectSummary">
    <uuid>...</uuid>
    <name>ns:ProjectSummaryLog</name>
    <description>プロジェクト全体の集約評価ログ</description>

    <!-- プロジェクト全体評価 -->
    <property xsi:type="booleanType" key="ns:ProjectOverallPassFail">
      <value>true</value>
    </property>
    <property xsi:type="stringType" key="ns:ProjectOverallJudgement">
      <value>OK</value>
    </property>
    <property xsi:type="stringType" key="ns:ProjectSummaryComment">
      <value>全メソッドを通じて異常なし。プロジェクト目標値を達成。</value>
    </property>
    <property xsi:type="dateType" key="time:timestamp">
      <value>2024-05-30T17:00:00+09:00</value>
    </property>

    <!-- ★ プロジェクト全体を評価した者を明示（ルール3） -->
    <!-- id添字は親logの識別添字(xxxProjectSummary)と揃える -->
    <ownerRef id="ownerRef_xxxProjectSummary" ref="owner_xxxSupervisor"/>
  </log>

  <!-- 各メソッド単位のlog（詳細は第3章参照） -->
  <log id="log_xxxMethod_i01" ref="method_xxx"> ... </log>
  <log id="log_xxxMethod_i02" ref="method_xxx"> ... </log>

</eventLog>
```

---

## 3. メソッド（log）単位の評価

### 3.1 概要

メソッド（method）単位の評価は、対応する `<log>` 要素に評価用 `<property>` を記載し、`<ownerRef>` を `<log>` の子要素として直接付与する（**ルール3**）。

複数バッチ（複数回の同一メソッド実行）をまとめて評価する場合も同じ `<log>` に記録する。

### 3.2 XMLサンプル（メソッド単位評価・OK）

```xml
<log id="log_xxxMethod_i01" ref="method_xxx">
  <uuid>b735f967-a198-443a-abff-4dbf310eb627</uuid>
  <name>ns:MethodLog</name>
  <description>メソッドxxxの実行ログ（第1回）</description>

  <!-- ★ メソッド全体の評価（複数traceをまとめた評価） -->
  <property xsi:type="booleanType" key="ns:MethodOverallPassFail">
    <value>true</value>
  </property>
  <property xsi:type="stringType" key="ns:MethodOverallJudgement">
    <value>OK</value>
  </property>
  <property xsi:type="stringType" key="ns:MethodSummaryComment">
    <value>3タスク全て正常完了。測定値は全て規格範囲内。</value>
  </property>
  <property xsi:type="dateType" key="time:timestamp">
    <value>2024-05-20T18:00:00+09:00</value>
  </property>

  <!-- ★ メソッド全体を評価した者を直接明示（ルール3） -->
  <!-- id添字は親logの識別添字(xxxMethod_i01)と揃える -->
  <ownerRef id="ownerRef_xxxMethod_i01" ref="owner_xxxSupervisor"/>

  <!-- 各タスク（trace）が続く -->
  <trace id="trace_xxxPrep_i01" ref="program_xxxPrep"> ... </trace>
  <trace id="trace_xxxMeas_i01" ref="program_xxxMeas"> ... </trace>
  <trace id="trace_xxxAnalysis_i01" ref="program_xxxAnalysis"> ... </trace>
</log>
```

### 3.3 XMLサンプル（複数バッチ集約評価・NG含む）

```xml
<log id="log_xxxBatch" ref="method_xxx">
  <uuid>...</uuid>

  <!-- 複数バッチを含む全体の集約評価 -->
  <property xsi:type="stringType" key="ns:BatchOverallJudgement">
    <value>NG</value>
  </property>
  <property xsi:type="stringType" key="ns:BatchSummary">
    <value>5バッチ中3バッチが規格内。2バッチで測定値が上限超過のため再測定要。</value>
  </property>
  <property xsi:type="integerType" key="ns:BatchTotalCount">
    <value>5</value>
  </property>
  <property xsi:type="integerType" key="ns:BatchPassCount">
    <value>3</value>
  </property>
  <property xsi:type="integerType" key="ns:BatchFailCount">
    <value>2</value>
  </property>
  <property xsi:type="dateType" key="time:timestamp">
    <value>2024-05-23T10:00:00+09:00</value>
  </property>

  <!-- ★ 複数バッチ全体を評価した者を直接明示（ルール3） -->
  <ownerRef id="ownerRef_xxxBatch" ref="owner_xxxSupervisor"/>

  <trace id="trace_xxx_i01" ref="program_xxx"> ... </trace>
  <trace id="trace_xxx_i02" ref="program_xxx"> ... </trace>
  <trace id="trace_xxx_i03" ref="program_xxx"> ... </trace>
  <trace id="trace_xxx_i04" ref="program_xxx"> ... </trace>
  <trace id="trace_xxx_i05" ref="program_xxx"> ... </trace>
</log>
```

---

## 4. タスク（trace）単位の評価

### 4.1 概要

タスク（program）単位の評価は、対応する `<trace>` 要素に評価用 `<property>` を記載し、`<ownerRef>` を `<trace>` の子要素として直接付与する（**ルール2**）。

1回の一連の工程全体（1回のプログラム実行）に対する評価が対象。

### 4.2 XMLサンプル（タスク単位評価・OK）

```xml
<trace id="trace_xxxMeasurement_i01" ref="program_xxxMeasurement">
  <uuid>d0553c31-a897-4dc3-bb8a-65599e4b3231</uuid>
  <name>ns:MeasurementTrace</name>
  <description>計測タスクの実行記録（第1回）</description>

  <!-- ★ タスク（工程）全体に対する評価 -->
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

  <!-- ★ 工程全体の評価者を明示（ルール2） -->
  <!-- id添字は親traceの識別添字(xxxMeasurement_i01)と揃える -->
  <ownerRef id="ownerRef_xxxMeasurement_i01" ref="owner_xxxSupervisor"/>

  <!-- 個々のtransitionに対応するeventが続く -->
  <event id="event_xxxMeasurement_start_i01" ref="instruction_xxxMeasurement"> ... </event>
  <event id="event_xxxMeasurement_complete_i01" ref="instruction_xxxMeasurement"> ... </event>
</trace>
```

### 4.3 XMLサンプル（タスク単位評価・NG）

```xml
<trace id="trace_xxxMeasurement_i02" ref="program_xxxMeasurement">
  <uuid>...</uuid>

  <!-- タスク全体がNGの評価 -->
  <property xsi:type="booleanType" key="ns:OverallPassFail">
    <value>false</value>
  </property>
  <property xsi:type="stringType" key="ns:OverallJudgement">
    <value>NG</value>
  </property>
  <property xsi:type="stringType" key="ns:OverallComment">
    <value>第3工程で測定値が上限閾値を超過。本タスクの結果は無効とし、再実施を要する。</value>
  </property>
  <property xsi:type="stringType" key="ns:RetestRequired">
    <value>true</value>
  </property>
  <property xsi:type="dateType" key="time:timestamp">
    <value>2024-05-21T17:00:00+09:00</value>
  </property>

  <!-- ★ 工程全体の評価者を明示（ルール2） -->
  <ownerRef id="ownerRef_xxxMeasurement_i02" ref="owner_xxxSupervisor"/>

  <event id="event_xxxMeasurement_start_i02" ref="instruction_xxxMeasurement"> ... </event>
  <event id="event_xxxMeasurement_complete_i02" ref="instruction_xxxMeasurement"> ... </event>
</trace>
```

> 📌 **注記**: タスク全体を評価した者（管理者）と、個々のinstruction（トランジション）を評価した者（実験者）が異なる場合は、それぞれ別の `<owner>` を参照する `ownerRef` となる（K0200 6.5.7）。

---

## 5. トランジション（メソッド共通）の評価

### 5.1 概要

特定のトランジション（instruction）が複数のタスク（program）に共通して存在する場合の評価記述。例：複数の分析手順すべてで使う「秤量」transition、「光源点灯確認」transition など。

`<log>` 直下に評価用 `<property>` を記載し、`ns:TargetInstructions` で対象instructionのidを列挙する。`<ownerRef>` は `<log>` に付与する。

### 5.2 XMLサンプル（メソッド共通トランジション評価）

```xml
<log id="log_xxxMethod_i01" ref="method_xxx">
  <uuid>...</uuid>

  <!-- ★ 複数task共通の特定transitionへの評価 -->
  <!-- protocol層に実在するinstruction idを列挙 -->
  <property xsi:type="dateType" key="ns:EvaluationTimestamp">
    <value>2024-05-20T18:00:00+09:00</value>
  </property>
  <property xsi:type="stringType" key="ns:EvaluationScope">
    <value>CommonTransitionEvaluation</value>
  </property>
  <!-- 評価対象となる共通transitionのinstruction idを列挙 -->
  <property xsi:type="stringType" key="ns:TargetInstructions">
    <value>instruction_xxxWeighing_inPreparation</value>
  </property>
  <property xsi:type="stringType" key="ns:TargetInstructions">
    <value>instruction_xxxWeighing_inAnalysis</value>
  </property>
  <property xsi:type="booleanType" key="ns:CommonTransitionPassFail">
    <value>true</value>
  </property>
  <property xsi:type="stringType" key="ns:CommonTransitionJudgement">
    <value>OK</value>
  </property>
  <property xsi:type="stringType" key="ns:CommonTransitionComment">
    <value>全工程の秤量作業において、天秤のゼロ点校正後3分以内の作業を確認。規定遵守。</value>
  </property>

  <!-- ★ 評価者を明示 -->
  <ownerRef id="ownerRef_xxxMethod_i01" ref="owner_xxxSupervisor"/>

  <trace id="trace_xxxPrep_i01" ref="program_xxxPrep"> ... </trace>
  <trace id="trace_xxxAnalysis_i01" ref="program_xxxAnalysis"> ... </trace>
</log>
```

> ⚠️ **注意**: `ns:TargetInstructions` に複数の `<value>` を列挙する記述は、MaiML規格上の `xsi:type="stringType"` では1つのpropertyに1つのvalueが基本。複数対象を列挙する場合は、同じキーのpropertyを複数並べる（上記サンプル）か、カンマ区切りの文字列とする実装を選択し、運用ルールとして明文化すること。

---

## 6. トランジション（タスクごと）の評価

### 6.1 概要

特定タスク（trace）の特定トランジション（instruction）に対する評価。`<event>` 要素が `<instruction>` に対応するログであり、評価用 `<property>` と `<ownerRef>` を `<event>` に付与する（**ルール1**）。

`lifecycle:transition` の値によって評価の意味が変わる：

| lifecycle:transition | 意味 | 担当者 |
|---------------------|------|-------|
| `complete` | 正常完了 | Operator |
| `ate_abort` | 例外による中断（異常終了） | Operator |
| `pi_abort` | システム終了による中断 | Operator |
| `complete` + NG評価 | プロセスは完了したが判定はNG | Operator |
| 多重記録（Operator + Supervisor） | 実験者と管理者が別々に評価 | Operator & Supervisor |

### 6.2 パターン1：正常終了（OK）

```xml
<event id="event_xxxMeasurement_complete_i01"
       ref="instruction_xxxMeasurement">
  <uuid>aa272823-1ca4-4bcb-9110-4c020730b40c</uuid>
  <name>ns:MeasurementEvent</name>
  <description>計測トランジションの完了記録</description>

  <!-- ライフサイクル：正常完了 -->
  <property xsi:type="stringType" key="lifecycle:transition">
    <value>complete</value>
  </property>

  <!-- 対応するresult（data層）への参照 -->
  <property xsi:type="uuidType" key="concept:instance">
    <value>c1d6c085-e13c-4a67-aa24-b460051af46b</value>
    <!-- result_Measurement_output の UUID -->
  </property>
  <property xsi:type="dateType" key="time:timestamp">
    <value>2024-05-20T14:30:00+09:00</value>
  </property>

  <!-- OK/NG評価 -->
  <property xsi:type="booleanType" key="ns:PassFail">
    <value>true</value>   <!-- true = OK -->
  </property>
  <property xsi:type="stringType" key="ns:JudgementResult">
    <value>OK</value>
  </property>

  <!-- resultsコンテナへの参照 -->
  <resultsRef id="resultsRef_xxxMeasurement_complete_i01"
              ref="results_xxxMeasurement_i01"/>

  <!-- ★ 評価者を必須で明示（ルール1） -->
  <ownerRef id="ownerRef_xxxMeasurement_complete_i01"
            ref="owner_xxxOperator"/>
</event>
```

### 6.3 パターン2：異常終了（NG）

ライフサイクル遷移を `ate_abort`（例外による中断）または `pi_abort`（システム終了）に変更する。

```xml
<event id="event_xxxMeasurement_abort_i01"
       ref="instruction_xxxMeasurement">
  <uuid>bb383934-2b05-4dcd-a221-5d131841cd34</uuid>

  <!-- ライフサイクル：異常中断 -->
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

  <!-- NG評価 -->
  <property xsi:type="booleanType" key="ns:PassFail">
    <value>false</value>   <!-- false = NG -->
  </property>
  <property xsi:type="stringType" key="ns:JudgementResult">
    <value>NG</value>
  </property>
  <property xsi:type="stringType" key="ns:ErrorDescription">
    <value>測定中に温度が管理範囲を超過（上限: 25℃、実測: 28.3℃）。データ無効。</value>
  </property>
  <property xsi:type="stringType" key="ns:RiskLevel">
    <value>High</value>
  </property>

  <!-- ★ 異常終了と判定した評価者を必須で明示（ルール1） -->
  <ownerRef id="ownerRef_xxxMeasurement_abort_i01"
            ref="owner_xxxOperator"/>
</event>
```

### 6.4 パターン3：complete＋NG（正常完了したが判定はNG）

プロセスは正常完了（`complete`）したが、測定値が規格外でNG判定となる場合。

```xml
<event id="event_xxxMeasurement_complete_ng_i01"
       ref="instruction_xxxMeasurement">
  <uuid>cc494045-3c16-5ede-b332-6e242952de45</uuid>

  <!-- ライフサイクル：正常完了（プロセスは完了） -->
  <property xsi:type="stringType" key="lifecycle:transition">
    <value>complete</value>
  </property>
  <property xsi:type="uuidType" key="concept:instance">
    <value>c1d6c085-e13c-4a67-aa24-b460051af46b</value>
  </property>
  <property xsi:type="dateType" key="time:timestamp">
    <value>2024-05-20T14:45:00+09:00</value>
  </property>

  <!-- 判定はNG（値が規格外） -->
  <property xsi:type="booleanType" key="ns:PassFail">
    <value>false</value>
  </property>
  <property xsi:type="stringType" key="ns:JudgementResult">
    <value>NG</value>
  </property>
  <property xsi:type="stringType" key="ns:OutOfSpecReason">
    <value>測定値が上限閾値を超過（測定値: 1.85 mol/L、上限: 1.50 mol/L）</value>
  </property>

  <resultsRef id="resultsRef_xxxMeasurement_complete_ng_i01"
              ref="results_xxxMeasurement_i01"/>

  <!-- ★ NG判定を行った評価者を必須で明示（ルール1） -->
  <ownerRef id="ownerRef_xxxMeasurement_complete_ng_i01"
            ref="owner_xxxOperator"/>
</event>
```

### 6.5 パターン4：多重評価（実験者＋実験管理者）

実験者がリアルタイムで記載した評価と、管理者が後日追記した評価が両方存在する場合。

```xml
<event id="event_xxxMeasurement_complete_i01"
       ref="instruction_xxxMeasurement">
  <uuid>dd505156-4d27-6fef-c443-7f353063ef56</uuid>

  <property xsi:type="stringType" key="lifecycle:transition">
    <value>complete</value>
  </property>
  <property xsi:type="uuidType" key="concept:instance">
    <value>c1d6c085-e13c-4a67-aa24-b460051af46b</value>
  </property>
  <property xsi:type="dateType" key="time:timestamp">
    <value>2024-05-20T14:30:00+09:00</value>
  </property>

  <!-- ① 実験者（Operator）がその場で記載した評価 -->
  <property xsi:type="booleanType" key="ns:OperatorPassFail">
    <value>true</value>
  </property>
  <property xsi:type="stringType" key="ns:OperatorJudgement">
    <value>OK</value>
  </property>
  <property xsi:type="dateType" key="ns:OperatorEvaluationTimestamp">
    <value>2024-05-20T14:30:00+09:00</value>
  </property>

  <!-- ② 管理者（Supervisor）が後日追記した評価 -->
  <property xsi:type="booleanType" key="ns:SupervisorPassFail">
    <value>false</value>
  </property>
  <property xsi:type="stringType" key="ns:SupervisorJudgement">
    <value>NG</value>
  </property>
  <property xsi:type="stringType" key="ns:SupervisorComment">
    <value>再現性に疑義あり。同条件での再測定3回のうち2回が上限超過。再測定を推奨。</value>
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

---

## 7. 評価単位別 一覧比較表

| 評価単位 | MaiML要素 | 評価propertyの記載先 | ownerRef付与先 | 付与方法 | 根拠条文 | 備考 |
|---------|-----------|---------------------|---------------|---------|---------|------|
| **プロジェクト** | `<eventLog>`内の集約`<log>` | 集約`<log>`直下 | `<log>`（直接） | 集約専用logにまとめて記載 | K0200 6.5.2, 6.5.7 | MaiML規格上「プロジェクト」要素なし。専用log（アプローチA）を推奨 |
| **メソッド** | `<log>` | `<log>`直下 | `<log>`（直接） | `<log>`の子要素として付与 | K0200 6.5.2, 6.5.7（ルール3） | 複数バッチ集約もこの`<log>`に記録 |
| **タスク** | `<trace>` | `<trace>`直下 | `<trace>`（直接） | `<trace>`の子要素として付与 | K0200 6.5.3, 6.5.7（ルール2） | タスク評価者と個別instruction評価者が異なる場合は別ownerRefを使用 |
| **トランジション（メソッド共通）** | `<log>`直下property | `<log>`直下 | `<log>`（直接） | `ns:TargetInstructions`で対象instruction id列挙 | K0200 6.5.7（ケース⑤相当） | 複数instructionへの共通評価 |
| **トランジション（タスクごと）** | `<event>` | `<event>`直下 | `<event>`（直接） | `<event>`の子要素として付与 | K0200 6.5.4, 6.5.7（ルール1） | data層のresultへの参照はconcept:instance + resultsRefで行う |

### ownerRef付与パターンの整理

```
プロジェクト評価
  └── <log> ← ownerRef付与（ルール3）
        └── <trace> ← ownerRef付与（ルール2）
              └── <event> ← ownerRef付与（ルール1）
                    └── data層 <result> ← ownerRef付与しない（ルール4）
                          ↑ concept:instance + resultsRefで<event>から間接追跡
```

---

## 8. 全単位を網羅したフルXMLサンプル

以下は、プロジェクト → メソッド → タスク → トランジションの全評価単位を含む一気通貫のサンプル。

```xml
<?xml version="1.0" encoding="UTF-8"?>
<document xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xmlns:ns="http://www.example.com/maiml/eval#">

  <!-- ===================================================
       owner定義（記入者マスタ）
       ルール5：<document>直下で一元管理
  =================================================== -->
  <owner id="owner_xxxOperator">
    <uuid>11111111-1111-1111-1111-111111111111</uuid>
    <name>ns:MeasurementOperator</name>
    <description>計測を実施したオペレーター</description>
  </owner>

  <owner id="owner_xxxSupervisor">
    <uuid>22222222-2222-2222-2222-222222222222</uuid>
    <name>ns:ExperimentSupervisor</name>
    <description>実験全体を管理する実験管理者</description>
  </owner>

  <!-- ===================================================
       eventLog層（プロジェクト単位）
  =================================================== -->
  <eventLog id="eventLog_Project_xxx"
    xmlns:concept="http://www.xes-standard.org/concept.xesext#"
    xmlns:lifecycle="http://www.xes-standard.org/lifecycle.xesext#"
    xmlns:time="http://www.xes-standard.org/time.xesext#"
    xmlns:ns="http://www.example.com/maiml/eval#">

    <uuid>aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa</uuid>

    <!-- =============================================
         プロジェクト単位の評価
         → 集約専用logに記録（アプローチA）
    ============================================= -->
    <log id="log_xxxProjectSummary" ref="method_xxxProjectSummary">
      <uuid>bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb</uuid>

      <!-- プロジェクト全体の評価 -->
      <property xsi:type="booleanType" key="ns:ProjectOverallPassFail">
        <value>true</value>
      </property>
      <property xsi:type="stringType" key="ns:ProjectOverallJudgement">
        <value>OK</value>
      </property>
      <property xsi:type="stringType" key="ns:ProjectSummaryComment">
        <value>全メソッドを通じて異常なし。プロジェクト目標値を達成。</value>
      </property>
      <property xsi:type="dateType" key="time:timestamp">
        <value>2024-05-30T17:00:00+09:00</value>
      </property>

      <!-- ★ プロジェクト評価者（ルール3） -->
      <ownerRef id="ownerRef_xxxProjectSummary" ref="owner_xxxSupervisor"/>
    </log>

    <!-- =============================================
         メソッド単位の評価（ルール3）
         → <log>に直接ownerRefを付与
    ============================================= -->
    <log id="log_xxxMethod_i01" ref="method_xxx">
      <uuid>cccccccc-cccc-cccc-cccc-cccccccccccc</uuid>

      <!-- メソッド全体の評価 -->
      <property xsi:type="booleanType" key="ns:MethodOverallPassFail">
        <value>true</value>
      </property>
      <property xsi:type="stringType" key="ns:MethodOverallJudgement">
        <value>OK</value>
      </property>
      <property xsi:type="stringType" key="ns:MethodSummaryComment">
        <value>全タスク正常完了。測定値は全て規格範囲内。</value>
      </property>
      <!-- メソッド共通トランジションへの評価（ケース⑤） -->
      <property xsi:type="stringType" key="ns:EvaluationScope">
        <value>CommonTransitionEvaluation</value>
      </property>
      <property xsi:type="stringType" key="ns:TargetInstructions">
        <value>instruction_xxxWeighing_inPrep</value>
      </property>
      <property xsi:type="stringType" key="ns:TargetInstructions">
        <value>instruction_xxxWeighing_inMeas</value>
      </property>
      <property xsi:type="booleanType" key="ns:CommonTransitionPassFail">
        <value>true</value>
      </property>
      <property xsi:type="dateType" key="time:timestamp">
        <value>2024-05-20T18:00:00+09:00</value>
      </property>

      <!-- ★ メソッド評価者（ルール3） -->
      <ownerRef id="ownerRef_xxxMethod_i01" ref="owner_xxxSupervisor"/>

      <!-- ===========================================
           タスク単位の評価（ルール2）
           → <trace>に直接ownerRefを付与
      =========================================== -->
      <trace id="trace_xxxMeasurement_i01" ref="program_xxxMeasurement">
        <uuid>dddddddd-dddd-dddd-dddd-dddddddddddd</uuid>

        <!-- タスク（工程）全体の評価 -->
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

        <!-- ★ タスク評価者（ルール2） -->
        <ownerRef id="ownerRef_xxxMeasurement_i01" ref="owner_xxxSupervisor"/>

        <!-- =======================================
             トランジション（タスクごと）の評価
             → <event>にownerRefを付与（ルール1）
        ======================================= -->

        <!-- assign：作業指示（管理者→作業者） -->
        <event id="event_xxxMeasurement_assign_i01"
               ref="instruction_xxxMeasurement">
          <uuid>eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee</uuid>
          <property xsi:type="stringType" key="lifecycle:transition">
            <value>assign</value>
          </property>
          <property xsi:type="dateType" key="time:timestamp">
            <value>2024-05-20T09:00:00+09:00</value>
          </property>
          <property xsi:type="stringType" key="ns:SupervisorDirectiveContent">
            <value>測定開始前に必ず光源の点灯確認を行うこと。</value>
          </property>
          <!-- ★ 指示者（Supervisor） -->
          <ownerRef id="ownerRef_xxxMeasurement_assign_i01" ref="owner_xxxSupervisor"/>
        </event>

        <!-- start：作業開始 -->
        <event id="event_xxxMeasurement_start_i01"
               ref="instruction_xxxMeasurement">
          <uuid>ffffffff-ffff-ffff-ffff-ffffffffffff</uuid>
          <property xsi:type="stringType" key="lifecycle:transition">
            <value>start</value>
          </property>
          <property xsi:type="dateType" key="time:timestamp">
            <value>2024-05-20T14:00:00+09:00</value>
          </property>
          <!-- ★ 作業者（Operator） -->
          <ownerRef id="ownerRef_xxxMeasurement_start_i01" ref="owner_xxxOperator"/>
        </event>

        <!-- complete：正常完了＋OK評価（単一評価者） -->
        <event id="event_xxxMeasurement_complete_i01"
               ref="instruction_xxxMeasurement">
          <uuid>aa272823-1ca4-4bcb-9110-4c020730b40c</uuid>
          <property xsi:type="stringType" key="lifecycle:transition">
            <value>complete</value>
          </property>
          <property xsi:type="uuidType" key="concept:instance">
            <value>c1d6c085-e13c-4a67-aa24-b460051af46b</value>
          </property>
          <property xsi:type="dateType" key="time:timestamp">
            <value>2024-05-20T14:30:00+09:00</value>
          </property>
          <!-- OK評価 -->
          <property xsi:type="booleanType" key="ns:PassFail">
            <value>true</value>
          </property>
          <property xsi:type="stringType" key="ns:JudgementResult">
            <value>OK</value>
          </property>
          <resultsRef id="resultsRef_xxxMeasurement_complete_i01"
                      ref="results_xxxMeasurement_i01"/>
          <!-- ★ 評価者（Operator）（ルール1） -->
          <ownerRef id="ownerRef_xxxMeasurement_complete_i01" ref="owner_xxxOperator"/>
        </event>

      </trace>
    </log>

  </eventLog>

</document>
```

---

> **作成日**: 2026-07-17  
> **準拠規格**: JIS K 0200:2024  
> **関連ドキュメント**: `MaiML_評価記入・実験指示記述方法.md`
