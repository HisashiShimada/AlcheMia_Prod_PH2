# 実験計画・指示・作業機能 エグゼクティブサマリー

> 作成日: 2026-06-18  
> ステータス: **実装計画確定**

---

## 機能の目的

MAIMLベースの実験管理システムに「**実験計画 → 実験実施 → レビュー**」の一連のワークフローを追加する。

- **Manager** がMAIMLのData層に「想定値（目標値）」を `mgr-instruction:` 接頭句付きで事前設定できる
- **Worker** が実験時に想定値を参照しながら実績値を記録できる
- **Manager** が想定値と実績値を対比して、タスクを承認またはNG記録できる

---

## 実装済みの内容（モック段階）

| コンポーネント | 概要 | 状態 |
|------------|------|------|
| `ExperimentPlanDialog` | 実験計画指示ダイアログ（Manager用） | ✅ UIモック完成 |
| `ExperimentInstructionTab` | 実験指示一覧・承認タブ（Manager用） | ✅ UIモック完成 |
| `WorkRecordPanel` | 作業記録パネル（Worker用） | ✅ UIモック完成 |
| `ProgressOverviewTab` | 全体進捗タブ（Worker用） | ✅ UIモック完成 |
| `ExperimentCommentDialog` | 実験コメントダイアログ（Worker用） | ✅ UIモック完成 |
| 型定義 `experimentPlan.ts` | 実験計画の型 | ✅ 確定済み |
| 型定義 `experimentInstruction.ts` | 実験指示の型 | ✅ 確定済み |
| DBマイグレーション `prerequisite_transition_ids` | トランジション依存関係 | ✅ 適用済み |

---

## 残タスク概要

### フロントエンド

| 作業 | 対象 | 優先度 |
|------|------|--------|
| 継承ロジック実装（全体→タスクN） | ExperimentPlanDialog | 🔴 高 |
| API接続（モック→実API） | ExperimentPlanDialog | 🔴 高 |
| API接続（モック→実API） | ExperimentInstructionTab | 🟡 中 |
| DataRecordDialogロジック統合 | WorkRecordPanel | 🟡 中 |
| API接続（モック→実API） | WorkRecordPanel | 🟡 中 |
| API接続（モック→実API） | ProgressOverviewTab | 🟡 中 |

### バックエンド

| 作業 | 優先度 |
|------|--------|
| DB: experiment_plan テーブル作成 | 🔴 高 |
| DB: project_task_detail.review_result 追加 | 🔴 高 |
| DB: code_master TaskStatus 06（NG）追加 | 🔴 高 |
| 実験計画API（Repository/Service/Controller/Route） | 🔴 高 |
| 実験指示API（Service実装・モックから差し替え） | 🟡 中 |
| チェックアウト処理拡張（MAIML書き込み） | 🟡 中 |

---

## 技術的な主要設計方針

| 項目 | 方針 |
|------|------|
| 想定値の書き込みタイミング | チェックアウト時にMAIMLに一括反映 |
| 想定値のキー形式 | `mgr-instruction:{元のキー}`（例: `mgr-instruction:temperature`） |
| 依存関係の表現 | `prerequisite_transition_ids`（直接依存先のみ格納） |
| 全体タブ→タスクN継承 | フロントの `overrideFlags` で管理 |
| 保存粒度 | 1レコード = org + project + method + task_number |
| `project_instruction` との関係 | 完全独立（役割が異なる） |

---

## 推定残工数

| フェーズ | 内容 | 推定 |
|--------|------|------|
| Phase 1 | DBマイグレーション | 0.5日 |
| Phase 2 | 実験計画API実装 | 3日 |
| Phase 3 | 実験指示API実装 | 2日 |
| Phase 4 | チェックアウト拡張 | 1.5日 |
| Phase 5 | フロントエンドAPI接続 | 4日 |
| Phase 6 | テスト・調整 | 3日 |
| **合計** | | **14日** |

---

## 関連ドキュメント

- [PLAN.md](./PLAN.md) — 詳細実装計画
- [database_design.md](./database_design.md) — DB設計（テーブル定義・SQL）
- [api_design.md](./api_design.md) — API設計（エンドポイント仕様）
- [frontend_design.md](./frontend_design.md) — フロントエンド設計
- [implementation_roadmap.md](./implementation_roadmap.md) — 実装ロードマップ
- [data_flow.md](./data_flow.md) — データフロー図
