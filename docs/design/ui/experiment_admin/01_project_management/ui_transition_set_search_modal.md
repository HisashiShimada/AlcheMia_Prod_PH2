# TransitionSetSearchModal - 遷移検索モーダル UI設計書

## メタデータ
- **画面名**: 遷移検索モーダル
- **物理名**: TransitionSetSearchModal.tsx
- **ファイルパス**: `frontend/src/components/TransitionSetSearch/TransitionSetSearchModal.tsx`
- **利用権限**: experiment_admin
- **作成日**: 2026-01-21
- **最終更新日**: 2026-08-20
- **バージョン**: 2.0.0

> **注意**: 旧設計書は `ProjectSearchModal`（MAIML属性条件検索）の内容でしたが、実装は `TransitionSetSearchModal`（自然言語セマンティック検索）であるため全面改訂。

---

## 1. 概要

### 1.1 コンポーネントの目的

**自然言語クエリ**を使ってトランジションセット（実験手順）をセマンティック検索するモーダル。  
入力したクエリをAIが「入力・手順・出力・構造」の4軸に分解し、ベクトル類似度検索でマッチするプロジェクトを発見する。

### 1.2 使用場面

- プロジェクト管理画面のツールバーにある **「遷移検索」** ボタン（`SearchOutlined` アイコン付き）をクリックした際に表示
- i18nキー: `t('projectManagement.transitionSearch')` → 日本語: `"遷移検索"` / 英語: `"Transition Search"`

### 1.3 アクセス権限

| ロール | アクセス |
|--------|---------|
| `experiment_admin` | ✅ 操作可 |
| `experiment_worker` | ❌ 呼び出し元ボタン非表示 |

---

## 2. 画面構成

### 2.1 モーダル設定

| 項目 | 値 |
|------|---|
| タイトル | `AccountBookOutlined` + `t('projectManagement.transitionSearch')` + ヒット数バッジ（`searched && hits.length > 0` の場合のみ） |
| `width` | `960` |
| `footer` | `null` |
| `destroyOnHidden` | `false`（状態を保持したまま非表示にする） |
| `styles.body` | `padding: '16px 24px'`, `maxHeight: '80vh'`, `overflowY: 'auto'` |

### 2.2 タブ構成

```
┌────────────────────────────────────────────────────────────┐
│ 📒 遷移検索  [ヒット数バッジ]                        [×]  │
├────────────────────────────────────────────────────────────┤
│ [🔍 検索] [☁ 一括処理]                                    │
├────────────────────────────────────────────────────────────┤
│ (...タブコンテンツ...)                                      │
└────────────────────────────────────────────────────────────┘
```

| タブキー | ラベル | i18nキー |
|---------|-------|---------|
| `search` | 検索 | `t('transitionSearch.searchTab')` |
| `batch` | 一括処理 | `t('transitionSearch.batchTab')` + `CloudUploadOutlined` |

---

## 3. 「検索」タブ仕様

### 3.1 レイアウト

```
┌──────────────────────────────────────────────────┐
│ [クエリラベル]                                    │
│ ┌─────────────────────────────────────────────┐  │
│ │ テキストエリア（3行）                        │  │
│ │ ※ Shift+Enter: 改行 / Enter: 検索実行       │  │
│ └─────────────────────────────────────────────┘  │
│ ヒント文                                         │
│                                                  │
│ [🔍 検索実行 / 検索中...]  [リセット]           │
│                                                  │
│ [クイック検索ラベル]                             │
│ [🏗構造] [⚡手順] [📥入力] [📤出力] [⭐バランス] │
│                                                  │
│ ┌─ AI分解結果（検索後のみ表示） ──────────────┐ │
│ │ 入力: ...   手順: ...                        │ │
│ │ 出力: ...   構造: ...                        │ │
│ └──────────────────────────────────────────────┘ │
│                                                  │
│ ▶ 重み設定（詳細） [折りたたみ]                  │
│                                                  │
│ ─────────────────────────                       │
│                                                  │
│ [エラー表示 / 未検索ヒント / 検索結果]           │
└──────────────────────────────────────────────────┘
```

### 3.2 クエリ入力エリア

| 要素 | 仕様 |
|------|------|
| ラベル | `t('transitionSearch.queryLabel')` |
| コンポーネント | `TextArea`（rows=3） |
| プレースホルダー | `t('transitionSearch.queryPlaceholder')` |
| Enter キー | `onPressEnter`: Shift+Enterは改行、Enterのみで `handleSearch()` 実行 |
| ヒント | `t('transitionSearch.queryHint')` （fontSizeSM、secondary） |

