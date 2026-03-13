# タスク計画書: 4-5 指示登録・送信 E2Eテスト作成

## メタデータ
- **作成日時**: 2026-03-13 18:16
- **タスクID**: 4-5_instruction_registration_e2e
- **優先度**: 中
- **推定工数**: 2時間

## タスク概要

`tests/e2e/test-scenarios/4_experiment_admin.md` の「4-5: 指示登録・送信」に対応するPlaywright E2Eテストを作成する。
featureファイル（BDD/Gherkin形式）とstepsファイル（TypeScript）を作成し、全6件のシナリオをカバーする。

---

## 目的と期待される成果

### 目的
- 指示登録タブの主要機能（指示追加・一括送信・編集・削除・送信済み表示制御・状況サマリー）の自動テスト化
- 回帰テストによる品質担保

### 期待される成果
- [ ] featureファイル作成（全6シナリオ）
- [ ] フロントエンドソースに `data-testid` を追加
- [ ] stepsファイル作成（全6シナリオの自動化）

---

## シナリオ一覧と自動化方針

| シナリオID | シナリオ名 | 種別 | 自動化 | 備考 |
|-----------|-----------|------|--------|------|
| 4-5-1 | 指示を追加して一括送信できること | 正常系 | ✅ Playwright自動 | InstructionEditDialog → 一括送信ボタン |
| 4-5-2 | 未送信の指示を編集できること | 正常系 | ✅ Playwright自動 | 編集ボタン → InstructionEditDialog |
| 4-5-3 | 未送信の指示を削除できること | 正常系 | ✅ Playwright自動 | 削除ボタン → テーブルから消えること |
| 4-5-4 | 送信済みの指示は削除ボタンが非表示であること | 表示確認 | ✅ Playwright自動 | isSent=trueの行に削除ボタンなし |
| 4-5-5 | 指示が0件の場合に一括送信ボタンが無効化されること | 表示確認 | ✅ Playwright自動 | disabled属性の確認 |
| 4-5-6 | 指示登録状況（未送信件数/送信済み件数/合計）が表示されること | 表示確認 | ✅ Playwright自動 | ステータスサマリー表示の確認 |

**手動テストシナリオ: なし**（4-5は全6件Playwright自動化対象）

---

## 実装ステップ

### Phase 1: タスク計画書作成
- [x] PLAN_4-5.md を作成（このファイル）

### Phase 2: featureファイル作成
- [ ] `tests/e2e/features/4_experiment_admin/4-5_instruction_registration.feature` を作成
  - Background（背景）の定義
  - 全6シナリオのGherkin記述
  - タグ付け（@4-5-1 〜 @4-5-6）

### Phase 3: フロントエンドへのdata-testid追加
- [ ] `frontend/src/components/project/InstructionRegistrationTab.tsx` に以下の `data-testid` を追加
  - `instruction-bulk-send-button` - 一括送信ボタン
  - `instruction-list-table` - 指示一覧テーブル
  - `instruction-edit-button-{id}` - 各指示の編集ボタン
  - `instruction-delete-button-{id}` - 各指示の削除ボタン
  - `instruction-detail-button-{id}` - 各指示の詳細ボタン（送信済み）
  - `instruction-status-summary` - 指示登録状況サマリー表示

### Phase 4: stepsファイル作成
- [ ] `tests/e2e/steps/4_experiment_admin/4-5_instruction_registration.ts` を作成
  - Before/Afterフック（テストデータDB投入・クリーンアップ）
  - 各シナリオのStep実装（Given/When/Then）
  - DB直接操作によるテストデータ準備（project・project_task・project_instruction）

---

## 変更ファイル一覧

### 新規作成
1. `docs/20260313_1643_4-1実験管理者E2Eテスト/PLAN_4-5.md` - このファイル
2. `tests/e2e/features/4_experiment_admin/4-5_instruction_registration.feature` - featureファイル
3. `tests/e2e/steps/4_experiment_admin/4-5_instruction_registration.ts` - stepsファイル

### 修正
1. `frontend/src/components/project/InstructionRegistrationTab.tsx` - data-testid追加

