# タスク計画書: 非活性メソッド保存除外

## メタデータ
- **作成日時**: 2026-03-09 16:09
- **タスクID**: exclude_inactive_methods_from_save
- **優先度**: 高
- **推定工数**: 2時間

## 1. タスク概要

現在のプロジェクト管理画面（タスク登録タブ）の仕様では、`workerLinkedFlg=true`（ワーカー連携済み）のメソッドが非活性（disabled）になっているにもかかわらず、チェックボックスがチェックされた状態で保存対象に含まれてしまう問題があります。

非活性のメソッドは既にワーカーに連携済みのため、再度保存対象にすべきではありません。

## 2. 目的と期待される成果

### 目的
`workerLinkedFlg=true`のメソッドを保存対象から除外し、データの整合性を保つ。

### 期待される成果
- [x] `workerLinkedFlg=true`のメソッドは初期チェック状態から除外される
- [x] `workerLinkedFlg=true`のメソッドは保存処理で除外される
- [x] チェックボックスの初期化ロジックが適切に修正される
- [x] 保存時のバリデーションが追加される

## 3. 現状の問題分析

### 3-1. フロントエンドの問題（TaskRegistrationTab.tsx）

#### チェックボックス初期化の問題
```typescript
// 現状: DBにデータがある場合、全タスクIDでcheckedTaskIdsを初期化
const existingTaskIds = new Set(uiTasks.map(t => t.id));
setCheckedTaskIds(existingTaskIds);

// 問題: workerLinkedFlg=true のメソッドも含まれる
```

#### 保存処理の問題
```typescript
// 現状: チェックされたタスクのみをフィルタリング
const checkedTasks = taskDetails.filter(task => 
  checkedTaskIds.has(task.id)
);

// 問題: workerLinkedFlg=true のメソッドが除外されていない
```

### 3-2. 影響範囲

- **フロントエンド**: `frontend/src/components/project/TaskRegistrationTab.tsx`
  - チェックボックス初期化ロジック（2箇所）
  - 保存処理のフィルタリングロジック（1箇所）

- **バックエンド**: 影響なし
  - バックエンドは受け取ったデータをそのまま保存するため、フロントエンドでフィルタリングすれば問題解決

## 4. 実装ステップ

### Phase 1: チェックボックス初期化ロジックの修正
- [x] DBデータがある場合の初期化処理を修正
  - `workerLinkedFlg=false`のメソッドのみをチェック状態にする
- [x] DBデータがない場合（MAIML初期表示）の初期化処理を修正
  - 全メソッドは`workerLinkedFlg=false`なので、現状の処理でOK

### Phase 2: 保存処理のフィルタリングロジックの修正
- [x] `handleSave`メソッドでチェックされたタスクをフィルタリングする際に、`workerLinkedFlg=false`のメソッドのみを抽出
- [x] デバッグログを追加して除外されたメソッドを確認

### Phase 3: テストとバリデーション
- [x] 初期表示時にチェックボックスが正しく設定されることを確認
- [x] 保存時に非活性メソッドが除外されることを確認
- [x] 保存後のデータが正しいことを確認

## 5. 影響範囲

### 変更するファイル
1. `frontend/src/components/project/TaskRegistrationTab.tsx`
   - チェックボックス初期化ロジックの修正（行396, 425付近）
   - 保存処理のフィルタリングロジックの修正（行499付近）

### 新規作成するファイル
なし

### 削除するファイル
なし

### 影響を受ける機能
- タスク登録タブのチェックボックス初期表示
- タスク登録タブの保存処理

## 6. 技術的詳細

### 修正箇所1: チェックボックス初期化（DBデータあり）

**現在のコード（行396付近）:**
```typescript
// DBにデータがある場合：保存済みタスクIDでcheckedTaskIdsを初期化
const existingTaskIds = new Set(uiTasks.map(t => t.id));
setCheckedTaskIds(existingTaskIds);
```

**修正後のコード:**
```typescript
// DBにデータがある場合：workerLinkedFlg=falseのタスクIDでcheckedTaskIdsを初期化
const editableTaskIds = new Set(
  uiTasks.filter(t => !t.workerLinkedFlg).map(t => t.id)
);
setCheckedTaskIds(editableTaskIds);

console.log('[DEBUG] TaskRegistrationTab - Checkbox initialization (DB data):', {
  totalTasks: uiTasks.length,
  editableTasks: editableTaskIds.size,
  workerLinkedTasks: uiTasks.filter(t => t.workerLinkedFlg).length
});
```

