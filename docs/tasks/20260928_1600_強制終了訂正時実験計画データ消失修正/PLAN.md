# タスク計画書: 強制終了・訂正時の実験計画データ消失修正

## メタデータ

- **作成日時**: 2026-09-28 16:00
- **タスクID**: 20260928_1600_強制終了訂正時実験計画データ消失修正
- **優先度**: 高
- **推定工数**: 1〜2時間

---

## タスク概要

強制終了（`forceTerminate`）や訂正処理（`correctRecord`）の後に呼ばれる  
`writeDataAndEventLog`（`targetFilter` なし）が、MAIML の `<data>` セクションを  
`template_data` テーブルの実績データで**丸ごと置き換える**ため、  
チェックアウト時に `writeExperimentPlanProperties` が書き込んだ  
**実験計画データ（`planned_values` 由来の `<results>`）が消失する**バグを修正する。

---

## 問題の詳細

### `<results>` id の命名規則（既存仕様）

| 種別 | 生成関数 | `<results id>` パターン |
|---|---|---|
| 実験計画データ（チェックアウト時） | `buildPlannedValuesResultsXML` | `results_{methodId}_{taskNo}` （サフィックスなし） |
| 実績データ（承認・強制終了・訂正時） | `buildDataXML` | `results_{methodId}_{taskNo}_actual` （`_actual` サフィックスあり） |

この命名規則により、**`_actual` サフィックスを持たない `<results>` が計画データ**であると  
id パターンだけで明確に識別できる。

### 消失フロー

```
1. チェックアウト
   → writeExperimentPlanProperties()
   → <data> に results_{methodId}_{taskNo}（計画データ）が書き込まれる

2. 強制終了 or 訂正
   → writeDataAndEventLog(targetFilter なし)
   → buildDataXML() で template_data 全件から <data> を再構築
     （results_{methodId}_{taskNo}_actual のみ生成）
   → replaceDataAndEventLogInMaiml() で <data> を丸ごと置き換え
   → 計画データ（results_{methodId}_{taskNo}）が消える ← バグ
```

### targetFilter あり（approveTask）は既に修正済み

`targetFilter` 指定時は `appendResultsToData()` を使って  
既存 `<data>` を保持しつつ実績 `<results>` を追記する方式（`20260925_1430` 対応済み）。  
今回は **`targetFilter` なし（全件書き出し）パスのみ**を修正する。

---

## 修正方針：アプローチA

`writeDataAndEventLog`（`targetFilter` なし）の `<data>` 再構築処理を以下に変更する。

```
【変更前】
  buildDataXML() → <data> を丸ごと置き換え
  （計画データ消失）

【変更後】
  1. 既存 MAIML の <data> から _actual サフィックスを持たない <results>（計画データ）を抽出
  2. buildDataXML() で実績 <results> 群を生成
  3. 新しい <data>（実績データのみ）を組み立てて置き換え
  4. 抽出した計画データ <results> を appendResultsToData() で <data> 末尾に追記
     （appendResultsToData の重複スキップロジックにより二重追記を防止）
```

DBアクセスを増やさず、既存の `extractResultsBlocksFromDataXml`・`appendResultsToData` を  
再利用するため、軽量かつ実績のある実装で対応できる。

---

## 実装内容

### 変更ファイル: 1ファイルのみ

#### `backend/src/utils/maimlDataWriter.ts`

新関数 `extractPlannedResultsBlocksFromMaiml()` を追加（export）。

```typescript
/**
 * MAIML XML 文字列の <data> タグ内から「計画データ」の <results> ブロックのみを抽出して返す
 *
 * 計画データの識別条件:
 *   <results id="..."> の id 属性が "_actual" サフィックスを持たないもの。
 *   buildPlannedValuesResultsXML() が生成する id は "results_{methodId}_{taskNo}" 形式で
 *   "_actual" を含まないため、この条件で実績データと区別できる。
 *
 * @param maimlContent - MAIML XML 全文字列
 * @returns 計画データ <results>...</results> の XML 文字列（複数の場合は改行+インデントで連結）。
 *          存在しない場合は null を返す。
 */
export function extractPlannedResultsBlocksFromMaiml(maimlContent: string): string | null {
  // <data>...</data> ブロック全体を抽出
  const dataMatch = maimlContent.match(/<data[\s\S]*?<\/data>/i);
  if (!dataMatch) return null;

  // <data> 内の全 <results> ブロックを抽出し、id に "_actual" を含まないものだけ残す
  const allBlocks = [...dataMatch[0].matchAll(/<results[\s\S]*?<\/results>/g)];
  const plannedBlocks = allBlocks
    .map((m) => m[0])
    .filter((block) => {
      const idMatch = block.match(/<results[^>]*\sid="([^"]+)"/);
      if (!idMatch) return false;
      return !idMatch[1].endsWith('_actual');
    });

  if (plannedBlocks.length === 0) return null;
  return plannedBlocks.join('\n    ');
}
```

