# タスク計画書: 実績値格納不具合調査修正

## メタデータ
- **作成日時**: 2026-09-18 10:00
- **タスクID**: 20260918_1000_実績値格納不具合調査修正
- **優先度**: 高
- **推定工数**: 2〜3時間

## タスク概要

実験管理者メニュー > プロジェクト管理タブ > 実験指示タブで発生している以下3つの不具合を調査・修正する。

| # | 不具合 |
|---|--------|
| ① | 実績値が表示されない |
| ② | 実績値（平均）が表示されない |
| ③ | 訂正ボタン未押下なのに実績値が編集可能 |

## 調査結果 — 根本原因

### 問題① 実績値が DB に格納されない

`backend/src/services/experimentDataService.ts` の `_updateInstructionDetails` にて、
`actualValue` 取得時に存在しないフィールド `prop['content']['value']` を参照している。

`Property` 型の値は `prop.value` に格納されているが、コードは `prop['content']['value']` を参照するため常に `null` になる。

**修正**: `prop['content']` → `prop['value']` に変更

### 問題② 実績値（平均）が表示されない

問題①の副作用。`actual_value = null` のため、フロントエンドの `calcGroupAverage()` が平均計算できない。
問題①が修正されれば自動的に解決する。

### 問題③ 訂正ボタン未押下なのに編集可能

`ExperimentInstructionTab.tsx` の `allColumnDefs` の `useMemo` 依存配列が `[judgeDetailOpen]` のみで、
`isCorrectionMode` と `pendingCorrections` が漏れている。

結果として `isCorrectionMode` が変化しても `allColumnDefs` が再計算されず、古いクロージャの値が参照され続ける。

**修正**: 依存配列に `isCorrectionMode`, `pendingCorrections` を追加

## 修正ファイル一覧

| # | ファイルパス | 変更内容 |
|---|-------------|---------|
| 1 | `backend/src/services/experimentDataService.ts` | `_updateInstructionDetails` の actualValue 取得ロジック修正 |
| 2 | `frontend/src/components/project/ExperimentInstructionTab.tsx` | `allColumnDefs` の useMemo 依存配列修正 |

## 実装ステップ

- [x] BE-01: experimentDataService.ts 修正
- [x] FE-01: ExperimentInstructionTab.tsx 修正
- [x] CHK-01: バックエンド TypeScript ビルドエラーなし（修正ファイルにエラーなし確認）
- [x] CHK-02: フロントエンド TypeScript ビルドエラーなし（修正ファイルにエラーなし確認）

## 承認記録

- **計画書提示日時**: 2026-09-18 10:00
- **承認日時**: 2026-09-18（承認済み）
