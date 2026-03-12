# タスク計画書: TransitionFlowDiagram仕様書修正

## メタデータ
- **作成日時**: 2026-03-11 23:13
- **タスクID**: TransitionFlowDiagram仕様書修正
- **優先度**: 中
- **推定工数**: 0.5時間

## タスク概要

`docs/design/ui/experiment_worker/ui_transition_flow_diagram.md` の仕様書を、実際のソースコード `frontend/src/components/ExperimentWorker/TransitionFlowDiagram.tsx` と一致するよう修正する。

## 目的と期待される成果

- [ ] 仕様書がソースコードの実装を正確に反映した状態になる
- [ ] 差分7件すべてが解消される

## 実装ステップ

### Step 1: 第2.3節「使用コンポーネント」の修正
- [ ] `useCallback` のimport記載を削除（ソースコードでは未使用）

### Step 2: 第6.4節「Panel（情報パネル）」の修正
- [ ] `Space` コンポーネントの `direction="vertical"` を `orientation="vertical"` に変更
- [ ] 各 `Text` コンポーネントに `fontSize` スタイル指定を追加
  - methodName の `Text`: `style={{ fontSize: 14 }}`
  - トランジション数の `Text`: `style={{ fontSize: 12 }}`
  - 操作ヒントの `Text`: `style={{ fontSize: 11 }}`

### Step 3: 第8.2節「算出データ（useMemo）」の修正
- [ ] initialEdgesのuseMemo依存配列 `token.colorPrimary` について補足説明を追加

### Step 4: 第10.1節「空状態処理」の修正
- [ ] `Empty` を `div` ラッパーで囲む構造に変更（仕様書の空状態スタイルをラッパーdivに適用）
- [ ] `PartitionOutlined` アイコンに `color: token.colorTextDisabled` と `imageStyle={{ height: 48 }}` を追加
- [ ] `Space` コンポーネントの `direction` を `orientation` に変更、`size="small"` を追加
- [ ] `Title` に `style={{ margin: 0 }}` を追加

## 変更ファイル

1. `docs/design/ui/experiment_worker/ui_transition_flow_diagram.md` - 仕様書修正（全差分対応）

## 差分一覧（調査結果）

| No. | 箇所 | 仕様書 | ソースコード | 重要度 |
|-----|------|--------|------------|--------|
| 1 | 空状態・PanelのSpace | `direction="vertical"` | `orientation="vertical"` | 中 |
| 2 | 空状態のEmpty | `<Empty>` 直接返す | `<div>` ラッパー内に配置 | 中 |
| 3 | アイコンスタイル | `fontSize: 48` のみ | `color` と `imageStyle` も追加 | 低 |
| 4 | Title | styleなし | `style={{ margin: 0 }}` | 低 |
| 5 | Panel内Textのスタイル | スタイルなし | fontSize指定あり | 低 |
| 6 | useCallback | 記載なし | importされているが未使用 | 低 |
| 7 | initialEdgesのuseMemo依存 | `token.colorPrimary` | 依存配列に含むが内部未使用 | 低 |

## 承認記録
- **計画書提示日時**: 2026-03-11 23:13
- **承認日時**: 2026-03-11 23:13
- **承認者コメント**: ACTモードへの切り替えにより承認済み