#### `backend/src/services/maimlWriterService.ts`

① `extractPlannedResultsBlocksFromMaiml` を import に追加。

② `writeDataAndEventLog` の Step 8 の分岐処理（`targetFilter` なしパス）を変更。

```typescript
// 変更前（targetFilter なし）:
updatedMaiml = replaceDataAndEventLogInMaiml(maimlContent, dataXml, eventLogXml);

// 変更後（targetFilter なし）:
// 1. 既存 MAIML から計画データ <results> を退避
const plannedResultsXml = extractPlannedResultsBlocksFromMaiml(maimlContent);
// 2. <data>（実績データのみ）と <eventLog> を置き換え
updatedMaiml = replaceDataAndEventLogInMaiml(maimlContent, dataXml, eventLogXml);
// 3. 退避した計画データ <results> を <data> 末尾に追記（重複スキップ込み）
if (plannedResultsXml) {
  updatedMaiml = appendResultsToData(updatedMaiml, plannedResultsXml);
  console.log(
    `[MaimlWriterService] 計画データ <results> を保持して再追記しました ` +
    `(organizationId=${organizationId}, projectId=${projectId})`
  );
}
```

---

## 変更ファイル一覧

| # | ファイル | 変更内容 |
|---|---|---|
| 1 | `backend/src/utils/maimlDataWriter.ts` | `extractPlannedResultsBlocksFromMaiml()` 新規追加（export） |
| 2 | `backend/src/services/maimlWriterService.ts` | `writeDataAndEventLog()` の targetFilter なしパスで計画データ保持処理を追加。`extractPlannedResultsBlocksFromMaiml` を import 追加 |

---

## 影響範囲

| 処理 | 影響 |
|---|---|
| `writeDataAndEventLog`（targetFilter **あり** / approveTask） | **変更なし**（`if (targetFilter)` 分岐の中のため） |
| `writeDataAndEventLog`（targetFilter **なし** / 強制終了・訂正・completeReviewTasks） | **変更あり**（計画データ保持ロジック追加） |
| `writeEventLogOnly` | **変更なし** |
| `writeExperimentPlanProperties` | **変更なし** |

---

## エッジケース・リスク

| リスク | 影響度 | 発生確率 | 対策 |
|---|---|---|---|
| チェックアウト前（計画データ未書き込み）に強制終了した場合 | なし | 高 | `extractPlannedResultsBlocksFromMaiml` が `null` を返すため追記スキップ。従来と同じ挙動 |
| `_actual` を含む id の計画データが存在する場合 | 低 | ほぼ0 | `buildPlannedValuesResultsXML` の id 生成仕様が `results_{methodId}_{taskNo}`（サフィックスなし）のため、実運用では発生しない |
| 計画データ `<results>` と実績データ `<results>` の id が完全一致する場合 | 低 | なし | 命名規則が分離されているため発生しない（計画: サフィックスなし、実績: `_actual`） |
| `appendResultsToData` の重複追記 | 低 | 低 | 同一 id の `<results>` は既存スキップロジックが防止 |

---

## テスト計画

### 手動確認（優先）

1. チェックアウト実施 → `writeExperimentPlanProperties` で計画データが `<data>` に書き込まれることを確認
2. 強制終了実施 → MAIML の `<data>` に計画データ（`results_{methodId}_{taskNo}`）と実績データ（`results_{methodId}_{taskNo}_actual`）の**両方が存在すること**を確認
3. 訂正処理実施 → 同上
4. チェックアウト前に強制終了 → 計画データなしで正常動作すること（従来と同じ）

### TypeScript コンパイル確認

```bash
cd /home/mi_ito/mmdpf && npx tsc --noEmit
```

---

## 承認記録

- **計画書提示日時**: 2026-09-28 16:00
- **承認日時**: 2026-09-28
- **承認者コメント**: 承認します。

---

## 実施記録

### 実施日時
開始: 2026-09-28  
完了: 2026-09-28

### 計画からの変更点
なし

### 発生した問題と解決方法
なし

### 最終的な成果物
- [x] `backend/src/utils/maimlDataWriter.ts` に `extractPlannedResultsBlocksFromMaiml()` を追加
- [x] `backend/src/services/maimlWriterService.ts` の `writeDataAndEventLog()` targetFilter なしパスを修正
- [x] TypeScript コンパイルエラーなし（`npx tsc --noEmit` EXIT:0）
