# ValidationPanel UI仕様書

## 1. 概要

### 1.1. コンポーネントの目的

MAIMLファイルのバリデーション結果を表示するDrawerパネル。エラー・警告の詳細表示、エラー箇所への自動フォーカス機能を提供します。

---

## 2. ファイルパス

```
frontend/src/components/editorv2/components/ValidationPanel.tsx
```

---

## 3. Props定義

| プロパティ名 | 型 | 必須 | 説明 |
|------------|---|-----|------|
| open | boolean | ✓ | Drawer表示状態 |
| validationResult | AnalysisResult \| null | ✓ | バリデーション結果 |
| onClose | () => void | ✓ | Drawerを閉じる |
| criticalErrors | ErrorContent[] | ✓ | 致命的エラー配列 |
| nonCriticalErrors | ErrorContent[] | ✓ | 非致命的エラー配列 |
| onErrorClick | (error) => void | | エラークリック時の処理 |

---

## 4. レイアウト

**Drawer（右側から表示）:**

```
┌──────────────────────────────────────┐
│ バリデーション結果            [×]    │
├──────────────────────────────────────┤
│ ✓ バリデーション成功                 │
│                                      │
│ エラー: 2件  警告: 3件               │
├──────────────────────────────────────┤
│ ⚠️ 致命的エラー (2件)                │
│   ▼ syntax_error                    │
│       行 45: 構文エラーです          │
│       [フォーカス]                   │
│                                      │
│ ⚠️ 非致命的エラー (3件)              │
│   ▼ duplicate_id                    │
│       Material_1: 重複しています     │
│       影響ノード: node_001          │
│       [フォーカス]                   │
└──────────────────────────────────────┘
```

---

## 5. 主要機能

### 5.1. バリデーション結果表示

**成功時:**
- Alert type="success"
- 「バリデーション成功」メッセージ

**失敗時（致命的エラー）:**
- Alert type="error"
- 「致命的なエラーがあります」メッセージ

**警告時（非致命的エラー）:**
- Alert type="warning"
- 「警告があります」メッセージ

### 5.2. エラー分類表示

**致命的エラー（Critical）:**
- Collapse Panel（赤色）
- エラータイプ別にグループ化
- 詳細: type, message, details, line, column

**非致命的エラー（Non-Critical）:**
- Collapse Panel（オレンジ色）
- エラータイプ別にグループ化
- 影響要素の表示（affectedElements）

### 5.3. エラー箇所へのフォーカス（新機能）

**処理フロー:**
1. エラー項目の「フォーカス」ボタンをクリック
2. onErrorClick(error)を実行
3. PetriNetEditorInner側で該当ノード/エッジを選択
4. ReactFlowのfitView()で表示

**対象:**
- affectedElementsが存在するエラー
- nodeId または edgeId を持つエラー

---

## 6. 使用しているコンポーネント

### 6.1. Ant Design

| コンポーネント | 使用箇所 |
|--------------|---------|
| Drawer | パネルコンテナ |
| Alert | バリデーション結果サマリー |
| Collapse | エラーグループ |
| List | エラー詳細リスト |
| Button | フォーカスボタン |
| Typography | テキスト表示 |
| Space | レイアウト |
| Divider | 区切り線 |

### 6.2. アイコン

- CheckCircleOutlined: 成功
- CloseCircleOutlined: 致命的エラー
- WarningOutlined: 警告
- AimOutlined: フォーカスボタン

---

## 7. エラー構造

### 7.1. ErrorContent型

```typescript
interface ErrorContent {
  type: string;              // エラータイプ
  severity: string;          // 重要度（error, warning）
  message: string;           // エラーメッセージ
  details?: string;          // 詳細情報
  line?: number;             // 行番号
  column?: number;           // 列番号
  xpath?: string;            // XPath
  affectedElements?: {       // 影響要素
    nodeIds?: string[];
    edgeIds?: string[];
  };
}
```

### 7.2. エラー分類

**致命的エラー:**
- syntax_error
- invalid_structure
- schema_validation_error

**非致命的エラー:**
- duplicate_id
- reference_error
- missing_attribute
- invalid_value

---

## 8. スタイル

**Drawer:**
```typescript
{
  width: 400,
  placement: 'right',
}
```

**Collapse（致命的エラー）:**
```typescript
{
  borderColor: '#ff4d4f',
  backgroundColor: '#fff1f0',
}
```

**Collapse（非致命的エラー）:**
```typescript
{
  borderColor: '#fa8c16',
  backgroundColor: '#fff7e6',
}
```

---

## 9. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2026-01-21 | 初版作成 | Cline |
| 2.0.0 | 2025-12-23 | Ant Design v6対応 | Development Team |
| 2.1.0 | 2026-02-19 | 最新ソース（editorv2）に基づいて更新 | Cline |
