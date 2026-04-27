# タスク計画書: MAIMLフラグチェックstale修正

## メタデータ
- **作成日時**: 2026-04-27 10:20
- **タスクID**: maiml-flag-stale-fix
- **優先度**: 高
- **推定工数**: 0.5時間

## タスク概要

「タスク情報を保存」ボタン押下時に、MAIMLファイルが存在しているにもかかわらず「MAIMLファイルが登録されていません。保存できません。」という警告が表示され、指示が登録できない不具合を修正する。

## 原因

`TaskRegistrationTab.tsx` の `handleSave` 内で `isMaimlRegistered` state（タブがアクティブになった時点で取得した古い値）を参照しているため、その後MAIMLをアップロードしてもstateが更新されず `false` のままになることが原因。

具体的なシナリオ：
1. タスク登録タブを開く（この時点では `project_maiml_flg = false` → `isMaimlRegistered = false` がセット）
2. MAIMLファイルをアップロードする（DBの `project_maiml_flg` は `true` に更新される）
3. タブを再アクティブにせず保存ボタンを押す → stateは古い `false` のまま → 警告表示

## 対応内容

`handleSave` 内では既に `getTaskRegistration(projectId)` の再呼び出し（`currentData` として取得）が行われており、その結果に `isMaimlRegistered` が含まれている。

この `currentData.isMaimlRegistered` を使うよう修正し、古いstate参照のチェック箇所を削除する。

## 変更ファイル

1. `frontend/src/components/project/TaskRegistrationTab.tsx`
   - `handleSave` 内の `getTaskRegistration` 再取得結果（`currentData`）から `isMaimlRegistered` を取得
   - 古いstateの `isMaimlRegistered` チェック箇所を削除

## 承認記録
- **承認日時**: 2026-04-27 10:20

## 実施記録

### 実施日時
開始: 2026-04-27 10:20
完了: 2026-04-27 10:23

### 変更内容

#### `frontend/src/components/project/TaskRegistrationTab.tsx`

1. **`handleSave` 内にMAIML登録状態の最新チェックを追加**
   - `getTaskRegistration(projectId)` の再取得結果（`currentData`）から `isMaimlRegistered` を参照するよう変更
   - 追加箇所: `isFirstSave` 判定の直後（保存処理が本格化する前）

   ```typescript
   // MAIML登録状態チェック（最新データで判定 - stateは古い値の可能性があるため）
   if (!currentData.isMaimlRegistered) {
     message.warning(t('taskRegistration.messages.maimlNotRegistered'));
     return;
   }
   ```

2. **古いstate参照のMAIMLチェックを削除**
   - チェックアウト状態チェックの直後にあった `if (!isMaimlRegistered)` ブロックを削除

3. **`useCallback` 依存配列から `isMaimlRegistered` を削除**
   - `handleSave` の依存配列から不要になった `isMaimlRegistered` を除去

### 最終的な成果物
- [x] `frontend/src/components/project/TaskRegistrationTab.tsx` 修正完了
  - `handleSave` 内でstaleなstateではなく最新APIレスポンスでMAIML登録状態を確認するよう修正

---

## 追加修正（2026-04-27 10:33）

### 原因の深掘り

前回の修正（フロントエンド側で最新APIを使って判定）でも解消しない場合の根本原因を調査した結果、**バックエンドの `project_maiml_flg`（DB）がストレージ上のMAIMLファイルの実態と乖離している**ことが判明。

- MAIMLファイルアップロード時にDBフラグ更新が失敗してもサイレントにスキップされる
- `getTaskRegistration` / `saveTaskRegistration` はDBフラグをそのまま信頼しているため、フラグが `false` のままだと保存できない

### 追加変更ファイル

1. `backend/src/services/taskRegistrationService.ts`

#### `getTaskRegistration` の変更
- `project_maiml_flg`（DBフラグ）に加え、`storageService.fileExists()` でストレージ実態を確認
- ストレージに存在するがDBフラグが `false` → **DBフラグを `true` に自動修復**して `isMaimlRegistered: true` を返却
- ストレージに存在しないがDBフラグが `true` → **DBフラグを `false` に自動修復**
- ストレージ確認失敗時はDBフラグにフォールバック（処理継続）

#### `saveTaskRegistration` の変更
- 保存前のMAIMLチェックもDBフラグではなくストレージ実態で判定
- ストレージに存在する場合はDBフラグを自動修復してから保存処理を続行
- ストレージ確認失敗時はDBフラグにフォールバック

### 最終的な成果物（追加）
- [x] `backend/src/services/taskRegistrationService.ts` 修正完了
  - `getTaskRegistration`：ストレージ実態でMAIML存在確認 + DBフラグ自動修復
  - `saveTaskRegistration`：ストレージ実態でMAIML存在確認 + DBフラグ自動修復
