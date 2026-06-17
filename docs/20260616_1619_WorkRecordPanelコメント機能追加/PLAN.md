# タスク計画書: WorkRecordPanel コメント機能追加

## メタデータ
- **作成日時**: 2026-06-16 16:19
- **タスクID**: work-record-comment
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

ExperimentWorkerの作業記録パネル（WorkRecordPanel）において、実験中の気づきや注意点を記録できる「コメント」機能を追加する。保存ボタンの左側にコメントボタンを配置し、ダイアログからコメントを入力・保存できるようにする。現時点はモック段階のため、フロントエンドUIのみ実装（バックエンドAPIなし）。

## 目的と期待される成果

- [ ] WorkRecordPanel の保存ボタン左側にコメントボタンが表示される
- [ ] コメントボタンクリックで入力ダイアログが開く
- [ ] コメント（テキスト）を入力して保存できる
- [ ] モック動作としてModal.successで保存完了を通知する

## 実装ステップ

### Phase 1: ExperimentCommentDialog コンポーネント作成
- [ ] `frontend/src/components/ExperimentWorker/ExperimentCommentDialog.tsx` 新規作成
  - Ant Design Modal コンポーネントを使用
  - コメント入力フォーム（TextArea、maxLength=500）
  - タスクNo・トランジションID表示
  - 保存・キャンセルボタン
  - モック動作（保存時はonSaveコールバック呼出）

### Phase 2: WorkRecordPanel.tsx 修正
- [ ] PropertyListProps に `onCommentClick` コールバックを追加
- [ ] PropertyList コンポーネントのボタンエリアにコメントボタン追加（保存ボタンの左側）
- [ ] WorkRecordPanel に `commentDialogOpen` state 追加
- [ ] WorkRecordPanel に `handleSaveComment` ハンドラ追加
- [ ] PlanProps に `onCommentClick` を追加し PlanA / PlanB に伝播
- [ ] ExperimentCommentDialog をレンダリングに追加

## 変更ファイル

### 新規作成
1. `frontend/src/components/ExperimentWorker/ExperimentCommentDialog.tsx` - コメント入力ダイアログ

### 修正
1. `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` - コメントボタン追加・ダイアログ統合

## 技術的詳細

### ボタン配置イメージ
```
[💬 コメント] [保存] [保存して次へ →]
```

### ExperimentCommentDialog Props
```typescript
interface ExperimentCommentDialogProps {
  open: boolean;
  taskNo: number;
  transitionId: string;
  onClose: () => void;
  onSave: (comment: string) => void;
}
```

### PropertyListProps 追加
```typescript
interface PropertyListProps {
  // ... 既存
  onCommentClick: () => void; // 追加
}
```

### PlanProps 追加
```typescript
interface PlanProps {
  // ... 既存
  onCommentClick: () => void; // 追加
}
```

## 承認記録
- **計画書提示日時**: 2026-06-16 16:19
- **承認日時**: 2026-06-16 16:19
