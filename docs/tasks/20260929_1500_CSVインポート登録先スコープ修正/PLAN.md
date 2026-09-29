# タスク計画書: CSVインポート登録先スコープ修正

## メタデータ

- **作成日時**: 2026-09-29 15:00
- **タスクID**: 20260929_1500_CSVインポート登録先スコープ修正
- **優先度**: 高
- **推定工数**: 2〜3時間

---

## 1. タスク概要

`NamespaceMain.tsx` の用語管理タブに実装されている **CSVインポート機能**に根本的な不具合がある。

現状の `handleCsvUpload` は、CSV を解析して用語を取り出した後、
**左ツリーで選択中のスコープ（`effectiveNsKey` / `scopeKeyForCreate`）を一切参照せずに `createTerm` を呼び出している**。

`createTerm`（`POST /api/v1/namespaces/terms`）に `scopeKey` が渡されないため、
バックエンドはリクエスト内の `prefix` だけを頼りに `namespace_id` を探す。
その結果「たまたま同一 prefix が存在した別スコープの namespace」に INSERT しようとしてエラーになる。

---

## 2. 問題の詳細分析

### 2-1. 現在の `handleCsvUpload`（問題箇所）

```typescript
const csvTermRequest: Parameters<typeof createTerm>[0] = {
  prefix:        row.prefix,
  localName:     row.localName,
  displayNameJa: row.displayName,
  description:   row.description,
  typeHint:      row.type || 'stringType',
  unitHint:      row.unitHint,
  // ❌ scopeKey が渡されていない
};
const saved = await createTerm(csvTermRequest);
```

`handleAddSave`（手動1行追加）では `scopeKey: scopeKeyForCreate` を明示的に渡しているが、
CSV インポートでは同じ修正が適用されていない。

### 2-2. スコープ判定のロジック（既存の `scopeKeyForCreate` を再利用）

`NamespaceMain.tsx` には既に `scopeKeyForCreate` という `useMemo` が定義されており、
`effectiveNsKey`（左ツリー選択中ノードキー）から正しい `scopeKey` を導出する処理が完成している。

この `scopeKeyForCreate` を CSV インポート処理でも流用する。

### 2-3. Prefix が未登録の場合の追加要件

CSV に記載されている用語の `prefix` が、**登録先スコープに存在しない**場合は
自動的に Prefix を作成してから用語を登録する必要がある。

既存の `createNamespace`（`POST /api/v1/namespaces`）が利用可能。
`CreateNamespaceRequest` に `scopeKey` を指定することで対象スコープへ Prefix を追加できる。
URI は `fetchSuggestedUri(scopeKeyForCreate)` で自動生成して取得する。

---

## 3. 修正方針

### 全体フロー

```
[CSVインポート実行時]
  1. effectiveNsKey から scopeKeyForCreate を取得（既存ロジック流用）
  2. scopeKeyForCreate が未確定（undefined）なら登録不可エラーを表示して中断
  3. CSV 内に存在する prefix の一覧を抽出
  4. 各 prefix について dbPrefixes（現在のスコープに紐づく Prefix 一覧）に含まれるか確認
  5. 含まれない prefix は createNamespace で Prefix を先に追加する
     - URI は fetchSuggestedUri(scopeKeyForCreate) で自動取得
     - scopeKey: scopeKeyForCreate を指定
  6. 用語を createTerm で登録（scopeKey: scopeKeyForCreate を必ず付与）
  7. 登録後に fetchTermsForCurrentNsKey / fetchPrefixesForCurrentNsKey で一覧を再取得
```

---

## 4. 実装ステップ

### Phase 1: `fetchSuggestedUri` のインポート追加

**ファイル**: `frontend/src/components/namespace/NamespaceMain.tsx`

既存の import 文に `fetchSuggestedUri` を追加する。

