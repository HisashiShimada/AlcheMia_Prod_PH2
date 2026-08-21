# タスク計画書: 指示送信ボタンをチェックアウト機能に統合

## メタデータ
- **作成日時**: 2026-08-18
- **タスクID**: 20260818_0000
- **優先度**: 中
- **推定工数**: 1〜2時間

---

## 1. タスク概要

プロジェクト管理画面の「指示登録」タブにある「指示を送信」ボタンを削除し、
その機能（`sendInstructions` API 呼び出し）をチェックアウトボタンの処理に統合する。

チェックアウト実行時に未送信の指示を自動的に一括送信してからチェックアウトを行うことで、
ユーザーが「指示送信 → チェックアウト」という2ステップ操作を行う必要をなくす。

---

## 2. 目的と期待される成果

- [ ] 「指示を送信」ボタンが指示登録タブから削除されている
- [ ] チェックアウトボタン押下時に、自動的に指示が送信されてからチェックアウトが実行される
- [ ] チェックアウト成功時のメッセージは従来のまま（指示送信は無言で自動実行）
- [ ] バックエンドの `CHECKOUT_UNSENT_INSTRUCTIONS` バリデーションが削除されている

---

## 3. 現状の動作フロー

```
[現状]
ユーザーが「指示を送信」ボタン押下
  └─ InstructionRegistrationTab.handleSubmitInstructions()
       └─ sendInstructions API (POST /projects/:id/instructions/send)
            └─ 未送信指示を送信済みに更新 + maiml_event_log に書き込み

ユーザーが「チェックアウト」ボタン押下
  └─ useProjectActions.handleToggleCheckout()
       ├─ [バリデーション] 未送信指示があれば CHECKOUT_UNSENT_INSTRUCTIONS エラー
       └─ checkoutProject API
```

---

## 4. 変更後の動作フロー

```
[変更後]
ユーザーが「チェックアウト」ボタン押下
  └─ useProjectActions.handleToggleCheckout()
       ├─ (1) sendInstructions API 自動呼び出し（無言）
       ├─ (2) checkoutProject API 呼び出し
       └─ 「プロジェクト「XXX」をチェックアウトしました」メッセージ表示
```

---

## 5. 実装ステップ

### Step 1: タスク計画書作成
- [x] `docs/tasks/20260818_0000_指示送信ボタンをチェックアウトに統合/PLAN.md` 作成

### Step 2: `useProjectActions.tsx` の修正
- [ ] `sendInstructions` を `@/services/projectApiService` から import に追加
- [ ] `handleToggleCheckout` のチェックアウト処理に `sendInstructions(selectedProject.id, {})` 呼び出しを追加（`checkoutProject` の前）
- [ ] `sendInstructions` でエラーが発生した場合はエラーメッセージを表示してチェックアウトを中断
- [ ] `handleInstructionsSubmit` コールバック関数を削除
- [ ] `return` 文から `handleInstructionsSubmit` を除去
- [ ] エラーハンドリングから `CHECKOUT_UNSENT_INSTRUCTIONS` ケースを削除

### Step 3: `InstructionRegistrationTab.tsx` の修正
- [ ] `onInstructionsSubmit` prop をインターフェース定義から削除
- [ ] `onInstructionsSubmit` を関数引数から削除
- [ ] `isSending` state を削除（`const [isSending, setIsSending] = useState<boolean>(false)` 削除）
- [ ] `handleSubmitInstructions` 関数全体を削除
- [ ] 「指示を送信」ボタンの UI ブロックを削除
- [ ] `SendOutlined` を import から削除
- [ ] 残る edit/delete ボタンの `disabled` 条件から `isSending ||` を削除

### Step 4: `ProjectInstructionTabContent.tsx` の修正
- [ ] `onInstructionsSubmit` prop をインターフェース定義から削除
- [ ] コンポーネント引数から `onInstructionsSubmit` を削除
- [ ] `InstructionRegistrationTab` への `onInstructionsSubmit={onInstructionsSubmit}` 渡しを削除

