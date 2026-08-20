# タスク計画書: 評価機能 eventLog 反映リファクタリング

## メタデータ

- **作成日時**: 2026-08-20 10:00
- **タスクID**: 20260820_1000
- **優先度**: 高
- **推定工数**: 4時間

---

## 1. タスク概要

`project_overall_evaluations` テーブルのデータを MAiML ファイルの `<eventLog>` 層に書き出す処理を、指示系 eventLog の方式に合わせてリファクタリングする。

### 現状の問題点

| # | 問題 | 該当箇所 |
|---|---|---|
| 1 | スコープに応じた階層構造になっていない | `maimlQualityWriter.ts` |
| 2 | property 形式が `buildPropertiesXML()` 期待形式（`#text`直接）と不一致 | 同上 |
| 3 | `programId`（trace/@ref）取得未実装 | 同上 |
| 4 | `resultsRef` の解決が不完全 | 同上 |
| 5 | `pool.query()` で直接 SQL 実行（Repository 経由必須の規約違反） | `qualityEvaluationMaimlService.ts` |
| 6 | `buildEventLogXML()` が各層の property・ownerRef 出力に非対応 | `maimlDataWriter.ts` |

---

## 2. 目的と期待される成果

評価スコープ別に正しい MAiML `<eventLog>` 階層構造で出力し、以下の記載項目を正しいキー名・位置で出力する。

### 記載項目（確定）

| 項目 | キー名 | xsi:type | 対象 |
|---|---|---|---|
| 評価日時 | `time:timestamp` | `dateTimeType` | 全スコープ |
| 評価値（デジタル） | `Alchemia:evaluationDigital` | `stringType` | 全スコープ |
| 評価スコア | `Alchemia:evaluationScore` | `doubleType` | 全体評価のみ |
| 評価（アナログ） | `Alchemia:evaluationAnalog` | `stringType` | 全スコープ |
| タスク番号 | `Alchemia:evaluationTaskNo` | `intType` | TASK / TRANSITION_TASK のみ |

### スコープ別 eventLog 階層構造

| evaluation_scope | 記載位置 | ownerRef 位置 | resultsRef |
|---|---|---|---|
| MAIML_PROJECT（全体評価） | `eventLog` 直下 property | log タグ末尾（XSD 外扱い） | なし |
| METHOD | `log` 直下 property | `log` 直下 ownerRef | なし |
| TASK | `trace` 直下 property（@taskno + taskNo property） | `trace` 直下 ownerRef | なし |
| TRANSITION_METHOD | `event` 直下 property | `event` 直下 ownerRef | あり |
| TRANSITION_TASK | `event` 直下 property（taskNo property 追加） | `event` 直下 ownerRef | あり |

### ownerRef 形式

```json
{ "@id": "ownerRef_{projectId}Quality_evaluation_{seq}", "@ref": "{evaluatedUserId(@→_置換)}" }
```

### resultsRef 解決方法

TRANSITION_METHOD: `results_{method_id}_null` / TRANSITION_TASK: `results_{method_id}_{task_no}`  
`data-` プレフィックスは `buildEventXML()` 内で自動付与されるため JSON には付けない。

### programId 解決方法

`resolveTransitionToProgramMap()` を新設。  
`<method> > <program id="..."> > <instruction> > <transitionRef ref="...">` を辿り  
`transition_id → program_id` マッピング Map を返す。未解決時は `transitionId` をフォールバック。

---

## 3. 実装ステップ

### Step 1: `eventLogRepository.ts` — `findAllByProject()` メソッド追加

- [ ] `EventLogRow` 型を `maimlWriterService.ts` から参照可能にする（または再定義）
- [ ] `EventLogRepository` クラスに `findAllByProject(organizationId, projectId)` メソッド追加
- [ ] `event_log/findAllByProject.sql` を使用（既存ファイル）

### Step 2: `maimlDataWriter.ts` — XML ビルダー拡張