### 3.3 検索ボタン・リセットボタン

| ボタン | ラベル | 無効化条件 |
|-------|-------|-----------|
| 検索実行 | `isProcessing` 時: `t('transitionSearch.searching')` / 通常: `t('transitionSearch.searchButton')` | `query` が空文字 または `isProcessing` |
| リセット | `t('transitionSearch.reset')` | `isProcessing` 中 |

- 検索ボタン: `type="primary"`, `size="large"`, `icon=<SearchOutlined />`, `loading={isProcessing}`, `minWidth: 140`
- リセット: クエリ・AI分解結果・検索結果をクリア（`handleClear`）

### 3.4 クイック検索

プリセット重みを適用して即時検索。クエリが空の場合は警告メッセージを表示。

| ボタンキー | アイコン | i18nキー | 説明 |
|-----------|---------|---------|------|
| `structureFocused` | `ApartmentOutlined` | `transitionSearch.quickSearch.structureFocused` | 構造重視 |
| `procedureFocused` | `ThunderboltOutlined` | `transitionSearch.quickSearch.procedureFocused` | 手順重視 |
| `inputFocused` | `InboxOutlined` | `transitionSearch.quickSearch.inputFocused` | 入力重視 |
| `outputFocused` | `ExportOutlined` | `transitionSearch.quickSearch.outputFocused` | 出力重視 |
| `balanced` | `StarOutlined` | `transitionSearch.quickSearch.balanced` | バランス |

- 各ボタンに `Tooltip`（`WEIGHT_PRESETS[key].description`）を表示
- 無効化条件: `isProcessing` または `query` が空文字

### 3.5 AI分解結果表示

クエリ実行後、`decomposeNaturalLanguageQuery()` の結果を表示。表示条件: `decomposed !== null`

```
背景: #f9f0ff、ボーダー: #d3adf7（紫系）
```

| フィールド | i18nキー | データ |
|-----------|---------|--------|
| 入力 | `transitionSearch.decomposed.input` | `decomposed.q_in` |
| 手順 | `transitionSearch.decomposed.procedure` | `decomposed.q_tr` |
| 出力 | `transitionSearch.decomposed.output` | `decomposed.q_out` |
| 構造 | `transitionSearch.decomposed.structure` | `decomposed.q_struct` |

2列 × 2行（`Row/Col` グリッド、各フィールド span=12）

### 3.6 重み設定（詳細）

`Collapse` で折りたたみ表示。

- ラベル: `SettingOutlined` + `t('transitionSearch.advancedWeights')`
- 子: `WeightSliders` コンポーネント（`weights`, `onChange`, `disabled={isProcessing}`）

### 3.7 エラー表示

`error` が存在する場合:
```
<Alert type="error" title={error} showIcon closable />
```

### 3.8 未検索時ヒント

`!searched && !loading` の場合:

```
背景: #fafafa、ボーダー: 破線 #d9d9d9
SearchOutlined（fontSize=48, color=#1677ff）
t('transitionSearch.startHint')
t('transitionSearch.startHintDesc')
例文4件（input / procedure / output / structure）
```

### 3.9 検索結果

`SearchResults` コンポーネントに委譲:

```typescript
<SearchResults
  hits={hits}
  loading={loading}
  error={null}
  searched={searched}
  elapsedMs={elapsedMs}
  onOpenProject={(name) => {
    if (onOpenProject) {
      onOpenProject(name);
      handleClose();
    }
  }}
/>
```

---

## 4. 「一括処理」タブ仕様

`TransitionSetBatchProcessingPanel` コンポーネントを表示。  
詳細は別設計書を参照。

---

## 5. Props 定義

```typescript
interface TransitionSetSearchModalProps {
  /** モーダル表示状態 */
  open: boolean;
  /** モーダルを閉じるコールバック */
  onClose: () => void;
  /** プロジェクト名クリック時のコールバック（ProjectManagementでプロジェクトを選択するため） */
  onOpenProject?: (projectName: string) => void;
  /** 初期フィルター：プロジェクト名 */
  initialProjectName?: string;
}
```

| Prop名 | 型 | 必須 | 説明 |
|--------|-----|------|------|
| `open` | `boolean` | ✅ | モーダル表示/非表示 |
| `onClose` | `() => void` | ✅ | 閉じるコールバック（内部で `handleClear` → `onClose` の順に実行）|
| `onOpenProject` | `(projectName: string) => void` | ❌ | 検索結果からプロジェクトを開く際のコールバック |
| `initialProjectName` | `string` | ❌ | 初期プロジェクト名フィルター |

---

## 6. State 定義

