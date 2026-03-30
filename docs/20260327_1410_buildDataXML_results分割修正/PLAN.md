# タスク計画書: buildDataXML results タグ分割修正

## メタデータ
- **作成日時**: 2026-03-27 14:10
- **タスクID**: buildDataXML_results分割修正
- **優先度**: 高
- **推定工数**: 3時間

## 1. タスク概要

`backend/src/utils/maimlDataWriter.ts` の `buildDataXML()` 関数が、
全 `template_data` レコードを1つの `<results>` タグにまとめて出力している問題を修正する。

MAIMLの仕様上、タスク1回の実験結果を1つの `<results>` タグで表現するため、
`method_id` × `task_no` の組み合わせごとに `<results>` タグを分けて出力するよう修正する。

## 2. 現状の問題

### 現在の出力（問題あり）

```xml
<data id="dataID">
  <uuid>...</uuid>
  <results id="results_dataID">   ← 全タスクがここに集約されている
    <uuid>...</uuid>
    <material id="place_001" ref="...">...</material>  ← method1/task1
    <material id="place_002" ref="...">...</material>  ← method1/task2
    <result id="place_003" ref="...">...</result>      ← method1/task1
    <result id="place_004" ref="...">...</result>      ← method1/task2
  </results>
</data>
```

### 期待される出力

```xml
<data id="dataID">
  <uuid>...</uuid>
  <!-- method1 / task_no=1 -->
  <results id="results_method1_1">
    <uuid>...</uuid>
    <material id="place_001" ref="...">...</material>
    <result id="place_003" ref="...">...</result>
  </results>
  <!-- method1 / task_no=2 -->
  <results id="results_method1_2">
    <uuid>...</uuid>
    <material id="place_002" ref="...">...</material>
    <result id="place_004" ref="...">...</result>
  </results>
</data>
```

## 3. 影響範囲の分析

### 修正対象ファイル

1. `backend/src/utils/maimlDataWriter.ts`
   - `buildDataXML()` 関数: `method_id` × `task_no` でグルーピングして `<results>` を複数出力

### 間接的な影響確認が必要なファイル

2. `backend/src/services/experimentDataService.ts`
   - `resultsRefs`（result-type の place_id）を収集して `insertTransitionProgressLog()` に渡す
   - `<results id="...">` が分割されると `resultsRef[@ref]` の参照先（place_id）は変わらないため影響なし

3. `backend/src/services/progressService.ts`
   - 同上。`resultsRef` は place_id を参照しており `<results>` のIDには依存しない

4. `backend/src/services/maimlWriterService.ts`
   - `buildDataXML()` の呼び出し元。引数・戻り値の型は変わらないため修正不要

5. `backend/src/utils/maimlDataWriter.ts` の `replaceDataAndEventLogInMaiml()`
   - `<data ...>...</data>` を正規表現で丸ごと置き換えるため修正不要

6. `backend/tests/` 配下のテスト
   - `buildDataXML` のテストがあれば更新が必要

## 4. 実装ステップ

### Phase 1: `buildDataXML()` の修正

- [ ] `TemplateDataRow[]` を `(method_id, task_no)` の組み合わせでグルーピングする
- [ ] グループごとに `<results id="results_{method_id}_{task_no}">` を生成する
- [ ] 各 `<results>` 内に該当グループの material / condition / result を出力する
- [ ] レコードが0件の場合は従来通り空の `<results>` を1つ出力する

### results タグの ID 採番ルール

```
results id = "results_{method_id}_{task_no}"
例: "results_method_01_1", "results_method_01_2"
```

- `method_id` と `task_no` はXMLの `id` 属性として使うため、特殊文字をエスケープする
- 既存コードの `escapeXml()` 関数を使用する

### Phase 2: テストの確認・更新

- [ ] `backend/tests/utils/` 配下に `maimlDataWriter` のテストが存在するか確認する
- [ ] テストが存在する場合は期待値を新しい仕様に更新する
- [ ] テストが存在しない場合は新規作成を検討する（今回は任意）

## 5. 修正の詳細設計

### `buildDataXML()` のグルーピングロジック

```typescript
// (method_id, task_no) をキーにしてグルーピング
const groupMap = new Map<string, TemplateDataRow[]>();

for (const row of validRows) {
  const key = `${row.method_id}_${row.task_no}`;
  if (!groupMap.has(key)) {
    groupMap.set(key, []);
  }
  groupMap.get(key)!.push(row);
}

// グループ順は method_id, task_no の昇順を維持
// (maimlWriterService.ts の ORDER BY method_id, task_no, place_id に依存)
```

### `<results>` IDの生成

```typescript
const resultsId = `results_${escapeXml(row.method_id)}_${row.task_no}`;
```

## 6. リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 既存MAIMLファイルとの互換性 | 中 | 低 | 書き込み処理は上書き方式のため過去ファイルへの影響なし |
| eventLog の resultsRef 参照ずれ | 低 | 低 | resultsRef は place_id を参照しており `<results>` のIDには依存しない |
| results が0件のエッジケース | 低 | 低 | 既存の空 results 生成ロジックを維持 |

## 7. テスト計画

### 手動確認項目

- [ ] template_data が複数 method_id × task_no を持つプロジェクトで書き出しを実行し、`<results>` が分割されること
- [ ] 各 `<results id="results_{method_id}_{task_no}">` のIDが正しいこと
- [ ] eventLog の `resultsRef[@ref]` が引き続き正しい place_id を参照していること
- [ ] template_data が0件の場合に空の `<results>` が1つ出力されること

## 8. 承認記録

- **計画書提示日時**: 2026-03-27 14:10
- **承認日時**: 2026-03-27 14:23
- **承認者コメント**: 承認

## 11. 実施記録

### 実施日時
開始: 2026-03-27 14:23
完了: 2026-03-27 14:25

### 変更ファイル
- `backend/src/utils/maimlDataWriter.ts` - `buildDataXML()` 修正

### 変更内容
- `TemplateDataRow[]` を `method_id + '\x00' + task_no` をキーに `Map` でグルーピング
- グループごとに `<results id="results_{method_id}_{task_no}">` タグを個別生成
- 各グループ内で material → condition → result の順に出力（従来動作を維持）
- レコードが0件の場合は空の `<results id="results_{dataId}">` を1つ出力（従来動作を維持）

### テスト確認
- `backend/tests/utils/` に `maimlDataWriter.test.ts` は存在しないことを確認
- TypeScriptコンパイルエラーなし（`npx tsc --noEmit` でエラー出力なし）
