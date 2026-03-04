# タスク計画書: トランジションステータスAPI 型変更（文字列→数値）

## メタデータ
- **作成日時**: 2026-03-02 14:50
- **タスクID**: transition-status-numericalize
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

`PATCH /api/v1/progress/projects/:projectName/methods/:methodId/transitions/:transitionId/status` のリクエストボディ `status` フィールドを文字列型から数値型（`TransitionStatusEnum`）に変更する。

併せて、このAPIを使用するフロントエンドのコードも修正する。

---

## 背景・目的

### 現状の問題
- バックエンドの `TransitionData` テーブルでは `status` カラムは `numeric(2,0)` 型（数値）で定義されている
- `backend/src/types/transitionData.ts` の `TransitionStatusEnum` も数値で定義されている
- しかし、APIのリクエストボディでは `status` を文字列（`'initial'`, `'running'` など）で受け取っていた
- フロントエンドの型定義 `TransitionStatus` も文字列ユニオン型で定義されていた

### 変更の目的
- バックエンドのDB型・型定義と一致させ、型の一貫性を保つ
- 文字列→数値の変換処理を排除してシンプル化する

---

## TransitionStatusEnum 対応表

| 数値 | 旧文字列 | 意味 |
|------|---------|------|
| 0 | initial | 初期状態（未開始） |
| 1 | preparing | 準備中 |
| 2 | ready | 準備完了 |
| 3 | in_progress (旧: running) | 実行中 |
| 4 | paused | 一時停止 |
| 5 | completed | 完了 |
| 6 | error | エラー発生 |

> **注意**: 旧文字列 `'running'` は `TransitionStatusEnum.IN_PROGRESS = 3` に相当

---

## 変更対象ファイル

### バックエンド（1ファイル）

#### 1. `backend/src/routes/progressRoutes.ts`
- **変更箇所**: トランジションステータス更新ルートのバリデーション
- **変更内容**:
  - `body('status').isIn(['initial', 'preparing', 'ready', 'running', 'paused', 'completed', 'error'])` →
    `body('status').isInt({ min: 0, max: 6 })` に変更
  - エラーメッセージも数値用に更新

### フロントエンド（3ファイル）

#### 2. `frontend/src/types/api.ts`
- **変更箇所**: `UpdateTransitionStatusRequest` インターフェース
  - `status: 'initial' | 'preparing' | ...` → `status: number`
- **変更箇所**: `UpdateTransitionStatusResponse` インターフェース
  - `status: string` → `status: number`

#### 3. `frontend/src/types/experimentWorker.ts`
- **変更箇所**: `TransitionStatus` 型定義
  - 文字列ユニオン型 → `number` 型に変更

#### 4. `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx`
- **変更箇所**:
  - `selectedStatus` の初期値 `'initial'` → `0`
  - `statusOptions` の各 `value` を文字列から数値に変更:
    - `'initial'` → `0`
    - `'preparing'` → `1`
    - `'ready'` → `2`
    - `'running'` → `3`
    - `'paused'` → `4`
    - `'completed'` → `5`
    - `'error'` → `6`

### ドキュメント（1ファイル）

#### 5. `docs/design/api/api_progress_monitoring.md`
- **変更箇所**: API #6 のリクエストボディ仕様
  - `status` パラメータの型と説明を数値型（0〜6）に更新

---

## 変更しないファイル

| ファイル | 理由 |
|---------|------|
| `backend/src/types/transitionData.ts` | 既に `TransitionStatusEnum`（数値型）で定義済み |
| `backend/src/controllers/progressController.ts` | `TransitionDataUpdate.status` は既に数値型（`TransitionStatus`）を使用 |
| `backend/src/services/progressService.ts` | サービス層は既に数値型で処理 |
| `frontend/src/types/api.ts` の `ExperimentDataRecord.status` | 実験データ保存API（別エンドポイント）のため対象外 |

---

## 実装ステップ

### Phase 1: バックエンド修正
- [ ] `backend/src/routes/progressRoutes.ts` のバリデーション変更

### Phase 2: フロントエンド型定義修正
- [ ] `frontend/src/types/api.ts` の `UpdateTransitionStatusRequest/Response` 変更
- [ ] `frontend/src/types/experimentWorker.ts` の `TransitionStatus` 型変更

### Phase 3: フロントエンドコンポーネント修正
- [ ] `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` の修正

### Phase 4: ドキュメント更新
- [ ] `docs/design/api/api_progress_monitoring.md` の仕様書更新

---

## リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| DataRecordDialog以外でTransitionStatus型を使用している箇所の見落とし | 中 | 修正前にgrep検索で確認済み |
| フロントエンドの型エラー | 低 | TypeScriptコンパイルエラーで検出可能 |

---

## 承認記録
- **計画書提示日時**: 2026-03-02 14:50
- **承認日時**: 2026-03-02 14:50（Act Mode切り替えにより承認）