```typescript
const [query, setQuery] = useState('');
const [weights, setWeights] = useState<SearchWeights>(DEFAULT_WEIGHTS);
const [decomposed, setDecomposed] = useState<DecomposedQuery | null>(null);
const [decomposing, setDecomposing] = useState(false);

// useSemanticSearch フック
const { hits, loading, error, searched, elapsedMs, search, clearResults } = useSemanticSearch();
```

| State | 型 | 説明 |
|-------|----|------|
| `query` | `string` | 検索クエリテキスト |
| `weights` | `SearchWeights` | 検索重み（入力/手順/出力/構造の4軸） |
| `decomposed` | `DecomposedQuery \| null` | AI分解結果（q_in/q_tr/q_out/q_struct）|
| `decomposing` | `boolean` | AI分解処理中フラグ |
| `hits` | （useSemanticSearch）| 検索ヒット結果 |
| `loading` | （useSemanticSearch）| 検索中フラグ |
| `error` | （useSemanticSearch）| エラーメッセージ |
| `searched` | （useSemanticSearch）| 検索実行済みフラグ |
| `elapsedMs` | （useSemanticSearch）| 検索経過時間（ms）|

`isProcessing = loading || decomposing`

---

## 7. 検索フロー

### 7.1 通常検索（`handleSearch`）

```
1. query が空 → message.warning(t('transitionSearch.queryRequired'))
2. buildRequest() を呼び出し
   2a. decomposeNaturalLanguageQuery(query) でAI分解
   2b. DecomposedQuery → SemanticSearchRequest に変換
   2c. エラー時フォールバック: { transition_query: query, top_k: 50, weights }
3. search(request) 実行（useSemanticSearch）
```

### 7.2 クイック検索（`handleQuickSearch`）

```
1. query が空 → message.warning(t('transitionSearch.quickSearchQueryRequired'))
2. WEIGHT_PRESETS[presetKey].weights を weights に反映（UIに表示）
3. buildRequest(preset.weights) を呼び出し
4. search(request) 実行
```

### 7.3 クリア（`handleClear`）

```
query = '' / decomposed = null / clearResults()
```

### 7.4 閉じる（`handleClose`）

```
handleClear() → onClose()
```

---

## 8. API・サービス連携

| サービス/フック | 役割 |
|---------------|------|
| `useSemanticSearch` | セマンティック検索実行・結果管理 |
| `decomposeNaturalLanguageQuery` | 自然言語クエリをAIで4軸分解（`semanticSearchService`）|

### 8.1 SemanticSearchRequest 型

```typescript
interface SemanticSearchRequest {
  input_query?: string;       // 入力軸クエリ（q_in）
  transition_query?: string;  // 手順軸クエリ（q_tr）
  output_query?: string;      // 出力軸クエリ（q_out）
  structure_query?: string;   // 構造軸クエリ（q_struct）
  top_k: number;              // 最大取得件数（50）
  weights: SearchWeights;     // 重み
}
```

---

## 9. 使用コンポーネント・型

### 9.1 子コンポーネント
- `WeightSliders` - 検索重みスライダー
- `SearchResults` - 検索結果表示
- `TransitionSetBatchProcessingPanel` - 一括処理タブ

### 9.2 Ant Design コンポーネント
- `Modal`, `Tabs`, `Input.TextArea`, `Button`, `Space`
- `Typography`, `Divider`, `Row`, `Col`, `Badge`
- `Collapse`, `Tooltip`, `Alert`, `message`

### 9.3 アイコン（@ant-design/icons）
- `SearchOutlined`, `SettingOutlined`, `CloudUploadOutlined`
- `ThunderboltOutlined`, `AccountBookOutlined`, `InboxOutlined`
- `ExportOutlined`, `ApartmentOutlined`, `StarOutlined`

### 9.4 型定義
- `@/types/semanticSearch` - `SearchWeights`, `SemanticSearchRequest`, `DecomposedQuery`
- `@/hooks/useSemanticSearch` - `DEFAULT_WEIGHTS`, `WEIGHT_PRESETS`
- `@/services/semanticSearchService` - `decomposeNaturalLanguageQuery`

---

## 10. 変更履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|---------|
| 2.0.0 | 2026-08-20 | 全面改訂：ProjectSearchModal（MAIML属性検索・未実装）→ TransitionSetSearchModal（自然言語セマンティック検索）に差し替え |
| 2.0.1 | 2026-08-20 | セクション2.1のバッジ表示条件を「検索後かつヒット件数1件以上」に修正 |
| 1.0.0 | 2026-01-21 | 初版作成 |
