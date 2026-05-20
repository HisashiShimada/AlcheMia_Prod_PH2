# タスク計画書: チェックアウト時のMAIML書き出し（実験指示イベントログ追加）

## メタデータ
- **作成日時**: 2026-05-20 14:30
- **タスクID**: checkout-maiml-write
- **優先度**: 中
- **推定工数**: 2時間

## タスク概要

実験管理者画面のプロジェクト管理タブで、チェックアウトした際に  
MAIMLファイルの `<eventLog>` セクションに実験指示データを書き出す処理を追加する。

あわせて、既存の指示送信ログ（`maiml_event_log`）に書き出す項目を拡張し、  
`instructions`（指示内容テキスト）・`priority`（優先度）・`type`（指示タイプ）・  
`instruction_target`（指示対象）も `<property>` として出力する。

チェックアウト時には `<eventLog>` セクション **のみ** を更新し、`<data>` セクションは変更しない。  
（チェックアウト時点では `template_data` が空のため、`writeDataAndEventLog()` を使うと `<data>` が空で上書きされる問題を回避）

---

## 目的と期待される成果

### 目的
- チェックアウト時点での実験指示内容を MAIMLファイルに永続化する
- 指示の詳細情報（内容・優先度・タイプ・対象）を MAIML上で参照可能にする

### 期待される成果
- [ ] チェックアウト API（`POST /api/v1/projects/:projectId/checkout`）呼び出し後、MAIMLファイルの `<eventLog>` セクションが更新される
- [ ] `<evnet>` 要素に `instructions`, `priority`, `type`, `instruction_target` の `<property>` が追加される
- [ ] MAIML書き出し失敗はチェックアウト成功を妨げない（non-fatal）

---

## 実装ステップ

### Phase 1: eventLogRepository 拡張
- [ ] `InstructionSentLogParams` に `instructions`, `priority`, `type` フィールドを追加
- [ ] `buildInstructionSentLogJson()` の `properties` 配列に4項目を追加出力

### Phase 2: projectInstructionService 呼び出し側修正
- [ ] `sendInstructions()` 内の `insertInstructionSentLog()` 呼び出しに新フィールドを渡す

### Phase 3: MaimlWriterService に writeEventLogOnly() メソッドを追加
- [ ] `MaimlWriterService` に `writeEventLogOnly()` メソッドを新規追加
  - MAIMLファイルをダウンロード
  - `maiml_event_log` を全件取得
  - `<eventLog>` セクションのみ置き換え（`<data>` セクションは変更しない）
  - MAIMLファイルを上書き保存（上書き前にアーカイブ作成）

### Phase 4: projectService チェックアウト処理にMAIML書き出しを追加
- [ ] `checkout()` メソッドのCOMMIT後に `MaimlWriterService.writeEventLogOnly()` を呼び出す
- [ ] エラーハンドリング（non-fatal: 警告ログのみ）を実装

---

## 変更ファイル

| # | ファイル | 変更内容 |
|---|---------|---------|
| 1 | `backend/src/repositories/eventLogRepository.ts` | `InstructionSentLogParams` 拡張 + `buildInstructionSentLogJson()` property追加 |
| 2 | `backend/src/services/projectInstructionService.ts` | `sendInstructions()` で新フィールドを渡す |
| 3 | `backend/src/services/maimlWriterService.ts` | `writeEventLogOnly()` メソッドを新規追加 |
| 4 | `backend/src/services/projectService.ts` | `checkout()` に `writeEventLogOnly()` 呼び出しを追加 |

---

## 詳細設計

### 1. InstructionSentLogParams の拡張

```typescript
// backend/src/repositories/eventLogRepository.ts

export interface InstructionSentLogParams {
  // (既存フィールド)
  instructionTarget: number;
  methodId: string | null;
  transitionId: string | null;
  programId: string | null;
  taskNo: number | null;
  experimentInstructionId: string;
  userId: string;
  sentAt: string;

  // ★ 追加フィールド
  /** 指示内容テキスト */
  instructions: string | null;
  /** 優先度 */
  priority: number | null;
  /** 指示タイプ */
  type: number | null;
}
```

### 2. buildInstructionSentLogJson() の property 配列拡張

```typescript
// instructionTarget は既存フィールドをそのまま利用

const properties = [
  // (既存)
  { '@key': 'sent_at', '@xsi:type': 'dateTimeType', '#text': sentAt },
  { '@key': 'experiment_instruction_id', '@xsi:type': 'stringType', '#text': experimentInstructionId },
  { '@key': 'instruction_user_id', '@xsi:type': 'stringType', '#text': userId },

  // ★ 追加
  { '@key': 'instructions', '@xsi:type': 'stringType', '#text': instructions ?? '' },
  { '@key': 'priority', '@xsi:type': 'intType', '#text': priority ?? 0 },
  { '@key': 'type', '@xsi:type': 'intType', '#text': type ?? 0 },
  { '@key': 'instruction_target', '@xsi:type': 'intType', '#text': instructionTarget },
];
```

### 3. sendInstructions() の呼び出し側更新

```typescript
// backend/src/services/projectInstructionService.ts

await eventLogRepo.insertInstructionSentLog(
  organizationId,
  projectId,
  {
    // (既存)
    instructionTarget: instruction.instruction_target ?? 0,
    methodId,
    transitionId: instruction.transition_id ?? null,
    programId,
    taskNo: instruction.task_no ?? null,
    experimentInstructionId: instruction.experiment_instruction_id!,
    userId,
    sentAt,
    // ★ 追加
    instructions: instruction.instructions ?? null,
    priority: instruction.priority ?? null,
    type: instruction.type ?? null,
  },
  client
);
```

