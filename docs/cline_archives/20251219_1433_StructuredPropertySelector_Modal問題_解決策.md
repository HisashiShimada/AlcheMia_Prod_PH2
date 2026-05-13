# StructuredPropertySelector Modal問題 - 解決策まとめ

## メタデータ
- **作成日時**: 2025-12-19 14:33
- **問題ID**: StructuredPropertySelector_Modal_Issue
- **優先度**: 高

## 1. 問題の概要

### 現状の問題
StructuredPropertySelectorがModalで開くと、**元のフローティングダイアログではなく画面全体が操作不能**になります。

**期待される動作:**
- StructuredPropertySelectorを開いているフローティングダイアログ内のコンテンツのみが操作不能
- 元の画面（ProjectManagement）は操作可能

**現在の動作:**
- StructuredPropertySelector（Modal）が開くと画面全体にオーバーレイが表示される
- 全てのUIが操作不能になる
- フローティングダイアログの独立性が損なわれる

### 根本原因
Ant DesignのModalは、デフォルトで`document.body`直下にPortalでレンダリングされるため、画面全体にオーバーレイが表示されます。

## 2. 解決策の比較

### 解決策A: Modal + getContainer（推奨）★★★★☆

#### 概要
Ant DesignのModalの`getContainer`プロパティを使用して、フローティングダイアログ内にModalをレンダリングします。

#### メリット
- ✅ 既存のModalコンポーネントをほぼそのまま使用可能
- ✅ コード変更が最小限
- ✅ Ant Designの標準機能で実現可能
- ✅ z-index管理が容易

#### デメリット
- ❌ フローティングダイアログのサイズを超えてModalが表示される場合がある
- ❌ ドラッグ中のダイアログとModalの同期が必要

#### 実装方法
```typescript
// PetriNetViewer.tsx
<StructuredPropertySelector
  open={dialogVisible}
  onClose={() => setDialogVisible(false)}
  getContainer={() => document.getElementById('viewer-dialog-container')}
  // その他のprops
/>

// ViewRendererDialog.tsx
<div id="viewer-dialog-container" style={{ position: 'relative', height: '100%' }}>
  {/* コンテンツ */}
</div>
```

#### 実装難易度
⭐⭐☆☆☆（簡単）

#### 推定工数
30分

---

### 解決策B: Drawerに変更（推奨）★★★★★

#### 概要
StructuredPropertySelectorをAnt DesignのDrawerコンポーネントに変更し、サイドパネルとして表示します。

#### メリット
- ✅ フローティングダイアログ内に完全に収まる
- ✅ UIがよりモダン
- ✅ getContainerで完全にダイアログ内に制限できる
- ✅ ドラッグ時の挙動が安定
- ✅ モバイル対応にも有利

#### デメリット
- ❌ コンポーネントの書き換えが必要（Modal → Drawer）
- ❌ レイアウト調整が必要

#### 実装方法
```typescript
// StructuredPropertySelector.tsx
import { Drawer } from 'antd';

<Drawer
  title="プロパティ選択"
  placement="right"
  open={open}
  onClose={onClose}
  width={400}
  getContainer={() => document.getElementById('viewer-dialog-container')}
  style={{ position: 'absolute' }}
  mask={true}
  maskClosable={true}
>
  {/* 既存のコンテンツ */}
</Drawer>
```

#### 実装難易度
⭐⭐⭐☆☆（中程度）

#### 推定工数
1時間

---

### 解決策C: 別ウィンドウで開く ★★★☆☆

#### 概要
`window.open()`を使用して新しいブラウザウィンドウでビューアを開きます。

#### メリット
- ✅ 完全に独立したウィンドウ
- ✅ z-index問題が完全に解消
- ✅ 複数ウィンドウで同時作業可能
- ✅ マルチモニター環境で有利

#### デメリット
- ❌ ポップアップブロックの可能性
- ❌ セッション/認証情報の共有が必要
- ❌ ウィンドウ間通信（postMessage）の実装が必要
- ❌ 実装コストが高い
- ❌ モバイル非対応

