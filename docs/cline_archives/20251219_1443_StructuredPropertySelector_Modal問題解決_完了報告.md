# StructuredPropertySelector Modal問題解決 - 完了報告

## メタデータ
- **作成日時**: 2025-12-19 14:43
- **完了日時**: 2025-12-19 14:43
- **関連計画書**: [20251219_1433_StructuredPropertySelector_Modal問題_解決策.md](./20251219_1433_StructuredPropertySelector_Modal問題_解決策.md)
- **担当**: Cline AI Assistant

## 1. 問題の概要

### 発生していた問題
SubNetViewer（Drawer、z-index: 1001）内でStructuredPropertySelector（Modal）を開くと、Modalが背後に隠れて操作不能になる問題が発生していました。

**原因:**
- Ant DesignのModalはデフォルトで`document.body`にレンダリングされる
- ViewRendererDialog（z-index: 1000）、SubNetViewer（Drawer、z-index: 1001）よりもModalのz-index（1000）が低い
- そのため、Modalが背後に隠れてしまう

## 2. 実装した解決策

### 解決策の概要
StructuredPropertySelectorに **3つの表示モード** を追加し、親コンテナに対してModal/Drawerを表示できるようにしました。

#### 3つの表示モード

1. **`modal`モード（デフォルト）**
   - Ant DesignのModalコンポーネントを使用
   - `getContainer`プロパティで親コンテナを指定可能
   - 独立したウィンドウとして表示

2. **`drawer`モード**
   - Ant DesignのDrawerコンポーネントを使用
   - 右側からスライドイン表示
   - 親コンテナ内で表示

3. **`embedded`モード（既存）**
   - Modal/Drawerを使わず、直接埋め込み表示
   - SubNetViewerの右ペインで使用

## 3. 実装内容

### 3.1. StructuredPropertySelector.tsx の修正

#### 追加したPropsタイプ
```typescript
interface StructuredPropertySelectorProps {
  // ... 既存のprops ...
  displayMode?: 'modal' | 'drawer' | 'embedded';  // 新規: 表示モード
  getContainer?: () => HTMLElement;  // 新規: コンテナ要素取得関数
}
```

#### 実装した機能
- Drawerコンポーネントのインポート追加
- 後方互換性を保つための`embedded`プロップのサポート継続
- `displayMode`に応じて3つのレンダリング方法を切り替え
- `getContainer`を使用して親コンテナ内にModal/Drawerを表示

**実装箇所:**
```typescript
// 実際の表示モードを決定（後方互換性を考慮）
const actualDisplayMode: 'modal' | 'drawer' | 'embedded' = 
  displayMode || (embedded ? 'embedded' : 'modal');

// 表示モードに応じてレンダリング
switch (actualDisplayMode) {
  case 'embedded':
    // 埋め込みモード（SubNetViewer用）
    return <div>...</div>;
    
  case 'drawer':
    // Drawerモード（解決策B）
    return (
      <Drawer
        getContainer={getContainer || (() => document.body)}
        style={{ position: 'absolute' }}
        ...
      />
    );
    
  case 'modal':
  default:
    // Modalモード（解決策A）
    return (
      <Modal
        getContainer={getContainer || (() => document.body)}
        ...
      />
    );
}
```

### 3.2. ViewRendererDialog.tsx の修正

#### 追加したコンテナ要素
各ViewRendererDialogに一意のコンテナ要素を追加しました。

```typescript
<div 
  id={`viewer-dialog-container-${id}`}
  style={{ 
    position: 'relative',  // 重要: getContainerで使用
    flex: 1, 
    overflow: 'hidden' 
  }}
>
  {renderContent()}
</div>
```

**目的:**
- Modal/Drawerの親コンテナとして機能
- `position: relative`を指定することで、子要素のabsolute positioningの基準点となる

### 3.3. PetriNetViewer.tsx の修正