```typescript
import {
  getTerms, createTerm, updateTerm, toggleTermActive,
  createNamespace, getOrganizationGroups, getNamespaceList,
  getOrganizationDisplayName, getAttributeMaster,
  shareTerms as shareTermsApi,
  fetchSuggestedUri,       // ← 追加
} from '@/services/namespaceApiService';
```

### Phase 2: `handleCsvUpload` にスコープチェックを追加

**ファイル**: `frontend/src/components/namespace/NamespaceMain.tsx`

`reader.onload` 内の処理冒頭（`lines.length < 2` チェックの前）に追加:

```typescript
// ── スコープ未確定チェック
if (!scopeKeyForCreate) {
  message.error(t('namespaceMain.csvImportNoScope'));
  if (csvInputRef.current) csvInputRef.current.value = '';
  return;
}
```

### Phase 3: CSV 内 prefix の Prefix 自動追加処理を追加

**ファイル**: `frontend/src/components/namespace/NamespaceMain.tsx`

`if (rows.length === 0)` チェックの後、用語登録ループの前に追加:

```typescript
// ── CSVに含まれる prefix のうち、現在のスコープに未登録のものを自動追加
const csvPrefixes = [...new Set(rows.map((r) => r.prefix).filter(Boolean))];
const existingPrefixSet = new Set(dbPrefixes);
const missingPrefixes = csvPrefixes.filter((p) => !existingPrefixSet.has(p));
const prefixAddFailed = new Set<string>();

if (missingPrefixes.length > 0) {
  let suggestedUri = '';
  try {
    suggestedUri = await fetchSuggestedUri(scopeKeyForCreate);
  } catch {
    // URI 取得失敗時は空文字で続行（バックエンドがデフォルト URI を割り当て）
  }
  for (const missingPrefix of missingPrefixes) {
    try {
      const createNsRequest: CreateNamespaceRequest = {
        prefix: missingPrefix,
        uri: suggestedUri,
        scopeKey: scopeKeyForCreate,
      };
      await createNamespace(createNsRequest);
    } catch {
      prefixAddFailed.add(missingPrefix);
    }
  }
}
```

> **注意**: `CreateNamespaceRequest` は `namespaceApiService.ts` に定義されているが、
> `NamespaceMain.tsx` では型としてインポートされていないため、必要に応じて追加する。
> ただし `Parameters<typeof createNamespace>[0]` で代替できるため型インポートは任意。

### Phase 4: `createTerm` 呼び出しに `scopeKey` を追加

**ファイル**: `frontend/src/components/namespace/NamespaceMain.tsx`

用語登録ループ内を修正:

```typescript
// prefix が Prefix 追加失敗のものはスキップ
if (prefixAddFailed.has(row.prefix)) {
  failed.push(row.localName);
  continue;
}

const csvTermRequest: Parameters<typeof createTerm>[0] = {
  prefix:        row.prefix,
  localName:     row.localName,
  displayNameJa: row.displayName,
  description:   row.description,
  typeHint:      row.type || 'stringType',
  unitHint:      row.unitHint,
  scopeKey:      scopeKeyForCreate,   // ← 追加
};
const saved = await createTerm(csvTermRequest);
```

### Phase 5: 登録後の状態更新を fetchTerms ベースに変更

**ファイル**: `frontend/src/components/namespace/NamespaceMain.tsx`

現在の `setTerms((prev) => [...prev, ...added])` を廃止し、APIから最新状態を再取得する（`handleAddSave` と同じパターン）。

```typescript
// 修正前
if (added.length > 0) {
  setTerms((prev) => [...prev, ...added]);
}

// 修正後
if (added.length > 0) {
  fetchTermsForCurrentNsKey(effectiveNsKey);
  fetchPrefixesForCurrentNsKey(effectiveNsKey);
}
```

### Phase 6: i18n キーの追加

**ファイル**: `frontend/src/locales/ja.json`

`namespaceMain` セクションに追加:

```json
"csvImportNoScope": "登録先が未確定です。左ツリーで登録先のスコープを選択してください",
"csvPrefixAddFailed": "Prefix「{prefix}」の追加に失敗しました。該当 Prefix の用語はスキップされます"
```

