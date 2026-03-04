# タスク計画書: コメント送信後の即時表示対応

## メタデータ
- **作成日時**: 2026-02-27 18:01
- **タスクID**: comment-immediate-display
- **優先度**: 中
- **推定工数**: 0.5時間

## タスク概要

`IssueManagementModal` にて「コメント送信」ボタン押下後、登録に成功したコメントがコメント一覧に即時表示されない問題を修正する。

---

## 問題の分析

### 現在のデータフロー

```
[ユーザー] コメント送信ボタン押下
    ↓
[IssueManagementModal] handleCommentSubmit()
    ↓
onSubmitComment(issueId, comment) ← Propsのコールバック呼び出し
    ↓
[親コンポーネント (TransitionList / ExperimentRecordTab)] APIコール
    ↓
APIコール成功後 → issues 一覧を再取得
    ↓
[IssueManagementModal] issues props が更新される
    ↓
⚠️ しかし selectedIssue はローカルstateのため更新されない！
    ↓
→ コメント一覧が古いデータのまま表示され続ける
```

### 根本原因

`IssueManagementModal` 内の `selectedIssue` はコンポーネントのローカル state (`useState<Issue | null>`) として管理されている。

親コンポーネントが `issues` プロップを更新しても、`selectedIssue` は初期選択時の値を保持し続けるため、コメント一覧（`selectedIssue.comments`）が最新データに追随しない。

### 影響範囲

以下3つのシナリオで同様の問題が発生している：

| 操作 | 呼ばれるハンドラ | 影響 |
|------|----------------|------|
| コメント送信 | `handleCommentSubmit` | コメント一覧が更新されない |
| 未解決ボタン | `handleSetUnresolved` | コメント＋ステータスが更新されない |
| 解決ボタン | `handleSetResolved` | コメント＋ステータスが更新されない |

---

## 解決策

`useEffect` を追加し、`issues` プロップが更新された際に `selectedIssue` を同期させる。

```typescript
useEffect(() => {
  if (selectedIssue) {
    const updatedIssue = issues.find(issue => issue.issueId === selectedIssue.issueId);
    if (updatedIssue) {
      setSelectedIssue(updatedIssue);
    }
  }
}, [issues]);
```

**この解決策の特徴:**
- 変更箇所が1か所（`useEffect` の追加のみ）でシンプル
- 既存のデータフロー（親が再取得 → props更新）を変えない
- コメント送信・未解決・解決の全3ケースに対応
- `selectedIssue` が `null`（問題未選択時）の場合は何もしないため安全

---

## 実装ステップ

### Step 1: タスク計画書の作成
- [x] `docs/20260227_1800_コメント送信後即時表示/PLAN.md` を作成

### Step 2: IssueManagementModal.tsx の修正

#### 2-1: import文に `useEffect` を追加
- [ ] `React, { useState, useMemo }` → `React, { useState, useMemo, useEffect }` に変更

#### 2-2: useEffect を追加
- [ ] `filteredIssues` の `useMemo` の直後に `useEffect` を追加

### Step 3: UI設計書の更新
- [ ] `docs/design/ui/ui_issue_management_modal.md` の State セクションに `useEffect` の説明を追記
- [ ] 変更履歴を追記

---

## 変更ファイル

1. `frontend/src/components/ExperimentWorker/IssueManagementModal.tsx` - `useEffect` を追加

## 新規作成ファイル

1. `docs/20260227_1800_コメント送信後即時表示/PLAN.md` - このファイル

---

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| useEffect の無限ループ | 高 | 低 | `issues` のみを依存配列に指定し、`selectedIssue` を含めない |
| 問題未選択時の null 参照 | 中 | 低 | `selectedIssue` の null チェックを実施 |

---

## テスト計画

### 手動テスト

1. **コメント送信後の即時表示確認**
   - [ ] IssueManagementModal を開く
   - [ ] 問題を選択する
   - [ ] コメントを入力して「コメント送信」ボタンを押下
   - [ ] コメント一覧に送信したコメントが即時表示されることを確認

2. **ステータス変更後の即時表示確認**
   - [ ] コメント入力後「解決」ボタンを押下
   - [ ] 問題のステータスが「解決済」に変わることを確認
   - [ ] コメント一覧に入力したコメントが追加されることを確認

3. **問題未選択時の動作確認**
   - [ ] 問題を選択せずにモーダルを開いたままにする
   - [ ] エラーが発生しないことを確認

---

## 承認記録

- **計画書提示日時**: 2026-02-27 18:01
- **承認日時**: 2026-02-27 18:01
- **承認者コメント**: 承認済み（Act mode切り替えにより承認とみなす）

---

## 実施記録

### 実施日時
開始: 2026-02-27 18:01
完了: （未記入）

### 計画からの変更点
（なし）

### 発生した問題と解決方法
（なし）

### 最終的な成果物
- [ ] IssueManagementModal.tsx 修正完了
- [ ] UI設計書更新完了
