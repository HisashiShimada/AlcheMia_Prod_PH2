# タスク計画書: 問題報告ボタン修正

## メタデータ
- **作成日時**: 2026-08-26 13:00
- **タスクID**: 20260826_1300
- **優先度**: 高
- **推定工数**: 15分

## タスク概要

実験作業者メニューの「問題報告」ボタンを押下してもダイアログが開かない問題を修正する。
`issueModalOpen` state およびボタンの onClick は実装済みだが、`IssueManagementModal` の
import と JSX レンダリングが存在しないことが原因。

## 目的と期待される成果
- [x] 「問題報告」ボタン押下で IssueManagementModal が開く

## 実装ステップ
- [x] ステップ1: IssueManagementModal の import を追加
- [x] ステップ2: JSX に <IssueManagementModal /> を追加

## 変更ファイル
1. `frontend/src/components/menus/ExperimentWorkerMenu.tsx` - import 追加・JSX 追加

## リスク
| リスク | 対策 |
|--------|------|
| selectedProject が空の場合 | ボタン自体が disabled のため問題なし |

## 承認記録
- **承認日時**: 2026-08-26 13:00
