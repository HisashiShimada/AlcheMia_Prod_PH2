# タスク計画書: プロジェクト指示連続保存問題修正

## メタデータ
- **作成日時**: 2026-03-09 15:40
- **タスクID**: task-instruction-duplicate-save-fix
- **優先度**: 高
- **推定工数**: 0.5時間

## 1. タスク概要

タスク登録タブで指示を連続保存すると、前回保存した指示が再度保存されてしまう不具合を修正します。

### 現象
1. プロジェクト指示（methodId = ''）を追加して「タスク情報を保存」ボタンで保存
2. メソッド指示を追加して再度「タスク情報を保存」ボタンで保存
3. DBを確認すると：
   - プロジェクト指示が2件（重複）
   - メソッドの指示が1件

## 2. 目的と期待される成果

### 目的
- バリデーション用にDBの指示をstateに保持しつつ、新規追加した指示のみを保存する

### 期待される成果
- [x] 各指示が1回のみDBに保存される
- [x] 連続保存しても重複しない
- [x] バリデーション用にDBの指示を参照できる

## 3. 実装ステップ

### Phase 1: 問題箇所の特定
- [x] `TaskRegistrationTab.tsx`の`handleSave`関数を確認
- [x] 指示のstateライフサイクルを確認

### Phase 2: 修正実装
- [ ] InstructionData型に`isNewlyAdded`フラグを追加
- [ ] `refreshInstructions`共通関数を作成（stateクリア + DB再取得）
- [ ] 新規追加時に`isNewlyAdded: true`を設定
- [ ] 保存時に`isNewlyAdded: true`の指示のみを送信
- [ ] 保存成功後、`refreshInstructions()`を実行

### Phase 3: テスト
- [ ] プロジェクト指示 → メソッド指示の連続保存をテスト
- [ ] メソッド指示 → プロジェクト指示の連続保存をテスト
- [ ] 同じメソッドへの複数指示をテスト

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/types/instructionRegistration.ts`
   - InstructionData型に`isNewlyAdded`フラグを追加

2. `frontend/src/components/project/TaskRegistrationTab.tsx`
   - `refreshInstructions`共通関数: stateクリア + DB再取得
   - `handleInstructionSave`関数: 新規追加時にフラグを設定
   - `handleSave`関数: 新規追加指示のみを送信し、保存後に`refreshInstructions()`実行
   - useEffect: `refreshInstructions()`を使用

### 新規作成するファイル
なし

### 削除するファイル
なし

### 影響を受ける機能
- タスク登録タブの指示保存処理

## 5. 技術的詳細

### 問題の詳細

**ユーザーの要望:**
1. タブを開いた時点でinstructionsにDBの指示をセット（バリデーション用）
2. 新規指示を追加するたびにinstructionsにセット
3. バリデーション後、新規追加した指示のみを保存
4. 保存成功後、stateをクリア（次回タブアクティブ時にDBから再取得）
5. DBの指示は再送信しない

**現状の問題:**
- DBから取得した指示と新規追加した指示が区別されていない
- 保存時に全ての`instruction_status=0`の指示が送信される
- 既にDB保存済みの指示も再度送信されて重複する

### 修正内容

#### 1. 型定義の追加

```typescript
// frontend/src/types/instructionRegistration.ts
export interface InstructionData {
  id: string | number;
  content: string;
  priority: number;
  type: number;
  methodId: string;
  transitionId: string;
  taskNumber?: number;
  targetType?: number;
  isSent?: boolean;
  instruction_status?: number;
  isNewlyAdded?: boolean; // ← 新規追加フラグ
}
```

#### 2. 新規追加時にフラグを設定

```typescript
// TaskRegistrationTab.tsx - handleInstructionSave関数
const handleInstructionSave = useCallback((instruction: InstructionData, keepDialogOpen?: boolean) => {
  // instruction_status=0（未送信）として追加
  const newInstruction: InstructionData = {
    ...instruction,
    instruction_status: 0,
    isNewlyAdded: true // ← 新規追加フラグを設定
  };
  
  setInstructions(prev => [...prev, newInstruction]);
  message.success('指示を追加しました');
  
  if (!keepDialogOpen) {
    setIsInstructionDialogOpen(false);
    setIsProjectInstructionDialogOpen(false);
    setSelectedMethodIdForInstruction('');
  }
}, []);
```

#### 3. refreshInstructions共通関数の作成

```typescript
// TaskRegistrationTab.tsx
// stateクリア + DB再取得の共通関数
const refreshInstructions = useCallback(async () => {
  setInstructions([]); // stateをクリア
  const instructionsData = await getInstructions(projectName);
  setInstructions(instructionsData || []); // DB指示をセット
}, [projectName]);

