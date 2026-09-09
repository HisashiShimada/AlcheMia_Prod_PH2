# タスク計画書: トランジション未登録時のチェックアウト制御

## メタデータ
- **作成日時**: 2026-09-09 10:00（更新: 2026-09-09）
- **タスクID**: 20260909_1000
- **優先度**: 高
- **推定工数**: 6〜8時間

---

## タスク概要

### 背景・根本原因

トランジションを含まない MAIML ファイルを使ってタスク登録 → チェックアウトまで実行できてしまう不具合が判明した。

この場合 `transition_data` テーブルへのレコードが1件も登録されず、実験作業者画面で当該プロジェクトを選択すると `progressRows` が空になる。その結果 WorkRecordPanel 内のボタン判定で `currentStatus` が `undefined` となり、「開始・終了・異常終了」ボタンがすべて非活性になる。

### 問題のフロー

```
① 実験計画ダイアログ（ExperimentPlanDialog）
   → トランジションなし / Placeはあるがテンプレートなし の状態で保存できてしまう

② タスク登録保存（TaskRegistrationTab handleSave）
   → プロジェクト指示も実験計画指示もない場合 → warning のみで保存処理続行
   → return しない → 保存が通ってしまう

③ タスク登録保存（POST /task-registration）
   → MAIMLにトランジションなし → transition_data に INSERT = 0件
   → バリデーションなし → そのまま通過

④ チェックアウト実行（POST /checkout）
   ✅ MAIML ファイル存在チェック（既存）
   ✅ プロジェクトステータスチェック（既存）
   ✅ タスク件数 > 0 チェック（既存）
   ❌ transition_data 件数チェック ← 存在しない
   → チェックアウト成功 → updateStatusForCheckout.sql が 0件更新

⑤ 実験作業者画面
   → fetchTransitionStatus → 0件 → progressRows = []
   → WorkRecordPanel: 全ボタン非活性
```

### 対策の3層構造（方針）

```
Layer 1: ExperimentPlanDialog（フロントエンド）
         → トランジションなし / Placeあり+テンプレートなし の場合に保存ボタンを非活性化

Layer 2: TaskRegistrationTab handleSave（フロントエンド）
         → プロジェクト指示または実験計画指示の存在を必須化
           （現状: warning のみで続行 → error で中断に変更）

Layer 3: projectService.checkout()（バックエンド）
         → transition_data 実績行 = 0件 の場合はチェックアウトを拒否（最終防衛線）
```

---

## 現状調査結果

### ExperimentPlanDialog.tsx の `handleSave` 現状

```
現状: バリデーションなし（line 621〜698）
  → transitions.length === 0 でも保存ボタンが活性のまま
  → テンプレートが 0 件でも保存可能
```

### filteredTemplates の算出ロジック（制御判断の根拠）

| ケース | 状況 | 保存制御方針 |
|--------|------|------------|
| トランジション自体が存在しない | `transitions.length === 0` | **保存ボタン非活性** |
| Placeあり かつ filteredTemplates = 0件 | `allPlaceIds.length > 0` かつ `matched.length === 0` | **保存ボタン非活性** |
| Placeなし（フォールバック: 全テンプレート表示） | `allPlaceIds.length === 0` | 制御対象外（保存可） |

> フォールバックケース（Placeなし）は「テンプレートがないのではなく関連付けが未設定」な状態であり、保存を止めるべきではないため対象外とする。

### TaskRegistrationTab.tsx の `handleSave` 現状

```
現状コード（line 396-400）:
  if (!hasUnsent && !hasExperimentPlan) {
    message.warning(t('taskRegistration.messages.requireInstruction'));
    // return なし → 保存処理が続行される
  }
問題: 「指示も計画もない」まま保存 → チェックアウト可能な状態になってしまう
```

---

## 目的と期待される成果

- [ ] **Layer 1**: ExperimentPlanDialog の保存ボタンを、トランジションなし / Placeあり+テンプレートなし の場合に非活性にする
- [ ] **Layer 2**: TaskRegistrationTab の保存ボタン押下時に、プロジェクト指示または実験計画指示が存在しない場合は `error` で中断する
- [ ] **Layer 3**: チェックアウト API で `transition_data` 件数チェックを追加し、0件なら `CHECKOUT_NO_TRANSITIONS` エラーを返す
- [ ] 各エラー・非活性状態に対応する日本語・英語メッセージをユーザーに表示する