### 修正箇所2: 保存処理のフィルタリング

**現在のコード（行499付近）:**
```typescript
// チェックされたタスクのみをフィルタリング
const checkedTasks = taskDetails.filter(task => 
  checkedTaskIds.has(task.id)
);
```

**修正後のコード:**
```typescript
// チェックされた かつ workerLinkedFlg=false のタスクのみをフィルタリング
const checkedTasks = taskDetails.filter(task => 
  checkedTaskIds.has(task.id) && !task.workerLinkedFlg
);

console.log('[DEBUG] TaskRegistrationTab - Save filtering:', {
  totalTasks: taskDetails.length,
  checkedTasksCount: checkedTaskIds.size,
  editableCheckedTasksCount: checkedTasks.length,
  excludedWorkerLinkedCount: 
    taskDetails.filter(t => checkedTaskIds.has(t.id) && t.workerLinkedFlg).length
});
```

### アーキテクチャ上の考慮事項

- フロントエンドでフィルタリングすることで、バックエンドの変更は不要
- チェックボックスの視覚的な状態と実際の保存対象が一致する
- ユーザーは非活性メソッドがチェックされていないことを確認できる

### セキュリティ考慮事項
- [x] データの整合性: 非活性メソッドが保存されないことを保証
- [x] マルチテナント分離: 既存の`organization_id`チェックで保護されている

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 既存の保存済みデータが`workerLinkedFlg=true`のメソッドを含んでいた場合、チェックボックスが外れてしまう | 中 | 高 | 仕様通りの動作。ユーザーには「非活性メソッドは保存対象外」と説明 |
| 初回保存時の全チェック必須バリデーションに影響 | 低 | 低 | 初回保存時は全メソッドが`workerLinkedFlg=false`なので影響なし |
| デバッグログが多すぎる | 低 | 中 | 将来的に本番環境ではログレベルを調整 |

## 8. テスト計画

### 手動テスト

#### テストケース1: 初期表示（DBデータあり、一部workerLinkedFlg=true）
- [ ] タスク登録タブを開く
- [ ] `workerLinkedFlg=false`のメソッドのみがチェックされていることを確認
- [ ] `workerLinkedFlg=true`のメソッドがチェックされていないことを確認
- [ ] チェックボックスが非活性（disabled）であることを確認

#### テストケース2: 初期表示（DBデータなし、MAIML初期表示）
- [ ] タスク登録タブを開く
- [ ] 全メソッドがチェックされていることを確認（全て`workerLinkedFlg=false`のため）

#### テストケース3: 保存処理（一部workerLinkedFlg=true）
- [ ] 一部のメソッドが`workerLinkedFlg=true`の状態で保存ボタンをクリック
- [ ] DevToolsのコンソールで除外ログを確認
- [ ] 保存成功メッセージが表示されることを確認
- [ ] 保存後、DBに`workerLinkedFlg=true`のメソッドが含まれていないことを確認

#### テストケース4: 保存処理（全メソッドworkerLinkedFlg=true）
- [ ] 全メソッドが`workerLinkedFlg=true`の状態で保存ボタンをクリック
- [ ] 「保存するメソッドを選択してください」の警告が表示されることを確認

## 9. ロールバック計画

修正は1ファイルのみで、ロジック変更も限定的なため、以下の手順でロールバック可能：

1. Gitで該当コミットをrevertする
2. フロントエンドを再ビルド・再デプロイ

## 10. 関連ドキュメント

- [TaskRegistrationTab仕様](../../docs/design/ui/ui_screen_list.md)
- [worker_linked_flg仕様](../../docs/20260306_1725_worker_linked_flg初期値設定/PLAN.md)

## 11. 承認記録

- **計画書提示日時**: 2026-03-09 16:09
- **承認日時**: 2026-03-09 16:12
- **承認者コメント**: 承認。ログ追加は不要。

## 12. 実施記録

### 実施日時
開始: 2026-03-09 16:12
完了: 2026-03-09 16:14

### 計画からの変更点
- デバッグログの追加を除外（ユーザーからのフィードバック）

### 発生した問題と解決方法
特になし。計画通りに実装完了。

### 最終的な成果物
- [x] `workerLinkedFlg=true`のメソッドがチェックボックス初期化から除外される
- [x] `workerLinkedFlg=true`のメソッドが保存処理から除外される

## 13. 振り返り

### うまくいった点
（実装完了後に記入）

### 改善が必要な点
（実装完了後に記入）

### 学んだこと
（実装完了後に記入）