- [ ] `buildEventLogXML()` に eventLog 直下 property 出力を追加（uuid の後・log の前）
- [ ] `buildLogEntryXML()` に log 直下 property / ownerRef 出力を追加（trace の後）
- [ ] `buildTraceXML()` に trace 直下 property / ownerRef 出力を追加（event/evnet の後）
- [ ] `buildEventXML()` に event 直下 ownerRef 出力を追加（resultsRef の後）
- [ ] `buildOwnerRefXML()` ヘルパー関数を新設（単体・配列両対応）

### Step 3: `maimlQualityWriter.ts` — 全面書き直し

- [ ] `resolveTransitionToProgramMap()` 関数を新設
- [ ] `buildQualityEvalLogEntries()` を全面書き直し
  - 引数に `transToProgMap: Map<string, string>` を追加
  - MAIML_PROJECT: eventLog 直下 property（ownerRef は特殊配置）
  - METHOD: log 直下 property + ownerRef
  - TASK: log > trace（@taskno）直下 property + ownerRef
  - TRANSITION_METHOD: log > trace > event 直下 property + ownerRef + resultsRef
  - TRANSITION_TASK: log > trace > event 直下 property（taskNo追加） + ownerRef + resultsRef
  - property 形式を `#text` 直接形式に統一
- [ ] 旧 `resolveInstructionToResultsMap()` を削除

### Step 4: `qualityEvaluationMaimlService.ts` — 規約準拠修正

- [ ] `pool.query()` を `EventLogRepository.findAllByProject()` 経由に変更
- [ ] `resolveTransitionToProgramMap()` 呼び出しを追加
- [ ] `buildQualityEvalLogEntries()` に `transToProgMap` を渡す
- [ ] 不要な `import { getPool }` を削除

### Step 5: `eventlog_structure.md` — 品質評価フェーズ追記

- [ ] フェーズ名一覧に `Quality_evaluation` を追記
- [ ] 品質評価キー名定義を追記

### Step 6: 動作確認

- [ ] TypeScript コンパイルエラーがないことを確認（`npm run build`）
- [ ] 既存の指示系 eventLog への影響がないことを確認

---

## 4. 変更ファイル

| ファイル | 変更種別 | 既存機能への影響 |
|---|---|---|
| `backend/src/repositories/eventLogRepository.ts` | メソッド追加 | なし（追加のみ） |
| `backend/src/utils/maimlDataWriter.ts` | 関数拡張 | 既存ログ出力は変わらない（追加対応のみ） |
| `backend/src/utils/maimlQualityWriter.ts` | 全面書き直し | 品質評価エクスポート機能のみ影響 |
| `backend/src/services/qualityEvaluationMaimlService.ts` | 修正 | 品質評価エクスポート機能のみ影響 |
| `.clinerules/references/eventlog_structure.md` | 追記 | なし（ドキュメントのみ） |

---

## 5. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|---|---|---|---|
| `buildEventLogXML()` 拡張が既存ログ出力を破壊 | 高 | 低 | JSON に該当キーが存在する場合のみ出力する条件分岐 |
| `programId` が取得できない（MAiML 構造が想定外） | 中 | 中 | `transitionId` をフォールバックとして使用 |
| `resultsRef` の ID 形式が実際の MAiML と不一致 | 中 | 中 | 解決できない場合は resultsRef を省略して続行 |

---

## 6. テスト計画

### 手動テスト

- [ ] `POST .../export-to-maiml` を呼び出し、MAiML ファイルが更新されること
- [ ] 全体評価: eventLog 直下に `Alchemia:evaluationDigital` / `evaluationScore` / `evaluationAnalog` / `time:timestamp` が出力されること
- [ ] METHOD: log 直下に上記 property + ownerRef が出力されること
- [ ] TASK: trace 直下に上記 property + `Alchemia:evaluationTaskNo` + ownerRef が出力され、trace に `@taskno` があること
- [ ] TRANSITION: event 直下に上記 property + ownerRef + resultsRef が出力されること
- [ ] 既存の指示確認・進捗ログが引き続き正しく出力されること

### コンパイル確認

- [ ] `cd backend && npm run build` がエラーなく完了すること

---

## 7. 承認記録

- **計画書提示日時**: 2026-08-20 10:00
- **承認日時**: 2026-08-20 10:00
- **承認者コメント**: 承認します。

