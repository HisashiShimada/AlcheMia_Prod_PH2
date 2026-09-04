# タスク計画書: UncertaintyCreateModal 用語プルダウン修正

## メタデータ
- **作成日時**: 2026-09-03 11:00
- **タスクID**: UncertaintyCreateModal用語プルダウン修正
- **優先度**: 高
- **推定工数**: 2時間

---

## タスク概要

`UncertaintyCreateModal`（不確かさ基準新規作成モーダル）の「Key属性設定」プルダウンに
`namespace_term` テーブルに登録済みの用語が表示されない不具合を修正する。

---

## 根本原因（3点）

| # | 問題箇所 | 現状 | あるべき姿 |
|---|---------|------|-----------|
| ① | `keyOptions`（Key属性設定プルダウンの選択肢） | `allCriteria`（不確かさ基準一覧）の `.key` を収集 → スコープに不確かさ基準未登録なら空 | `getTerms({ scopeKey })` で `namespace_term` から取得 |
| ② | `handleKeyChange` での名称・説明の自動填入 | `allCriteria` から `termDisplayName` / `termDescription` を参照 | 取得した `NamespaceTermRow[]` の `displayName` / `description` を参照 |
| ③ | 保存時の `nameSpaceId` 解決 | `allCriteria.find(...)?.nameSpaceId ?? ''` → allCriteria が空なら `''` で保存される | 選択した用語の `NamespaceTermRow.namespaceId` を使用 |

### 発生の経緯

前タスク（一覧フィルタ修正）で `selectedNsKey` による絞り込みが有効になったことで、
選択スコープに不確かさ基準が未登録の場合に `allCriteria = []` となり、
`keyOptions` が空になる問題が顕在化した。

---

## データフロー（修正後）

```
UncertaintyManagement.tsx
  └── <UncertaintyCreateModal selectedNsKey={selectedNsKey} ... />

UncertaintyCreateModal.tsx
  ├── open=true になったとき
  │   └── getTerms({ scopeKey: selectedNsKey ?? undefined })
  │         → NamespaceTermRow[] を termRows state に保存
  │
  ├── keyOptions = termRows.map(t => { value: t.qname, label: t.displayName, ...t })
  │
  ├── handleKeyChange(qname)
  │   └── termRows.find(t.qname === qname) の displayName / description を自動填入
  │
  └── handleSave()
      └── termRows.find(t.qname === uncertaintyKey).namespaceId を nameSpaceId にセット
```

### scopeKey の扱い

`getTerms` の `scopeKey` 引数には `selectedNsKey` をそのまま渡す。
- `null` / `undefined` / `'company'` / `'global'` / `'ns-maiml'` / `'ns-xsi'` → 全件取得
- `organization_group_cd` → そのスコープの用語のみ
- `'personal-{userId}'` → `getTerms` のバックエンドが `scope_key = personal-xxx` を解釈しないため `userId` を抽出して渡す

---

## 実装ステップ

### Phase 1: UncertaintyManagement.tsx — props 追加
- [ ] `<UncertaintyCreateModal>` に `selectedNsKey={selectedNsKey}` を追加

### Phase 2: UncertaintyCreateModal.tsx — 修正
- [ ] Props 型定義に `selectedNsKey?: string | null` を追加
- [ ] `getTerms` を `namespaceApiService` からインポート
- [ ] `termRows` state を追加（`NamespaceTermRow[]`）
- [ ] `open` が `true` になったとき `getTerms` で `termRows` を取得する `useEffect` を追加
  - `scopeKey` の変換: `'personal-{userId}'` → `userId`、その他はそのまま渡す
  - `'company'` / `'global'` / `'ns-maiml'` / `'ns-xsi'` / `null` → `scopeKey` 未指定（全件）
- [ ] `keyOptions` を `termRows` ベースに変更
  - `value: t.qname`、`label: t.displayName`（空なら `t.qname`）
- [ ] `handleKeyChange` を `termRows` ベースに変更
  - `displayName` / `description` の自動填入
- [ ] `handleSave` の `nameSpaceId` 解決を `termRows` ベースに変更
  - `termRows.find(t => t.qname === values.uncertaintyKey)?.namespaceId ?? ''`

---

## 変更ファイル一覧

| # | ファイル | 変更内容 |
|---|---------|---------|
| 1 | `frontend/src/components/uncertainty/UncertaintyManagement.tsx` | `<UncertaintyCreateModal>` に `selectedNsKey` props 追加 |
| 2 | `frontend/src/components/uncertainty/UncertaintyCreateModal.tsx` | props 追加・`termRows` state 追加・`keyOptions` / `handleKeyChange` / `handleSave` 修正 |

---

## 影響範囲

- `UncertaintyCreateModal` 単体のみ。他コンポーネントへの影響なし
- `UncertaintyDetailModal` は `uncertainty_key` 固定の編集なので Key選択プルダウンなし。対象外

---

## リスク

| リスク | 対策 |
|--------|------|
| `getTerms` がエラーを返した場合 | catch して `termRows = []`（空）にする。保存ボタンは disabled にしない（ユーザーに気づかせる） |
| `NamespaceTermRow.namespaceId` が空の場合 | `''` で保存（従来と同じ動作。バックエンド側のバリデーションで検出） |

---

## テスト計画

- [ ] ツリーでスコープを選択した状態でモーダルを開くと、そのスコープの `namespace_term` が Key 選択肢に表示される
- [ ] ツリー未選択（全件）の状態でモーダルを開くと、全 `namespace_term` が表示される
- [ ] Key を選択すると基準名・説明文が自動填入される
- [ ] 保存後に `nameSpaceId` が正しくセットされている（DB で確認）

---

## 承認記録
- **計画書提示日時**: 2026-09-03 11:00
- **承認日時**: 2026-09-03 11:00
- **承認者コメント**: 承認（act モードで続行）

## 実施記録

### 実施日時
開始: 2026-09-03 11:00
完了: 2026-09-03 11:30

### 最終的な成果物
- [x] `frontend/src/components/uncertainty/UncertaintyManagement.tsx` — `<UncertaintyCreateModal>` に `selectedNsKey` props 追加
- [x] `frontend/src/components/uncertainty/UncertaintyCreateModal.tsx`
  - `useEffect` 追加: `open` / `selectedNsKey` 変化時に `getTerms` で `termRows` を取得
  - `keyOptions` を `termRows` ベースに変更（`isActive !== false` のもののみ）
  - `handleKeyChange` を `termRows` の `displayName` / `description` を参照するよう変更
  - `handleSave` の `nameSpaceId` 解決を `termRows.find(t.qname)?.namespaceId` に変更
  - `handleClose` に `termDisplayName` / `termDescription` のリセットを追加
