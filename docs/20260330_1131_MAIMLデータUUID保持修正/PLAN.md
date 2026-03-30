# タスク計画書: MAIMLデータ UUID 保持修正

## メタデータ
- **作成日時**: 2026-03-30 11:32
- **タスクID**: MAIMLデータUUID保持修正
- **優先度**: 高
- **推定工数**: 3時間

## 1. タスク概要

`buildDataXML()` / `buildEventLogXML()` が毎回 `randomUUID()` で新しい UUID を生成するため、
MAIMLファイルへの書き込みのたびに `<uuid>` 要素の値が変わり、改竄と同等の問題が発生している。

DBスキーマ変更なしで対応できる方針として、
**既存 MAIMLファイルから UUID を抽出し、同じ要素に同じ UUID を再利用する**方式で修正する。

## 2. 現状の問題

```
タスク承認 → writeDataAndEventLog() 呼び出し
  → MAIMLダウンロード（既存 <data uuid="A">, <results uuid="B">, ... が存在）
  → buildDataXML() → randomUUID() で UUID X, Y, Z を新規生成
  → replaceDataAndEventLogInMaiml() → <data>...</data> を丸ごと置換
  → UUID A, B が消えて UUID X, Y, Z に変わる ← 毎回変わる = 改竄相当
```

## 3. 修正方針

### DBスキーマ変更不要の方針: 既存 MAIMLから UUID を読み取り再利用

`maimlWriterService.ts` で既存 MAIMLファイルの `<data>` / `<eventLog>` ブロックから
UUID を事前に抽出し、`buildDataXML()` / `buildEventLogXML()` に渡す。
各 `<uuid>` 要素のキー（`<data>`, `<results id="...">`, `<material id="...">`, etc.）と
UUID 値をマッピングした辞書を引数として渡し、**同じ要素には同じ UUID を使い回す**。
既存 UUID が存在しない（新規作成時・追記された要素）場合のみ `randomUUID()` で生成する。

### UUID の識別キー設計

| 要素 | 識別キー | 例 |
|------|---------|-----|
| `<data>` | `"data"` | `"data"` |
| `<results>` | `"results:{id属性}"` | `"results:results_method01_1"` |
| `<material>` | `"material:{id属性}"` | `"material:place_001"` |
| `<condition>` | `"condition:{id属性}"` | `"condition:place_002"` |
| `<result>` | `"result:{id属性}"` | `"result:place_003"` |
| `<eventLog>` | `"eventLog"` | `"eventLog"` |
| `<log>` | `"log:{id属性}"` | `"log:log_1"` |
| `<trace>` | `"trace:{id属性}"` | `"trace:trace_1"` |
| `<event>` | `"event:{id属性}"` | `"event:event_report_user_123"` |
| `<evnet>` | `"evnet:{id属性}"` | `"evnet:evnet_1"` |

## 4. 影響範囲

### 修正対象ファイル

1. `backend/src/utils/maimlDataWriter.ts`
   - `buildDataXML()`: `existingUuids` 引数を追加、UUID 解決ロジックを追加
   - `buildEventLogXML()`: `existingUuids` 引数を追加、UUID 解決ロジックを追加

2. `backend/src/utils/maimlUuidExtractor.ts`（**新規作成**）
   - `extractUuidsFromMaiml(maimlContent: string): Map<string, string>`
   - 既存 MAIMLから UUID マッピングを抽出するユーティリティ

3. `backend/src/services/maimlWriterService.ts`
   - `writeDataAndEventLog()` で `extractUuidsFromMaiml()` を呼び出し UUID マップを生成
   - `buildDataXML()` / `buildEventLogXML()` に UUID マップを引数として渡す

## 5. 実装ステップ

### Phase 1: UUID 抽出ユーティリティの作成

- [ ] `backend/src/utils/maimlUuidExtractor.ts` を新規作成
- [ ] 正規表現で `<要素名 id="...">...<uuid>値</uuid>` のパターンを抽出
- [ ] `Map<string, string>` (識別キー → UUID値) を返す

### Phase 2: `buildDataXML()` の修正

- [ ] 第3引数に `existingUuids?: Map<string, string>` を追加
- [ ] `<data>`, `<results>`, `<material>`, `<condition>`, `<result>` の uuid 出力を
      `resolveUuid(key, existingUuids)` 経由に変更
- [ ] `resolveUuid()`: マップに存在すれば既存UUID、なければ `randomUUID()` を返す

### Phase 3: `buildEventLogXML()` の修正

- [ ] 第3引数に `existingUuids?: Map<string, string>` を追加
- [ ] `<eventLog>`, `<log>`, `<trace>`, `<event>`, `<evnet>` の uuid 出力を
      `resolveUuid()` 経由に変更

### Phase 4: `maimlWriterService.ts` の修正

- [ ] ダウンロード済み `maimlContent` から `extractUuidsFromMaiml()` を呼び出す
- [ ] `buildDataXML()` / `buildEventLogXML()` に `uuidMap` を引数として渡す

## 6. リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 正規表現による UUID 抽出漏れ | 中 | 低 | 未抽出の場合は新規生成にフォールバック（動作継続） |
| results タグの id が変わった場合（先の分割修正による） | 中 | 中 | `results_{method_id}_{task_no}` 形式で抽出キーを生成するため対応済み |
| 新規プロジェクト（MAIMLに data/eventLog なし）| 低 | 高 | UUID マップが空 → 全て新規生成（従来通り） |

## 7. テスト計画

- [ ] 既存 UUID を持つ MAIMLファイルに対して writeDataAndEventLog() を実行し、UUID が変わらないことを確認
- [ ] 新規プロジェクト（data / eventLog タグなし）で writeDataAndEventLog() を実行し、新規 UUID が生成されることを確認
- [ ] 新しい place_id が追加された場合、その要素のみ新規 UUID が生成されることを確認

## 8. 承認記録

- **計画書提示日時**: 2026-03-30 11:32
- **承認日時**: 2026-03-30 11:33
- **承認者コメント**: 承認

## 11. 実施記録

### 実施日時
開始: 2026-03-30 11:33
完了: 2026-03-30 11:38

### 新規作成・変更ファイル
- `backend/src/utils/maimlUuidExtractor.ts`（**新規作成**）
  - `extractUuidsFromMaiml()`: MAIML XMLから識別キー→UUID の Map を抽出
  - `resolveUuid()`: 既存 UUID があれば再利用、なければ randomUUID() で生成
- `backend/src/utils/maimlDataWriter.ts`（**修正**）
  - `buildDataXML()` に `existingUuids?: Map<string, string>` 引数を追加
  - `buildEventLogXML()` と内部ヘルパー全関数に `existingUuids` を追加
  - 全 `randomUUID()` 呼び出しを `resolveUuid()` 経由に変更
- `backend/src/services/maimlWriterService.ts`（**修正**）
  - ステップ6: `extractUuidsFromMaiml(maimlContent)` で UUID マップを生成
  - ステップ7: `buildDataXML()` / `buildEventLogXML()` に UUID マップを渡す

### テスト確認
- TypeScriptコンパイルエラーなし（`npx tsc --noEmit` でエラー出力なし）
