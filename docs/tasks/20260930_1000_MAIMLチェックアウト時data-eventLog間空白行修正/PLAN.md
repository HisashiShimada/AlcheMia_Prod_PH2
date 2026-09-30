# タスク計画書: MAIMLチェックアウト時 `<data>`〜`<eventLog>` 間の空白行修正

## メタデータ

- **作成日時**: 2026-09-30 10:00
- **タスクID**: 20260930_1000_MAIML-data-eventLog-blank-line
- **優先度**: 中
- **推定工数**: 0.5h

---

## 1. タスク概要

実験管理画面からチェックアウト実行時、MAIMLファイルが更新されるが、  
`<data>` タグの終了タグ `</data>` と `<eventLog>` タグの間に**空白行1行が余分に追加**されてしまう  
レイアウト問題を修正する。

---

## 2. 原因調査

### チェックアウト時のMAIML更新フロー

```
projectService.checkout()
  │
  │ (COMMIT後・non-fatal)
  │
  ├── ① writeEventLogOnly()
  │     → replaceEventLogInMaiml(maiml, eventLogXml.trimEnd())
  │        ※ eventLogXml.trimEnd() → 末尾\nを除去 ✅
  │
  └── ② writeExperimentPlanProperties()
        → buildPlannedValuesResultsXML()  ← 戻り値末尾に \n あり
        → _replaceDataSection(maiml, dataXml)
             └── maiml.replace(dataPattern, dataXml)
                                              ↑
                                  trimEnd() なし → 末尾の \n がそのまま挿入
```

### 問題箇所

| ファイル | メソッド | 問題 |
|---------|---------|------|
| `backend/src/services/maimlWriterService.ts` | `_replaceDataSection()` | `dataXml` を `trimEnd()` していない |

### 根本原因の詳細

`buildPlannedValuesResultsXML()` の戻り値：

```typescript
// maimlDataWriter.ts L1424
dataXml += `  </data>\n`;  // 末尾に \n あり
return dataXml;
```

これを `_replaceDataSection()` で `trimEnd()` せずに置き換えると：

**置き換え前**（元のMAIML内の対象箇所）：
```
  </data>
  <eventLog id="eventLogID">
```

**置き換え後**（`_replaceDataSection` 適用後）：
```
  </data>
← buildPlannedValuesResultsXML の末尾 \n による余分な空白行
  <eventLog id="eventLogID">
```

### 比較：他の置換関数の対処

`replaceDataAndEventLogInMaiml()`（承認・訂正時に使用）は既に正しく処理済み：

```typescript
// maimlDataWriter.ts L1040
result = result.replace(/<data[^>]*>[\s\S]*?<\/data>/g, dataXml.trimEnd()); // trimEnd() あり ✅
```

---

## 3. 修正・追加が必要なファイル一覧

| # | ファイル | 変更種別 | 変更内容 |
|---|---------|---------|---------|
| 1 | `backend/src/services/maimlWriterService.ts` | 修正 | `_replaceDataSection()` 内で `dataXml` → `dataXml.trimEnd()` に変更（2箇所） |

---

## 4. 実装内容の説明

`_replaceDataSection()` の2箇所の `dataXml` を `dataXml.trimEnd()` に変更する。

```typescript
// 修正前
private _replaceDataSection(maimlContent: string, dataXml: string): string {
  const dataPattern = /<data[\s\S]*?<\/data>/i;
  if (dataPattern.test(maimlContent)) {
    return maimlContent.replace(dataPattern, dataXml);         // ← trimEnd() なし ❌
  }
  return maimlContent.replace(/<\/maiml>/i, `${dataXml}\n</maiml>`);  // ← trimEnd() なし ❌
}

// 修正後
private _replaceDataSection(maimlContent: string, dataXml: string): string {
  const dataPattern = /<data[\s\S]*?<\/data>/i;
  if (dataPattern.test(maimlContent)) {
    return maimlContent.replace(dataPattern, dataXml.trimEnd());        // ← trimEnd() 追加 ✅
  }
  return maimlContent.replace(/<\/maiml>/i, `${dataXml.trimEnd()}\n</maiml>`);  // ← trimEnd() 追加 ✅
}
```

---

## 5. 修正前/修正後の機能フロー図

### 修正前

```
writeExperimentPlanProperties()
  │
  └── buildPlannedValuesResultsXML()
        └── 戻り値: "<data id=\"...\">...\n  </data>\n"  ← 末尾に \n あり
              │
              └── _replaceDataSection(maiml, dataXml)
                    └── maiml.replace(/<data[\s\S]*?<\/data>/i, dataXml)
                                                                  ↑
                                                        trimEnd() なし
                                                        → </data>の後に \n が残る
                                                        → <eventLog>との間に空白行発生 ❌
```

### 修正後

```
writeExperimentPlanProperties()
  │
  └── buildPlannedValuesResultsXML()
        └── 戻り値: "<data id=\"...\">...\n  </data>\n"  ← 末尾に \n あり（変更なし）
              │
              └── _replaceDataSection(maiml, dataXml)
                    └── maiml.replace(/<data[\s\S]*?<\/data>/i, dataXml.trimEnd())
                                                                  ↑
                                                        trimEnd() で末尾 \n を除去
                                                        → </data>の後に余分な \n なし
                                                        → <eventLog>との間に空白行なし ✅
```

---

## 6. 影響範囲の分析

- `_replaceDataSection()` は `writeExperimentPlanProperties()` からのみ呼ばれている
- `writeExperimentPlanProperties()` はチェックアウト処理（`projectService.checkout()`）からのみ呼ばれている
- 承認・訂正・強制終了時は `writeDataAndEventLog()` → `replaceDataAndEventLogInMaiml()` を使用しており、影響なし
- チェックアウト時の `<eventLog>` 置き換えは `writeEventLogOnly()` → `replaceEventLogInMaiml()` を使用しており、影響なし

---

## 7. リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 他の処理への副作用 | 低 | 低 | `_replaceDataSection` は `writeExperimentPlanProperties` 専用のprivateメソッドであり影響範囲は限定的 |

---

## 8. テスト計画

### 手動テスト
- [ ] チェックアウト後のMAIMLファイルをダウンロードし、`</data>` と `<eventLog>` の間に空白行がないことを確認
- [ ] `buildPlannedValuesResultsXML` が空文字を返す場合（planned_valuesなし）に `<data>` セクションが変更されないことを確認

### ビルド確認
- [ ] バックエンドの TypeScript ビルドエラーがないことを確認（`npm run build` or `tsc --noEmit`）

---

## 9. 承認記録

- **計画書提示日時**: 2026-09-30 10:00
- **承認日時**: 2026-09-30 （承認済み）
- **承認者コメント**: 計画通りに進めてください

---

## 10. 実施記録

### 実施日時
開始: 2026-09-30 10:00

### 変更ファイル
1. `backend/src/services/maimlWriterService.ts` - `_replaceDataSection()` で `dataXml.trimEnd()` を使用