---

## 実装ステップ（詳細チェックリスト）

### [Layer 1] STEP 1: ExperimentPlanDialog.tsx — 保存ボタン非活性制御

**変更ファイル**: `frontend/src/components/project/ExperimentPlanDialog.tsx`

- [ ] `saveDisabled` フラグを算出する `useMemo` を追加する

```typescript
const saveDisabled = useMemo(() => {
  if (transitions.length === 0) return true;
  const allTemplates = dialogData?.templates ?? [];
  for (const trans of transitions) {
    const allPlaceIds = [
      ...(trans.inputPlaceIds ?? []),
      ...(trans.outputPlaceIds ?? []),
    ];
    if (allPlaceIds.length === 0) continue; // Placeなし = フォールバック → 制御対象外
    const placeIdSet = new Set(allPlaceIds);
    const matched = allTemplates.filter((tmpl) =>
      tmpl.placeIds?.some((pid) => placeIdSet.has(pid))
    );
    if (matched.length === 0) return true; // Placeあり かつ テンプレートなし
  }
  return false;
}, [transitions, dialogData]);
```

- [ ] 保存ボタンに `disabled={disabled || saveDisabled}` を適用する（line 763 付近）
- [ ] 非活性理由をボタン横に表示する

```tsx
{saveDisabled && !disabled && (
  <Text type="warning" style={{ fontSize: 11 }}>
    {transitions.length === 0
      ? t('experimentPlanDialog.saveDisabledNoTransitions')
      : t('experimentPlanDialog.saveDisabledNoTemplates')}
  </Text>
)}
```

---

### [Layer 1] STEP 2: ロケールファイル追加（Layer 1 分）

- [ ] `ja.json` の `experimentPlanDialog` セクションに追加

```json
"saveDisabledNoTransitions": "トランジションが存在しないため保存できません",
"saveDisabledNoTemplates": "Placeに紐づくテンプレートが存在しないため保存できません"
```

- [ ] `en.json` の `experimentPlanDialog` セクションに追加

```json
"saveDisabledNoTransitions": "Cannot save because no transitions exist",
"saveDisabledNoTemplates": "Cannot save because no templates are linked to the places"
```

---

### [Layer 2] STEP 3: TaskRegistrationTab.tsx — warning を error + return に変更

**変更ファイル**: `frontend/src/components/project/TaskRegistrationTab.tsx`

- [ ] `handleSave` 内の指示・実験計画チェック部分を変更する（line 396〜400）

```typescript
// 変更前: warning のみで続行
if (!hasUnsent && !hasExperimentPlan) {
  message.warning(t('taskRegistration.messages.requireInstruction'));
}

// 変更後: error + return で中断
if (!hasUnsent && !hasExperimentPlan) {
  message.error(t('taskRegistration.messages.requireInstruction'));
  return;
}
```

---

### [Layer 3] STEP 4: SQL 追加 — `countByProject.sql`（新規作成）

- [ ] `backend/src/sql/queries/transition_data/countByProject.sql` を新規作成する

```sql
-- トランジション数カウント（プロジェクト単位）
-- task_no > 0 の実績行のみ対象（task_no=0 は順序管理行で status=NULL のため除外）
SELECT COUNT(*) AS count
FROM transition_data
WHERE organization_id = $1
  AND project_id      = $2
  AND task_no         > 0
```

---

### [Layer 3] STEP 5: Repository 追加 — `transitionDataRepository.ts`

- [ ] `TransitionDataRepository` クラスに `countByProject()` メソッドを追加する

```typescript
async countByProject(
  organizationId: string,
  projectId: string,
  client: PoolClient
): Promise<number> {
  try {
    const query = await loadSqlFile('transition_data/countByProject.sql');
    const result = await client.query(query, [organizationId, projectId]);
    return parseInt(result.rows[0]?.count ?? '0', 10);
  } catch (error) {
    throw new DatabaseError(
      'Database error occurred while counting transitions by project',
      error as Error
    );
  }
}
```

