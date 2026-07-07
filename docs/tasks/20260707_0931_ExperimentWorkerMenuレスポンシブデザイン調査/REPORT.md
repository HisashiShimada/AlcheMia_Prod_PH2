# ExperimentWorkerMenu レスポンシブデザイン調査レポート

- **調査日時**: 2026-07-07 09:31
- **調査対象**: `frontend/src/components/menus/ExperimentWorkerMenu.tsx` および関連ファイル

---

## 1. 調査対象ファイル一覧

| ファイル | 役割 |
|--------|------|
| `frontend/src/components/menus/ExperimentWorkerMenu.tsx` | 実験作業者メニューのルートコンポーネント |
| `frontend/src/components/common/Header.tsx` | 上段ヘッダー（固定、高さ64px） |
| `frontend/src/components/common/SubHeader.tsx` | 下段サブヘッダー（固定、高さ48px） |
| `frontend/src/components/ExperimentWorker/ProgressCheckTab.tsx` | 進捗確認タブ |
| `frontend/src/components/ExperimentWorker/InstructionConfirmationTab.tsx` | 指示確認タブ |
| `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx` | 実験記録タブ |
| `frontend/src/components/ExperimentWorker/MethodTaskSelector.tsx` | メソッド・タスク選択エリア（共通） |
| `frontend/src/hooks/useInstructions.ts` | 指示データ管理フック |
| `frontend/src/hooks/useExpandState.ts` | 展開/折りたたみ状態管理フック |
| `frontend/src/app/globals.css` / `globals.scss` | グローバルスタイル |
| `frontend/src/theme/theme.ts` | Ant Design テーマ設定 |

---

## 2. レスポンシブデザインの全体構成

### 2-1. 採用されているアプローチ

| 手法 | 使用箇所 | 詳細 |
|------|---------|------|
| **CSS メディアクエリ（`@media`）** | `ExperimentWorkerMenu.tsx` の `ResponsiveContainer` | `@emotion/styled` によるブレークポイント定義 |
| **Ant Design のデザイントークン** | 全コンポーネント共通 | `theme.useToken()` でスペーシングを取得 |
| **Flexbox レイアウト** | プロジェクト選択エリア、MethodTaskSelector など | `display: flex` + `flexWrap` で折り返し制御 |
| **グローバル CSS（Ant Design 上書き）** | `globals.css` / `globals.scss` | タブ（`.ant-tabs`）の高さ・スクロール制御 |

---

## 3. 各ファイルの実装詳細

### 3-1. ExperimentWorkerMenu.tsx（メインコンポーネント）

#### `ResponsiveContainer`（styled-component）

```tsx
const ResponsiveContainer = styled.div`
  max-width: 100%;
  width: 100%;
  margin: 0 auto;
  padding: 0 8px;

  @media (min-width: 768px) {
    max-width: 768px;
    padding: 0 16px;
  }

  @media (min-width: 992px) {
    max-width: 992px;
  }

  @media (min-width: 1200px) {
    max-width: 1200px;
  }

  @media (min-width: 1600px) {
    max-width: 1400px;
  }
`;
```

**ポイント**：
- このコンポーネントはファイル内で**定義されているが、JSX 上では使用されていない**。
- 現時点では `contentBody` の外側ラッパーとして使われておらず、将来の拡張や参照用として残っている状態。
- コメントに「UIポリシー準拠」と記載されており、今後のコンテナ幅制御のテンプレートとして定義されたものと判断できる。

#### ブレークポイント定義（コメント明記）

```
xs, sm (< 768px): 100% 幅
md  (768px+)    : 最大 768px
lg  (992px+)    : 最大 992px
xl  (1200px+)   : 最大 1200px
xxl (1600px+)   : 最大 1400px
```

#### レイアウト定数

```tsx
const HEADER_HEIGHT = 64;        // Header 高さ
const SUBHEADER_HEIGHT = 48;     // SubHeader 高さ（タブなし）
const SELECTION_AREA_HEIGHT = 56;// プロジェクト・メソッド選択エリア高さ
const TOTAL_HEADER_HEIGHT = HEADER_HEIGHT + SUBHEADER_HEIGHT; // 112px
```

`Content` の `marginTop: TOTAL_HEADER_HEIGHT` でコンテンツが固定ヘッダーと重ならないように制御している。

#### プロジェクト選択エリアの Flexbox

```tsx
<div style={{
  height: SELECTION_AREA_HEIGHT,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-start',
  gap: token.marginXS,
  flexWrap: 'nowrap',  // ← 折り返しなし（固定高さ56px確保のため）
  paddingLeft: token.paddingLG,
  paddingRight: token.paddingLG,
}}>
```

`flexWrap: 'nowrap'` にすることで選択エリアが常に1行に収まるよう設計されている。

#### overlayMode（モーダル埋め込みモード）

```tsx
if (overlayMode) {
  return (
    <div style={{ height: '100%', overflow: 'auto', background: token.colorBgLayout }}>
      {contentBody}
    </div>
  );
}
```

Header/SubHeader を非表示にし、コンテンツのみ表示するモード。他画面へのオーバーレイ表示（モーダル内埋め込み）に対応する設計。

