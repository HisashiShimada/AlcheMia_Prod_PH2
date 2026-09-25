# タスク計画書: approveTask Data タグ追記失敗の調査と修正

## メタデータ
- **作成日時**: 2026-09-25 14:30
- **タスクID**: 20260925_1430_approveTask_data追記失敗調査修正
- **優先度**: 高
- **推定工数**: 2時間

---

## タスク概要

`approveTask` 呼び出し後、`MaimlWriterService.writeDataAndEventLog` が `targetFilter`（methodId, taskNo）付きで呼ばれているにもかかわらず、
**MAIMLファイルの `<data>` タグの中身がチェックアウト時に書き込まれた `planned_values`（実験計画指示）の内容で置き換えられてしまっている**。

eventLog は正常に追記できている。

---

## 根本原因の調査結果

### 処理フロー整理

1. **チェックアウト時** (`projectService.checkout`)
   - `writeEventLogOnly()` → `<eventLog>` のみ更新（`<data>` 保持）
   - `writeExperimentPlanProperties()` → `<data>` を `planned_values`（実験計画指示）で置き換え

2. **approveTask 時** (`experimentInstructionService.approveTask`)
   - `writeDataAndEventLog(organizationId, projectId, projectName, { methodId, taskNo })` 呼び出し

3. **`writeDataAndEventLog` 内の処理**（`maimlWriterService.ts`）
   - `filteredTemplateDataRows` = 指定 methodId + taskNo の `template_data` レコードのみ
   - `buildDataXML(filteredTemplateDataRows, ...)` で `<data>...</data>` 生成 → 承認タスク分の `<results>` のみ
   - `replaceDataAndEventLogInMaiml()` で **`<data>` タグ全体を丸ごと置き換え**

### 問題の特定

`replaceDataAndEventLogInMaiml` の正規表現:
```typescript
// maimlDataWriter.ts L923
result = result.replace(/<data[^>]*>[\s\S]*?<\/data>/g, dataXml.trimEnd());
```

`<data>` タグ全体を置換するため、チェックアウト時に書き込まれた他タスクの `planned_values` `<results>` が消えてしまう。

さらに `template_data` は実験記録（実績値）の形式で生成されるため、
チェックアウト時に書き込まれた SupervisorDirective 形式の指示内容とは異なる。

結果として「チェックアウト後にダウンロードするとDataタグが template_data の内容に置き換わっている（または空になっている）」という症状が発生する。

### eventLog が正常な理由

`<eventLog>` の置換は、プロジェクト全件の `maiml_event_log` を取得して再生成しているため、
フィルタ影響なく正しく動作する。

---

## 修正方針: `approveTask` 時は `<results>` を `</data>` 直前に追記（既存 `<data>` は保持）

`targetFilter` 指定時の `writeDataAndEventLog` で `<data>` 全体を置き換えるのではなく、
既存の `<data>` タグの内容（チェックアウト時の実験計画指示）はそのまま保持し、
承認タスクの `template_data` から生成した**新しい `<results>` タグを `</data>` の直前に追記する**方式に変更する。

```
【チェックアウト後のMAIML状態】
<data id="dataID">
  <uuid>...</uuid>
  <results id="results_methodA_1">  ← planned_values から生成（実験計画指示）
    <result ref="...">
      <property key="Alchemia:SupervisorDirective..." .../>
    </result>
  </results>
  <results id="results_methodA_2">  ← 別タスクの指示内容
    ...
  </results>
</data>

【approveTask({ methodId:'methodA', taskNo:1 }) 後の期待状態】
<data id="dataID">
  <uuid>...</uuid>
  <results id="results_methodA_1">  ← planned_values の指示内容（保持）
    ...
  </results>
  <results id="results_methodA_2">  ← 別タスクの指示内容（保持）
    ...
  </results>
  <results id="results_methodA_1_actual">  ← template_data から新規追記（実験記録）
    <result ref="...">
      <property key="..." .../>  ← 実績値
    </result>
  </results>
</data>
```

---

## 実装詳細

### Step 1: `maimlDataWriter.ts` に `appendResultsToData` 関数を追加（export）

`<data>` タグの `</data>` 直前に新しい `<results>` XML を追記する関数。

```typescript
/**
 * MAIML XML の <data> タグ内の </data> 直前に新しい <results> XML を追記する
 *
 * 既存の <data> 内容（planned_values の実験計画指示）はそのまま保持する。
 * buildDataXML() で生成した <data>...</data> 全体から <results>...</results> ブロックを
 * 抽出して追記する。
 *
 * @param maimlContent - 元の MAIML XML 全文字列
 * @param newResultsXml - 追記する <results>...</results> XML 文字列
 * @returns 更新後の MAIML XML 全文字列（<data> タグが存在しない場合はそのまま返す）
 */
export function appendResultsToData(
  maimlContent: string,
  newResultsXml: string
): string {
  if (!/<\/data>/i.test(maimlContent)) {
    return maimlContent;
  }
  return maimlContent.replace(/<\/data>/i, `${newResultsXml.trimEnd()}\n  </data>`);
}
```

