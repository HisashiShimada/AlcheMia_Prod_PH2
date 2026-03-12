# タスク計画書: メソッド順番固定化（チェックイン後も維持）

## メタデータ
- **作成日時**: 2026-03-10 11:20
- **タスクID**: method-order-lock-on-checkin
- **優先度**: 高
- **推定工数**: 1時間

## 1. タスク概要

プロジェクト管理画面で一度チェックアウトしたプロジェクトを再度チェックイン状態にしたときに、表示されるメソッドの順番を変えられないようにする。

## 2. 目的と期待される成果

### 目的
- 一度チェックアウトしたプロジェクトは、チェックイン後も全メソッドの順序変更を禁止する
- ワーカーが作業したメソッドの実行順序を保護する

### 期待される成果
- [x] 問題の原因特定
- [x] フロントエンドの判定ロジック修正
- [ ] 動作確認

## 3. 問題の原因

### 要件の明確化

**「一度チェックアウトしたプロジェクトは、チェックイン後も全メソッドの順序変更を禁止したい」**

理由：
- チェックイン状態では`worker_linked_flg=true`のメソッドを複製している
- その順番を保護するため、全メソッドの順序変更を禁止する

### 現状の動作フロー

```
1. プロジェクト作成（project_status=0: プロジェクト計画中）
   → メソッドの順序変更: 可能

2. プロジェクトをチェックアウト（checkout_status=1）
   → project_task.worker_linked_flg = true （全タスク）
   → メソッドの順序変更: 不可（isCheckoutLocked=true）

3. プロジェクトをチェックイン（checkout_status=0）
   → project_task.worker_linked_flg = true （維持）
   → メソッドの順序変更: 可能 ← 問題！
```

### 問題点

**`TaskRegistrationTab.tsx`の`isCheckoutLocked`判定が不適切**

現状の判定：
```typescript
// ProjectManagement.tsx
const isProjectCheckedOut = selectedProject?.isCheckedOut === true;

// TaskRegistrationTab に渡す
<TaskRegistrationTab
  isCheckoutLocked={isProjectCheckedOut}  // チェックアウト中のみtrue
/>
```

期待する判定：
```typescript
// プロジェクトステータスが「プロジェクト計画中(0)」以外は順序変更不可
const isOrderChangeLocked = selectedProject?.status !== 0;
```

**結論**: `isCheckoutLocked`の判定ロジックを変更し、「一度でもチェックアウトしたプロジェクト（=プロジェクトステータスが0以外）」では順序変更を禁止する必要があります。

## 4. 実装ステップ

### Phase 1: コード確認
- [x] TaskRegistrationTab.tsxの順序変更制御ロジック確認
- [x] projectService.tsのcheckout/checkin処理確認
- [x] worker_linked_flgの更新箇所確認

### Phase 2: 実装修正
- [x] ProjectManagement.tsxの判定ロジック修正
- [x] 新しい判定ロジック`isOrderChangeLocked`を追加
- [x] TaskRegistrationTabとInstructionRegistrationTabに適用

### Phase 3: 動作確認
- [ ] プロジェクト計画中（status=0）: 順序変更可能
- [ ] チェックアウト後（status=1以降）: 順序変更不可
- [ ] チェックイン後（status=1のまま）: 順序変更不可（継続）

## 5. 影響範囲

### 変更するファイル

1. **frontend/src/components/project/ProjectManagement.tsx**
   - `isCheckoutLocked`の判定ロジックを変更
   - プロジェクトステータスベースの判定に変更

### 変更内容

#### 修正前
```typescript
// チェックアウト中のみtrue
const isProjectCheckedOut = useMemo(() => {
  return selectedProject?.isCheckedOut === true;
}, [selectedProject]);

<TaskRegistrationTab
  isCheckoutLocked={isProjectCheckedOut}
/>
```

#### 修正後
```typescript
// プロジェクトステータスが「プロジェクト計画中(0)」以外はtrue
const isOrderChangeLocked = useMemo(() => {
  // プロジェクト未選択時はfalse
  if (!selectedProject) return false;
  
  // プロジェクトステータスが0（プロジェクト計画中）以外は順序変更不可
  return selectedProject.status !== 0;
}, [selectedProject]);

<TaskRegistrationTab
  isCheckoutLocked={isOrderChangeLocked}
/>
```