---

### 3-2. Header.tsx

```tsx
<AntHeader style={{
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  zIndex: 1000,
  display: 'flex',
  alignItems: 'center',
  padding: '0 12px',
  height: 64,
  lineHeight: '64px',
}}>
```

- `position: fixed` で全画面幅に固定。
- メディアクエリは使わず、**Flexbox の `flex: 1`（サブタイトル）と `marginLeft: auto`（ユーザー情報）**で左右の要素を分配。
- ロゴ・アイコンは `flexShrink: 0` で縮小を防止。

---

### 3-3. SubHeader.tsx

#### `styled-component` によるレイアウト制御

```tsx
const SubHeaderContainer = styled.div<{ token: ThemeToken }>`
  position: fixed;
  top: 64px;
  left: 0;
  right: 0;
  z-index: 999;
  background-color: ${props => props.token.colorInfo};
`;

const SubHeaderContent = styled.div<{ token: ThemeToken }>`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: ${props => props.token.marginLG}px;
`;

const TabsWrapper = styled.div`
  flex: 1;
  min-width: 0;  // ← テキストオーバーフロー防止
`;
```

- `fixed` 配置で Header の直下 (`top: 64px`) に固定。
- `TitleWrapper` は `flex-shrink: 0`（縮まない）、`TabsWrapper` は `flex: 1; min-width: 0`（残り幅を使い切る）。
- メディアクエリは**使用していない**。

---

### 3-4. ProgressCheckTab.tsx

- メディアクエリなし。
- `theme.useToken()` でスペーシングを動的取得。
- カードコンポーネント（`<Card>`）は Ant Design の内部レスポンシブに依存。
- メソッドタブのラベルは `textAlign: 'left'` と固定サイズ（`fontSize: '14px'`）で表示。

---

### 3-5. InstructionConfirmationTab.tsx

- メディアクエリなし。
- `height: '100%', overflow: 'auto'` でタブペイン内スクロールを自前制御。
- `display: 'flex', alignItems: 'center', justifyContent: 'space-between'` でタイトルと確認ボタンを横並び。

---

### 3-6. ExperimentRecordTab.tsx

- メディアクエリなし。
- `display: 'flex', flexDirection: 'column'` + `flex: 1, minHeight: 0` で縦方向の余白をフレキシブルに制御。
- カードを `flex: 1` で伸長させて画面高さを埋める設計。

---

### 3-7. MethodTaskSelector.tsx（共通コンポーネント）

```tsx
<div style={{ 
  marginBottom: 8,
  height: 56,
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  paddingLeft: token.paddingLG,
  paddingRight: token.paddingLG,
}}>
  <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: token.margin }}>
    <Space size="middle" style={{ minWidth: 300, maxWidth: 400 }}>
      ...メソッド選択...
    </Space>
    <Space size="middle" style={{ minWidth: 300, maxWidth: 400 }}>
      ...タスク選択 + 選択ボタン...
    </Space>
  </div>
</div>
```

- `height: 56` 固定 + `flexShrink: 0` で高さを確保。
- メソッド・タスク各エリアに `minWidth: 300, maxWidth: 400` を設定。
- メディアクエリは使用していない。

---

### 3-8. globals.css / globals.scss

タブコンテンツ（Ant Design `<Tabs>`）のスクロール・高さ制御をグローバル CSS で行っている：

```css
.ant-tabs {
  display: flex !important;
  flex-direction: column !important;
  height: 100% !important;
}

.ant-tabs-content-holder {
  flex: 1 !important;
  overflow: hidden !important;
}

.ant-tabs-content {
  height: 100% !important;
  overflow: hidden !important;
}

.ant-tabs-tabpane {
  height: 100% !important;
  padding: 0 !important;
}
```

Ant Design の `.ant-tabs` を全体的に `flex column` にして、コンテンツ領域が残り高さを占めるよう設定。これにより**どの画面サイズでもタブコンテンツがページ全体を使える**ようになっている。

---

## 4. レスポンシブ実装のまとめ（パターン整理）

### パターン① : `@emotion/styled` + CSS メディアクエリ

**使用箇所**: `ExperimentWorkerMenu.tsx`（`ResponsiveContainer`）、`SubHeader.tsx`（`styled-component`）

```tsx
import styled from '@emotion/styled';

const ResponsiveContainer = styled.div`
  max-width: 100%;
  padding: 0 8px;

  @media (min-width: 768px) { max-width: 768px; padding: 0 16px; }
  @media (min-width: 992px) { max-width: 992px; }
  @media (min-width: 1200px) { max-width: 1200px; }
  @media (min-width: 1600px) { max-width: 1400px; }
`;
```

**特徴**:
- ブレークポイントは 768 / 992 / 1200 / 1600px の4段階。
- デフォルト（モバイル優先）: `width: 100%`。
- 画面幅が広くなるにつれて最大幅が段階的に拡大する。

---

### パターン② : Ant Design デザイントークン + インラインスタイル

**使用箇所**: 全コンポーネント共通