---

### [Layer 3] STEP 6: エラーコード追加 — `errorCodes.ts`（バックエンド）

- [ ] `E7014 = 'E7014'; // トランジション未登録` を追加する
- [ ] `E7015 = 'E7015'; // 実験計画未登録` を追加する
- [ ] `ErrorCode` 型に `typeof E7014`, `typeof E7015` を追加する
- [ ] `LEGACY_CODE_MAP` に以下を追加する

```typescript
CHECKOUT_NO_TRANSITIONS:   E7014,
CHECKOUT_NO_EXPERIMENT_PLAN: E7015,
```

---

### [Layer 3] STEP 7: Service 修正 — `projectService.ts`

- [ ] `checkout()` 内「バリデーション3」の直後にバリデーション4・バリデーション5を追加する
- [ ] 後続の `new TransitionDataRepository()` (line 722) を削除し、バリデーション4のインスタンスを再利用する

**バリデーション4: トランジション存在チェック**

```typescript
// バリデーション4: トランジション存在チェック
const transitionDataRepository = new TransitionDataRepository();
const transitionCount = await transitionDataRepository.countByProject(
  organizationId, projectId, client
);
if (transitionCount === 0) {
  await client.query('ROLLBACK');
  return {
    success: false,
    error: {
      code: 'CHECKOUT_NO_TRANSITIONS',
      message: 'トランジションが登録されていません。タスク登録でトランジションを含むMAIMLを設定してください',
      details: { projectId, projectName: project.project_name, transitionCount: 0 },
    },
  };
}
```

**バリデーション5: 実験計画存在チェック**

```typescript
// バリデーション5: 実験計画存在チェック
// experiment_plan テーブルに planned_values が実際に登録されているか確認する
// findByProject はトランザクション外で呼ぶため client を使わず pool 経由（既存の使い方に準拠）
const experimentPlans = await experimentPlanRepository.findByProject(
  organizationId, projectId
);
const hasValidPlan = experimentPlans.some(
  (p) => p.planned_values != null
);
if (!hasValidPlan) {
  await client.query('ROLLBACK');
  return {
    success: false,
    error: {
      code: 'CHECKOUT_NO_EXPERIMENT_PLAN',
      message: '実験計画が登録されていません。実験計画ダイアログで計画を保存してからチェックアウトしてください',
      details: { projectId, projectName: project.project_name },
    },
  };
}
```

> **設計判断**: `experimentPlanRepository.findByProject` は既存の `checkout()` 内でも COMMIT 後の non-fatal 処理（MAIML 書き込み）で使用されている。バリデーションとして ROLLBACK 前に使う場合も同様のトランザクション外呼び出しで問題ない（SELECT のみ）。

---

### [Layer 3] STEP 8: エラーコード追加 — `errorUtils.ts`（フロントエンド）

- [ ] `E7014 = 'E7014'; // トランジション未登録` 定数を追加する
- [ ] `E7015 = 'E7015'; // 実験計画未登録` 定数を追加する
- [ ] `ErrorCode` 型に `typeof E7014`, `typeof E7015` を追加する
- [ ] `ERROR_CODE_TO_KEY` マップに以下を追加する

```typescript
E7014:                       'errors.E7014',
E7015:                       'errors.E7015',
CHECKOUT_NO_TRANSITIONS:     'errors.CHECKOUT_NO_TRANSITIONS',
CHECKOUT_NO_EXPERIMENT_PLAN: 'errors.CHECKOUT_NO_EXPERIMENT_PLAN',
```

---

### [Layer 3] STEP 9: エラーハンドリング追加 — `useProjectActions.tsx`

- [ ] `handleToggleCheckout()` の `switch (errorCode)` に以下を追加する

```typescript
case 'CHECKOUT_NO_TRANSITIONS':
  message.error(t('project.checkoutErrorNoTransitions'));
  break;
case 'CHECKOUT_NO_EXPERIMENT_PLAN':
  message.error(t('project.checkoutErrorNoExperimentPlan'));
  break;
```

---

### [Layer 3] STEP 10: ロケールファイル追加（Layer 3 分）

- [ ] `ja.json` の `errors` セクションに追加