### 4. checkout() へのMAIML書き出し追加

```typescript
// backend/src/services/projectService.ts  checkout() メソッド

// --- (既存) トランザクションCOMMIT ---
await client.query('COMMIT');

// ★ 追加: MAIMLファイルへのイベントログ書き出し（COMMIT後・non-fatal）
// <data> セクションは変更せず、<eventLog> セクションのみ更新する
try {
  const maimlWriterService = new MaimlWriterService();
  await maimlWriterService.writeEventLogOnly(
    organizationId,
    project.project_name
  );
  console.log(`[checkout] MAIML書き出し完了: projectId=${projectId}`);
} catch (writeError) {
  // MAIML書き出し失敗はチェックアウト成功を妨げない（警告ログのみ）
  console.warn('[checkout] MAIML書き出しに失敗しました（チェックアウトは成功）:', writeError);
}

// --- (既存) 成功レスポンス返却 ---
return {
  success: true,
  data: { ... }
};
```

---

## 出力されるXML構造（拡張後）

### タスク指示の例（instruction_target = 2）

```xml
<eventLog id="eventLogID">
  <uuid>...</uuid>
  <log id="log_1" ref="{method_id}">
    <uuid>...</uuid>
    <trace id="trace_1" ref="{program_id}" taskno="{task_no}">
      <uuid>...</uuid>
      <evnet id="evnet_1" ref="sample_project_001">
        <uuid>...</uuid>
        <property key="sent_at" xsi:type="dateTimeType">
          <value>2026-05-20T02:24:00.000Z</value>
        </property>
        <property key="experiment_instruction_id" xsi:type="stringType">
          <value>sample_project_001</value>
        </property>
        <property key="instruction_user_id" xsi:type="stringType">
          <value>user-uuid-xxxx</value>
        </property>
        <!-- ★ 追加 -->
        <property key="instructions" xsi:type="stringType">
          <value>サンプル条件を必ず確認してから開始してください</value>
        </property>
        <property key="priority" xsi:type="intType">
          <value>1</value>
        </property>
        <property key="type" xsi:type="intType">
          <value>0</value>
        </property>
        <property key="instruction_target" xsi:type="intType">
          <value>2</value>
        </property>
      </evnet>
    </trace>
  </log>
</eventLog>
```

### 追加される property の意味

| key | xsi:type | 値の例 | 説明 |
|-----|---------|--------|------|
| `instructions` | stringType | "サンプル条件を確認してください" | 指示内容テキスト |
| `priority` | intType | 1 | 優先度（DBの priority カラム値） |
| `type` | intType | 0 | 指示タイプ（DBの type カラム値） |
| `instruction_target` | intType | 2 | 指示対象（0=ファイル全体, 1=メソッド, 2=タスク, 3=トランジション） |

---

## 処理フロー（変更後）

```
【指示送信時（sendInstructions）】
  未送信指示 → instruction_status を 1（送信済）に更新
  → maiml_event_log に送信ログをINSERT
     ※ この時点で instructions, priority, type, instruction_target も記録される

【チェックアウト時（checkout）】 ← ★ MAIMLへの書き出しを追加
  バリデーション（未送信指示チェック等）
  ※ 未送信指示がある場合はチェックアウト不可（既存バリデーション）
  → checkout_status を 1（チェックアウト中）に更新
  → COMMIT
  → ★ MaimlWriterService.writeEventLogOnly() を呼び出し
       maiml_event_log の内容（実験指示の送信ログ）をMAIMLの <eventLog> に反映
       <data> セクションは変更しない
       MAIMLファイルをS3/Swiftに上書き保存（上書き前にアーカイブ作成）
```

---

## エラーハンドリング方針

| ケース | 動作 |
|--------|------|
| MAIMLファイルが存在しない | `writeEventLogOnly()` 内部でスキップ（警告ログ） |
| S3/Swift アクセスエラー | 警告ログのみ、チェックアウト成功レスポンスを返す |
| その他例外 | 警告ログのみ、チェックアウト成功レスポンスを返す |

チェックアウトのトランザクションはCOMMIT済みのため、MAIML書き出し失敗はDBの状態に影響しない。

---

## 承認記録

- **計画書提示日時**: 2026-05-20 14:30
- **承認日時**: 承認済み
- **承認者コメント**: 承認済み

## 実施記録

### 実施日時
開始: 2026-05-20 17:48  
完了: 2026-05-20 17:55

### 実装内容

#### Phase 1: eventLogRepository 拡張（完了）
- `InstructionSentLogParams` に `instructions / priority / type` フィールドを追加
- `buildInstructionSentLogJson()` の `properties` 配列に4項目を追加出力
  - `instructions` (stringType), `priority` (intType), `type` (intType), `instruction_target` (intType)

#### Phase 2: projectInstructionService 呼び出し側修正（完了）
- `sendInstructions()` 内の `insertInstructionSentLog()` 呼び出しに新フィールドを渡す実装済み

#### Phase 3: MaimlWriterService に writeEventLogOnly() を追加（完了）
- `backend/src/utils/maimlDataWriter.ts` に `replaceEventLogInMaiml()` を追加
- `backend/src/services/maimlWriterService.ts` に `writeEventLogOnly()` メソッドを追加
  - MAIMLファイル存在確認 → ダウンロード → maiml_event_log全件取得 → eventLog XML 生成 → アーカイブ作成 → 上書き保存

#### Phase 4: projectService checkout() に MAIML書き出し追加（完了）
- COMMIT後に `writeEventLogOnly()` を呼び出す処理を追加
- エラー時は警告ログのみ、チェックアウト成功を妨げない（non-fatal）