---

## テスト前提条件（テストデータ）

### 使用するテーブル
- `project` - プロジェクト情報
- `project_task` - タスク情報（指示タブ表示に必要）
- `project_instruction` - 指示情報（未送信/送信済みのテストデータ）

### 各シナリオの前提データ

#### 4-5-1: 指示を追加して一括送信できること
- プロジェクト: `project_status=0(planning)`, `checkout_status=0(checked_in)`
- タスク: `project_task` に1件以上存在
- 指示: `project_instruction` に未送信指示 0件（追加からテスト）

#### 4-5-2: 未送信の指示を編集できること
- プロジェクト: `checkout_status=0`
- 指示: `project_instruction` に未送信（`is_sent=false`）指示 1件

#### 4-5-3: 未送信の指示を削除できること
- プロジェクト: `checkout_status=0`
- 指示: `project_instruction` に未送信（`is_sent=false`）指示 1件

#### 4-5-4: 送信済みの指示は削除ボタンが非表示であること
- プロジェクト: `checkout_status=0`
- 指示: `project_instruction` に送信済み（`is_sent=true`）指示 1件

#### 4-5-5: 指示が0件の場合に一括送信ボタンが無効化されること
- プロジェクト: `checkout_status=0`
- 指示: `project_instruction` に 0件

#### 4-5-6: 指示登録状況が表示されること
- プロジェクト: `checkout_status=0`
- 指示: `project_instruction` に未送信1件・送信済み1件（合計2件）

---

## 使用するAPI

| API | メソッド | 用途 |
|-----|---------|------|
| `GET /api/v1/experiment-admin/project/:projectName/instructions` | GET | 指示一覧取得 |
| `POST /api/v1/experiment-admin/project/:projectName/instruction` | POST | 指示新規作成（4-5-1） |
| `PUT /api/v1/experiment-admin/project/:projectName/instruction/:id` | PUT | 指示編集（4-5-2） |
| `DELETE /api/v1/experiment-admin/project/:projectName/instruction/:id` | DELETE | 指示削除（4-5-3） |
| `POST /api/v1/experiment-admin/project/:projectName/instructions/send` | POST | 一括送信（4-5-1） |

---

## data-testid設計

### InstructionRegistrationTab.tsx に追加するもの

| data-testid | 要素 | 用途 |
|-------------|------|------|
| `instruction-bulk-send-button` | 一括送信 `<Button>` | 4-5-1・4-5-5で使用 |
| `instruction-list-table` | 指示一覧 `<Table>` | 4-5-2〜4-5-6で使用 |
| `instruction-edit-button-{id}` | 各行の編集 `<Button>` | 4-5-2で使用 |
| `instruction-delete-button-{id}` | 各行の削除 `<Button>` | 4-5-3〜4-5-4で使用 |
| `instruction-detail-button-{id}` | 各行の詳細 `<Button>`（送信済み） | 4-5-4で使用 |
| `instruction-status-summary` | 件数サマリー `<div>` | 4-5-6で使用 |

---

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| InstructionRegistrationTabのdata-testid未追加 | 高 | 低 | Phase 3で確実に追加する |
| project_instructionテーブルのカラム名不一致 | 高 | 低 | 実装前にDDLを確認する |
| 既存ステップ（ログイン・プロジェクト選択）の重複定義 | 中 | 低 | 4-4で定義済みのステップを流用し重複定義しない |
| 一括送信後の画面状態変化タイミング | 中 | 中 | `Promise.race`で APIレスポンスとトーストを並列待機 |

---

## 承認記録
- **計画書提示日時**: 2026-03-13 18:16
- **承認日時**: 2026-03-13 18:16
- **承認者コメント**: Act Modeにて計画書作成指示を受理

---

## 実施記録

### 実施日時
開始: 2026-03-13 18:16
完了: （作業中）

### 計画からの変更点
（作業中）

### 最終的な成果物
- [ ] featureファイル（6シナリオ）
- [ ] stepsファイル
- [ ] InstructionRegistrationTab.tsx へのdata-testid追加