```json
"E7014": "トランジションが登録されていません",
"E7015": "実験計画が登録されていません",
"CHECKOUT_NO_TRANSITIONS": "トランジションが登録されていません",
"CHECKOUT_NO_EXPERIMENT_PLAN": "実験計画が登録されていません"
```

- [ ] `ja.json` の `project` セクションに追加

```json
"checkoutErrorNoTransitions": "トランジションが登録されていません。トランジションを含むMAIMLを設定してからタスク登録してください",
"checkoutErrorNoExperimentPlan": "実験計画が登録されていません。実験計画ダイアログで計画を保存してからチェックアウトしてください"
```

- [ ] `en.json` の `errors` セクションに追加

```json
"E7014": "No transitions registered",
"E7015": "No experiment plan registered",
"CHECKOUT_NO_TRANSITIONS": "No transitions registered",
"CHECKOUT_NO_EXPERIMENT_PLAN": "No experiment plan registered"
```

- [ ] `en.json` の `project` セクションに追加

```json
"checkoutErrorNoTransitions": "No transitions registered. Please set a MAIML containing transitions and re-register tasks",
"checkoutErrorNoExperimentPlan": "No experiment plan registered. Please save the plan in the experiment plan dialog before checking out"
```

---

## 影響範囲の分析

### 既存の正常系への影響

- **Layer 1**: トランジション1件以上 かつ Placeあり+テンプレートあり の正常ケースでは `saveDisabled = false` となり、既存の保存動作に変化なし
- **Layer 2**: 指示または実験計画が存在する場合はチェックをパスするため既存動作に変化なし
- **Layer 3**: `transition_data` が1件以上ある通常フローではバリデーションをパスするため既存動作に変化なし

### セキュリティ・マルチテナント

`countByProject()` は `organization_id` を必須条件とするためマルチテナント分離を保証する。

---

## 設計上の判断事項

### ① 3層ガードの意図

| Layer | 場所 | 検出方法 | 目的 |
|-------|------|---------|------|
| 1 | ExperimentPlanDialog FE | transitions/templates の状態から UI 制御 | 最上流での早期ブロック |
| 2 | TaskRegistrationTab FE | 指示・実験計画の存在確認 | 保存前の必須要件チェック |
| 3 | checkout BE | DB の `transition_data` 実績行をカウント | 最終防衛線（DB整合性保証） |

### ② taskRegistrationService.ts へのバリデーション追加は対象外

Layer 2 のフロントエンド中断により「トランジションなし MAIML」での保存自体がブロックされる。バックエンドの最終防衛は Layer 3（チェックアウト時）で担保するため、`taskRegistrationService.ts` へのバリデーション追加は対象外とする。

### ③ `task_no > 0` 条件の必要性

`transition_data` の `task_no = 0` 行は順序管理行（status=NULL）。これを含めると「実績なし」なのに1件カウントされる誤検出が起こりうる。`updatePrerequisiteIds.sql` と同じ `AND task_no > 0` 方針で統一する。

### ④ ExperimentPlanDialog の「フォールバックケース」は制御対象外

Placeを持たないトランジションに対しては全テンプレートをフォールバック表示する仕様がある。この場合は「テンプレートがない」のではなく「関連付けが未設定」な状態であり、保存を止めるべきではないため対象外とする。

---

## リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 既存の正常系フローへの破壊 | 高 | 低 | トランジション1件以上のMAIMLで動作確認（テストケース5） |
| `saveDisabled` 判定の誤検出（フォールバックケース） | 中 | 低 | `allPlaceIds.length === 0` の場合はスキップする実装で対処 |
| `countByProject` の `task_no > 0` 条件漏れ | 中 | 低 | SQL レビュー時に `updatePrerequisiteIds.sql` と比較確認 |
| ロケールキー重複・配置ミス | 低 | 低 | JSON 構造を確認してから追加 |

---

## 変更ファイル一覧

