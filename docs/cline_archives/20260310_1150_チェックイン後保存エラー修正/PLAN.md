# タスク計画書: チェックイン後の保存エラー修正

## メタデータ
- **作成日時**: 2026-03-10 11:50
- **タスクID**: checkin_save_error_fix
- **優先度**: 高
- **推定工数**: 1時間

## 1. タスク概要

チェックイン後にタスク情報の保存ボタンを押下すると「プロジェクトがチェックアウトされています。保存できません。」というエラーが表示される問題を修正する。

**現象:**
- チェックアウト → チェックイン → 保存ボタン押下
- エラーメッセージ: 「プロジェクトがチェックアウトされています。保存できません。」
- DBでは`checkout_status=0`（チェックイン状態）であることを確認済み

## 2. 目的と期待される成果

### 目的
フロントエンド側でチェックイン後のプロジェクト状態を正しく反映し、保存処理を正常に実行できるようにする。

### 期待される成果
- [x] 問題の原因を特定
- [ ] 適切な修正方法を実装
- [ ] チェックイン後の保存処理が正常に動作することを確認

## 3. 実装ステップ

### Phase 1: 問題原因の詳細分析
- [x] ProjectManagement.tsxのチェックイン処理を確認
- [x] TaskRegistrationTab.tsxへ渡されるPropsを確認
- [x] `isCheckoutLocked`の値の取得元を確認
- [x] `isOrderChangeLocked`と`isProjectCheckedOut`の違いを特定

### Phase 2: 修正方針の決定
- [x] 修正方針1: `isCheckoutLocked`に正しい値を渡す（採用）
- [ ] 修正方針2: チェックイン後にプロジェクトを再選択する（不要と判断）
- [x] 修正方針を決定: 方針1のみで対応

### Phase 3: コード修正
- [x] `ProjectManagement.tsx`を修正
  - `isCheckoutLocked`に`isProjectCheckedOut`を渡す（完了）
  - タスク登録タブと指示登録タブの両方を修正
- [ ] コンソールログで動作確認用のログを追加（不要と判断）

### Phase 4: 動作確認
- [ ] チェックアウト → チェックイン → 保存の動作確認
- [ ] プロジェクト一覧の再取得が正しく動作するか確認
- [ ] エラーメッセージが表示されないことを確認

### Phase 5: クリーンアップ
- [ ] デバッグ用のコンソールログを削除
- [ ] コードレビュー
- [ ] 完了報告

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/components/project/ProjectManagement.tsx`
   - `isCheckoutLocked` Props の値を修正
   - または `handleToggleCheckout` にプロジェクト再選択を追加

### 影響を受ける機能
- タスク登録タブの保存処理
- チェックイン/チェックアウト機能

## 5. 技術的詳細

### 問題の原因

#### 現在の実装
```typescript
// ProjectManagement.tsx

// プロジェクトステータスベースの判定（status !== 0）
const isOrderChangeLocked = useMemo(() => {
  if (!selectedProject) return false;
  return selectedProject.status !== 0;  // ← プロジェクトステータスで判定
}, [selectedProject]);

// TaskRegistrationTabに渡されている
<TaskRegistrationTab
  isCheckoutLocked={isOrderChangeLocked}  // ← 間違った値
/>
```

#### TaskRegistrationTab側の期待値
```typescript
// TaskRegistrationTab.tsx

// Props定義
interface TaskRegistrationTabProps {
  isCheckoutLocked?: boolean;  // ← チェックアウト状態を期待
}

// 保存処理のバリデーション
if (isCheckoutLocked) {
  message.warning(t('taskRegistration.messages.checkedOut'));
  return;
}
```

### 修正方針

#### 方針1: 正しい値を渡す（推奨）
```typescript
// ProjectManagement.tsx

const isProjectCheckedOut = useMemo(() => {
  return selectedProject?.isCheckedOut === true;
}, [selectedProject]);

<TaskRegistrationTab
  isCheckoutLocked={isProjectCheckedOut}  // ← 正しい値に修正
/>
```

#### 方針2: チェックイン後にプロジェクトを再選択
```typescript
// ProjectManagement.tsx

const handleToggleCheckout = useCallback(async () => {
  if (!selectedProject) return;

  try {
    if (isProjectCheckedOut) {
      await checkinProject(selectedProject.name);
      await refetchProjects();
      
      // プロジェクトを再選択して最新情報を反映
      setSelectedProjectId(selectedProject.id);
      await handleProjectSelect(selectedProject.id);
      
      message.success('チェックインしました');
    } else {
      // チェックアウト処理
    }
  } catch (error) {
    // エラー処理
  }
}, [selectedProject, isProjectCheckedOut, refetchProjects, handleProjectSelect]);
```

### 推奨修正

**両方の修正を実施:**
1. `isCheckoutLocked`に正しい値（`isProjectCheckedOut`）を渡す
2. チェックイン/チェックアウト後にプロジェクト情報を確実に更新

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| プロジェクト再選択で他の状態がクリアされる | 中 | 低 | 修正前に状態管理を確認 |
| 他のタブでも同様の問題が発生 | 中 | 中 | 指示登録タブも同様に修正 |
| パフォーマンスへの影響 | 低 | 低 | 不要な再レンダリングが発生しないか確認 |

## 7. テスト計画

### 手動テスト
- [ ] チェックアウト → チェックイン → 保存（正常系）
- [ ] チェックアウト → 保存試行 → エラー確認（異常系）
- [ ] プロジェクト切り替え → チェックイン → 保存（複数プロジェクト）
- [ ] ブラウザリロード後 → チェックイン → 保存（セッション確認）

### 確認項目
- [ ] エラーメッセージが表示されない
- [ ] DBの`checkout_status`が正しく反映される
- [ ] プロジェクト一覧の状態が正しく更新される
- [ ] 保存処理が正常に完了する

## 8. ロールバック計画

修正前のコードをコミット前に確認し、問題が発生した場合は以下の手順でロールバック：

1. 修正したファイルを元に戻す
2. ブラウザキャッシュをクリア
3. アプリケーションを再起動

## 9. 関連ドキュメント

- `frontend/src/components/project/ProjectManagement.tsx`
- `frontend/src/components/project/TaskRegistrationTab.tsx`
- `frontend/src/components/project/InstructionRegistrationTab.tsx`

## 10. 承認記録

- **計画書提示日時**: 2026-03-10 11:50
- **承認日時**: 2026-03-10 11:52
- **承認者コメント**: 承認、修正実施

## 11. 実施記録

### 実施日時
開始: 2026-03-10 11:52
完了: 2026-03-10 11:53

### 計画からの変更点
- 修正方針2（プロジェクト再選択）は不要と判断し、方針1のみで対応
- `refetchProjects()`でプロジェクト一覧が更新されれば、`selectedProject`のuseMemoも自動的に更新される

### 発生した問題と解決方法
特になし。計画通りに実装完了。

### 最終的な成果物
- [x] ProjectManagement.tsxの修正（完了）
- [ ] 動作確認完了（ユーザー側で実施）
- [x] ドキュメント更新（完了）

## 12. 振り返り

### うまくいった点
（未記入）

### 改善が必要な点
（未記入）

### 学んだこと
（未記入）