```tsx
const { token } = theme.useToken();

<div style={{
  paddingLeft: token.paddingLG,
  paddingRight: token.paddingLG,
  gap: token.marginXS,
}}>
```

**特徴**:
- `token.paddingLG`、`token.marginXS` などのトークンを使うことでテーマ変更に追従可能。
- メディアクエリではなく、**固定スペーシングの一元管理**として機能。

---

### パターン③ : Flexbox による動的レイアウト

**使用箇所**: Header、SubHeader、プロジェクト選択エリア、MethodTaskSelector

```tsx
// 左右に分かれる
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
  <div style={{ flex: 1 }}> ... </div>       // 残り幅を使い切る
  <div style={{ flexShrink: 0 }}> ... </div> // 縮まない
</div>
```

**特徴**:
- `flex: 1` と `flex-shrink: 0` を組み合わせて、ヘッダー内の要素を適切に配置。
- `flexWrap: 'nowrap'` で1行固定（プロジェクト選択エリア）。

---

### パターン④ : グローバル CSS による Ant Design コンポーネント上書き

**使用箇所**: `globals.css` / `globals.scss`

```css
.ant-tabs { display: flex !important; flex-direction: column !important; height: 100% !important; }
.ant-tabs-content-holder { flex: 1 !important; }
.ant-tabs-tabpane { height: 100% !important; padding: 0 !important; }
```

**特徴**:
- Ant Design の `<Tabs>` はデフォルトではコンテンツ高さが固定されないため、`!important` で上書き。
- タブコンテンツが画面の残り高さを100%占めるように制御。

---

### パターン⑤ : `position: fixed` による固定ヘッダー + `marginTop` によるコンテンツオフセット

**使用箇所**: Header（`top: 0`）、SubHeader（`top: 64px`）、Content（`marginTop: 112px`）

```tsx
// Header: position: fixed, top: 0, height: 64px
// SubHeader: position: fixed, top: 64px
// Content: marginTop: 112px (= 64 + 48)
```

**特徴**:
- ヘッダーを固定しつつ、コンテンツが重ならないよう `marginTop` で調整。
- 画面幅に関係なく常に同じオフセットを維持。

---

## 5. 他画面に適用する際の指針

### 5-1. 最低限実装すべき要素

| 項目 | 実装方法 |
|------|---------|
| コンテンツ最大幅制御 | `ResponsiveContainer`（`ExperimentWorkerMenu.tsx` から流用）を適用 |
| ヘッダーオフセット | `marginTop: TOTAL_HEADER_HEIGHT`（112px）を Content に設定 |
| スペーシング | `theme.useToken()` のトークン（`paddingLG`, `marginXS` 等）を使用 |
| タブ高さ制御 | `globals.css` の Ant Design 上書きスタイルは全画面に自動適用済み |

### 5-2. ブレークポイント（統一基準）

```
< 768px  : モバイル（100%幅）
768px+   : タブレット縦（max-width: 768px）
992px+   : タブレット横（max-width: 992px）
1200px+  : デスクトップ（max-width: 1200px）
1600px+  : 大画面（max-width: 1400px）
```

### 5-3. 実装チェックリスト

- [ ] `@emotion/styled` で `ResponsiveContainer` を定義（または流用）
- [ ] ヘッダー定数 `TOTAL_HEADER_HEIGHT = 112` を使って `Content` の `marginTop` を設定
- [ ] Flexbox + `token` スペーシングでレイアウトを構築
- [ ] 固定高さのエリアには `height: 数値` + `flexShrink: 0` を設定
- [ ] スクロールが必要なエリアには `flex: 1, minHeight: 0, overflow: auto` を設定
- [ ] `position: fixed` のヘッダー下にコンテンツが隠れないか確認

---

## 6. 現状の課題・注意点

| 課題 | 詳細 |
|------|------|
| `ResponsiveContainer` が未使用 | `ExperimentWorkerMenu.tsx` で定義されているが JSX 内で使われていない。コンテンツ幅の上限制御が実際には効いていない状態 |
| メディアクエリの適用範囲が限定的 | ブレークポイント定義は `ResponsiveContainer` のみ。各タブコンポーネント・MethodTaskSelector にはメディアクエリが適用されていない |
| `MethodTaskSelector` の幅が固定 | `minWidth: 300, maxWidth: 400` の固定値のため、極小画面（< 600px）では横スクロールが発生する可能性がある |
| プロジェクト選択エリアの `flexWrap: 'nowrap'` | 1行固定のためスマートフォン幅では要素が圧縮・はみ出す可能性がある |

---

## 7. 関連ファイルのパス一覧（実装時の参照先）

```
frontend/src/components/menus/ExperimentWorkerMenu.tsx   ← ResponsiveContainer の定義元
frontend/src/components/common/Header.tsx                ← 固定ヘッダー
frontend/src/components/common/SubHeader.tsx             ← 固定サブヘッダー
frontend/src/app/globals.css                             ← ant-tabs グローバル上書き
frontend/src/app/globals.scss                            ← SCSS版（同内容）
frontend/src/theme/theme.ts                              ← Ant Design テーマ（現在は空）
```
