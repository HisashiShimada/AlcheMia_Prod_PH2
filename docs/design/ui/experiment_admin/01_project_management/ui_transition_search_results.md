# SearchResults - トランジション検索結果コンポーネント

## 1. 概要

### 1.1 コンポーネントの目的
セマンティック検索の結果をリスト形式で表示する。各ヒットはスコア・プロジェクト名・ファイルパスなどを表示し、詳細情報を展開表示できる。

### 1.2 使用場面
- TransitionSetSearchModal の検索タブ内に常時配置
- 検索実行後に結果一覧を表示

---

## 2. 画面構成

### 2.1 状態別表示

| 状態 | 表示内容 |
|------|---------|
| ローディング中 | Spin（サイズ: large）+ "検索中..." テキスト |
| エラー | Alert（type: error）でエラー内容表示 |
| 未検索 | Empty コンポーネント（案内メッセージ） |
| 結果0件 | Empty コンポーネント（"検索結果が見つかりませんでした"） |
| 結果あり | ヒット件数 + 経過時間 + リスト表示 |

### 2.2 未検索時のヒント表示

```
┌──────────────────────────────────────────────────────┐
│              🔍 (大アイコン)                          │
│        トランジションセット検索を開始                │
│   4軸ベクトル検索により精密な類似度評価が可能です    │
│                                                      │
│  📥 入力条件の例: シリコン基板、532nmレーザー...     │
│  ⚡ 手順の例: バックグラウンド補正、ピーク検出...    │
│  📤 出力の例: スペクトルデータCSV、TIFFイメージ...   │
│  🕸️ 構造の例: 1入力2出力、直列3ステップ...          │
└──────────────────────────────────────────────────────┘
```

### 2.3 結果リストの各アイテム

```
┌──────────────────────────────────────────────────────┐
│ #1  [transition_id]  [手法タグ]  [プロジェクト名タグ]│
│                                    [スコア円グラフ]  │
│                                    [詳細▼]           │
│ ファイルパス（薄字）                                  │
├──────────────────────────────────────────────────────┤
│ ▼ 詳細展開時                                         │
│   スコア内訳: [入力xx%] [手法xx%] [出力xx%] [構造xx%]│
│   ▶ Input テキスト（折りたたみ）                    │
│   ▶ Transition テキスト（折りたたみ）               │
│   ▶ Output テキスト（折りたたみ）                   │
└──────────────────────────────────────────────────────┘
```

### 2.4 スコアの色分け

| スコア範囲 | 色 |
|-----------|-----|
| 0.8以上 | 緑（`#52c41a`） |
| 0.6〜0.8 | 青（`#1677ff`） |
| 0.4〜0.6 | 黄（`#faad14`） |
| 0.4未満 | 赤（`#ff4d4f`） |

---

## 3. 機能仕様

### 3.1 詳細展開/折りたたみ

```typescript
const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

const toggleExpand = (id: string) => {
  setExpandedIds((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
};
```

### 3.2 プロジェクト名クリック
プロジェクト名タグをクリックすると `onOpenProject(projectName)` コールバックを呼び出す。  
親モーダル（TransitionSetSearchModal）でモーダルを閉じてプロジェクトを選択する。

---

## 4. データ仕様

### 4.1 Props定義

```typescript
interface SearchResultsProps {
  hits: SemanticSearchHit[];
  loading: boolean;
  error: string | null;
  searched: boolean;
  elapsedMs: number | null;
  onOpenProject?: (projectName: string) => void;
}
```

### 4.2 SemanticSearchHit型定義

```typescript
interface SemanticSearchHit {
  transition_set_id: string;
  transition_id: string;
  project_name?: string;
  file_path: string;
  technique?: string;
  score: number;
  score_detail: {
    input_score: number;
    transition_score: number;
    output_score: number;
    structure_score: number;
  };
  input_text: string;
  transition_text: string;
  output_text: string;
}
```

---

## 5. 変更履歴

| 日付 | バージョン | 変更内容 | 担当者 |
|------|-----------|---------|--------|
| 2026-03-06 | 1.0.0 | 初版作成 | Cline |