## 6. 技術的詳細

### データフロー

```
チェックアウト時:
project_task.worker_linked_flg = false
  ↓ checkout処理
project_task.worker_linked_flg = true ← updateWorkerLinkedFlgByProject()

チェックイン時:
project_task.worker_linked_flg = true
  ↓ checkin処理
project_task.worker_linked_flg = true ← そのまま維持（更新処理なし）

タスク登録タブ:
- worker_linked_flg=true のメソッドは順序変更不可
- worker_linked_flg=false のメソッドのみ編集可能
```

### 判定ロジックの詳細

**プロジェクトステータスと順序変更可否の対応:**

| project_status | ステータス名 | 順序変更可否 |
|----------------|--------------|--------------|
| 0 | プロジェクト計画中 | ✅ 可能 |
| 1 | タスク実行待ち | ❌ 不可 |
| 2 | タスク実行中 | ❌ 不可 |
| 3 | タスク結果レビュー待ち | ❌ 不可 |
| 4 | プロジェクト完了 | ❌ 不可 |
| 5 | タスク異常終了 | ❌ 不可 |

**理由:**
- プロジェクト計画中（status=0）: まだチェックアウトされていない → 自由に編集可能
- それ以外: 一度でもチェックアウトされた → 順序を固定

## 7. テスト計画

### 手動テスト

#### テスト1: プロジェクト計画中の順序変更
1. 新規プロジェクトを作成（status=0: プロジェクト計画中）
2. タスク登録タブを開く
3. メソッドの順序変更を試みる
4. **期待結果**: 順序変更が**可能**

#### テスト2: チェックアウト後の順序変更
1. プロジェクトをチェックアウト（status=1: タスク実行待ち）
2. タスク登録タブを開く
3. メソッドの順序変更を試みる
4. **期待結果**: 順序変更が**不可**（ドラッグ&ドロップ無効、入力フィールド無効）

#### テスト3: チェックイン後の順序変更
1. プロジェクトをチェックイン（status=1のまま: タスク実行待ち）
2. タスク登録タブを開く
3. メソッドの順序変更を試みる
4. **期待結果**: 順序変更が**不可**（継続して無効化）

#### テスト4: プロジェクトステータス確認
```sql
-- プロジェクトステータスと順序変更可否を確認
SELECT 
  project_id,
  project_name,
  project_status,
  checkout_status,
  CASE 
    WHEN project_status = 0 THEN '順序変更可能'
    ELSE '順序変更不可'
  END as order_change_status
FROM project
WHERE organization_id = 'xxx';
```

## 8. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 実装が既に正しく動作している | 低 | 高 | 実際の動作を確認し、問題が再現しない場合はドキュメント更新のみ |
| フロントエンドのキャッシュ問題 | 中 | 中 | プロジェクト一覧の再取得を確認 |
| 既存データのマイグレーション | 中 | 低 | 既存のworker_linked_flgがnullの場合の対応 |

## 9. 実装の注意点

### 現状のコードで既に正しい実装になっている理由

1. **チェックアウト時**: `updateWorkerLinkedFlgByProject()`で`worker_linked_flg=true`に更新
2. **チェックイン時**: `worker_linked_flg`を更新する処理が存在しない → 維持される
3. **タスク登録タブ**: `workerLinkedFlg`プロパティで制御 → 正しく動作

### 注意事項

1. **プロジェクトステータスの遷移**
   - 0 (プロジェクト計画中) → 1 (タスク実行待ち): チェックアウト時
   - 1以降は自動または手動で遷移
   - 一度status=1以降になったら、0には戻らない

2. **後方互換性**
   - 既存のプロジェクトでもstatus値ベースで判定されるため問題なし
   - worker_linked_flgの値は判定に使用しない（個別メソッドの制御のみ）

3. **UI表示**
   - 順序変更不可の場合、ドラッグハンドルとSelectボックスが無効化される
   - ユーザーには視覚的にわかりやすく表示される

## 10. 承認記録

- **計画書提示日時**: 2026-03-10 11:20
- **承認日時**: （承認時に記入）
- **承認者コメント**: （ユーザーからのフィードバック）