### Step 5: `ProjectManagementInner.tsx` の修正
- [ ] `handleInstructionsSubmit` の destructure を削除
- [ ] `<ProjectInstructionTabContent ... onInstructionsSubmit={handleInstructionsSubmit} />` から `onInstructionsSubmit` 属性を削除

### Step 6: `projectService.ts`（バックエンド）の修正
- [ ] バリデーション4「未送信指示チェック」ブロック（`hasUnsentInstructions` 〜 `CHECKOUT_UNSENT_INSTRUCTIONS`）を削除

### Step 7: 動作確認
- [ ] TypeScript コンパイルエラーがないことを確認
- [ ] 指示登録タブに「指示を送信」ボタンが表示されないことを確認
- [ ] チェックアウトボタン押下時に正常動作することを確認

---

## 6. 変更ファイル一覧

| No. | ファイルパス | 変更種別 | 変更内容 |
|-----|------------|---------|---------|
| 1 | `frontend/src/hooks/project/useProjectActions.tsx` | 修正 | sendInstructions をcheckout前に自動呼び出し、handleInstructionsSubmit 削除 |
| 2 | `frontend/src/components/project/InstructionRegistrationTab.tsx` | 修正 | 「指示を送信」ボタン・関連ロジック削除 |
| 3 | `frontend/src/components/project/subcomponents/tabs/ProjectInstructionTabContent.tsx` | 修正 | onInstructionsSubmit prop 削除 |
| 4 | `frontend/src/components/project/ProjectManagementInner.tsx` | 修正 | handleInstructionsSubmit の参照削除 |
| 5 | `backend/src/services/projectService.ts` | 修正 | CHECKOUT_UNSENT_INSTRUCTIONS バリデーション削除 |

---

## 7. 影響範囲

- **プロジェクト管理画面**: 指示登録タブの UI 変更、チェックアウト動作変更
- **チェックアウト API**: バックエンドバリデーション削除
- **型定義への影響**: `InstructionRegistrationTabProps` から `onInstructionsSubmit` 削除
- **認証・認可への影響**: なし
- **データ保護への影響**: なし（sendInstructions の呼び出しタイミングが変わるだけ）
- **マルチテナント分離への影響**: なし

---

## 8. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| チェックアウト時に sendInstructions が失敗した場合、チェックアウトが進まない | 中 | 低 | エラーメッセージを表示してユーザーに原因を伝える |
| 指示が0件でも sendInstructions を呼ぶ無駄な API 呼び出し | 低 | 高 | 許容範囲（sentInstructionsCount: 0 で正常返却される） |

---

## 9. テスト計画

### 手動テスト
- [ ] 指示が登録されている状態でチェックアウトを実行 → 指示が自動送信されチェックアウトされること
- [ ] 指示が0件の状態でチェックアウトを実行 → チェックアウトが正常に完了すること
- [ ] 指示登録タブに「指示を送信」ボタンが表示されないこと
- [ ] 指示登録タブの編集・削除ボタンが正常に動作すること

---

## 10. 承認記録
- **計画書提示日時**: 2026-08-18
- **承認日時**: 2026-08-18（ユーザー承認済み）
- **承認者コメント**: チェックアウト成功メッセージのみ表示（指示送信は無言で自動実行）

---

## 11. 実施記録

### 実施日時
開始: 2026-08-18
完了: 2026-08-18

### 計画からの変更点
なし

### 発生した問題と解決方法
なし

### 最終的な成果物
- [x] useProjectActions.tsx 修正完了
- [x] InstructionRegistrationTab.tsx 修正完了
- [x] ProjectInstructionTabContent.tsx 修正完了
- [x] ProjectManagementInner.tsx 修正完了
- [x] projectService.ts 修正完了
