# タスク計画書: 複製メソッド保存時のexperiment_order計算問題修正

## メタデータ
- **作成日時**: 2026-03-09 16:20
- **タスクID**: fix_duplicate_method_experiment_order
- **優先度**: 高
- **推定工数**: 1時間

## 1. タスク概要

プロジェクト管理画面のタスク登録タブで複製したメソッドを保存する際、experiment_orderの計算が正しく行われない問題を修正します。

### 問題の詳細

**現状の問題**:
- 2件のメソッドが既に登録済み（workerLinkedFlg=true, experiment_order=1,2）
- 2件のメソッドを複製（workerLinkedFlg=false）
- 複製した2件のうち1件のみチェックして保存
- **期待**: experiment_order=3で保存されるべき
- **実際**: experiment_order=1で保存されてしまう

### 原因

フロントエンド（TaskRegistrationTab.tsx）の保存処理で、チェックされたタスクのみを抽出した後、その配列のindexを使ってexperiment_orderを計算しているため：

```typescript
const requestData = {
  tasks: checkedTasks.map((task, index) => ({
    ...
    experimentOrder: index + 1, // ← チェックされたタスクのindexを使用
  })),
};
```

- チェックされたタスク配列: [複製メソッド1件]
- index=0 → experimentOrder=1
- しかし、既存の登録済みメソッド（experiment_order=1,2）が存在している

## 2. 目的と期待される成果

### 目的
- 複製メソッド保存時に、既存の登録済みメソッド（workerLinkedFlg=true）のexperiment_orderを考慮した正しい順序番号を設定する

### 期待される成果
- [x] チェックされたメソッドのexperiment_orderが、既存メソッドと重複しない
- [x] workerLinkedFlg=trueのメソッドの最大experiment_orderを考慮した計算
- [x] 部分的に保存する場合でも正しい順序番号が設定される

## 3. 実装ステップ

### Phase 1: 問題箇所の特定と修正方針の決定
- [x] TaskRegistrationTab.tsxの保存処理を確認
- [x] experiment_order計算ロジックの問題を特定
- [x] 修正方針の決定（ユーザーフィードバック反映）

### Phase 2: フロントエンド修正
- [x] handleSave関数内のexperimentOrder計算ロジックを修正
- [x] 既存タスク（全体）の中での実際の位置を使用するように変更
- [x] デバッグログの追加

### Phase 3: テストケースの確認
- [ ] 既存2件 + 複製2件 → 1件のみ保存のケース
- [ ] 既存2件 + 複製2件 → 2件とも保存のケース
- [ ] 初回保存（既存0件）のケース

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/components/project/TaskRegistrationTab.tsx`
   - handleSave関数内のrequestData作成ロジックを修正
   - experimentOrderの計算方法を変更

### 影響を受ける機能
- タスク登録タブの保存機能
- 複製メソッドの保存処理

## 5. 技術的詳細

### 修正内容

**修正前**:
```typescript
const requestData = {
  tasks: checkedTasks.map((task, index) => ({
    methodId: task.methodId,
    experimentCondition: task.experimentCondition,
    trialCount: task.trialCount,
    experimentOrder: index + 1, // チェックされたタスクのindexを使用
  })),
  ...
};
```

**修正後（正しい方法）**:
```typescript
// workerLinkedFlg=trueの既存タスクの最大experiment_orderを取得
const maxExistingOrder = taskDetails
  .filter(t => t.workerLinkedFlg)
  .reduce((max, t) => Math.max(max, t.experimentOrder), 0);

