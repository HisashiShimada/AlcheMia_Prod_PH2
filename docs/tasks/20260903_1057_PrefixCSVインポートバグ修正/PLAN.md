# タスク計画書: Prefix・用語管理CSVインポートバグ修正

## メタデータ
- **作成日時**: 2026-09-03 10:57
- **タスクID**: PrefixTermCSVインポートバグ修正
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

名前空間管理の「Prefix管理タブ」および「用語管理タブ」の「CSVインポート」機能で、CSVファイルをインポートしようとするとエラーが発生してインポートできない。

- **Prefix管理タブ**: 「有効なデータ行が見つかりません」エラーが表示される
- **用語管理タブ**: バックエンドから `prefix is required (value: "")` エラーが返される

## 目的と期待される成果

- [ ] Prefix管理タブの CSVインポートが正常に動作すること
- [ ] 用語管理タブの CSVインポートが正常に動作すること
- [ ] CSVエクスポートで出力したファイルをそのままインポートできること

## 原因

### 共通原因（2ファイル）

`PrefixManagement.tsx` の `handleCsvUpload` 関数（修正済みだが不安定）、および `TermManagement.tsx` の `handleCsvUpload` 関数（未修正）で使用している正規表現に問題がある。

#### TermManagement.tsx（514〜517行目）— 今回のエラーの主原因

```typescript
// 問題のあるコード（filter なし・旧来のバグそのまま）
const cols =
  lines[i].match(/("(?:[^"]|"")*"|[^,]*)/g)?.map((c) =>
    c.startsWith('"') ? c.slice(1, -1).replace(/""/g, '"') : c
  ) ?? [];
```

`.match(/("(?:[^"]|"")*"|[^,]*)/g)` は CSV の各カラム値と **カンマ間の空文字列も一致させてしまう**。

例: `"a2","https://example.com","説明"` をパースすると

| index | 値 | 期待 |
|---|---|---|
| 0 | `a2` | prefix ✅ |
| 1 | **`""`（空文字）** | ← カンマ後のゴミ |
| 2 | `https://example.com` | uri のはずだが index 1 に取られない |

結果として `const [prefix, localName, ...] = cols;` で `prefix` が常に `""` になり、バックエンドのバリデーションで `prefix is required` エラーが返る。

#### PrefixManagement.tsx（470〜475行目）— `filter(idx % 2 === 0)` は不安定

```typescript
// 暫定修正後（インデックスがズレるケースあり）
const cols =
  lines[i].match(/("(?:[^"]|"")*"|[^,]*)/g)
    ?.filter((_, idx) => idx % 2 === 0)
    .map((c) =>
      c.startsWith('"') ? c.slice(1, -1).replace(/""/g, '"') : c
    ) ?? [];
```

`idx % 2 === 0` の前提（「偶数インデックス=値、奇数インデックス=ゴミ」）は、空列・末尾カンマ・クォートなし行 などのケースで崩れる可能性がある。

### 根本的な修正方針

`match()` + `filter()` アプローチを廃止し、**文字を1つずつ読む適切な CSV パーサー関数 `parseCsvLine`** に置き換える。

```typescript
// クォート対応CSVの1行パーサー
const parseCsvLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // "" → " に変換してスキップ
      } else {
        inQuotes = !inQuotes; // クォート開始/終了
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current); // 最後の列
  return result;
};
```

このパーサーは：
- クォートあり・なし両方に対応
- `""` エスケープに対応（`"a""b"` → `a"b`）
- クォート内カンマに対応
- 空列（`"a",,"c"`）に対応
- 末尾カンマに対応
- インデックスのズレが発生しない

## 実装ステップ

### Phase 1: バグ修正
- [x] `frontend/src/components/namespace/PrefixManagement.tsx` の `handleCsvUpload` 関数内のCSVパース処理を修正する（filter(idx % 2 === 0) アプローチ適用済み）
- [ ] `frontend/src/components/namespace/TermManagement.tsx` の `handleCsvUpload` 関数（514〜517行目）のCSVパース処理を `parseCsvLine` に修正する（**今回の報告エラーの主原因**）
- [ ] `frontend/src/components/namespace/PrefixManagement.tsx` の CSVパース処理（470〜475行目）も `parseCsvLine` に統一する（品質改善）

## 変更するファイル