また、`buildDataXML()` の戻り値（`<data>...</data>` 全体）から `<results>...</results>` ブロックのみを抽出するヘルパーも追加する。

```typescript
/**
 * buildDataXML() の戻り値（<data>...</data>）から <results>...</results> ブロックを全て抽出する
 *
 * @param dataXml - buildDataXML() の戻り値
 * @returns <results>...</results> XML 文字列（複数ある場合は連結）。存在しない場合は null
 */
export function extractResultsBlocksFromDataXml(
  dataXml: string
): string | null {
  const matches = [...dataXml.matchAll(/<results[\s\S]*?<\/results>/g)];
  if (matches.length === 0) return null;
  return matches.map((m) => m[0]).join('\n    ');
}
```

### Step 2: `maimlWriterService.ts` の `writeDataAndEventLog` を修正

`targetFilter` 指定時の処理分岐を変更する：

```typescript
if (targetFilter) {
  // targetFilter あり（approveTask 時）:
  //   <data> 全体は置き換えず、template_data から生成した <results> を </data> 直前に追記
  //   <eventLog> は従来通り全置換
  const dataXml = buildDataXML(filteredTemplateDataRows, dataId, existingUuids);
  const newResultsXml = extractResultsBlocksFromDataXml(dataXml);
  let updatedMaiml = replaceEventLogInMaiml(maimlContent, eventLogXml);
  if (newResultsXml) {
    updatedMaiml = appendResultsToData(updatedMaiml, newResultsXml);
  }
  // 後続: 名前空間注入・UUID更新・owner追記
} else {
  // targetFilter なし: 従来通り <data>/<eventLog> 全体置換
  let updatedMaiml = replaceDataAndEventLogInMaiml(maimlContent, dataXml, eventLogXml);
  ...
}
```

---

## 変更ファイル

| # | ファイル | 変更内容 |
|---|----------|----------|
| 1 | `backend/src/utils/maimlDataWriter.ts` | `appendResultsToData()` を追加（export）。`extractResultsBlocksFromDataXml()` を追加（export）。 |
| 2 | `backend/src/services/maimlWriterService.ts` | `writeDataAndEventLog()` の targetFilter 指定時処理を `appendResultsToData` 使用の追記方式に変更。 |

---

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `approveTask` を複数回呼ぶと同タスクの `<results>` が重複追記される | 中 | 中 | `appendResultsToData` 内で同 id の `<results>` が既に存在する場合はスキップするロジックを追加 |
| `<data>` タグが存在しない場合 | 低 | 低 | `<data>` 不在時は追記せず警告ログのみ（関数内でガード） |
| `filteredTemplateDataRows` が空の場合 | 低 | 低 | `buildDataXML` が空 `<results>` を返す仕様のため `extractResultsBlocksFromDataXml` が null → 追記スキップ |
| targetFilter なし（既存パス）への影響 | なし | なし | 分岐で完全分離のため従来挙動は変わらない |

---

## テスト計画

- [ ] approveTask 後のMAIMLで、承認タスクの `template_data` 実績値が新しい `<results>` として `</data>` 直前に追記されていること
- [ ] approveTask 後のMAIMLで、チェックアウト時に書き込まれた `planned_values`（実験計画指示）の `<results>` が保持されていること
- [ ] approveTask を2回呼んだ場合、同 methodId+taskNo の `<results>` が重複しないこと
- [ ] `<eventLog>` が正常に更新されること
- [ ] targetFilter なしの `writeDataAndEventLog`（correctRecord 等）が従来通り動作すること

---

## 承認記録
- **計画書提示日時**: 2026-09-25 14:30
- **承認日時**: 2026-09-25 14:40
- **承認者コメント**: 承認

## 実施記録

### 実施日時
開始: 2026-09-25 14:40
完了: 2026-09-25 14:55

### 最終的な成果物
- [x] `backend/src/utils/maimlDataWriter.ts` に `extractResultsBlocksFromDataXml()` / `appendResultsToData()` を追加
- [x] `backend/src/services/maimlWriterService.ts` の `writeDataAndEventLog()` を targetFilter 時は追記方式に変更
- [x] TypeScript コンパイルエラーなし（`npx tsc --noEmit` EXIT:0）
