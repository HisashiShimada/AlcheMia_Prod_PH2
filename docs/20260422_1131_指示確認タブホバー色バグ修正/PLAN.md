# タスク計画書: 指示確認タブ ホバー時に真っ黒になるバグ修正

## メタデータ
- **作成日時**: 2026-04-22 11:31
- **タスクID**: 指示確認タブ_ホバー色バグ修正
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

実験作業者画面の指示確認タブで、指示タイトルのテキスト部分にマウスをホバーすると背景色が真っ黒になる不具合を修正する。

## 原因

`onMouseEnter` のホバー時背景色に `token.colorBgSpotlight` を使用しているのが原因。

`token.colorBgSpotlight` は Ant Design v5 の「スポットライト（強調表示）」用トークンで、値は `rgba(0, 0, 0, 0.88)` （ほぼ黒）。モーダルのオーバーレイ背景等に使われる暗い色であり、インタラクティブ要素のホバー背景色として使うものではない。

## 目的と期待される成果

- [x] ホバー時にタイトルテキストが見えなくなる（真っ黒になる）不具合を解消する
- [x] ホバー時に薄いグレー背景が表示され、クリック可能なことが視覚的にわかる

## 修正方針

`token.colorBgSpotlight` → `token.colorFillSecondary` に置換する。

`token.colorFillSecondary` は Ant Design でリスト行・インタラクティブ要素のホバー背景に推奨されるトークンで、薄いグレー（`rgba(0, 0, 0, 0.06)` 相当）になる。

## 実装ステップ

### Phase 1: ファイル修正
- [x] `frontend/src/components/ExperimentWorker/InstructionConfirmationTab.tsx` の `colorBgSpotlight` → `colorFillSecondary` に変更（3箇所）
- [x] `frontend/src/components/ExperimentWorker/InstructionGroup.tsx` の `colorBgSpotlight` → `colorFillSecondary` に変更（3箇所）
- [x] `frontend/src/components/ExperimentWorker/InstructionConfirmationModal.tsx` の `colorBgSpotlight` → `colorFillSecondary` に変更（3箇所）
- [x] `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` の `colorBgSpotlight` → `colorFillSecondary` に変更（1箇所）

## 変更したファイル

| ファイル | 変更箇所数 | 変更内容 |
|---------|----------|---------|
| `frontend/src/components/ExperimentWorker/InstructionConfirmationTab.tsx` | 3箇所 | `colorBgSpotlight` → `colorFillSecondary` |
| `frontend/src/components/ExperimentWorker/InstructionGroup.tsx` | 3箇所 | `colorBgSpotlight` → `colorFillSecondary` |
| `frontend/src/components/ExperimentWorker/InstructionConfirmationModal.tsx` | 3箇所 | `colorBgSpotlight` → `colorFillSecondary` |
| `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` | 1箇所 | `colorBgSpotlight` → `colorFillSecondary` |

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 他箇所で `colorBgSpotlight` が正しい用途で使われている | 低 | 低 | 変更対象はホバー処理の `onMouseEnter` 内のみに限定した |
| `colorFillSecondary` が意図した色と異なる | 低 | 低 | ライトテーマでは薄いグレーになり問題なし |

## テスト計画

- [ ] 指示確認タブのタイトル行（プロジェクト指示・タスク指示・トランジション指示）にホバーして薄いグレーになることを目視確認
- [ ] InstructionGroup 内の各タスク/トランジションのタイトル行にホバーして薄いグレーになることを目視確認
- [ ] InstructionConfirmationModal 内でも同様に確認
- [ ] DataRecordDialog でも同様に確認

## 承認記録

- **計画書提示日時**: 2026-04-22 11:31
- **承認日時**: 2026-04-22 11:32
- **承認者コメント**: 承認済み

## 実施記録

### 実施日時
開始: 2026-04-22 11:32
完了: 2026-04-22 11:35

### 最終的な成果物
- [x] `InstructionConfirmationTab.tsx` 修正完了（3箇所）
- [x] `InstructionGroup.tsx` 修正完了（3箇所）
- [x] `InstructionConfirmationModal.tsx` 修正完了（3箇所）
- [x] `DataRecordDialog.tsx` 修正完了（1箇所）
