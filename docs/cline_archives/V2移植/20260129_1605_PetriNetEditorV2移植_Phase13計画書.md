# PetriNetEditorV2移植 Phase 13 計画書

## メタデータ
- **作成日時**: 2026-01-29 16:05
- **タスクID**: PetriNetEditorV2_Phase13_SaveConfirmDialog
- **優先度**: 🔴 高
- **推定工数**: 30分

## 1. タスク概要

SaveConfirmDialog.tsxをreference版からeditorv2へ移植します。

## 2. 対象ファイル

### 移植対象
- **reference**: `reference/frontend/src/components/PetriNetEditorV2/components/SaveConfirmDialog.jsx`
- **移植先**: `frontend/src/components/editorv2/components/SaveConfirmDialog.tsx`

### ファイル概要
- **行数**: 約150-200行（推定）
- **主要機能**: 保存確認ダイアログの表示・制御
- **依存**: Material-UI → Ant Design Modal

## 3. 実装内容

### 3.1 SaveConfirmDialog.tsx

#### 主要機能
1. **保存確認ダイアログ**: 編集内容保存の確認
2. **破棄確認**: 未保存の変更を破棄する確認
3. **キャンセル**: ダイアログを閉じる

#### Props定義
```typescript
interface SaveConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void | Promise<void>;
  onDiscard: () => void | Promise<void>;
  hasUnsavedChanges?: boolean;
  title?: string;
  message?: string;
}
```

#### Material-UI → Ant Design変換

| Material-UI | Ant Design | 用途 |
|------------|-----------|------|
| Dialog | Modal | ダイアログ |
| DialogTitle | Modal title | タイトル |
| DialogContent | Modal children | コンテンツ |
| DialogActions | Modal footer | アクション |
| Button | Button | ボタン |
| Typography | Typography.Text | テキスト |

## 4. 実装ステップ

### Step 1: reference版の確認
- [ ] SaveConfirmDialog.jsx の内容確認
- [ ] 使用されているpropsの確認
- [ ] イベントハンドリングの確認

### Step 2: TypeScript化
- [ ] Props型定義の作成
- [ ] イベントハンドラーの型定義

### Step 3: Ant Design変換
- [ ] Modal.confirmの使用検討
- [ ] カスタムModalの実装
- [ ] ボタン配置の調整

### Step 4: 動作確認
- [ ] TypeScriptエラーなし
- [ ] ESLintエラーなし

## 5. 技術的考慮事項

### Ant Design Modal.confirm の活用

Ant Designでは`Modal.confirm()`が用意されているため、以下の選択肢があります：

**選択肢1: Modal.confirm() を使用（推奨）**
```typescript
Modal.confirm({
  title: '保存確認',
  content: '変更を保存しますか？',
  okText: '保存',
  cancelText: 'キャンセル',
  onOk: onSave,
  onCancel: onClose,
});
```

**選択肢2: カスタムModalコンポーネント**
```typescript
<Modal
  open={open}
  title="保存確認"
  onOk={onSave}
  onCancel={onClose}
>
  <p>変更を保存しますか？</p>
</Modal>
```

→ **選択肢2を採用**（より柔軟なカスタマイズが可能）

## 6. 期待される成果

### 実装ファイル
- ✅ `SaveConfirmDialog.tsx` - 保存確認ダイアログ

### 機能
- ✅ 保存確認ダイアログの表示
- ✅ 保存ボタンクリック時の処理
- ✅ 破棄ボタンクリック時の処理
- ✅ キャンセル時の処理

## 7. リスクと対策

| リスク | 影響 | 対策 |
|-------|------|------|
| reference版が存在しない | 高 | 新規実装（Modal.confirmパターン） |
| propsの不一致 | 中 | PetriNetEditorV2.tsxの呼び出し方を確認 |

## 8. 次のアクション

Phase 13完了後、Phase 14（WorkflowSelectorDialog.tsx）に進みます。

---

**Phase 13 開始** 🚀