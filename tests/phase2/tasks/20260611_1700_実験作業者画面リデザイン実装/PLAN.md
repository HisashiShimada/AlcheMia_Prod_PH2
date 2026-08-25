# タスク計画書: 実験作業者画面 UIリデザイン実装

## メタデータ
- **作成日時**: 2026-06-11 17:00
- **タスクID**: exp-worker-ui-redesign-impl
- **優先度**: 高
- **推定工数**: 6〜8時間

---

## 1. タスク概要

モック（`ExperimentWorkerScreenMock.tsx` v5 案B）で確定したレイアウトを、実験作業者の実画面に取り込む。

### 基本方針

| 領域 | 方針 |
|------|------|
| 作業記録タブのレイアウト | 案B（左ペインにテンプレート選択）を採用。既存 `DataRecordDialog` の内部ロジック・保存処理を**そのまま流用**し、Modal ではなくインライン展開に変換する |
| 全体進捗タブ | 既存 `ProgressCheckTab` / `ProgressCheckTable` は**使用せず**、モックの `ProgressOverviewTab`（全タスク×トランジション行テーブル、タスクNo/ステータスフィルタ付き）に書き換える |
| プロジェクト選択 | 既存 `ProjectSelector` カード＋選択ボタンを**踏襲**（変更なし） |
| 問題報告 | トランジション行に埋め込まれていた問題ボタンを**ヘッダーの独立ボタン**に移動。既存 `IssueManagementModal` 流用 |
| 想定値列 | モックで実装した「想定値 / 実績値」の横並びレイアウトを `DataRecordDialog` のプロパティ表示に追加 |

---

## 2. 現状の構造

```
ExperimentWorkerPage（or ExperimentWorkerTab）
  ├── ProjectSelector（プロジェクト選択カード）
  ├── タブ: 実験記録 → ExperimentRecordTab
  │     ├── MethodTaskSelector
  │     ├── TransitionList → 各行に DataRecordDialog（Modal）＋ IssueManagementModal
  │     └── TransitionFlowDiagram（フロー表示切り替え）
  └── タブ: 進捗確認 → ProgressCheckTab
        └── ProgressCheckTable（全タスク × トランジション）
```

---

## 3. 新構造（目標）

```
ExperimentWorkerPage
  ├── ヘッダーバー
  │     ├── ProjectSelector（既存踏襲）
  │     └── 「問題報告」ボタン → IssueManagementModal
  ├── タブ1: 作業記録（新設・インライン展開）
  │     ├── InstructionCollapse（プロジェクト指示＋実験計画指示）
  │     ├── 作業ヘッダー（タスクNo / メソッドID / トランジションID / ステータス）
  │     ├── MethodTaskSelector（既存踏襲）
  │     └── 左右分割レイアウト（案B）
  │           ├── 左ペイン: テンプレート一覧（DataRecordDialog サイドバー踏襲）
  │           └── 右エリア: プロパティ入力フォーム
  │                 ├── 想定値 / 実績値 横並び表示（モック追加分）
  │                 ├── カスタムプロパティ（DataRecordDialog 既存）
  │                 ├── ステータス更新（DataRecordDialog 既存）
  │                 └── 保存ボタン群
  └── タブ2: 全体進捗
        └── ProgressOverviewTab（モック実装）
              ├── タスクNo / ステータスフィルタ
              └── 全タスク×トランジション行テーブル
                    └── ステータス / 記録有無 / 操作ボタン（詳細確認 / 作業へ）
```

---

## 4. 実装ステップ

> **フェーズ分け方針**
> - **フェーズA（レイアウト反映）**: 実データ接続なし。モックデータのままレイアウト・UIのみ実画面に組み込む。
> - **フェーズB（本実装）**: APIデータ接続・既存ロジック統合。実際のデータで動作させる。

---

### 【フェーズA】レイアウト反映（APIデータ不要）

#### A-1: 既存コードの調査・整理（完了）
- [x] DataRecordDialog.tsx 確認（2810行、左サイドバー＋フォーム構造）
- [x] ExperimentRecordTab.tsx 確認（MethodTaskSelector + TransitionList + Modal）
- [x] ProgressCheckTab.tsx 確認（getWorkerTasks + ProgressCheckTable）
- [x] ProjectSelector.tsx 確認（カード形式、選択ボタンあり）

