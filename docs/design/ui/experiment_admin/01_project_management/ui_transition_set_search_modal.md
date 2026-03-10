# TransitionSetSearchModal - トランジション検索モーダル

## 1. 概要

### 1.1 コンポーネントの目的
4軸ベクトル検索（入力条件・手順・出力・構造）を用いてトランジションセットを検索するモーダル。自然言語クエリをAIで分解し、精密な類似度評価を行う。バッチ処理によるEmbeddingインデックス一括生成機能も提供する。

### 1.2 使用場面
- プロジェクト管理画面ツールバーの「トランジション検索」ボタンをクリックした際に表示
- 実験プロトコルの類似トランジションを横断的に検索したい場合

### 1.3 アクセス権限
- **必須ロール**: experiment_admin
- **認証**: JWT + Session Hybrid認証

---

## 2. 画面構成

### 2.1 レイアウト構造

```
┌──────────────────────────────────────────────────────────┐
│ 📒 トランジション検索  [件数バッジ]        [×]           │
├──────────────────────────────────────────────────────────┤
│ [検索] [バッチ処理]  ← タブ                              │
├──────────────────────────────────────────────────────────┤
│ 検索クエリ                                               │
│ ┌────────────────────────────────────────────────────┐  │
│ │ テキストエリア（3行）                               │  │
│ └────────────────────────────────────────────────────┘  │
│ 💡 ヒントテキスト                                        │
│                                                          │
│ [検索実行] [リセット]                                    │
│                                                          │
│ ⚡ クイック検索ボタン群                                  │
│ [構造重視] [手順重視] [入力重視] [出力重視] [バランス]   │
│                                                          │
│ 🤖 AI分析結果（検索後に表示）                            │
│ ┌──────────────────────────────────────────────────┐    │
│ │ 入力条件: ...  手順: ...                         │    │
│ │ 出力: ...      構造: ...                         │    │
│ └──────────────────────────────────────────────────┘    │
│                                                          │
│ ▶ 詳細な重み調整（折りたたみ）                           │
│ ┌──────────────────────────────────────────────────┐    │
│ │ WeightSliders コンポーネント                     │    │
│ └──────────────────────────────────────────────────┘    │
│                                                          │
│ ─────────────────────────────────────────────────────── │
│                                                          │
│ SearchResults コンポーネント                             │
└──────────────────────────────────────────────────────────┘
```

**モーダルサイズ:** width: 960px、maxHeight: 80vh

### 2.2 タブ構成

| タブ | キー | 内容 |
|------|------|------|
| 検索 | `search` | 検索クエリ入力・クイック検索・結果表示 |
| バッチ処理 | `batch` | TransitionSetBatchProcessingPanel |

### 2.3 主要UI要素

#### 2.3.1 タイトル
- アイコン: `<AccountBookOutlined />`
- テキスト: "トランジション検索"
- 検索済みかつ件数 > 0 の場合: 件数バッジ（青色）を表示

#### 2.3.2 検索クエリ入力
- コンポーネント: `<TextArea rows={3} />`
- プレースホルダー: "例: 532nmレーザーでラマン測定、CLS解析、スペクトルとTIFF画像を出力"
- Shift+Enter: 改行、Enter: 検索実行

#### 2.3.3 アクションボタン
- **検索実行**（大サイズ・プライマリ）: 検索処理を実行
- **リセット**: クエリと結果をクリア

#### 2.3.4 クイック検索ボタン
プリセット重みで即時検索するボタン群（各ボタンにTooltipで説明表示）

| キー | アイコン | ラベル |
|------|---------|--------|
| structureFocused | `<ApartmentOutlined />` | 構造重視 |
| procedureFocused | `<ThunderboltOutlined />` | 手順重視 |
| inputFocused | `<InboxOutlined />` | 入力重視 |
| outputFocused | `<ExportOutlined />` | 出力重視 |
| balanced | `<StarOutlined />` | バランス |

#### 2.3.5 AI分解結果表示（検索後に表示）
- 背景: 薄紫（`#f9f0ff`）
- ボーダー: `#d3adf7`
- 4軸の分解結果を2列グリッドで表示
  - 📥 入力条件 / ⚡ 手順 / 📤 出力 / 🕸️ 構造

#### 2.3.6 重み調整（Collapse）
- `<WeightSliders />` コンポーネントを格納
- デフォルト折りたたみ状態

---

## 3. 機能仕様

### 3.1 通常検索

