# TemplateEditorDialog Reference版移植タスク計画書

**作成日時**: 2026-01-29 10:37
**対象ファイル**: `frontend/src/components/editor/TemplateEditorDialog.tsx`
**参照ファイル**: `reference/frontend/src/components/PetriNetEditorV2/components/TemplateEditorDialog.jsx`

## 📋 概要

reference版のTemplateEditorDialog.jsxをベースに、現在のTypeScript + Ant Design v6版を完全に作り直します。

## 🔍 主要な差分分析

### 1. UIライブラリの違い
- **現在版**: Ant Design v6 (Modal, Button, Input, etc.)
- **Reference版**: Material-UI (Dialog, Button, TextField, etc.)
- **対応**: Ant Design v6コンポーネントに変換

### 2. 言語の違い
- **現在版**: TypeScript
- **Reference版**: JavaScript
- **対応**: 型定義を追加しながら移植

### 3. 機能面の差分

#### Reference版で実装されている重要機能：
1. ✅ **継承元テンプレート情報の詳細表示**
   - XMLから直接子要素を抽出する処理
   - 配列形式とNestedPropertyEditor形式の両対応
   - 詳細な子要素表示（孫要素まで）

2. ✅ **PlaceReferences管理機能**
   - 完全な追加・削除機能
   - 既存Place一覧からの選択UI

3. ✅ **Template ID管理**
   - 重複チェック機能
   - ノードIDとの競合チェック

4. ✅ **forceRenderKey実装**
   - PropertiesとContents両方で実装
   - 強制再レンダリング対応

5. ✅ **名前空間取り込み機能**
   - フォルダツリー表示
   - ファイル選択UI
   - プレビュー機能

6. ✅ **エラー表示セクション**
   - templateErrorsの表示
   - バリデーション警告の詳細表示

7. ✅ **mergedTemplateの計算**
   - useMemoでの最適化
   - placeRefsの正規化処理

## 📝 実装タスク

### Phase 1: 基本構造の移植
- [ ] Reference版の全体構造を理解
- [ ] TypeScript型定義の追加
- [ ] Ant Design v6コンポーネントへの変換表作成

### Phase 2: 継承元テンプレート情報の移植
- [ ] extractChildrenFromXMLの実装
- [ ] inheritedTemplateのuseMemo実装
- [ ] XMLから子要素を直接抽出する処理
- [ ] 配列形式とNestedPropertyEditor形式の両対応
- [ ] 継承元プロパティの詳細表示UI

### Phase 3: PlaceReferences管理機能の移植
- [ ] placeRefsのState管理
- [ ] Place追加ダイアログ
- [ ] 既存Place一覧の取得・表示
- [ ] Place削除機能

### Phase 4: Template ID管理の移植
- [ ] templateIdのState管理
- [ ] 重複チェック関数の実装
- [ ] ノードIDとの競合チェック
- [ ] バリデーションメッセージ表示

### Phase 5: forceRenderKey実装
- [ ] PropertiesのforceRenderKey実装
- [ ] ContentsのforceRenderKey実装
- [ ] 再レンダリング最適化

### Phase 6: 名前空間取り込み機能の移植
- [ ] フォルダツリー表示の実装
- [ ] renderFolderTree関数の移植
- [ ] ファイル選択UIの実装
- [ ] プレビュー機能の実装

### Phase 7: エラー表示セクションの移植
- [ ] templateErrorsの型定義
- [ ] エラー表示UIの実装
- [ ] バリデーション警告の表示

### Phase 8: mergedTemplateの最適化
- [ ] useMemoでの計算実装
- [ ] placeRefsの正規化処理
- [ ] デバッグログの追加

### Phase 9: 細かい修正
- [ ] 属性追加モーダルの改善
- [ ] 子要素追加時の重複チェック
- [ ] コピー機能の実装
- [ ] 全体的なUI調整

### Phase 10: テスト・検証
- [ ] 動作確認
- [ ] バグ修正
- [ ] 最終調整

## 🎯 重要なポイント

### 1. コンポーネント変換表

| Material-UI | Ant Design v6 | 備考 |
|------------|---------------|------|
| Dialog | Modal | fullWidth → width="lg" |
| DialogTitle | Modal title prop | |
| DialogContent | Modal children | |
| DialogActions | Modal footer prop | |
| Button | Button | |
| TextField | Input/TextArea | |
| Select | Select | |
| MenuItem | Select.Option | |
| FormControl | Form.Item | |
| Chip | Tag/Badge | |
| Alert | Alert | |
| Box | div with sx → style | |
| IconButton | Button type="text" | |
| Typography | Typography.Text/Title | |

### 2. スタイリング変換

```jsx
// Material-UI
<Box sx={{ mb: 2, p: 1 }}>

// Ant Design v6
<div style={{ marginBottom: 16, padding: 8 }}>
```

### 3. 型定義の追加

```typescript
interface TemplateEditorDialogProps {
  open: boolean;
  onClose: () => void;
  node: Node | null;
  onSave: (updatedNode: Node) => void;
  allNodes?: Node[];
  templateErrors?: Record<string, any[]>;
}
```

## ⚠️ 注意事項

1. **既存コードの完全置き換え**
   - 現在のコードは残さず、reference版をベースに完全に作り直す

2. **forceRenderKeyの実装**
   - PropertiesとContents両方で必須
   - `Date.now()`を使用

3. **placeRefsの正規化**
   - 配列形式に統一
   - 文字列とオブジェクト形式の両対応

4. **継承元テンプレート情報**
   - XMLからの直接抽出処理が重要
   - デバッグログを残す

5. **Template ID重複チェック**
   - ノードIDとの競合チェック
   - 他のテンプレートIDとの重複チェック

## 📦 成果物

- `frontend/src/components/editor/TemplateEditorDialog.tsx` (完全書き換え)

## ✅ 完了条件

- [ ] reference版の全機能を実装
- [ ] TypeScript型エラーなし
- [ ] Ant Design v6で正常に動作
- [ ] 継承元テンプレート情報が正しく表示される
- [ ] PlaceReferences管理が正常に動作
- [ ] Template ID重複チェックが機能
- [ ] 名前空間取り込みが正常に動作
- [ ] forceRenderKeyで再レンダリングが正常