**ファイル**: `frontend/src/locales/en.json`

```json
"csvImportNoScope": "Destination scope is not selected. Please select a node from the left tree.",
"csvPrefixAddFailed": "Failed to add prefix \"{prefix}\". Terms with this prefix will be skipped."
```

---

## 5. 影響範囲

| 対象ファイル | 種類 | 変更内容 |
|-------------|------|----------|
| `frontend/src/components/namespace/NamespaceMain.tsx` | 変更 | `handleCsvUpload` 修正、`fetchSuggestedUri` import 追加 |
| `frontend/src/locales/ja.json` | 変更 | i18n キー 2件追加 |
| `frontend/src/locales/en.json` | 変更 | i18n キー 2件追加 |

バックエンドの変更は不要（`createTerm` と `createNamespace` は既に `scopeKey` を受け付けている）。

---

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| Prefix 自動追加時の URI が空文字でバックエンドエラー | 中 | 低 | `fetchSuggestedUri` で事前取得し失敗時は空文字フォールバック。バックエンド側のデフォルト URI 割当て仕様を事前確認 |
| `scopeKeyForCreate` が `undefined` でも `effectiveViewOnly=true` によりボタンが押せない想定が崩れるケース | 低 | 低 | 念のため `scopeKeyForCreate` の undefined チェックを先頭に追加 |
| Prefix 追加成功後に `dbPrefixes` の更新が次回インポートまで反映されない | 低 | 中 | `prefixAddFailed` で追跡し、Prefix 追加成功した prefix の用語は既存セットで判定せず登録を試みる |

---

## 7. テスト計画

| # | 操作 | 期待結果 |
|---|------|----------|
| T1 | 組織グループノード選択 → そのスコープに既存 prefix の用語 CSV インポート | 正しいスコープに用語が登録される |
| T2 | 組織グループノード選択 → そのスコープに存在しない prefix の用語 CSV インポート | Prefix が自動追加され用語も登録される |
| T3 | 個人ノード（`personal-{userId}`）選択 → CSV インポート | 個人スコープに用語が登録される |
| T4 | ノード未選択相当（`scopeKeyForCreate=undefined`）で CSV インポート | エラーメッセージが表示されて中断 |
| T5 | Prefix 追加が失敗するケース | 該当 prefix の用語はスキップ、部分成功メッセージが表示される |

---

## 8. ロールバック計画

- フロントエンドのみの変更のため `git revert` で容易に戻せる
- バックエンドに変更はなし

---

## 9. 承認記録

- **計画書提示日時**: 2026-09-29 15:00
- **承認日時**: 2026-09-29 15:00
- **承認者コメント**: 承認します。

---

## 10. 実施記録

### 実施日時
開始: 2026-09-29 15:00
完了: 2026-09-29 15:30

### 実施内容

- [x] Phase 1: `fetchSuggestedUri` を import に追加
- [x] Phase 2: `handleCsvUpload` にスコープ未確定チェック追加
- [x] Phase 3: CSV 内 prefix の Prefix 自動追加処理を追加
- [x] Phase 4: `createTerm` 呼び出しに `scopeKey: scopeKeyForCreate` を追加
- [x] Phase 5: 登録後の状態更新を `fetchTermsForCurrentNsKey` / `fetchPrefixesForCurrentNsKey` ベースに変更
- [x] Phase 6: i18n キー 2件追加（ja.json / en.json）

### 最終的な成果物
- `frontend/src/components/namespace/NamespaceMain.tsx` — `handleCsvUpload` 修正・`fetchSuggestedUri` import 追加
- `frontend/src/locales/ja.json` — `csvImportNoScope`, `csvPrefixAddFailed` 追加
- `frontend/src/locales/en.json` — `csvImportNoScope`, `csvPrefixAddFailed` 追加

### ビルド確認
`npm run build --prefix frontend` — TypeScript エラーなし、ビルド成功