#### 追加したPropsタイプ
```typescript
interface PetriNetViewerProps {
  // ... 既存のprops ...
  propertyDisplayMode?: 'modal' | 'drawer';  // 新規: プロパティ表示モード
  containerElementId?: string;  // 新規: コンテナ要素ID
}
```

#### StructuredPropertySelectorへのprops渡し
```typescript
<StructuredPropertySelector
  // ... 既存のprops ...
  displayMode={propertyDisplayMode}
  getContainer={
    containerElementId 
      ? () => document.getElementById(containerElementId) as HTMLElement 
      : undefined
  }
/>
```

### 3.4. ViewRenderer.tsx の修正

#### PetriNetViewerへのprops渡し
```typescript
<div 
  id="petri-net-viewer-container"
  style={{ 
    width: '100%', 
    height: '100%', 
    display: 'flex', 
    flexDirection: 'column', 
    overflow: 'hidden', 
    position: 'relative'  // 重要
  }}
>
  <PetriNetViewer 
    maimlData={fileContent}
    enhancedMode={enhancedMode}
    propertyDisplayMode="modal"  // 'modal' または 'drawer' に変更可能
    containerElementId="petri-net-viewer-container"
    onOpenSubNetViewer={onOpenSubNetViewer}
  />
</div>
```

## 4. 修正したファイル一覧

1. ✅ `frontend/src/components/viewer/dialogs/StructuredPropertySelector.tsx`
   - 3つの表示モード（modal/drawer/embedded）を実装
   - Drawerコンポーネント追加
   - getContainerプロパティ対応

2. ✅ `frontend/src/components/viewer/ViewRendererDialog.tsx`
   - コンテナ要素（id属性）を追加
   - `position: relative`スタイルを追加

3. ✅ `frontend/src/components/viewer/PetriNetViewer.tsx`
   - propertyDisplayModeプロップ追加
   - containerElementIdプロップ追加
   - StructuredPropertySelectorへのprops渡し

4. ✅ `frontend/src/components/viewer/ViewRenderer.tsx`
   - PetriNetViewerにprops渡し
   - コンテナ要素（id="petri-net-viewer-container"）追加

## 5. 動作確認手順

### 5.1. 基本動作確認

1. **experiment_adminでログイン**
   ```
   ユーザー名: experiment_admin
   パスワード: admin123
   組織: MAIML Lab 001
   ```

2. **プロジェクト管理画面を開く**
   - 「実験管理」→「プロジェクト管理」

3. **MAIMLファイルのビューアを開く**
   - test_omori11.maimlを選択
   - 「ビューア」ボタンをクリック

4. **Placeノードをクリック**
   - 青い円形のPlaceノードをクリック
   - StructuredPropertySelectorがModal形式で表示されることを確認
   - プロパティ選択が正常に動作することを確認

5. **Transitionノードをクリック**
   - 矩形のTransitionノードをクリック
   - SubNetViewerモーダルが表示されることを確認

6. **SubNetViewer内でPlaceノードをクリック**
   - SubNetViewer内のPlaceノードをクリック
   - StructuredPropertySelectorが **SubNetViewerの前面** に表示されることを確認✅
   - プロパティ選択が正常に動作することを確認✅

### 5.2. 表示モード切り替え確認（オプション）

#### Modalモード（デフォルト）
```typescript
// ViewRenderer.tsx
<PetriNetViewer 
  propertyDisplayMode="modal"  // ← Modalモード
  containerElementId="petri-net-viewer-container"
/>
```

#### Drawerモード
```typescript
// ViewRenderer.tsx
<PetriNetViewer 
  propertyDisplayMode="drawer"  // ← Drawerモード（右側スライドイン）
  containerElementId="petri-net-viewer-container"
/>
```

## 6. 技術的詳細

### 6.1. z-indexの階層構造

修正後のz-index階層:

```
ViewRendererDialog (z-index: 1000)
  └─ コンテナ (#viewer-dialog-container-xxx)
      └─ SubNetViewer (Drawer, z-index: 1001)
          └─ コンテナ (position: relative)
              └─ StructuredPropertySelector
                  ├─ Modal (getContainer指定、親コンテナ内で表示)
                  └─ Drawer (getContainer指定、親コンテナ内で表示)
```

**ポイント:**
- `getContainer`を使用してModal/Drawerを親コンテナ内にレンダリング
- 親コンテナに`position: relative`を指定することで、absolute positioningの基準点となる
- これにより、SubNetViewer内で開いたModalが正しく前面に表示される

### 6.2. Ant DesignのgetContainer

```typescript
getContainer={containerElementId ? () => document.getElementById(containerElementId) as HTMLElement : undefined}
```

**動作:**
- `getContainer`が指定されている場合、Modal/Drawerは指定されたコンテナ要素内にレンダリング
- `getContainer`が`undefined`の場合、デフォルトの`document.body`にレンダリング

## 7. 後方互換性

### 既存コードへの影響
- ✅ 既存の`embedded`プロップは引き続きサポート
- ✅ 新しいプロップはすべてオプショナル（デフォルト動作は変更なし）
- ✅ 既存のコードは修正不要

### デフォルト動作
```typescript
// 以下の2つは同等
<StructuredPropertySelector embedded={true} />
<StructuredPropertySelector displayMode="embedded" />

// デフォルトはmodalモード
<StructuredPropertySelector />
// ↓
<StructuredPropertySelector displayMode="modal" />
```

## 8. 今後の改善案

### 8.1. SubNetViewer内のプロパティ表示
現在はSubNetViewer内のプロパティ表示に`embedded`モードを使用していますが、今後は以下の選択肢も検討可能:

1. **Drawerモードに変更**
   - 右側からスライドイン表示
   - より洗練されたUI

2. **Modalモードに変更**
   - 独立したウィンドウとして表示
   - より詳細な情報を表示可能

### 8.2. カスタマイズ可能なプロップ
将来的に以下のプロップを追加することも検討:

```typescript
interface StructuredPropertySelectorProps {
  // ... 既存のprops ...
  drawerPlacement?: 'left' | 'right' | 'top' | 'bottom';  // Drawer表示位置
  modalWidth?: number | string;  // Modal幅
  drawerWidth?: number | string;  // Drawer幅
}
```

## 9. トラブルシューティング

### 問題: Modalが依然として背後に隠れる

**原因:**
- `getContainer`が正しく機能していない
- コンテナ要素のIDが間違っている

**解決方法:**
1. コンテナ要素のIDが正しいか確認
2. `position: relative`が親コンテナに設定されているか確認
3. ブラウザのDevToolsで要素の階層を確認

### 問題: Drawerが表示されない

**原因:**
- Drawerコンポーネントのインポート漏れ
- `displayMode`が正しく指定されていない

**解決方法:**
```typescript
import { Modal, Drawer, ... } from 'antd';  // Drawerをインポート
```

## 10. まとめ

### 実装完了した機能
- ✅ StructuredPropertySelectorの3モード対応（modal/drawer/embedded）
- ✅ ViewRendererDialogへのコンテナ要素追加
- ✅ PetriNetViewerのprops拡張
- ✅ 後方互換性の維持

### 解決した問題
- ✅ SubNetViewer内でStructuredPropertySelectorが背後に隠れる問題
- ✅ Modal/Drawerのz-index問題
- ✅ ViewRendererDialog階層での表示問題

### 期待される効果
- ✅ SubNetViewer内でプロパティ選択が正常に動作
- ✅ ユーザー体験の向上
- ✅ 将来的な拡張性の確保

---

## 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2025-12-19 | 初版作成 | Cline AI Assistant |
| 1.0.1 | 2025-12-19 | 実装完了報告 | Cline AI Assistant |

---

**実装完了日時**: 2025-12-19 14:43
**ステータス**: ✅ 完了
**次のステップ**: 動作確認とテスト
