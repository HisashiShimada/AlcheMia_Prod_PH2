# SaveDialog（Draft保存ダイアログ）UI仕様書

## 1. 概要

### 1.1 コンポーネントの目的

Draft保存ダイアログは、Petri Netの編集内容をDraftとしてデータベースに保存する際に表示されるモーダルダイアログです。Draft名の入力と保存処理を提供します。

> ⚠️ **実装上の注意**: このダイアログは独立した `SaveDialog.tsx` コンポーネントとして実装されているわけではなく、`DraftManager.tsx` の内部で `Modal` コンポーネントとして実装されています。

**主な機能:**
- Draft名の入力
- 保存処理の実行
- エラー時のモーダルメッセージ表示

### 1.2 使用場面

- **表示タイミング**: DraftManagerの「新規保存」ボタン（SaveOutlined）クリック時
- **表示条件**: DraftManagerパネルが開いている状態で保存ボタンをクリックした時

### 1.3 アクセス権限

- **必須ロール**: Experiment Admin（実験管理者）
- **認証**: JWT + Session Hybrid認証

---

## 2. 画面構成

### 2.1 レイアウト構造

```
┌────────────────────────────────────────────────────────┐
│ Draft保存                                     [×]      │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌──────────────────────────────────────────────┐    │
│  │ Draft名を入力してください...                  │    │
│  └──────────────────────────────────────────────┘    │
│                                                        │
├────────────────────────────────────────────────────────┤
│                              [キャンセル] [💾 保存]    │
└────────────────────────────────────────────────────────┘
```

### 2.2 主要UI要素

#### 2.2.1 モーダルダイアログ
- **タイトル**: `t('draftManager.saveDialogTitle')`
- **OKボタン**: `t('draftManager.saveDialogOkText')`
- **キャンセルボタン**: onCancel で `showSaveDialog` を false に設定

#### 2.2.2 Draft名入力フィールド
- **コンポーネント**: `Input`
- **プレースホルダー**: `t('draftManager.saveDialogPlaceholder')`
- **初期値**: `Draft - {fileName} - {現在日時}` 形式の自動生成文字列
- **Enterキー**: handleSaveNew を実行

---

## 3. 機能仕様

### 3.1 実装場所

`DraftManager.tsx` 内の State・ハンドラとして実装。

```typescript
// State（DraftManager内）
const [showSaveDialog, setShowSaveDialog] = useState(false);
const [newDraftName, setNewDraftName] = useState('');
```

### 3.2 ダイアログ表示処理

```typescript
const handleOpenSaveDialog = () => {
  // デフォルト名を設定してダイアログを開く
  const defaultName = `Draft - ${currentEditState.fileName} - ${new Date().toLocaleString('ja-JP')}`;
  setNewDraftName(defaultName);
  setShowSaveDialog(true);
};
```

### 3.3 保存処理

```typescript
const handleSaveNew = async () => {
  if (!newDraftName.trim()) {
    Modal.error({
      title: t('draftManager.saveDialogErrorTitle'),
      content: t('draftManager.saveDialogErrorContent')
    });
    return;
  }
  // Draft保存API呼び出し
  await saveDraft({ draftKey, draftName: newDraftName, originalFileKey: currentEditState?.fileName || '' });
  Modal.success({
    title: t('draftManager.saveSuccess'),
    content: t('draftManager.saveSuccessContent')
  });
  setShowSaveDialog(false);
  setNewDraftName('');
};
```

### 3.4 バリデーション

- Draft名が空（空白のみ含む）の場合はエラーモーダルを表示して保存を中断
- 入力フォームへのバリデーション表示（インライン）は実装なし

---

## 4. 実装ファイル

- **実装場所**: `frontend/src/components/editorv2/DraftManager.tsx`（内部Modalとして）

---

## 5. 変更履歴

| 日付 | 変更内容 | 担当者 |
|------|----------|--------|
| 2026-03-11 | 初版作成（独立コンポーネントとして記述） | Cline |
| 2026-08-21 | DraftManager内部Modalとして実装されている実態に合わせて設計書を全面更新 | Cline |
