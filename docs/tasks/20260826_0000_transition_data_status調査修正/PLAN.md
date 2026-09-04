# タスク計画書: transition_data.status=0 問題の調査と修正

## メタデータ
- **作成日時**: 2026-08-26 15:52
- **タスクID**: 20260826_0000
- **優先度**: 高
- **推定工数**: 0.5時間

---

## タスク概要

`transition_data` テーブルの `status` カラムにトランジションステータス（初期状態など）が入るべきところ、
タスク登録時に `0` がセットされている。
ドキュメント（`status_transitions.md` セクション3）では初期状態を `1` と定義しているが、
**コード実装 (`TransitionStatusEnum`) では `INITIAL = 0`** となっており、2つの体系が乖離している。

---

## 調査結果

### 乖離の詳細

| 観点 | ドキュメント (`status_transitions.md` §3) | コード (`transitionData.ts`) |
|------|------------------------------------------|------------------------------|
| 初期状態 | `1: initial` | `INITIAL = 0` |
| 準備状態 | `2: ready` | `PREPARING = 1`, `READY = 2` |
| 動作状態 | `4: active` | `IN_PROGRESS = 3`, `PAUSED = 4` |
| 終状態 | `6: completed` | `COMPLETED = 5` |
| 異常終了 | `7: error` | `ERROR = 6` |

### 結論

**コード（0〜6体系）が正しく実装されている**。`TransitionStatusEnum` と既存DBデータは整合しており、
ドキュメントが古い設計（1〜7体系）のままで未更新だった。

また、`transitionDataRepository.insert()` 内で `TransitionStatusEnum.INITIAL` を使わず
`0` とハードコードされており、コーディング規約（マジックナンバー禁止）に違反している。

---

## 目的と期待される成果

- [x] **ドキュメント修正**: `status_transitions.md` のトランジションステータス定義をコード実装（0〜6）に合わせる
- [x] **マジックナンバー修正**: `transitionDataRepository.insert()` の `0` を `TransitionStatusEnum.INITIAL` に変更

---

## 実装ステップ

- [x] ステップ1: `status_transitions.md` §3「3-1. コード定義」を0〜6体系に更新
- [x] ステップ2: `transitionDataRepository.ts` の `insert()` 内のマジックナンバー `0` を `TransitionStatusEnum.INITIAL` に修正

---

## 変更ファイル

1. `.cline/skills/backend-develop-skill/docs/status_transitions.md` - §3 トランジションステータス定義を修正
2. `backend/src/repositories/transitionDataRepository.ts` - `insert()` のマジックナンバー修正

---

## リスク

| リスク | 対策 |
|--------|------|
| ドキュメント変更による混乱 | 変更理由をコメントで明記 |

---

## 承認記録
- **承認日時**: 2026-08-26 15:52
- **承認者コメント**: Act モード移行により承認

---

## 実施記録

### 実施日時
開始: 2026-08-26 15:52
完了: 2026-08-26 15:55

### 最終的な成果物

- [x] ステップ1完了: `status_transitions.md` §3 を 0〜6 体系に更新
  - 旧「1〜7（5・6欠番）」→ 新「0〜6（欠番なし）」
  - コード定義表に ENUMキー 列を追加
  - 遷移ルール表・遷移図・禁止パターンを全て更新
  - 注意書き（旧設計との違いを明記）を追加
- [x] ステップ2完了: `transitionDataRepository.insert()` のマジックナンバー修正
  - `0` を `TransitionStatusEnum.INITIAL` に変更
  - `TransitionStatusEnum` の import を追加
