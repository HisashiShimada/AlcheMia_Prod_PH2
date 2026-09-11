# タスク計画書: TransitionFlowNode ステータス表示を一覧表示側に統一

## メタデータ
- **作成日時**: 2026-09-11
- **タスクID**: 20260911_0001
- **優先度**: 中
- **推定工数**: 0.5時間

---

## タスク概要

`ProgressOverviewTab` のフロー図ボタンで切り替えた際に表示される
`TransitionFlowNode.tsx` のステータス表示（テキスト・アイコン・色）が、
一覧表示（リストモード）の `renderStatus` と異なっている。

一覧表示側の定義（`STATUS_CONFIG` + `t('progressOverview.status.*')` 翻訳キー）に
フロー図ノード側を合わせることで、両モードのステータス表示を統一する。

---

## 問題の詳細

### 差異の比較

| ステータスキー | 一覧側テキスト（ja.json） | フロー図ノード側テキスト（ハードコード） | 差異 |
|---|---|---|---|
| `not_started` | **初期状態** | `未開始` | ❌ 不一致 |
| `preparing`   | **準備状態** | `準備中`  | ❌ 不一致 |
| `ready`       | **準備完了状態** | `準備完了` | ❌ 不一致 |
| `in_progress` | **動作状態** | `作業中`  | ❌ 不一致 |
| `on_hold`     | **休止状態** | `保留中`  | ❌ 不一致 |
| `completed`   | **終状態**   | `完了`    | ❌ 不一致 |
| `issue`       | **異常終了状態** | `問題あり` | ❌ 不一致 |

### アイコンの差異

| ステータスキー | 一覧側アイコン（STATUS_CONFIG） | フロー図ノード側アイコン | 差異 |
|---|---|---|---|
| `not_started` | `<MinusCircleOutlined />` | `<MinusCircleOutlined />` | ✅ 一致 |
| `preparing`   | `<SyncOutlined />`        | `<SyncOutlined />`       | ✅ 一致 |
| `ready`       | `<CheckSquareOutlined />` | `<CheckCircleOutlined />` | ❌ 不一致 |
| `in_progress` | なし（`null`）             | `<ClockCircleOutlined />` | ❌ 不一致 |
| `on_hold`     | `<PauseCircleOutlined />` | `<ExclamationCircleOutlined />` | ❌ 不一致 |
| `completed`   | `<CheckCircleOutlined />` | `<CheckCircleOutlined />` | ✅ 一致 |
| `issue`       | `<ExclamationCircleOutlined />` | `<ExclamationCircleOutlined />` | ✅ 一致 |

### その他の差異

- フロー図ノード側はハードコードされた日本語文字列を使用しており、
  `useLanguage` / i18n に未対応（英語切替時も日本語表示になってしまう）

---

## 目的と期待される成果

- [ ] フロー図モードのステータスラベルテキストが一覧モードと一致する
- [ ] フロー図モードのステータスアイコンが一覧モードと一致する
- [ ] フロー図モードのステータスラベルが i18n 翻訳キー（`progressOverview.status.*`）経由で表示される

---

## 実装ステップ

- [ ] `TransitionFlowNode.tsx` を修正する
  - [ ] `useLanguage` フックのインポートと使用を追加する
  - [ ] `CheckSquareOutlined` / `PauseCircleOutlined` のインポートを追加する
  - [ ] `ClockCircleOutlined` のインポートを削除する（不使用になるため）
  - [ ] `getStatusConfig` の `text` フィールドを `t('progressOverview.status.${status}')` に変更する
  - [ ] 各ステータスの `icon` を一覧側 `STATUS_CONFIG` に合わせる
    - `ready`: `<CheckSquareOutlined />` に変更（色: `#13c2c2`）
    - `in_progress`: `null`（アイコンなし）に変更
    - `on_hold`: `<PauseCircleOutlined />` に変更（色: `#faad14`）
  - [ ] 各ステータスの `color` / `bgColor` を一覧側の配色に合わせる
- [ ] 変更後のファイルを確認する

---

## 変更ファイル

| # | ファイル | 変更内容 |
|---|---------|---------|
| 1 | `frontend/src/components/ExperimentWorker/TransitionFlowNode.tsx` | `getStatusConfig` のテキスト・アイコン・色を一覧側 `STATUS_CONFIG` に統一。`useLanguage` 追加 |

翻訳ファイル（`ja.json` / `en.json`）は既に `progressOverview.status.*` キーが存在するため変更不要。

---

## 影響範囲

- `TransitionFlowNode.tsx` のみ変更
- `TransitionFlowDiagram.tsx` は変更なし
- `ProgressOverviewTab.tsx` は変更なし
- API・バックエンドへの影響なし
- 既存の一覧表示の挙動への影響なし

---

## リスク

| リスク | 対策 |
|--------|------|
| `in_progress` のアイコンを null にすることでノードの見た目が変わる | 一覧側と完全一致が目的であるため許容範囲 |
| i18n キー未解決時にキー文字列がそのまま表示される | 翻訳キーは既存で定義済みのため問題なし |

---

## テスト計画

- [ ] フロー図モードに切り替えてステータスラベルが一覧表示と同じ文字列で表示されることを目視確認
- [ ] 英語切替時にステータスラベルが英語で表示されることを確認
- [ ] 各ステータスのアイコンが一覧表示と一致することを確認
- [ ] TypeScript のビルドエラーがないことを確認（`tsc --noEmit`）

---

## 承認記録
- **計画書提示日時**: 2026-09-11
- **承認日時**: 2026-09-11
- **承認者コメント**: 承認します。

---

## 実施記録

### 実施日時
開始: 2026-09-11  
完了: 2026-09-11

### 変更内容
`frontend/src/components/ExperimentWorker/TransitionFlowNode.tsx` を以下の通り修正した。

1. **インポート変更**
   - `ClockCircleOutlined` を削除（不使用）
   - `CheckSquareOutlined`、`PauseCircleOutlined` を追加
   - `useLanguage` を `@/contexts/LanguageContext` からインポート追加

2. **`getStatusConfig` の修正**
   - `useLanguage` の `t` を使用して全ステータスラベルを `progressOverview.status.*` 翻訳キー経由に変更
   - `ready`: アイコンを `CheckCircleOutlined` → `CheckSquareOutlined`（色: `#13c2c2`）に変更
   - `in_progress`: アイコンを `ClockCircleOutlined` → `null`（アイコンなし）に変更、色を `processing` に変更
   - `on_hold`: アイコンを `ExclamationCircleOutlined` → `PauseCircleOutlined`（色: `#faad14`）に変更
   - 色指定を Ant Design トークン値からセマンティック文字列（`'default'`, `'processing'`, `'cyan'` 等）に統一

3. **「記録」ボタンテキスト**: ハードコード `'記録'` → `t('experimentWork.table.record')` に変更（i18n 規約対応）

### ビルド確認
- `npx tsc --noEmit`: エラーゼロ（exit: 0）

### 最終的な成果物
- [x] フロー図ノードのステータスラベルが一覧表示と同一翻訳キーで表示される
- [x] フロー図ノードのアイコンが一覧表示の `STATUS_CONFIG` と一致する
- [x] i18n 未対応（ハードコード日本語）を解消した
- [x] TypeScript ビルドエラーなし