#### A-2: 実験作業者ページの再構成（レイアウトのみ）
- [ ] 実験作業者ページ（`ExperimentWorkerTab` or ページ）の構成を確認
- [ ] ページのタブ構成を 2タブ（作業記録 / 全体進捗）に変更
- [ ] ヘッダーバーに「問題報告」ボタン配置（IssueManagementModal への接続はフェーズBで実装）

#### A-3: 作業記録タブ — レイアウト組み込み
- [ ] 案Bレイアウト（左ペイン＋右フォーム）を実画面に組み込み
  - 左ペイン: テンプレート選択リスト（表示のみ）
  - 右エリア: プロパティ入力（想定値 / 実績値 横並び表示）
  - 上部: プロジェクト指示の折りたたみ
  - 既存の MethodTaskSelector をレイアウト内に配置
- [ ] データはモックデータ or 既存の props をそのまま使用

#### A-4: 全体進捗タブ — ProgressOverviewTab 組み込み
- [ ] モックの ProgressOverviewTab を実画面のタブ内に配置
  - データはモックデータ or 既存 API レスポンスをそのままマッピング（変換ロジックのみ仮実装）
  - タスクNo / ステータスフィルタ
  - 全タスク×トランジション行テーブル

#### A-5: フェーズA 動作確認
- [ ] TypeScript 静的チェック（`npx tsc --noEmit`）
- [ ] 手動動作確認（localhost:3000 でレイアウト確認）

---

### 【フェーズB】本実装（APIデータ接続・ロジック統合）

#### B-1: 作業記録タブ — DataRecordDialog ロジック統合
- [ ] DataRecordDialog の保存ロジック・フォーム管理をインライン化
- [ ] 想定値フィールドを `transition.templates[n].properties[m].expectedValue` から取得
- [ ] ステータス更新セクション統合

#### B-2: 全体進捗タブ — API接続
- [ ] ProgressOverviewTab を実際の API データに接続
  - `getWorkerTasks` / `fetchProgress` API を流用
  - 「作業へ」ボタンで作業記録タブに遷移

#### B-3: 問題報告ボタン — API接続
- [ ] ヘッダーの「問題報告」ボタンを IssueManagementModal に接続
- [ ] 現在作業中のトランジション情報を自動セット

#### B-4: TransitionList の問題ボタン整理
- [ ] `TransitionList.tsx` の各行から問題ボタンを削除（ヘッダーに移動済みのため）
  - ※ 「記録」ボタン等の既存機能は残す

#### B-5: フェーズB 動作確認
- [ ] TypeScript 静的チェック（`npx tsc --noEmit`）
- [ ] 手動動作確認（実データで各機能動作確認）

---

## 5. 影響範囲

### 変更するファイル
1. `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx` — タブ構成変更
2. `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` — 想定値列追加・インライン化対応
3. `frontend/src/components/ExperimentWorker/TransitionList.tsx` — 問題ボタン削除

### 新規作成するファイル
1. `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` — 作業記録パネル（案Bレイアウト）

### 変更しないファイル（既存踏襲）
- `ProjectSelector.tsx`
- `ProjectSelectionModal.tsx`
- `IssueManagementModal.tsx`
- `MethodTaskSelector.tsx`

### 使用しなくなるファイル（削除はしない・参照のみ停止）
- `ProgressCheckTab.tsx` — 全体進捗タブを ProgressOverviewTab に置き換えるため
- `ProgressCheckTable.tsx` — 同上

---

## 6. リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| DataRecordDialog が2810行と巨大 | 中 | インライン化は内部ロジックを変えず JSX 部分のみ抽出 |
| TransitionList の問題ボタン削除で既存フローが壊れる | 中 | 削除前に既存の問題ボタンの呼び出しパスを確認 |
| 想定値フィールドが transition 型に存在しない | 低 | オプショナル扱い（null 時は「未設定」表示） |

---

## 7. 承認記録
- **計画書提示日時**: 2026-06-11 17:00
- **承認日時**: —
- **承認者コメント**: —
