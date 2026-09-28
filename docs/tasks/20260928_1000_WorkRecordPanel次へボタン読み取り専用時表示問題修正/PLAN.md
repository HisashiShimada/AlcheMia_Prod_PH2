# タスク計画書: WorkRecordPanel「次へ」ボタン 読み取り専用時表示問題修正

## メタデータ

- **作成日時**: 2026-09-28 10:00
- **タスクID**: 20260928_1000
- **優先度**: 高
- **推定工数**: 1〜2時間

---

## 1. タスク概要

WorkRecordPanel の `PlanB` コンポーネント（1923行目付近）において、ボタン群（保存・次へ・コメント・スキップ）が `!isReadOnly` の条件でブロックごと非表示になっている。

対象トランジションの作業が **完了（completed）+ 記録済み（isRecorded=true）** になった瞬間に `isReadOnly = true` が成立し、ボタン群全体が消える。これにより「次へ」ボタンも消えてしまい、WorkRecordPanel 内で次のトランジションに移動できなくなる。

本来の意図: 完了+記録済みになったタイミングで「次へ」ボタンを活性化し、WorkRecordPanel 内だけで次のトランジションに移動できるようにする。

**【方針】ブロックを非表示にするのではなく、ブロックは常に表示したまま、各ボタンを個別に `disabled` 制御する。**

---

## 2. 問題の根本原因

### isReadOnly の定義（3556〜3559行目・最新）

```typescript
const isReadOnly =
  isNotStartedStatus ||
  isErrorStatus ||
  (isCompletedStatus && displayKeyRow?.isRecorded === true && !isCorrectionMode);
```

`status=completed && isRecorded=true` になると `isReadOnly=true` になる。

### canGoNext の計算（1941〜1943行目）

```typescript
const isCompleted = currentProgressRow?.status === 'completed';
const isRecordedFlag = currentProgressRow?.isRecorded === true;
const canGoNext = hasNextTransition && isCompleted && isRecordedFlag;
```

### 問題の発生フロー

```
作業完了（status=completed）+ 保存（isRecorded=true）
  → isReadOnly = true  ← ボタン群ブロック (!isReadOnly) がまるごと消える
  ↑ 同時に
  → canGoNext = true   ← 「次へ」が活性になるはずのタイミング
```

つまり「次へ」が **活性になるタイミング** と **ボタン群が消えるタイミング** が完全に一致している。

---

## 3. 修正方針

**`!isReadOnly` によるブロックの非表示をやめ、ブロックは常に表示したまま各ボタンを個別に `disabled` 制御する。**

| ボタン | 現状 | 修正後 |
|--------|------|--------|
| 保存 | `isReadOnly=true` で非表示 | 常時表示・`disabled={isReadOnly}` |
| 次へ | `isReadOnly=true` で非表示 | 常時表示・`disabled={!canGoNext}`（活性条件は変えない） |
| コメント | `isReadOnly=true` で非表示 | 常時表示・disabled なし（読み取り専用でもコメント可） |
| スキップ | `isReadOnly=true` で非表示 | 常時表示・`disabled={!canSkipFlag}` |

---

## 4. 実装詳細

### 変更対象ファイル

- `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx`（1923〜2002行）

### 変更概要

#### 変更前（1923〜2002行）

```tsx
{/* 右側: 保存 / 次へ / コメント / スキップ（編集時のみ表示） */}
{!isReadOnly && (() => {
  // ...計算ロジック...
  return (
    <Flex gap={8} align="center">
      <Button /* 保存 */ onClick={() => onSave(...)} />
      <Tooltip><Button /* 次へ */ disabled={!canGoNext} /></Tooltip>
      <Divider />
      <Button /* コメント */ />
      <Button /* スキップ */ disabled={!canSkipFlag} />
    </Flex>
  );
})()}
```

#### 変更後

```tsx
{/* 右側: 保存 / 次へ / コメント / スキップ */}
{(() => {
  // 計算ロジックは変更なし（isReadOnly に関わらず常に実施）
  const nextBtnLabel = t('workRecord.transitionCompleteNext');
  const hasNextTransition = findNextAvailableTransition(...) !== null;
  const currentProgressRow = progressRows?.find(...);
  const isInProgress = currentProgressRow?.status === 'in_progress';
  const canSkipFlag = hasNextTransition && !isInProgress;
  const isCompleted = currentProgressRow?.status === 'completed';
  const isRecordedFlag = currentProgressRow?.isRecorded === true;
  const canGoNext = hasNextTransition && isCompleted && isRecordedFlag;
  const nextTooltipTitle = /* 変更なし */;
  const handleSaveAndNextInner = /* 変更なし */;

  return (
    <Flex gap={8} align="center">
      {/* 保存: isReadOnly のとき disabled */}
      <Button
        size="small"
        icon={<SaveOutlined />}
        style={!isReadOnly ? { background: '#f6ffed', borderColor: '#b7eb8f', color: '#52c41a' } : undefined}
        disabled={isReadOnly}
        onClick={() => onSave(displayKey.taskNo, displayKey.transitionId)}
      >
        {t('workRecord.saveButton')}
      </Button>
      {/* 次へ: canGoNext のみで活性制御（isReadOnly に関わらず表示） */}
      <Tooltip title={nextTooltipTitle}>
        <Button
          size="small"
          type="primary"
          icon={<RightOutlined />}
          disabled={!canGoNext}
          onClick={handleSaveAndNextInner}
        >
          {nextBtnLabel}
        </Button>
      </Tooltip>
      <Divider orientation="vertical" style={{ margin: '0 12px' }} />
      {/* コメント: 常に押せる */}
      <Button size="small" icon={<CommentOutlined />} onClick={onCommentClick}>
        {t('workRecord.commentButton')}
      </Button>
      {/* スキップ: canSkipFlag で活性制御 */}
      <Tooltip title={canSkipFlag ? t('workRecord.skipTooltipAvailable') : t('workRecord.skipTooltipUnavailable')}>
        <Button
          size="small"
          icon={<StepForwardOutlined />}
          disabled={!canSkipFlag}
          onClick={() => onSkip(displayKey.taskNo, displayKey.transitionId)}
          style={{ marginLeft: 8 }}
        >
          {t('workRecord.skipButton')}
        </Button>
      </Tooltip>
    </Flex>
  );
})()}
```