// タブアクティブ時に実行
useEffect(() => {
  const fetchTaskRegistration = async () => {
    const [taskData] = await Promise.all([
      getTaskRegistration(projectName),
      refreshInstructions() // 共通関数を使用
    ]);
    // ...
  };
  fetchTaskRegistration();
}, [projectName, isActive, refreshInstructions]);
```

#### 4. 保存時に新規追加指示のみを送信し、保存後にrefreshInstructions実行

```typescript
// TaskRegistrationTab.tsx - handleSave関数内
const handleSave = useCallback(async () => {
  try {
    // 新規追加した指示のみをフィルタリング
    const newlyAddedInstructions = instructions.filter(
      inst => inst.isNewlyAdded === true
    );
    
    // 指示存在チェック（FE）
    if (newlyAddedInstructions.length === 0) {
      message.warning('プロジェクト指示またはタスク指示を最低1つ設定してください');
      return;
    }
    
    // チェックされたタスクのメソッドIDを取得
    const checkedMethodIds = new Set(checkedTasks.map(t => t.methodId));
    
    // プロジェクト指示（methodId === ""）またはチェックされたメソッドの指示をフィルタリング
    const checkedNewInstructions = newlyAddedInstructions.filter((inst: InstructionData) =>
      inst.methodId === '' || checkedMethodIds.has(inst.methodId)
    );
    
    // API用の指示データを作成
    const instructionSaveItems: InstructionSaveItem[] = checkedNewInstructions.map(...);
    
    // ... バリデーション・保存処理 ...
    
    // APIを呼び出し
    const response = await saveTaskRegistration(projectName, requestData);
    
    // 保存成功後、共通関数でstateをクリア + DB再取得
    await refreshInstructions();
    
    onTasksChange?.(checkedTasks);
    message.success(response.message || t('taskRegistration.messages.saved'));
  } catch (error) {
    // エラーハンドリング
  }
}, [...]);
```

### 修正の理由

1. **新規追加時に`isNewlyAdded: true`フラグを付ける**
   - DBから取得した指示（フラグなし）と新規追加した指示（フラグあり）を区別
   - バリデーション時にDBの指示を参照可能

2. **保存時に新規追加指示のみを送信**
   - `isNewlyAdded: true`の指示のみをバックエンドに送信
   - DBから取得した指示は送信されない（重複防止）

3. **refreshInstructions共通関数でDB再取得を一元管理**
   - stateクリア + DB再取得を1つの関数に集約
   - タブアクティブ時と保存後の両方で使用
   - 処理の一元化により保守性向上

4. **保存成功後、refreshInstructions()を実行**
   - 保存後に共通関数を実行してDB指示を再取得
   - stateがクリアされるため、次回保存時に重複しない

5. **結果**
   - バリデーション用にDBの指示を参照できる
   - 新規追加した指示のみが保存される
   - 重複保存が発生しない
   - DB再取得処理が一元管理され保守性が高い

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 指示が消失する | 高 | 低 | 保存成功を確認してからstateを更新 |
| フラグの設定漏れ | 中 | 低 | 新規追加時のみフラグを設定（DBから取得時は設定しない） |

## 7. テスト計画

### 手動テスト

#### テストケース1: プロジェクト指示 → メソッド指示
1. タスク登録タブで「プロジェクト指示」をクリック
2. プロジェクト指示を入力して「保存」（isNewlyAdded: true）
3. ダイアログが閉じる
4. 「タスク情報を保存」ボタンをクリック → 保存成功 → stateクリア
5. 任意のメソッドの「指示追加」をクリック
6. メソッド指示を入力して「保存」（isNewlyAdded: true）
7. 「タスク情報を保存」ボタンをクリック → 保存成功 → stateクリア
8. DBを確認
   - **期待結果**: プロジェクト指示1件、メソッド指示1件

#### テストケース2: メソッド指示 → プロジェクト指示
1. タスク登録タブで任意のメソッドの「指示追加」をクリック
2. メソッド指示を入力して「保存」
3. 「タスク情報を保存」ボタンをクリック → 保存成功 → stateクリア
4. 「プロジェクト指示」をクリック
5. プロジェクト指示を入力して「保存」
6. 「タスク情報を保存」ボタンをクリック → 保存成功 → stateクリア
7. DBを確認
   - **期待結果**: メソッド指示1件、プロジェクト指示1件

#### テストケース3: 同じメソッドへの複数指示
1. タスク登録タブでメソッドAの「指示追加」をクリック
2. 指示1を入力して「保存」
3. 「タスク情報を保存」ボタンをクリック → 保存成功 → stateクリア
4. メソッドAの「指示追加」をクリック
5. 指示2を入力して「保存」
6. 「タスク情報を保存」ボタンをクリック → 保存成功 → stateクリア
7. DBを確認
   - **期待結果**: メソッドA指示2件（重複なし）

## 8. ロールバック計画

修正箇所が2ファイル（型定義+コンポーネント）のため、コミット前の状態に戻すことで対応可能。

## 9. 関連ドキュメント

- `.clinerules/development/config.md` - コーディング規約
- `.clinerules/development/typescript.md` - TypeScript型定義規約
- `frontend/src/components/project/TaskRegistrationTab.tsx` - 修正対象ファイル
- `frontend/src/types/instructionRegistration.ts` - 型定義ファイル

## 10. 承認記録

- **計画書提示日時**: 2026-03-09 15:40
- **承認日時**: （承認待ち）
- **承認者コメント**: （待機中）

## 11. 実施記録

### 実施日時
開始: （作業開始後に記入）
完了: （作業完了後に記入）

### 計画からの変更点
（実施中に発生した変更を記録）

### 発生した問題と解決方法
（実施中に発生した問題を記録）

### 最終的な成果物
- [ ] InstructionData型に`isNewlyAdded`フラグ追加
- [ ] TaskRegistrationTab.tsx の修正
- [ ] テスト完了
- [ ] 動作確認完了

## 12. 振り返り

### うまくいった点
（作業完了後に記入）

### 改善が必要な点
（作業完了後に記入）

### 学んだこと
（作業完了後に記入）