| # | ファイルパス | 変更種別 | Layer | 変更概要 |
|---|------------|---------|-------|-------|
| 1 | `frontend/src/components/project/ExperimentPlanDialog.tsx` | 修正 | 1 | `saveDisabled` フラグ追加・保存ボタンに適用・理由テキスト追加 |
| 2 | `frontend/src/locales/ja.json` | 修正 | 1, 3 | `saveDisabledNoTransitions` / `saveDisabledNoTemplates` / `checkoutErrorNoTransitions` / `checkoutErrorNoExperimentPlan` / `errors.E7014` / `errors.E7015` 追加 |
| 3 | `frontend/src/locales/en.json` | 修正 | 1, 3 | 同上（英語版） |
| 4 | `frontend/src/components/project/TaskRegistrationTab.tsx` | 修正 | 2 | `warning` + 続行 → `error` + `return` に変更 |
| 5 | `backend/src/sql/queries/transition_data/countByProject.sql` | 新規作成 | 3 | プロジェクト単位カウント SQL |
| 6 | `backend/src/repositories/transitionDataRepository.ts` | 修正 | 3 | `countByProject()` メソッド追加 |
| 7 | `backend/src/enums/errorCodes.ts` | 修正 | 3 | `E7014` / `E7015` 追加・型定義・LEGACY_CODE_MAP 追加 |
| 8 | `backend/src/services/projectService.ts` | 修正 | 3 | バリデーション4（トランジション）・バリデーション5（実験計画）追加・`transitionDataRepository` インスタンス統一 |
| 9 | `frontend/src/utils/errorUtils.ts` | 修正 | 3 | `E7014` / `E7015` 定数・型・マッピング追加 |
| 10 | `frontend/src/hooks/project/useProjectActions.tsx` | 修正 | 3 | `CHECKOUT_NO_TRANSITIONS` / `CHECKOUT_NO_EXPERIMENT_PLAN` ケース追加 |

---

## テスト計画

### 手動テスト

#### テストケース 1: トランジションなし MAIML で実験計画ダイアログを開く（Layer 1）
- 手順: トランジションを含まない MAIML を登録 → 実験計画ダイアログを開く
- 期待値: 保存ボタンが非活性になり「トランジションが存在しないため保存できません」が表示される
- 確認観点: 保存ボタンをクリックしても保存APIが呼ばれないこと

#### テストケース 2: Placeあり+テンプレートなし で実験計画ダイアログを開く（Layer 1）
- 手順: Placeを持つトランジションがあるがテンプレートが対応していない MAIML を使用 → 実験計画ダイアログを開く
- 期待値: 保存ボタンが非活性になり「Placeに紐づくテンプレートが存在しないため保存できません」が表示される

#### テストケース 3: 指示も実験計画もない状態でタスク登録保存（Layer 2）
- 手順: 指示を追加せず、実験計画も未保存のままタスク登録の保存ボタンを押す
- 期待値: エラーメッセージ「プロジェクト指示またはタスク指示を最低1つ設定してください」が表示され保存が中断される
- 確認観点: 保存APIが呼ばれないこと（現状は warning で呼ばれてしまっていた）

#### テストケース 4: transition_data が空の状態でのチェックアウト（Layer 3 バリデーション4）
- 手順: `transition_data` が空の状態でチェックアウト API を直接呼び出す
- 期待値: 「トランジションが登録されていません。トランジションを含むMAIMLを設定してからタスク登録してください」エラーが表示される
- 確認観点: `checkout_status` が変化していないこと

#### テストケース 5: 実験計画が登録されていない状態でのチェックアウト（Layer 3 バリデーション5）
- 手順: `transition_data` は登録済みだが `experiment_plan.planned_values` が NULL の状態でチェックアウト API を直接呼び出す
- 期待値: 「実験計画が登録されていません。実験計画ダイアログで計画を保存してからチェックアウトしてください」エラーが表示される
- 確認観点: `checkout_status` が変化していないこと

#### テストケース 6: 正常フロー リグレッション確認
- 手順: トランジション・テンプレートを含む MAIML で指示または実験計画を設定 → タスク登録 → チェックアウト
- 期待値: 従来通りチェックアウト成功、`transition_data` が PREPARING 状態で登録される
- 確認観点: WorkRecordPanel で「開始」ボタンが活性になること

---

## 承認記録

- **計画書提示日時**: 2026-09-09 10:00
- **承認日時**: 2026-09-09
- **承認者コメント**: 承認します。