---

## 5. 影響範囲の分析

### 直接影響

- **PlanB コンポーネントの 1923〜2002行付近のみ変更**
- **操作フロー変化**:
  - 修正前: 完了+記録済み → ボタン群消える → ProgressOverviewTab に戻る必要あり
  - 修正後: 完了+記録済み → 「次へ」ボタンが活性 → WorkRecordPanel 内で次へ移動

### ボタン別の挙動変化

| ボタン | 未完了作業中 | 完了+記録済み（isReadOnly） | 訂正モード中 |
|--------|-------------|----------------------------|------------|
| 保存 | 活性（緑スタイル） | **非活性（グレー）** ← 修正後 | 活性（緑スタイル） |
| 次へ | 非活性（条件未達） | **活性**（canGoNext=true） ← 修正後 | 非活性（canGoNext=false: 訂正中はcompleted=false等） |
| コメント | 活性 | **活性のまま** ← 修正後 | 活性 |
| スキップ | 活性/非活性（条件次第） | **非活性**（isInProgress以外の条件） ← 修正後 | 活性/非活性 |

### 間接影響

- `isReadOnly` の定義変更なし
- `canGoNext` の計算変更なし
- `handleSaveAndNext` の変更なし

---

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 保存ボタンの disabled 時スタイルが意図通りになるか | 低 | 低 | `disabled` 時は `style` を `undefined` にすることで Ant Design デフォルトグレーが適用される |
| 異常終了（isErrorStatus）時にコメントが押せてしまう | 低 | 低 | 仕様上コメントは閲覧専用時でも押せてよい（不問） |

---

## 7. テスト計画

### 手動テスト

- [ ] 作業中（未完了・未記録）: 保存（緑）・次へ（非活性）・コメント・スキップが表示される
- [ ] 完了+記録済み（isReadOnly=true）: 保存がグレー非活性になる
- [ ] 完了+記録済み（isReadOnly=true）: 「次へ」ボタンが活性化する
- [ ] 完了+記録済み（isReadOnly=true）: コメントが押せる
- [ ] 完了+記録済み（isReadOnly=true）: スキップが非活性になる（status=completedのためcanSkipFlagがfalse）
- [ ] 「次へ」押下後: 次のトランジションが WorkRecordPanel 内で読み込まれる
- [ ] 訂正モード中（isCorrectionMode=true）: 保存（緑）が活性に戻る

### ビルド確認

- [ ] `tsc` でエラーなし

---

## 8. 変更ファイル一覧

| # | ファイル | 変更内容 |
|---|---------|---------|
| 1 | `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` | PlanB の 1923〜2002行: `!isReadOnly` によるブロック非表示を廃止し各ボタンを個別 disabled 制御に変更 |

---

## 9. 関連ドキュメント

- [`docs/tasks/20260911_1117_WorkRecordPanel次へボタン活性制御と初期値設定/PLAN.md`](../20260911_1117_WorkRecordPanel次へボタン活性制御と初期値設定/PLAN.md)
- [`docs/tasks/20260908_1500_WorkRecordPanelボタン活性調査/ISSUES.md`](../20260908_1500_WorkRecordPanelボタン活性調査/ISSUES.md)

---

## 10. 承認記録

- **計画書提示日時**: 2026-09-28 10:00
- **承認日時**: 2026-09-28
- **承認者コメント**: 承認

---

## 11. 実施記録

### 実施日時
開始: 2026-09-28
完了: 2026-09-28

### 変更内容
- `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx`（1923〜2009行）
  - `{!isReadOnly && (() => { ... })()}` → `{(() => { ... })()}` に変更（ブロック非表示を廃止）
  - 保存ボタン: `disabled={isReadOnly}` 追加、`style` を isReadOnly 時は `undefined`（グレー）に切り替え
  - 次へボタン: `disabled={!canGoNext}` は変更なし（isReadOnly 制御から独立済み）
  - コメントボタン: disabled なし（変更なし）
  - スキップボタン: `disabled={!canSkipFlag}` は変更なし

### 最終的な成果物
- [x] `WorkRecordPanel.tsx` — ボタン群ブロックを常に表示し各ボタンを個別 disabled 制御に変更
- [x] `tsc --noEmit` エラーなし確認済み


