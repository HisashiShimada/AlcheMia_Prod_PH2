# TemplateEditorDialog Phase 3実装 引継ぎ資料

## 作成日時
2026-02-02 09:25

## 前セッションの状態

### ✅ 完了済み（Phase 1-2）
- Phase 1-1: Place References編集機能 ✅
- Phase 1-2: テンプレートID重複チェック ✅
- Phase 2-1: 継承元プロパティ表示 ✅
- Phase 2-2: カスタム属性名入力 ✅

### ✅ Phase 3基盤準備完了
前セッションでPhase 3用のStateを追加済み：

```typescript
// ✅ Phase 3: 高度な名前空間取り込みUI用State
const [previewContent, setPreviewContent] = useState<{
  xml?: string;
  properties?: Record<string, PropertyData>;
  error?: string;
}>({});
const [showConfirmDialog, setShowConfirmDialog] = useState(false);
const [duplicateKeys, setDuplicateKeys] = useState<string[]>([]);
```

**ファイル位置**: `frontend/src/components/editorv2/components/TemplateEditorDialog.tsx`  
**追加済み行数**: 約10行（State定義）

---

## 📋 このセッションで実装するPhase 3機能

### Phase 3-1: フォルダツリー表示（約80行）
**目的**: Select → TreeSelect への置き換え

**実装内容**:
1. TreeSelectコンポーネントのimport
2. `buildTreeData`関数の実装（ファイルパスから階層構造を構築）
3. TreeSelectへのUI変更
4. アイコン表示（FolderOutlined, FileOutlined）

### Phase 3-2: ファイルプレビュー機能（約100行）
**目的**: ファイル選択時にXMLとプロパティをプレビュー

**実装内容**:
1. `handleFileSelect`関数の実装
2. XMLプレビューUI（Collapse + pre要素）
3. プロパティ一覧プレビューUI
4. エラーハンドリング

### Phase 3-3: 取り込み確認機能（約50行）
**目的**: 取り込み前の確認と重複検出

**実装内容**:
1. `handleImportClick`関数の修正（重複チェック追加）
2. 確認ダイアログUI（Modal）
3. `handleConfirmImport`関数の実装
4. 重複プロパティの警告表示

---

## 🎯 実装戦略

### コンテキストウィンドウ管理
- 現在のファイルサイズ: 約1100行
- 追加予定行数: 約230行
- コンテキストウィンドウ: 86%使用中

**戦略**: 段階的に実装し、各Phaseごとに完了報告

### 実装順序
1. **Phase 3-1**: TreeSelect実装（基盤）
2. **Phase 3-2**: プレビュー機能（UX向上）
3. **Phase 3-3**: 確認機能（安全性向上）

---

## 📝 実装時の注意事項

### 既存コードとの統合
- 既存の`handleImportNamespace`関数を維持
- `selectedTemplateFile`の型は変更なし（string）
- モーダルの構造は既存のまま拡張

### TreeSelect実装時の注意
```typescript
// TreeNodeの型定義
interface TreeNode {
  title: string;
  value: string;
  key: string;
  isLeaf?: boolean;
  children?: TreeNode[];
  icon?: React.ReactNode;
}
```

### プレビュー機能実装時の注意
- `parseNamespacesFromXml`関数は既存のものを再利用
- XMLは最初の500行に制限（大きなファイル対策）
- エラー時は`previewContent.error`に格納

### 確認機能実装時の注意
- 重複チェックは`Object.keys(properties)`と比較
- 重複がない場合も確認ダイアログを表示
- OKボタン押下時に実際の取り込み処理を実行

---

## 🔗 関連ドキュメント

- [Phase 3計画書](./20260202_0920_TemplateEditorDialog差分修正_Phase3計画書.md)
- [Phase 3実装状況](./20260202_0922_TemplateEditorDialog差分修正_Phase3実装状況.md)
- [差分調査レポート](./20260202_0905_TemplateEditorDialog差分調査_レポート.md)

---

## ✅ 実装完了基準

### Phase 3-1
- [ ] TreeSelectコンポーネント導入
- [ ] buildTreeData関数実装
- [ ] フォルダ/ファイルアイコン表示
- [ ] ファイル選択動作確認

### Phase 3-2
- [ ] handleFileSelect関数実装
- [ ] XMLプレビュー表示
- [ ] プロパティ一覧プレビュー表示
- [ ] エラーハンドリング動作確認

### Phase 3-3
- [ ] handleImportClick修正
- [ ] 重複チェックロジック実装
- [ ] 確認ダイアログUI実装
- [ ] handleConfirmImport実装

---

**Phase 3実装準備完了 - このセッションで全実装を完了させます** ✅