## 11. 実施記録

### 実施日時
開始: 2026-03-10 11:20
完了: 2026-03-10 11:26

### 実装内容

#### 修正ファイル
- `frontend/src/components/project/ProjectManagement.tsx`

#### 実装した変更

1. **新しい判定ロジックの追加**
```typescript
// メソッドの順序変更可否を判定（プロジェクトステータスベース）
const isOrderChangeLocked = useMemo(() => {
  if (!selectedProject) return false;
  // プロジェクトステータスが0（プロジェクト計画中）以外は順序変更不可
  return selectedProject.status !== 0;
}, [selectedProject]);
```

2. **TaskRegistrationTabへの適用**
```typescript
<TaskRegistrationTab
  projectId={selectedProject.id}
  projectName={selectedProject.name}
  isActive={currentTab === 'task_registration'}
  isCheckoutLocked={isOrderChangeLocked}  // 新しい判定ロジックを使用
/>
```

3. **InstructionRegistrationTabへの適用**
```typescript
<InstructionRegistrationTab
  projectId={selectedProject.id}
  projectName={selectedProject.name}
  isActive={currentTab === 'instruction_registration'}
  isCheckoutLocked={isOrderChangeLocked}  // 新しい判定ロジックを使用
/>
```

### 計画からの変更点

- 判定名を`isCheckoutLocked`から`isOrderChangeLocked`に変更する案は採用せず、既存の`isProjectCheckedOut`を維持しつつ、新しい判定ロジック`isOrderChangeLocked`を追加
- これにより、チェックアウト状態の判定と順序変更可否の判定を分離し、後方互換性を維持

### 発生した問題と解決方法

**問題1: チェックボックスも無効化されてしまった**
- 原因: `isCheckoutLocked`がチェックボックスの無効化判定にも使用されていた
- 解決: チェックボックス専用の判定関数`isCheckboxDisabled`を追加し、`isCheckoutLocked`を除外

**修正内容:**
```typescript
// チェックボックス以外の判定（順序変更・入力フィールド）
const isRowDisabled = useCallback((record: TaskDetail) => {
  return isSaving || loadingMethods || isCheckoutLocked || record.workerLinkedFlg;
}, [isSaving, loadingMethods, isCheckoutLocked]);

// チェックボックス専用の判定（isCheckoutLockedを含めない）
const isCheckboxDisabled = useCallback((record: TaskDetail) => {
  return isSaving || loadingMethods || record.workerLinkedFlg;
}, [isSaving, loadingMethods]);
```

### 最終的な成果物
- [x] コード修正完了（ProjectManagement.tsx）- 2回目実装完了
- [x] チェックボックス問題修正（TaskRegistrationTab.tsx）- 2回目実装完了
- [x] 動作確認（ユーザー確認）
- [x] ドキュメント更新（PLAN.md）
- [x] 再実装完了（ロールバック後）

### 再実装の経緯
- ユーザーによる誤ったロールバック後、同じ修正を再度実装
- 実装内容は初回と同一

## 12. 振り返り

### うまくいった点

1. **プロジェクトステータスベースの判定導入**
   - シンプルで分かりやすいロジック
   - 後方互換性を維持

2. **段階的な修正アプローチ**
   - ProjectManagement.tsxで判定ロジックを追加
   - TaskRegistrationTab.tsxで細かい制御を調整

### 改善が必要な点

1. **初回実装での考慮不足**
   - チェックボックスの動作まで考慮していなかった
   - 実際の使用シーンを想定したテストが不足

2. **判定ロジックの複雑さ**
   - `isCheckoutLocked`と`isOrderChangeLocked`の使い分け
   - 今後、同様の制御が増えると管理が複雑になる可能性

### 学んだこと

1. **UIの部分的な制御の重要性**
   - 全体を無効化するのではなく、必要な部分のみを制御
   - ユーザビリティを損なわない実装が必要

2. **Props名の重要性**
   - `isCheckoutLocked`という名前が誤解を招いた
   - より具体的な名前（`isOrderChangeLocked`など）を検討すべき

3. **段階的な確認の必要性**
   - 実装 → ユーザー確認 → 修正のサイクルが有効
   - 早期のフィードバックで問題を素早く解決