// チェックされたタスクに連番を採番（既存の最大order + 1から開始）
const requestData = {
  tasks: checkedTasks.map((task, index) => ({
    methodId: task.methodId,
    experimentCondition: task.experimentCondition,
    trialCount: task.trialCount,
    experimentOrder: maxExistingOrder + index + 1, // 既存の最大order + 連番
  })),
  ...
};
```

### 具体例

**シナリオ1**: 3番目と4番目のメソッドがあり、4番目だけを選択して保存
- タスクA（workerLinkedFlg=true, experimentOrder=1）
- タスクB（workerLinkedFlg=true, experimentOrder=2）
- タスクC（workerLinkedFlg=false, チェックなし）← 画面上の3番目
- タスクD（workerLinkedFlg=false, チェックあり）← 画面上の4番目

**修正前**:
```
checkedTasks = [D]
index=0 → experimentOrder=1 (誤り：Aと重複)
```

**修正後**:
```
maxExistingOrder = 2（AとBの最大値）
checkedTasks = [D]
Dのorder = 2 + 0 + 1 = 3 (正しい)
```

**シナリオ2**: 3番目と4番目の両方を選択して保存
```
maxExistingOrder = 2
checkedTasks = [C, D]
Cのorder = 2 + 0 + 1 = 3
Dのorder = 2 + 1 + 1 = 4
```

**シナリオ3**: 初回保存（既存メソッドなし）
```
maxExistingOrder = 0
checkedTasks = [C, D]
Cのorder = 0 + 0 + 1 = 1
Dのorder = 0 + 1 + 1 = 2
```

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 初回保存時の動作への影響 | 中 | 低 | 初回保存のテストケースを必ず確認 |
| workerLinkedFlg=falseのみの部分保存への影響 | 中 | 低 | 既存メソッドがない場合のテストも実施 |

## 7. テスト計画

### ユニットテスト
- 修正は画面コンポーネント内のロジックのため、統合テストで確認

### 統合テスト
- [ ] ケース1: 既存2件（workerLinkedFlg=true） + 複製2件 → 複製1件のみ保存
  - 期待: experimentOrder=3で保存される
- [ ] ケース2: 既存2件（workerLinkedFlg=true） + 複製2件 → 複製2件とも保存
  - 期待: experimentOrder=3,4で保存される
- [ ] ケース3: 初回保存（既存0件） + 2件保存
  - 期待: experimentOrder=1,2で保存される
- [ ] ケース4: 既存0件 + 複製3件 → 2件目のみ保存
  - 期待: experimentOrder=2で保存される

### 手動テスト
- [ ] 開発環境で実際のMAIMLファイルを使用して動作確認
- [ ] 各テストケースをブラウザで実行
- [ ] コンソールログでexperimentOrderの値を確認

## 8. ロールバック計画

1. GitでコミットIDを記録
2. 問題が発生した場合は、該当ファイルをgit revertで戻す
3. フロントエンドのみの修正のため、バックエンドへの影響なし

## 9. 関連ドキュメント

- `docs/20260309_1609_非活性メソッド保存除外/PLAN.md` - 前回の関連タスク
- `docs/20260306_1623_taskRegistrationService_リファクタリング/PLAN.md` - サービス層のリファクタリング
- `.clinerules/development/frontend.md` - フロントエンド実装規約

## 10. 承認記録

- **計画書提示日時**: 2026-03-09 16:20
- **承認日時**: 2026-03-09 16:27
- **承認者コメント**: 承認（修正方針を見直し後）

## 11. 実施記録

### 実施日時
開始: 2026-03-09 16:27
完了: 2026-03-09 16:28

### 計画からの変更点
- なし（計画通りに実装完了）

### 発生した問題と解決方法
- なし

### 最終的な成果物
- [x] TaskRegistrationTab.tsxの修正
  - handleSave関数のexperimentOrder計算ロジックを修正
  - workerLinkedFlg=trueのタスクの最大experiment_orderを基準に連番を採番
  - デバッグログを追加（maxExistingOrder、各タスクのorder計算過程）
- [ ] テストケースの実施と確認（手動テスト待ち）

## 12. 振り返り

### うまくいった点
（完了後に記入）

### 改善が必要な点
（完了後に記入）

### 学んだこと
（完了後に記入）
