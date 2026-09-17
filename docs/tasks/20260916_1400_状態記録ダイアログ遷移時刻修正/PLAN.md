# タスク計画書: 状態記録ダイアログ遷移時刻修正

## メタデータ

- **作成日時**: 2026-09-16 14:00
- **タスクID**: 20260916_1400
- **優先度**: 高
- **推定工数**: 0.5時間

---

## 1. タスク概要

実験作業者メニュー > 実験記録タブ内の「状態記録ダイアログ」を開いた際、各ステータス（準備状態・準備完了状態・動作状態・休止状態・終状態・異常終了状態）への遷移時刻が表示されない問題を修正する。

---

## 2. 調査結果・根本原因

### 原因

`insertTransitionProgressLog`（`eventLogRepository.ts`）が `maiml_event_log` に書き込む JSON に `Alchemia:status` プロパティが含まれていない。

一方、`getTransitionStateRecords`（`progressService.ts`）は `Alchemia:status` プロパティの存在でログをフィルタリングしているため、**すべてのエントリがスキップされ、遷移時刻が常に `null` になる**。

### 原因の詳細フロー

```
【修正前】

[状態遷移ボタン押下]
  → PATCH /api/v1/progress/.../transitions/:id/status
    → progressService.updateTransitionStatus()
      → eventLogRepository.insertTransitionProgressLog()
        → DBへ書き込むJSON property 配列:
            [0] lifecycle:transition = "start"      ← Alchemia:status がない
            [1] time:timestamp      = "2026-09-15T14:00:00+09:00"

[状態記録ボタン押下]
  → GET /api/v1/progress/.../transitions/:id/state-records
    → progressService.getTransitionStateRecords()
      → for (row of rows):
          statusProp = properties.find(p => p['@key'] === 'Alchemia:status')
          → undefined  ← 存在しないためスキップ
      → 全エントリスキップ → preparingTime/readyTime/... = null
  → ダイアログの全時刻フィールドが空欄
```

### 修正後フロー

```
【修正後】

[状態遷移ボタン押下]
  → eventLogRepository.insertTransitionProgressLog()
    → DBへ書き込むJSON property 配列:
        [0] Alchemia:status     = "running"          ← 追加
        [1] lifecycle:transition = "start"
        [2] time:timestamp      = "2026-09-15T14:00:00+09:00"

[状態記録ボタン押下]
  → progressService.getTransitionStateRecords()
    → statusProp = { '@key': 'Alchemia:status', '#text': 'running' }
    → timestampProp.#text = '2026-09-15T14:00:00+09:00'
    → entries に追加
    → runningTime = '2026-09-15T14:00:00+09:00'
  → ダイアログに動作状態の遷移時刻が正しく表示される
```

---

## 3. 変更ファイル一覧

| # | ファイルパス | 変更内容 |
|---|-------------|---------|
| 1 | `backend/src/repositories/eventLogRepository.ts` | `insertTransitionProgressLog` の `property` 配列に `Alchemia:status` プロパティを先頭に追加 |

---

## 4. 実装内容

### `backend/src/repositories/eventLogRepository.ts`

`insertTransitionProgressLog` メソッド内 `eventObj.property` 配列を以下のように変更する。

```typescript
// 修正前
property: [
  {
    '@key': 'lifecycle:transition',
    '@xsi:type': 'stringType',
    '#text': lifecycleTransitionValue,
  },
  {
    '@key': 'time:timestamp',
    '@xsi:type': 'dateTimeType',
    '#text': nowIso,
  },
],

// 修正後
property: [
  {
    '@key': 'Alchemia:status',
    '@xsi:type': 'stringType',
    '#text': statusLabel,
  },
  {
    '@key': 'lifecycle:transition',
    '@xsi:type': 'stringType',
    '#text': lifecycleTransitionValue,
  },
  {
    '@key': 'time:timestamp',
    '@xsi:type': 'dateTimeType',
    '#text': nowIso,
  },
],
```

---

## 5. 影響範囲

- **バックエンド**: `eventLogRepository.ts` の `insertTransitionProgressLog` メソッドのみ
- **フロントエンド**: 変更なし（UIの変更は行わない）
- **DBデータ**: 修正後に書き込まれる新規ログから `Alchemia:status` が追加される。既存ログは変更なし

### 既存データへの影響

- 過去のログには `Alchemia:status` が含まれないため、過去遷移の時刻は引き続き空欄になる
- 修正後に発生する状態遷移から正しく時刻が表示される

---

## 6. リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 既存イベントログとの互換性 | 低 | 低 | `getTransitionStateRecords` のフィルタは変更しないため既存ログへの影響なし |
| `Alchemia:status` 値の不一致 | 低 | 低 | `statusLabel` は既存 `transitionStatusLabelMap` から来るため `getTransitionStateRecords` の case 文と確実に一致する |
| MAIMLファイルへの影響 | 低 | 低 | 本修正は DB のみで MAIMLファイルへの書き込みは発生しない |

---

## 7. テスト計画

### 手動テスト

- [ ] 状態遷移ボタン（開始/準備完了/終了/異常終了/休止/再開）を押下後、状態記録ダイアログを開いて対応する時刻が表示されることを確認
- [ ] 複数回の休止/再開を行った際に pauseEntries が正しく表示されることを確認

---

## 8. 承認記録

- **計画書提示日時**: 2026-09-16 14:00
- **承認日時**: 2026-09-16（ユーザー承認済み）
- **承認者コメント**: 「実装をお願いいたします。」

---

## 9. 実施記録

### 実施日時

開始: 2026-09-16 14:00
完了: 2026-09-16 15:00

### 計画からの変更点

- 調査中に前回（計画フェーズ）の誤った実装（`Alchemia:status` プロパティ追加）が判明したため、修正方針を変更。
  - ❌ 当初案: 書き込み側（`eventLogRepository.ts`）に `Alchemia:status` を追加
  - ✅ 修正案: 書き込み側は元の状態に戻し、読み取り側（`progressService.ts`）を `lifecycle:transition` 逆引きに修正

### 最終的な成果物

- [x] `backend/src/repositories/eventLogRepository.ts`
  - 誤追加した `Alchemia:status` プロパティを削除し、仕様どおりの2プロパティ構成（`lifecycle:transition` / `time:timestamp`）に戻した
- [x] `backend/src/services/progressService.ts`
  - `getTransitionStateRecords` 内の `Alchemia:status` 検索を `lifecycle:transition` 検索＋逆引きマッピングに修正
  - `lifecycle:transition` 値 → status 文字列マッピング:
    - `schedule` → `preparing`
    - `assign` / `reassign` → `ready`
    - `start` / `resume` → `running`
    - `suspend` → `paused`
    - `complete` / `autoskip` / `manualskip` → `completed`
    - `withdraw` / `ate_abort` → `error`
- [x] バックエンドビルドエラーなし確認