```typescript
const handleSearch = async () => {
  if (!query.trim()) {
    message.warning('検索クエリを入力してください');
    return;
  }
  const request = await buildRequest();
  if (!request) return;
  await search(request);
};
```

**フロー:**
1. クエリが空の場合は警告メッセージを表示
2. `buildRequest()` でAI分解 + リクエスト生成
3. `useSemanticSearch` フックの `search()` を呼び出し

### 3.2 クイック検索

```typescript
const handleQuickSearch = async (presetKey: string) => {
  if (!query.trim()) {
    message.warning('クイック検索には検索クエリを入力してください');
    return;
  }
  const preset = WEIGHT_PRESETS[presetKey];
  setWeights(preset.weights);  // UIに重みを反映
  const request = await buildRequest(preset.weights);
  await search(request);
};
```

### 3.3 AIクエリ分解（buildRequest）

```typescript
const buildRequest = async (customWeights?: SearchWeights) => {
  setDecomposing(true);
  try {
    const result = await decomposeNaturalLanguageQuery(query.trim());
    setDecomposed(result);
    return {
      input_query: result.q_in,
      transition_query: result.q_tr,
      output_query: result.q_out,
      structure_query: result.q_struct,
      top_k: 50,
      weights: customWeights ?? weights,
    };
  } catch (err) {
    // フォールバック: クエリをtransition_queryとして使用
    return { transition_query: query.trim(), top_k: 50, weights: customWeights ?? weights };
  } finally {
    setDecomposing(false);
  }
};
```

### 3.4 リセット

```typescript
const handleClear = () => {
  setQuery('');
  setDecomposed(null);
  clearResults();
};
```

### 3.5 モーダルクローズ

```typescript
const handleClose = () => {
  handleClear();  // クエリと結果をクリア
  onClose();
};
```

---

## 4. データ仕様

### 4.1 Props定義

```typescript
interface TransitionSetSearchModalProps {
  open: boolean;
  onClose: () => void;
  /** プロジェクト名クリック時のコールバック */
  onOpenProject?: (projectName: string) => void;
  /** 初期フィルター: プロジェクト名 */
  initialProjectName?: string;
}
```

### 4.2 State定義

```typescript
const [query, setQuery] = useState('');
const [weights, setWeights] = useState<SearchWeights>(DEFAULT_WEIGHTS);
const [decomposed, setDecomposed] = useState<DecomposedQuery | null>(null);
const [decomposing, setDecomposing] = useState(false);
// 検索フックから取得
const { hits, loading, error, searched, elapsedMs, search, clearResults } = useSemanticSearch();
```

### 4.3 SearchWeights型定義

```typescript
interface SearchWeights {
  input: number;      // 入力条件の重み（0.0〜1.0）
  transition: number; // 手順の重み（0.0〜1.0）
  output: number;     // 出力の重み（0.0〜1.0）
  structure: number;  // 構造の重み（0.0〜1.0）
}
```

### 4.4 DecomposedQuery型定義

```typescript
interface DecomposedQuery {
  q_in?: string;     // 入力条件クエリ
  q_tr?: string;     // 手順クエリ
  q_out?: string;    // 出力クエリ
  q_struct?: string; // 構造クエリ
}
```

---

## 5. API連携

### 5.1 使用するAPI

| API名 | メソッド | エンドポイント | 説明 |
|------|---------|--------------|------|
| AIクエリ分解 | POST | `/api/v1/semantic-search/decompose` | 自然言語クエリを4軸に分解 |
| トランジション検索 | POST | `/api/v1/semantic-search/search` | ベクトル類似度検索 |

---

## 6. 子コンポーネント

| コンポーネント | ファイルパス | UI仕様書 | 役割 |
|---|---|---|---|
| WeightSliders | TransitionSetSearch/WeightSliders.tsx | [ui_weight_sliders.md](ui_weight_sliders.md) | 4軸重みスライダー |
| SearchResults | TransitionSetSearch/SearchResults.tsx | [ui_transition_search_results.md](ui_transition_search_results.md) | 検索結果表示 |
| TransitionSetBatchProcessingPanel | TransitionSetSearch/TransitionSetBatchProcessingPanel.tsx | [ui_transition_set_batch_processing_panel.md](ui_transition_set_batch_processing_panel.md) | バッチ処理パネル |

---

## 7. 変更履歴

| 日付 | バージョン | 変更内容 | 担当者 |
|------|-----------|---------|--------|
| 2026-03-06 | 1.0.0 | 初版作成 | Cline |