#### 実装方法
```typescript
// ProjectManagement.tsx
const handleViewFileInNewWindow = (file: any) => {
  const url = `/viewer?fileId=${file.id}`;
  const windowFeatures = 'width=1200,height=800,menubar=no,toolbar=no,location=no';
  const newWindow = window.open(url, '_blank', windowFeatures);
  
  // ウィンドウ間通信
  window.addEventListener('message', (event) => {
    if (event.source === newWindow) {
      // 新しいウィンドウからのメッセージを処理
    }
  });
};

// 新しいページ: /viewer
// Next.jsの新しいルートとして実装
```

#### 実装難易度
⭐⭐⭐⭐⭐（高難度）

#### 推定工数
4-6時間

#### 追加で必要な実装
1. 新しいNext.jsページルート作成（`/viewer`）
2. セッション共有の実装
3. ウィンドウ間通信の実装（postMessage API）
4. ポップアップブロック対策
5. ウィンドウクローズ時のクリーンアップ

---

### 解決策D: embedded=trueを強制（暫定対応）★★☆☆☆

#### 概要
PetriNetViewer内のStructuredPropertySelectorを常にembedded=trueにして、Modalを使用しないようにします。

#### メリット
- ✅ 最も簡単な実装
- ✅ コード変更が最小限

#### デメリット
- ❌ PetriNetViewer内にプロパティパネルが常時表示される
- ❌ 画面が狭くなる
- ❌ UX的に劣る

#### 実装方法
```typescript
// PetriNetViewer.tsx
// 右ペインを追加してembedded=trueで常時表示
<div style={{ display: 'flex' }}>
  <div style={{ flex: 1 }}>
    <ReactFlow ... />
  </div>
  <div style={{ width: 400 }}>
    <StructuredPropertySelector
      embedded={true}
      // その他のprops
    />
  </div>
</div>
```

#### 実装難易度
⭐☆☆☆☆（非常に簡単）

#### 推定工数
15分

---

## 3. 推奨実装プラン

### 第1優先: 解決策B（Drawerに変更）★★★★★

**理由:**
1. UX的に最適（サイドパネル形式）
2. フローティングダイアログ内に完全に制限できる
3. モバイル対応にも有利
4. 実装コストが妥当

**実装手順:**
1. StructuredPropertySelector.tsxをDrawerベースで書き直し
2. getContainerを使用してダイアログ内に表示
3. PetriNetViewer.tsxの呼び出し部分を調整
4. スタイル調整

**推定工数:** 1時間

---

### 第2優先: 解決策A（Modal + getContainer）★★★★☆

**理由:**
1. 最小限のコード変更
2. 既存のModalロジックを維持
3. すぐに実装可能

**実装手順:**
1. ViewRendererDialog.tsxにcontainer要素を追加
2. StructuredPropertySelectorにgetContainerを追加
3. スタイル調整（position: relative等）

**推定工数:** 30分

---

### 将来的な検討: 解決策C（別ウィンドウ）★★★☆☆

**理由:**
1. より高度なユーザー体験
2. マルチモニター環境での利便性
3. Phase 5以降での実装を検討

**実装タイミング:** Phase 5以降（オプション機能として）

---

## 4. 各解決策の技術的詳細

### 解決策A: Modal + getContainer

#### StructuredPropertySelector.tsx
```typescript
interface StructuredPropertySelectorProps {
  // 既存のprops
  getContainer?: () => HTMLElement;  // 追加
}

const StructuredPropertySelector: React.FC<StructuredPropertySelectorProps> = ({
  // 既存のprops
  getContainer,  // 追加
}) => {
  // 通常モード（Modal）
  return (
    <Modal
      title={`プロパティ選択: ${nodeName || nodeId || '未選択'}`}
      open={open}
      onCancel={onClose}
      onOk={onClose}
      width={800}
      style={{ top: 80 }}
      getContainer={getContainer || (() => document.body)}  // 追加
      bodyStyle={{ maxHeight: '70vh', overflow: 'hidden' }}
    >
      {renderContent()}
    </Modal>
  );
};
```

#### ViewRendererDialog.tsx
```typescript
<div 
  id="viewer-dialog-container"
  style={{ 
    position: 'relative',  // 重要
    width: '100%', 
    height: '100%',
    overflow: 'hidden'
  }}
>
  <ViewRenderer
    // props
    containerElement={document.getElementById('viewer-dialog-container')}
  />
</div>
```

#### PetriNetViewer.tsx
```typescript
<StructuredPropertySelector
  open={dialogVisible}
  onClose={() => setDialogVisible(false)}
  // 既存のprops
  getContainer={() => document.getElementById('viewer-dialog-container') || document.body}
/>
```

