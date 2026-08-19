# トランジションフローノード UI設計書

## メタデータ
- **画面名**: トランジションフローノード
- **物理名**: TransitionFlowNode.tsx
- **ファイルパス**: `frontend/src/components/ExperimentWorker/TransitionFlowNode.tsx`
- **利用権限**: 実験作業者（experiment_worker）
- **作成日**: 2026-08-15
- **最終更新日**: 2026-08-15
- **担当者**: Development Team
- **バージョン**: 1.0.0

---

## 1. 画面概要

### 1.1. 目的

`TransitionFlowDiagram` 内で React Flow のカスタムノードとして使用されるコンポーネントです。
1つのトランジションを四角形カードで表示し、ステータス・進捗率・データ入力状況を視覚化します。
各ノードには「記録」ボタンと「報告」ボタンが配置されます。

### 1.2. 主要機能

1. トランジション名・ステータスタグの表示
2. 進捗率プログレスバーの表示
3. データ入力状況（材料/条件/結果の入力数/合計数）の表示
4. 「記録」ボタン（実験データ記録ダイアログを開く）
5. 「報告」ボタン（問題報告ダイアログを開く）
6. React Flow 用の左（入力）・右（出力）ハンドル

---

## 2. 画面レイアウト

```
          ●（入力ハンドル）
┌──────────────────────┐
│ [完了]              │  ← ステータスタグ（中央）
│                     │
│  測定ステップ1       │  ← トランジション名（中央）
│                     │
│ ████████░░  80%     │  ← プログレスバー
│      進捗 80%        │
│                     │
│  材: 2/3 条: 5/5    │  ← データ入力状況（省略表示）
│                     │
│ [記録]  [報告]      │  ← ボタン
└──────────────────────┘
          ●（出力ハンドル）

ノード幅: 200px
```

---

## 3. コンポーネント Props 定義

```typescript
interface TransitionFlowNodeProps {
  data: {
    transition: Transition;
    onRecordClick: (transition: Transition) => void;
    onIssueClick: (transition: Transition) => void;
    isProjectRecordable: boolean;
  };
}
```

| dataフィールド | 型 | 必須 | 説明 |
|-------------|-----|------|------|
| `transition` | `Transition` | ✅ | 表示するトランジションデータ |
| `onRecordClick` | `fn` | ✅ | 「記録」ボタンクリック時コールバック |
| `onIssueClick` | `fn` | ✅ | 「報告」ボタンクリック時コールバック |
| `isProjectRecordable` | `boolean` | ✅ | プロジェクトが記録可能状態か（記録ボタンの活性制御）|

---

## 4. ステータス別スタイル

| `ProgressStatus` | ボーダー色 | 背景色 | ステータステキスト |
|-----------------|-----------|--------|----------------|
| `not_started` / 未設定 | `colorBorder` | `colorBgContainer` | 未開始 |
| `in_progress` | `colorWarning` | `#fff7e6` | 作業中 |
| `completed` | `colorSuccess` | `#f6ffed` | 完了 |
| `on_hold` | `colorWarning` | `#fffbe6` | 保留中 |
| `issue` | `colorError` | `#fff1f0` | 問題あり |

---

## 5. プログレスバー色

| 進捗率 | ストローク色 |
|--------|-----------|
| 100% | `colorSuccess` |
| 1〜99% | `colorWarning` |
| 0% | `colorBorder` |

---

## 6. データ入力状況表示

`Transition` 型の以下フィールドが存在し、`> 0` の場合のみ当該列を表示：

| フィールド | 表示形式 | 例 |
|-----------|--------|-----|
| `totalMaterialsCount > 0` | `材: {inputMaterialsCount}/{totalMaterialsCount}` | 材: 2/3 |
| `totalIngredientsCount > 0` | `条: {inputIngredientsCount}/{totalIngredientsCount}` | 条: 5/5 |
| `totalResultsCount > 0` | `結: {inputResultsCount}/{totalResultsCount}` | 結: 1/4 |

---

## 7. ボタン仕様

| ボタン | 活性条件 | スタイル | data-testid |
|--------|---------|---------|-------------|
| 記録 | `isProjectRecordable === true` | `type="primary"`, flex:1, h:28px | `transition-node-record-button-{transitionId}` |
| 報告 | 常時活性 | default, 青色枠・文字, flex:1, h:28px | `transition-node-issue-button-{transitionId}` |

---

## 8. React Flow ハンドル

| ハンドル | type | position |
|---------|------|---------|
| 左 | `target` | `Position.Left` |
| 右 | `source` | `Position.Right` |

---

## 9. data-testid

| 要素 | testid |
|------|--------|
| ノードカード | `transition-flow-node-{transitionId}` |