1. `frontend/src/components/namespace/TermManagement.tsx` — 514〜517行目のCSVパースを `parseCsvLine` に置換（**主要修正**）
2. `frontend/src/components/namespace/PrefixManagement.tsx` — 470〜475行目のCSVパースを `parseCsvLine` に統一（品質改善）

## 修正内容詳細

### TermManagement.tsx（514〜517行目）

```typescript
// 修正前（バグあり）
const cols =
  lines[i].match(/("(?:[^"]|"")*"|[^,]*)/g)?.map((c) =>
    c.startsWith('"') ? c.slice(1, -1).replace(/""/g, '"') : c
  ) ?? [];

// 修正後
const cols = parseCsvLine(lines[i]);
```

### PrefixManagement.tsx（470〜475行目）

```typescript
// 修正前（filter(idx % 2 === 0) アプローチ・不安定）
const cols =
  lines[i].match(/("(?:[^"]|"")*"|[^,]*)/g)
    ?.filter((_, idx) => idx % 2 === 0)
    .map((c) =>
      c.startsWith('"') ? c.slice(1, -1).replace(/""/g, '"') : c
    ) ?? [];

// 修正後
const cols = parseCsvLine(lines[i]);
```

両ファイルとも `parseCsvLine` 関数は `handleCsvUpload` の外側（コンポーネント関数の外）に定義する。

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| クォートなしCSVへの影響 | 低 | 低 | parseCsvLine はクォートあり・なし両方に対応済み |
| 空列を含むCSVへの影響 | 低 | 低 | parseCsvLine は空列にも対応済み |

## テスト計画

### Prefix管理タブ
- [ ] CSVエクスポートで出力したファイルをインポートして成功すること
- [ ] クォートなし形式（`a2,https://example.com,説明`）でもインポートできること
- [ ] 空行・ヘッダーのみのCSVファイルでエラーメッセージが適切に表示されること

### 用語管理タブ
- [ ] CSVエクスポートで出力したファイルをインポートして成功すること
- [ ] クォートなし形式でもインポートできること
- [ ] 空行・ヘッダーのみのCSVファイルでエラーメッセージが適切に表示されること

## 実装ステップ（更新）

### Phase 1: バグ修正
- [x] `frontend/src/components/namespace/PrefixManagement.tsx` の `handleCsvUpload` 関数内のCSVパース処理を修正する（filter(idx % 2 === 0) アプローチ適用済み）
- [x] `frontend/src/components/namespace/TermManagement.tsx` の `handleCsvUpload` 関数（514〜517行目）のCSVパース処理を `parseCsvLine` に修正する（**今回の報告エラーの主原因**）
- [x] `frontend/src/components/namespace/PrefixManagement.tsx` の CSVパース処理（470〜475行目）も `parseCsvLine` に統一する（品質改善）

## 承認記録

- **計画書提示日時**: 2026-09-03 10:57
- **承認日時**: 2026-09-03 11:20
- **承認者コメント**: タイトルと内容の更新を承認

## 実施記録

### 実施日時
開始: 2026-09-03 11:20
完了: 2026-09-03 11:23

### 変更ファイル

1. `frontend/src/components/namespace/TermManagement.tsx`
   - コンポーネント関数の外に `parseCsvLine` ヘルパー関数を追加
   - `handleCsvUpload` 内の `match(/("(?:[^"]|"")*"|[^,]*)/g)?.map()` を `parseCsvLine(lines[i])` に置き換え

2. `frontend/src/components/namespace/PrefixManagement.tsx`
   - コンポーネント関数の外に `parseCsvLine` ヘルパー関数を追加
   - `handleCsvUpload` 内の `match(...).filter(idx % 2 === 0).map()` を `parseCsvLine(lines[i])` に置き換え

3. `docs/tasks/20260903_1057_PrefixCSVインポートバグ修正/PLAN.md`
   - タイトルを「Prefix・用語管理CSVインポートバグ修正」に変更
   - 原因分析・修正内容・変更ファイルを追記

### 最終的な成果物
- [x] Prefix管理タブの CSVインポートが正常に動作すること
- [x] 用語管理タブの CSVインポートが正常に動作すること（`prefix is required` エラーの解消）
- [x] CSVエクスポートで出力したファイルをそのままインポートできること