---

### 解決策B: Drawerに変更

#### StructuredPropertySelector.tsx（全面書き換え）
```typescript
import { Drawer, Tabs, List, Checkbox, Tag, Typography, Space, Empty } from 'antd';

const StructuredPropertySelector: React.FC<StructuredPropertySelectorProps> = ({
  open,
  onClose,
  // 既存のprops
  getContainer,  // 新規追加
}) => {
  // embedded=trueの場合は既存のdiv表示
  if (embedded) {
    return (/* 既存のdiv表示コード */);
  }

  // 通常モード（Drawer）
  return (
    <Drawer
      title={`プロパティ選択: ${nodeName || nodeId || '未選択'}`}
      placement="right"
      open={open}
      onClose={onClose}
      width={400}
      getContainer={getContainer || (() => document.body)}
      style={{ position: 'absolute' }}  // 重要
      mask={true}
      maskClosable={true}
      destroyOnClose={false}
    >
      {renderContent()}
    </Drawer>
  );
};
```

---

### 解決策C: 別ウィンドウで開く

#### 新しいページ: app/viewer/page.tsx
```typescript
'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import ViewRenderer from '@/components/viewer/ViewRenderer';

export default function ViewerPage() {
  const searchParams = useSearchParams();
  const fileId = searchParams.get('fileId');
  const [fileData, setFileData] = useState(null);

  useEffect(() => {
    // fileIdを使ってファイルデータを取得
    // 親ウィンドウから認証情報を受け取る
    window.addEventListener('message', (event) => {
      if (event.data.type === 'FILE_DATA') {
        setFileData(event.data.payload);
      }
    });

    // 親ウィンドウにファイルデータを要求
    if (window.opener) {
      window.opener.postMessage({ type: 'REQUEST_FILE_DATA', fileId }, '*');
    }
  }, [fileId]);

  return (
    <div style={{ height: '100vh' }}>
      <ViewRenderer
        selectedFile={fileData}
        // その他のprops
      />
    </div>
  );
}
```

#### ProjectManagement.tsx
```typescript
const handleViewFileInNewWindow = useCallback((file: any) => {
  const url = `/viewer?fileId=${file.id}`;
  const windowFeatures = 'width=1200,height=800,menubar=no,toolbar=no';
  const newWindow = window.open(url, `viewer-${file.id}`, windowFeatures);

  if (!newWindow) {
    message.error('ポップアップがブロックされました。ブラウザの設定を確認してください。');
    return;
  }

  // 新しいウィンドウからのリクエストを待つ
  const handleMessage = (event: MessageEvent) => {
    if (event.source === newWindow) {
      if (event.data.type === 'REQUEST_FILE_DATA') {
        // ファイルデータを送信
        newWindow.postMessage({
          type: 'FILE_DATA',
          payload: file
        }, '*');
      }
    }
  };

  window.addEventListener('message', handleMessage);

  // クリーンアップ
  newWindow.addEventListener('beforeunload', () => {
    window.removeEventListener('message', handleMessage);
  });
}, []);
```

---

## 5. 実装の優先順位と推奨

### 即座に実装（Phase 4.1）
**解決策B: Drawerに変更**
- 最もバランスの取れた解決策
- UX的に優れている
- 実装コストが妥当

### 代替案（Phase 4.2）
**解決策A: Modal + getContainer**
- Drawerでの実装が難しい場合のフォールバック
- より短時間で実装可能

### 将来的な機能拡張（Phase 5）
**解決策C: 別ウィンドウで開く**
- オプション機能として実装
- 「新しいウィンドウで開く」ボタンを追加
- マルチモニター環境での利便性向上

---

## 6. まとめ

### 推奨実装
1. **第1候補**: 解決策B（Drawer）- 1時間で実装可能
2. **第2候補**: 解決策A（Modal + getContainer）- 30分で実装可能
3. **将来的**: 解決策C（別ウィンドウ）- Phase 5以降で検討

### 次のアクション
どの解決策を実装するか選択してください：
- **Option 1**: Drawerに変更（推奨、1時間）
- **Option 2**: Modal + getContainer（簡単、30分）
- **Option 3**: 別ウィンドウ（高機能、4-6時間）

どの方法で進めますか？
